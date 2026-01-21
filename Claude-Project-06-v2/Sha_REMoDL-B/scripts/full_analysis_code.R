# =============================================================================
# GC B-cell Positioning Pathway Analysis in DLBCL
# Full Analysis Code - Sha/REMODL-B / HMRN Cohort
# Author: Eric Perkey
# =============================================================================

# This script processes the HMRN/REMoDL-B genomic data and generates:
# - Patient-level pathway scores (where genes are available)
# - Mutation frequencies by gene and molecular subtype
# - Survival analysis (when clinical data available)
# - Output data files for downstream use

# Note: The HMRN 293-gene panel includes some but not all S1P pathway genes
# Available: GNA13, CXCR4, P2RY8, RHOA
# NOT in panel: S1PR2, ARHGEF1, GNAI2, RAC2, ARHGAP25

library(dplyr)
library(tidyr)

# =============================================================================
# SETUP: Define paths and load raw data
# =============================================================================

sha_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Sha"
raw_dir <- file.path(sha_dir, "data/raw")
processed_dir <- file.path(sha_dir, "data/processed")
output_dir <- file.path(sha_dir, "figures")

# Create directories
dir.create(processed_dir, recursive = TRUE, showWarnings = FALSE)
dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)

cat("=============================================================================\n")
cat("GC B-cell Positioning Pathway Analysis - Sha/REMODL-B / HMRN Cohort\n")
cat("=============================================================================\n\n")

# Load mutation data from GitHub repository
cat("Loading genomic data from HMRN...\n")

genomic_file <- file.path(raw_dir, "genomic_data.csv")
if (!file.exists(genomic_file)) {
  stop("Mutation data not found. Run download_sha_data.R first.")
}

mutations <- read.csv(genomic_file, stringsAsFactors = FALSE)
cat("  Patients loaded:", nrow(mutations), "\n")
cat("  Genetic features:", ncol(mutations) - 1, "\n\n")  # Exclude PID column

# =============================================================================
# SECTION 1: Define pathway genes and check availability
# =============================================================================

cat("SECTION 1: PATHWAY GENE DEFINITIONS & AVAILABILITY\n")
cat("---------------------------------------------------\n")

# Retention LoF genes (loss-of-function promotes dissemination)
retention_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")

# Egress GoF genes (gain-of-function promotes dissemination)
egress_genes <- c("CXCR4", "GNAI2", "RAC2", "ARHGAP25")

all_pathway_genes <- c(retention_genes, egress_genes)

# Check which genes are in the HMRN panel
available_genes <- names(mutations)[names(mutations) %in% all_pathway_genes]
missing_genes <- all_pathway_genes[!all_pathway_genes %in% names(mutations)]

cat("S1P Pathway Genes:\n")
cat("  Retention LoF:", paste(retention_genes, collapse = ", "), "\n")
cat("  Egress GoF:", paste(egress_genes, collapse = ", "), "\n\n")

cat("HMRN Panel Coverage:\n")
cat("  Available:", paste(available_genes, collapse = ", "), "\n")
cat("  Missing:", paste(missing_genes, collapse = ", "), "\n\n")

# Define which genes from each category are available
retention_available <- retention_genes[retention_genes %in% names(mutations)]
egress_available <- egress_genes[egress_genes %in% names(mutations)]

cat("  Retention genes available:", length(retention_available), "/", length(retention_genes), "\n")
cat("  Egress genes available:", length(egress_available), "/", length(egress_genes), "\n\n")

# =============================================================================
# SECTION 2: Calculate patient-level pathway scores
# =============================================================================

cat("SECTION 2: CALCULATING PATHWAY SCORES\n")
cat("--------------------------------------\n")

# Create patient scores dataframe
patient_scores <- mutations %>%
  select(PID, all_of(available_genes))

# Rename PID to PatientID for consistency
names(patient_scores)[1] <- "PatientID"

# Add missing genes as NA (for cross-dataset comparisons)
for (gene in missing_genes) {
  patient_scores[[gene]] <- NA
}

