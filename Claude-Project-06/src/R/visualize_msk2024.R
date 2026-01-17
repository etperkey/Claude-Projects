#!/usr/bin/env Rscript
# MSK 2024 DLBCL Pathway Mutation Visualization

library(tidyverse)

# Paths
BASE_DIR <- '/Users/ericperkey/Desktop/Claude-Projects/Claude-Project-06'
RESULTS_DIR <- file.path(BASE_DIR, 'results')
TABLES_DIR <- file.path(RESULTS_DIR, 'tables')
FIGURES_DIR <- file.path(RESULTS_DIR, 'figures')

# Create figures directory if needed
dir.create(FIGURES_DIR, showWarnings = FALSE, recursive = TRUE)

# Load results
gene_data <- read_csv(file.path(TABLES_DIR, 'msk2024_gene_by_stage.csv'), show_col_types = FALSE)
pathway_data <- read_csv(file.path(TABLES_DIR, 'msk2024_pathway_by_stage.csv'), show_col_types = FALSE)

cat("=" , rep("=", 58), "\n", sep = "")
cat("MSK 2024 DLBCL Visualization\n")
cat("=" , rep("=", 58), "\n", sep = "")

# 1. Gene-level barplot
cat("\n1. Creating gene-level mutation frequency plot...\n")

gene_long <- gene_data %>%
  filter(Early_Mutated > 0 | Disseminated_Mutated > 0) %>%
  select(Gene, Pathway, Early_Freq, Disseminated_Freq, p_value) %>%
  pivot_longer(cols = c(Early_Freq, Disseminated_Freq),
               names_to = "Stage", values_to = "Frequency") %>%
  mutate(
    Stage = recode(Stage,
                   "Early_Freq" = "Early (I-III)",
                   "Disseminated_Freq" = "Disseminated (IV)"),
    Gene = factor(Gene, levels = c("GNA13", "P2RY8", "S1PR2", "ARHGEF1", "RHOA",
                                    "CXCR4", "S1PR1", "GNAI2", "RAC1", "RAC2"))
  )

# Add significance annotations
gene_summary <- gene_data %>%
  filter(Early_Mutated > 0 | Disseminated_Mutated > 0) %>%
  mutate(
    max_freq = pmax(Early_Freq, Disseminated_Freq),
    sig = case_when(
      p_value < 0.001 ~ "***",
      p_value < 0.01 ~ "**",
      p_value < 0.05 ~ "*",
      p_value < 0.1 ~ ".",
      TRUE ~ ""
    )
  )

p1 <- ggplot(gene_long, aes(x = Gene, y = Frequency, fill = Stage)) +
  geom_bar(stat = "identity", position = position_dodge(width = 0.8), width = 0.7) +
  geom_text(data = gene_summary,
            aes(x = Gene, y = max_freq + 2, label = sig),
            inherit.aes = FALSE, size = 5) +
  facet_wrap(~ Pathway, scales = "free_x") +
  scale_fill_manual(values = c("Early (I-III)" = "#4DAF4A", "Disseminated (IV)" = "#E41A1C")) +
  labs(
    title = "MSK 2024 DLBCL: Gene Mutation Frequency by Stage",
    subtitle = paste0("n = 347 patients (172 early, 175 disseminated)\n",
                      "Significance: . p<0.1, * p<0.05, ** p<0.01, *** p<0.001"),
    x = "Gene",
    y = "Mutation Frequency (%)",
    fill = "Stage"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    axis.text.x = element_text(angle = 45, hjust = 1),
    legend.position = "bottom",
    panel.grid.minor = element_blank()
  )

ggsave(file.path(FIGURES_DIR, "msk2024_gene_by_stage.png"), p1, width = 10, height = 6, dpi = 300)
cat("   Saved: msk2024_gene_by_stage.png\n")

# 2. Pathway-level barplot
cat("\n2. Creating pathway-level comparison plot...\n")

pathway_long <- pathway_data %>%
  select(Pathway, Early_Freq, Disseminated_Freq, p_value) %>%
  pivot_longer(cols = c(Early_Freq, Disseminated_Freq),
               names_to = "Stage", values_to = "Frequency") %>%
  mutate(
    Stage = recode(Stage,
                   "Early_Freq" = "Early (I-III)",
                   "Disseminated_Freq" = "Disseminated (IV)"),
    Pathway = factor(Pathway, levels = c("Tumor Suppressor", "Pro-migratory"))
  )

pathway_summary <- pathway_data %>%
  mutate(
    max_freq = pmax(Early_Freq, Disseminated_Freq),
    label = sprintf("OR=%.2f\np=%.4f", OR, p_value)
  )

