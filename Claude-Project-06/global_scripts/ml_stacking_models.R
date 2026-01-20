# Stacking/Ensemble Machine Learning for Survival Signatures
# Combines multiple base learners for optimal prediction

library(dplyr)
library(survival)
library(glmnet)
library(randomForestSRC)  # Random Survival Forests
library(survminer)

select <- dplyr::select

base_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06"

cat("=============================================================\n")
cat("   STACKING ENSEMBLE SURVIVAL MODELS\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. LOAD DATA
#------------------------------------------------------------------------------
cat("=== Loading Data ===\n")

tegress_scores <- read.csv(file.path(base_dir, "Lacy_HMRN/results/tegress_scores.csv"),
                           stringsAsFactors = FALSE)
clinical <- tegress_scores %>%
  filter(!is.na(OS_status) & !is.na(OS_time) & OS_time > 0)

# Load expression
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

# Load survival results for pre-selection
global_surv <- read.csv(file.path(base_dir, "global_scripts/survival_global_annotated.csv"),
                        stringsAsFactors = FALSE)

cat("Expression:", nrow(expr_data), "probes x", ncol(expr_data), "samples\n")
cat("Clinical:", nrow(clinical), "samples\n\n")

#------------------------------------------------------------------------------
# 2. STACKING ENSEMBLE CLASS
#------------------------------------------------------------------------------

#' Build Stacking Ensemble for Survival
#'
#' This function implements a stacking approach with:
#' - Level 1: Multiple base learners (Elastic Net, LASSO, Ridge, RSF)
#' - Level 2: Meta-learner combines base predictions
#'
#' @param X Feature matrix (samples x features)
#' @param y Surv object
#' @param n_folds Number of CV folds
#' @return Ensemble model object
build_stacking_ensemble <- function(X, y, clinical_data, subset_name = "Global",
                                    n_folds = 5, preselect_n = 500) {

  cat("\n", paste(rep("=", 70), collapse = ""), "\n")
  cat("   STACKING ENSEMBLE:", subset_name, "\n")
  cat(paste(rep("=", 70), collapse = ""), "\n\n")

  n_samples <- nrow(X)
  cat("Samples:", n_samples, "\n")
  cat("Features:", ncol(X), "\n")
  cat("Events:", sum(y[,2]), "\n\n")

  # Standardize
  X_scaled <- scale(X)
  X_scaled[is.na(X_scaled)] <- 0

  #----------------------------------------------------------------------------
  # Create CV folds (stratified by event status)
  #----------------------------------------------------------------------------
  set.seed(42)
  event_idx <- which(y[,2] == 1)
  censor_idx <- which(y[,2] == 0)

  # Stratified fold assignment
  fold_assign <- rep(NA, n_samples)
  fold_assign[event_idx] <- sample(rep(1:n_folds, length.out = length(event_idx)))
  fold_assign[censor_idx] <- sample(rep(1:n_folds, length.out = length(censor_idx)))

  #----------------------------------------------------------------------------
  # Level 1: Train base learners and get out-of-fold predictions
  #----------------------------------------------------------------------------
  cat("--- Level 1: Training Base Learners ---\n\n")

  # Initialize prediction matrices
  pred_lasso <- rep(NA, n_samples)
  pred_ridge <- rep(NA, n_samples)
  pred_enet <- rep(NA, n_samples)
  pred_rsf <- rep(NA, n_samples)

  # Store models for final ensemble
  models_lasso <- list()
  models_ridge <- list()
  models_enet <- list()
  models_rsf <- list()

  for (fold in 1:n_folds) {
    cat("Fold", fold, "/", n_folds, "...\n")

    train_idx <- which(fold_assign != fold)
    test_idx <- which(fold_assign == fold)

    X_train <- X_scaled[train_idx, ]
    y_train <- y[train_idx]
    X_test <- X_scaled[test_idx, ]

    #--- LASSO (alpha = 1) ---
    tryCatch({
      cv_lasso <- cv.glmnet(X_train, y_train, family = "cox", alpha = 1,
                            nfolds = 5, type.measure = "C")
      models_lasso[[fold]] <- cv_lasso
      pred_lasso[test_idx] <- as.vector(predict(cv_lasso, newx = X_test,
                                                 s = "lambda.1se", type = "link"))
    }, error = function(e) cat("  LASSO failed\n"))

    #--- Ridge (alpha = 0) ---
    tryCatch({
      cv_ridge <- cv.glmnet(X_train, y_train, family = "cox", alpha = 0,
                            nfolds = 5, type.measure = "C")
      models_ridge[[fold]] <- cv_ridge
      pred_ridge[test_idx] <- as.vector(predict(cv_ridge, newx = X_test,
                                                 s = "lambda.1se", type = "link"))
    }, error = function(e) cat("  Ridge failed\n"))

    #--- Elastic Net (alpha = 0.5) ---
    tryCatch({
      cv_enet <- cv.glmnet(X_train, y_train, family = "cox", alpha = 0.5,
                           nfolds = 5, type.measure = "C")
      models_enet[[fold]] <- cv_enet
      pred_enet[test_idx] <- as.vector(predict(cv_enet, newx = X_test,
                                                s = "lambda.1se", type = "link"))
    }, error = function(e) cat("  ElasticNet failed\n"))

    #--- Random Survival Forest ---
    tryCatch({
      # RSF needs data frame format
      train_df <- data.frame(
        time = y_train[,1],
        status = y_train[,2],
        X_train
      )
      # Limit to fewer features for RSF (computational)
      n_rsf_features <- min(200, ncol(X_train))
      train_df <- train_df[, 1:(n_rsf_features + 2)]

      rsf_model <- rfsrc(Surv(time, status) ~ ., data = train_df,
                         ntree = 500, nodesize = 10, importance = FALSE)
      models_rsf[[fold]] <- rsf_model

      test_df <- data.frame(X_test[, 1:n_rsf_features])
      names(test_df) <- names(train_df)[3:ncol(train_df)]
      rsf_pred <- predict(rsf_model, newdata = test_df)
      pred_rsf[test_idx] <- rsf_pred$predicted
    }, error = function(e) cat("  RSF failed:", e$message, "\n"))
  }

  #----------------------------------------------------------------------------
  # Level 2: Meta-learner (combine predictions)
  #----------------------------------------------------------------------------
  cat("\n--- Level 2: Training Meta-Learner ---\n")

  # Create meta-feature matrix
  meta_X <- cbind(
    lasso = pred_lasso,
    ridge = pred_ridge,
    enet = pred_enet,
    rsf = pred_rsf
  )

  # Remove any NA columns
  valid_cols <- colSums(is.na(meta_X)) < n_samples * 0.5
  meta_X <- meta_X[, valid_cols, drop = FALSE]

  cat("Meta-features:", ncol(meta_X), "\n")

  # Impute remaining NAs with column means
  for (j in 1:ncol(meta_X)) {
    meta_X[is.na(meta_X[,j]), j] <- mean(meta_X[,j], na.rm = TRUE)
  }

  # Standardize meta-features
  meta_X <- scale(meta_X)

  #--- Option 1: Simple weighted average (weights from correlation) ---
  # Calculate C-index for each base learner
  c_indices <- sapply(1:ncol(meta_X), function(j) {
    concordance(y ~ meta_X[,j])$concordance
  })
  names(c_indices) <- colnames(meta_X)

  cat("\nBase learner C-indices:\n")
  print(round(c_indices, 4))

  # Calculate weights with proper handling of C-indices < 0.5
  # C-index < 0.5 indicates inverted predictions; use |C - 0.5| as discriminative power
  # Then use softmax-like transformation for stability
  discriminative_power <- abs(c_indices - 0.5)

  # Track which predictions need to be inverted (C < 0.5 means higher score = better survival)
  invert_mask <- c_indices < 0.5
  if (any(invert_mask)) {
    cat("\nNote: Inverting predictions for:", names(c_indices)[invert_mask], "\n")
    meta_X[, invert_mask] <- -meta_X[, invert_mask]
  }

  # Use softmax-like weighting based on discriminative power
  # Add small epsilon to prevent division by zero
  if (sum(discriminative_power) > 0) {
    weights <- discriminative_power / sum(discriminative_power)
  } else {
    # Fallback to equal weights if all learners perform at chance
    cat("\nWarning: All learners near chance level. Using equal weights.\n")
    weights <- rep(1/length(c_indices), length(c_indices))
  }

  cat("\nOptimal weights:\n")
  print(round(weights, 3))

  # Weighted ensemble prediction
  ensemble_pred_weighted <- meta_X %*% weights

  #--- Option 2: Cox meta-learner ---
  meta_cox <- tryCatch({
    coxph(y ~ ., data = data.frame(meta_X))
  }, error = function(e) NULL)

  if (!is.null(meta_cox)) {
    ensemble_pred_cox <- predict(meta_cox, type = "lp")
    c_meta_cox <- concordance(y ~ ensemble_pred_cox)$concordance
    cat("\nMeta-Cox C-index:", round(c_meta_cox, 4), "\n")
  } else {
    ensemble_pred_cox <- ensemble_pred_weighted
    c_meta_cox <- NA
  }

  #--- Option 3: Elastic Net meta-learner ---
  meta_enet <- tryCatch({
    cv.glmnet(meta_X, y, family = "cox", alpha = 0.5, nfolds = 5)
  }, error = function(e) NULL)

  if (!is.null(meta_enet)) {
    ensemble_pred_enet <- as.vector(predict(meta_enet, newx = meta_X,
                                            s = "lambda.min", type = "link"))
    c_meta_enet <- concordance(y ~ ensemble_pred_enet)$concordance
    cat("Meta-ENet C-index:", round(c_meta_enet, 4), "\n")
  } else {
    ensemble_pred_enet <- ensemble_pred_weighted
    c_meta_enet <- NA
  }

  # Weighted average C-index
  c_weighted <- concordance(y ~ ensemble_pred_weighted)$concordance
  cat("Weighted Avg C-index:", round(c_weighted, 4), "\n")

  #----------------------------------------------------------------------------
  # Select best ensemble method
  #----------------------------------------------------------------------------
  all_c <- c(
    weighted = c_weighted,
    meta_cox = ifelse(is.na(c_meta_cox), 0, c_meta_cox),
    meta_enet = ifelse(is.na(c_meta_enet), 0, c_meta_enet)
  )

  best_method <- names(which.max(all_c))
  best_c <- max(all_c)

  cat("\nBest method:", best_method, "with C-index:", round(best_c, 4), "\n")

  # Get final ensemble predictions
  if (best_method == "weighted") {
    final_pred <- ensemble_pred_weighted
  } else if (best_method == "meta_cox") {
    final_pred <- ensemble_pred_cox
  } else {
    final_pred <- ensemble_pred_enet
  }

  #----------------------------------------------------------------------------
  # Risk stratification
  #----------------------------------------------------------------------------
  risk_tertiles <- cut(final_pred,
                       breaks = quantile(final_pred, c(0, 0.33, 0.67, 1)),
                       labels = c("Low", "Intermediate", "High"),
                       include.lowest = TRUE)

  surv_data <- data.frame(
    time = y[,1],
    status = y[,2],
    risk_score = as.vector(final_pred),
    risk_group = risk_tertiles
  )

  # Log-rank test
  surv_diff <- survdiff(Surv(time, status) ~ risk_group, data = surv_data)
  p_value <- 1 - pchisq(surv_diff$chisq, df = 2)

  cat("\nLog-rank p-value:", signif(p_value, 3), "\n")

  #----------------------------------------------------------------------------
  # Return ensemble object
  #----------------------------------------------------------------------------
  return(list(
    base_models = list(
      lasso = models_lasso,
      ridge = models_ridge,
      enet = models_enet,
      rsf = models_rsf
    ),
    meta_model = list(
      method = best_method,
      weights = weights,
      meta_cox = meta_cox,
      meta_enet = meta_enet
    ),
    base_c_indices = c_indices,
    ensemble_c_index = best_c,
    risk_scores = surv_data,
    p_value = p_value,
    subset = subset_name
  ))
}

#------------------------------------------------------------------------------
# 3. PREPARE DATA AND BUILD ENSEMBLES
#------------------------------------------------------------------------------

# Prepare expression matrix
common_samples <- intersect(colnames(expr_data), clinical$sample_id)
expr_mat <- as.matrix(expr_data[, common_samples])
expr_mat <- apply(expr_mat, 2, as.numeric)
rownames(expr_mat) <- rownames(expr_data)

# Align clinical
clin_aligned <- clinical[match(common_samples, clinical$sample_id), ]

# Pre-select top features
top_probes <- global_surv %>%
  filter(probe %in% rownames(expr_mat)) %>%
  arrange(p_value) %>%
  head(1000) %>%
  pull(probe)

X_global <- t(expr_mat[top_probes, ])
y_global <- Surv(clin_aligned$OS_time, clin_aligned$OS_status)

#--- GLOBAL ENSEMBLE ---
cat("\n\n########## GLOBAL STACKING ENSEMBLE ##########\n")

global_ensemble <- build_stacking_ensemble(
  X_global, y_global, clin_aligned,
  subset_name = "Global (n=1303)",
  n_folds = 5
)

#--- GCB ENSEMBLE ---
cat("\n\n########## GCB STACKING ENSEMBLE ##########\n")

gcb_idx <- which(clin_aligned$COO == "GCB")
gcb_surv <- read.csv(file.path(base_dir, "global_scripts/survival_gcb_annotated.csv"),
                     stringsAsFactors = FALSE)

top_gcb_probes <- gcb_surv %>%
  filter(probe %in% rownames(expr_mat)) %>%
  arrange(p_value) %>%
  head(800) %>%
  pull(probe)

X_gcb <- t(expr_mat[top_gcb_probes, common_samples[gcb_idx]])
y_gcb <- Surv(clin_aligned$OS_time[gcb_idx], clin_aligned$OS_status[gcb_idx])

gcb_ensemble <- build_stacking_ensemble(
  X_gcb, y_gcb, clin_aligned[gcb_idx, ],
  subset_name = "GCB (n=517)",
  n_folds = 5
)

#--- ABC ENSEMBLE ---
cat("\n\n########## ABC STACKING ENSEMBLE ##########\n")

abc_idx <- which(clin_aligned$COO == "ABC")
abc_surv <- read.csv(file.path(base_dir, "global_scripts/survival_abc_annotated.csv"),
                     stringsAsFactors = FALSE)

top_abc_probes <- abc_surv %>%
  filter(probe %in% rownames(expr_mat)) %>%
  arrange(p_value) %>%
  head(800) %>%
  pull(probe)

X_abc <- t(expr_mat[top_abc_probes, common_samples[abc_idx]])
y_abc <- Surv(clin_aligned$OS_time[abc_idx], clin_aligned$OS_status[abc_idx])

abc_ensemble <- build_stacking_ensemble(
  X_abc, y_abc, clin_aligned[abc_idx, ],
  subset_name = "ABC (n=345)",
  n_folds = 5
)

#--- MHG ENSEMBLE ---
cat("\n\n########## MHG STACKING ENSEMBLE ##########\n")

mhg_idx <- which(clin_aligned$COO == "MHG")
mhg_surv <- read.csv(file.path(base_dir, "global_scripts/survival_mhg_annotated.csv"),
                     stringsAsFactors = FALSE)

top_mhg_probes <- mhg_surv %>%
  filter(probe %in% rownames(expr_mat)) %>%
  arrange(p_value) %>%
  head(500) %>%
  pull(probe)

X_mhg <- t(expr_mat[top_mhg_probes, common_samples[mhg_idx]])
y_mhg <- Surv(clin_aligned$OS_time[mhg_idx], clin_aligned$OS_status[mhg_idx])

mhg_ensemble <- tryCatch({
  build_stacking_ensemble(
    X_mhg, y_mhg, clin_aligned[mhg_idx, ],
    subset_name = "MHG (n=164)",
    n_folds = 5
  )
}, error = function(e) {
  cat("MHG ensemble failed:", e$message, "\n")
  NULL
})

#--- UNC ENSEMBLE ---
cat("\n\n########## UNC STACKING ENSEMBLE ##########\n")

unc_idx <- which(clin_aligned$COO == "UNC")
unc_surv <- read.csv(file.path(base_dir, "global_scripts/survival_unc_annotated.csv"),
                     stringsAsFactors = FALSE)

top_unc_probes <- unc_surv %>%
  filter(probe %in% rownames(expr_mat)) %>%
  arrange(p_value) %>%
  head(500) %>%
  pull(probe)

X_unc <- t(expr_mat[top_unc_probes, common_samples[unc_idx]])
y_unc <- Surv(clin_aligned$OS_time[unc_idx], clin_aligned$OS_status[unc_idx])

unc_ensemble <- tryCatch({
  build_stacking_ensemble(
    X_unc, y_unc, clin_aligned[unc_idx, ],
    subset_name = "UNC (n=277)",
    n_folds = 5
  )
}, error = function(e) {
  cat("UNC ensemble failed:", e$message, "\n")
  NULL
})

#------------------------------------------------------------------------------
# 4. SUMMARY
#------------------------------------------------------------------------------
cat("\n\n", paste(rep("=", 70), collapse = ""), "\n")
cat("   STACKING ENSEMBLE SUMMARY\n")
cat(paste(rep("=", 70), collapse = ""), "\n\n")

ensembles <- list(Global = global_ensemble, GCB = gcb_ensemble, ABC = abc_ensemble,
                  MHG = mhg_ensemble, UNC = unc_ensemble)

summary_df <- data.frame()
for (name in names(ensembles)) {
  ens <- ensembles[[name]]
  if (!is.null(ens)) {
    base_c <- paste(names(ens$base_c_indices), "=",
                    round(ens$base_c_indices, 3), collapse = ", ")

    summary_df <- rbind(summary_df, data.frame(
      Subset = name,
      N_samples = nrow(ens$risk_scores),
      Ensemble_C = round(ens$ensemble_c_index, 4),
      Best_Method = ens$meta_model$method,
      Log_rank_p = signif(ens$p_value, 3)
    ))

    cat("\n---", name, "---\n")
    cat("Base learners:", base_c, "\n")
    cat("Ensemble C-index:", round(ens$ensemble_c_index, 4), "\n")
    cat("Method:", ens$meta_model$method, "\n")
  }
}

cat("\n\n--- Summary Table ---\n")
print(summary_df)

#------------------------------------------------------------------------------
# 5. VISUALIZATIONS
#------------------------------------------------------------------------------
cat("\n\n=== Creating Visualizations ===\n")

fig_dir <- file.path(base_dir, "global_scripts/figures")

plot_ensemble_km <- function(ensemble, name) {
  if (is.null(ensemble)) return()

  surv_data <- ensemble$risk_scores
  fit <- survfit(Surv(time, status) ~ risk_group, data = surv_data)

  png(file.path(fig_dir, paste0("ml_stacking_km_", tolower(name), ".png")),
      width = 1000, height = 800, res = 150)

  p <- ggsurvplot(fit, data = surv_data,
                  palette = c("#2ecc71", "#f39c12", "#e74c3c"),
                  risk.table = TRUE,
                  pval = TRUE,
                  conf.int = FALSE,
                  xlab = "Time (years)",
                  ylab = "Overall Survival",
                  title = paste("Stacking Ensemble -", name),
                  subtitle = paste("C-index:", round(ensemble$ensemble_c_index, 3)),
                  legend.title = "Risk Group",
                  risk.table.height = 0.25,
                  ggtheme = theme_bw())
  print(p)
  dev.off()

  cat("Saved KM plot for", name, "\n")
}

plot_ensemble_km(global_ensemble, "Global")
plot_ensemble_km(gcb_ensemble, "GCB")
plot_ensemble_km(abc_ensemble, "ABC")
plot_ensemble_km(mhg_ensemble, "MHG")
plot_ensemble_km(unc_ensemble, "UNC")

# Base learner comparison plot
png(file.path(fig_dir, "ml_base_learner_comparison.png"),
    width = 1000, height = 600, res = 150)

base_comparison <- data.frame()
for (name in names(ensembles)) {
  ens <- ensembles[[name]]
  if (!is.null(ens)) {
    for (learner in names(ens$base_c_indices)) {
      base_comparison <- rbind(base_comparison, data.frame(
        Subset = name,
        Learner = learner,
        C_index = ens$base_c_indices[learner]
      ))
    }
    # Add ensemble
    base_comparison <- rbind(base_comparison, data.frame(
      Subset = name,
      Learner = "ENSEMBLE",
      C_index = ens$ensemble_c_index
    ))
  }
}

library(ggplot2)
p <- ggplot(base_comparison, aes(x = Learner, y = C_index, fill = Subset)) +
  geom_bar(stat = "identity", position = "dodge", width = 0.7) +
  geom_hline(yintercept = 0.5, linetype = "dashed", color = "red") +
  scale_fill_manual(values = c("Global" = "#3498db", "GCB" = "#2ecc71", "ABC" = "#e74c3c",
                               "MHG" = "#9b59b6", "UNC" = "#f39c12")) +
  labs(title = "Base Learner vs Ensemble Performance",
       x = "Model", y = "C-index",
       subtitle = "Dashed line = random prediction (0.5)") +
  theme_minimal() +
  theme(plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
        axis.text.x = element_text(angle = 45, hjust = 1)) +
  coord_cartesian(ylim = c(0.4, 0.8))

print(p)
dev.off()

cat("\n=== STACKING ENSEMBLE COMPLETE ===\n")
