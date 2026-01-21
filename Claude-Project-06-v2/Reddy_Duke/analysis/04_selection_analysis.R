# =============================================================================
# 04_selection_analysis.R
# Gene and pathway-level selection analysis
# Test for excess/depletion of truncating mutations (dN/dS approach)
# =============================================================================

library(dplyr)
library(tidyr)
library(readr)
library(ggplot2)
library(ggrepel)

# Output directory
output_dir <- "Reddy_Duke/analysis/output"
figures_dir <- "Reddy_Duke/analysis/figures"

# -----------------------------------------------------------------------------
# Load data
# -----------------------------------------------------------------------------
cat("Loading data...\n")

# Load gene classification with rates
gene_data <- read_csv(file.path(output_dir, "gene_classification.csv"),
                      show_col_types = FALSE)
cat(sprintf("  Genes: %d\n", nrow(gene_data)))

# Load baseline rates
baseline <- read_csv(file.path(output_dir, "baseline_mutation_rates.csv"),
                     show_col_types = FALSE)

# Extract baseline truncating rate
baseline_trunc_rate <- baseline$Value[baseline$Metric == "Baseline_truncating_rate_per_Mb"]
baseline_mis_rate <- baseline$Value[baseline$Metric == "Baseline_missense_rate_per_Mb"]
n_patients <- baseline$Value[baseline$Metric == "N_patients"]

cat(sprintf("  Baseline truncating rate: %.2f per Mb\n", baseline_trunc_rate))
cat(sprintf("  Baseline missense rate: %.2f per Mb\n", baseline_mis_rate))

# -----------------------------------------------------------------------------
# Calculate expected truncating mutations per gene
# -----------------------------------------------------------------------------
cat("\nCalculating expected truncating mutations per gene...\n")

# Expected = gene_CDS_length (Mb) * baseline_truncating_rate
gene_data <- gene_data %>%
  mutate(
    CDS_Mb = CDS_length_bp / 1e6,
    # Expected truncating under neutral evolution
    Expected_truncating = CDS_Mb * baseline_trunc_rate,
    # Expected missense for comparison
    Expected_missense = CDS_Mb * baseline_mis_rate,
    # Selection ratio (observed / expected)
    Selection_ratio_trunc = Truncating / pmax(Expected_truncating, 0.01),
    Selection_ratio_mis = Missense / pmax(Expected_missense, 0.01)
  )

# -----------------------------------------------------------------------------
# Statistical test for selection (Poisson exact test)
# -----------------------------------------------------------------------------
cat("Testing for significant selection using Poisson test...\n")

# Function to perform Poisson test
poisson_selection_test <- function(observed, expected) {
  if (is.na(observed) | is.na(expected) | expected <= 0) {
    return(list(p_excess = NA, p_depletion = NA))
  }
  # Test for excess (positive selection for LoF)
  p_excess <- ppois(observed - 1, expected, lower.tail = FALSE)
  # Test for depletion (negative selection)
  p_depletion <- ppois(observed, expected, lower.tail = TRUE)
  return(list(p_excess = p_excess, p_depletion = p_depletion))
}

# Apply test to each gene
gene_data <- gene_data %>%
  rowwise() %>%
  mutate(
    test_result = list(poisson_selection_test(Truncating, Expected_truncating)),
    P_excess_trunc = test_result$p_excess,
    P_depletion_trunc = test_result$p_depletion
  ) %>%
  ungroup() %>%
  select(-test_result)

# FDR correction
gene_data <- gene_data %>%
  mutate(
    FDR_excess = p.adjust(P_excess_trunc, method = "BH"),
    FDR_depletion = p.adjust(P_depletion_trunc, method = "BH")
  )

# Classify selection status
gene_data <- gene_data %>%
  mutate(
    Selection_Status = case_when(
      FDR_excess < 0.1 & Selection_ratio_trunc > 2 ~ "Positive_Selection_LoF",
      FDR_depletion < 0.1 & Selection_ratio_trunc < 0.5 ~ "Negative_Selection",
      Gene_Class == "aSHM_Target" ~ "aSHM_Neutral",
      TRUE ~ "Neutral"
    )
  )

# Summary
cat("\nSelection status summary:\n")
print(table(gene_data$Selection_Status))

# -----------------------------------------------------------------------------
# Identify tumor suppressors (positive selection for LoF)
# -----------------------------------------------------------------------------
cat("\nGenes under positive selection for LoF (tumor suppressors):\n")

