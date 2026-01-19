# =============================================================================
# Download Duke DLBCL Data from cBioPortal API
# Study: dlbcl_duke_2017
# =============================================================================

cat("=============================================================\n")
cat("Duke DLBCL Data Download from cBioPortal API\n")
cat("=============================================================\n\n")

library(httr)
library(jsonlite)

# Set directories
duke_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Duke"
raw_dir <- file.path(duke_dir, "data/raw")
processed_dir <- file.path(duke_dir, "data/processed")

dir.create(raw_dir, recursive = TRUE, showWarnings = FALSE)
dir.create(processed_dir, recursive = TRUE, showWarnings = FALSE)

study_id <- "dlbcl_duke_2017"
base_api <- "https://www.cbioportal.org/api"

# -----------------------------------------------------------------------------
# Get Study Info
# -----------------------------------------------------------------------------

cat("--- Fetching Study Information ---\n\n")

study_url <- paste0(base_api, "/studies/", study_id)
resp <- GET(study_url, add_headers(accept = "application/json"))

if (status_code(resp) == 200) {
  study_info <- fromJSON(content(resp, "text", encoding = "UTF-8"))
  cat("Study:", study_info$name, "\n")
  cat("Description:", substr(study_info$description, 1, 200), "...\n")
  cat("Citation:", study_info$citation, "\n\n")
} else {
  cat("Failed to get study info. Status:", status_code(resp), "\n")
}

# -----------------------------------------------------------------------------
# Get Clinical Data
# -----------------------------------------------------------------------------

cat("--- Fetching Clinical Data ---\n\n")

# Get all clinical data
clinical_url <- paste0(base_api, "/studies/", study_id, "/clinical-data?clinicalDataType=PATIENT")
resp <- GET(clinical_url, add_headers(accept = "application/json"))

if (status_code(resp) == 200) {
  clinical_raw <- fromJSON(content(resp, "text", encoding = "UTF-8"))
  cat("Clinical data points:", nrow(clinical_raw), "\n")

  # Pivot to wide format
  if (nrow(clinical_raw) > 0) {
    # Get unique patients and attributes
    patients <- unique(clinical_raw$patientId)
    attrs <- unique(clinical_raw$clinicalAttributeId)

    cat("Unique patients:", length(patients), "\n")
    cat("Clinical attributes:", length(attrs), "\n")
    cat("Attributes:", paste(head(attrs, 15), collapse = ", "), "...\n\n")

    # Pivot
    clinical_wide <- data.frame(PATIENT_ID = patients, stringsAsFactors = FALSE)
    for (attr in attrs) {
      vals <- clinical_raw[clinical_raw$clinicalAttributeId == attr, c("patientId", "value")]
      names(vals) <- c("PATIENT_ID", attr)
      clinical_wide <- merge(clinical_wide, vals, by = "PATIENT_ID", all.x = TRUE)
    }

    cat("Clinical data (wide format):", nrow(clinical_wide), "patients,", ncol(clinical_wide), "columns\n")

    # Save
    write.csv(clinical_wide, file.path(raw_dir, "data_clinical_patient.csv"), row.names = FALSE)
    cat("Saved: data_clinical_patient.csv\n")

    # Check survival columns
    os_cols <- grep("OS|SURVIVAL|STATUS|MONTHS", names(clinical_wide), ignore.case = TRUE, value = TRUE)
    cat("\nSurvival columns found:", paste(os_cols, collapse = ", "), "\n")

    if ("OS_STATUS" %in% names(clinical_wide)) {
      cat("\nOS_STATUS breakdown:\n")
      print(table(clinical_wide$OS_STATUS, useNA = "ifany"))
    }

    # Check subtype columns
    subtype_cols <- grep("COO|SUBTYPE|ABC|GCB|TYPE", names(clinical_wide), ignore.case = TRUE, value = TRUE)
    cat("\nSubtype columns found:", paste(subtype_cols, collapse = ", "), "\n")

    for (col in subtype_cols) {
      cat("\n", col, ":\n")
      print(table(clinical_wide[[col]], useNA = "ifany"))
    }
  }
} else {
  cat("Failed to get clinical data. Status:", status_code(resp), "\n")
}

# -----------------------------------------------------------------------------
# Get Sample Data
# -----------------------------------------------------------------------------

cat("\n--- Fetching Sample Data ---\n\n")

sample_url <- paste0(base_api, "/studies/", study_id, "/clinical-data?clinicalDataType=SAMPLE")
resp <- GET(sample_url, add_headers(accept = "application/json"))

if (status_code(resp) == 200) {
  sample_raw <- fromJSON(content(resp, "text", encoding = "UTF-8"))
  cat("Sample data points:", nrow(sample_raw), "\n")

  if (nrow(sample_raw) > 0) {
    samples <- unique(sample_raw$sampleId)
    cat("Unique samples:", length(samples), "\n")
  }
}

# -----------------------------------------------------------------------------
# Get Mutation Data
# -----------------------------------------------------------------------------

cat("\n--- Fetching Mutation Data ---\n\n")

# Get molecular profiles
profiles_url <- paste0(base_api, "/studies/", study_id, "/molecular-profiles")
resp <- GET(profiles_url, add_headers(accept = "application/json"))

