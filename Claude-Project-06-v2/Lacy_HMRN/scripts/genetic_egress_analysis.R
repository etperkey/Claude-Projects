# =============================================================================
# Genetic Egress Score Analysis - Lacy/HMRN Dataset
# Calculates mutation-based egress score and correlates with survival
# =============================================================================

cat("=============================================================\n")
cat("Genetic Egress Score Analysis - Lacy/HMRN\n")
cat("=============================================================\n\n")

library(survival)
library(readxl)

# Paths
lacy_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
data_dir <- file.path(lacy_dir, "data")
results_dir <- file.path(lacy_dir, "results")

if (!dir.exists(data_dir)) dir.create(data_dir, recursive = TRUE)
if (!dir.exists(results_dir)) dir.create(results_dir, recursive = TRUE)

# =============================================================================
# Define Egress Pathway Genes (Available in Lacy 293-gene panel)
# =============================================================================

# RETENTION genes (promote GC retention via S1PR2-GNA13-RhoA axis)
retention_genes <- c("GNA13", "RHOA", "P2RY8")

# EGRESS genes (promote GC exit via CXCR4-GNAI2 axis)
# SGK1 phosphorylates FOXO1 which regulates S1PR2, promoting egress
egress_genes <- c("CXCR4", "SGK1_S")

cat("Pathway genes in Lacy 293-gene panel:\n")
cat("  RETENTION:", paste(retention_genes, collapse = ", "), "\n")
cat("  EGRESS:", paste(egress_genes, collapse = ", "), "\n\n")

# =============================================================================
# Load Mutation Data
# =============================================================================

cat("Loading mutation data...\n")
mutations <- read.csv(file.path(lacy_dir, "genomic_data.csv"), stringsAsFactors = FALSE)
cat("  Loaded", nrow(mutations), "patients with", ncol(mutations) - 1, "mutations\n\n")

# Verify genes are present
all_genes <- c(retention_genes, egress_genes)
missing <- setdiff(all_genes, colnames(mutations))
if (length(missing) > 0) {
  cat("WARNING: Missing genes:", paste(missing, collapse = ", "), "\n")
}

present <- intersect(all_genes, colnames(mutations))
cat("Genes found:", paste(present, collapse = ", "), "\n\n")

# =============================================================================
# Calculate Genetic Egress Score
# =============================================================================

cat("Calculating genetic egress scores...\n\n")

# Extract mutation status for pathway genes
retention_present <- intersect(retention_genes, colnames(mutations))
egress_present <- intersect(egress_genes, colnames(mutations))

# Retention score = sum of retention gene mutations
mutations$retention_mut_count <- rowSums(mutations[, retention_present, drop = FALSE])

# Egress score = sum of egress gene mutations
mutations$egress_mut_count <- rowSums(mutations[, egress_present, drop = FALSE])

# Combined pathway mutations
mutations$pathway_mut_count <- mutations$retention_mut_count + mutations$egress_mut_count

# Genetic Egress Score = egress mutations - retention mutations
# Positive = more egress mutations, Negative = more retention mutations
mutations$gEgress <- mutations$egress_mut_count - mutations$retention_mut_count

# Binary: Any pathway mutation
mutations$any_pathway_mut <- as.integer(mutations$pathway_mut_count > 0)

# Individual gene summaries
cat("Individual gene mutation frequencies:\n")
for (gene in all_genes) {
  if (gene %in% colnames(mutations)) {
    n_mut <- sum(mutations[[gene]], na.rm = TRUE)
    pct <- round(100 * n_mut / nrow(mutations), 1)
    cat(sprintf("  %s: %d (%.1f%%)\n", gene, n_mut, pct))
  }
}

cat("\nRetention mutations (any):", sum(mutations$retention_mut_count > 0),
    "(", round(100 * sum(mutations$retention_mut_count > 0) / nrow(mutations), 1), "%)\n")
cat("Egress mutations (any):", sum(mutations$egress_mut_count > 0),
    "(", round(100 * sum(mutations$egress_mut_count > 0) / nrow(mutations), 1), "%)\n")
