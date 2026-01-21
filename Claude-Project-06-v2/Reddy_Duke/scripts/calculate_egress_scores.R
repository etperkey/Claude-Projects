# =============================================================================
# Calculate Egress Scores for Duke DLBCL Cohort
# Replicating methodology from Chapuy analysis
# =============================================================================

cat("=============================================================\n")
cat("Duke DLBCL Egress Score Calculation\n")
cat("=============================================================\n\n")

library(dplyr)
library(tidyr)

duke_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Duke"
raw_dir <- file.path(duke_dir, "data/raw")
processed_dir <- file.path(duke_dir, "data/processed")

dir.create(processed_dir, recursive = TRUE, showWarnings = FALSE)

# -----------------------------------------------------------------------------
# Load Data
# -----------------------------------------------------------------------------

cat("--- Loading Data ---\n\n")

# Load clinical data
clinical <- read.csv(file.path(raw_dir, "data_clinical_combined.csv"), stringsAsFactors = FALSE)
cat("Clinical data:", nrow(clinical), "patients\n")

# Load mutations
mutations <- read.csv(file.path(raw_dir, "data_mutations.csv"), stringsAsFactors = FALSE)
cat("Pathway mutations:", nrow(mutations), "mutations\n")
cat("Unique samples with mutations:", length(unique(mutations$Tumor_Sample_Barcode)), "\n\n")

# -----------------------------------------------------------------------------
# Define Pathway Genes
# -----------------------------------------------------------------------------

# GC B-cell Positioning Pathway genes
retention_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")
egress_genes <- c("CXCR4", "GNAI2", "RAC2", "ARHGAP25")
all_pathway_genes <- c(retention_genes, egress_genes)

cat("Retention LoF genes:", paste(retention_genes, collapse = ", "), "\n")
cat("Egress GoF genes:", paste(egress_genes, collapse = ", "), "\n\n")

# -----------------------------------------------------------------------------
# Calculate Egress Score
# -----------------------------------------------------------------------------

cat("--- Calculating Egress Scores ---\n\n")

# For each patient, count:
# - Number of retention genes with LOF mutations
# - Number of egress genes with GOF mutations (for CXCR4, C-terminal truncations)

# Get all samples
all_samples <- unique(clinical$SAMPLE_ID)
cat("Total samples:", length(all_samples), "\n")

# Function to check if mutation is likely LOF
is_lof <- function(variant_class) {
  lof_types <- c("Nonsense_Mutation", "Frame_Shift_Del", "Frame_Shift_Ins",
                 "Splice_Site", "Splice_Region", "Translation_Start_Site")
  variant_class %in% lof_types
}

# Calculate scores for each sample
egress_scores <- data.frame(SAMPLE_ID = all_samples, stringsAsFactors = FALSE)

# Initialize gene columns
for (gene in all_pathway_genes) {
  egress_scores[[paste0(gene, "_mutated")]] <- 0
}

# Mark mutations
for (i in 1:nrow(mutations)) {
  sample <- mutations$Tumor_Sample_Barcode[i]
  gene <- mutations$Hugo_Symbol[i]
  variant <- mutations$Variant_Classification[i]

  if (sample %in% egress_scores$SAMPLE_ID && gene %in% all_pathway_genes) {
    col_name <- paste0(gene, "_mutated")
    egress_scores[egress_scores$SAMPLE_ID == sample, col_name] <- 1
  }
}

# Count retention LOF (any mutation in retention genes - being permissive like Chapuy)
egress_scores$retention_count <- rowSums(egress_scores[, paste0(retention_genes, "_mutated")])

# Count egress (any mutation in egress genes)
egress_scores$egress_count <- rowSums(egress_scores[, paste0(egress_genes, "_mutated")])

# Egress Score = retention_count + egress_count
egress_scores$Egress_Score <- egress_scores$retention_count + egress_scores$egress_count

# Summary
cat("\nEgress Score distribution:\n")
print(table(egress_scores$Egress_Score))

cat("\nRetention count distribution:\n")
print(table(egress_scores$retention_count))

cat("\nEgress count distribution:\n")
print(table(egress_scores$egress_count))

# Per-gene mutation frequency
cat("\n--- Per-Gene Mutation Frequency ---\n\n")
for (gene in all_pathway_genes) {
  col <- paste0(gene, "_mutated")
  n_mutated <- sum(egress_scores[[col]])
  pct <- round(100 * n_mutated / nrow(egress_scores), 1)
  pathway <- ifelse(gene %in% retention_genes, "Retention", "Egress")
  cat(sprintf("  %-10s (%s): %3d (%4.1f%%)\n", gene, pathway, n_mutated, pct))
}

# -----------------------------------------------------------------------------
# Merge with Clinical Data
# -----------------------------------------------------------------------------

cat("\n--- Merging with Clinical Data ---\n\n")

# Merge
duke_data <- merge(clinical, egress_scores, by = "SAMPLE_ID", all.x = TRUE)

# Replace NA scores with 0 (patients with no pathway mutations)
duke_data$Egress_Score[is.na(duke_data$Egress_Score)] <- 0
duke_data$retention_count[is.na(duke_data$retention_count)] <- 0
duke_data$egress_count[is.na(duke_data$egress_count)] <- 0

# Create binary categories
duke_data$Egress_High <- ifelse(duke_data$Egress_Score >= 2, "High (>=2)", "Low (0-1)")
duke_data$Has_Pathway_Mutation <- ifelse(duke_data$Egress_Score > 0, "Yes", "No")

cat("Final dataset:", nrow(duke_data), "patients\n\n")

# Summary of Egress scores
cat("Egress Score summary:\n")
cat("  Score 0:", sum(duke_data$Egress_Score == 0), "\n")
cat("  Score 1:", sum(duke_data$Egress_Score == 1), "\n")
cat("  Score 2+:", sum(duke_data$Egress_Score >= 2), "\n")

cat("\nWith pathway mutations:", sum(duke_data$Egress_Score > 0),
    "(", round(100*sum(duke_data$Egress_Score > 0)/nrow(duke_data), 1), "%)\n")

# Check survival data completeness
cat("\n--- Survival Data Check ---\n\n")
has_survival <- !is.na(duke_data$OS_MONTHS) & !is.na(duke_data$OS_STATUS)
cat("Patients with complete survival data:", sum(has_survival), "\n")

# Convert OS_STATUS to numeric event
duke_data$OS_EVENT <- ifelse(grepl("DECEASED", duke_data$OS_STATUS), 1, 0)

# Save
write.csv(duke_data, file.path(processed_dir, "duke_egress_scores.csv"), row.names = FALSE)
cat("\nSaved: duke_egress_scores.csv\n")

# Quick cross-tab with response if available
if ("INITIAL_TX_RESPONSE" %in% names(duke_data)) {
  cat("\n--- Egress Score vs Treatment Response ---\n\n")
  print(table(duke_data$Egress_High, duke_data$INITIAL_TX_RESPONSE, useNA = "ifany"))
}

cat("\n=============================================================\n")
cat("EGRESS SCORE CALCULATION COMPLETE\n")
cat("=============================================================\n")
