# =============================================================================
# REMoDL-B Transcriptional Egress (tEgress) Score Analysis
# Based on S1P/GNA13 pathway gene expression
# =============================================================================

cat("=============================================================\n")
cat("REMoDL-B tEgress Score Analysis\n")
cat("=============================================================\n\n")

library(survival)
library(dplyr)

# =============================================================================
# Configuration
# =============================================================================

sha_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Sha_REMoDL-B"
data_dir <- file.path(sha_dir, "data")
raw_dir <- file.path(data_dir, "raw")
processed_dir <- file.path(data_dir, "processed")
figures_dir <- file.path(sha_dir, "figures")

if (!dir.exists(figures_dir)) dir.create(figures_dir, recursive = TRUE)

# =============================================================================
# Define Pathway Genes with Probe IDs
# =============================================================================

# RETENTION genes (high expression = stay in GC)
# S1PR2-GNA13-ARHGEF1-RhoA axis + ARHGAP25 (RAC-GAP, inhibits egress)
retention_genes <- data.frame(
  gene = c("S1PR2", "GNA13", "ARHGEF1", "RHOA", "P2RY8", "ARHGAP25"),
  probe_id = c("ILMN_1812452", "ILMN_1758906", "ILMN_1772370",
               "ILMN_1781290", "ILMN_1768284", "ILMN_1658853"),
  function_desc = c("S1P receptor - retention signaling",
                    "G-alpha-13 - activates RhoGEFs",
                    "RhoGEF - activates RhoA",
                    "Rho GTPase - cytoskeletal retention",
                    "Purinergic receptor - GNA13 pathway",
                    "RAC-GAP - inactivates RAC, inhibits egress")
)

# EGRESS genes (high expression = leave GC)
# CXCR4-GNAI2 axis + RAC2 (motility) + SGK1 (migration kinase)
egress_genes <- data.frame(
  gene = c("CXCR4", "GNAI2", "RAC2", "SGK1"),
  probe_id = c("ILMN_2246410", "ILMN_1775762", "ILMN_1709795", "ILMN_3229324"),
  function_desc = c("Chemokine receptor - egress signaling",
                    "G-alpha-i2 - opposes GNA13",
                    "Rac GTPase - promotes motility",
                    "Kinase - promotes migration")
)

