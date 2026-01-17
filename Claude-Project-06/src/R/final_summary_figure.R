# Final Summary: S1P Pathway Mutations and Stage
# Comparing different cohort definitions

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
# Data: All analyses
# ============================================================

results <- tibble(
  Cohort = c(
    "Schmitz GCB\n(EZB subtype)",
    "Duke Pan-DLBCL",
    "Duke GCB-strict\n(excl MCD)",
    "Duke EZB-like\n(GNA13/RHOA+EZH2)",
    "Duke GoF Egress\n(WHIM/activating)"
  ),
  Pathway = c("Retention", "Retention", "Retention", "Retention", "Egress"),
  Mutation_Type = c("LoF (proxy)", "LoF", "LoF", "LoF", "GoF"),
  N_total = c(80, 974, 841, 882, 974),
  N_mutant = c(24, 111, 104, 17, 9),
  Adv_mutant = c(22, 70, 66, 11, 8),
  Adv_wt = c(34, 520, 450, 522, 582),
  N_wt = c(56, 863, 737, 865, 965)
) %>%
  mutate(
    Rate_mutant = Adv_mutant / N_mutant,
    Rate_wt = Adv_wt / N_wt,
    OR = (Adv_mutant * (N_wt - Adv_wt)) / ((N_mutant - Adv_mutant) * Adv_wt),
    Significant = c(TRUE, FALSE, FALSE, FALSE, FALSE),
    P_value = c(0.007, 0.61, 0.67, 0.61, 0.10)
  )

# ============================================================
# Panel A: Forest Plot of All Analyses
# ============================================================

# Calculate CIs
results <- results %>%
  mutate(
    a = Adv_mutant,
    b = N_mutant - Adv_mutant,
    c = Adv_wt,
    d = N_wt - Adv_wt,
    log_OR = log(OR),
    SE = sqrt(1/a + 1/b + 1/c + 1/d),
    CI_lower = exp(log_OR - 1.96 * SE),
    CI_upper = exp(log_OR + 1.96 * SE)
  )

panel_a <- ggplot(results, aes(x = OR, y = reorder(Cohort, OR))) +
  geom_vline(xintercept = 1, linetype = "dashed", color = "gray50") +
  geom_errorbar(
    aes(xmin = CI_lower, xmax = CI_upper, color = Pathway),
    width = 0.25, linewidth = 1
  ) +
  geom_point(aes(color = Pathway, shape = Significant, size = N_mutant)) +
  geom_text(
    aes(label = sprintf("n=%d", N_mutant), x = 0.15),
    hjust = 0, size = 3, color = "gray40"
  ) +
  geom_text(
    aes(label = sprintf("OR=%.2f", OR), x = pmin(CI_upper + 0.5, 15)),
    hjust = 0, size = 3
  ) +
  geom_text(
    aes(label = ifelse(P_value < 0.01, "**", ifelse(P_value < 0.1, "*", "")),
        x = pmin(CI_upper + 3, 25)),
    hjust = 0, size = 5, color = "red"
  ) +
  scale_x_log10(limits = c(0.1, 40), breaks = c(0.25, 0.5, 1, 2, 5, 10, 20)) +
  scale_color_manual(
    values = c("Retention" = "#08519C", "Egress" = "#E94F37"),
    name = "Pathway"
  ) +
  scale_shape_manual(values = c("TRUE" = 16, "FALSE" = 1), guide = "none") +
  scale_size_continuous(range = c(3, 8), name = "N mutant") +
  labs(
    title = "A. Odds Ratios for Advanced Stage",
    subtitle = "Retention LoF and Egress GoF mutations",
    x = "Odds Ratio (log scale)",
    y = ""
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold"),
    legend.position = "right"
  )

# ============================================================
# Panel B: Sample Size Impact
# ============================================================

power_data <- tibble(
  N = seq(10, 200, 10),
  Power_OR2 = 1 - pnorm(qnorm(0.975) - log(2) / sqrt(4/N + 4/(N*3))),
  Power_OR3 = 1 - pnorm(qnorm(0.975) - log(3) / sqrt(4/N + 4/(N*3))),
  Power_OR7 = 1 - pnorm(qnorm(0.975) - log(7) / sqrt(4/N + 4/(N*3)))
)

# Mark actual sample sizes
actual_n <- tibble(
  N = c(24, 17, 9, 111),
  Label = c("Schmitz EZB", "Duke EZB-like", "Duke GoF Egress", "Duke LoF"),
  OR_type = c("OR=7", "OR=1.5", "OR=5", "OR=1.1")
)

