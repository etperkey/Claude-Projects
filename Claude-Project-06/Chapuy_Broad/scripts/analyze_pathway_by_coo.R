# GC B-cell Positioning Pathway Analysis by Cell of Origin (COO)
# Focus: SNV and CNA frequencies for Retention/Egress pathway genes
# Fixed CNA linkage using Table S1 as bridge

library(dplyr)
library(tidyr)
library(readxl)

chapuy_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Chapuy_Broad"

cat("=============================================================\n")
cat("GC B-cell Positioning Pathway Analysis by COO\n")
cat("=============================================================\n\n")

# ============================================================
# Define Pathway Genes
# ============================================================
retention_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")
egress_genes <- c("CXCR4", "GNAI2", "RAC2", "ARHGAP25")
all_pathway_genes <- c(retention_genes, egress_genes)

cat("Retention pathway (Loss-of-Function):\n")
cat("  ", paste(retention_genes, collapse = ", "), "\n")
cat("\nEgress pathway (Gain-of-Function):\n")
cat("  ", paste(egress_genes, collapse = ", "), "\n\n")

# ============================================================
# Load Integrated Dataset
# ============================================================
cat("=== Loading Data ===\n")

integrated <- read.csv(file.path(chapuy_dir, "data/processed/chapuy_integrated_135.csv"))
cat(sprintf("Integrated dataset: %d patients\n", nrow(integrated)))

# Filter to patients with COO classification
coo_data <- integrated %>% filter(!is.na(ANY_COO) & ANY_COO != "")
cat(sprintf("With COO classification: %d patients\n", nrow(coo_data)))
cat("\nCOO distribution:\n")
print(table(coo_data$ANY_COO))

# ============================================================
# Load Table S1 for ID Linkage
# ============================================================
cat("\n=== Loading Table S1 for ID Linkage ===\n")

table_s1 <- read_excel(
  file.path(chapuy_dir, "data/raw/chapuy_supplementary_tables.xlsx"),
  sheet = "data", skip = 1
)
cat(sprintf("Table S1 patients: %d\n", nrow(table_s1)))
cat(sprintf("Columns: %s\n", paste(names(table_s1)[1:10], collapse = ", ")))

# ============================================================
# Load and Process Mutation Data
# ============================================================
cat("\n=== Processing SNV Data ===\n")

mutations <- read.csv(file.path(chapuy_dir, "data/processed/chapuy_mutations_135.csv"))
cat(sprintf("Total mutations: %d\n", nrow(mutations)))

# Filter for pathway genes
pathway_muts <- mutations %>%
  filter(Hugo_Symbol %in% all_pathway_genes)
cat(sprintf("Pathway gene mutations: %d\n", nrow(pathway_muts)))

# Create patient-level SNV matrix
snv_by_patient <- pathway_muts %>%
  select(Tumor_Sample_Barcode, Hugo_Symbol) %>%
  distinct() %>%
  mutate(has_mutation = 1L) %>%
  pivot_wider(
    id_cols = Tumor_Sample_Barcode,
    names_from = Hugo_Symbol,
    values_from = has_mutation,
    values_fill = list(has_mutation = 0L),
    names_prefix = "SNV_"
  )

# Merge with COO data
coo_snv <- coo_data %>%
  left_join(snv_by_patient, by = c("PATIENT_ID" = "Tumor_Sample_Barcode"))

# Fill NAs with 0 for SNV columns
snv_cols <- grep("^SNV_", names(coo_snv), value = TRUE)
for (col in snv_cols) {
  coo_snv[[col]][is.na(coo_snv[[col]])] <- 0
}

# Add missing SNV columns
for (gene in all_pathway_genes) {
  col_name <- paste0("SNV_", gene)
  if (!col_name %in% names(coo_snv)) {
    coo_snv[[col_name]] <- 0
  }
}

# ============================================================
# Load and Process CNA Data with Proper Linkage
# ============================================================
cat("\n=== Processing CNA Data (with Table S1 linkage) ===\n")

# Load GISTIC data
cna_raw <- read_excel(
  file.path(chapuy_dir, "data/raw/chapuy_supp_table6.xlsx"),
  sheet = "a) List of significant SCNAs"
)

# Parse structure
cna_header <- as.character(cna_raw[1, ])
cna_data <- cna_raw[-1, ]
cna_regions <- as.character(cna_data[[1]])

# Get CNA sample IDs (columns 7+)
cna_sample_ids <- cna_header[7:length(cna_header)]
cat(sprintf("CNA samples in GISTIC: %d\n", length(cna_sample_ids)))

# Show some CNA sample ID examples
cat("CNA ID examples:\n")
print(head(cna_sample_ids, 10))

# Relevant CNA regions
cna_mapping <- list(
  "S1PR2" = "19P13.2:DEL",
  "RHOA" = "3P21.31:DEL",
  "ARHGEF1" = "19Q13.32:DEL"
)

