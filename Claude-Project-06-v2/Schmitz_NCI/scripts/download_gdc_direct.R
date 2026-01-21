# =============================================================================
# Download Schmitz/NCI DLBCL Data - Direct GDC API Method
# =============================================================================

cat("=============================================================\n")
cat("Schmitz/NCI DLBCL Data Download - Direct GDC API\n")
cat("=============================================================\n\n")

if (!require("jsonlite", quietly = TRUE)) install.packages("jsonlite")
if (!require("httr", quietly = TRUE)) install.packages("httr")

library(jsonlite)
library(httr)

# Set directories
schmitz_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Schmitz_NCI"
raw_dir <- file.path(schmitz_dir, "data/raw")
processed_dir <- file.path(schmitz_dir, "data/processed")

dir.create(raw_dir, recursive = TRUE, showWarnings = FALSE)
dir.create(processed_dir, recursive = TRUE, showWarnings = FALSE)

# -----------------------------------------------------------------------------
# STEP 1: Download Clinical Data via GDC API
# -----------------------------------------------------------------------------

cat("--- Downloading Clinical Data via GDC API ---\n")

# Use the cases endpoint with expanded fields
clinical_endpoint <- "https://api.gdc.cancer.gov/cases"

clinical_query <- list(
  filters = toJSON(list(
    op = "=",
    content = list(
      field = "project.project_id",
      value = "NCICCR-DLBCL"
    )
  ), auto_unbox = TRUE),
  expand = "demographic,diagnoses",
  size = 1000,
  format = "JSON"
)

cat("Querying GDC API for clinical data...\n")
response <- GET(clinical_endpoint, query = clinical_query)

if (status_code(response) == 200) {
  result <- fromJSON(content(response, "text", encoding = "UTF-8"), flatten = TRUE)
  cases <- result$data$hits

  cat("Retrieved", nrow(cases), "cases\n")
  cat("Available columns:", paste(head(names(cases), 20), collapse = ", "), "...\n\n")

  # Build clinical data frame from flattened data
  clinical_flat <- data.frame(
    case_id = cases$case_id,
    submitter_id = cases$submitter_id,
    stringsAsFactors = FALSE
  )

  # Add demographic fields if present
  demo_cols <- grep("^demographic\\.", names(cases), value = TRUE)
  for (col in demo_cols) {
    new_col <- gsub("demographic\\.", "", col)
    clinical_flat[[new_col]] <- cases[[col]]
  }

  # For diagnoses (list column), extract first diagnosis
  if ("diagnoses" %in% names(cases)) {
    diag_list <- cases$diagnoses
    clinical_flat$age_at_diagnosis <- sapply(diag_list, function(x) {
      if (is.null(x) || nrow(x) == 0) NA else x$age_at_diagnosis[1]
    })
    clinical_flat$days_to_last_follow_up <- sapply(diag_list, function(x) {
      if (is.null(x) || nrow(x) == 0) NA else x$days_to_last_follow_up[1]
    })
    clinical_flat$primary_diagnosis <- sapply(diag_list, function(x) {
      if (is.null(x) || nrow(x) == 0) NA else x$primary_diagnosis[1]
    })
  }

  # Calculate OS
  clinical_flat$days_to_death <- as.numeric(clinical_flat$days_to_death)
  clinical_flat$days_to_last_follow_up <- as.numeric(clinical_flat$days_to_last_follow_up)

  clinical_flat$OS_Days <- ifelse(!is.na(clinical_flat$days_to_death),
                                   clinical_flat$days_to_death,
                                   clinical_flat$days_to_last_follow_up)
  clinical_flat$OS_Months <- clinical_flat$OS_Days / 30.44
  clinical_flat$OS_Death <- as.integer(clinical_flat$vital_status == "Dead")

  # Save
  write.csv(clinical_flat, file.path(processed_dir, "nci_clinical.csv"), row.names = FALSE)
  cat("Saved: nci_clinical.csv\n")

  cat("\nClinical data summary:\n")
  cat("  Total patients:", nrow(clinical_flat), "\n")
  cat("  With survival data:", sum(!is.na(clinical_flat$OS_Days)), "\n")
  cat("  Deaths:", sum(clinical_flat$OS_Death, na.rm = TRUE), "\n")
  cat("  Vital status breakdown:\n")
  print(table(clinical_flat$vital_status, useNA = "ifany"))

} else {
  cat("Error fetching clinical data:", status_code(response), "\n")
  stop("Cannot continue without clinical data")
}

# -----------------------------------------------------------------------------
# STEP 2: Download MAF File
# -----------------------------------------------------------------------------

cat("\n--- Getting MAF File Information ---\n")

files_endpoint <- "https://api.gdc.cancer.gov/files"

