# Unbiased Genome-Wide Analysis: IPI-Independent Prognostic Genes
# HMRN/Lacy Expression Data
# Global and Subset-Specific Analysis

library(survival)
library(dplyr)
library(tidyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("   UNBIASED IPI-INDEPENDENT PROGNOSTIC GENE ANALYSIS\n")
cat("   HMRN/Lacy Cohort - Global and Subset-Specific\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. LOAD EXPRESSION DATA
#------------------------------------------------------------------------------
cat("=== Loading Expression Data ===\n")

series_file <- "Lacy_HMRN/GSE181063_series_matrix.txt.gz"

# Read header to find data start
con <- gzfile(series_file, "r")
line_num <- 0
while (TRUE) {
  line <- readLines(con, n = 1)
  line_num <- line_num + 1
  if (length(line) == 0) break
  if (grepl("^!series_matrix_table_begin", line)) break
}
close(con)

# Read expression data
expr_data <- read.delim(gzfile(series_file), skip = line_num, header = TRUE,
                        stringsAsFactors = FALSE, check.names = FALSE)
expr_data <- expr_data[!grepl("series_matrix_table_end", expr_data[,1]), ]
rownames(expr_data) <- expr_data[,1]
expr_data <- expr_data[, -1]

cat("Expression matrix:", nrow(expr_data), "probes x", ncol(expr_data), "samples\n\n")

#------------------------------------------------------------------------------
# 2. LOAD CLINICAL DATA WITH COO AND IPI
#------------------------------------------------------------------------------
cat("=== Loading Clinical Data ===\n")

# Load tEgress data (has COO classification)
tegress_scores <- read.csv("Lacy_HMRN/results/tegress_scores.csv", stringsAsFactors = FALSE)

# Load GCB staged data (has IPI)
gcb_staged <- read.csv("Lacy_HMRN/results/gcb_staged_tegress.csv", stringsAsFactors = FALSE)
gcb_staged$ipi_num <- as.numeric(gcb_staged$ipi_score)

# Merge clinical data
clinical <- tegress_scores %>%
  select(sample_id, COO, OS_status, OS_time) %>%
  left_join(gcb_staged %>% select(sample_id, ipi_num, Stage, stage_group),
            by = "sample_id") %>%
  filter(!is.na(OS_status) & !is.na(OS_time) & OS_time > 0)

cat("Samples with survival data:", nrow(clinical), "\n")
cat("Samples with IPI:", sum(!is.na(clinical$ipi_num)), "\n")
cat("\nCOO distribution:\n")
print(table(clinical$COO, useNA = "ifany"))

#------------------------------------------------------------------------------
# 3. FUNCTION: RUN IPI-INDEPENDENT ANALYSIS
#------------------------------------------------------------------------------
run_ipi_independent_analysis <- function(expr_matrix, clinical_data, subset_name = "Global") {

  cat("\n", paste(rep("=", 60), collapse = ""), "\n")
  cat("   ANALYSIS:", subset_name, "\n")
  cat(paste(rep("=", 60), collapse = ""), "\n\n")

  # Filter to samples with IPI
  clinical_ipi <- clinical_data %>% filter(!is.na(ipi_num))

  # Match samples
  common_samples <- intersect(colnames(expr_matrix), clinical_ipi$sample_id)

  if (length(common_samples) < 30) {
    cat("WARNING: Only", length(common_samples), "samples - skipping\n")
    return(NULL)
  }

  cat("Samples:", length(common_samples), "\n")
  cat("Events:", sum(clinical_ipi$OS_status[clinical_ipi$sample_id %in% common_samples]), "\n\n")

  # Subset and align data
  expr_sub <- expr_matrix[, common_samples]
  clin_sub <- clinical_ipi[match(common_samples, clinical_ipi$sample_id), ]

  # Convert to numeric matrix
  expr_mat <- as.matrix(expr_sub)
  expr_mat <- apply(expr_mat, 2, as.numeric)
  rownames(expr_mat) <- rownames(expr_sub)

  # Test each probe
  cat("Testing", nrow(expr_mat), "probes...\n")

  results <- data.frame(
    probe = character(),
    n_samples = integer(),
    uni_HR = numeric(),
    uni_p = numeric(),
    adj_HR = numeric(),
    adj_p = numeric(),
    ipi_HR = numeric(),
    ipi_p = numeric(),
    stringsAsFactors = FALSE
  )

  for (i in 1:nrow(expr_mat)) {
    probe <- rownames(expr_mat)[i]
    probe_expr <- expr_mat[i, ]

    # Skip if too many NAs or no variance
    if (sum(!is.na(probe_expr)) < 30 || sd(probe_expr, na.rm = TRUE) < 0.01) next

    # Create analysis data frame
    surv_df <- data.frame(
      OS_time = clin_sub$OS_time,
      OS_status = clin_sub$OS_status,
      expr = probe_expr,
      ipi = clin_sub$ipi_num
    ) %>% filter(!is.na(expr) & !is.na(ipi))

    if (nrow(surv_df) < 30) next

    # Univariate Cox
    cox_uni <- tryCatch({
      coxph(Surv(OS_time, OS_status) ~ expr, data = surv_df)
    }, error = function(e) NULL, warning = function(w) NULL)

    # Multivariate Cox (adjusting for IPI)
    cox_adj <- tryCatch({
      coxph(Surv(OS_time, OS_status) ~ expr + ipi, data = surv_df)
    }, error = function(e) NULL, warning = function(w) NULL)

    if (!is.null(cox_uni) && !is.null(cox_adj)) {
      uni_coef <- summary(cox_uni)$coefficients
      adj_coef <- summary(cox_adj)$coefficients

      if (nrow(adj_coef) >= 2) {
        results <- rbind(results, data.frame(
          probe = probe,
          n_samples = nrow(surv_df),
          uni_HR = exp(uni_coef[1, 1]),
          uni_p = uni_coef[1, 5],
          adj_HR = exp(adj_coef[1, 1]),
          adj_p = adj_coef[1, 5],
          ipi_HR = exp(adj_coef[2, 1]),
          ipi_p = adj_coef[2, 5]
        ))
      }
    }

    # Progress indicator
    if (i %% 5000 == 0) cat("  Tested", i, "probes...\n")
  }

  cat("  Completed:", nrow(results), "probes tested\n\n")

  # Add FDR correction
  results$uni_FDR <- p.adjust(results$uni_p, method = "BH")
  results$adj_FDR <- p.adjust(results$adj_p, method = "BH")

  # Sort by adjusted p-value
  results <- results %>% arrange(adj_p)

  # Summary statistics
  cat("--- Summary ---\n")
  cat("Univariate significant (p < 0.05):", sum(results$uni_p < 0.05), "\n")
  cat("Univariate significant (FDR < 0.1):", sum(results$uni_FDR < 0.1), "\n")
  cat("IPI-independent (adj p < 0.05):", sum(results$adj_p < 0.05), "\n")
  cat("IPI-independent (adj FDR < 0.1):", sum(results$adj_FDR < 0.1), "\n\n")

  # Top IPI-independent genes
  cat("--- Top 30 IPI-Independent Prognostic Probes ---\n")
  top_results <- results %>%
    filter(adj_p < 0.05) %>%
    head(30) %>%
    mutate(
      uni_HR = round(uni_HR, 3),
      adj_HR = round(adj_HR, 3),
      uni_p = signif(uni_p, 3),
      adj_p = signif(adj_p, 3)
    )
  print(top_results %>% select(probe, uni_HR, uni_p, adj_HR, adj_p))

  # Protective vs Harmful
  ipi_indep <- results %>% filter(adj_p < 0.05)

  cat("\n--- Protective Genes (HR < 1, high expr = better survival) ---\n")
  protective <- ipi_indep %>% filter(adj_HR < 1) %>% arrange(adj_p) %>% head(15)
  print(protective %>% select(probe, adj_HR, adj_p) %>%
          mutate(adj_HR = round(adj_HR, 3), adj_p = signif(adj_p, 3)))

  cat("\n--- Harmful Genes (HR > 1, high expr = worse survival) ---\n")
  harmful <- ipi_indep %>% filter(adj_HR > 1) %>% arrange(adj_p) %>% head(15)
  print(harmful %>% select(probe, adj_HR, adj_p) %>%
          mutate(adj_HR = round(adj_HR, 3), adj_p = signif(adj_p, 3)))

  return(results)
}

#------------------------------------------------------------------------------
# 4. GLOBAL ANALYSIS (ALL SAMPLES)
#------------------------------------------------------------------------------
global_results <- run_ipi_independent_analysis(expr_data, clinical, "GLOBAL (All Samples)")

#------------------------------------------------------------------------------
# 5. SUBSET-SPECIFIC ANALYSES
#------------------------------------------------------------------------------

# GCB subset
gcb_clinical <- clinical %>% filter(COO == "GCB")
gcb_results <- run_ipi_independent_analysis(expr_data, gcb_clinical, "GCB Subset")

# ABC subset
abc_clinical <- clinical %>% filter(COO == "ABC")
abc_results <- run_ipi_independent_analysis(expr_data, abc_clinical, "ABC Subset")

# MHG subset
mhg_clinical <- clinical %>% filter(COO == "MHG")
mhg_results <- run_ipi_independent_analysis(expr_data, mhg_clinical, "MHG Subset")

# UNC subset
unc_clinical <- clinical %>% filter(COO == "UNC")
unc_results <- run_ipi_independent_analysis(expr_data, unc_clinical, "UNC Subset")

#------------------------------------------------------------------------------
# 6. COMPARE ACROSS SUBSETS
#------------------------------------------------------------------------------
cat("\n", paste(rep("=", 60), collapse = ""), "\n")
cat("   CROSS-SUBSET COMPARISON\n")
cat(paste(rep("=", 60), collapse = ""), "\n\n")

# Function to get top probes from each analysis
get_top_probes <- function(results, n = 100) {
  if (is.null(results)) return(character(0))
  results %>% filter(adj_p < 0.05) %>% head(n) %>% pull(probe)
}

global_top <- get_top_probes(global_results)
gcb_top <- get_top_probes(gcb_results)
abc_top <- get_top_probes(abc_results)
mhg_top <- get_top_probes(mhg_results)

cat("Top IPI-independent probes by subset:\n")
cat("  Global:", length(global_top), "\n")
cat("  GCB:", length(gcb_top), "\n")
cat("  ABC:", length(abc_top), "\n")
cat("  MHG:", length(mhg_top), "\n\n")

# Overlap analysis
if (length(gcb_top) > 0 && length(abc_top) > 0) {
  gcb_abc_overlap <- intersect(gcb_top, abc_top)
  cat("Probes significant in BOTH GCB and ABC:", length(gcb_abc_overlap), "\n")
  if (length(gcb_abc_overlap) > 0) {
    cat("  ", head(gcb_abc_overlap, 10), "\n")
  }
}

if (length(gcb_top) > 0 && length(mhg_top) > 0) {
  gcb_mhg_overlap <- intersect(gcb_top, mhg_top)
  cat("Probes significant in BOTH GCB and MHG:", length(gcb_mhg_overlap), "\n")
}

# Subset-specific probes
if (length(mhg_top) > 0 && length(gcb_top) > 0) {
  mhg_specific <- setdiff(mhg_top, gcb_top)
  cat("\nMHG-specific IPI-independent probes:", length(mhg_specific), "\n")
  if (length(mhg_specific) > 0) {
    cat("  ", head(mhg_specific, 10), "\n")
  }
}

#------------------------------------------------------------------------------
# 7. GENE ANNOTATION
#------------------------------------------------------------------------------
cat("\n", paste(rep("=", 60), collapse = ""), "\n")
cat("   TOP PROBES FOR ANNOTATION\n")
cat(paste(rep("=", 60), collapse = ""), "\n\n")

# Combine top probes from all analyses for annotation
all_top_probes <- unique(c(
  head(global_top, 50),
  head(gcb_top, 30),
  head(abc_top, 30),
  head(mhg_top, 30)
))

cat("Unique top probes to annotate:", length(all_top_probes), "\n")
cat("\nProbe IDs for GEO lookup:\n")
cat(paste(all_top_probes, collapse = "|"), "\n")

#------------------------------------------------------------------------------
# 8. SAVE RESULTS
#------------------------------------------------------------------------------
cat("\n", paste(rep("=", 60), collapse = ""), "\n")
cat("   SAVING RESULTS\n")
cat(paste(rep("=", 60), collapse = ""), "\n\n")

write.csv(global_results, "global_scripts/ipi_independent_global.csv", row.names = FALSE)

if (!is.null(gcb_results)) {
  write.csv(gcb_results, "global_scripts/ipi_independent_gcb.csv", row.names = FALSE)
}
if (!is.null(abc_results)) {
  write.csv(abc_results, "global_scripts/ipi_independent_abc.csv", row.names = FALSE)
}
if (!is.null(mhg_results)) {
  write.csv(mhg_results, "global_scripts/ipi_independent_mhg.csv", row.names = FALSE)
}
if (!is.null(unc_results)) {
  write.csv(unc_results, "global_scripts/ipi_independent_unc.csv", row.names = FALSE)
}

cat("Saved:\n")
cat("  - ipi_independent_global.csv\n")
cat("  - ipi_independent_gcb.csv\n")
cat("  - ipi_independent_abc.csv\n")
cat("  - ipi_independent_mhg.csv\n")
cat("  - ipi_independent_unc.csv\n")

cat("\n=== ANALYSIS COMPLETE ===\n")