# Create CNA matrix
cna_matrix <- data.frame(cna_id = cna_sample_ids, stringsAsFactors = FALSE)

for (gene in names(cna_mapping)) {
  region <- cna_mapping[[gene]]
  col_name <- paste0("CNA_", gene)

  if (region %in% cna_regions) {
    row_idx <- which(cna_regions == region)
    values <- as.numeric(cna_data[row_idx, 7:ncol(cna_data)])
    values[is.na(values)] <- 0
    cna_matrix[[col_name]] <- values
    n_del <- sum(values == 1)
    cat(sprintf("  %s (%s): %d deletions (%.1f%%)\n",
                gene, region, n_del, n_del/length(values)*100))
  } else {
    cna_matrix[[col_name]] <- 0
  }
}

# ============================================================
# Create ID Linkage via Table S1
# ============================================================
cat("\n=== Creating ID Linkage ===\n")

# Normalize function for matching
normalize_for_match <- function(x) {
  x <- toupper(x)
  x <- gsub("-", "_", x)
  x <- gsub("_NULLPAIR$", "", x)
  x <- gsub("_DT$", "", x)
  x <- gsub("_TP_NB_.*$", "", x)
  return(x)
}

# Normalize CNA IDs
cna_matrix$norm_cna_id <- sapply(cna_matrix$cna_id, normalize_for_match)

# Create lookup from Table S1
# pair_id links to CNA, individual_id links to our PATIENT_ID
table_s1$norm_pair <- sapply(table_s1$pair_id, normalize_for_match)
table_s1$norm_ind <- sapply(table_s1$individual_id, normalize_for_match)

# Also normalize our PATIENT_IDs
coo_snv$norm_patient <- sapply(coo_snv$PATIENT_ID, normalize_for_match)

# Show examples
cat("\nID format examples:\n")
cat("  PATIENT_ID examples: ", paste(head(coo_snv$PATIENT_ID, 3), collapse = ", "), "\n")
cat("  Normalized: ", paste(head(coo_snv$norm_patient, 3), collapse = ", "), "\n")
cat("  Table S1 individual_id: ", paste(head(table_s1$individual_id, 3), collapse = ", "), "\n")
cat("  Table S1 pair_id: ", paste(head(table_s1$pair_id, 3), collapse = ", "), "\n")

# Step 1: Link PATIENT_ID to Table S1 individual_id
s1_lookup <- table_s1 %>%
  select(individual_id, pair_id, norm_ind, norm_pair) %>%
  distinct()

coo_linked <- coo_snv %>%
  left_join(s1_lookup, by = c("norm_patient" = "norm_ind"))

matched_s1 <- sum(!is.na(coo_linked$pair_id))
cat(sprintf("\nPatients matched to Table S1: %d/%d\n", matched_s1, nrow(coo_linked)))

# Step 2: Link pair_id to CNA data
coo_linked$norm_pair[is.na(coo_linked$norm_pair)] <- coo_linked$norm_patient[is.na(coo_linked$norm_pair)]

cna_cols <- grep("^CNA_", names(cna_matrix), value = TRUE)
coo_full <- coo_linked %>%
  left_join(cna_matrix[, c("norm_cna_id", cna_cols)], by = c("norm_pair" = "norm_cna_id"))

matched_cna <- sum(!is.na(coo_full$CNA_S1PR2) &
                   (coo_full$CNA_S1PR2 > 0 | coo_full$CNA_RHOA > 0 | coo_full$CNA_ARHGEF1 > 0))
cat(sprintf("Patients with any CNA deletion: %d\n", matched_cna))

# Check if CNA columns have any non-NA values
cna_matched <- sum(!is.na(coo_full$CNA_S1PR2))
cat(sprintf("Patients with CNA data linked: %d/%d\n", cna_matched, nrow(coo_full)))

# If still not matching, try direct match on norm_patient
if (cna_matched < 50) {
  cat("\nTrying alternative matching strategy...\n")

  coo_full2 <- coo_snv %>%
    left_join(cna_matrix[, c("norm_cna_id", cna_cols)], by = c("norm_patient" = "norm_cna_id"))

  cna_matched2 <- sum(!is.na(coo_full2$CNA_S1PR2))
  cat(sprintf("Direct match result: %d/%d\n", cna_matched2, nrow(coo_full2)))

  if (cna_matched2 > cna_matched) {
    coo_full <- coo_full2
    cna_matched <- cna_matched2
  }
}

# Fill NAs with 0 for CNA columns
for (col in cna_cols) {
  if (col %in% names(coo_full)) {
    coo_full[[col]][is.na(coo_full[[col]])] <- 0
  } else {
    coo_full[[col]] <- 0
  }
}

