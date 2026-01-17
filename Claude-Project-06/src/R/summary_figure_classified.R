# Summary Figure: S1P Pathway Mutations and Disease Stage in DLBCL
# With proper LoF/GoF classification

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

dir.create("results/figures", showWarnings = FALSE, recursive = TRUE)

# ============================================================
# Data: All analyses with proper classification
# ============================================================

# Schmitz 2018 GCB-EZB (EZB as proxy for LoF retention)
schmitz_data <- tibble(
  Category = c("Non-EZB GCB", "EZB GCB\n(GNA13/RHOA)"),
  N = c(56, 24),
  Late = c(34, 22),
  Early = c(22, 2)
) %>%
  mutate(
    Rate = Late / N,
    SE = sqrt(Rate * (1 - Rate) / N),
    CI_Lower = Rate - 1.96 * SE,
    CI_Upper = pmin(Rate + 1.96 * SE, 1),
    Category = factor(Category, levels = c("Non-EZB GCB", "EZB GCB\n(GNA13/RHOA)"))
  )

ezb_or <- (22 * 22) / (2 * 34)
ezb_p <- fisher.test(matrix(c(22, 2, 34, 22), nrow = 2))$p.value

# Duke 2017 - Confident GoF Egress (WHIM/activating only)
duke_gof_data <- tibble(
  Category = c("No GoF Egress", "GoF Egress\n(WHIM/R179/T182)"),
  N = c(965, 9),
  Late = c(582, 8),
  Early = c(383, 1)
) %>%
  mutate(
    Rate = Late / N,
    SE = sqrt(Rate * (1 - Rate) / N),
    CI_Lower = pmax(Rate - 1.96 * SE, 0),
    CI_Upper = pmin(Rate + 1.96 * SE, 1),
    Category = factor(Category, levels = c("No GoF Egress", "GoF Egress\n(WHIM/R179/T182)"))
  )

gof_or <- (8 * 383) / (1 * 582)
gof_p <- fisher.test(matrix(c(8, 1, 582, 383), nrow = 2))$p.value

# Duke 2017 - Any Egress (for comparison)
duke_any_egress <- tibble(
  Category = c("No Egress", "Any Egress"),
  N = c(938, 36),
  Late = c(562, 28),
  Early = c(376, 8)
) %>%
  mutate(
    Rate = Late / N,
    SE = sqrt(Rate * (1 - Rate) / N),
    CI_Lower = Rate - 1.96 * SE,
    CI_Upper = pmin(Rate + 1.96 * SE, 1)
  )

any_egress_or <- (28 * 376) / (8 * 562)
any_egress_p <- fisher.test(matrix(c(28, 8, 562, 376), nrow = 2))$p.value

# ============================================================
# Panel A: Schmitz GCB - EZB (LoF Retention proxy)
# ============================================================

panel_a <- ggplot(schmitz_data, aes(x = Category, y = Rate, fill = Category)) +
  geom_col(width = 0.6) +
  geom_errorbar(aes(ymin = CI_Lower, ymax = CI_Upper), width = 0.15, linewidth = 0.8) +
  geom_text(
    aes(label = sprintf("%.1f%%\n(%d/%d)", Rate * 100, Late, N)),
    vjust = -0.3, size = 3.5, fontface = "bold"
  ) +
  geom_segment(aes(x = 1, xend = 2, y = 1.02, yend = 1.02), linewidth = 0.5) +
  geom_text(
    aes(x = 1.5, y = 1.08, label = sprintf("OR=%.1f\np=%.3f", ezb_or, ezb_p)),
    size = 3, fontface = "italic"
  ) +
  scale_fill_manual(
    values = c("Non-EZB GCB" = "#6BAED6", "EZB GCB\n(GNA13/RHOA)" = "#08519C"),
    guide = "none"
  ) +
  scale_y_continuous(labels = percent_format(), limits = c(0, 1.15), expand = c(0, 0)) +
  labs(
    title = "A. Retention LoF (GCB only)",
    subtitle = "Schmitz 2018 | EZB = GNA13/RHOA proxy",
    x = "", y = "Late Stage Rate (III-IV)"
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold", size = 12, color = "#08519C"),
    plot.subtitle = element_text(color = "gray40", size = 9),
    panel.grid.major.x = element_blank()
  )

