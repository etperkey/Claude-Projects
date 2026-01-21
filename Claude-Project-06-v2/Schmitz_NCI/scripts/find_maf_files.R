# Find and download MAF files from GDC for NCICCR-DLBCL
library(jsonlite)
library(httr)

cat("=== Searching for all available mutation files ===\n\n")

# Try multiple search strategies
files_endpoint <- "https://api.gdc.cancer.gov/files"

# Strategy 1: Search by project without data_type filter
cat("Strategy 1: All files in NCICCR-DLBCL project...\n")
query1 <- list(
  filters = toJSON(list(
    op = "=",
    content = list(field = "cases.project.project_id", value = "NCICCR-DLBCL")
  ), auto_unbox = TRUE),
  fields = "file_id,file_name,file_size,data_type,data_category,access,data_format",
  size = 500,
  format = "JSON"
)

resp1 <- GET(files_endpoint, query = query1)
if (status_code(resp1) == 200) {
  data1 <- fromJSON(content(resp1, "text", encoding = "UTF-8"))
  files1 <- data1$data$hits
  cat("Total files found:", nrow(files1), "\n")

  if (!is.null(files1) && nrow(files1) > 0) {
    cat("\nData categories:\n")
    print(table(files1$data_category))

    cat("\nData types:\n")
    print(table(files1$data_type))

    cat("\nAccess levels:\n")
    print(table(files1$access))

    # Look for mutation-related files
    mut_files <- files1[grepl("mutation|maf|snv|variant", files1$data_type, ignore.case = TRUE) |
                        grepl("mutation|maf|snv|variant", files1$file_name, ignore.case = TRUE) |
                        grepl("Simple Nucleotide Variation", files1$data_category, ignore.case = TRUE), ]

    cat("\nMutation-related files:\n")
    if (nrow(mut_files) > 0) {
      print(mut_files[, c("file_name", "data_type", "access", "file_size")])
    } else {
      cat("None found with standard filters\n")
    }

    # Show all open access files
    open_files <- files1[files1$access == "open", ]
    cat("\n\nAll OPEN access files (", nrow(open_files), "):\n")
    if (nrow(open_files) > 0) {
      for (i in 1:min(20, nrow(open_files))) {
        size_mb <- round(open_files$file_size[i] / 1024 / 1024, 2)
        cat(sprintf("  %s (%s, %.2f MB)\n",
                    open_files$file_name[i],
                    open_files$data_type[i],
                    size_mb))
      }
    }
  }
}

# Strategy 2: Search the legacy archive
cat("\n\nStrategy 2: Check GDC Legacy Archive...\n")
legacy_endpoint <- "https://api.gdc.cancer.gov/legacy/files"

query2 <- list(
  filters = toJSON(list(
    op = "=",
    content = list(field = "cases.project.project_id", value = "NCICCR-DLBCL")
  ), auto_unbox = TRUE),
  fields = "file_id,file_name,file_size,data_type,data_category,access",
  size = 100,
  format = "JSON"
)

resp2 <- GET(legacy_endpoint, query = query2)
if (status_code(resp2) == 200) {
  data2 <- fromJSON(content(resp2, "text", encoding = "UTF-8"))
  files2 <- data2$data$hits
  if (!is.null(files2) && length(files2) > 0) {
    cat("Legacy files found:", nrow(files2), "\n")
  } else {
    cat("No legacy files found\n")
  }
}

# Strategy 3: Check publication-specific endpoint
cat("\n\nStrategy 3: Publication data files...\n")
cat("The MAF files for this cohort are available at:\n")
cat("https://gdc.cancer.gov/about-data/publications/DLBCL-2018\n\n")
cat("Files listed on publication page:\n")
cat("  - MAF_NCICCR-DLBCL_phs001444.txt\n")
cat("  - MAF_TCGA-DLBC_phs000178.txt\n")
cat("  - MAF_CTSP-DLBCL1_phs001184.txt\n")

cat("\n\n=== RECOMMENDATION ===\n")
cat("Download the MAF file manually from the GDC publication page:\n")
cat("1. Go to: https://gdc.cancer.gov/about-data/publications/DLBCL-2018\n")
cat("2. Download 'Open-access Manifest' or individual MAF files\n")
cat("3. Place in: Schmitz_NCI/data/raw/\n")