# Add CNA columns for genes without GISTIC regions
for (gene in all_pathway_genes) {
  col_name <- paste0("CNA_", gene)
  if (!col_name %in% names(coo_full)) {
    coo_full[[col_name]] <- 0
  }
}

# ============================================================
# Calculate Frequencies by COO
# ============================================================
cat("\n=== Calculating Frequencies by COO ===\n")

calc_freq <- function(data, col) {
  n <- sum(data[[col]] == 1, na.rm = TRUE)
  pct <- n / nrow(data) * 100
  return(c(n = n, pct = pct))
}

coo_types <- c("GCB", "ABC", "Unclassified")

# SNV frequencies
cat("\n--- SNV Frequencies by COO ---\n")
snv_freq_table <- data.frame(Gene = all_pathway_genes, stringsAsFactors = FALSE)

for (coo in coo_types) {
  coo_subset <- coo_full %>% filter(ANY_COO == coo)
  n_coo <- nrow(coo_subset)

  freq_col <- paste0(coo, "_n")
  pct_col <- paste0(coo, "_pct")

  snv_freq_table[[freq_col]] <- NA
  snv_freq_table[[pct_col]] <- NA

  for (i in seq_along(all_pathway_genes)) {
    gene <- all_pathway_genes[i]
    col_name <- paste0("SNV_", gene)
    if (col_name %in% names(coo_subset)) {
      freq <- calc_freq(coo_subset, col_name)
      snv_freq_table[[freq_col]][i] <- freq["n"]
      snv_freq_table[[pct_col]][i] <- freq["pct"]
    }
  }
}

snv_freq_table$Pathway <- ifelse(snv_freq_table$Gene %in% retention_genes,
                                  "Retention (LoF)", "Egress (GoF)")

# CNA frequencies
cat("\n--- CNA Frequencies by COO ---\n")
cna_genes <- c("S1PR2", "RHOA", "ARHGEF1")
cna_freq_table <- data.frame(
  Gene = cna_genes,
  Cytoband = c("19p13.2:DEL", "3p21.31:DEL", "19q13.32:DEL"),
  stringsAsFactors = FALSE
)

for (coo in coo_types) {
  coo_subset <- coo_full %>% filter(ANY_COO == coo)
  n_coo <- nrow(coo_subset)

  freq_col <- paste0(coo, "_n")
  pct_col <- paste0(coo, "_pct")

  cna_freq_table[[freq_col]] <- NA
  cna_freq_table[[pct_col]] <- NA

  for (i in seq_along(cna_genes)) {
    gene <- cna_genes[i]
    col_name <- paste0("CNA_", gene)
    freq <- calc_freq(coo_subset, col_name)
    cna_freq_table[[freq_col]][i] <- freq["n"]
    cna_freq_table[[pct_col]][i] <- freq["pct"]
  }
}

# ============================================================
# Create Combined Scores (SNV OR CNA)
# ============================================================
cat("\n=== Calculating Combined Pathway Scores ===\n")

for (gene in all_pathway_genes) {
  snv_col <- paste0("SNV_", gene)
  cna_col <- paste0("CNA_", gene)
  combined_col <- paste0("HIT_", gene)

  if (cna_col %in% names(coo_full)) {
    coo_full[[combined_col]] <- pmax(coo_full[[snv_col]], coo_full[[cna_col]], na.rm = TRUE)
  } else {
    coo_full[[combined_col]] <- coo_full[[snv_col]]
  }
}

coo_full$Retention_Score <- rowSums(coo_full[, paste0("HIT_", retention_genes)], na.rm = TRUE)
coo_full$Egress_Score <- rowSums(coo_full[, paste0("HIT_", egress_genes)], na.rm = TRUE)

coo_full$Pathway_Status <- case_when(
  coo_full$Retention_Score > 0 & coo_full$Egress_Score > 0 ~ "Both",
  coo_full$Retention_Score > 0 & coo_full$Egress_Score == 0 ~ "Retention Only",
  coo_full$Retention_Score == 0 & coo_full$Egress_Score > 0 ~ "Egress Only",
  TRUE ~ "Neither"
)

coo_full$Pathway_Status <- factor(coo_full$Pathway_Status,
                                   levels = c("Retention Only", "Egress Only", "Both", "Neither"))

# ============================================================
# Save Results
# ============================================================
cat("\n=== Saving Results ===\n")

write.csv(snv_freq_table,
          file.path(chapuy_dir, "data/processed/pathway_snv_freq_by_coo.csv"),
          row.names = FALSE)

write.csv(cna_freq_table,
          file.path(chapuy_dir, "data/processed/pathway_cna_freq_by_coo.csv"),
          row.names = FALSE)