cat("RETENTION genes (high = stay in GC):\n")
print(retention_genes[, c("gene", "function_desc")])
cat("\nEGRESS genes (high = leave GC):\n
")
print(egress_genes[, c("gene", "function_desc")])

# =============================================================================
# Load Expression Data
# =============================================================================

cat("\n\nLoading expression data...\n")

# Load from raw series matrix (has probe IDs as row names)
cat("Loading from raw GEO series matrix file...\n")
series_file <- file.path(raw_dir, "GSE117556_series_matrix.txt.gz")

# Read the file, skipping metadata lines
con <- gzfile(series_file, "r")
lines <- readLines(con)
close(con)

# Find where data starts (after !series_matrix_table_begin)
data_start <- which(grepl("^!series_matrix_table_begin", lines)) + 1
data_end <- which(grepl("^!series_matrix_table_end", lines)) - 1

# Read expression matrix
cat("Parsing expression matrix...\n")
expr_text <- lines[data_start:data_end]
expr_data <- read.table(text = expr_text, header = TRUE, sep = "\t",
                        row.names = 1, check.names = FALSE, quote = "\"")

rm(lines, expr_text)  # Free memory
gc()

cat("Expression matrix dimensions:", nrow(expr_data), "probes x", ncol(expr_data), "samples\n")

# =============================================================================
# Extract Pathway Gene Expression
# =============================================================================

cat("\nExtracting pathway genes...\n")

all_pathway_genes <- rbind(
  cbind(retention_genes, direction = "retention"),
  cbind(egress_genes, direction = "egress")
)

# Check which probes are present
all_pathway_genes$present <- all_pathway_genes$probe_id %in% rownames(expr_data)
cat("\nProbe availability:\n")
print(all_pathway_genes[, c("gene", "probe_id", "direction", "present")])

missing_probes <- all_pathway_genes$gene[!all_pathway_genes$present]
if (length(missing_probes) > 0) {
  cat("\nWARNING: Missing probes for:", paste(missing_probes, collapse = ", "), "\n")
}

# Extract expression for available probes
available_genes <- all_pathway_genes[all_pathway_genes$present, ]
pathway_expr <- expr_data[available_genes$probe_id, , drop = FALSE]
rownames(pathway_expr) <- available_genes$gene

cat("\nExtracted expression for", nrow(pathway_expr), "genes\n")

# =============================================================================
# Calculate Z-scores
# =============================================================================

cat("\nCalculating z-scores...\n")

# Z-score normalize each gene across samples
pathway_zscore <- t(apply(pathway_expr, 1, function(x) {
  (x - mean(x, na.rm = TRUE)) / sd(x, na.rm = TRUE)
}))

# Verify z-scoring
cat("Z-score verification (should be mean~0, sd~1):\n")
cat("  Mean of means:", round(mean(rowMeans(pathway_zscore, na.rm = TRUE)), 4), "\n")
cat("  Mean of SDs:", round(mean(apply(pathway_zscore, 1, sd, na.rm = TRUE)), 4), "\n")

# =============================================================================
# Calculate tEgress Score
# =============================================================================

cat("\nCalculating tEgress scores...\n")

# Get gene lists
retention_in_data <- available_genes$gene[available_genes$direction == "retention"]
egress_in_data <- available_genes$gene[available_genes$direction == "egress"]

cat("Retention genes in data:", paste(retention_in_data, collapse = ", "), "\n")
cat("Egress genes in data:", paste(egress_in_data, collapse = ", "), "\n")

# Calculate mean z-scores for each pathway
retention_scores <- colMeans(pathway_zscore[retention_in_data, , drop = FALSE], na.rm = TRUE)
egress_scores <- colMeans(pathway_zscore[egress_in_data, , drop = FALSE], na.rm = TRUE)

# tEgress = Egress - Retention
# Higher score = more egress phenotype (less retention, more migration)
tEgress <- egress_scores - retention_scores

# Create results dataframe
sample_scores <- data.frame(
  sample_id = names(tEgress),
  retention_score = retention_scores,
  egress_score = egress_scores,
  tEgress = tEgress,
  stringsAsFactors = FALSE
)

cat("\ntEgress score distribution:\n")
cat("  Min:", round(min(tEgress), 3), "\n")
cat("  Q1:", round(quantile(tEgress, 0.25), 3), "\n")
cat("  Median:", round(median(tEgress), 3), "\n")
cat("  Q3:", round(quantile(tEgress, 0.75), 3), "\n")
cat("  Max:", round(max(tEgress), 3), "\n")

# =============================================================================
# Load Clinical Data
# =============================================================================

cat("\nLoading clinical data...\n")

# Try to load GEO clinical data
geo_clinical_file <- file.path(processed_dir, "sha_geo_clinical.csv")

if (file.exists(geo_clinical_file)) {
  clinical <- read.csv(geo_clinical_file, stringsAsFactors = FALSE)
  cat("Loaded clinical data:", nrow(clinical), "patients\n")
} else {
  cat("WARNING: Clinical data file not found. Extracting from series matrix...\n")

  # Extract clinical info from series matrix
  series_file <- file.path(raw_dir, "GSE117556_series_matrix.txt.gz")
  con <- gzfile(series_file, "r")
  lines <- readLines(con)
  close(con)

  # Find sample characteristics
  char_lines <- lines[grepl("^!Sample_", lines)]

  # This would need more parsing - for now, create placeholder
  clinical <- data.frame(
    sample_id = colnames(expr_data),
    stringsAsFactors = FALSE
  )
}

# =============================================================================
# Merge Scores with Clinical Data
# =============================================================================

cat("\nMerging scores with clinical data...\n")

# Match sample IDs (GEO uses GSM IDs, expression might use RMDB IDs)
# Check the format
cat("Score sample IDs format:", head(sample_scores$sample_id, 3), "\n")
cat("Clinical sample IDs format:", head(clinical$sample_id, 3), "\n")

# Try to merge
if ("geo_accession" %in% colnames(clinical)) {
  merged_data <- merge(sample_scores, clinical,
                       by.x = "sample_id", by.y = "geo_accession",
                       all.x = TRUE)
} else if ("sample_id" %in% colnames(clinical)) {
  merged_data <- merge(sample_scores, clinical,
                       by = "sample_id", all.x = TRUE)
} else {
  # If clinical has different ID column, try to match by position
  cat("WARNING: Could not match sample IDs directly. Using positional matching.\n")
  merged_data <- cbind(sample_scores, clinical[1:nrow(sample_scores), ])
}

cat("Merged data:", nrow(merged_data), "samples\n")

# =============================================================================
# Create tEgress Categories
# =============================================================================

cat("\nCreating tEgress categories...\n")

# Tertiles
merged_data$tEgress_tertile <- cut(merged_data$tEgress,
                                    breaks = quantile(merged_data$tEgress, c(0, 1/3, 2/3, 1)),
                                    labels = c("Low", "Medium", "High"),
                                    include.lowest = TRUE)

# Median split
merged_data$tEgress_median <- ifelse(merged_data$tEgress > median(merged_data$tEgress),
                                      "High", "Low")

cat("Tertile distribution:\n")
print(table(merged_data$tEgress_tertile))
cat("\nMedian split distribution:\n")
print(table(merged_data$tEgress_median))

# =============================================================================
# Save Processed Data
# =============================================================================

# Save individual gene z-scores
gene_zscores_df <- as.data.frame(t(pathway_zscore))
gene_zscores_df$sample_id <- rownames(gene_zscores_df)
write.csv(gene_zscores_df, file.path(processed_dir, "tEgress_gene_zscores.csv"),
          row.names = FALSE)

# Save scores
write.csv(sample_scores, file.path(processed_dir, "tEgress_scores.csv"),
          row.names = FALSE)

# Save merged data
write.csv(merged_data, file.path(processed_dir, "tEgress_clinical.csv"),
          row.names = FALSE)

cat("\nSaved:\n")
cat("  - tEgress_gene_zscores.csv\n")
cat("  - tEgress_scores.csv\n")
cat("  - tEgress_clinical.csv\n")

# =============================================================================
# Survival Analysis (if survival data available)
# =============================================================================

cat("\n\n=============================================================\n")
cat("SURVIVAL ANALYSIS\n")
cat("=============================================================\n\n")

# Check for survival columns
surv_cols <- c("os_time", "os_status", "OS_time", "OS_status",
               "pfs_time", "pfs_status", "PFS_time", "PFS_status",
               "survival_months", "vital_status")
available_surv <- intersect(tolower(colnames(merged_data)), tolower(surv_cols))

if (length(available_surv) > 0) {
  cat("Survival columns found:", paste(available_surv, collapse = ", "), "\n")

  # Standardize column names
  colnames(merged_data) <- tolower(colnames(merged_data))

  # Try OS analysis
  if ("os_time" %in% colnames(merged_data) & "os_status" %in% colnames(merged_data)) {

    surv_data <- merged_data %>%
      filter(!is.na(os_time) & !is.na(os_status) & !is.na(tegress_median))

    cat("\nPatients with OS data:", nrow(surv_data), "\n")

    if (nrow(surv_data) >= 20) {
      # Kaplan-Meier by median split
      fit_median <- survfit(Surv(os_time, os_status) ~ tegress_median, data = surv_data)
      logrank_median <- survdiff(Surv(os_time, os_status) ~ tegress_median, data = surv_data)
      pval_median <- 1 - pchisq(logrank_median$chisq, df = 1)

      cat("\n--- tEgress Median Split ---\n")
      cat("Log-rank p-value:", format(pval_median, digits = 3), "\n")
      print(summary(fit_median)$table[, c("records", "events", "median")])

      # Plot KM curve
      png(file.path(figures_dir, "km_tEgress_median.png"), width = 800, height = 600)
      plot(fit_median, col = c("#2E9FDF", "#E7B800"), lwd = 3, mark.time = TRUE,
           xlab = "Time", ylab = "Overall Survival",
           main = paste0("REMoDL-B: tEgress Score and Survival\n",
                         "(n=", nrow(surv_data), ", Log-rank p = ",
                         format(pval_median, digits = 3), ")"))
      legend("bottomleft",
             legend = c(paste0("Low tEgress (n=", sum(surv_data$tegress_median == "Low"), ")"),
                        paste0("High tEgress (n=", sum(surv_data$tegress_median == "High"), ")")),
             col = c("#2E9FDF", "#E7B800"), lwd = 3, bty = "n")
      dev.off()
      cat("\nSaved: km_tEgress_median.png\n")

      # Kaplan-Meier by tertiles
      fit_tertile <- survfit(Surv(os_time, os_status) ~ tegress_tertile, data = surv_data)
      logrank_tertile <- survdiff(Surv(os_time, os_status) ~ tegress_tertile, data = surv_data)
      pval_tertile <- 1 - pchisq(logrank_tertile$chisq, df = 2)

      cat("\n--- tEgress Tertiles ---\n")
      cat("Log-rank p-value:", format(pval_tertile, digits = 3), "\n")
      print(summary(fit_tertile)$table[, c("records", "events", "median")])

      # Plot KM curve - tertiles
      png(file.path(figures_dir, "km_tEgress_tertiles.png"), width = 800, height = 600)
      plot(fit_tertile, col = c("#2E9FDF", "#00BA38", "#E7B800"), lwd = 3, mark.time = TRUE,
           xlab = "Time", ylab = "Overall Survival",
           main = paste0("REMoDL-B: tEgress Score Tertiles and Survival\n",
                         "(n=", nrow(surv_data), ", Log-rank p = ",
                         format(pval_tertile, digits = 3), ")"))
      legend("bottomleft",
             legend = c(paste0("Low (n=", sum(surv_data$tegress_tertile == "Low", na.rm = TRUE), ")"),
                        paste0("Medium (n=", sum(surv_data$tegress_tertile == "Medium", na.rm = TRUE), ")"),
                        paste0("High (n=", sum(surv_data$tegress_tertile == "High", na.rm = TRUE), ")")),
             col = c("#2E9FDF", "#00BA38", "#E7B800"), lwd = 3, bty = "n")
      dev.off()
      cat("Saved: km_tEgress_tertiles.png\n")

      # Cox regression - continuous
      cat("\n--- Cox Regression (continuous tEgress) ---\n")
      cox_cont <- coxph(Surv(os_time, os_status) ~ tegress, data = surv_data)
      hr <- exp(coef(cox_cont))
      hr_ci <- exp(confint(cox_cont))

      cat("HR per 1-unit increase:", round(hr, 3),
          "(95% CI:", round(hr_ci[1], 3), "-", round(hr_ci[2], 3), ")\n")
      cat("Wald p-value:", format(summary(cox_cont)$coefficients[, "Pr(>|z|)"], digits = 3), "\n")

      # Save summary
      surv_summary <- data.frame(
        analysis = c("Median split", "Tertiles", "Continuous"),
        p_value = c(pval_median, pval_tertile, summary(cox_cont)$coefficients[, "Pr(>|z|)"]),
        hr = c(NA, NA, hr),
        hr_lower = c(NA, NA, hr_ci[1]),
        hr_upper = c(NA, NA, hr_ci[2])
      )
      write.csv(surv_summary, file.path(processed_dir, "tEgress_survival_summary.csv"),
                row.names = FALSE)
      cat("\nSaved: tEgress_survival_summary.csv\n")
    }
  }
} else {
  cat("No survival columns found in clinical data.\n")
  cat("Available columns:", paste(head(colnames(merged_data), 20), collapse = ", "), "\n")
  cat("\nTo run survival analysis, ensure clinical data includes OS/PFS times and events.\n")
}

# =============================================================================
# Gene-level Analysis
# =============================================================================

cat("\n\n=============================================================\n")
cat("INDIVIDUAL GENE ANALYSIS\n")
cat("=============================================================\n\n")

# Correlation between individual genes and tEgress
cat("Correlation of individual genes with tEgress score:\n\n")
for (gene in rownames(pathway_zscore)) {
  cor_val <- cor(pathway_zscore[gene, ], tEgress, use = "complete.obs")
  direction <- available_genes$direction[available_genes$gene == gene]
  expected_sign <- ifelse(direction == "egress", "+", "-")
  actual_sign <- ifelse(cor_val > 0, "+", "-")
  check <- ifelse(expected_sign == actual_sign, "OK", "CHECK")

  cat(sprintf("  %s: r = %+.3f (expected %s, %s)\n",
              gene, cor_val, expected_sign, check))
}

# =============================================================================
# Summary
# =============================================================================

cat("\n\n=============================================================\n")
cat("SUMMARY\n")
cat("=============================================================\n\n")

cat("tEgress Score = mean(Egress genes) - mean(Retention genes)\n\n")
cat("Interpretation:\n")
cat("  - HIGH tEgress = Pro-egress phenotype (more CXCR4/RAC2, less GNA13/RhoA)\n")
cat("  - LOW tEgress = Pro-retention phenotype (more GNA13/RhoA, less CXCR4/RAC2)\n\n")

cat("Files created:\n")
cat("  - tEgress_gene_zscores.csv: Individual gene z-scores\n")
cat("  - tEgress_scores.csv: Sample-level scores\n")
cat("  - tEgress_clinical.csv: Scores merged with clinical data\n")
cat("  - km_tEgress_median.png: Kaplan-Meier by median split\n")
cat("  - km_tEgress_tertiles.png: Kaplan-Meier by tertiles\n")
cat("  - tEgress_survival_summary.csv: Survival analysis results\n")

cat("\n\nAnalysis complete.\n")