# Calculate pathway scores (only using available genes)
if (length(retention_available) > 0) {
  patient_scores$RetentionLoF <- rowSums(patient_scores[, retention_available, drop = FALSE], na.rm = TRUE)
} else {
  patient_scores$RetentionLoF <- NA
}

if (length(egress_available) > 0) {
  patient_scores$EgressGoF <- rowSums(patient_scores[, egress_available, drop = FALSE], na.rm = TRUE)
} else {
  patient_scores$EgressGoF <- NA
}

# Combined score (only meaningful if genes available)
patient_scores$Combined <- ifelse(
  !is.na(patient_scores$RetentionLoF) | !is.na(patient_scores$EgressGoF),
  rowSums(patient_scores[, available_genes, drop = FALSE], na.rm = TRUE),
  NA
)

cat("Patients analyzed: n =", nrow(patient_scores), "\n")
cat("Patients with RetentionLoF > 0:", sum(patient_scores$RetentionLoF > 0, na.rm = TRUE), "\n")
cat("Patients with EgressGoF > 0:", sum(patient_scores$EgressGoF > 0, na.rm = TRUE), "\n")
cat("Patients with Combined > 0:", sum(patient_scores$Combined > 0, na.rm = TRUE), "\n\n")

# =============================================================================
# SECTION 3: Load and merge clinical data (if available)
# =============================================================================

cat("SECTION 3: CLINICAL DATA INTEGRATION\n")
cat("-------------------------------------\n")

# Check for clinical data files
clinical_file <- file.path(raw_dir, "sha_clinical_patient.csv")
supp_file <- file.path(raw_dir, "blood-2019-003535-s3.xlsx")
geo_pheno_file <- file.path(raw_dir, "GSE117556_phenotype.csv")

clinical_available <- FALSE

if (file.exists(clinical_file)) {
  cat("Loading clinical data from:", clinical_file, "\n")
  clinical <- read.csv(clinical_file, stringsAsFactors = FALSE)
  clinical_available <- TRUE
} else if (file.exists(supp_file)) {
  cat("Clinical data available in supplementary file.\n")
  cat("Manual parsing required from:", supp_file, "\n")
} else if (file.exists(geo_pheno_file)) {
  cat("Loading phenotype data from GEO...\n")
  pheno <- read.csv(geo_pheno_file, stringsAsFactors = FALSE)
  cat("  GEO phenotype variables:", ncol(pheno), "\n")
  # GEO phenotype data may have limited clinical info
}

if (!clinical_available) {
  cat("\nNote: Full clinical data (OS, PFS, IPI) requires manual download.\n")
  cat("See: README.md for instructions.\n\n")
}

# Save processed scores
output_file <- file.path(processed_dir, "sha_s1p_clinical.csv")
write.csv(patient_scores, output_file, row.names = FALSE)
cat("Saved: sha_s1p_clinical.csv\n\n")

# =============================================================================
# SECTION 4: Mutation frequencies - Overall cohort
# =============================================================================

cat("SECTION 4: MUTATION FREQUENCIES - OVERALL COHORT\n")
cat("-------------------------------------------------\n")

n_total <- nrow(patient_scores)
cat("Total patients: n =", n_total, "\n\n")

cat(sprintf("%-12s %-12s %8s %10s %10s\n", "Gene", "Pathway", "N", "Frequency", "Status"))
cat(paste(rep("-", 55), collapse = ""), "\n")

# Retention genes
for (gene in retention_genes) {
  if (gene %in% available_genes) {
    n_mut <- sum(patient_scores[[gene]] > 0, na.rm = TRUE)
    pct <- round(n_mut / n_total * 100, 1)
    cat(sprintf("%-12s %-12s %8d %9.1f%% %10s\n", gene, "Retention", n_mut, pct, "Available"))
  } else {
    cat(sprintf("%-12s %-12s %8s %10s %10s\n", gene, "Retention", "-", "-", "Not in panel"))
  }
}

