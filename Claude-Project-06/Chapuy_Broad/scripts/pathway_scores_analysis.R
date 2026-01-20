# Retention/Egress Pathway Score Analysis
# Creates mutation scores by Global, COO, and Cluster

library(dplyr)
library(tidyr)

chapuy_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Chapuy_Broad"

cat("=============================================================\n")
cat("   RETENTION/EGRESS PATHWAY SCORE ANALYSIS\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. DEFINE PATHWAY GENES
#------------------------------------------------------------------------------
cat("=== Pathway Model ===\n\n")
cat("TRANSCRIPTIONAL CONTROL:\n")
cat("  FOXO1 ──┬──→ ↑S1PR1 expression\n")
cat("  KLF2  ──┘\n\n")
cat("EGRESS (Gαi-coupled):\n")
cat("  S1PR1 ──┬──→ GNAI2 → RAC2 → Egress\n")
cat("  CXCR4 ──┘\n\n")
cat("RETENTION (Gα13-coupled):\n")
cat("  S1PR2 ──┬──→ GNA13 → ARHGEF1 → RHOA → Retention\n")
cat("  P2RY8 ──┘\n\n")

retention_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")
egress_genes <- c("FOXO1", "KLF2", "CXCR4", "GNAI2", "RAC2")
all_pathway_genes <- c(retention_genes, egress_genes)

#------------------------------------------------------------------------------
# 2. LOAD RAW MUTATION DATA
#------------------------------------------------------------------------------
cat("=== Loading Data ===\n")

# Raw mutations
mutations <- read.csv(file.path(chapuy_dir, "data/processed/chapuy_mutations_135.csv"))
cat(sprintf("Total mutations: %d\n", nrow(mutations)))

# Clinical/integrated data
integrated <- read.csv(file.path(chapuy_dir, "data/processed/chapuy_integrated_135.csv"))
cat(sprintf("Patients with clinical data: %d\n", nrow(integrated)))

# Existing pathway status (for CNV data)
pathway_status <- read.csv(file.path(chapuy_dir, "data/processed/pathway_status_by_patient.csv"))

#------------------------------------------------------------------------------
# 3. CREATE SNV MATRIX FOR ALL PATHWAY GENES
#------------------------------------------------------------------------------
cat("\n=== Processing SNV Data ===\n")

# Filter to pathway genes (excluding silent mutations)
pathway_muts <- mutations %>%
  filter(Hugo_Symbol %in% all_pathway_genes) %>%
  filter(Variant_Classification != "Silent") %>%
  select(Tumor_Sample_Barcode, Hugo_Symbol, Variant_Classification, HGVSp_Short) %>%
  distinct()

cat(sprintf("Pathway gene mutations (non-silent): %d\n", nrow(pathway_muts)))

# Create per-patient SNV matrix
snv_matrix <- pathway_muts %>%
  select(Tumor_Sample_Barcode, Hugo_Symbol) %>%
  distinct() %>%
  mutate(mutated = 1) %>%
  pivot_wider(
    id_cols = Tumor_Sample_Barcode,
    names_from = Hugo_Symbol,
    values_from = mutated,
    values_fill = 0,
    names_prefix = "SNV_"
  )

# Ensure all genes have columns
for (gene in all_pathway_genes) {
  col_name <- paste0("SNV_", gene)
  if (!col_name %in% names(snv_matrix)) {
    snv_matrix[[col_name]] <- 0
  }
}

cat(sprintf("Patients with any pathway SNV: %d\n", nrow(snv_matrix)))

#------------------------------------------------------------------------------
# 4. MERGE WITH CLINICAL DATA AND CNV
#------------------------------------------------------------------------------
cat("\n=== Merging Data ===\n")

# Start with integrated clinical data
analysis_data <- integrated %>%
  select(PATIENT_ID, ANY_COO, CLUSTER, OS_MONTHS, OS_Event, PFS_MONTHS, PFS_Event)

# Merge SNV data
analysis_data <- analysis_data %>%
  left_join(snv_matrix, by = c("PATIENT_ID" = "Tumor_Sample_Barcode"))

# Fill NA with 0 for SNV columns
snv_cols <- grep("^SNV_", names(analysis_data), value = TRUE)
for (col in snv_cols) {
  analysis_data[[col]][is.na(analysis_data[[col]])] <- 0
}

# Merge CNV data from pathway_status
cna_cols <- grep("^CNA_", names(pathway_status), value = TRUE)
if (length(cna_cols) > 0) {
  analysis_data <- analysis_data %>%
    left_join(pathway_status %>% select(PATIENT_ID, all_of(cna_cols)), by = "PATIENT_ID")

  for (col in cna_cols) {
    analysis_data[[col]][is.na(analysis_data[[col]])] <- 0
  }
}

# Filter to patients with COO data
analysis_data <- analysis_data %>%
  filter(!is.na(ANY_COO) & ANY_COO != "")

cat(sprintf("Patients in analysis: %d\n", nrow(analysis_data)))

#------------------------------------------------------------------------------
# 5. CREATE COMBINED HIT STATUS (SNV OR CNV)
#------------------------------------------------------------------------------
cat("\n=== Creating Combined Hit Status ===\n")

for (gene in all_pathway_genes) {
  snv_col <- paste0("SNV_", gene)
  cna_col <- paste0("CNA_", gene)
  hit_col <- paste0("HIT_", gene)

  if (snv_col %in% names(analysis_data)) {
    if (cna_col %in% names(analysis_data)) {
      analysis_data[[hit_col]] <- pmax(analysis_data[[snv_col]],
                                        analysis_data[[cna_col]], na.rm = TRUE)
    } else {
      analysis_data[[hit_col]] <- analysis_data[[snv_col]]
    }
  } else {
    analysis_data[[hit_col]] <- 0
  }
}

#------------------------------------------------------------------------------
# 6. CALCULATE PATHWAY SCORES
#------------------------------------------------------------------------------
cat("\n=== Calculating Pathway Scores ===\n")

# Retention score (sum of HIT for retention genes)
retention_hit_cols <- paste0("HIT_", retention_genes)
retention_hit_cols <- retention_hit_cols[retention_hit_cols %in% names(analysis_data)]
analysis_data$Retention_Score <- rowSums(analysis_data[, retention_hit_cols], na.rm = TRUE)

# Egress score (sum of HIT for egress genes)
egress_hit_cols <- paste0("HIT_", egress_genes)
egress_hit_cols <- egress_hit_cols[egress_hit_cols %in% names(analysis_data)]
analysis_data$Egress_Score <- rowSums(analysis_data[, egress_hit_cols], na.rm = TRUE)

cat("Retention score distribution:\n")
print(table(analysis_data$Retention_Score))
cat("\nEgress score distribution:\n")
print(table(analysis_data$Egress_Score))

# Calculate Pathway Status BEFORE creating groups
analysis_data$Pathway_Status <- case_when(
  analysis_data$Retention_Score > 0 & analysis_data$Egress_Score > 0 ~ "Both",
  analysis_data$Retention_Score > 0 ~ "Retention Only",
  analysis_data$Egress_Score > 0 ~ "Egress Only",
  TRUE ~ "Neither"
)

#------------------------------------------------------------------------------
# 7. SUMMARY TABLES
#------------------------------------------------------------------------------
cat("\n\n=============================================================\n")
cat("   INDIVIDUAL GENE MUTATION FREQUENCIES\n")
cat("=============================================================\n\n")

# Define groupings (AFTER Pathway_Status is calculated)
groups <- list(
  Global = analysis_data,
  GCB = analysis_data %>% filter(ANY_COO == "GCB"),
  ABC = analysis_data %>% filter(ANY_COO == "ABC"),
  NOS = analysis_data %>% filter(ANY_COO == "Unclassified"),
  C1 = analysis_data %>% filter(CLUSTER == 1),
  C2 = analysis_data %>% filter(CLUSTER == 2),
  C3 = analysis_data %>% filter(CLUSTER == 3),
  C4 = analysis_data %>% filter(CLUSTER == 4),
  C5 = analysis_data %>% filter(CLUSTER == 5)
)

group_sizes <- sapply(groups, nrow)

# Calculate frequencies for each gene
calc_gene_freq <- function(data, gene) {
  hit_col <- paste0("HIT_", gene)
  if (hit_col %in% names(data) && nrow(data) > 0) {
    n <- sum(data[[hit_col]] == 1, na.rm = TRUE)
    pct <- round(n / nrow(data) * 100, 1)
    return(pct)
  }
  return(0)
}

# RETENTION GENES TABLE
cat("--- RETENTION PATHWAY GENES (LoF = promotes egress) ---\n\n")
cat(sprintf("%-10s", "Gene"))
for (grp in names(groups)) {
  cat(sprintf(" %8s", grp))
}
cat("\n")
cat(sprintf("%-10s", ""))
for (grp in names(groups)) {
  cat(sprintf(" (n=%-4d)", group_sizes[grp]))
}
cat("\n")
cat(strrep("-", 100), "\n")

for (gene in retention_genes) {
  cat(sprintf("%-10s", gene))
  for (grp in names(groups)) {
    pct <- calc_gene_freq(groups[[grp]], gene)
    cat(sprintf(" %7.1f%%", pct))
  }
  cat("\n")
}

# EGRESS GENES TABLE
cat("\n--- EGRESS PATHWAY GENES (GoF = promotes egress) ---\n\n")
cat(sprintf("%-10s", "Gene"))
for (grp in names(groups)) {
  cat(sprintf(" %8s", grp))
}
cat("\n")
cat(sprintf("%-10s", ""))
for (grp in names(groups)) {
  cat(sprintf(" (n=%-4d)", group_sizes[grp]))
}
cat("\n")
cat(strrep("-", 100), "\n")

for (gene in egress_genes) {
  cat(sprintf("%-10s", gene))
  for (grp in names(groups)) {
    pct <- calc_gene_freq(groups[[grp]], gene)
    cat(sprintf(" %7.1f%%", pct))
  }
  cat("\n")
}

#------------------------------------------------------------------------------
# 8. PATHWAY SCORE DISTRIBUTION TABLES
#------------------------------------------------------------------------------
cat("\n\n=============================================================\n")
cat("   PATHWAY SCORE DISTRIBUTIONS\n")
cat("=============================================================\n\n")

# RETENTION SCORE TABLE
cat("--- RETENTION SCORE (0 = no mutations, 1+ = number of genes hit) ---\n\n")
cat(sprintf("%-10s", "Score"))
for (grp in names(groups)) {
  cat(sprintf(" %8s", grp))
}
cat("\n")
cat(sprintf("%-10s", ""))
for (grp in names(groups)) {
  cat(sprintf(" (n=%-4d)", group_sizes[grp]))
}
cat("\n")
cat(strrep("-", 100), "\n")

max_ret_score <- max(analysis_data$Retention_Score, na.rm = TRUE)
for (score in 0:max_ret_score) {
  cat(sprintf("%-10s", score))
  for (grp in names(groups)) {
    data <- groups[[grp]]
    n <- sum(data$Retention_Score == score, na.rm = TRUE)
    pct <- round(n / nrow(data) * 100, 1)
    cat(sprintf(" %7.1f%%", pct))
  }
  cat("\n")
}

# Any retention hit
cat(sprintf("%-10s", "Any (≥1)"))
for (grp in names(groups)) {
  data <- groups[[grp]]
  n <- sum(data$Retention_Score >= 1, na.rm = TRUE)
  pct <- round(n / nrow(data) * 100, 1)
  cat(sprintf(" %7.1f%%", pct))
}
cat("\n")

# EGRESS SCORE TABLE
cat("\n--- EGRESS SCORE (0 = no mutations, 1+ = number of genes hit) ---\n\n")
cat(sprintf("%-10s", "Score"))
for (grp in names(groups)) {
  cat(sprintf(" %8s", grp))
}
cat("\n")
cat(sprintf("%-10s", ""))
for (grp in names(groups)) {
  cat(sprintf(" (n=%-4d)", group_sizes[grp]))
}
cat("\n")
cat(strrep("-", 100), "\n")

max_egr_score <- max(analysis_data$Egress_Score, na.rm = TRUE)
for (score in 0:max(1, max_egr_score)) {
  cat(sprintf("%-10s", score))
  for (grp in names(groups)) {
    data <- groups[[grp]]
    n <- sum(data$Egress_Score == score, na.rm = TRUE)
    pct <- round(n / nrow(data) * 100, 1)
    cat(sprintf(" %7.1f%%", pct))
  }
  cat("\n")
}

# Any egress hit
cat(sprintf("%-10s", "Any (≥1)"))
for (grp in names(groups)) {
  data <- groups[[grp]]
  n <- sum(data$Egress_Score >= 1, na.rm = TRUE)
  pct <- round(n / nrow(data) * 100, 1)
  cat(sprintf(" %7.1f%%", pct))
}
cat("\n")

#------------------------------------------------------------------------------
# 9. COMBINED PATHWAY STATUS
#------------------------------------------------------------------------------
cat("\n\n=============================================================\n")
cat("   COMBINED PATHWAY STATUS\n")
cat("=============================================================\n\n")

cat(sprintf("%-18s", "Status"))
for (grp in names(groups)) {
  cat(sprintf(" %8s", grp))
}
cat("\n")
cat(sprintf("%-18s", ""))
for (grp in names(groups)) {
  cat(sprintf(" (n=%-4d)", group_sizes[grp]))
}
cat("\n")
cat(strrep("-", 110), "\n")

for (status in c("Neither", "Retention Only", "Egress Only", "Both")) {
  cat(sprintf("%-18s", status))
  for (grp in names(groups)) {
    data <- groups[[grp]]
    n <- sum(data$Pathway_Status == status, na.rm = TRUE)
    pct <- round(n / nrow(data) * 100, 1)
    cat(sprintf(" %7.1f%%", pct))
  }
  cat("\n")
}

#------------------------------------------------------------------------------
# 10. SAVE RESULTS
#------------------------------------------------------------------------------
cat("\n=== Saving Results ===\n")

# Save full analysis data
output_data <- analysis_data %>%
  select(PATIENT_ID, ANY_COO, CLUSTER,
         starts_with("SNV_"), starts_with("CNA_"), starts_with("HIT_"),
         Retention_Score, Egress_Score, Pathway_Status,
         OS_MONTHS, OS_Event, PFS_MONTHS, PFS_Event)

write.csv(output_data,
          file.path(chapuy_dir, "data/processed/pathway_scores_full.csv"),
          row.names = FALSE)

# Save summary table
summary_table <- data.frame(
  Group = names(groups),
  N = group_sizes,
  stringsAsFactors = FALSE
)

for (gene in all_pathway_genes) {
  summary_table[[gene]] <- sapply(names(groups), function(grp) calc_gene_freq(groups[[grp]], gene))
}

summary_table$Retention_Any <- sapply(names(groups), function(grp) {
  data <- groups[[grp]]
  round(sum(data$Retention_Score >= 1) / nrow(data) * 100, 1)
})

summary_table$Egress_Any <- sapply(names(groups), function(grp) {
  data <- groups[[grp]]
  round(sum(data$Egress_Score >= 1) / nrow(data) * 100, 1)
})

write.csv(summary_table,
          file.path(chapuy_dir, "data/processed/pathway_scores_summary.csv"),
          row.names = FALSE)

cat("Saved:\n")
cat("  - pathway_scores_full.csv (per-patient data)\n")
cat("  - pathway_scores_summary.csv (summary table)\n")

cat("\n=== ANALYSIS COMPLETE ===\n")
