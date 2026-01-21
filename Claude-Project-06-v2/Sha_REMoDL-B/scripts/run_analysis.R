# =============================================================================
# Sha/REMODL-B Analysis Pipeline - Master Script
# =============================================================================
#
# This master script runs the full analysis pipeline for the Sha/REMODL-B cohort.
#
# Data Sources:
#   - Gene Expression: GEO GSE117556 (928 patients)
#   - Mutations: GitHub repo (HMRN 293-gene panel, 928 patients)
#   - Clinical: Blood 2020 Supplementary Tables
#
# Usage:
#   source("run_analysis.R")
#
# =============================================================================

sha_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Sha"
setwd(sha_dir)

cat("\n")
cat("=============================================================================\n")
cat("  SHA/REMODL-B DLBCL Analysis Pipeline\n")
cat("=============================================================================\n\n")

# Step 1: Check if data is available
cat("Step 1: Checking data availability...\n")

raw_dir <- file.path(sha_dir, "data/raw")
genomic_file <- file.path(raw_dir, "genomic_data.csv")

if (!file.exists(genomic_file)) {
  cat("  Mutation data not found. Running download script...\n")
  source("scripts/download_sha_data.R")
} else {
  cat("  Mutation data found.\n")
}

# Step 2: Run main analysis
cat("\nStep 2: Running S1P pathway analysis...\n")
cat("---------------------------------------\n\n")

source("scripts/full_analysis_code.R")

# Step 3: Summary
cat("\n=============================================================================\n")
cat("Pipeline Complete\n")
cat("=============================================================================\n\n")

cat("Generated outputs:\n")
cat("  data/processed/sha_s1p_clinical.csv      - Patient pathway scores\n")
cat("  data/processed/sha_pathway_mutations.csv - S1P gene mutations\n")
cat("  data/processed/sha_full_mutations.csv    - Full 117-gene mutations\n\n")

cat("Next steps:\n")
cat("  1. Download clinical data (see README.md for instructions)\n")
cat("  2. Add OS/PFS data for survival analysis\n")
cat("  3. Merge with GEO expression data for transcriptomic analysis\n")
