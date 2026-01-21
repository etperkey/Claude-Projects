# Download MAF from AWS S3 Open Data Registry
# No AWS account needed - public access

library(httr)

cat("=== Attempting AWS S3 Open Data Download ===\n\n")

schmitz_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Schmitz_NCI"
raw_dir <- file.path(schmitz_dir, "data/raw")
processed_dir <- file.path(schmitz_dir, "data/processed")

# S3 bucket info from AWS Open Data Registry
bucket <- "gdc-nciccr-phs001444-2-open"
region <- "us-east-1"
base_url <- paste0("https://", bucket, ".s3.", region, ".amazonaws.com/")

cat("S3 Bucket:", bucket, "\n")
cat("Region:", region, "\n\n")

# List bucket contents (S3 XML listing)
cat("Listing bucket contents...\n")
list_url <- base_url

resp <- GET(list_url)
if (status_code(resp) == 200) {
  content_text <- content(resp, "text", encoding = "UTF-8")

  # Parse XML to find files
  # Look for <Key> tags
  keys <- regmatches(content_text, gregexpr("<Key>[^<]+</Key>", content_text))[[1]]
  keys <- gsub("<Key>|</Key>", "", keys)

  cat("Found", length(keys), "files\n\n")

  if (length(keys) > 0) {
    # Show first 20
    cat("First 20 files:\n")
    for (k in head(keys, 20)) {
      cat("  ", k, "\n")
    }

    # Look for MAF files
    maf_keys <- keys[grepl("\\.maf", keys, ignore.case = TRUE) |
                     grepl("mutation", keys, ignore.case = TRUE) |
                     grepl("somatic", keys, ignore.case = TRUE)]

    if (length(maf_keys) > 0) {
      cat("\nMAF/Mutation files found:\n")
      for (k in maf_keys) {
        cat("  ", k, "\n")
      }

      # Download first MAF file
      maf_key <- maf_keys[1]
      maf_url <- paste0(base_url, maf_key)
      maf_file <- file.path(raw_dir, basename(maf_key))

      cat("\nDownloading:", maf_key, "\n")
      download.file(maf_url, maf_file, mode = "wb", quiet = FALSE)

      cat("Saved to:", maf_file, "\n")
      cat("Size:", round(file.info(maf_file)$size / 1024 / 1024, 2), "MB\n")
    } else {
      cat("\nNo MAF files found in bucket.\n")
      cat("This bucket may only contain RNA-seq data.\n")
    }
  }
} else {
  cat("Failed to list bucket. Status:", status_code(resp), "\n")

  # The bucket might require listing via different method
  # Let's try known file patterns
  cat("\nTrying known file patterns...\n")

  # RNA-seq files are in this bucket based on AWS registry
  # Let's see if there's a manifest
  manifest_url <- paste0(base_url, "manifest.txt")
  cat("Trying manifest:", manifest_url, "\n")

  resp2 <- GET(manifest_url)
  if (status_code(resp2) == 200) {
    cat("Manifest found!\n")
    manifest <- content(resp2, "text", encoding = "UTF-8")
    cat(substr(manifest, 1, 1000), "\n...")
  }
}

cat("\n\n=== SUMMARY ===\n")
cat("The AWS S3 bucket 'gdc-nciccr-phs001444-2-open' contains RNA-seq data.\n")
cat("Mutation (MAF) files require controlled access via dbGaP.\n\n")

cat("OPTIONS TO GET MUTATION DATA:\n")
cat("1. Apply for dbGaP access (phs001444) - takes 2-4 weeks\n")
cat("2. Use cBioPortal if available\n")
cat("3. Use NEJM supplementary tables (aggregated, not per-patient)\n")
