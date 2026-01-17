# Stage vs Pathway Mutation Visualization
# GCB-DLBCL: EZB subtype (retention pathway enriched) vs stage

library(tidyverse)
library(scales)

# Set working directory to project root
# Get the script's directory and navigate to project root
args <- commandArgs(trailingOnly = FALSE)
script_path <- sub("--file=", "", args[grep("--file=", args)])
if (length(script_path) > 0) {
  script_dir <- dirname(script_path)
  project_root <- dirname(dirname(script_dir))
} else {
  project_root <- getwd()
}
setwd(project_root)

# Load data
gcb_data <- read_csv("data/processed/gcb_stage_analysis.csv", show_col_types = FALSE)
subtype_results <- read_csv("results/tables/stage_by_genetic_subtype.csv", show_col_types = FALSE)

# Create output directory
dir.create("results/figures", showWarnings = FALSE, recursive = TRUE)

# ============================================================
# Figure 1: Stage Distribution by Genetic Subtype
# ============================================================

# Prepare data for plotting
# Rename columns to remove spaces
gcb_data <- gcb_data %>%
  rename(
    Genetic_Subtype = `Genetic Subtype`,
    Gene_Expression_Subgroup = `Gene Expression Subgroup`
  )

stage_long <- gcb_data %>%
  filter(!is.na(Stage_Binary)) %>%
  mutate(
    Genetic_Subtype = factor(Genetic_Subtype, levels = c("EZB", "BN2", "Other", "MCD")),
    Stage_Binary = factor(Stage_Binary, levels = c("Early (I)", "Late (III-IV)"))
  )

# Calculate proportions
stage_props <- stage_long %>%
  group_by(Genetic_Subtype, Stage_Binary) %>%
  summarise(n = n(), .groups = "drop") %>%
  group_by(Genetic_Subtype) %>%
  mutate(
    total = sum(n),
    prop = n / total,
    label = sprintf("%.0f%%", prop * 100)
  ) %>%
  ungroup()

# Create bar plot
p1 <- ggplot(stage_props, aes(x = Genetic_Subtype, y = prop, fill = Stage_Binary)) +
  geom_col(position = "stack", width = 0.7) +
  geom_text(
    aes(label = label),
    position = position_stack(vjust = 0.5),
    color = "white",
    fontface = "bold",
    size = 4
  ) +
  scale_fill_manual(
    values = c("Early (I)" = "#2E86AB", "Late (III-IV)" = "#E94F37"),
    name = "Stage"
  ) +
  scale_y_continuous(labels = percent_format(), expand = c(0, 0)) +
  labs(
    title = "Disease Stage by Genetic Subtype in GCB-DLBCL",
    subtitle = "EZB subtype (GNA13/RHOA enriched) shows 91.7% late-stage presentation\nFisher's exact: OR=7.14, p=0.0009",
    x = "Genetic Subtype",
    y = "Proportion of Patients",
    caption = "Data: Schmitz et al. NEJM 2018 (n=97 GCB-DLBCL with staging)"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    plot.subtitle = element_text(size = 10, color = "gray40"),
    legend.position = "top",
    panel.grid.major.x = element_blank(),
    axis.text.x = element_text(face = "bold")
  )

ggsave("results/figures/stage_by_genetic_subtype.png", p1, width = 8, height = 6, dpi = 300)
cat("Saved: results/figures/stage_by_genetic_subtype.png\n")

# ============================================================
# Figure 2: EZB vs Non-EZB Comparison
# ============================================================

ezb_comparison <- stage_long %>%
  mutate(EZB_Status = ifelse(Genetic_Subtype == "EZB", "EZB\n(Retention Pathway)", "Non-EZB")) %>%
  group_by(EZB_Status, Stage_Binary) %>%
  summarise(n = n(), .groups = "drop") %>%
  group_by(EZB_Status) %>%
  mutate(
    total = sum(n),
    prop = n / total
  )

p2 <- ggplot(ezb_comparison, aes(x = EZB_Status, y = prop, fill = Stage_Binary)) +
  geom_col(position = "dodge", width = 0.7) +
  geom_text(
    aes(label = sprintf("%.1f%%\n(n=%d)", prop * 100, n)),
    position = position_dodge(width = 0.7),
    vjust = -0.3,
    size = 3.5
  ) +
  scale_fill_manual(
    values = c("Early (I)" = "#2E86AB", "Late (III-IV)" = "#E94F37"),
    name = "Stage"
  ) +
  scale_y_continuous(
    labels = percent_format(),
    limits = c(0, 1.15),
    expand = c(0, 0)
  ) +
  labs(
    title = "EZB vs Non-EZB: Stage Distribution",
    subtitle = "EZB (GNA13/RHOA mutations) associated with 7.1x higher odds of late-stage disease",
    x = "",
    y = "Proportion",
    caption = "Fisher's exact test: OR=7.14, 95% CI (1.97-25.89), p=0.0009"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    legend.position = "top",
    panel.grid.major.x = element_blank()
  )

ggsave("results/figures/ezb_vs_nonezb_stage.png", p2, width = 7, height = 6, dpi = 300)
cat("Saved: results/figures/ezb_vs_nonezb_stage.png\n")

# ============================================================
# Figure 3: Forest Plot of Odds Ratios
# ============================================================

# Calculate OR for each subtype vs Other
forest_data <- tibble(
  Subtype = c("EZB", "BN2"),
  OR = c(7.14, 2.14),  # Pre-calculated
  CI_lower = c(1.97, 0.48),
  CI_upper = c(25.89, 9.56),
  p_value = c(0.0009, 0.32)
) %>%
  mutate(
    Subtype = factor(Subtype, levels = rev(c("EZB", "BN2"))),
    significant = p_value < 0.05
  )

p3 <- ggplot(forest_data, aes(x = OR, y = Subtype)) +
  geom_vline(xintercept = 1, linetype = "dashed", color = "gray50") +
  geom_errorbarh(aes(xmin = CI_lower, xmax = CI_upper), height = 0.2, size = 1) +
  geom_point(aes(color = significant), size = 4) +
  scale_x_log10(limits = c(0.3, 30)) +
  scale_color_manual(
    values = c("TRUE" = "#E94F37", "FALSE" = "gray50"),
    guide = "none"
  ) +
  labs(
    title = "Odds of Late-Stage Disease by Genetic Subtype",
    subtitle = "Compared to 'Other' GCB-DLBCL (reference)",
    x = "Odds Ratio (log scale)",
    y = "",
    caption = "Error bars: 95% confidence intervals"
  ) +
  annotate(
    "text", x = 20, y = 2,
    label = "p=0.0009*",
    color = "#E94F37", fontface = "bold", size = 3.5
  ) +
  annotate(
    "text", x = 6, y = 1,
    label = "p=0.32",
    color = "gray50", size = 3.5
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold"),
    panel.grid.minor = element_blank()
  )

ggsave("results/figures/forest_plot_or.png", p3, width = 7, height = 4, dpi = 300)
cat("Saved: results/figures/forest_plot_or.png\n")

# ============================================================
# Summary
# ============================================================

cat("\n")
cat("============================================================\n")
cat("VISUALIZATION COMPLETE\n")
cat("============================================================\n")
cat("Figures saved to: results/figures/\n")
cat("\n")
cat("Key finding:\n")
cat("  EZB subtype (enriched for GNA13/RHOA retention pathway mutations)\n")
cat("  shows 91.7% late-stage (III-IV) presentation vs 60.7% for non-EZB\n")
cat("  OR=7.14, p=0.0009\n")
