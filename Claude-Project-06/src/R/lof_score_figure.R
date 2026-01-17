# LoF Score Analysis Visualization

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

dir.create("results/figures", showWarnings = FALSE, recursive = TRUE)

# Load data
df <- read_csv("data/processed/duke_lof_scores.csv", show_col_types = FALSE)

# Calculate rates by LoF category
summary_data <- df %>%
  group_by(LoF_category) %>%
  summarise(
    N = n(),
    Advanced = sum(Stage_Advanced),
    Rate = mean(Stage_Advanced),
    SE = sqrt(Rate * (1 - Rate) / N),
    .groups = "drop"
  ) %>%
  mutate(
    CI_Lower = pmax(Rate - 1.96 * SE, 0),
    CI_Upper = pmin(Rate + 1.96 * SE, 1),
    LoF_category = factor(LoF_category, levels = c("0 (None)", "1", "2", "3+"))
  )

# Create plot
p <- ggplot(summary_data, aes(x = LoF_category, y = Rate, fill = LoF_category)) +
  geom_col(width = 0.7) +
  geom_errorbar(
    aes(ymin = CI_Lower, ymax = CI_Upper),
    width = 0.2,
    linewidth = 0.8
  ) +
  geom_text(
    aes(label = sprintf("%.1f%%\n(n=%d)", Rate * 100, N)),
    vjust = -0.3,
    size = 3.5,
    fontface = "bold"
  ) +
  geom_hline(
    yintercept = summary_data$Rate[summary_data$LoF_category == "0 (None)"],
    linetype = "dashed",
    color = "gray50"
  ) +
  scale_fill_manual(
    values = c(
      "0 (None)" = "gray70",
      "1" = "#A6CEE3",
      "2" = "#1F78B4",
      "3+" = "#08306B"
    ),
    guide = "none"
  ) +
  scale_y_continuous(
    labels = percent_format(),
    limits = c(0, 1),
    expand = c(0, 0)
  ) +
  labs(
    title = "LoF Retention Mutation Score vs Disease Stage",
    subtitle = "Duke 2017 Pan-DLBCL (n=974) | No significant trend (p=0.57)",
    x = "LoF Mutation Count",
    y = "Advanced Stage Rate (III-IV)",
    caption = paste0(
      "LoF mutations: GNA13/RHOA truncating or likely damaging missense\n",
      "Effect likely diluted by inclusion of ABC cases (retention pathway is GCB-specific)"
    )
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    plot.subtitle = element_text(color = "gray40"),
    panel.grid.major.x = element_blank(),
    plot.caption = element_text(size = 9, color = "gray50", hjust = 0)
  )

ggsave("results/figures/lof_score_vs_stage.png", p, width = 8, height = 6, dpi = 300)
cat("Saved: results/figures/lof_score_vs_stage.png\n")

# Print summary
cat("\n")
cat("============================================================\n")
cat("LoF SCORE SUMMARY\n")
cat("============================================================\n")
print(summary_data)

cat("\nNote: In this pan-DLBCL cohort, no significant dose-response\n")
cat("relationship between LoF burden and stage is observed.\n")
cat("This is expected as retention pathway effects are GCB-specific.\n")
