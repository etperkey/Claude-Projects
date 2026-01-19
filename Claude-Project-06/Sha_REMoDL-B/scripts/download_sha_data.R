# download_sha_data.R
# Downloads REMoDL-B / HMRN DLBCL data from multiple sources
# Data sources: GEO (GSE117556), GitHub, PMC supplementary materials

# ==============================================================================
# Setup
# ==============================================================================

# Set working directory
sha_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Sha"
raw_dir <- file.path(sha_dir, "data/raw")
processed_dir <- file.path(sha_dir, "data/processed")

# Create directories if needed
dir.create(raw_dir, recursive = TRUE, showWarnings = FALSE)
dir.create(processed_dir, recursive = TRUE, showWarnings = FALSE)

# Install/load required packages
packages <- c("GEOquery", "httr", "jsonlite", "readr", "readxl", "dplyr", "tidyr")
for (pkg in packages) {
  if (!require(pkg, character.only = TRUE, quietly = TRUE)) {
    if (pkg == "GEOquery") {
      if (!requireNamespace("BiocManager", quietly = TRUE))
        install.packages("BiocManager")
      BiocManager::install("GEOquery")
    } else {
      install.packages(pkg)
    }
  }
  library(pkg, character.only = TRUE)
}

# ==============================================================================
# 1. Download Mutation Data from GitHub
# ==============================================================================

cat("\n=== Downloading mutation data from GitHub ===\n")

github_url <- "https://raw.githubusercontent.com/ecsg-uoy/DLBCLGenomicSubtyping/master/data/genomic_data.csv"
mutation_file <- file.path(raw_dir, "genomic_data.csv")

if (!file.exists(mutation_file)) {
  tryCatch({
    download.file(github_url, mutation_file, mode = "wb")
    cat("Downloaded: genomic_data.csv\n")

    # Read and summarize
    mutations <- read_csv(mutation_file, show_col_types = FALSE)
    cat(sprintf("  - %d patients\n", nrow(mutations)))
    cat(sprintf("  - %d genetic features\n", ncol(mutations) - 1))  # Exclude ID column
  }, error = function(e) {
    cat("Error downloading mutation data:", conditionMessage(e), "\n")
  })
} else {
  cat("File already exists: genomic_data.csv\n")
}

# ==============================================================================
# 2. Download Gene Expression Data from GEO (GSE117556)
# ==============================================================================

cat("\n=== Downloading expression data from GEO (GSE117556) ===\n")

geo_expression_file <- file.path(raw_dir, "GSE117556_expression.csv")

if (!file.exists(geo_expression_file)) {
  tryCatch({
    # Option A: Use GEOquery (preferred - gets processed data with phenotype info)
    cat("Fetching GSE117556 via GEOquery...\n")
    cat("(This may take several minutes for large datasets)\n")

    gse <- getGEO("GSE117556", GSEMatrix = TRUE, destdir = raw_dir)

    if (length(gse) > 0) {
      # Extract expression matrix and phenotype data
      eset <- gse[[1]]

      # Save expression matrix
      expr_matrix <- exprs(eset)
      write.csv(expr_matrix, geo_expression_file, row.names = TRUE)
      cat(sprintf("Saved expression data: %d genes x %d samples\n",
                  nrow(expr_matrix), ncol(expr_matrix)))

      # Save phenotype/clinical data from GEO
      pheno_data <- pData(eset)
      pheno_file <- file.path(raw_dir, "GSE117556_phenotype.csv")
      write.csv(pheno_data, pheno_file, row.names = TRUE)
      cat(sprintf("Saved phenotype data: %d samples x %d variables\n",
                  nrow(pheno_data), ncol(pheno_data)))
    }
  }, error = function(e) {
    cat("Error downloading GEO data:", conditionMessage(e), "\n")
    cat("Alternative: Download manually from:\n")
    cat("https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE117556\n")
  })
} else {
  cat("File already exists: GSE117556_expression.csv\n")
}

# ==============================================================================
# 3. Download Supplementary Clinical Data from PMC
# ==============================================================================

cat("\n=== Supplementary Clinical Data (PMC7259825) ===\n")

# Blood 2020 paper supplementary materials
# Unfortunately, PMC supplementary files require manual download
# Provide instructions and direct links