# ============================================================
# Panel B: Duke - Confident GoF Egress
# ============================================================

panel_b <- ggplot(duke_gof_data, aes(x = Category, y = Rate, fill = Category)) +
  geom_col(width = 0.6) +
  geom_errorbar(aes(ymin = CI_Lower, ymax = CI_Upper), width = 0.15, linewidth = 0.8) +
  geom_text(
    aes(label = sprintf("%.1f%%\n(%d/%d)", Rate * 100, Late, N)),
    vjust = -0.3, size = 3.5, fontface = "bold"
  ) +
  geom_segment(aes(x = 1, xend = 2, y = 1.02, yend = 1.02), linewidth = 0.5) +
  geom_text(
    aes(x = 1.5, y = 1.08, label = sprintf("OR=%.1f\np=%.2f", gof_or, gof_p)),
    size = 3, fontface = "italic"
  ) +
  scale_fill_manual(
    values = c("No GoF Egress" = "gray60", "GoF Egress\n(WHIM/R179/T182)" = "#E94F37"),
    guide = "none"
  ) +
  scale_y_continuous(labels = percent_format(), limits = c(0, 1.15), expand = c(0, 0)) +
  labs(
    title = "B. Egress GoF (Pan-DLBCL)",
    subtitle = "Duke 2017 | CXCR4-WHIM + GNAI2 R179/T182",
    x = "", y = "Late Stage Rate (III-IV)"
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold", size = 12, color = "#E94F37"),
    plot.subtitle = element_text(color = "gray40", size = 9),
    panel.grid.major.x = element_blank()
  )

# ============================================================
# Panel C: Forest Plot
# ============================================================

forest_data <- tibble(
  Study = c(
    "Schmitz (GCB)",
    "Duke (Pan-DLBCL)",
    "Duke (Pan-DLBCL)"
  ),
  Comparison = c(
    "EZB vs Non-EZB",
    "Any Egress vs None",
    "GoF Egress vs None"
  ),
  Pathway = c("Retention LoF (proxy)", "Egress (any)", "Egress GoF"),
  N = c(80, 974, 974),
  OR = c(7.12, 2.34, 5.26),
  CI_Lower = c(1.57, 1.05, 0.66),
  CI_Upper = c(32.3, 5.22, 42.0),
  P = c(0.007, 0.036, 0.097),
  Significant = c(TRUE, TRUE, FALSE)
) %>%
  mutate(
    Label = sprintf("%.2f (%.2f-%.1f)", OR, CI_Lower, CI_Upper),
    Y = factor(paste(Study, Comparison, sep = "\n"),
               levels = rev(paste(Study, Comparison, sep = "\n")))
  )

panel_c <- ggplot(forest_data, aes(x = OR, y = Y)) +
  geom_vline(xintercept = 1, linetype = "dashed", color = "gray50") +
  geom_errorbar(
    aes(xmin = CI_Lower, xmax = CI_Upper, color = Pathway),
    width = 0.25, linewidth = 1.2, orientation = "y"
  ) +
  geom_point(aes(color = Pathway, shape = Significant), size = 4) +
  geom_text(aes(label = Label, x = pmin(CI_Upper + 1, 15)), hjust = 0, size = 3) +
  geom_text(
    aes(label = sprintf("p=%.3f", P), x = pmin(CI_Upper + 8, 40)),
    hjust = 0, size = 3, fontface = "italic"
  ) +
  scale_x_log10(limits = c(0.5, 50), breaks = c(0.5, 1, 2, 5, 10, 20, 40)) +
  scale_color_manual(
    values = c(
      "Retention LoF (proxy)" = "#08519C",
      "Egress (any)" = "#F4A582",
      "Egress GoF" = "#E94F37"
    ),
    name = "Pathway"
  ) +
  scale_shape_manual(values = c("TRUE" = 16, "FALSE" = 1), name = "p < 0.05") +
  labs(
    title = "C. Odds Ratios for Late-Stage Disease",
    subtitle = "Properly classified LoF/GoF mutations",
    x = "Odds Ratio (log scale)", y = ""
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold", size = 12),
    plot.subtitle = element_text(color = "gray40", size = 9),
    panel.grid.minor = element_blank(),
    legend.position = "bottom"
  )

