# Unbiased Genome-Wide Survival Analysis by COO Subset
# HMRN/Lacy Expression Data - ALL samples with survival data

library(survival)
library(dplyr)
library(tidyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("   UNBIASED PROGNOSTIC GENE ANALYSIS BY COO SUBSET\n")
cat("   HMRN/Lacy Cohort - Full Expression Data\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. LOAD EXPRESSION DATA
#------------------------------------------------------------------------------
cat("=== Loading Expression Data ===\n")

series_file <- "Lacy_HMRN/GSE181063_series_matrix.txt.gz"

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

cat("Expression matrix:", nrow(expr_data), "probes x", ncol(expr_data), "samples\n\n")

#------------------------------------------------------------------------------
# 2. LOAD CLINICAL DATA
#------------------------------------------------------------------------------
cat("=== Loading Clinical Data ===\n")

tegress_scores <- read.csv("Lacy_HMRN/results/tegress_scores.csv", stringsAsFactors = FALSE)

clinical <- tegress_scores %>%
  filter(!is.na(OS_status) & !is.na(OS_time) & OS_time > 0)

cat("Samples with survival data:", nrow(clinical), "\n")
cat("\nCOO distribution:\n")
print(table(clinical$COO, useNA = "ifany"))

#------------------------------------------------------------------------------
# 3. FUNCTION: RUN SURVIVAL ANALYSIS
#------------------------------------------------------------------------------
run_survival_analysis <- function(expr_matrix, clinical_data, subset_name = "Global") {

  cat("\n", paste(rep("=", 60), collapse = ""), "\n")
  cat("   ANALYSIS:", subset_name, "\n")
  cat(paste(rep("=", 60), collapse = ""), "\n\n")

  # Match samples
  common_samples <- intersect(colnames(expr_matrix), clinical_data$sample_id)

  if (length(common_samples) < 30) {
    cat("WARNING: Only", length(common_samples), "samples - skipping\n")
    return(NULL)
  }

  cat("Samples:", length(common_samples), "\n")
  cat("Events:", sum(clinical_data$OS_status[clinical_data$sample_id %in% common_samples]), "\n\n")

  # Subset and align data
  expr_sub <- expr_matrix[, common_samples]
  clin_sub <- clinical_data[match(common_samples, clinical_data$sample_id), ]

  # Convert to numeric matrix
  expr_mat <- as.matrix(expr_sub)
  expr_mat <- apply(expr_mat, 2, as.numeric)
  rownames(expr_mat) <- rownames(expr_sub)

  # Test each probe
  cat("Testing", nrow(expr_mat), "probes...\n")

  results <- data.frame(
    probe = character(),
    n_samples = integer(),
    HR = numeric(),
    HR_lower = numeric(),
    HR_upper = numeric(),
    p_value = numeric(),
    stringsAsFactors = FALSE
  )

  for (i in 1:nrow(expr_mat)) {
    probe <- rownames(expr_mat)[i]
    probe_expr <- expr_mat[i, ]

    if (sum(!is.na(probe_expr)) < 30 || sd(probe_expr, na.rm = TRUE) < 0.01) next

    surv_df <- data.frame(
      OS_time = clin_sub$OS_time,
      OS_status = clin_sub$OS_status,
      expr = probe_expr
    ) %>% filter(!is.na(expr))

    if (nrow(surv_df) < 30) next

    cox <- tryCatch({
      coxph(Surv(OS_time, OS_status) ~ expr, data = surv_df)
    }, error = function(e) NULL, warning = function(w) NULL)

    if (!is.null(cox)) {
      coef <- summary(cox)$coefficients
      ci <- exp(confint(cox))

      results <- rbind(results, data.frame(
        probe = probe,
        n_samples = nrow(surv_df),
        HR = exp(coef[1, 1]),
        HR_lower = ci[1],
        HR_upper = ci[2],
        p_value = coef[1, 5]
      ))
    }

    if (i %% 5000 == 0) cat("  Tested", i, "probes...\n")
  }

  cat("  Completed:", nrow(results), "probes tested\n\n")

  results$FDR <- p.adjust(results$p_value, method = "BH")
  results <- results %>% arrange(p_value)

  cat("--- Summary ---\n")
  cat("Significant (p < 0.05):", sum(results$p_value < 0.05), "\n")
  cat("Significant (p < 0.01):", sum(results$p_value < 0.01), "\n")
  cat("Significant (FDR < 0.1):", sum(results$FDR < 0.1), "\n")
  cat("Significant (FDR < 0.05):", sum(results$FDR < 0.05), "\n\n")

  cat("--- Top 20 Prognostic Probes ---\n")
  top_results <- results %>%
    head(20) %>%
    mutate(
      HR = round(HR, 3),
      p_value = signif(p_value, 3),
      FDR = signif(FDR, 3)
    )
  print(top_results %>% select(probe, HR, p_value, FDR))

  # Split by direction
  sig_probes <- results %>% filter(p_value < 0.01)

  cat("\n--- Protective (HR < 1) ---\n")
  print(sig_probes %>% filter(HR < 1) %>% head(10) %>%
          mutate(HR = round(HR, 3), p_value = signif(p_value, 3)) %>%
          select(probe, HR, p_value))

  cat("\n--- Harmful (HR > 1) ---\n")
  print(sig_probes %>% filter(HR > 1) %>% head(10) %>%
          mutate(HR = round(HR, 3), p_value = signif(p_value, 3)) %>%
          select(probe, HR, p_value))

  return(results)
}

#------------------------------------------------------------------------------
# 4. RUN ANALYSES BY COO SUBSET
#------------------------------------------------------------------------------

# Global (all samples)
global_results <- run_survival_analysis(expr_data, clinical, "GLOBAL (All COO)")

# GCB
gcb_clinical <- clinical %>% filter(COO == "GCB")
gcb_results <- run_survival_analysis(expr_data, gcb_clinical, "GCB")

# ABC
abc_clinical <- clinical %>% filter(COO == "ABC")
abc_results <- run_survival_analysis(expr_data, abc_clinical, "ABC")

# MHG
mhg_clinical <- clinical %>% filter(COO == "MHG")
mhg_results <- run_survival_analysis(expr_data, mhg_clinical, "MHG")

# UNC
unc_clinical <- clinical %>% filter(COO == "UNC")
unc_results <- run_survival_analysis(expr_data, unc_clinical, "UNC")

#------------------------------------------------------------------------------
# 5. CROSS-SUBSET COMPARISON
#------------------------------------------------------------------------------
cat("\n", paste(rep("=", 60), collapse = ""), "\n")
cat("   CROSS-SUBSET COMPARISON\n")
cat(paste(rep("=", 60), collapse = ""), "\n\n")

get_top_probes <- function(results, n = 100, p_thresh = 0.01) {
  if (is.null(results)) return(character(0))
  results %>% filter(p_value < p_thresh) %>% head(n) %>% pull(probe)
}

global_top <- get_top_probes(global_results)
gcb_top <- get_top_probes(gcb_results)
abc_top <- get_top_probes(abc_results)
mhg_top <- get_top_probes(mhg_results)
unc_top <- get_top_probes(unc_results)

cat("Significant probes (p < 0.01) by subset:\n")
cat("  Global:", length(global_top), "\n")
cat("  GCB:", length(gcb_top), "\n")
cat("  ABC:", length(abc_top), "\n")
cat("  MHG:", length(mhg_top), "\n")
cat("  UNC:", length(unc_top), "\n\n")

# Overlaps
if (length(gcb_top) > 0 && length(abc_top) > 0) {
  overlap <- intersect(gcb_top, abc_top)
  cat("GCB ∩ ABC:", length(overlap), "\n")
}
if (length(gcb_top) > 0 && length(mhg_top) > 0) {
  overlap <- intersect(gcb_top, mhg_top)
  cat("GCB ∩ MHG:", length(overlap), "\n")
}
if (length(abc_top) > 0 && length(mhg_top) > 0) {
  overlap <- intersect(abc_top, mhg_top)
  cat("ABC ∩ MHG:", length(overlap), "\n")
}

# Subset-specific
if (length(mhg_top) > 0) {
  mhg_specific <- setdiff(mhg_top, c(gcb_top, abc_top))
  cat("\nMHG-specific probes:", length(mhg_specific), "\n")
  if (length(mhg_specific) > 0 && !is.null(mhg_results)) {
    cat("Top MHG-specific:\n")
    print(mhg_results %>% filter(probe %in% mhg_specific) %>% head(10) %>%
            mutate(HR = round(HR, 3), p_value = signif(p_value, 3)) %>%
            select(probe, HR, p_value))
  }
}

if (length(abc_top) > 0) {
  abc_specific <- setdiff(abc_top, c(gcb_top, mhg_top))
  cat("\nABC-specific probes:", length(abc_specific), "\n")
  if (length(abc_specific) > 0 && !is.null(abc_results)) {
    cat("Top ABC-specific:\n")
    print(abc_results %>% filter(probe %in% abc_specific) %>% head(10) %>%
            mutate(HR = round(HR, 3), p_value = signif(p_value, 3)) %>%
            select(probe, HR, p_value))
  }
}

#------------------------------------------------------------------------------
# 6. SAVE RESULTS
#------------------------------------------------------------------------------
cat("\n", paste(rep("=", 60), collapse = ""), "\n")
cat("   SAVING RESULTS\n")
cat(paste(rep("=", 60), collapse = ""), "\n\n")

write.csv(global_results, "global_scripts/survival_global_all_coo.csv", row.names = FALSE)
if (!is.null(gcb_results)) write.csv(gcb_results, "global_scripts/survival_gcb.csv", row.names = FALSE)
if (!is.null(abc_results)) write.csv(abc_results, "global_scripts/survival_abc.csv", row.names = FALSE)
if (!is.null(mhg_results)) write.csv(mhg_results, "global_scripts/survival_mhg.csv", row.names = FALSE)
if (!is.null(unc_results)) write.csv(unc_results, "global_scripts/survival_unc.csv", row.names = FALSE)

cat("Saved survival analysis results for all subsets\n")
cat("\n=== ANALYSIS COMPLETE ===\n")
