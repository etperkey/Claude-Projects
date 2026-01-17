# Duke 2017 DLBCL: Retention vs Egress Pathway Mutations vs Stage
# Comparing GNA13/RHOA/S1PR2 (retention) vs GNAI2/CXCR4 (egress)

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

# Load data
df <- read_csv("data/processed/duke_pathway_categories.csv", show_col_types = FALSE)

# Create output directory
dir.create("results/figures", showWarnings = FALSE, recursive = TRUE)

# Prepare data
df <- df %>%
  mutate(
    Stage = ifelse(Stage_Advanced, "Advanced (III-IV)", "Limited (I-II)"),
    Mutation_Category = factor(
      Mutation_Category,
      levels = c("No Pathway Mutation", "Retention (GNA13/RHOA/S1PR2)", "Egress (GNAI2/CXCR4)", "Both")
    )
  )

# ============================================================
# Figure 1: Stage Distribution by Pathway Mutation Category
# ============================================================

# Calculate proportions
stage_props <- df %>%
  group_by(Mutation_Category, Stage) %>%
  summarise(n = n(), .groups = "drop") %>%
  group_by(Mutation_Category) %>%
  mutate(
    total = sum(n),
    prop = n / total,
    label = sprintf("%.0f%%", prop * 100),
    label_pos = sprintf("%s\n(n=%d)", label, n)
  ) %>%
  ungroup()

# Get sample sizes for x-axis labels
cat_sizes <- df %>%
  group_by(Mutation_Category) %>%
  summarise(n = n()) %>%
  mutate(label = sprintf("%s\n(n=%d)", Mutation_Category, n))

p1 <- ggplot(stage_props, aes(x = Mutation_Category, y = prop, fill = Stage)) +
  geom_col(position = "stack", width = 0.7) +
  geom_text(
    aes(label = label),
    position = position_stack(vjust = 0.5),
    color = "white",
    fontface = "bold",
    size = 4
  ) +
  scale_fill_manual(
    values = c("Limited (I-II)" = "#2E86AB", "Advanced (III-IV)" = "#E94F37"),
    name = "Stage"
  ) +
  scale_x_discrete(labels = function(x) {
    sapply(x, function(cat) {
      n <- cat_sizes$n[cat_sizes$Mutation_Category == cat]
      paste0(cat, "\n(n=", n, ")")
    })
  }) +
  scale_y_continuous(labels = percent_format(), expand = c(0, 0)) +
  labs(
    title = "Disease Stage by Pathway Mutation Status",
    subtitle = "Duke 2017 DLBCL Cohort (All COO subtypes)",
    x = "",
    y = "Proportion of Patients",
    caption = "Retention: GNA13, RHOA, S1PR2, P2RY8, ARHGEF1 | Egress: GNAI2, CXCR4, S1PR1"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    plot.subtitle = element_text(color = "gray40"),
    legend.position = "top",
    panel.grid.major.x = element_blank(),
    axis.text.x = element_text(size = 9)
  )

ggsave("results/figures/duke_pathway_stage_stacked.png", p1, width = 10, height = 6, dpi = 300)
cat("Saved: results/figures/duke_pathway_stage_stacked.png\n")

# ============================================================
# Figure 2: Advanced Stage Rate Comparison (Bar Chart)
# ============================================================

advanced_rates <- df %>%
  group_by(Mutation_Category) %>%
  summarise(
    n = n(),
    n_advanced = sum(Stage_Advanced),
    rate = mean(Stage_Advanced),
    se = sqrt(rate * (1 - rate) / n),
    .groups = "drop"
  ) %>%
  mutate(
    ci_lower = rate - 1.96 * se,
    ci_upper = rate + 1.96 * se
  )

p2 <- ggplot(advanced_rates, aes(x = Mutation_Category, y = rate, fill = Mutation_Category)) +
  geom_col(width = 0.7) +
  geom_errorbar(
    aes(ymin = ci_lower, ymax = ci_upper),
    width = 0.2,
    color = "gray30"
  ) +
  geom_text(
    aes(label = sprintf("%.1f%%\n(%d/%d)", rate * 100, n_advanced, n)),
    vjust = -0.5,
    size = 3.5
  ) +
  geom_hline(
    yintercept = advanced_rates$rate[advanced_rates$Mutation_Category == "No Pathway Mutation"],
    linetype = "dashed",
    color = "gray50"
  ) +
  scale_fill_manual(
    values = c(
      "No Pathway Mutation" = "gray60",
      "Retention (GNA13/RHOA/S1PR2)" = "#2E86AB",
      "Egress (GNAI2/CXCR4)" = "#E94F37",
      "Both" = "#9B59B6"
    ),
    guide = "none"
  ) +
  scale_y_continuous(
    labels = percent_format(),
    limits = c(0, 1),
    expand = c(0, 0)
  ) +
  labs(
    title = "Advanced Stage Rate by Pathway Mutation",
    subtitle = "Duke 2017 DLBCL (n=974) | Dashed line = baseline (no mutation)",
    x = "",
    y = "Proportion with Advanced Stage (III-IV)",
    caption = "Error bars: 95% CI | Egress pathway: OR=2.54, p=0.03"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    panel.grid.major.x = element_blank(),
    axis.text.x = element_text(size = 9, angle = 15, hjust = 1)
  )