# Egress genes
for (gene in egress_genes) {
  if (gene %in% available_genes) {
    n_mut <- sum(patient_scores[[gene]] > 0, na.rm = TRUE)
    pct <- round(n_mut / n_total * 100, 1)
    cat(sprintf("%-12s %-12s %8d %9.1f%% %10s\n", gene, "Egress", n_mut, pct, "Available"))
  } else {
    cat(sprintf("%-12s %-12s %8s %10s %10s\n", gene, "Egress", "-", "-", "Not in panel"))
  }
}

# Summary stats
n_retention <- sum(patient_scores$RetentionLoF > 0, na.rm = TRUE)
n_egress <- sum(patient_scores$EgressGoF > 0, na.rm = TRUE)
n_both <- sum(patient_scores$RetentionLoF > 0 & patient_scores$EgressGoF > 0, na.rm = TRUE)
n_any <- sum(patient_scores$Combined > 0, na.rm = TRUE)

cat(paste(rep("-", 55), collapse = ""), "\n")
cat(sprintf("%-12s %-12s %8d %9.1f%% %10s\n", "Any Ret LoF", "(partial)", n_retention, round(n_retention/n_total*100, 1), paste(length(retention_available), "genes")))
cat(sprintf("%-12s %-12s %8d %9.1f%% %10s\n", "Any Egr GoF", "(partial)", n_egress, round(n_egress/n_total*100, 1), paste(length(egress_available), "genes")))
cat(sprintf("%-12s %-12s %8d %9.1f%%\n", "Both", "", n_both, round(n_both/n_total*100, 1)))
cat(sprintf("%-12s %-12s %8d %9.1f%%\n", "COMBINED", "(available)", n_any, round(n_any/n_total*100, 1)))
cat("\n")

# =============================================================================
# SECTION 5: Additional HMRN mutations of interest
# =============================================================================

cat("SECTION 5: KEY DLBCL MUTATIONS IN HMRN COHORT\n")
cat("----------------------------------------------\n")

# Key genes from the Lacy 2020 clusters
key_genes <- c("MYD88_265", "CD79B", "BCL2_S", "EZH2_646", "CREBBP", "KMT2D",
               "NOTCH2", "BCL10", "TNFAIP3_OR_del", "SGK1_S", "SOCS1_S", "TET2",
               "TP53_OR_del", "NFKBIA", "NFKBIE")

key_in_data <- key_genes[key_genes %in% names(mutations)]

cat(sprintf("%-20s %8s %10s\n", "Gene", "N", "Frequency"))
cat(paste(rep("-", 40), collapse = ""), "\n")

for (gene in key_in_data) {
  n_mut <- sum(mutations[[gene]] > 0, na.rm = TRUE)
  pct <- round(n_mut / n_total * 100, 1)
  cat(sprintf("%-20s %8d %9.1f%%\n", gene, n_mut, pct))
}
cat("\n")

# =============================================================================
# SECTION 6: Molecular subtype analysis (if cluster assignments available)
# =============================================================================

cat("SECTION 6: MOLECULAR SUBTYPE ANALYSIS\n")
cat("--------------------------------------\n")

# Check if we have cluster data from the Lacy paper
# The HMRN data identifies 5 clusters: MYD88, BCL2, SOCS1/SGK1, TET2/SGK1, NOTCH2

# For now, we can approximate clusters based on key mutations
# Note: This is a simplified approximation - true cluster assignments are in Supp Table S5

patient_scores$Cluster_Approx <- "Unclassified"

# MYD88 cluster markers
patient_scores$Cluster_Approx[mutations$MYD88_265 == 1 | mutations$CD79B == 1] <- "MYD88"

# BCL2/EZB cluster markers
patient_scores$Cluster_Approx[mutations$BCL2_S == 1 | mutations$EZH2_646 == 1 | mutations$CREBBP == 1] <- "BCL2"

# NOTCH2 cluster markers
patient_scores$Cluster_Approx[mutations$NOTCH2 == 1 | mutations$BCL10 == 1] <- "NOTCH2"

# SOCS1/SGK1 cluster markers
patient_scores$Cluster_Approx[mutations$SOCS1_S == 1 & mutations$SGK1_S == 1] <- "SOCS1/SGK1"

# TET2/SGK1 cluster markers
patient_scores$Cluster_Approx[mutations$TET2 == 1 & mutations$SGK1_S == 1] <- "TET2/SGK1"

