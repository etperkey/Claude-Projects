# Machine Learning Models for RNA Expression Survival Signatures
# Builds optimal signatures globally and for each COO subset

library(dplyr)
library(survival)
library(glmnet)        # Penalized Cox regression
library(survminer)
library(pROC)

select <- dplyr::select

base_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06"

cat("=============================================================\n")
cat("   MACHINE LEARNING SURVIVAL SIGNATURE DEVELOPMENT\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. LOAD AND PREPARE DATA
#------------------------------------------------------------------------------
cat("=== Loading Data ===\n")

# Load clinical data
tegress_scores <- read.csv(file.path(base_dir, "Lacy_HMRN/results/tegress_scores.csv"),
                           stringsAsFactors = FALSE)
clinical <- tegress_scores %>%
  filter(!is.na(OS_status) & !is.na(OS_time) & OS_time > 0)

# Load expression data
series_file <- file.path(base_dir, "Lacy_HMRN/GSE181063_series_matrix.txt.gz")

con <- gzfile(series_file, "r")
line_num <- 0
while (TRUE) {
  line <- readLines(con, n = 1)
  line_num <- line_num + 1
  if (length(line) == 0) break
  if (grepl("^!series_matrix_table_begin", line)) break
}
close(con)

expr_data <- read.delim(gzfile(series_file), skip = line_num, header = TRUE,
                        stringsAsFactors = FALSE, check.names = FALSE)
expr_data <- expr_data[!grepl("series_matrix_table_end", expr_data[,1]), ]
rownames(expr_data) <- expr_data[,1]
expr_data <- expr_data[, -1]

cat("Expression matrix:", nrow(expr_data), "probes x", ncol(expr_data), "samples\n")

# Load pre-computed survival results for feature pre-selection
global_surv <- read.csv(file.path(base_dir, "global_scripts/survival_global_annotated.csv"),
                        stringsAsFactors = FALSE)

cat("Clinical samples:", nrow(clinical), "\n\n")

#------------------------------------------------------------------------------
# 2. FUNCTION: BUILD PENALIZED COX MODEL (ELASTIC NET)
#------------------------------------------------------------------------------
build_elastic_net_cox <- function(expr_matrix, clinical_data, subset_name = "Global",
                                  preselect_n = 1000, alpha = 0.5, nfolds = 10,
                                  preselect_surv = NULL) {

  cat("\n", paste(rep("=", 70), collapse = ""), "\n")
  cat("   ELASTIC NET COX MODEL:", subset_name, "\n")
  cat(paste(rep("=", 70), collapse = ""), "\n\n")

  # Match samples
  common_samples <- intersect(colnames(expr_matrix), clinical_data$sample_id)

  if (length(common_samples) < 50) {
    cat("WARNING: Only", length(common_samples), "samples - insufficient for modeling\n")
    return(NULL)
  }

  cat("Training samples:", length(common_samples), "\n")

  # Prepare data
  expr_sub <- expr_matrix[, common_samples]
  clin_sub <- clinical_data[match(common_samples, clinical_data$sample_id), ]

  # Convert to numeric matrix
  X <- t(as.matrix(expr_sub))
  X <- apply(X, 2, as.numeric)

  # Remove probes with zero variance
  var_check <- apply(X, 2, var, na.rm = TRUE)
  X <- X[, var_check > 0 & !is.na(var_check)]

  cat("Probes after variance filter:", ncol(X), "\n")

  # Feature pre-selection using univariate results (if provided)
  if (!is.null(preselect_surv) && preselect_n < ncol(X)) {
    top_probes <- preselect_surv %>%
      filter(probe %in% colnames(X)) %>%
      arrange(p_value) %>%
      head(preselect_n) %>%
      pull(probe)

    X <- X[, top_probes]
    cat("Pre-selected top", ncol(X), "probes by univariate p-value\n")
  }

  # Standardize features
  X <- scale(X)
  X[is.na(X)] <- 0

  # Create survival object
  y <- Surv(clin_sub$OS_time, clin_sub$OS_status)

  cat("Events:", sum(clin_sub$OS_status), "/", length(common_samples), "\n\n")

  #----------------------------------------------------------------------------
  # Cross-validated Elastic Net Cox Model
  #----------------------------------------------------------------------------
  cat("--- Fitting Elastic Net Cox (alpha =", alpha, ") ---\n")

  set.seed(42)

  # Fit cross-validated model
  cv_fit <- tryCatch({
    cv.glmnet(X, y, family = "cox", alpha = alpha, nfolds = nfolds,
              type.measure = "C", standardize = FALSE)  # Already standardized
  }, error = function(e) {
    cat("Error in cv.glmnet:", e$message, "\n")
    return(NULL)
  })

  if (is.null(cv_fit)) return(NULL)

  # Get optimal lambda
  lambda_min <- cv_fit$lambda.min
  lambda_1se <- cv_fit$lambda.1se

  cat("Optimal lambda (min):", round(lambda_min, 5), "\n")
  cat("Optimal lambda (1se):", round(lambda_1se, 5), "\n")

  # Get coefficients at lambda.1se (more parsimonious)
  coef_1se <- coef(cv_fit, s = "lambda.1se")
  selected_features <- rownames(coef_1se)[coef_1se[,1] != 0]

  cat("Selected features (1se):", length(selected_features), "\n")

  # Get coefficients at lambda.min (best performance)
  coef_min <- coef(cv_fit, s = "lambda.min")
  selected_features_min <- rownames(coef_min)[coef_min[,1] != 0]

  cat("Selected features (min):", length(selected_features_min), "\n")

  # Calculate C-index
  pred_risk <- predict(cv_fit, newx = X, s = "lambda.1se", type = "response")
  c_index <- concordance(y ~ pred_risk)$concordance

  cat("\nCross-validated C-index:", round(c_index, 4), "\n")

  #----------------------------------------------------------------------------
  # Extract signature
  #----------------------------------------------------------------------------
  # Use lambda.1se for more robust signature
  final_coef <- as.matrix(coef_1se)
  sig_genes <- data.frame(
    probe = rownames(final_coef),
    coefficient = final_coef[,1]
  ) %>%
    filter(coefficient != 0) %>%
    arrange(desc(abs(coefficient)))

  cat("\n--- Signature Genes (top 20) ---\n")
  print(head(sig_genes, 20))

  #----------------------------------------------------------------------------
  # Calculate risk score for all samples
  #----------------------------------------------------------------------------
  risk_score <- as.vector(predict(cv_fit, newx = X, s = "lambda.1se", type = "link"))

  # Create risk groups
  risk_tertiles <- cut(risk_score,
                       breaks = quantile(risk_score, c(0, 0.33, 0.67, 1)),
                       labels = c("Low", "Intermediate", "High"),
                       include.lowest = TRUE)

  # Survival analysis by risk group
  surv_data <- data.frame(
    time = clin_sub$OS_time,
    status = clin_sub$OS_status,
    risk_score = risk_score,
    risk_group = risk_tertiles
  )

  # Log-rank test
  surv_diff <- survdiff(Surv(time, status) ~ risk_group, data = surv_data)
  p_value <- 1 - pchisq(surv_diff$chisq, df = 2)

  cat("\nRisk stratification log-rank p-value:", signif(p_value, 3), "\n")

  # Return results
  return(list(
    model = cv_fit,
    signature = sig_genes,
    c_index = c_index,
    n_features = nrow(sig_genes),
    risk_scores = surv_data,
    p_value = p_value,
    subset = subset_name,
    lambda_1se = lambda_1se,
    lambda_min = lambda_min
  ))
}

#------------------------------------------------------------------------------
# 3. FUNCTION: COMPARE ALPHA VALUES
#------------------------------------------------------------------------------
compare_alpha_values <- function(expr_matrix, clinical_data, subset_name = "Global",
                                 preselect_n = 1000, preselect_surv = NULL) {

  cat("\n--- Comparing alpha values for", subset_name, "---\n")

  alphas <- c(0, 0.25, 0.5, 0.75, 1.0)  # Ridge to LASSO
  results <- data.frame()

  for (a in alphas) {
    cat("  Alpha =", a, "... ")

    result <- tryCatch({
      build_elastic_net_cox(expr_matrix, clinical_data,
                            subset_name = paste(subset_name, "alpha", a),
                            preselect_n = preselect_n, alpha = a,
                            preselect_surv = preselect_surv)
    }, error = function(e) NULL)

    if (!is.null(result)) {
      results <- rbind(results, data.frame(
        alpha = a,
        c_index = result$c_index,
        n_features = result$n_features,
        p_value = result$p_value
      ))
      cat("C-index:", round(result$c_index, 4),
          "Features:", result$n_features, "\n")
    } else {
      cat("Failed\n")
    }
  }

  return(results)
}

#------------------------------------------------------------------------------
# 4. BUILD MODELS FOR EACH COO SUBSET
#------------------------------------------------------------------------------

# Prepare expression matrix
common_samples_all <- intersect(colnames(expr_data), clinical$sample_id)
expr_mat <- as.matrix(expr_data[, common_samples_all])
expr_mat <- apply(expr_mat, 2, as.numeric)
rownames(expr_mat) <- rownames(expr_data)

cat("=== Building Models ===\n")

#--- GLOBAL MODEL ---
cat("\n\n########## GLOBAL MODEL ##########\n")
global_model <- build_elastic_net_cox(
  expr_mat, clinical,
  subset_name = "Global (n=1303)",
  preselect_n = 2000,
  alpha = 0.5,
  preselect_surv = global_surv
)

#--- GCB MODEL ---
cat("\n\n########## GCB MODEL ##########\n")
gcb_clinical <- clinical %>% filter(COO == "GCB")
gcb_surv <- read.csv(file.path(base_dir, "global_scripts/survival_gcb_annotated.csv"),
                     stringsAsFactors = FALSE)

gcb_model <- build_elastic_net_cox(
  expr_mat, gcb_clinical,
  subset_name = "GCB (n=517)",
  preselect_n = 1500,
  alpha = 0.5,
  preselect_surv = gcb_surv
)

#--- ABC MODEL ---
cat("\n\n########## ABC MODEL ##########\n")
abc_clinical <- clinical %>% filter(COO == "ABC")
abc_surv <- read.csv(file.path(base_dir, "global_scripts/survival_abc_annotated.csv"),
                     stringsAsFactors = FALSE)

abc_model <- build_elastic_net_cox(
  expr_mat, abc_clinical,
  subset_name = "ABC (n=345)",
  preselect_n = 1500,
  alpha = 0.5,
  preselect_surv = abc_surv
)

#--- MHG MODEL ---
cat("\n\n########## MHG MODEL ##########\n")
mhg_clinical <- clinical %>% filter(COO == "MHG")
mhg_surv <- read.csv(file.path(base_dir, "global_scripts/survival_mhg_annotated.csv"),
                     stringsAsFactors = FALSE)

mhg_model <- build_elastic_net_cox(
  expr_mat, mhg_clinical,
  subset_name = "MHG (n=164)",
  preselect_n = 500,  # Fewer samples, fewer pre-selected
  alpha = 0.5,
  preselect_surv = mhg_surv
)

#--- UNC MODEL ---
cat("\n\n########## UNC MODEL ##########\n")
unc_clinical <- clinical %>% filter(COO == "UNC")
unc_surv <- read.csv(file.path(base_dir, "global_scripts/survival_unc_annotated.csv"),
                     stringsAsFactors = FALSE)

unc_model <- build_elastic_net_cox(
  expr_mat, unc_clinical,
  subset_name = "UNC (n=277)",
  preselect_n = 1000,
  alpha = 0.5,
  preselect_surv = unc_surv
)

#------------------------------------------------------------------------------
# 5. SUMMARY OF ALL MODELS
#------------------------------------------------------------------------------
cat("\n\n", paste(rep("=", 70), collapse = ""), "\n")
cat("   MODEL COMPARISON SUMMARY\n")
cat(paste(rep("=", 70), collapse = ""), "\n\n")

models <- list(
  Global = global_model,
  GCB = gcb_model,
  ABC = abc_model,
  MHG = mhg_model,
  UNC = unc_model
)

summary_df <- data.frame()
for (name in names(models)) {
  m <- models[[name]]
  if (!is.null(m)) {
    summary_df <- rbind(summary_df, data.frame(
      Subset = name,
      N_samples = nrow(m$risk_scores),
      N_features = m$n_features,
      C_index = round(m$c_index, 4),
      Log_rank_p = signif(m$p_value, 3)
    ))
  }
}

print(summary_df)

#------------------------------------------------------------------------------
# 6. SAVE SIGNATURES
#------------------------------------------------------------------------------
cat("\n\n=== Saving Signatures ===\n")

# Get gene annotations
probe_gene_map <- global_surv %>% select(probe, gene) %>% distinct()

save_signature <- function(model, name) {
  if (is.null(model)) return()

  sig <- model$signature %>%
    left_join(probe_gene_map, by = "probe") %>%
    mutate(
      HR = exp(coefficient),
      Direction = ifelse(coefficient > 0, "Adverse", "Protective")
    ) %>%
    select(probe, gene, coefficient, HR, Direction)

  filename <- file.path(base_dir, "global_scripts",
                        paste0("ml_signature_", tolower(name), ".csv"))
  write.csv(sig, filename, row.names = FALSE)
  cat("Saved:", filename, "\n")

  return(sig)
}

global_sig <- save_signature(global_model, "global")
gcb_sig <- save_signature(gcb_model, "gcb")
abc_sig <- save_signature(abc_model, "abc")
mhg_sig <- save_signature(mhg_model, "mhg")
unc_sig <- save_signature(unc_model, "unc")

#------------------------------------------------------------------------------
# 7. VISUALIZE SIGNATURES
#------------------------------------------------------------------------------
cat("\n\n=== Creating Visualizations ===\n")

fig_dir <- file.path(base_dir, "global_scripts/figures")

# Plot coefficient profiles
if (!is.null(global_model)) {
  png(file.path(fig_dir, "ml_global_cv_curve.png"), width = 1000, height = 600, res = 150)
  plot(global_model$model, main = "Global Model - CV Curve")
  dev.off()
}

# Kaplan-Meier plots for ML signatures
plot_ml_km <- function(model, name) {
  if (is.null(model)) return()

  surv_data <- model$risk_scores
  fit <- survfit(Surv(time, status) ~ risk_group, data = surv_data)

  png(file.path(fig_dir, paste0("ml_km_", tolower(name), ".png")),
      width = 1000, height = 800, res = 150)

  p <- ggsurvplot(fit, data = surv_data,
                  palette = c("#2ecc71", "#f39c12", "#e74c3c"),
                  risk.table = TRUE,
                  pval = TRUE,
                  conf.int = FALSE,
                  xlab = "Time (years)",
                  ylab = "Overall Survival",
                  title = paste("ML Signature -", name),
                  subtitle = paste("C-index:", round(model$c_index, 3),
                                   "| Features:", model$n_features),
                  legend.title = "Risk Group",
                  risk.table.height = 0.25,
                  ggtheme = theme_bw())
  print(p)
  dev.off()

  cat("Saved KM plot for", name, "\n")
}

plot_ml_km(global_model, "Global")
plot_ml_km(gcb_model, "GCB")
plot_ml_km(abc_model, "ABC")
plot_ml_km(mhg_model, "MHG")
plot_ml_km(unc_model, "UNC")

#------------------------------------------------------------------------------
# 8. TOP SIGNATURE GENES SUMMARY
#------------------------------------------------------------------------------
cat("\n\n", paste(rep("=", 70), collapse = ""), "\n")
cat("   TOP SIGNATURE GENES BY SUBSET\n")
cat(paste(rep("=", 70), collapse = ""), "\n")

print_top_genes <- function(sig, name, n = 15) {
  if (is.null(sig)) return()

  cat("\n---", name, "Signature (top", min(n, nrow(sig)), ") ---\n")

  top_genes <- sig %>%
    arrange(desc(abs(coefficient))) %>%
    head(n) %>%
    mutate(
      HR = round(HR, 3),
      coefficient = round(coefficient, 4)
    )

  print(top_genes)
}

print_top_genes(global_sig, "Global")
print_top_genes(gcb_sig, "GCB")
print_top_genes(abc_sig, "ABC")
print_top_genes(mhg_sig, "MHG")
print_top_genes(unc_sig, "UNC")

cat("\n\n=== ML SIGNATURE DEVELOPMENT COMPLETE ===\n")