cat("Any pathway mutation:", sum(mutations$any_pathway_mut),
    "(", round(100 * sum(mutations$any_pathway_mut) / nrow(mutations), 1), "%)\n")

cat("\ngEgress score distribution:\n")
print(table(mutations$gEgress))

# =============================================================================
# Load Clinical Data
# =============================================================================

cat("\n\nLoading clinical data from Blood 2020 supplement...\n")
clinical <- read_excel(file.path(lacy_dir, "blood_2020_supplement.xlsx"),
                       sheet = "S4 Patient Characteristics")
cat("  Loaded", nrow(clinical), "patients with clinical data\n")

# Merge
merged <- merge(mutations, clinical, by = "PID", all.x = TRUE)
cat("  Merged:", nrow(merged), "patients\n")

# Check survival data availability
cat("\nSurvival data availability:\n")
cat("  OS_time available:", sum(!is.na(merged$OS_time)), "\n")
cat("  OS_status available:", sum(!is.na(merged$OS_status)), "\n")
cat("  PFS_time available:", sum(!is.na(merged$PFS_time)), "\n")
cat("  PFS_status available:", sum(!is.na(merged$PFS_status)), "\n")

# Convert OS_time from days to months
merged$OS_months <- merged$OS_time / 30.44

# =============================================================================
# Analysis by Molecular Cluster (ICL)
# =============================================================================

cat("\n=============================================================\n")
cat("GENETIC EGRESS BY MOLECULAR CLUSTER (ICL)\n")
cat("=============================================================\n\n")

cat("Cluster distribution:\n")
print(table(merged$cluster_ICL, useNA = "ifany"))

cat("\nPathway mutations by cluster:\n")
cluster_summary <- aggregate(
  cbind(GNA13, RHOA, P2RY8, CXCR4, SGK1_S, retention_mut_count, egress_mut_count,
        pathway_mut_count, gEgress) ~ cluster_ICL,
  data = merged,
  FUN = function(x) c(mean = mean(x, na.rm = TRUE), sum = sum(x, na.rm = TRUE))
)
print(cluster_summary)

# Detailed cluster analysis
for (cluster in sort(unique(merged$cluster_ICL[!is.na(merged$cluster_ICL)]))) {
  cluster_data <- merged[merged$cluster_ICL == cluster & !is.na(merged$cluster_ICL), ]

  cat("\n--- Cluster:", cluster, "(n =", nrow(cluster_data), ") ---\n")

  # Gene frequencies
  cat("  GNA13:", sum(cluster_data$GNA13, na.rm = TRUE),
      "(", round(100 * mean(cluster_data$GNA13, na.rm = TRUE), 1), "%)\n")
  cat("  RHOA:", sum(cluster_data$RHOA, na.rm = TRUE),
      "(", round(100 * mean(cluster_data$RHOA, na.rm = TRUE), 1), "%)\n")
  cat("  P2RY8:", sum(cluster_data$P2RY8, na.rm = TRUE),
      "(", round(100 * mean(cluster_data$P2RY8, na.rm = TRUE), 1), "%)\n")
  cat("  CXCR4:", sum(cluster_data$CXCR4, na.rm = TRUE),
      "(", round(100 * mean(cluster_data$CXCR4, na.rm = TRUE), 1), "%)\n")
  cat("  SGK1:", sum(cluster_data$SGK1_S, na.rm = TRUE),
      "(", round(100 * mean(cluster_data$SGK1_S, na.rm = TRUE), 1), "%)\n")

  cat("  Any retention mut:", sum(cluster_data$retention_mut_count > 0),
      "(", round(100 * mean(cluster_data$retention_mut_count > 0), 1), "%)\n")
  cat("  Any egress mut:", sum(cluster_data$egress_mut_count > 0),
      "(", round(100 * mean(cluster_data$egress_mut_count > 0), 1), "%)\n")
  cat("  Mean gEgress:", round(mean(cluster_data$gEgress, na.rm = TRUE), 3), "\n")
}

# =============================================================================
# Survival Analysis
# =============================================================================

cat("\n=============================================================\n")
cat("SURVIVAL ANALYSIS\n")
cat("=============================================================\n\n")

