# Machine Learning Survival Model for DLBCL Outcome Prediction
# Uses genomic features from Lacy/HMRN dataset with cross-validation

library(survival)
library(glmnet)
library(dplyr)

cat("=============================================================================\n")
cat("ML Survival Model - DLBCL Outcome Prediction from Genomics\n")
cat("=============================================================================\n\n")

set.seed(42)

# ============================================================================
# STEP 1: Load and Prepare Data
# ============================================================================

cat("Loading Lacy/HMRN data...\n")
genomic <- read.csv("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/genomic_data.csv")
clinical <- read.csv("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/data/genetic_egress_scores.csv")

# Merge
data <- merge(genomic, clinical[, c("PID", "cluster_ICL", "cell_of_origin", "OS_time", "OS_status")], by = "PID")
data$OS_MONTHS <- data$OS_time / 30.44
data$OS_EVENT <- data$OS_status

# Remove patients with missing survival
data <- data[!is.na(data$OS_MONTHS) & !is.na(data$OS_EVENT), ]
data <- data[data$OS_MONTHS > 0, ]

cat("Training dataset: n =", nrow(data), "patients\n")
cat("Events (deaths):", sum(data$OS_EVENT), "(", round(100*mean(data$OS_EVENT), 1), "%)\n")
cat("Median follow-up:", round(median(data$OS_MONTHS), 1), "months\n\n")

# Get gene columns (exclude metadata)
gene_cols <- setdiff(names(genomic), "PID")
cat("Genomic features:", length(gene_cols), "genes\n\n")

# Filter genes with sufficient prevalence (>= 3%)
gene_prev <- sapply(gene_cols, function(g) mean(data[[g]], na.rm = TRUE))
selected_genes <- names(gene_prev[gene_prev >= 0.03 & gene_prev <= 0.97])
cat("Genes with 3-97% prevalence:", length(selected_genes), "\n\n")

# ============================================================================
# STEP 2: Cox-LASSO Feature Selection
# ============================================================================

cat("=============================================================================\n")
cat("STEP 2: Cox-LASSO Feature Selection\n")
cat("=============================================================================\n\n")

# Prepare matrix for glmnet
X <- as.matrix(data[, selected_genes])
y <- Surv(data$OS_MONTHS, data$OS_EVENT)

# Fit Cox-LASSO with cross-validation
cat("Fitting Cox-LASSO with 10-fold CV...\n")
cv_fit <- cv.glmnet(X, y, family = "cox", alpha = 1, nfolds = 10)

# Get optimal lambda
lambda_min <- cv_fit$lambda.min
lambda_1se <- cv_fit$lambda.1se

cat("Optimal lambda (min):", round(lambda_min, 4), "\n")
cat("Optimal lambda (1se):", round(lambda_1se, 4), "\n\n")

# Extract coefficients at lambda.1se (more parsimonious)
coef_1se <- coef(cv_fit, s = "lambda.1se")
selected_features <- rownames(coef_1se)[coef_1se[, 1] != 0]
cat("Selected features (lambda.1se):", length(selected_features), "\n")

# Also get lambda.min features for comparison
coef_min <- coef(cv_fit, s = "lambda.min")
selected_min <- rownames(coef_min)[coef_min[, 1] != 0]
cat("Selected features (lambda.min):", length(selected_min), "\n\n")

# Show selected features
if (length(selected_features) > 0) {
  cat("LASSO-selected genes (lambda.1se):\n")
  coef_df <- data.frame(
    Gene = selected_features,
    Coefficient = round(coef_1se[selected_features, 1], 4)
  )
  coef_df <- coef_df[order(abs(coef_df$Coefficient), decreasing = TRUE), ]
  coef_df$Direction <- ifelse(coef_df$Coefficient > 0, "Harmful", "Protective")
  print(coef_df, row.names = FALSE)
} else {
  cat("No features selected at lambda.1se, using lambda.min\n")
  selected_features <- selected_min
}

# ============================================================================
# STEP 3: Build Risk Score Model
# ============================================================================

cat("\n=============================================================================\n")
cat("STEP 3: Risk Score Model\n")
cat("=============================================================================\n\n")

# Calculate risk score for each patient
if (length(selected_features) > 0) {
  risk_score <- as.vector(predict(cv_fit, newx = X, s = "lambda.1se", type = "link"))
} else {
  # Use lambda.min if 1se selected nothing
  risk_score <- as.vector(predict(cv_fit, newx = X, s = "lambda.min", type = "link"))
}

data$risk_score <- risk_score

# Divide into tertiles
data$risk_group <- cut(data$risk_score,
                       breaks = quantile(data$risk_score, c(0, 1/3, 2/3, 1)),
                       labels = c("Low", "Medium", "High"),
                       include.lowest = TRUE)

# Survival by risk group
cat("Survival by risk group:\n\n")
for (grp in c("Low", "Medium", "High")) {
  subset <- data[data$risk_group == grp, ]
  km <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ 1, data = subset)
  median_os <- summary(km)$table["median"]
  cat(grp, "risk (n=", nrow(subset), "): Median OS =",
      ifelse(is.na(median_os), "Not reached", round(median_os, 1)), "months\n")
}

# Cox model comparing risk groups
cat("\nCox regression (High vs Low risk):\n")
cox_risk <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ risk_group, data = data)
hr_high <- exp(coef(cox_risk))["risk_groupHigh"]
ci <- exp(confint(cox_risk))["risk_groupHigh", ]
p <- summary(cox_risk)$coefficients["risk_groupHigh", "Pr(>|z|)"]
cat("HR:", round(hr_high, 2), "  95% CI:", round(ci[1], 2), "-", round(ci[2], 2),
    "  p =", formatC(p, format = "e", digits = 2), "\n")

