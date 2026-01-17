# Summary Figure: S1P Pathway Mutations and Disease Stage in DLBCL
# Combining Schmitz 2018 (GCB-EZB), Duke 2017 (Pan-DLBCL), and DFCI 2018 (GCB) analyses

library(tidyverse)
library(patchwork)
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

# ============================================================
# Data: Schmitz 2018 GCB-EZB Analysis
# ============================================================

schmitz_data <- tibble(
  Category = c("Non-EZB GCB", "EZB GCB"),
  N = c(56, 24),
  Late_Stage = c(34, 22),
  Early_Stage = c(22, 2)
) %>%
  mutate(
    Rate = Late_Stage / N,
    SE = sqrt(Rate * (1 - Rate) / N),
    CI_Lower = Rate - 1.96 * SE,
    CI_Upper = pmin(Rate + 1.96 * SE, 1),
    Category = factor(Category, levels = c("Non-EZB GCB", "EZB GCB"))
  )

# EZB OR calculation
ezb_or <- (22 * 22) / (2 * 34)  # 7.12
ezb_log_or <- log(ezb_or)
ezb_se <- sqrt(1/22 + 1/2 + 1/34 + 1/22)
ezb_ci_lower <- exp(ezb_log_or - 1.96 * ezb_se)
ezb_ci_upper <- exp(ezb_log_or + 1.96 * ezb_se)
ezb_p <- fisher.test(matrix(c(22, 2, 34, 22), nrow = 2))$p.value

# ============================================================
# Data: Duke 2017 Pan-DLBCL Analysis
# ============================================================

duke_data <- tibble(
  Category = c("No Pathway\nMutation", "Retention\n(GNA13/RHOA/S1PR2)", "Egress\n(GNAI2/CXCR4)"),
  N = c(777, 168, 29),
  Late_Stage = c(489, 109, 24),
  Early_Stage = c(288, 59, 5)
) %>%
  mutate(
    Rate = Late_Stage / N,
    SE = sqrt(Rate * (1 - Rate) / N),
    CI_Lower = Rate - 1.96 * SE,
    CI_Upper = pmin(Rate + 1.96 * SE, 1),
    Category = factor(Category, levels = c("No Pathway\nMutation", "Retention\n(GNA13/RHOA/S1PR2)", "Egress\n(GNAI2/CXCR4)"))
  )

# ============================================================
# Data: DFCI 2018 GCB Analysis
# ============================================================

dfci_data <- tibble(
  Category = c("No Pathway\nMutation", "Retention\nPathway"),
  N = c(11, 10),
  Late_Stage = c(5, 4),
  Early_Stage = c(6, 6)
) %>%
  mutate(
    Rate = Late_Stage / N,
    SE = sqrt(Rate * (1 - Rate) / N),
    CI_Lower = pmax(Rate - 1.96 * SE, 0),
    CI_Upper = pmin(Rate + 1.96 * SE, 1),
    Category = factor(Category, levels = c("No Pathway\nMutation", "Retention\nPathway"))
  )

# DFCI Fisher's test
dfci_p <- fisher.test(matrix(c(4, 6, 5, 6), nrow = 2))$p.value
dfci_or <- (4 * 6) / (6 * 5)

# ============================================================
# Panel A: Schmitz GCB - EZB vs Non-EZB
# ============================================================

panel_a <- ggplot(schmitz_data, aes(x = Category, y = Rate, fill = Category)) +
  geom_col(width = 0.6) +
  geom_errorbar(
    aes(ymin = CI_Lower, ymax = CI_Upper),
    width = 0.15,
    linewidth = 0.8
  ) +
  geom_text(
    aes(label = sprintf("%.1f%%\n(%d/%d)", Rate * 100, Late_Stage, N)),
    vjust = -0.3,
    size = 3.5,
    fontface = "bold"
  ) +
  geom_segment(
    aes(x = 1, xend = 2, y = 1.02, yend = 1.02),
    linewidth = 0.5
  ) +
  geom_text(
    aes(x = 1.5, y = 1.08, label = sprintf("OR=%.1f, p=%.4f", ezb_or, ezb_p)),
    size = 3.2,
    fontface = "italic"
  ) +
  scale_fill_manual(
    values = c("Non-EZB GCB" = "#6BAED6", "EZB GCB" = "#08519C"),
    guide = "none"
  ) +
  scale_y_continuous(
    labels = percent_format(),
    limits = c(0, 1.15),
    expand = c(0, 0)
  ) +
  labs(
    title = "A. Schmitz 2018: GCB-DLBCL",
    subtitle = "EZB subtype (GNA13/RHOA-enriched) | n=80",
    x = "",
    y = "Late Stage Rate (III-IV)"
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold", size = 12),
    plot.subtitle = element_text(color = "gray40", size = 9),
    panel.grid.major.x = element_blank(),
    axis.text.x = element_text(size = 10, face = "bold")
  )

