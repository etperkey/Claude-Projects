# =============================================================================
# ashm_analysis_master.R
# Master script for aSHM Signature Development and Selection Analysis
# =============================================================================
#
# This analysis distinguishes passenger mutations (from aberrant somatic
# hypermutation / aSHM) from true selected variants (LoF/GoF) and tests
# for clinical outcome associations.
#
# BIOLOGICAL RATIONALE:
# - AID (AICDA) targets specific DNA motifs during class switch recombination
# - In DLBCL, AID aberrantly mutates genes beyond Ig loci (aSHM)
# - aSHM produces predominantly synonymous and missense mutations (passengers)
# - True driver genes show excess truncating (tumor suppressors) or
#   recurrent hotspot missense (oncogenes)
#
# ANALYSIS STEPS:
# 1. Gene length annotation via biomaRt
# 2. Calculate mutation rates by functional consequence
# 3. Identify aSHM target genes (high syn+mis, low truncating ratio)
# 4. Selection analysis (observed vs expected truncating)
# 5. GoF hotspot identification (recurrent missense)
# 6. Clinical outcome associations
#
# =============================================================================

# Set working directory to project root
# setwd("/Users/ericperkey/Desktop/Claude-Projects/Claude-Project-06-v2")

cat("\n")
cat("=============================================================\n")
cat("  aSHM SIGNATURE DEVELOPMENT AND SELECTION ANALYSIS\n")
cat("=============================================================\n")
cat("\n")

# Check for required packages
required_packages <- c(
  "biomaRt",      # Gene annotation
  "dplyr",        # Data manipulation
  "tidyr",        # Data tidying
  "readr",        # CSV I/O
  "stringr",      # String operations
  "ggplot2",      # Visualization
  "ggrepel",      # Label placement
  "survival",     # Survival analysis
  "survminer",    # Survival plots
  "broom"         # Model tidying
)

missing_packages <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]

if (length(missing_packages) > 0) {
  cat("Missing packages:", paste(missing_packages, collapse = ", "), "\n")
  cat("Install with: install.packages(c('", paste(missing_packages, collapse = "', '"), "'))\n")
  stop("Please install missing packages before running.")
}

cat("All required packages available.\n\n")

# Create output directories
if (!dir.exists("Reddy_Duke/analysis/output")) {
  dir.create("Reddy_Duke/analysis/output", recursive = TRUE)
}
if (!dir.exists("Reddy_Duke/analysis/figures")) {
  dir.create("Reddy_Duke/analysis/figures", recursive = TRUE)
}

# -----------------------------------------------------------------------------
# Run analysis steps
# -----------------------------------------------------------------------------

run_step <- function(script_name, step_num, description) {
  cat("\n")
  cat("-------------------------------------------------------------\n")
  cat(sprintf("STEP %d: %s\n", step_num, description))
  cat("-------------------------------------------------------------\n")

  script_path <- file.path("Reddy_Duke/analysis", script_name)

  if (!file.exists(script_path)) {
    cat(sprintf("ERROR: Script not found: %s\n", script_path))
    return(FALSE)
  }

  tryCatch({
    source(script_path, local = new.env())
    cat(sprintf("\n[OK] Step %d completed successfully.\n", step_num))
    return(TRUE)
  }, error = function(e) {
    cat(sprintf("\n[ERROR] Step %d failed: %s\n", step_num, e$message))
    return(FALSE)
  })
}

# Track results
results <- list()
start_time <- Sys.time()

# Step 1: Gene length annotation
results$step1 <- run_step(
  "01_get_gene_lengths.R",
  1,
  "Gene Length Annotation (biomaRt)"
)

# Step 2: Mutation rate calculation
if (results$step1) {
  results$step2 <- run_step(
    "02_calculate_mutation_rates.R",
    2,
    "Mutation Rate Calculation"
  )
} else {
  cat("\nSkipping Step 2 due to Step 1 failure.\n")
  results$step2 <- FALSE
}

# Step 3: aSHM signature identification
if (results$step2) {
  results$step3 <- run_step(
    "03_ashm_signature.R",
    3,
    "aSHM Signature Identification"
  )
} else {
  cat("\nSkipping Step 3 due to previous failure.\n")
  results$step3 <- FALSE
}