# Subset to patients with OS data
surv_data <- merged[!is.na(merged$OS_time) & !is.na(merged$OS_status), ]
cat("Patients with OS data:", nrow(surv_data), "\n")
cat("Events (deaths):", sum(surv_data$OS_status), "\n")
cat("Median follow-up:", round(median(surv_data$OS_months), 1), "months\n\n")

# --- Analysis 1: Any Pathway Mutation ---
cat("--- Any Pathway Mutation vs OS ---\n")
n_nomut <- sum(surv_data$any_pathway_mut == 0)
n_mut <- sum(surv_data$any_pathway_mut == 1)
cat("  No mutation:", n_nomut, "\n")
cat("  Pathway mutated:", n_mut, "\n")

if (n_nomut >= 10 && n_mut >= 10) {
  fit <- survfit(Surv(OS_months, OS_status) ~ any_pathway_mut, data = surv_data)
  logrank <- survdiff(Surv(OS_months, OS_status) ~ any_pathway_mut, data = surv_data)
  pval <- 1 - pchisq(logrank$chisq, df = 1)
  cat("  Log-rank p-value:", format(pval, digits = 4), "\n")

  # Cox regression
  cox <- coxph(Surv(OS_months, OS_status) ~ any_pathway_mut, data = surv_data)
  hr <- exp(coef(cox))
  hr_ci <- exp(confint(cox))
  cat("  HR (mutated vs WT):", round(hr, 2),
      "(95% CI:", round(hr_ci[1], 2), "-", round(hr_ci[2], 2), ")\n")

  # Plot
  png(file.path(results_dir, "km_any_pathway_mutation.png"), width = 800, height = 600)
  plot(fit, col = c("#2E9FDF", "#E7B800"), lwd = 3, mark.time = TRUE,
       xlab = "Time (Months)", ylab = "Overall Survival",
       main = paste0("Lacy/HMRN: Egress Pathway Mutation Effect\n",
                     "(n=", nrow(surv_data), ", Log-rank p = ", format(pval, digits = 3), ")"))
  legend("bottomleft", legend = c(
    paste0("No Pathway Mutation (n=", n_nomut, ")"),
    paste0("Pathway Mutated (n=", n_mut, ")")
  ), col = c("#2E9FDF", "#E7B800"), lwd = 3, bty = "n")
  dev.off()
  cat("  Saved: km_any_pathway_mutation.png\n")
}

# --- Analysis 2: Retention vs Egress Mutations ---
cat("\n--- Retention vs Egress Mutations vs OS ---\n")

surv_data$mut_type <- "No Mutation"
surv_data$mut_type[surv_data$retention_mut_count > 0 & surv_data$egress_mut_count == 0] <- "Retention Only"
surv_data$mut_type[surv_data$egress_mut_count > 0 & surv_data$retention_mut_count == 0] <- "Egress Only"
surv_data$mut_type[surv_data$retention_mut_count > 0 & surv_data$egress_mut_count > 0] <- "Both"
surv_data$mut_type <- factor(surv_data$mut_type,
                              levels = c("No Mutation", "Retention Only", "Egress Only", "Both"))

cat("Mutation type distribution:\n")
print(table(surv_data$mut_type))

fit2 <- survfit(Surv(OS_months, OS_status) ~ mut_type, data = surv_data)
logrank2 <- survdiff(Surv(OS_months, OS_status) ~ mut_type, data = surv_data)
pval2 <- 1 - pchisq(logrank2$chisq, df = length(unique(surv_data$mut_type)) - 1)
cat("Log-rank p-value (4-group):", format(pval2, digits = 4), "\n")

png(file.path(results_dir, "km_retention_vs_egress.png"), width = 900, height = 600)
plot(fit2, col = c("#2E9FDF", "#E7B800", "#FC4E07", "#00BA38"), lwd = 3, mark.time = TRUE,
     xlab = "Time (Months)", ylab = "Overall Survival",
     main = paste0("Lacy/HMRN: Retention vs Egress Mutations\n",
                   "(Log-rank p = ", format(pval2, digits = 3), ")"))
legend("bottomleft", legend = names(table(surv_data$mut_type)),
       col = c("#2E9FDF", "#E7B800", "#FC4E07", "#00BA38"), lwd = 3, bty = "n")
