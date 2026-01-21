# =============================================================================
# Download Schmitz/NCI DLBCL Data from GDC
# Using TCGAbiolinks package
# =============================================================================
# Author: Eric Perkey
# Purpose: Download mutation and clinical data for Egress Score validation
# =============================================================================

# -----------------------------------------------------------------------------
# STEP 1: Install and load packages
# -----------------------------------------------------------------------------

cat("=============================================================\n")
cat("Schmitz/NCI DLBCL Data Download Script\n")
cat("=============================================================\n\n")

# Install BiocManager if needed
if (!require("BiocManager", quietly = TRUE)) {
  install.packages("BiocManager")
}

# Install TCGAbiolinks if needed
if (!require("TCGAbiolinks", quietly = TRUE)) {
  cat("Installing TCGAbiolinks (this may take a few minutes)...\n")
  BiocManager::install("TCGAbiolinks")
}

library(TCGAbiolinks)

# Set output directory
schmitz_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Schmitz_NCI"
raw_dir <- file.path(schmitz_dir, "data/raw")
processed_dir <- file.path(schmitz_dir, "data/processed")

# Create directories if they don't exist
dir.create(raw_dir, recursive = TRUE, showWarnings = FALSE)
dir.create(processed_dir, recursive = TRUE, showWarnings = FALSE)

# -----------------------------------------------------------------------------
# STEP 2: Download Clinical Data
# -----------------------------------------------------------------------------

cat("\n--- Downloading Clinical Data ---\n")

# Query clinical data
clinical_query <- GDCquery(
  project = "NCICCR-DLBCL",
  data.category = "Clinical",
  data.type = "Clinical Supplement",
  data.format = "BCR XML"
)

# Download
GDCdownload(clinical_query, directory = raw_dir)

# Get clinical data directly (easier method)
cat("Fetching clinical data from GDC...\n")
clinical <- GDCquery_clinic(project = "NCICCR-DLBCL", type = "clinical")

cat("Clinical data retrieved:", nrow(clinical), "patients\n")
cat("Columns:", paste(head(names(clinical), 10), collapse = ", "), "...\n")

# Save clinical data
write.csv(clinical, file.path(processed_dir, "nci_clinical.csv"), row.names = FALSE)
cat("Saved: nci_clinical.csv\n")

# Check survival data availability
if ("days_to_death" %in% names(clinical) || "days_to_last_follow_up" %in% names(clinical)) {
  cat("\n*** Survival data IS available! ***\n")

  # Calculate OS in months
  clinical$OS_Days <- ifelse(!is.na(clinical$days_to_death),
                              clinical$days_to_death,
                              clinical$days_to_last_follow_up)
  clinical$OS_Months <- clinical$OS_Days / 30.44
  clinical$OS_Death <- as.integer(!is.na(clinical$days_to_death))

  cat("Patients with OS data:", sum(!is.na(clinical$OS_Days)), "\n")
  cat("Deaths:", sum(clinical$OS_Death, na.rm = TRUE), "\n")
} else {
  cat("\nNote: Survival fields not in standard location. Will check MAF clinical annotations.\n")
}

# -----------------------------------------------------------------------------
# STEP 3: Download Mutation Data (MAF)
# -----------------------------------------------------------------------------

cat("\n--- Downloading Mutation Data (MAF) ---\n")

# Query mutation data
mutation_query <- GDCquery(
  project = "NCICCR-DLBCL",
  data.category = "Simple Nucleotide Variation",
  data.type = "Masked Somatic Mutation",
  access = "open"
)

# Show what's available
cat("Available mutation files:", nrow(getResults(mutation_query)), "\n")

# Download
GDCdownload(mutation_query, directory = raw_dir)

# Prepare/load the data
mutations <- GDCprepare(mutation_query, directory = raw_dir)

cat("Mutation data loaded:", nrow(mutations), "mutations\n")
cat("Unique samples:", length(unique(mutations$Tumor_Sample_Barcode)), "\n")

# Save full mutation data
write.csv(mutations, file.path(processed_dir, "nci_mutations_full.csv"), row.names = FALSE)
cat("Saved: nci_mutations_full.csv\n")

# -----------------------------------------------------------------------------
# STEP 4: Filter for Pathway Genes
# -----------------------------------------------------------------------------

cat("\n--- Filtering for GC Positioning Pathway Genes ---\n")

# Define pathway genes
retention_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")
egress_genes <- c("CXCR4", "GNAI2", "RAC2", "ARHGAP25")
all_pathway_genes <- c(retention_genes, egress_genes)

cat("Searching for mutations in:", paste(all_pathway_genes, collapse = ", "), "\n")

# Filter mutations
pathway_mutations <- mutations[mutations$Hugo_Symbol %in% all_pathway_genes, ]

cat("Pathway gene mutations found:", nrow(pathway_mutations), "\n")

# Show breakdown by gene
cat("\nMutations by gene:\n")
gene_counts <- table(pathway_mutations$Hugo_Symbol)
for (gene in all_pathway_genes) {
  n <- ifelse(gene %in% names(gene_counts), gene_counts[gene], 0)
  cat(sprintf("  %s: %d\n", gene, n))
}

# Save pathway mutations
write.csv(pathway_mutations, file.path(processed_dir, "nci_pathway_mutations.csv"), row.names = FALSE)
cat("\nSaved: nci_pathway_mutations.csv\n")

# -----------------------------------------------------------------------------
# STEP 5: Summary
# -----------------------------------------------------------------------------

cat("\n=============================================================\n")
cat("DOWNLOAD COMPLETE\n")
cat("=============================================================\n")
cat("\nFiles saved to:", processed_dir, "\n")
cat("  - nci_clinical.csv (clinical data with survival)\n")
cat("  - nci_mutations_full.csv (all mutations)\n")
cat("  - nci_pathway_mutations.csv (pathway genes only)\n")

cat("\nNext steps:\n")
cat("  1. Download genetic subtype data from NEJM supplementary\n")
cat("  2. Merge clinical + mutations + subtypes\n")
cat("  3. Calculate Egress Scores\n")
cat("  4. Run survival analysis in EZB subtype\n")

# -----------------------------------------------------------------------------
# STEP 6: Quick Look at Data Structure
# -----------------------------------------------------------------------------

cat("\n--- Clinical Data Structure ---\n")
cat("Key columns available:\n")
print(names(clinical))

cat("\n--- Sample of Pathway Mutations ---\n")
if (nrow(pathway_mutations) > 0) {
  print(head(pathway_mutations[, c("Hugo_Symbol", "Tumor_Sample_Barcode",
                                    "Variant_Classification", "HGVSp_Short")], 10))
}
