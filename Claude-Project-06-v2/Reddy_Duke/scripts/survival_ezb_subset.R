# =============================================================================
# Duke DLBCL Survival Analysis - EZB Subset Only
# Testing if Egress Score predicts survival in EZB-classified patients
# =============================================================================

cat("=============================================================\n")
cat("Duke EZB Subset Survival Analysis\n")
cat("=============================================================\n\n")

library(survival)
library(dplyr)

duke_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Duke"
processed_dir <- file.path(duke_dir, "data/processed")
figures_dir <- file.path(duke_dir, "figures")

# Load classified data
duke_data <- read.csv(file.path(processed_dir, "duke_classified.csv"), stringsAsFactors = FALSE)
cat("Total patients:", nrow(duke_data), "\n\n")

# =============================================================================
# EZB Subset Analysis
# =============================================================================

cat("--- EZB SUBSET ANALYSIS (Strict Classification) ---\n\n")

ezb_data <- duke_data %>%
  filter(Subtype_strict == "EZB") %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT))

cat("EZB patients with survival data:", nrow(ezb_data), "\n")
cat("Events (deaths):", sum(ezb_data$OS_EVENT), "\n")
cat("Median follow-up:", round(median(ezb_data$OS_MONTHS), 1), "months\n\n")

# Egress Score distribution
cat("Egress Score distribution in EZB:\n")
print(table(ezb_data$Egress_Score))

cat("\nWith pathway mutations:", sum(ezb_data$Egress_Score > 0), "(",
    round(100*sum(ezb_data$Egress_Score > 0)/nrow(ezb_data), 1), "%)\n")

# -----------------------------------------------------------------------------
# Analysis 1: Any Pathway Mutation
# -----------------------------------------------------------------------------

cat("\n--- Analysis 1: Any Pathway Mutation in EZB ---\n\n")

ezb_data$pathway_group <- ifelse(ezb_data$Egress_Score > 0, "Pathway Mutated", "No Mutation")
print(table(ezb_data$pathway_group))

fit1 <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ pathway_group, data = ezb_data)
logrank1 <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ pathway_group, data = ezb_data)
pval1 <- 1 - pchisq(logrank1$chisq, df = 1)

cat("\nLog-rank p-value:", format(pval1, digits = 3), "\n")
cat("\nMedian survival:\n")
print(summary(fit1)$table[, c("records", "events", "median", "0.95LCL", "0.95UCL")])

# Plot
png(file.path(figures_dir, "km_ezb_pathway_mutation.png"), width = 800, height = 600)
plot(fit1, col = c("#2E9FDF", "#E7B800"), lwd = 3, mark.time = TRUE,
     xlab = "Time (Months)", ylab = "Overall Survival",
     main = paste0("Duke EZB Subset: Pathway Mutation vs No Mutation\n",
                   "(n=", nrow(ezb_data), ", Log-rank p = ", format(pval1, digits = 3), ")"))
legend("bottomleft", legend = c(
  paste0("No Mutation (n=", sum(ezb_data$pathway_group == "No Mutation"), ")"),
  paste0("Pathway Mutated (n=", sum(ezb_data$pathway_group == "Pathway Mutated"), ")")
), col = c("#2E9FDF", "#E7B800"), lwd = 3, bty = "n")
dev.off()
cat("Saved: km_ezb_pathway_mutation.png\n")

# -----------------------------------------------------------------------------
# Analysis 2: Egress Score Categories (0 vs 1 vs 2+)
# -----------------------------------------------------------------------------

cat("\n--- Analysis 2: Egress Score Categories in EZB ---\n\n")

ezb_data$egress_cat <- case_when(
  ezb_data$Egress_Score == 0 ~ "Score 0",
  ezb_data$Egress_Score == 1 ~ "Score 1",
  ezb_data$Egress_Score >= 2 ~ "Score 2+"
)

print(table(ezb_data$egress_cat))

fit2 <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ egress_cat, data = ezb_data)
logrank2 <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ egress_cat, data = ezb_data)
pval2 <- 1 - pchisq(logrank2$chisq, df = 2)

cat("\nLog-rank p-value:", format(pval2, digits = 3), "\n")

# Get counts per group
n0 <- sum(ezb_data$egress_cat == "Score 0")
n1 <- sum(ezb_data$egress_cat == "Score 1")
n2 <- sum(ezb_data$egress_cat == "Score 2+")

# Plot
png(file.path(figures_dir, "km_ezb_egress_score.png"), width = 800, height = 600)
plot(fit2, col = c("forestgreen", "orange", "red"), lwd = 3, mark.time = TRUE,
     xlab = "Time (Months)", ylab = "Overall Survival",
     main = paste0("Duke EZB Subset: Survival by Egress Score\n",
                   "(n=", nrow(ezb_data), ", Log-rank p = ", format(pval2, digits = 3), ")"))
legend("bottomleft", legend = c(
  paste0("Score 0 (n=", n0, ")"),
  paste0("Score 1 (n=", n1, ")"),
  paste0("Score 2+ (n=", n2, ")")
), col = c("forestgreen", "orange", "red"), lwd = 3, bty = "n")
dev.off()
cat("Saved: km_ezb_egress_score.png\n")

# -----------------------------------------------------------------------------
# Analysis 3: Binary High vs Low
# -----------------------------------------------------------------------------

cat("\n--- Analysis 3: High (>=2) vs Low (0-1) in EZB ---\n\n")

ezb_data$egress_high <- ifelse(ezb_data$Egress_Score >= 2, "High (>=2)", "Low (0-1)")
print(table(ezb_data$egress_high))