supp_excel <- file.path(raw_dir, "blood-2019-003535-s3.xlsx")

if (!file.exists(supp_excel)) {
  cat("\nSupplementary data requires manual download:\n")
  cat("1. Go to: https://pmc.ncbi.nlm.nih.gov/articles/PMC7259825/\n")
  cat("2. Scroll to 'Supplementary Material' section\n")
  cat("3. Download the Excel file (blood-2019-003535-s3.xlsx, ~1.1MB)\n")
  cat("4. Save to:", raw_dir, "\n")

  # Try direct download (may not work due to PMC restrictions)
  pmc_supp_url <- "https://pmc.ncbi.nlm.nih.gov/articles/PMC7259825/bin/blood-2019-003535-s3.xlsx"

  tryCatch({
    cat("\nAttempting direct download...\n")
    download.file(pmc_supp_url, supp_excel, mode = "wb")
    cat("Downloaded successfully!\n")
  }, error = function(e) {
    cat("Direct download failed. Please download manually.\n")

    # Create placeholder with instructions
    placeholder <- file.path(raw_dir, "DOWNLOAD_INSTRUCTIONS.txt")
    writeLines(c(
      "Supplementary Data Download Instructions",
      "========================================",
      "",
      "Blood 2020 (Lacy et al.) - PMC7259825",
      "--------------------------------------",
      "URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC7259825/",
      "",
      "Supplementary Tables needed:",
      "  Table S1: 293-gene panel list",
      "  Table S2: Single nucleotide variants",
      "  Table S3: Copy number variants",
      "  Table S4: Patient clinical data",
      "  Table S5: Cluster assignments",
      "  Table S6: Outcome data",
      "  Table S7: Cross-cohort comparison",
      "",
      "Download the Excel file (~1.1MB) and save as:",
      "blood-2019-003535-s3.xlsx",
      "",
      "Leukemia 2020 (Cucco et al.) - 70-gene panel",
      "---------------------------------------------",
      "URL: https://www.nature.com/articles/s41375-019-0691-6",
      "",
      "Supplementary Table S1 contains the 70-gene targeted panel list",
      "Download and save as: leukemia_supplementary.xlsx"
    ), placeholder)
    cat("Created: DOWNLOAD_INSTRUCTIONS.txt\n")
  })
} else {
  cat("Supplementary file exists. Processing...\n")

  # Parse the Excel file if it exists
  tryCatch({
    sheets <- excel_sheets(supp_excel)
    cat("Available sheets:", paste(sheets, collapse = ", "), "\n")

    # Read clinical data (typically Table S4)
    for (sheet in sheets) {
      if (grepl("S4|clinical|patient", sheet, ignore.case = TRUE)) {
        clinical <- read_excel(supp_excel, sheet = sheet)
        clinical_file <- file.path(raw_dir, "sha_clinical_patient.csv")
        write_csv(clinical, clinical_file)
        cat(sprintf("Extracted clinical data: %d patients\n", nrow(clinical)))
        break
      }
    }
  }, error = function(e) {
    cat("Error parsing Excel file:", conditionMessage(e), "\n")
  })
}

# ==============================================================================
# 4. Verify Downloaded Data
# ==============================================================================

cat("\n=== Data Download Summary ===\n")

files_expected <- c(
  "genomic_data.csv" = "Mutation data (GitHub)",
  "GSE117556_expression.csv" = "Expression data (GEO)",
  "GSE117556_phenotype.csv" = "Phenotype data (GEO)",
  "blood-2019-003535-s3.xlsx" = "Clinical data (PMC)"
)

for (f in names(files_expected)) {
  path <- file.path(raw_dir, f)
  if (file.exists(path)) {
    size <- file.size(path) / 1024^2
    cat(sprintf("  [OK] %s (%.1f MB)\n", files_expected[f], size))
  } else {
    cat(sprintf("  [--] %s - NOT FOUND\n", files_expected[f]))
  }
}

cat("\n=== Data Sources ===\n")
cat("Expression: https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE117556\n")
cat("Mutations:  https://github.com/ecsg-uoy/DLBCLGenomicSubtyping\n")
cat("Clinical:   https://pmc.ncbi.nlm.nih.gov/articles/PMC7259825/\n")