ggsave("results/figures/duke_pathway_advanced_rate.png", p2, width = 9, height = 6, dpi = 300)
cat("Saved: results/figures/duke_pathway_advanced_rate.png\n")

# ============================================================
# Figure 3: Grouped Bar Chart (Side by Side)
# ============================================================

p3 <- ggplot(stage_props, aes(x = Mutation_Category, y = n, fill = Stage)) +
  geom_col(position = "dodge", width = 0.7) +
  geom_text(
    aes(label = n),
    position = position_dodge(width = 0.7),
    vjust = -0.5,
    size = 3.5
  ) +
  scale_fill_manual(
    values = c("Limited (I-II)" = "#2E86AB", "Advanced (III-IV)" = "#E94F37"),
    name = "Stage"
  ) +
  scale_y_continuous(expand = expansion(mult = c(0, 0.15))) +
  labs(
    title = "Patient Counts by Pathway Mutation and Stage",
    subtitle = "Duke 2017 DLBCL Cohort",
    x = "",
    y = "Number of Patients"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    legend.position = "top",
    panel.grid.major.x = element_blank(),
    axis.text.x = element_text(size = 9, angle = 15, hjust = 1)
  )

ggsave("results/figures/duke_pathway_counts.png", p3, width = 10, height = 6, dpi = 300)
cat("Saved: results/figures/duke_pathway_counts.png\n")

# ============================================================
# Figure 4: Forest Plot Comparing Pathways
# ============================================================

# Calculate odds ratios vs no mutation
calc_or <- function(df, category) {
  mut <- df %>% filter(Mutation_Category == category)
  no_mut <- df %>% filter(Mutation_Category == "No Pathway Mutation")

  a <- sum(mut$Stage_Advanced)
  b <- sum(!mut$Stage_Advanced)
  c <- sum(no_mut$Stage_Advanced)
  d <- sum(!no_mut$Stage_Advanced)

  or <- (a * d) / (b * c)
  log_or <- log(or)
  se <- sqrt(1/a + 1/b + 1/c + 1/d)

  list(
    category = category,
    or = or,
    ci_lower = exp(log_or - 1.96 * se),
    ci_upper = exp(log_or + 1.96 * se),
    p = fisher.test(matrix(c(a, b, c, d), nrow = 2))$p.value
  )
}

forest_data <- bind_rows(
  calc_or(df, "Retention (GNA13/RHOA/S1PR2)"),
  calc_or(df, "Egress (GNAI2/CXCR4)"),
  calc_or(df, "Both")
) %>%
  mutate(
    category = factor(category, levels = rev(c(
      "Retention (GNA13/RHOA/S1PR2)",
      "Egress (GNAI2/CXCR4)",
      "Both"
    ))),
    significant = p < 0.05,
    label = sprintf("OR=%.2f (%.2f-%.2f)\np=%.3f", or, ci_lower, ci_upper, p)
  )

p4 <- ggplot(forest_data, aes(x = or, y = category)) +
  geom_vline(xintercept = 1, linetype = "dashed", color = "gray50") +
  geom_errorbarh(aes(xmin = ci_lower, xmax = ci_upper), height = 0.2, linewidth = 1) +
  geom_point(aes(color = significant), size = 4) +
  geom_text(
    aes(label = label, x = ci_upper + 0.3),
    hjust = 0,
    size = 3
  ) +
  scale_x_continuous(limits = c(0.3, 6)) +
  scale_color_manual(
    values = c("TRUE" = "#E94F37", "FALSE" = "gray50"),
    guide = "none"
  ) +
  labs(
    title = "Odds of Advanced Stage by Pathway Mutation",
    subtitle = "Duke 2017 DLBCL | Reference: No pathway mutation",
    x = "Odds Ratio",
    y = "",
    caption = "Red = p < 0.05"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    panel.grid.minor = element_blank()
  )

ggsave("results/figures/duke_pathway_forest.png", p4, width = 9, height = 5, dpi = 300)
cat("Saved: results/figures/duke_pathway_forest.png\n")

# ============================================================
# Summary Statistics
# ============================================================

cat("\n")
cat("============================================================\n")
cat("DUKE 2017 PATHWAY ANALYSIS SUMMARY\n")
cat("============================================================\n")

summary_stats <- df %>%
  group_by(Mutation_Category) %>%
  summarise(
    N = n(),
    Advanced = sum(Stage_Advanced),
    Limited = sum(!Stage_Advanced),
    Pct_Advanced = sprintf("%.1f%%", mean(Stage_Advanced) * 100),
    .groups = "drop"
  )

print(summary_stats)

cat("\n")
cat("Odds Ratios (vs No Pathway Mutation):\n")
print(forest_data %>% select(category, or, ci_lower, ci_upper, p))

cat("\n")
cat("Key Finding:\n")
cat("  Egress pathway (GNAI2/CXCR4) mutations associated with\n")
cat("  higher advanced stage rate (OR=2.54, p=0.03)\n")
cat("  \n")
cat("  Retention pathway (GNA13/RHOA/S1PR2) shows no significant\n")
cat("  association in this mixed-COO cohort (effect likely GCB-specific)\n")