cat("Approximate molecular subtype distribution:\n")
cluster_table <- table(patient_scores$Cluster_Approx)
for (cl in names(cluster_table)) {
  n <- cluster_table[cl]
  pct <- round(n / n_total * 100, 1)
  cat(sprintf("  %-15s: %4d (%5.1f%%)\n", cl, n, pct))
}
cat("\n")

# S1P pathway by approximate cluster
cat("S1P Pathway mutations by molecular subtype (approximate):\n")
cat(sprintf("%-15s %6s %12s %10s %8s\n", "Cluster", "N", "Any S1P (%)", "RetLoF(%)", "EgrGoF(%)"))
cat(paste(rep("-", 55), collapse = ""), "\n")

for (cl in c("MYD88", "BCL2", "NOTCH2", "SOCS1/SGK1", "TET2/SGK1", "Unclassified")) {
  subset <- patient_scores[patient_scores$Cluster_Approx == cl, ]
  n <- nrow(subset)
  if (n > 0) {
    pct_any <- round(sum(subset$Combined > 0) / n * 100, 1)
    pct_ret <- round(sum(subset$RetentionLoF > 0) / n * 100, 1)
    pct_egr <- round(sum(subset$EgressGoF > 0) / n * 100, 1)
    cat(sprintf("%-15s %6d %11.1f%% %9.1f%% %8.1f%%\n", cl, n, pct_any, pct_ret, pct_egr))
  }
}
cat("\n")

# Save updated file with cluster assignments
write.csv(patient_scores, output_file, row.names = FALSE)

# =============================================================================
# SECTION 7: Pathway mutation matrix for heatmap
# =============================================================================

cat("SECTION 7: SAVING MUTATION MATRICES\n")
cat("------------------------------------\n")

# Save pathway-specific mutation data
pathway_matrix <- patient_scores %>%
  select(PatientID, all_of(available_genes), RetentionLoF, EgressGoF, Combined, Cluster_Approx)

pathway_file <- file.path(processed_dir, "sha_pathway_mutations.csv")
write.csv(pathway_matrix, pathway_file, row.names = FALSE)
cat("Saved: sha_pathway_mutations.csv\n")

# Save full mutation data for future analysis
full_mutations <- mutations
full_mutations$RetentionLoF <- patient_scores$RetentionLoF
full_mutations$EgressGoF <- patient_scores$EgressGoF
full_mutations$Combined <- patient_scores$Combined
full_mutations$Cluster_Approx <- patient_scores$Cluster_Approx

full_file <- file.path(processed_dir, "sha_full_mutations.csv")
write.csv(full_mutations, full_file, row.names = FALSE)
cat("Saved: sha_full_mutations.csv\n\n")

# =============================================================================
# SUMMARY
# =============================================================================

cat("=============================================================================\n")
cat("ANALYSIS COMPLETE\n")
cat("=============================================================================\n\n")

cat("Key Findings:\n")
cat(sprintf("  - Total patients: n = %d\n", n_total))
cat(sprintf("  - S1P pathway genes in panel: %d/9\n", length(available_genes)))
cat(sprintf("  - Patients with any S1P mutation: %d (%.1f%%)\n", n_any, n_any/n_total*100))
cat(sprintf("  - RetentionLoF (GNA13, P2RY8, RHOA): %d (%.1f%%)\n", n_retention, n_retention/n_total*100))
cat(sprintf("  - EgressGoF (CXCR4 only): %d (%.1f%%)\n", n_egress, n_egress/n_total*100))
cat("\n")

cat("Limitations:\n")
cat("  - Missing S1PR2, ARHGEF1, GNAI2, RAC2, ARHGAP25\n")
cat("  - Egress score limited to CXCR4 only\n")
cat("  - Cluster assignments are approximate (true assignments in Supp Table S5)\n\n")

cat("Output files:\n")
cat("  - data/processed/sha_s1p_clinical.csv\n")
cat("  - data/processed/sha_pathway_mutations.csv\n")
cat("  - data/processed/sha_full_mutations.csv\n")