# ============================================================================
# STEP 4: Cross-Validation Performance
# ============================================================================

cat("\n=============================================================================\n")
cat("STEP 4: Cross-Validation Performance\n")
cat("=============================================================================\n\n")

# 5-fold cross-validation for C-index
n_folds <- 5
folds <- sample(rep(1:n_folds, length.out = nrow(data)))
cv_cindex <- numeric(n_folds)

cat("Performing", n_folds, "-fold cross-validation...\n\n")

for (k in 1:n_folds) {
  train_idx <- which(folds != k)
  test_idx <- which(folds == k)

  X_train <- X[train_idx, ]
  y_train <- Surv(data$OS_MONTHS[train_idx], data$OS_EVENT[train_idx])
  X_test <- X[test_idx, ]
  y_test <- Surv(data$OS_MONTHS[test_idx], data$OS_EVENT[test_idx])

  # Fit on training
  cv_train <- cv.glmnet(X_train, y_train, family = "cox", alpha = 1, nfolds = 5)

  # Predict on test
  pred_risk <- predict(cv_train, newx = X_test, s = "lambda.1se", type = "link")

  # Calculate C-index
  concordance_obj <- survival::concordance(y_test ~ pred_risk)
  cv_cindex[k] <- concordance_obj$concordance

  cat("Fold", k, ": C-index =", round(cv_cindex[k], 3), "\n")
}

cat("\nMean CV C-index:", round(mean(cv_cindex), 3),
    "+/-", round(sd(cv_cindex), 3), "\n")

# Full model C-index
full_concordance <- survival::concordance(Surv(OS_MONTHS, OS_EVENT) ~ risk_score, data = data)
cat("Full model C-index:", round(full_concordance$concordance, 3), "\n")

# ============================================================================
# STEP 5: Individual Gene Impact Analysis
# ============================================================================

cat("\n=============================================================================\n")
cat("STEP 5: Top Prognostic Genes (Univariate Cox)\n")
cat("=============================================================================\n\n")

univar_results <- data.frame()

for (gene in selected_genes) {
  n_mut <- sum(data[[gene]], na.rm = TRUE)
  if (n_mut >= 10) {
    tryCatch({
      cox <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ data[[gene]], data = data)
      hr <- exp(coef(cox))
      ci <- exp(confint(cox))
      p <- summary(cox)$coefficients[, "Pr(>|z|)"]

      univar_results <- rbind(univar_results, data.frame(
        Gene = gene,
        N_mut = n_mut,
        Pct = round(100 * n_mut / nrow(data), 1),
        HR = round(hr, 3),
        CI_lower = round(ci[1], 3),
        CI_upper = round(ci[2], 3),
        P_value = p,
        Direction = ifelse(hr > 1, "Harmful", "Protective")
      ))
    }, error = function(e) {})
  }
}

univar_results <- univar_results %>% arrange(P_value)
univar_results$FDR <- p.adjust(univar_results$P_value, method = "BH")

cat("Top 20 prognostic genes:\n\n")
print(as.data.frame(univar_results[1:min(20, nrow(univar_results)),
                                   c("Gene", "N_mut", "Pct", "HR", "P_value", "FDR", "Direction")]),
      row.names = FALSE)

# ============================================================================
# STEP 6: Summary and Save Results
# ============================================================================

cat("\n=============================================================================\n")
cat("MODEL SUMMARY\n")
cat("=============================================================================\n\n")

cat("Training cohort: Lacy/HMRN (n =", nrow(data), ")\n")
cat("Features used:", length(selected_genes), "genes\n")
cat("LASSO selected:", length(selected_features), "features\n")
cat("Cross-validated C-index:", round(mean(cv_cindex), 3), "\n\n")

# Create signature summary
if (length(selected_features) > 0) {
  signature <- data.frame(
    Gene = selected_features,
    Coefficient = round(coef_1se[selected_features, 1], 4),
    Direction = ifelse(coef_1se[selected_features, 1] > 0, "Harmful", "Protective")
  )
  signature <- signature[order(abs(signature$Coefficient), decreasing = TRUE), ]

  cat("GENOMIC SIGNATURE (LASSO-selected):\n\n")
  print(signature, row.names = FALSE)

  # Save signature
  write.csv(signature,
            "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/global_scripts/ml_genomic_signature.csv",
            row.names = FALSE)
}

# Save patient risk scores
patient_scores <- data.frame(
  PID = data$PID,
  risk_score = round(data$risk_score, 4),
  risk_group = data$risk_group,
  OS_MONTHS = round(data$OS_MONTHS, 1),
  OS_EVENT = data$OS_EVENT
)
write.csv(patient_scores,
          "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/global_scripts/ml_patient_risk_scores.csv",
          row.names = FALSE)

# Save univariate results
write.csv(univar_results,
          "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/global_scripts/ml_univariate_genes.csv",
          row.names = FALSE)

# Save CV performance
cv_summary <- data.frame(
  Metric = c("Mean_CV_Cindex", "SD_CV_Cindex", "Full_Model_Cindex", "N_Patients", "N_Events", "N_Features_Selected"),
  Value = c(round(mean(cv_cindex), 4), round(sd(cv_cindex), 4),
            round(full_concordance$concordance, 4), nrow(data), sum(data$OS_EVENT), length(selected_features))
)
write.csv(cv_summary,
          "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/global_scripts/ml_cv_performance.csv",
          row.names = FALSE)

cat("\n\nResults saved to:\n")
cat("  - global_scripts/ml_genomic_signature.csv\n")
cat("  - global_scripts/ml_patient_risk_scores.csv\n")
cat("  - global_scripts/ml_univariate_genes.csv\n")
cat("  - global_scripts/ml_cv_performance.csv\n")