pathway_summary <- coo_full %>%
  select(PATIENT_ID, ANY_COO, CLUSTER,
         starts_with("SNV_"), starts_with("CNA_"), starts_with("HIT_"),
         Retention_Score, Egress_Score, Pathway_Status)

write.csv(pathway_summary,
          file.path(chapuy_dir, "data/processed/pathway_status_by_patient.csv"),
          row.names = FALSE)

cat("Saved all results.\n")

# ============================================================
# Print Final Summary Tables
# ============================================================
cat("\n")
cat("=============================================================\n")
cat("FINAL SUMMARY TABLES\n")
cat("=============================================================\n")

# Table 1: SNV Frequencies
cat("\nTABLE 1: SNV Mutation Frequencies by COO\n")
cat(strrep("-", 70), "\n")
cat(sprintf("%-10s %-15s %12s %12s %15s\n",
            "Gene", "Pathway", "GCB (n=41)", "ABC (n=48)", "Unclass (n=13)"))
cat(strrep("-", 70), "\n")

for (i in 1:nrow(snv_freq_table)) {
  cat(sprintf("%-10s %-15s %5.0f (%4.1f%%) %5.0f (%4.1f%%) %5.0f (%5.1f%%)\n",
              snv_freq_table$Gene[i],
              snv_freq_table$Pathway[i],
              snv_freq_table$GCB_n[i], snv_freq_table$GCB_pct[i],
              snv_freq_table$ABC_n[i], snv_freq_table$ABC_pct[i],
              snv_freq_table$Unclassified_n[i], snv_freq_table$Unclassified_pct[i]))
}

# Table 2: CNA Frequencies
cat("\n\nTABLE 2: CNA (Deletion) Frequencies by COO\n")
cat(strrep("-", 75), "\n")
cat(sprintf("%-10s %-15s %12s %12s %15s\n",
            "Gene", "Cytoband", "GCB (n=41)", "ABC (n=48)", "Unclass (n=13)"))
cat(strrep("-", 75), "\n")

for (i in 1:nrow(cna_freq_table)) {
  cat(sprintf("%-10s %-15s %5.0f (%4.1f%%) %5.0f (%4.1f%%) %5.0f (%5.1f%%)\n",
              cna_freq_table$Gene[i],
              cna_freq_table$Cytoband[i],
              cna_freq_table$GCB_n[i], cna_freq_table$GCB_pct[i],
              cna_freq_table$ABC_n[i], cna_freq_table$ABC_pct[i],
              cna_freq_table$Unclassified_n[i], cna_freq_table$Unclassified_pct[i]))
}

# Table 3: Pathway Status Summary
cat("\n\nTABLE 3: Pathway Alteration Status by COO (SNV + CNA Combined)\n")
cat(strrep("-", 70), "\n")
cat(sprintf("%-20s %12s %12s %15s\n",
            "Status", "GCB (n=41)", "ABC (n=48)", "Unclass (n=13)"))
cat(strrep("-", 70), "\n")

status_levels <- c("Retention Only", "Egress Only", "Both", "Neither")
for (status in status_levels) {
  gcb_n <- sum(coo_full$ANY_COO == "GCB" & coo_full$Pathway_Status == status)
  abc_n <- sum(coo_full$ANY_COO == "ABC" & coo_full$Pathway_Status == status)
  unc_n <- sum(coo_full$ANY_COO == "Unclassified" & coo_full$Pathway_Status == status)

  gcb_pct <- gcb_n / sum(coo_full$ANY_COO == "GCB") * 100
  abc_pct <- abc_n / sum(coo_full$ANY_COO == "ABC") * 100
  unc_pct <- unc_n / sum(coo_full$ANY_COO == "Unclassified") * 100

  cat(sprintf("%-20s %5d (%4.1f%%) %5d (%4.1f%%) %5d (%5.1f%%)\n",
              status, gcb_n, gcb_pct, abc_n, abc_pct, unc_n, unc_pct))
}
cat(strrep("-", 70), "\n")

# Any pathway alteration
cat("\nAny Pathway Hit (SNV or CNA):\n")
for (coo in coo_types) {
  coo_subset <- coo_full %>% filter(ANY_COO == coo)
  any_hit <- sum(coo_subset$Pathway_Status != "Neither")
  pct <- any_hit / nrow(coo_subset) * 100
  cat(sprintf("  %s: %d/%d (%.1f%%)\n", coo, any_hit, nrow(coo_subset), pct))
}

# CNA contribution
cat("\nCNA Contribution (patients with CNA but no SNV in same gene):\n")
for (gene in cna_genes) {
  snv_col <- paste0("SNV_", gene)
  cna_col <- paste0("CNA_", gene)
  cna_only <- sum(coo_full[[cna_col]] == 1 & coo_full[[snv_col]] == 0, na.rm = TRUE)
  cat(sprintf("  %s: %d additional patients from CNA\n", gene, cna_only))
}