tumor_suppressors <- gene_data %>%
  filter(Selection_Status == "Positive_Selection_LoF") %>%
  arrange(FDR_excess) %>%
  select(Gene, Truncating, Expected_truncating, Selection_ratio_trunc,
         P_excess_trunc, FDR_excess, Total_Coding)

print(tumor_suppressors, n = 30)

# Known tumor suppressors for validation
known_ts <- c("TP53", "CDKN2A", "B2M", "TNFAIP3", "CREBBP", "EP300",
              "KMT2D", "KMT2C", "ARID1A", "PRDM1", "GNA13", "SPEN")

ts_validation <- tumor_suppressors %>%
  filter(Gene %in% known_ts)

cat(sprintf("\nKnown tumor suppressors found: %d\n", nrow(ts_validation)))

# -----------------------------------------------------------------------------
# Genes under negative selection (essential genes)
# -----------------------------------------------------------------------------
cat("\nGenes under negative selection (fewer truncating than expected):\n")

negative_selection <- gene_data %>%
  filter(Selection_Status == "Negative_Selection") %>%
  arrange(FDR_depletion) %>%
  select(Gene, Truncating, Expected_truncating, Selection_ratio_trunc,
         P_depletion_trunc, FDR_depletion, Total_Coding)

print(head(negative_selection, 20), n = 20)

# -----------------------------------------------------------------------------
# Pathway-level selection analysis
# -----------------------------------------------------------------------------
cat("\nPerforming pathway-level selection analysis...\n")

# Define pathways
pathways <- list(
  NF_kB = c("CARD11", "CD79A", "CD79B", "MYD88", "NFKBIA", "NFKBIE",
            "TNFAIP3", "BCL10", "MALT1", "TRAF2", "TRAF3"),
  Chromatin = c("CREBBP", "EP300", "KMT2D", "KMT2C", "EZH2", "ARID1A",
                "ARID1B", "SMARCA4", "HIST1H1E", "HIST1H1C"),
  BCR_signaling = c("CD79B", "CD79A", "SYK", "BTK", "BLNK", "PLCG2",
                    "PRKCB", "LYN"),
  Apoptosis = c("BCL2", "BCL6", "TP53", "CDKN2A", "MCL1", "BAX",
                "PMAIP1", "BBC3"),
  GC_exit = c("GNA13", "S1PR2", "P2RY8", "FOXO1", "GNAI2", "ARHGEF1"),
  PI3K_AKT = c("PIK3CA", "PIK3CD", "AKT1", "PTEN", "MTOR", "TSC1", "TSC2"),
  JAK_STAT = c("STAT3", "STAT6", "JAK1", "JAK2", "SOCS1", "PTPN1"),
  Immune_evasion = c("B2M", "CD58", "CIITA", "HLA-A", "HLA-B", "HLA-C",
                     "TAP1", "TAP2", "NLRC5"),
  Cell_cycle = c("CDKN2A", "CDKN1B", "RB1", "CCND1", "CCND3", "CDK4", "CDK6")
)

# Calculate pathway-level selection
pathway_selection <- lapply(names(pathways), function(pw_name) {
  pw_genes <- pathways[[pw_name]]

  pw_data <- gene_data %>%
    filter(Gene %in% pw_genes)

  if (nrow(pw_data) == 0) {
    return(NULL)
  }

  # Aggregate counts
  total_truncating <- sum(pw_data$Truncating, na.rm = TRUE)
  total_expected <- sum(pw_data$Expected_truncating, na.rm = TRUE)
  total_missense <- sum(pw_data$Missense, na.rm = TRUE)
  n_genes <- nrow(pw_data)

  # Pathway selection ratio
  selection_ratio <- total_truncating / max(total_expected, 0.01)

  # Poisson test for pathway
  test <- poisson_selection_test(total_truncating, total_expected)

  data.frame(
    Pathway = pw_name,
    N_genes_in_data = n_genes,
    Total_truncating = total_truncating,
    Expected_truncating = round(total_expected, 2),
    Total_missense = total_missense,
    Selection_ratio = round(selection_ratio, 2),
    P_excess = test$p_excess,
    P_depletion = test$p_depletion
  )
}) %>%
  bind_rows() %>%
  mutate(
    FDR_excess = p.adjust(P_excess, method = "BH"),
    Selection_Status = case_when(
      P_excess < 0.05 & Selection_ratio > 1.5 ~ "Positive_Selection",
      P_depletion < 0.05 & Selection_ratio < 0.5 ~ "Negative_Selection",
      TRUE ~ "Neutral"
    )
  ) %>%
  arrange(P_excess)

cat("\nPathway selection analysis:\n")
print(pathway_selection)