fit3 <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ egress_high, data = ezb_data)
logrank3 <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ egress_high, data = ezb_data)
pval3 <- 1 - pchisq(logrank3$chisq, df = 1)

cat("\nLog-rank p-value:", format(pval3, digits = 3), "\n")

# Median survival
cat("\nMedian survival by Egress category:\n")
print(summary(fit3)$table[, c("records", "events", "median", "0.95LCL", "0.95UCL")])

# Plot
png(file.path(figures_dir, "km_ezb_high_vs_low.png"), width = 800, height = 600)
plot(fit3, col = c("red", "forestgreen"), lwd = 3, mark.time = TRUE,
     xlab = "Time (Months)", ylab = "Overall Survival",
     main = paste0("Duke EZB: High vs Low Egress Score\n",
                   "(Log-rank p = ", format(pval3, digits = 3), ")"))
legend("bottomleft", legend = c(
  paste0("High >=2 (n=", sum(ezb_data$egress_high == "High (>=2)"), ")"),
  paste0("Low 0-1 (n=", sum(ezb_data$egress_high == "Low (0-1)"), ")")
), col = c("red", "forestgreen"), lwd = 3, bty = "n")
dev.off()
cat("Saved: km_ezb_high_vs_low.png\n")

# -----------------------------------------------------------------------------
# Cox Regression in EZB
# -----------------------------------------------------------------------------

cat("\n--- Cox Regression in EZB Subset ---\n\n")

cox_ezb <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ Egress_Score, data = ezb_data)
cat("Univariate - Egress Score in EZB:\n")
print(summary(cox_ezb))

# With IPI if available
if ("IPI" %in% names(ezb_data)) {
  ezb_complete <- ezb_data %>% filter(!is.na(IPI))
  if (nrow(ezb_complete) > 20) {
    cat("\n\nMultivariate - Egress Score + IPI in EZB:\n")
    cox_multi <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ Egress_Score + IPI, data = ezb_complete)
    print(summary(cox_multi))
  }
}

# =============================================================================
# Compare to Other Subtypes
# =============================================================================

cat("\n--- Comparison Across Subtypes ---\n\n")

subtype_results <- data.frame()

for (subtype in c("EZB", "MCD", "MCD-like", "BN2", "ST2", "TP53", "Other")) {
  sub_data <- duke_data %>%
    filter(Subtype_strict == subtype) %>%
    filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT))

  if (nrow(sub_data) >= 20) {
    sub_data$pathway_mut <- ifelse(sub_data$Egress_Score > 0, 1, 0)

    if (sum(sub_data$pathway_mut) >= 3 && sum(sub_data$pathway_mut) < nrow(sub_data) - 3) {
      fit <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ pathway_mut, data = sub_data)
      pval <- 1 - pchisq(fit$chisq, df = 1)
    } else {
      pval <- NA
    }

    subtype_results <- rbind(subtype_results, data.frame(
      Subtype = subtype,
      N = nrow(sub_data),
      N_pathway_mut = sum(sub_data$pathway_mut),
      Pct_mut = round(100 * sum(sub_data$pathway_mut) / nrow(sub_data), 1),
      P_value = pval,
      stringsAsFactors = FALSE
    ))
  }
}

cat("Pathway mutation association with survival by subtype:\n")
print(subtype_results)

# =============================================================================
# Summary
# =============================================================================

cat("\n=============================================================\n")
cat("DUKE EZB SUBSET SURVIVAL ANALYSIS SUMMARY\n")
cat("=============================================================\n\n")

cat("EZB patients analyzed:", nrow(ezb_data), "\n")
cat("Deaths:", sum(ezb_data$OS_EVENT), "(", round(100*sum(ezb_data$OS_EVENT)/nrow(ezb_data), 1), "%)\n")
cat("Median follow-up:", round(median(ezb_data$OS_MONTHS), 1), "months\n\n")

cat("Pathway mutations in EZB:\n")
cat("  - Any mutation:", sum(ezb_data$Egress_Score > 0), "(",
    round(100*sum(ezb_data$Egress_Score > 0)/nrow(ezb_data), 1), "%)\n")
cat("  - Egress Score 2+:", sum(ezb_data$Egress_Score >= 2), "\n\n")

cat("P-values:\n")
cat("  - Any pathway mutation:", format(pval1, digits = 3), "\n")
cat("  - Egress Score (0/1/2+):", format(pval2, digits = 3), "\n")
cat("  - High vs Low:", format(pval3, digits = 3), "\n")

# Interpretation
cat("\n--- INTERPRETATION ---\n\n")
if (pval1 < 0.05 || pval2 < 0.05 || pval3 < 0.05) {
  cat("SIGNIFICANT ASSOCIATION DETECTED in Duke EZB subset!\n")
  cat("This VALIDATES the Chapuy finding.\n")
} else if (pval1 < 0.1 || pval2 < 0.1 || pval3 < 0.1) {
  cat("TREND toward significance (p < 0.1) in Duke EZB subset.\n")
  cat("Direction is consistent with Chapuy but underpowered.\n")
} else {
  cat("No significant association in Duke EZB subset.\n")
  cat("Possible reasons:\n")
  cat("  1. Classification may not perfectly match Chapuy clusters\n")
  cat("  2. Duke variant calling issues (P2RY8, etc.)\n")
  cat("  3. Different treatment regimens\n")
  cat("  4. True lack of effect in this cohort\n")
}

cat("\nFigures saved to:", figures_dir, "\n")