p2 <- ggplot(pathway_long, aes(x = Pathway, y = Frequency, fill = Stage)) +
  geom_bar(stat = "identity", position = position_dodge(width = 0.8), width = 0.6) +
  geom_text(aes(label = sprintf("%.1f%%", Frequency)),
            position = position_dodge(width = 0.8),
            vjust = -0.5, size = 4) +
  geom_text(data = pathway_summary,
            aes(x = Pathway, y = max_freq + 6, label = label),
            inherit.aes = FALSE, size = 3.5) +
  scale_fill_manual(values = c("Early (I-III)" = "#4DAF4A", "Disseminated (IV)" = "#E41A1C")) +
  scale_y_continuous(limits = c(0, 35)) +
  labs(
    title = "MSK 2024 DLBCL: Pathway Mutation Frequency by Stage",
    subtitle = "Tumor Suppressor (S1PR2, P2RY8, GNA13, ARHGEF1, RHOA) vs Pro-migratory (S1PR1, CXCR4, GNAI2, RAC1, RAC2)",
    x = "",
    y = "Patients with Pathway Mutation (%)",
    fill = "Stage"
  ) +
  theme_minimal(base_size = 14) +
  theme(
    legend.position = "bottom",
    panel.grid.minor = element_blank()
  )

ggsave(file.path(FIGURES_DIR, "msk2024_pathway_by_stage.png"), p2, width = 8, height = 6, dpi = 300)
cat("   Saved: msk2024_pathway_by_stage.png\n")

# 3. Create summary comparison table with previous datasets
cat("\n3. Creating cross-dataset comparison...\n")

# Load previous results if available
comparison_data <- tibble(
  Dataset = c("cBioPortal Combined (FL/DLBCL)", "cBioPortal Combined (FL/DLBCL)",
              "Kridel 2024 FL (GM cluster)", "Kridel 2024 FL (GM cluster)",
              "MSK 2024 DLBCL", "MSK 2024 DLBCL"),
  Pathway = c("Tumor Suppressor", "Pro-migratory",
              "Tumor Suppressor", "Pro-migratory",
              "Tumor Suppressor", "Pro-migratory"),
  Overall_Freq = c(37.3, 5.5,  # cBioPortal
                   51.1, NA,   # Kridel GM cluster (TS only, PM not reported)
                   19.3, 3.7), # MSK 2024
  N_Samples = c(236, 236,
                137, 137,
                347, 347),
  Notes = c("GCB-DLBCL + FL", "GCB-DLBCL + FL",
            "GM genetic subtype only", "GM genetic subtype only",
            "DLBCL (all subtypes)", "DLBCL (all subtypes)")
)

write_csv(comparison_data, file.path(TABLES_DIR, "cross_dataset_comparison.csv"))

# Cross-dataset visualization
p3 <- comparison_data %>%
  filter(!is.na(Overall_Freq)) %>%
  ggplot(aes(x = Dataset, y = Overall_Freq, fill = Pathway)) +
  geom_bar(stat = "identity", position = position_dodge(width = 0.8), width = 0.6) +
  geom_text(aes(label = sprintf("%.1f%%", Overall_Freq)),
            position = position_dodge(width = 0.8),
            vjust = -0.5, size = 3.5) +
  scale_fill_manual(values = c("Tumor Suppressor" = "#377EB8", "Pro-migratory" = "#FF7F00")) +
  scale_y_continuous(limits = c(0, 60)) +
  labs(
    title = "Pathway Mutation Frequency Across Datasets",
    subtitle = "GC B-cell lymphoma S1PR2/GNA13 pathway analysis",
    x = "",
    y = "Mutation Frequency (%)",
    fill = "Pathway"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    axis.text.x = element_text(angle = 15, hjust = 1),
    legend.position = "bottom",
    panel.grid.minor = element_blank()
  )

ggsave(file.path(FIGURES_DIR, "cross_dataset_comparison.png"), p3, width = 10, height = 6, dpi = 300)
cat("   Saved: cross_dataset_comparison.png\n")

# Print summary
cat("\n" , rep("=", 58), "\n", sep = "")
cat("SUMMARY\n")
cat(rep("=", 58), "\n", sep = "")

cat("\nMSK 2024 Key Finding:\n")
cat("  Tumor suppressor pathway mutations are HIGHER in early-stage\n")
cat("  disease (23.3%) vs disseminated (15.4%), p=0.077\n")
cat("\n  This is the OPPOSITE direction of what might be predicted\n")
cat("  if TS pathway loss drives dissemination.\n")

cat("\nPossible interpretations:\n")
cat("  1. TS mutations may be enriched in GCB-DLBCL subtype\n")
cat("     (which may present at earlier stages)\n")
cat("  2. Selection pressure: disseminated disease may rely\n")
cat("     on other mechanisms beyond GC exit\n")
cat("  3. Confounding by cell-of-origin (COO) classification\n")

cat("\nFigures saved to:", FIGURES_DIR, "\n")
