# DFCI 2018 GCB-DLBCL: S1P Pathway Mutations vs Stage
# Sample-level mutation data with COO and staging

library(tidyverse)
library(scales)

# Set working directory
args <- commandArgs(trailingOnly = FALSE)
script_path <- sub("--file=", "", args[grep("--file=", args)])
if (length(script_path) > 0) {
  script_dir <- dirname(script_path)
  project_root <- dirname(dirname(script_dir))
} else {
  project_root <- getwd()
}
setwd(project_root)

# Create output directory
dir.create("results/figures", showWarnings = FALSE, recursive = TRUE)

# Load data
df <- read_csv("data/processed/dfci_gcb_staged.csv", show_col_types = FALSE)

# Summary statistics
cat("\n============================================================\n")
cat("DFCI 2018 GCB-DLBCL ANALYSIS\n")
cat("============================================================\n\n")

cat(sprintf("Total GCB samples with staging: %d\n\n", nrow(df)))

# Calculate rates by mutation category
summary_stats <- df %>%
  mutate(Mutation_Category = ifelse(Mutation_Category == "None", "No Pathway Mutation", "Retention Pathway")) %>%
  group_by(Mutation_Category) %>%
  summarise(
    N = n(),
    Advanced = sum(Stage_Advanced),
    Limited = sum(!Stage_Advanced),
    Rate = mean(Stage_Advanced),
    SE = sqrt(Rate * (1 - Rate) / N),
    .groups = "drop"
  ) %>%
  mutate(
    CI_Lower = pmax(Rate - 1.96 * SE, 0),
    CI_Upper = pmin(Rate + 1.96 * SE, 1)
  )

print(summary_stats)

# Fisher's exact test
tbl <- table(
  df$Mutation_Category,
  df$Stage_Advanced
)
fisher_result <- fisher.test(tbl)
cat(sprintf("\nFisher's exact test p-value: %.3f\n", fisher_result$p.value))
cat(sprintf("Odds Ratio: %.2f (95%% CI: %.2f-%.2f)\n",
            fisher_result$estimate,
            fisher_result$conf.int[1],
            fisher_result$conf.int[2]))

# Prepare plot data
plot_data <- summary_stats %>%
  mutate(
    Mutation_Category = factor(Mutation_Category,
                               levels = c("No Pathway Mutation", "Retention Pathway")),
    Label = sprintf("%.1f%%\n(%d/%d)", Rate * 100, Advanced, N)
  )

# ============================================================
# Figure: DFCI GCB Stage by Retention Mutations
# ============================================================

p <- ggplot(plot_data, aes(x = Mutation_Category, y = Rate, fill = Mutation_Category)) +
  geom_col(width = 0.6) +
  geom_errorbar(
    aes(ymin = CI_Lower, ymax = CI_Upper),
    width = 0.15,
    linewidth = 0.8
  ) +
  geom_text(
    aes(label = Label),
    vjust = -0.5,
    size = 4,
    fontface = "bold"
  ) +
  geom_hline(
    yintercept = plot_data$Rate[plot_data$Mutation_Category == "No Pathway Mutation"],
    linetype = "dashed",
    color = "gray50"
  ) +
  scale_fill_manual(
    values = c("No Pathway Mutation" = "gray60", "Retention Pathway" = "#2E86AB"),
    guide = "none"
  ) +
  scale_y_continuous(
    labels = percent_format(),
    limits = c(0, 1),
    expand = c(0, 0)
  ) +
  labs(
    title = "DFCI 2018: GCB-DLBCL",
    subtitle = sprintf("Sample-level mutations (n=%d) | p=%.2f", nrow(df), fisher_result$p.value),
    x = "",
    y = "Advanced Stage Rate (III-IV)",
    caption = "Retention pathway: GNA13, RHOA, S1PR2, P2RY8, ARHGEF1\nNo egress mutations found in GCB subset"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    plot.subtitle = element_text(color = "gray40"),
    panel.grid.major.x = element_blank(),
    axis.text.x = element_text(size = 11, face = "bold")
  )

ggsave("results/figures/dfci_gcb_pathway_stage.png", p, width = 7, height = 6, dpi = 300)
cat("\nSaved: results/figures/dfci_gcb_pathway_stage.png\n")

# ============================================================
# Detailed mutation breakdown
# ============================================================

cat("\n")
cat("============================================================\n")
cat("MUTATION DETAILS IN GCB SAMPLES\n")
cat("============================================================\n\n")

# Load mutation details
mutations <- read_csv("data/processed/dfci_gcb_pathway_mutations.csv", show_col_types = FALSE)

# Count by gene
gene_counts <- mutations %>%
  count(hugoGeneSymbol, name = "Mutations") %>%
  arrange(desc(Mutations))

cat("Mutations by gene (GCB samples):\n")
print(gene_counts)

# List individual samples with mutations
cat("\nSamples with retention pathway mutations:\n")
retention_samples <- df %>%
  filter(Mutation_Category == "Retention") %>%
  select(sampleId, Stage_Advanced)

for (i in 1:nrow(retention_samples)) {
  sample <- retention_samples$sampleId[i]
  stage <- ifelse(retention_samples$Stage_Advanced[i], "Advanced", "Limited")
  genes <- mutations %>%
    filter(sampleId == sample) %>%
    pull(hugoGeneSymbol) %>%
    unique() %>%
    paste(collapse = ", ")
  cat(sprintf("  %s: %s (%s stage)\n", sample, genes, stage))
}

cat("\n")
cat("KEY LIMITATION:\n")
cat("  Sample size is small (n=21 GCB with staging)\n")
cat("  No egress pathway mutations found in GCB subset\n")
cat("  Cannot reliably detect effect seen in larger cohorts\n")