# -----------------------------------------------------------------------------
# Visualization: Selection volcano plot
# -----------------------------------------------------------------------------
cat("\nGenerating selection volcano plot...\n")

# Prepare data for volcano plot
plot_data <- gene_data %>%
  filter(Total_Coding >= 3) %>%
  mutate(
    log2_ratio = log2(Selection_ratio_trunc + 0.01),
    neg_log10_p = -log10(pmax(P_excess_trunc, 1e-20)),
    Label = ifelse(
      (FDR_excess < 0.1 & Selection_ratio_trunc > 2) |
        (Gene %in% c("TP53", "CDKN2A", "B2M", "CREBBP", "GNA13",
                     "BCL6", "PIM1", "MYC", "EZH2", "MYD88")),
      Gene, ""
    )
  )

p_volcano <- ggplot(plot_data,
                    aes(x = log2_ratio, y = neg_log10_p)) +
  geom_point(aes(color = Selection_Status), alpha = 0.6, size = 1.5) +
  geom_vline(xintercept = c(-1, 1), linetype = "dashed", color = "gray50") +
  geom_hline(yintercept = -log10(0.05), linetype = "dashed", color = "gray50") +
  geom_text_repel(
    aes(label = Label),
    size = 2.5,
    max.overlaps = 30,
    segment.size = 0.2
  ) +
  scale_color_manual(values = c(
    "Positive_Selection_LoF" = "#E41A1C",
    "Negative_Selection" = "#377EB8",
    "aSHM_Neutral" = "#4DAF4A",
    "Neutral" = "gray60"
  )) +
  labs(
    title = "Gene Selection Analysis: Truncating Mutations",
    subtitle = "Observed vs Expected truncating mutations (Poisson test)",
    x = "Log2(Selection Ratio)",
    y = "-Log10(P-value excess)",
    color = "Selection Status"
  ) +
  theme_minimal() +
  theme(legend.position = "bottom")

ggsave(file.path(figures_dir, "selection_volcano.png"),
       p_volcano, width = 10, height = 8, dpi = 150)

# -----------------------------------------------------------------------------
# Visualization: Pathway selection barplot
# -----------------------------------------------------------------------------
p_pathway <- ggplot(pathway_selection,
                    aes(x = reorder(Pathway, Selection_ratio),
                        y = Selection_ratio,
                        fill = Selection_Status)) +
  geom_col() +
  geom_hline(yintercept = 1, linetype = "dashed", color = "black") +
  coord_flip() +
  scale_fill_manual(values = c(
    "Positive_Selection" = "#E41A1C",
    "Negative_Selection" = "#377EB8",
    "Neutral" = "gray60"
  )) +
  labs(
    title = "Pathway-Level Selection Analysis",
    subtitle = "Truncating mutation enrichment by pathway",
    x = "Pathway",
    y = "Selection Ratio (Observed/Expected truncating)",
    fill = "Selection"
  ) +
  theme_minimal() +
  theme(legend.position = "bottom")

ggsave(file.path(figures_dir, "pathway_selection.png"),
       p_pathway, width = 10, height = 8, dpi = 150)

cat("  Figures saved.\n")

# -----------------------------------------------------------------------------
# Save outputs
# -----------------------------------------------------------------------------

# Gene-level selection analysis
selection_file <- file.path(output_dir, "selection_analysis.csv")
gene_selection_output <- gene_data %>%
  select(Gene, CDS_length_bp, Synonymous, Missense, Truncating, Total_Coding,
         Expected_truncating, Selection_ratio_trunc, P_excess_trunc, FDR_excess,
         P_depletion_trunc, FDR_depletion, Selection_Status, Gene_Class)
write_csv(gene_selection_output, selection_file)
cat(sprintf("\nSaved gene selection analysis to: %s\n", selection_file))

# Pathway selection
pathway_file <- file.path(output_dir, "pathway_selection.csv")
write_csv(pathway_selection, pathway_file)
cat(sprintf("Saved pathway selection to: %s\n", pathway_file))

# Tumor suppressor list
ts_file <- file.path(output_dir, "tumor_suppressors.csv")
write_csv(tumor_suppressors, ts_file)
cat(sprintf("Saved tumor suppressors to: %s\n", ts_file))

# Update gene classification for downstream use
updated_gene_file <- file.path(output_dir, "gene_classification_with_selection.csv")
write_csv(gene_data, updated_gene_file)
cat(sprintf("Saved updated gene classification to: %s\n", updated_gene_file))

cat("\n=== Selection analysis complete ===\n")
