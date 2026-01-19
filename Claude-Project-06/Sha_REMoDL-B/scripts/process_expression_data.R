# =============================================================================
# Process GEO Expression Data - GSE117556
# REMoDL-B DLBCL Cohort (n=928)
# =============================================================================

library(dplyr)
library(tidyr)

sha_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Sha"
raw_dir <- file.path(sha_dir, "data/raw")
processed_dir <- file.path(sha_dir, "data/processed")

cat("=============================================================================\n")
cat("Processing GEO Expression Data - GSE117556\n")
cat("=============================================================================\n\n")

# Check for expression file
expr_file <- file.path(raw_dir, "GSE117556_non-normalized.csv.gz")

if (!file.exists(expr_file)) {
  stop("Expression file not found. Download GSE117556_non-normalized.csv.gz first.")
}

cat("Reading expression data (this may take a few minutes)...\n")

# Read the expression data
expr_data <- read.csv(gzfile(expr_file), stringsAsFactors = FALSE, check.names = FALSE)

cat("  Rows (probes):", nrow(expr_data), "\n")
cat("  Columns:", ncol(expr_data), "\n")

# Check first few column names to understand structure
cat("\nFirst 10 column names:\n")
print(head(names(expr_data), 10))

# The first column is usually probe/gene ID
probe_col <- names(expr_data)[1]
cat("\nProbe ID column:", probe_col, "\n")

# Sample columns (all except first)
sample_cols <- names(expr_data)[-1]
cat("Number of sample columns:", length(sample_cols), "\n")

# Check for S1P pathway genes
s1p_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA",
               "CXCR4", "GNAI2", "RAC2", "ARHGAP25")

# Check if gene symbols are in the data (may need to look up probe annotations)
gene_matches <- sapply(s1p_genes, function(g) {
  sum(grepl(g, expr_data[[probe_col]], ignore.case = TRUE))
})

cat("\nS1P pathway gene probe matches:\n")
print(gene_matches)

# Save a summary of the expression data structure
cat("\n=============================================================================\n")
cat("Expression Data Summary\n")
cat("=============================================================================\n\n")

# Calculate expression statistics
expr_numeric <- expr_data[, sample_cols]
if (ncol(expr_numeric) > 0 && is.numeric(expr_numeric[,1])) {
  expr_means <- rowMeans(expr_numeric, na.rm = TRUE)
  expr_sds <- apply(expr_numeric, 1, sd, na.rm = TRUE)

  cat("Expression value range:\n")
  cat("  Min:", min(expr_numeric, na.rm = TRUE), "\n")
  cat("  Max:", max(expr_numeric, na.rm = TRUE), "\n")
  cat("  Mean:", mean(as.matrix(expr_numeric), na.rm = TRUE), "\n")

  # Check if data appears log-transformed
  if (max(expr_numeric, na.rm = TRUE) < 20) {
    cat("\nData appears to be log-transformed.\n")
  } else {
    cat("\nData appears to be raw (not log-transformed).\n")
  }
}

# Save expression data to processed folder (compressed)
cat("\nSaving processed expression data...\n")

# Save as RDS for faster loading in R
rds_file <- file.path(processed_dir, "sha_expression.rds")
saveRDS(expr_data, rds_file)
cat("Saved:", rds_file, "\n")

# Also create a smaller file with just S1P pathway genes if found
if (sum(gene_matches) > 0) {
  s1p_rows <- which(sapply(s1p_genes, function(g) {
    grepl(g, expr_data[[probe_col]], ignore.case = TRUE)
  }) %>% apply(1, any))

  if (length(s1p_rows) > 0) {
    s1p_expr <- expr_data[s1p_rows, ]
    s1p_file <- file.path(processed_dir, "sha_s1p_expression.csv")
    write.csv(s1p_expr, s1p_file, row.names = FALSE)
    cat("Saved S1P pathway expression:", s1p_file, "\n")
    cat("  Probes:", nrow(s1p_expr), "\n")
  }
}

cat("\n=============================================================================\n")
cat("Processing Complete\n")
cat("=============================================================================\n")
