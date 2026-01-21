# =============================================================================
# Parse PMC Supplementary Clinical Data
# Blood 2020 - Lacy et al. HMRN DLBCL Cohort
# =============================================================================

library(readxl)
library(dplyr)

sha_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Sha_REMoDL-B"
raw_dir <- file.path(sha_dir, "data/raw")
processed_dir <- file.path(sha_dir, "data/processed")

cat("=============================================================================\n")
cat("Parsing PMC Supplementary Clinical Data\n")
cat("=============================================================================\n\n")

# Check for supplementary file
supp_file <- file.path(raw_dir, "blood_2020_supplement.xlsx")

if (!file.exists(supp_file)) {
  cat("ERROR: Supplementary file not found!\n\n")
  cat("Please download manually:\n")
  cat("1. Go to: https://pmc.ncbi.nlm.nih.gov/articles/PMC7259825/\n")
  cat("2. Download: bloodBLD2019003535-suppl2.xlsx\n")
  cat("3. Save as: blood_2020_supplement.xlsx in data/raw/\n")
  stop("File not found")
}

# List available sheets
cat("Reading Excel file...\n")
sheets <- excel_sheets(supp_file)
cat("Available sheets:\n")
for (i in seq_along(sheets)) {
  cat(sprintf("  %d. %s\n", i, sheets[i]))
}

# Process each relevant sheet
cat("\n=============================================================================\n")
cat("Processing Sheets\n")
cat("=============================================================================\n")

# Table S4: Patient clinical data
clinical_sheets <- sheets[grepl("S4|clinical|patient", sheets, ignore.case = TRUE)]
if (length(clinical_sheets) > 0) {
  cat("\nProcessing clinical data sheet:", clinical_sheets[1], "\n")
  clinical <- read_excel(supp_file, sheet = clinical_sheets[1])
  cat("  Rows:", nrow(clinical), "\n")
  cat("  Columns:", paste(names(clinical)[1:min(10, ncol(clinical))], collapse = ", "), "...\n")

  # Save clinical data
  write.csv(clinical, file.path(processed_dir, "sha_pmc_clinical.csv"), row.names = FALSE)
  cat("  Saved: sha_pmc_clinical.csv\n")
}

# Table S5: Cluster assignments
cluster_sheets <- sheets[grepl("S5|cluster", sheets, ignore.case = TRUE)]
if (length(cluster_sheets) > 0) {
  cat("\nProcessing cluster data sheet:", cluster_sheets[1], "\n")
  clusters <- read_excel(supp_file, sheet = cluster_sheets[1])
  cat("  Rows:", nrow(clusters), "\n")

  # Save cluster assignments
  write.csv(clusters, file.path(processed_dir, "sha_clusters.csv"), row.names = FALSE)
  cat("  Saved: sha_clusters.csv\n")
}

# Table S6: Outcome data
outcome_sheets <- sheets[grepl("S6|outcome|survival", sheets, ignore.case = TRUE)]
if (length(outcome_sheets) > 0) {
  cat("\nProcessing outcome data sheet:", outcome_sheets[1], "\n")
  outcomes <- read_excel(supp_file, sheet = outcome_sheets[1])
  cat("  Rows:", nrow(outcomes), "\n")

  # Save outcome data
  write.csv(outcomes, file.path(processed_dir, "sha_outcomes.csv"), row.names = FALSE)
  cat("  Saved: sha_outcomes.csv\n")
}

# Table S1: Gene panel
panel_sheets <- sheets[grepl("S1|gene|panel", sheets, ignore.case = TRUE)]
if (length(panel_sheets) > 0) {
  cat("\nProcessing gene panel sheet:", panel_sheets[1], "\n")
  panel <- read_excel(supp_file, sheet = panel_sheets[1])
  cat("  Genes:", nrow(panel), "\n")

  # Save gene panel
  write.csv(panel, file.path(processed_dir, "sha_gene_panel.csv"), row.names = FALSE)
  cat("  Saved: sha_gene_panel.csv\n")
}

# If we couldn't find specific sheets, try to process all
if (length(clinical_sheets) == 0 && length(cluster_sheets) == 0) {
  cat("\nNo matching sheet names found. Processing all sheets...\n")
  for (sheet in sheets) {
    tryCatch({
      data <- read_excel(supp_file, sheet = sheet)
      cat(sprintf("\n  Sheet '%s': %d rows x %d cols\n", sheet, nrow(data), ncol(data)))

      # Save each sheet
      filename <- paste0("sha_", gsub("[^a-zA-Z0-9]", "_", sheet), ".csv")
      write.csv(data, file.path(processed_dir, filename), row.names = FALSE)
      cat("    Saved:", filename, "\n")
    }, error = function(e) {
      cat(sprintf("  Sheet '%s': Error - %s\n", sheet, conditionMessage(e)))
    })
  }
}

cat("\n=============================================================================\n")
cat("Parsing Complete\n")
cat("=============================================================================\n\n")

cat("Next: Run full_analysis_code.R to merge with mutation data\n")