maf_query <- list(
  filters = toJSON(list(
    op = "and",
    content = list(
      list(op = "=", content = list(field = "cases.project.project_id", value = "NCICCR-DLBCL")),
      list(op = "=", content = list(field = "data_category", value = "Simple Nucleotide Variation")),
      list(op = "=", content = list(field = "access", value = "open"))
    )
  ), auto_unbox = TRUE),
  fields = "file_id,file_name,file_size,data_type",
  size = 100,
  format = "JSON"
)

response <- GET(files_endpoint, query = maf_query)

if (status_code(response) == 200) {
  files_data <- fromJSON(content(response, "text", encoding = "UTF-8"))
  maf_files <- files_data$data$hits

  n_files <- if(is.null(maf_files) || length(maf_files) == 0) 0 else nrow(maf_files)
  cat("Found", n_files, "MAF file(s)\n")

  if (n_files > 0) {
    # Download MAF file
    file_id <- maf_files$file_id[1]
    file_name <- maf_files$file_name[1]
    size_mb <- round(maf_files$file_size[1] / 1024 / 1024, 1)

    cat(sprintf("Downloading: %s (%.1f MB)...\n", file_name, size_mb))

    download_url <- paste0("https://api.gdc.cancer.gov/data/", file_id)
    maf_file <- file.path(raw_dir, file_name)

    download.file(download_url, maf_file, mode = "wb", quiet = TRUE)
    cat("Downloaded to:", maf_file, "\n")

    # Decompress if gzipped
    if (grepl("\\.gz$", maf_file)) {
      cat("Decompressing...\n")
      # Use R.utils if available, otherwise system gunzip
      if (require("R.utils", quietly = TRUE)) {
        R.utils::gunzip(maf_file, remove = FALSE, overwrite = TRUE)
      } else {
        # Try base R approach
        con <- gzfile(maf_file, "rt")
        maf_content <- readLines(con, warn = FALSE)
        close(con)
        maf_file_out <- gsub("\\.gz$", "", maf_file)
        writeLines(maf_content, maf_file_out)
        maf_file <- maf_file_out
      }
      maf_file <- gsub("\\.gz$", "", maf_file)
    }

    # Read MAF file
    cat("Reading MAF file...\n")
    mutations <- read.delim(maf_file, stringsAsFactors = FALSE, comment.char = "#")

    cat("Loaded", nrow(mutations), "mutations from", length(unique(mutations$Tumor_Sample_Barcode)), "samples\n")

    # Save
    write.csv(mutations, file.path(processed_dir, "nci_mutations_full.csv"), row.names = FALSE)
    cat("Saved: nci_mutations_full.csv\n")

    # -----------------------------------------------------------------------------
    # STEP 3: Filter for Pathway Genes
    # -----------------------------------------------------------------------------

    cat("\n--- Filtering for Pathway Genes ---\n")

    retention_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")
    egress_genes <- c("CXCR4", "GNAI2", "RAC2", "ARHGAP25")
    all_pathway_genes <- c(retention_genes, egress_genes)

    pathway_muts <- mutations[mutations$Hugo_Symbol %in% all_pathway_genes, ]
    cat("Pathway mutations found:", nrow(pathway_muts), "\n")

    if (nrow(pathway_muts) > 0) {
      cat("\nMutations by gene:\n")
      gene_table <- table(pathway_muts$Hugo_Symbol)
      for (gene in all_pathway_genes) {
        n <- ifelse(gene %in% names(gene_table), gene_table[gene], 0)
        pathway <- ifelse(gene %in% retention_genes, "Retention", "Egress")
        cat(sprintf("  %-10s (%s): %d\n", gene, pathway, n))
      }

      # Filter for non-silent
      silent_types <- c("Silent", "Intron", "IGR", "3'UTR", "5'UTR", "RNA")
      pathway_nonsilent <- pathway_muts[!pathway_muts$Variant_Classification %in% silent_types, ]
      cat("\nNon-silent pathway mutations:", nrow(pathway_nonsilent), "\n")

      write.csv(pathway_nonsilent, file.path(processed_dir, "nci_pathway_mutations.csv"), row.names = FALSE)
      cat("Saved: nci_pathway_mutations.csv\n")
    }
  }
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

cat("\n=============================================================\n")
cat("DOWNLOAD COMPLETE\n")
cat("=============================================================\n")
cat("\nFiles saved to:", processed_dir, "\n")
cat("  - nci_clinical.csv\n")
cat("  - nci_mutations_full.csv\n")
cat("  - nci_pathway_mutations.csv\n")
cat("\n*** NEXT STEP: Need genetic subtype data from NEJM supplementary ***\n")
cat("URL: https://www.nejm.org/doi/suppl/10.1056/NEJMoa1801445\n")