# Step 4: Selection analysis
if (results$step3) {
  results$step4 <- run_step(
    "04_selection_analysis.R",
    4,
    "Gene/Pathway Selection Analysis"
  )
} else {
  cat("\nSkipping Step 4 due to previous failure.\n")
  results$step4 <- FALSE
}

# Step 5: GoF hotspot analysis
if (results$step4) {
  results$step5 <- run_step(
    "05_hotspot_analysis.R",
    5,
    "GoF Hotspot Identification"
  )
} else {
  cat("\nSkipping Step 5 due to previous failure.\n")
  results$step5 <- FALSE
}

# Step 6: Outcome associations
if (results$step5) {
  results$step6 <- run_step(
    "06_outcome_associations.R",
    6,
    "Clinical Outcome Associations"
  )
} else {
  cat("\nSkipping Step 6 due to previous failure.\n")
  results$step6 <- FALSE
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
end_time <- Sys.time()
elapsed <- difftime(end_time, start_time, units = "mins")

cat("\n")
cat("=============================================================\n")
cat("  ANALYSIS COMPLETE\n")
cat("=============================================================\n")
cat(sprintf("Total time: %.1f minutes\n\n", as.numeric(elapsed)))

cat("Step Results:\n")
for (step in names(results)) {
  status <- ifelse(results[[step]], "[OK]", "[FAILED]")
  cat(sprintf("  %s: %s\n", step, status))
}

cat("\n")
cat("Output Files:\n")
cat("  Reddy_Duke/analysis/output/\n")
output_files <- list.files("Reddy_Duke/analysis/output", full.names = FALSE)
for (f in output_files) {
  cat(sprintf("    - %s\n", f))
}

cat("\n")
cat("Figures:\n")
cat("  Reddy_Duke/analysis/figures/\n")
figure_files <- list.files("Reddy_Duke/analysis/figures", full.names = FALSE)
for (f in figure_files) {
  cat(sprintf("    - %s\n", f))
}

# -----------------------------------------------------------------------------
# Key outputs summary
# -----------------------------------------------------------------------------
cat("\n")
cat("=============================================================\n")
cat("  KEY OUTPUTS\n")
cat("=============================================================\n")

cat("\n1. aSHM SIGNATURE:\n")
cat("   - ashm_signature_genes.csv: Genes targeted by aSHM\n")
cat("   - patient_ashm_burden.csv: Per-patient aSHM mutation scores\n")

cat("\n2. SELECTION ANALYSIS:\n")
cat("   - selection_analysis.csv: Gene-level selection ratios\n")
cat("   - tumor_suppressors.csv: Genes under positive selection for LoF\n")
cat("   - pathway_selection.csv: Pathway-level selection analysis\n")

cat("\n3. GOF HOTSPOTS:\n")
cat("   - gof_hotspots.csv: Recurrent missense hotspot positions\n")
cat("   - patient_gof_hotspots.csv: Per-patient GoF hotspot counts\n")

cat("\n4. CLINICAL ASSOCIATIONS:\n")
cat("   - outcome_burden_results.csv: Burden association with OS\n")
cat("   - outcome_gene_results.csv: Gene-level survival associations\n")
cat("   - patient_burden_scores.csv: Combined clinical + mutation data\n")

cat("\n")
cat("=============================================================\n")
cat("  INTERPRETATION GUIDE\n")
cat("=============================================================\n")

cat("\n")
cat("aSHM TARGET GENES (high mutation rate, low truncating ratio):\n")
cat("  - Represent PASSENGER mutations from aberrant AID activity\n")
cat("  - Should NOT be tested for prognostic associations individually\n")
cat("  - aSHM burden may correlate with ABC-DLBCL subtype\n")

cat("\n")
cat("TUMOR SUPPRESSORS (excess truncating mutations):\n")
cat("  - Selection_ratio > 2 indicates positive selection for LoF\n")
cat("  - These represent TRUE DRIVER genes\n")
cat("  - Truncating mutations in these genes are clinically relevant\n")

cat("\n")
cat("GOF HOTSPOTS (recurrent missense):\n")
cat("  - MYD88 L265P: ABC-DLBCL driver (TLR/NF-kB activation)\n")
cat("  - EZH2 Y641: GCB-DLBCL driver (H3K27 hypermethylation)\n")
cat("  - CD79B Y196: BCR signaling activation\n")
cat("  - These are targetable with specific inhibitors\n")

cat("\n")
cat("=============================================================\n")