if (status_code(resp) == 200) {
  profiles <- fromJSON(content(resp, "text", encoding = "UTF-8"))
  cat("Molecular profiles available:\n")
  print(profiles[, c("molecularProfileId", "name", "molecularAlterationType")])

  # Find mutation profile
  mut_profile <- profiles$molecularProfileId[profiles$molecularAlterationType == "MUTATION_EXTENDED"]

  if (length(mut_profile) > 0) {
    mut_profile <- mut_profile[1]
    cat("\nUsing mutation profile:", mut_profile, "\n")

    # Get all samples in study
    samples_url <- paste0(base_api, "/studies/", study_id, "/samples")
    resp <- GET(samples_url, add_headers(accept = "application/json"))
    samples <- fromJSON(content(resp, "text", encoding = "UTF-8"))
    sample_ids <- samples$sampleId

    cat("Total samples:", length(sample_ids), "\n")

    # Fetch mutations - need to get all genes first, then filter
    # Use the genes endpoint to get pathway gene IDs
    cat("Looking up pathway gene Entrez IDs...\n")

    retention_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")
    egress_genes <- c("CXCR4", "GNAI2", "RAC2", "ARHGAP25")
    all_pathway_genes <- c(retention_genes, egress_genes)

    # Get gene info - using geneIdType=HUGO_GENE_SYMBOL
    genes_url <- paste0(base_api, "/genes/fetch?geneIdType=HUGO_GENE_SYMBOL")
    gene_body <- toJSON(all_pathway_genes)

    cat("Gene lookup URL:", genes_url, "\n")
    cat("Gene body:", gene_body, "\n")

    gene_resp <- POST(
      genes_url,
      body = gene_body,
      add_headers("Content-Type" = "application/json", "accept" = "application/json"),
      encode = "raw"
    )

    cat("Gene lookup status:", status_code(gene_resp), "\n")

    if (status_code(gene_resp) == 200) {
      gene_text <- content(gene_resp, "text", encoding = "UTF-8")
      gene_info <- fromJSON(gene_text)
      cat("Found", nrow(gene_info), "pathway genes\n")
      cat("Gene info columns:", paste(names(gene_info), collapse = ", "), "\n")

      # Debug: show the structure
      if (nrow(gene_info) > 0) {
        print(gene_info[, c("hugoGeneSymbol", "entrezGeneId")])
      }

      entrez_ids <- gene_info$entrezGeneId
      cat("Entrez IDs:", paste(entrez_ids, collapse = ", "), "\n")

      # Now fetch mutations for these genes
      mutations_url <- paste0(base_api, "/molecular-profiles/", mut_profile, "/mutations/fetch")

      # Build JSON body manually to ensure proper array formatting
      # The API requires sampleListId OR sampleIds, and entrezGeneIds
      body_json <- sprintf(
        '{"sampleIds":%s,"entrezGeneIds":%s}',
        toJSON(as.character(sample_ids)),
        toJSON(as.integer(entrez_ids))
      )

      cat("Fetching pathway gene mutations...\n")
      cat("Request URL:", mutations_url, "\n")

      resp <- POST(
        mutations_url,
        body = body_json,
        add_headers(
          "Content-Type" = "application/json",
          "accept" = "application/json"
        ),
        encode = "raw"
      )

      if (status_code(resp) == 200) {
        mutations <- fromJSON(content(resp, "text", encoding = "UTF-8"))
        cat("Pathway mutations loaded:", nrow(mutations), "\n")

        if (!is.null(mutations) && nrow(mutations) > 0) {
          cat("Unique samples with mutations:", length(unique(mutations$sampleId)), "\n")

          # Debug: show column names
          cat("\nMutation columns:", paste(names(mutations), collapse = ", "), "\n")

          # Map entrezGeneId back to Hugo symbols using our gene_info lookup
          entrez_to_hugo <- setNames(gene_info$hugoGeneSymbol, as.character(gene_info$entrezGeneId))
          mutations$Hugo_Symbol <- entrez_to_hugo[as.character(mutations$entrezGeneId)]

          cat("Mapped", sum(!is.na(mutations$Hugo_Symbol)), "mutations to Hugo symbols\n")

          mutations$Tumor_Sample_Barcode <- mutations$sampleId
          mutations$Variant_Classification <- mutations$mutationType
          if ("proteinChange" %in% names(mutations)) {
            mutations$HGVSp_Short <- mutations$proteinChange
          } else {
            mutations$HGVSp_Short <- NA
          }

          # Save pathway mutations with available columns
          keep_cols <- c("Hugo_Symbol", "Tumor_Sample_Barcode", "Variant_Classification", "HGVSp_Short")
          keep_cols <- keep_cols[keep_cols %in% names(mutations)]

          mut_save <- mutations[, keep_cols, drop = FALSE]
          write.csv(mut_save, file.path(raw_dir, "data_mutations.csv"), row.names = FALSE)
          cat("Saved: data_mutations.csv\n")

          cat("\nBy gene:\n")
          gene_counts <- table(mutations$Hugo_Symbol)
          for (gene in all_pathway_genes) {
            n <- ifelse(gene %in% names(gene_counts), gene_counts[gene], 0)
            pathway <- ifelse(gene %in% retention_genes, "Retention", "Egress")
            cat(sprintf("  %-10s (%s): %d\n", gene, pathway, n))
          }

          # Save to processed
          write.csv(mut_save, file.path(processed_dir, "duke_pathway_mutations.csv"), row.names = FALSE)
          cat("\nSaved: duke_pathway_mutations.csv\n")
        } else {
          cat("No pathway mutations found in this cohort.\n")
        }
      } else {
        cat("Failed to fetch mutations. Status:", status_code(resp), "\n")
        cat("Response:", content(resp, "text"), "\n")
      }
    } else {
      cat("Failed to lookup gene IDs. Status:", status_code(gene_resp), "\n")
    }
  }
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

cat("\n=============================================================\n")
cat("DOWNLOAD COMPLETE\n")
cat("=============================================================\n")
cat("\nFiles saved to:", raw_dir, "\n")
