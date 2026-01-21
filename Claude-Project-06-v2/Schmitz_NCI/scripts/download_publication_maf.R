# Download MAF files from GDC Publication Page
# These are the aggregated/processed MAF files, not individual sample files

library(httr)

cat("=== Downloading MAF from GDC Publication Page ===\n\n")

schmitz_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Schmitz_NCI"
raw_dir <- file.path(schmitz_dir, "data/raw")
dir.create(raw_dir, recursive = TRUE, showWarnings = FALSE)

# The publication page hosts pre-processed MAF files
# These are typically available at specific URLs on the GDC server

# Try direct download from GDC publication data
pub_base <- "https://api.gdc.cancer.gov/data/"

# Known file IDs from the publication (these may need to be updated)
# Let's try to find them via the publication endpoint

cat("Attempting to locate publication MAF files...\n")

# Try the GDC publication files endpoint
pub_url <- "https://gdc.cancer.gov/files/public/file/MAF_NCICCR-DLBCL_phs001444.txt"
cat("Trying:", pub_url, "\n")

# Download the MAF file
maf_file <- file.path(raw_dir, "MAF_NCICCR-DLBCL_phs001444.txt")

tryCatch({
  download.file(pub_url, maf_file, mode = "wb", quiet = FALSE)
  cat("Downloaded successfully!\n")

  # Check file size
  size <- file.info(maf_file)$size
  cat("File size:", round(size/1024/1024, 2), "MB\n")

  # Read and check
  if (size > 1000) {
    mutations <- read.delim(maf_file, stringsAsFactors = FALSE, comment.char = "#", nrows = 10)
    cat("Columns:", paste(head(names(mutations), 10), collapse = ", "), "\n")
    cat("File looks valid!\n")
  }
}, error = function(e) {
  cat("Direct download failed:", e$message, "\n")
})

# Alternative: try the supplementary files location
alt_urls <- c(
  "https://gdc.cancer.gov/files/public/file/MAF_NCICCR-DLBCL_phs001444.txt",
  "https://api.gdc.cancer.gov/publication/files/MAF_NCICCR-DLBCL_phs001444.txt",
  "https://gdc-hub.s3.us-east-1.amazonaws.com/DLBCL-2018/MAF_NCICCR-DLBCL_phs001444.txt"
)

for (url in alt_urls) {
  if (!file.exists(maf_file) || file.info(maf_file)$size < 1000) {
    cat("\nTrying:", url, "\n")
    tryCatch({
      download.file(url, maf_file, mode = "wb", quiet = TRUE)
      size <- file.info(maf_file)$size
      if (size > 1000) {
        cat("Success! Size:", round(size/1024/1024, 2), "MB\n")
        break
      }
    }, error = function(e) {
      cat("Failed\n")
    })
  }
}

# Check if we have the file
if (file.exists(maf_file) && file.info(maf_file)$size > 10000) {
  cat("\n=== MAF File Downloaded Successfully ===\n")
  cat("Location:", maf_file, "\n")

  # Load and summarize
  mutations <- read.delim(maf_file, stringsAsFactors = FALSE, comment.char = "#")
  cat("Total mutations:", nrow(mutations), "\n")
  cat("Unique samples:", length(unique(mutations$Tumor_Sample_Barcode)), "\n")

  # Check for pathway genes
  retention_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")
  egress_genes <- c("CXCR4", "GNAI2", "RAC2", "ARHGAP25")
  all_pathway_genes <- c(retention_genes, egress_genes)

  pathway_muts <- mutations[mutations$Hugo_Symbol %in% all_pathway_genes, ]
  cat("\nPathway gene mutations:", nrow(pathway_muts), "\n")

  if (nrow(pathway_muts) > 0) {
    cat("By gene:\n")
    print(table(pathway_muts$Hugo_Symbol))
  }

} else {
  cat("\n=== MANUAL DOWNLOAD REQUIRED ===\n")
  cat("The MAF file could not be downloaded automatically.\n\n")
  cat("Please download manually:\n")
  cat("1. Go to: https://gdc.cancer.gov/about-data/publications/DLBCL-2018\n")
  cat("2. Click on 'Supplementary Data Files'\n")
  cat("3. Download: MAF_NCICCR-DLBCL_phs001444.txt\n")
  cat("4. Save to:", raw_dir, "\n")
}