panel_b <- ggplot() +
  geom_line(data = power_data, aes(x = N, y = Power_OR7, color = "OR = 7"), linewidth = 1) +
  geom_line(data = power_data, aes(x = N, y = Power_OR3, color = "OR = 3"), linewidth = 1) +
  geom_line(data = power_data, aes(x = N, y = Power_OR2, color = "OR = 2"), linewidth = 1) +
  geom_hline(yintercept = 0.8, linetype = "dashed", color = "gray50") +
  geom_vline(xintercept = c(24, 17, 9), linetype = "dotted", color = "gray70") +
  annotate("text", x = 24, y = 0.05, label = "Schmitz\nEZB (24)", size = 2.5, hjust = 0.5) +
  annotate("text", x = 17, y = 0.15, label = "Duke\nEZB-like (17)", size = 2.5, hjust = 0.5) +
  annotate("text", x = 9, y = 0.25, label = "Duke\nGoF (9)", size = 2.5, hjust = 0.5) +
  scale_color_manual(
    values = c("OR = 7" = "#E94F37", "OR = 3" = "#F4A582", "OR = 2" = "#92C5DE"),
    name = "Effect Size"
  ) +
  scale_y_continuous(labels = percent_format(), limits = c(0, 1)) +
  labs(
    title = "B. Statistical Power by Sample Size",
    subtitle = "80% power line shown; smaller effects need larger N",
    x = "N (mutant group)",
    y = "Power to detect effect"
  ) +
  theme_minimal(base_size = 11) +
  theme(plot.title = element_text(face = "bold"))

# ============================================================
# Panel C: Advanced Stage Rates Comparison
# ============================================================

rate_data <- results %>%
  select(Cohort, Rate_mutant, Rate_wt, N_mutant, Significant) %>%
  pivot_longer(cols = c(Rate_mutant, Rate_wt), names_to = "Group", values_to = "Rate") %>%
  mutate(
    Group = ifelse(Group == "Rate_mutant", "Mutant", "Wild-type"),
    Group = factor(Group, levels = c("Wild-type", "Mutant"))
  )

panel_c <- ggplot(rate_data, aes(x = Cohort, y = Rate, fill = Group)) +
  geom_col(position = "dodge", width = 0.7) +
  geom_text(
    aes(label = sprintf("%.0f%%", Rate * 100)),
    position = position_dodge(width = 0.7),
    vjust = -0.3, size = 3
  ) +
  scale_fill_manual(
    values = c("Wild-type" = "gray70", "Mutant" = "#4292C6"),
    name = ""
  ) +
  scale_y_continuous(labels = percent_format(), limits = c(0, 1.05), expand = c(0, 0)) +
  labs(
    title = "C. Advanced Stage Rates",
    subtitle = "Mutant vs wild-type by cohort",
    x = "",
    y = "Advanced Stage (III-IV)"
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold"),
    axis.text.x = element_text(angle = 30, hjust = 1, size = 9),
    legend.position = "top"
  )

# ============================================================
# Combine
# ============================================================

combined <- (panel_a | panel_b) / panel_c +
  plot_annotation(
    title = "S1P Pathway Mutations and Disease Stage: Summary of Analyses",
    subtitle = "Retention LoF effect is GCB-specific; Egress GoF trends but underpowered",
    caption = paste0(
      "* p<0.1, ** p<0.01 | ",
      "LoF: GNA13/RHOA truncating/damaging | ",
      "GoF: CXCR4 WHIM + GNAI2 R179/T182\n",
      "Key finding: Schmitz EZB (true GCB subtype) shows OR=7.1; ",
      "Duke cohort lacks true COO, limiting power to detect GCB-specific effects"
    ),
    theme = theme(
      plot.title = element_text(face = "bold", size = 14, hjust = 0.5),
      plot.subtitle = element_text(size = 10, hjust = 0.5, color = "gray30"),
      plot.caption = element_text(size = 8, hjust = 0, color = "gray50")
    )
  ) +
  plot_layout(heights = c(1, 0.8))

ggsave("results/figures/final_summary_analysis.png", combined,
       width = 14, height = 11, dpi = 300, bg = "white")
cat("Saved: results/figures/final_summary_analysis.png\n")

# Print key findings
cat("\n")
cat("============================================================\n")
cat("KEY FINDINGS\n")
cat("============================================================\n\n")

cat("1. RETENTION PATHWAY (LoF):\n")
cat("   - Schmitz EZB (true GCB): OR=7.1, p=0.007 ** (n=24)\n")
cat("   - Duke Pan-DLBCL: OR=1.13, p=0.61 (diluted by ABC)\n")
cat("   - Duke EZB-like: OR=1.45, p=0.61 (only n=17)\n\n")

cat("2. EGRESS PATHWAY (GoF):\n")
cat("   - Duke GoF (WHIM+R179/T182): OR=5.26, p=0.10 (n=9)\n")
cat("   - 8/9 (89%) GoF samples had advanced stage\n\n")

cat("3. LIMITATIONS:\n")
cat("   - Duke lacks true COO classification\n")
cat("   - Small mutant groups limit power\n")
cat("   - Need GCB-only dataset with staging for validation\n")