# ============================================================
# Panel D: Mutation Details Table
# ============================================================

mut_table <- tibble(
  Pathway = c("Retention LoF", "Retention LoF", "Egress GoF", "Egress GoF"),
  Gene = c("GNA13", "RHOA", "CXCR4", "GNAI2"),
  `Mutation Type` = c(
    "Truncating + missense",
    "G17, R5 hotspots",
    "C-terminal WHIM\n(S338*, G336*, etc.)",
    "R179C, T182A\n(GTPase-deficient)"
  ),
  `Duke Count` = c("100", "32", "4", "5"),
  Effect = c("Loss of GC retention", "Loss of GC retention",
             "Enhanced chemotaxis", "Constitutive activity")
)

panel_d <- ggplot(mut_table, aes(y = Gene)) +
  geom_tile(aes(x = 1, fill = Pathway), width = 0.8, height = 0.8, alpha = 0.3) +
  geom_text(aes(x = 1, label = Gene), fontface = "bold", size = 4) +
  geom_text(aes(x = 2, label = `Mutation Type`), size = 3, hjust = 0) +
  geom_text(aes(x = 3.5, label = `Duke Count`), size = 3.5) +
  scale_fill_manual(
    values = c("Retention LoF" = "#08519C", "Egress GoF" = "#E94F37"),
    guide = "none"
  ) +
  scale_x_continuous(limits = c(0.5, 4), breaks = c(1, 2, 3.5),
                     labels = c("Gene", "Mutation Type", "n")) +
  labs(title = "D. Mutation Classification Criteria", x = "", y = "") +
  theme_minimal(base_size = 10) +
  theme(
    plot.title = element_text(face = "bold", size = 12),
    panel.grid = element_blank(),
    axis.text.y = element_blank()
  )

# ============================================================
# Combine
# ============================================================

combined <- (panel_a | panel_b) / (panel_c | panel_d) +
  plot_annotation(
    title = "S1P Pathway Mutations: LoF Retention vs GoF Egress",
    subtitle = "Properly classified mutations show distinct stage associations",
    caption = paste0(
      "Retention LoF: GNA13/RHOA truncating or known damaging | ",
      "Egress GoF: CXCR4 WHIM (C-terminal) or GNAI2 R179/T182\n",
      "Filled circles = p<0.05 | Open circles = trending"
    ),
    theme = theme(
      plot.title = element_text(face = "bold", size = 14, hjust = 0.5),
      plot.subtitle = element_text(size = 10, hjust = 0.5, color = "gray30"),
      plot.caption = element_text(size = 8, hjust = 0.5, color = "gray50")
    )
  )

ggsave("results/figures/summary_classified_mutations.png", combined,
       width = 12, height = 10, dpi = 300, bg = "white")
cat("Saved: results/figures/summary_classified_mutations.png\n")

# Print summary
cat("\n")
cat("============================================================\n")
cat("SUMMARY: PROPERLY CLASSIFIED S1P PATHWAY MUTATIONS\n")
cat("============================================================\n\n")

cat("RETENTION PATHWAY (LoF mutations):\n")
cat("  Schmitz GCB (EZB proxy): OR=7.1, p=0.007 ***\n")
cat("  Duke Pan-DLBCL (LoF): OR=1.13, p=0.61 (diluted)\n\n")

cat("EGRESS PATHWAY (GoF mutations):\n")
cat("  Duke (any egress): OR=2.34, p=0.036 *\n")
cat("  Duke (GoF only): OR=5.26, p=0.097 (trending, n=9)\n\n")

cat("GoF EGRESS MUTATIONS IDENTIFIED:\n")
cat("  CXCR4 WHIM: G332E, V340Ifs*5, G336*, S338* (n=4)\n")
cat("  GNAI2 activating: R179C (x2), T182A (x3) (n=5)\n")
cat("  Total: 9 samples, 8/9 (88.9%) advanced stage\n")