# ============================================================
# Panel B: Duke Pan-DLBCL Pathways
# ============================================================

panel_b <- ggplot(duke_data, aes(x = Category, y = Rate, fill = Category)) +
  geom_col(width = 0.6) +
  geom_errorbar(
    aes(ymin = CI_Lower, ymax = CI_Upper),
    width = 0.15,
    linewidth = 0.8
  ) +
  geom_text(
    aes(label = sprintf("%.1f%%\n(%d/%d)", Rate * 100, Late_Stage, N)),
    vjust = -0.3,
    size = 3.2,
    fontface = "bold"
  ) +
  geom_hline(
    yintercept = duke_data$Rate[1],
    linetype = "dashed",
    color = "gray50",
    linewidth = 0.5
  ) +
  scale_fill_manual(
    values = c(
      "No Pathway\nMutation" = "gray60",
      "Retention\n(GNA13/RHOA/S1PR2)" = "#2E86AB",
      "Egress\n(GNAI2/CXCR4)" = "#E94F37"
    ),
    guide = "none"
  ) +
  scale_y_continuous(
    labels = percent_format(),
    limits = c(0, 1.05),
    expand = c(0, 0)
  ) +
  labs(
    title = "B. Duke 2017: Pan-DLBCL",
    subtitle = "All COO subtypes | n=974",
    x = "",
    y = "Late Stage Rate (III-IV)"
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold", size = 12),
    plot.subtitle = element_text(color = "gray40", size = 9),
    panel.grid.major.x = element_blank(),
    axis.text.x = element_text(size = 9)
  )

# ============================================================
# Panel C: DFCI GCB Analysis
# ============================================================

panel_c <- ggplot(dfci_data, aes(x = Category, y = Rate, fill = Category)) +
  geom_col(width = 0.6) +
  geom_errorbar(
    aes(ymin = CI_Lower, ymax = CI_Upper),
    width = 0.15,
    linewidth = 0.8
  ) +
  geom_text(
    aes(label = sprintf("%.1f%%\n(%d/%d)", Rate * 100, Late_Stage, N)),
    vjust = -0.3,
    size = 3.5,
    fontface = "bold"
  ) +
  geom_hline(
    yintercept = dfci_data$Rate[1],
    linetype = "dashed",
    color = "gray50",
    linewidth = 0.5
  ) +
  annotate(
    "text",
    x = 1.5, y = 0.9,
    label = sprintf("OR=%.2f, p=%.2f\n(underpowered)", dfci_or, dfci_p),
    size = 3,
    fontface = "italic",
    color = "gray40"
  ) +
  scale_fill_manual(
    values = c("No Pathway\nMutation" = "gray60", "Retention\nPathway" = "#2E86AB"),
    guide = "none"
  ) +
  scale_y_continuous(
    labels = percent_format(),
    limits = c(0, 1.05),
    expand = c(0, 0)
  ) +
  labs(
    title = "C. DFCI 2018: GCB-DLBCL",
    subtitle = "Sample-level mutations | n=21",
    x = "",
    y = "Late Stage Rate (III-IV)"
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold", size = 12),
    plot.subtitle = element_text(color = "gray40", size = 9),
    panel.grid.major.x = element_blank(),
    axis.text.x = element_text(size = 10, face = "bold")
  )

# ============================================================
# Panel D: Forest Plot - Combined Odds Ratios
# ============================================================

forest_data <- tibble(
  Study = c(
    "Schmitz 2018 (GCB)",
    "Duke 2017 (All DLBCL)",
    "Duke 2017 (All DLBCL)",
    "DFCI 2018 (GCB)"
  ),
  Comparison = c(
    "EZB vs Non-EZB",
    "Retention vs None",
    "Egress vs None",
    "Retention vs None"
  ),
  Pathway = c("Retention (proxy)", "Retention", "Egress", "Retention"),
  N = c(80, 945, 806, 21),
  OR = c(7.12, 1.09, 2.83, 0.80),
  CI_Lower = c(1.57, 0.77, 1.07, 0.13),
  CI_Upper = c(32.3, 1.53, 7.50, 4.99),
  P = c(0.0069, 0.76, 0.03, 1.00),
  Significant = c(TRUE, FALSE, TRUE, FALSE)
) %>%
  mutate(
    Label = sprintf("%.2f (%.2f-%.2f)", OR, CI_Lower, CI_Upper),
    Y = factor(paste(Study, Comparison, sep = "\n"),
               levels = rev(paste(Study, Comparison, sep = "\n")))
  )

