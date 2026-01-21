# =============================================================================
# 01_get_gene_lengths.R
# Download CDS lengths via biomaRt for aSHM signature analysis
# =============================================================================

library(biomaRt)
library(dplyr)
library(readr)

# Output directory
output_dir <- "Reddy_Duke/analysis/output"
if (!dir.exists(output_dir)) dir.create(output_dir, recursive = TRUE)

# -----------------------------------------------------------------------------
# Load mutation data to get unique gene list
# -----------------------------------------------------------------------------
cat("Loading mutation data to extract unique genes...\n")

# Load Chapuy WES data (has silent mutations)
chapuy_muts <- read.delim("Chapuy_Broad/data/raw/data_mutations.txt",
                          stringsAsFactors = FALSE)
cat(sprintf("  Chapuy mutations: %d\n", nrow(chapuy_muts)))

# Load GAMBL data
gambl_muts <- read.delim("Dreval_GAMBL/data/raw/Table_S3.tsv",
                         stringsAsFactors = FALSE)
cat(sprintf("  GAMBL mutations: %d\n", nrow(gambl_muts)))

# Get unique genes from both datasets
chapuy_genes <- unique(chapuy_muts$Hugo_Symbol)
gambl_genes <- unique(gambl_muts$Hugo_Symbol)
all_genes <- unique(c(chapuy_genes, gambl_genes))

cat(sprintf("\nUnique genes:\n"))
cat(sprintf("  Chapuy: %d\n", length(chapuy_genes)))
cat(sprintf("  GAMBL: %d\n", length(gambl_genes)))
cat(sprintf("  Combined: %d\n", length(all_genes)))

# -----------------------------------------------------------------------------
# Connect to Ensembl biomaRt
# -----------------------------------------------------------------------------
cat("\nConnecting to Ensembl biomaRt...\n")

# Use Ensembl GRCh37 archive for compatibility with mutation data
ensembl <- useMart("ensembl", dataset = "hsapiens_gene_ensembl",
                   host = "grch37.ensembl.org")

# -----------------------------------------------------------------------------
# Download CDS lengths
# -----------------------------------------------------------------------------
cat("Downloading CDS lengths for all genes...\n")

# Get gene attributes including CDS length
gene_info <- getBM(
  attributes = c(
    "hgnc_symbol",
    "ensembl_gene_id",
    "ensembl_transcript_id",
    "transcript_biotype",
    "cds_length",
    "transcript_length"
  ),
  filters = "hgnc_symbol",
  values = all_genes,
  mart = ensembl
)

cat(sprintf("  Retrieved %d transcript records\n", nrow(gene_info)))

# -----------------------------------------------------------------------------
# Select canonical transcript (longest CDS per gene)
# -----------------------------------------------------------------------------
cat("Selecting canonical transcripts (longest CDS per gene)...\n")

# Filter to protein-coding transcripts with valid CDS
gene_info_filtered <- gene_info %>%
  filter(transcript_biotype == "protein_coding",
         !is.na(cds_length),
         cds_length > 0)

# Select longest CDS per gene (canonical transcript)
gene_lengths <- gene_info_filtered %>%
  group_by(hgnc_symbol) %>%
  slice_max(order_by = cds_length, n = 1, with_ties = FALSE) %>%
  ungroup() %>%
  select(
    Gene = hgnc_symbol,
    Ensembl_Gene_ID = ensembl_gene_id,
    Ensembl_Transcript_ID = ensembl_transcript_id,
    CDS_length_bp = cds_length,
    Transcript_length_bp = transcript_length
  ) %>%
  arrange(Gene)

cat(sprintf("  Canonical transcripts for %d genes\n", nrow(gene_lengths)))

# -----------------------------------------------------------------------------
# Check for missing genes
# -----------------------------------------------------------------------------
missing_genes <- setdiff(all_genes, gene_lengths$Gene)
if (length(missing_genes) > 0) {
  cat(sprintf("\nWarning: %d genes not found in Ensembl:\n", length(missing_genes)))
  if (length(missing_genes) <= 20) {
    cat(paste("  ", missing_genes, collapse = "\n"))
    cat("\n")
  } else {
    cat(paste("  ", head(missing_genes, 20), collapse = "\n"))
    cat(sprintf("\n  ... and %d more\n", length(missing_genes) - 20))
  }
}

# -----------------------------------------------------------------------------
# Validate key genes
# -----------------------------------------------------------------------------
cat("\nValidating CDS lengths for key genes:\n")
validation_genes <- c("TP53", "BCL2", "MYC", "BCL6", "PIM1", "CDKN2A")

for (g in validation_genes) {
  len <- gene_lengths$CDS_length_bp[gene_lengths$Gene == g]
  if (length(len) > 0) {
    cat(sprintf("  %s: %d bp\n", g, len))
  } else {
    cat(sprintf("  %s: NOT FOUND\n", g))
  }
}

# Expected values for verification (from UCSC):
# TP53: ~1182 bp, BCL2: ~720 bp, MYC: ~1320 bp
cat("\nExpected CDS lengths (UCSC reference):\n")
cat("  TP53: ~1182 bp\n")
cat("  BCL2: ~720 bp\n")
cat("  MYC: ~1320 bp\n")

# -----------------------------------------------------------------------------
# Save output
# -----------------------------------------------------------------------------
output_file <- file.path(output_dir, "gene_cds_lengths.csv")
write_csv(gene_lengths, output_file)
cat(sprintf("\nSaved gene lengths to: %s\n", output_file))

# Also save summary statistics
summary_stats <- data.frame(
  Metric = c(
    "Total genes queried",
    "Genes with CDS length",
    "Genes missing",
    "Median CDS length (bp)",
    "Mean CDS length (bp)",
    "Min CDS length (bp)",
    "Max CDS length (bp)"
  ),
  Value = c(
    length(all_genes),
    nrow(gene_lengths),
    length(missing_genes),
    median(gene_lengths$CDS_length_bp),
    round(mean(gene_lengths$CDS_length_bp), 1),
    min(gene_lengths$CDS_length_bp),
    max(gene_lengths$CDS_length_bp)
  )
)

summary_file <- file.path(output_dir, "gene_lengths_summary.csv")
write_csv(summary_stats, summary_file)
cat(sprintf("Saved summary to: %s\n", summary_file))

cat("\n=== Gene length annotation complete ===\n")
