# Retention/Egress Pathway Analysis by Chapuy Cluster and COO
# SNV and CNV frequencies across C0-C5 molecular subtypes and ABC/GCB/NOS

library(dplyr)
library(tidyr)

chapuy_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Chapuy_Broad"

cat("=============================================================\n")
cat("   RETENTION/EGRESS PATHWAY BY CLUSTER AND COO\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. DEFINE PATHWAY GENES
#------------------------------------------------------------------------------
# Core retention pathway (Loss-of-Function = promotes egress)
retention_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")

# Core egress pathway (Gain-of-Function = promotes egress)
# Includes FOXO1/KLF2 as upstream transcriptional regulators of S1PR1
egress_genes <- c("FOXO1", "KLF2", "CXCR4", "GNAI2", "RAC2")

all_pathway_genes <- c(retention_genes, egress_genes)

cat("=== Core Pathway Genes ===\n")
cat("Retention (LoF):", paste(retention_genes, collapse = ", "), "\n")
cat("Egress (GoF):", paste(egress_genes, collapse = ", "), "\n")
cat("\nPathway model:\n")
cat("  FOXO1/KLF2 → ↑S1PR1 expression\n")
cat("  S1PR1/CXCR4 → GNAI2 → RAC2 → Egress\n")
cat("  S1PR2/P2RY8 → GNA13 → ARHGEF1 → RHOA → Retention\n\n")

#------------------------------------------------------------------------------
# 2. LOAD DATA
#------------------------------------------------------------------------------
cat("=== Loading Data ===\n")

# Load pathway status by patient (already processed)
pathway_status <- read.csv(file.path(chapuy_dir, "data/processed/pathway_status_by_patient.csv"))
cat(sprintf("Patients with pathway data: %d\n", nrow(pathway_status)))

# Load integrated data for additional clinical info
integrated <- read.csv(file.path(chapuy_dir, "data/processed/chapuy_integrated_135.csv"))

# Merge to get cluster info
analysis_data <- pathway_status %>%
  left_join(integrated %>% select(PATIENT_ID, OS_MONTHS, OS_Event, PFS_MONTHS, PFS_Event),
            by = "PATIENT_ID")

# Cluster distribution
cat("\nCluster distribution:\n")
print(table(analysis_data$CLUSTER, useNA = "ifany"))

#------------------------------------------------------------------------------
# 3. SNV FREQUENCIES BY CLUSTER AND COO
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   SNV MUTATION FREQUENCIES BY CLUSTER AND COO\n")
cat("=============================================================\n\n")

clusters <- sort(unique(analysis_data$CLUSTER))
clusters <- clusters[!is.na(clusters) & clusters != 0]  # Exclude C0 (n=1)

# Define groupings: Global, COO, then Clusters
coo_types <- c("GCB", "ABC", "Unclassified")

# Helper function to calculate frequencies for a subset
calc_freq_for_group <- function(data, snv_col) {
  if (snv_col %in% names(data) && nrow(data) > 0) {
    n_mut <- sum(data[[snv_col]] == 1, na.rm = TRUE)
    pct <- n_mut / nrow(data) * 100
    return(c(n = n_mut, pct = round(pct, 1)))
  }
  return(c(n = 0, pct = 0))
}

# Calculate frequencies
snv_results <- data.frame(Gene = all_pathway_genes, stringsAsFactors = FALSE)
snv_results$Pathway <- ifelse(snv_results$Gene %in% retention_genes, "Retention", "Egress")

# Global
n_global <- nrow(analysis_data)
for (i in seq_along(all_pathway_genes)) {
  gene <- all_pathway_genes[i]
  freq <- calc_freq_for_group(analysis_data, paste0("SNV_", gene))
  snv_results$Global_n[i] <- freq["n"]
  snv_results$Global_pct[i] <- freq["pct"]
}

# COO
for (coo in coo_types) {
  coo_data <- analysis_data %>% filter(ANY_COO == coo)
  n_col <- paste0(coo, "_n")
  pct_col <- paste0(coo, "_pct")

  for (i in seq_along(all_pathway_genes)) {
    gene <- all_pathway_genes[i]
    freq <- calc_freq_for_group(coo_data, paste0("SNV_", gene))
    snv_results[[n_col]][i] <- freq["n"]
    snv_results[[pct_col]][i] <- freq["pct"]
  }
}

# Clusters
for (cl in clusters) {
  cl_data <- analysis_data %>% filter(CLUSTER == cl)
  n_col <- paste0("C", cl, "_n")
  pct_col <- paste0("C", cl, "_pct")

  for (i in seq_along(all_pathway_genes)) {
    gene <- all_pathway_genes[i]
    freq <- calc_freq_for_group(cl_data, paste0("SNV_", gene))
    snv_results[[n_col]][i] <- freq["n"]
    snv_results[[pct_col]][i] <- freq["pct"]
  }
}

# Get group sizes
n_global <- nrow(analysis_data)
coo_sizes <- sapply(coo_types, function(coo) sum(analysis_data$ANY_COO == coo, na.rm = TRUE))
names(coo_sizes) <- coo_types
cluster_sizes <- sapply(clusters, function(cl) sum(analysis_data$CLUSTER == cl, na.rm = TRUE))
names(cluster_sizes) <- as.character(clusters)

# Print table
cat("SNV Frequencies (%) - Global, COO, and Cluster:\n")
cat(strrep("-", 130), "\n")
header <- sprintf("%-10s %-10s Global  GCB     ABC     NOS    ", "Gene", "Pathway")
for (cl in clusters) {
  header <- paste0(header, sprintf(" C%d    ", cl))
}
cat(header, "\n")
cat(sprintf("%-10s %-10s (n=%-3d) (n=%-3d) (n=%-3d) (n=%-3d)", "", "",
            n_global, coo_sizes["GCB"], coo_sizes["ABC"], coo_sizes["Unclassified"]))
for (cl in clusters) {
  cat(sprintf(" (n=%-2d)", cluster_sizes[as.character(cl)]))
}
cat("\n")
cat(strrep("-", 130), "\n")

for (i in 1:nrow(snv_results)) {
  row_str <- sprintf("%-10s %-10s %5.1f%% %5.1f%% %5.1f%% %5.1f%%",
                     snv_results$Gene[i], snv_results$Pathway[i],
                     snv_results$Global_pct[i],
                     snv_results$GCB_pct[i],
                     snv_results$ABC_pct[i],
                     snv_results$Unclassified_pct[i])
  for (cl in clusters) {
    pct_col <- paste0("C", cl, "_pct")
    val <- snv_results[[pct_col]][i]
    if (is.na(val)) val <- 0
    row_str <- paste0(row_str, sprintf(" %5.1f%%", val))
  }
  cat(row_str, "\n")
}
cat(strrep("-", 130), "\n")

#------------------------------------------------------------------------------
# 4. CNV FREQUENCIES BY CLUSTER AND COO
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   CNV (DELETION) FREQUENCIES BY CLUSTER AND COO\n")
cat("=============================================================\n\n")

# Genes with known CNV deletions in DLBCL
cna_genes <- c("S1PR2", "RHOA", "ARHGEF1", "GNA13", "P2RY8", "CXCR4", "GNAI2", "RAC2", "ARHGAP25")

cna_results <- data.frame(Gene = cna_genes, stringsAsFactors = FALSE)
cna_results$Cytoband <- c("19p13.2", "3p21.31", "19q13.32", "17p13.3",
                           "Xp22.33", "2q22.1", "3p21.31", "22q13.1", "2p14")

# Helper for CNA
calc_cna_freq <- function(data, cna_col) {
  if (cna_col %in% names(data) && nrow(data) > 0) {
    n_del <- sum(data[[cna_col]] == 1, na.rm = TRUE)
    pct <- n_del / nrow(data) * 100
    return(c(n = n_del, pct = round(pct, 1)))
  }
  return(c(n = 0, pct = 0))
}

# Global
for (i in seq_along(cna_genes)) {
  gene <- cna_genes[i]
  freq <- calc_cna_freq(analysis_data, paste0("CNA_", gene))
  cna_results$Global_n[i] <- freq["n"]
  cna_results$Global_pct[i] <- freq["pct"]
}

# COO
for (coo in coo_types) {
  coo_data <- analysis_data %>% filter(ANY_COO == coo)
  n_col <- paste0(coo, "_n")
  pct_col <- paste0(coo, "_pct")

  for (i in seq_along(cna_genes)) {
    gene <- cna_genes[i]
    freq <- calc_cna_freq(coo_data, paste0("CNA_", gene))
    cna_results[[n_col]][i] <- freq["n"]
    cna_results[[pct_col]][i] <- freq["pct"]
  }
}

# Clusters
for (cl in clusters) {
  cl_data <- analysis_data %>% filter(CLUSTER == cl)
  n_col <- paste0("C", cl, "_n")
  pct_col <- paste0("C", cl, "_pct")

  for (i in seq_along(cna_genes)) {
    gene <- cna_genes[i]
    freq <- calc_cna_freq(cl_data, paste0("CNA_", gene))
    cna_results[[n_col]][i] <- freq["n"]
    cna_results[[pct_col]][i] <- freq["pct"]
  }
}

cat("CNV Deletion Frequencies (%) - Global, COO, and Cluster:\n")
cat(strrep("-", 140), "\n")
header <- sprintf("%-10s %-10s Global  GCB     ABC     NOS    ", "Gene", "Cytoband")
for (cl in clusters) {
  header <- paste0(header, sprintf(" C%d    ", cl))
}
cat(header, "\n")
cat(sprintf("%-10s %-10s (n=%-3d) (n=%-3d) (n=%-3d) (n=%-3d)", "", "",
            n_global, coo_sizes["GCB"], coo_sizes["ABC"], coo_sizes["Unclassified"]))
for (cl in clusters) {
  cat(sprintf(" (n=%-2d)", cluster_sizes[as.character(cl)]))
}
cat("\n")
cat(strrep("-", 140), "\n")

for (i in 1:nrow(cna_results)) {
  row_str <- sprintf("%-10s %-10s %5.1f%% %5.1f%% %5.1f%% %5.1f%%",
                     cna_results$Gene[i], cna_results$Cytoband[i],
                     cna_results$Global_pct[i],
                     cna_results$GCB_pct[i],
                     cna_results$ABC_pct[i],
                     cna_results$Unclassified_pct[i])
  for (cl in clusters) {
    pct_col <- paste0("C", cl, "_pct")
    val <- cna_results[[pct_col]][i]
    if (is.na(val)) val <- 0
    row_str <- paste0(row_str, sprintf(" %5.1f%%", val))
  }
  cat(row_str, "\n")
}
cat(strrep("-", 140), "\n")

#------------------------------------------------------------------------------
# 5. COMBINED HIT (SNV + CNV) BY CLUSTER AND COO
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   COMBINED HIT (SNV OR CNV) BY CLUSTER AND COO\n")
cat("=============================================================\n\n")

hit_results <- data.frame(Gene = all_pathway_genes, stringsAsFactors = FALSE)
hit_results$Pathway <- ifelse(hit_results$Gene %in% retention_genes, "Retention", "Egress")

# Helper for HIT
calc_hit_freq <- function(data, hit_col) {
  if (hit_col %in% names(data) && nrow(data) > 0) {
    n_hit <- sum(data[[hit_col]] == 1, na.rm = TRUE)
    pct <- n_hit / nrow(data) * 100
    return(c(n = n_hit, pct = round(pct, 1)))
  }
  return(c(n = 0, pct = 0))
}

# Global
for (i in seq_along(all_pathway_genes)) {
  gene <- all_pathway_genes[i]
  freq <- calc_hit_freq(analysis_data, paste0("HIT_", gene))
  hit_results$Global_n[i] <- freq["n"]
  hit_results$Global_pct[i] <- freq["pct"]
}

# COO
for (coo in coo_types) {
  coo_data <- analysis_data %>% filter(ANY_COO == coo)
  n_col <- paste0(coo, "_n")
  pct_col <- paste0(coo, "_pct")

  for (i in seq_along(all_pathway_genes)) {
    gene <- all_pathway_genes[i]
    freq <- calc_hit_freq(coo_data, paste0("HIT_", gene))
    hit_results[[n_col]][i] <- freq["n"]
    hit_results[[pct_col]][i] <- freq["pct"]
  }
}

# Clusters
for (cl in clusters) {
  cl_data <- analysis_data %>% filter(CLUSTER == cl)
  n_col <- paste0("C", cl, "_n")
  pct_col <- paste0("C", cl, "_pct")

  for (i in seq_along(all_pathway_genes)) {
    gene <- all_pathway_genes[i]
    freq <- calc_hit_freq(cl_data, paste0("HIT_", gene))
    hit_results[[n_col]][i] <- freq["n"]
    hit_results[[pct_col]][i] <- freq["pct"]
  }
}

cat("Combined Hit (SNV or CNV) Frequencies (%) - Global, COO, and Cluster:\n")
cat(strrep("-", 130), "\n")
header <- sprintf("%-10s %-10s Global  GCB     ABC     NOS    ", "Gene", "Pathway")
for (cl in clusters) {
  header <- paste0(header, sprintf(" C%d    ", cl))
}
cat(header, "\n")
cat(sprintf("%-10s %-10s (n=%-3d) (n=%-3d) (n=%-3d) (n=%-3d)", "", "",
            n_global, coo_sizes["GCB"], coo_sizes["ABC"], coo_sizes["Unclassified"]))
for (cl in clusters) {
  cat(sprintf(" (n=%-2d)", cluster_sizes[as.character(cl)]))
}
cat("\n")
cat(strrep("-", 130), "\n")

for (i in 1:nrow(hit_results)) {
  row_str <- sprintf("%-10s %-10s %5.1f%% %5.1f%% %5.1f%% %5.1f%%",
                     hit_results$Gene[i], hit_results$Pathway[i],
                     hit_results$Global_pct[i],
                     hit_results$GCB_pct[i],
                     hit_results$ABC_pct[i],
                     hit_results$Unclassified_pct[i])
  for (cl in clusters) {
    pct_col <- paste0("C", cl, "_pct")
    val <- hit_results[[pct_col]][i]
    if (is.na(val)) val <- 0
    row_str <- paste0(row_str, sprintf(" %5.1f%%", val))
  }
  cat(row_str, "\n")
}
cat(strrep("-", 130), "\n")

#------------------------------------------------------------------------------
# 6. PATHWAY STATUS BY CLUSTER AND COO
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   PATHWAY STATUS SUMMARY BY CLUSTER AND COO\n")
cat("=============================================================\n\n")

# Calculate pathway status for each grouping
calc_pathway_status <- function(data) {
  if (nrow(data) == 0) return(c(Neither=0, Retention_Only=0, Egress_Only=0, Both=0))
  n <- nrow(data)
  c(
    Neither = round(sum(data$Pathway_Status == "Neither", na.rm=TRUE) / n * 100, 1),
    Retention_Only = round(sum(data$Pathway_Status == "Retention Only", na.rm=TRUE) / n * 100, 1),
    Egress_Only = round(sum(data$Pathway_Status == "Egress Only", na.rm=TRUE) / n * 100, 1),
    Both = round(sum(data$Pathway_Status == "Both", na.rm=TRUE) / n * 100, 1)
  )
}

cat("Pathway Status Distribution (%) - Global, COO, and Cluster:\n")
cat(strrep("-", 130), "\n")
header <- sprintf("%-18s Global  GCB     ABC     NOS    ", "Status")
for (cl in clusters) {
  header <- paste0(header, sprintf(" C%d    ", cl))
}
cat(header, "\n")
cat(sprintf("%-18s (n=%-3d) (n=%-3d) (n=%-3d) (n=%-3d)", "",
            n_global, coo_sizes["GCB"], coo_sizes["ABC"], coo_sizes["Unclassified"]))
for (cl in clusters) {
  cat(sprintf(" (n=%-2d)", cluster_sizes[as.character(cl)]))
}
cat("\n")
cat(strrep("-", 130), "\n")

status_names <- c("Neither", "Retention Only", "Egress Only", "Both")
for (status in status_names) {
  # Global
  global_pct <- sum(analysis_data$Pathway_Status == status, na.rm=TRUE) / n_global * 100

  # COO
  gcb_pct <- sum(analysis_data$ANY_COO == "GCB" & analysis_data$Pathway_Status == status, na.rm=TRUE) / coo_sizes["GCB"] * 100
  abc_pct <- sum(analysis_data$ANY_COO == "ABC" & analysis_data$Pathway_Status == status, na.rm=TRUE) / coo_sizes["ABC"] * 100
  nos_pct <- sum(analysis_data$ANY_COO == "Unclassified" & analysis_data$Pathway_Status == status, na.rm=TRUE) / coo_sizes["Unclassified"] * 100

  row_str <- sprintf("%-18s %5.1f%% %5.1f%% %5.1f%% %5.1f%%", status, global_pct, gcb_pct, abc_pct, nos_pct)

  for (cl in clusters) {
    cl_n <- cluster_sizes[as.character(cl)]
    cl_count <- sum(analysis_data$CLUSTER == cl & analysis_data$Pathway_Status == status, na.rm=TRUE)
    cl_pct <- ifelse(cl_n > 0, cl_count / cl_n * 100, 0)
    row_str <- paste0(row_str, sprintf(" %5.1f%%", cl_pct))
  }
  cat(row_str, "\n")
}
cat(strrep("-", 130), "\n")

# Any retention hit
cat("\n--- Any Retention Pathway Hit ---\n")
# Global
any_ret_global <- sum(analysis_data$Retention_Score > 0, na.rm = TRUE)
cat(sprintf("  Global: %d/%d (%.1f%%)\n", any_ret_global, n_global, any_ret_global/n_global*100))

# COO
for (coo in coo_types) {
  coo_data <- analysis_data %>% filter(ANY_COO == coo)
  any_ret <- sum(coo_data$Retention_Score > 0, na.rm = TRUE)
  pct <- any_ret / nrow(coo_data) * 100
  label <- ifelse(coo == "Unclassified", "NOS", coo)
  cat(sprintf("  %s: %d/%d (%.1f%%)\n", label, any_ret, nrow(coo_data), pct))
}

# Clusters
for (cl in clusters) {
  cl_data <- analysis_data %>% filter(CLUSTER == cl)
  any_ret <- sum(cl_data$Retention_Score > 0, na.rm = TRUE)
  pct <- any_ret / nrow(cl_data) * 100
  cat(sprintf("  C%d: %d/%d (%.1f%%)\n", cl, any_ret, nrow(cl_data), pct))
}

# Any egress hit
cat("\n--- Any Egress Pathway Hit ---\n")
# Global
any_egr_global <- sum(analysis_data$Egress_Score > 0, na.rm = TRUE)
cat(sprintf("  Global: %d/%d (%.1f%%)\n", any_egr_global, n_global, any_egr_global/n_global*100))

# COO
for (coo in coo_types) {
  coo_data <- analysis_data %>% filter(ANY_COO == coo)
  any_egr <- sum(coo_data$Egress_Score > 0, na.rm = TRUE)
  pct <- any_egr / nrow(coo_data) * 100
  label <- ifelse(coo == "Unclassified", "NOS", coo)
  cat(sprintf("  %s: %d/%d (%.1f%%)\n", label, any_egr, nrow(coo_data), pct))
}

# Clusters
for (cl in clusters) {
  cl_data <- analysis_data %>% filter(CLUSTER == cl)
  any_egr <- sum(cl_data$Egress_Score > 0, na.rm = TRUE)
  pct <- any_egr / nrow(cl_data) * 100
  cat(sprintf("  C%d: %d/%d (%.1f%%)\n", cl, any_egr, nrow(cl_data), pct))
}

#------------------------------------------------------------------------------
# 7. PROPOSED ADDITIONAL PATHWAY GENES
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   PROPOSED ADDITIONAL PATHWAY-RELEVANT GENES\n")
cat("=============================================================\n\n")

cat("Based on biological pathway connectivity and mutation patterns in DLBCL:\n\n")

additional_genes <- data.frame(
  Gene = c("EZH2", "BCL2", "TNFRSF14", "MYD88", "CD79B", "CARD11", "MEF2B",
           "CREBBP", "EP300", "KMT2D", "SOCS1", "B2M", "CD58", "NOTCH2"),
  Pathway_Relevance = c(
    "GNA13 co-occurring; epigenetic modifier; GCB marker",
    "Anti-apoptotic; t(14;18) common in GCB; affects GC exit",
    "GNA13 co-occurring; immune evasion; GCB marker",
    "ABC marker; NF-kB activation; mutually exclusive with GNA13",
    "ABC marker; BCR signaling; chronic active signaling",
    "NF-kB scaffolding; affects B-cell survival signals",
    "GC master regulator; affects RHOA activity",
    "Histone acetyltransferase; epigenetic modifier; GCB",
    "Histone acetyltransferase; similar to CREBBP",
    "Histone methyltransferase; chromatin remodeling",
    "JAK-STAT negative regulator; immune signaling",
    "MHC class I; immune evasion",
    "Adhesion molecule; GC positioning/retention",
    "Marginal zone/ABC marker; B-cell differentiation"
  ),
  Expected_Cluster = c(
    "C3 (EZB)", "C3 (EZB)", "C3 (EZB)", "C5 (MCD)", "C5 (MCD)",
    "C5 (MCD)", "C3 (EZB)", "C3 (EZB)", "Multiple", "Multiple",
    "Multiple", "Multiple", "Multiple", "C1 (BN2)"
  ),
  stringsAsFactors = FALSE
)

cat("Gene          Cluster      Pathway Relevance\n")
cat(strrep("-", 80), "\n")
for (i in 1:nrow(additional_genes)) {
  cat(sprintf("%-12s  %-10s   %s\n",
              additional_genes$Gene[i],
              additional_genes$Expected_Cluster[i],
              additional_genes$Pathway_Relevance[i]))
}

cat("\n\n=== RECOMMENDED CNV REGIONS FOR PATHWAY GENES ===\n\n")

cnv_recommendations <- data.frame(
  Gene = c("S1PR2", "GNA13", "ARHGEF1", "RHOA", "P2RY8",
           "CXCR4", "GNAI2", "TNFRSF14", "CDKN2A", "CD58"),
  Cytoband = c("19p13.2", "17p13.3", "19q13.32", "3p21.31", "Xp22.33",
               "2q22.1", "3p21.31", "1p36.32", "9p21.3", "1p13.1"),
  Alteration = c("DEL", "DEL", "DEL", "DEL", "DEL",
                 "AMP (rare)", "DEL", "DEL", "DEL", "DEL"),
  Effect = c("Loss of retention", "Loss of retention", "Loss of retention",
             "Loss of retention", "Loss of retention",
             "Enhanced chemotaxis", "Loss of egress inhibition",
             "Immune evasion", "Cell cycle dysregulation", "Immune evasion"),
  stringsAsFactors = FALSE
)

cat("Gene       Cytoband     Alteration   Effect\n")
cat(strrep("-", 70), "\n")
for (i in 1:nrow(cnv_recommendations)) {
  cat(sprintf("%-10s %-12s %-12s %s\n",
              cnv_recommendations$Gene[i],
              cnv_recommendations$Cytoband[i],
              cnv_recommendations$Alteration[i],
              cnv_recommendations$Effect[i]))
}

#------------------------------------------------------------------------------
# 8. CHAPUY CLUSTER SUMMARY
#------------------------------------------------------------------------------
cat("\n\n=============================================================\n")
cat("   CHAPUY CLUSTER CHARACTERIZATION\n")
cat("=============================================================\n\n")

cat("C1 - BN2: BCL6 fusions, NOTCH2 mutations\n")
cat("C2 - A53: TP53 mutations, aneuploidy\n")
cat("C3 - EZB: EZH2 + BCL2 + GNA13 (GCB-like)\n")
cat("C4 - ST2: SGK1, TET2 mutations\n")
cat("C5 - MCD: MYD88 + CD79B (ABC-like)\n\n")

cat("Expected GNA13/retention pathway enrichment: C3 (EZB)\n")
cat("Expected MYD88/ABC pathway enrichment: C5 (MCD)\n\n")

#------------------------------------------------------------------------------
# 9. SAVE RESULTS
#------------------------------------------------------------------------------
cat("=== Saving Results ===\n")

write.csv(snv_results,
          file.path(chapuy_dir, "data/processed/pathway_snv_by_cluster_coo.csv"),
          row.names = FALSE)

write.csv(cna_results,
          file.path(chapuy_dir, "data/processed/pathway_cna_by_cluster_coo.csv"),
          row.names = FALSE)

write.csv(hit_results,
          file.path(chapuy_dir, "data/processed/pathway_hit_by_cluster_coo.csv"),
          row.names = FALSE)

write.csv(additional_genes,
          file.path(chapuy_dir, "data/processed/proposed_additional_genes.csv"),
          row.names = FALSE)

write.csv(cnv_recommendations,
          file.path(chapuy_dir, "data/processed/cnv_recommendations.csv"),
          row.names = FALSE)

cat("\nSaved:\n")
cat("  - pathway_snv_by_cluster_coo.csv\n")
cat("  - pathway_cna_by_cluster_coo.csv\n")
cat("  - pathway_hit_by_cluster_coo.csv\n")
cat("  - proposed_additional_genes.csv\n")
cat("  - cnv_recommendations.csv\n")

cat("\n=== ANALYSIS COMPLETE ===\n")