panel_d <- ggplot(forest_data, aes(x = OR, y = Y)) +
  geom_vline(xintercept = 1, linetype = "dashed", color = "gray50") +
  geom_errorbar(
    aes(xmin = CI_Lower, xmax = CI_Upper, color = Pathway),
    width = 0.25,
    linewidth = 1.2,
    orientation = "y"
  ) +
  geom_point(aes(color = Pathway, shape = Significant), size = 4) +
  geom_text(
    aes(label = Label, x = pmin(CI_Upper + 0.5, 10)),
    hjust = 0,
    size = 2.8
  ) +
  geom_text(
    aes(label = sprintf("n=%d", N), x = 0.08),
    hjust = 0,
    size = 2.5,
    color = "gray50"
  ) +
  geom_text(
    aes(label = ifelse(P < 0.01, sprintf("p=%.3f", P), sprintf("p=%.2f", P)),
        x = pmin(CI_Upper + 4, 30)),
    hjust = 0,
    size = 2.8,
    fontface = "italic"
  ) +
  scale_x_log10(
    limits = c(0.05, 50),
    breaks = c(0.1, 0.5, 1, 2, 5, 10, 20)
  ) +
  scale_color_manual(
    values = c("Retention (proxy)" = "#08519C", "Retention" = "#2E86AB", "Egress" = "#E94F37"),
    name = "Pathway"
  ) +
  scale_shape_manual(
    values = c("TRUE" = 16, "FALSE" = 1),
    name = "p < 0.05"
  ) +
  labs(
    title = "D. Odds Ratios for Late-Stage Disease",
    subtitle = "Reference: No pathway mutation / Non-EZB",
    x = "Odds Ratio (log scale)",
    y = ""
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold", size = 12),
    plot.subtitle = element_text(color = "gray40", size = 9),
    panel.grid.minor = element_blank(),
    legend.position = "bottom",
    legend.box = "horizontal"
  ) +
  guides(
    color = guide_legend(order = 1),
    shape = guide_legend(order = 2)
  )

# ============================================================
# Combine Panels
# ============================================================

combined <- (panel_a | panel_b | panel_c) / panel_d +
  plot_annotation(
    title = "S1P Pathway Mutations Associate with Disease Stage in DLBCL",
    subtitle = "Retention pathway effect strongest in GCB (Schmitz); Egress pathway effect in pan-DLBCL (Duke); DFCI underpowered",
    caption = paste0(
      "Retention pathway: GNA13, RHOA, S1PR2, P2RY8, ARHGEF1 | ",
      "Egress pathway: GNAI2, CXCR4, S1PR1\n",
      "EZB genetic subtype used as proxy for retention pathway mutations (Schmitz). ",
      "Filled circles = p<0.05; Open circles = NS"
    ),
    theme = theme(
      plot.title = element_text(face = "bold", size = 14, hjust = 0.5),
      plot.subtitle = element_text(size = 10, hjust = 0.5, color = "gray30"),
      plot.caption = element_text(size = 8, hjust = 0.5, color = "gray50")
    )
  ) +
  plot_layout(heights = c(1, 0.9))

ggsave(
  "results/figures/summary_pathway_stage.png",
  combined,
  width = 14,
  height = 10,
  dpi = 300,
  bg = "white"
)

cat("Saved: results/figures/summary_pathway_stage.png\n")

# ============================================================
# Also save as PDF for publication
# ============================================================

ggsave(
  "results/figures/summary_pathway_stage.pdf",
  combined,
  width = 14,
  height = 10
)

cat("Saved: results/figures/summary_pathway_stage.pdf\n")

# ============================================================
# Print Summary Statistics
# ============================================================

cat("\n")
cat("============================================================\n")
cat("SUMMARY: S1P PATHWAY MUTATIONS AND DISEASE STAGE\n")
cat("============================================================\n\n")

cat("SCHMITZ 2018 - GCB-DLBCL (n=80):\n")
cat("  EZB subtype (GNA13/RHOA-enriched): 91.7% late stage (22/24)\n")
cat("  Non-EZB GCB: 60.7% late stage (34/56)\n")
cat(sprintf("  OR = %.2f (95%% CI: %.2f-%.2f), p = %.4f\n\n", ezb_or, ezb_ci_lower, ezb_ci_upper, ezb_p))

cat("DUKE 2017 - Pan-DLBCL (n=974):\n")
cat("  No pathway mutation: 62.9% late stage (489/777)\n")
cat("  Retention pathway: 64.9% late stage (109/168) - OR=1.09, p=0.76\n")
cat("  Egress pathway: 82.8% late stage (24/29) - OR=2.83, p=0.03\n\n")

cat("DFCI 2018 - GCB-DLBCL (n=21):\n")
cat("  No pathway mutation: 45.5% late stage (5/11)\n")
cat("  Retention pathway: 40.0% late stage (4/10) - OR=0.80, p=1.00\n")
cat("  Note: Severely underpowered, no egress mutations in GCB subset\n\n")

cat("KEY FINDINGS:\n")
cat("  1. Schmitz: Strong retention pathway effect in GCB (OR=7.1, p=0.007)\n")
cat("  2. Duke: Retention effect diluted in pan-DLBCL; Egress effect significant\n")
cat("  3. DFCI: Too small to detect effects (n=21 GCB with staging)\n")
cat("  4. Need larger GCB dataset with sample-level mutations for validation\n")