dev.off()
cat("Saved: km_retention_vs_egress.png\n")

# --- Analysis 3: Within BCL2 Cluster (EZB-like) ---
cat("\n--- BCL2 Cluster (EZB-like) Subanalysis ---\n")

bcl2_data <- surv_data[surv_data$cluster_ICL == "BCL2" & !is.na(surv_data$cluster_ICL), ]
cat("BCL2 cluster patients with OS:", nrow(bcl2_data), "\n")

if (nrow(bcl2_data) >= 50) {
  n_nomut_bcl2 <- sum(bcl2_data$any_pathway_mut == 0)
  n_mut_bcl2 <- sum(bcl2_data$any_pathway_mut == 1)
  cat("  No mutation:", n_nomut_bcl2, "\n")
  cat("  Pathway mutated:", n_mut_bcl2, "\n")

  if (n_nomut_bcl2 >= 5 && n_mut_bcl2 >= 5) {
    fit_bcl2 <- survfit(Surv(OS_months, OS_status) ~ any_pathway_mut, data = bcl2_data)
    logrank_bcl2 <- survdiff(Surv(OS_months, OS_status) ~ any_pathway_mut, data = bcl2_data)
    pval_bcl2 <- 1 - pchisq(logrank_bcl2$chisq, df = 1)
    cat("  Log-rank p-value:", format(pval_bcl2, digits = 4), "\n")

    cox_bcl2 <- coxph(Surv(OS_months, OS_status) ~ any_pathway_mut, data = bcl2_data)
    hr_bcl2 <- exp(coef(cox_bcl2))
    cat("  HR:", round(hr_bcl2, 2), "\n")

    png(file.path(results_dir, "km_bcl2_cluster_pathway.png"), width = 800, height = 600)
    plot(fit_bcl2, col = c("#2E9FDF", "#E7B800"), lwd = 3, mark.time = TRUE,
         xlab = "Time (Months)", ylab = "Overall Survival",
         main = paste0("BCL2 Cluster: Egress Pathway Mutation Effect\n",
                       "(n=", nrow(bcl2_data), ", Log-rank p = ", format(pval_bcl2, digits = 3), ")"))
    legend("bottomleft", legend = c(
      paste0("No Pathway Mutation (n=", n_nomut_bcl2, ")"),
      paste0("Pathway Mutated (n=", n_mut_bcl2, ")")
    ), col = c("#2E9FDF", "#E7B800"), lwd = 3, bty = "n")
    dev.off()
    cat("  Saved: km_bcl2_cluster_pathway.png\n")
  }
}

# =============================================================================
# Save Results
# =============================================================================

cat("\n=============================================================\n")
cat("SAVING RESULTS\n")
cat("=============================================================\n\n")

# Save scored data
output_cols <- c("PID", "GNA13", "RHOA", "P2RY8", "CXCR4", "SGK1_S",
                 "retention_mut_count", "egress_mut_count", "pathway_mut_count",
                 "gEgress", "any_pathway_mut", "cluster_ICL", "cell_of_origin",
                 "OS_time", "OS_status", "PFS_time", "PFS_status")
output_data <- merged[, intersect(output_cols, colnames(merged))]
write.csv(output_data, file.path(data_dir, "genetic_egress_scores.csv"), row.names = FALSE)
cat("Saved: data/genetic_egress_scores.csv\n")

# Summary by cluster
cluster_pathway_summary <- aggregate(
  cbind(GNA13, RHOA, P2RY8, CXCR4, SGK1_S, any_pathway_mut, gEgress) ~ cluster_ICL,
  data = merged,
  FUN = mean,
  na.rm = TRUE
)
colnames(cluster_pathway_summary)[-1] <- paste0(colnames(cluster_pathway_summary)[-1], "_pct")
write.csv(cluster_pathway_summary, file.path(results_dir, "cluster_pathway_summary.csv"), row.names = FALSE)
cat("Saved: results/cluster_pathway_summary.csv\n")

cat("\n=============================================================\n")
cat("ANALYSIS COMPLETE\n")
cat("=============================================================\n")
