# =============================================================================
# REMoDL-B BCL2 (EZB-equivalent) Subset Survival Analysis
# Testing if Retention/Egress Score predicts survival in BCL2-classified patients
# =============================================================================

cat("=============================================================\n")
cat("REMoDL-B BCL2 Subset Survival Analysis\n")
cat("=============================================================\n\n")

library(survival)
library(dplyr)

sha_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Sha_REMoDL-B"
processed_dir <- file.path(sha_dir, "data/processed")
figures_dir <- file.path(sha_dir, "figures")

# Create figures directory if needed
if (!dir.exists(figures_dir)) dir.create(figures_dir, recursive = TRUE)

# =============================================================================
# Load and Merge Data
# =============================================================================

# Load pathway mutation data
pathway_data <- read.csv(file.path(processed_dir, "sha_pathway_mutations.csv"),
                          stringsAsFactors = FALSE)
cat("Pathway data:", nrow(pathway_data), "patients\n")

# Load clinical data
clinical <- read.csv(file.path(processed_dir, "sha_pmc_clinical.csv"),
                      stringsAsFactors = FALSE)
cat("Clinical data:", nrow(clinical), "patients\n")

# Merge on PatientID = PID
merged_data <- merge(pathway_data, clinical,
                      by.x = "PatientID", by.y = "PID",
                      all.x = TRUE)
cat("Merged data:", nrow(merged_data), "patients\n")

# Convert OS_time from days to months
merged_data$OS_MONTHS <- merged_data$OS_time / 30.44
merged_data$OS_EVENT <- merged_data$OS_status

# Use cluster_ICL for subtype assignment (BCL2 = EZB equivalent)
cat("\nCluster distribution (ICL):\n")
print(table(merged_data$cluster_ICL, useNA = "ifany"))

# =============================================================================
# BCL2 (EZB-equivalent) Subset Analysis
# =============================================================================

cat("\n--- BCL2 SUBSET ANALYSIS ---\n\n")

bcl2_data <- merged_data %>%
  filter(cluster_ICL == "BCL2") %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT))

cat("BCL2 patients with survival data:", nrow(bcl2_data), "\n")
cat("Events (deaths):", sum(bcl2_data$OS_EVENT), "\n")
cat("Median follow-up:", round(median(bcl2_data$OS_MONTHS), 1), "months\n\n")

# Pathway score distribution
cat("Pathway Score (Combined) distribution in BCL2:\n")
print(table(bcl2_data$Combined))

cat("\nWith pathway mutations:", sum(bcl2_data$Combined > 0), "(",
    round(100*sum(bcl2_data$Combined > 0)/nrow(bcl2_data), 1), "%)\n")

# Individual gene mutations in BCL2
cat("\nIndividual gene mutations in BCL2 subset:\n")
cat("  GNA13:", sum(bcl2_data$GNA13, na.rm = TRUE), "\n")
cat("  RHOA:", sum(bcl2_data$RHOA, na.rm = TRUE), "\n")
cat("  P2RY8:", sum(bcl2_data$P2RY8, na.rm = TRUE), "\n")
cat("  CXCR4:", sum(bcl2_data$CXCR4, na.rm = TRUE), "\n")

# -----------------------------------------------------------------------------
# Analysis 1: Any Pathway Mutation
# -----------------------------------------------------------------------------

cat("\n--- Analysis 1: Any Pathway Mutation in BCL2 ---\n\n")

bcl2_data$pathway_group <- ifelse(bcl2_data$Combined > 0, "Pathway Mutated", "No Mutation")
print(table(bcl2_data$pathway_group))

n_mut <- sum(bcl2_data$pathway_group == "Pathway Mutated")
n_nomut <- sum(bcl2_data$pathway_group == "No Mutation")

if (n_mut >= 3 && n_nomut >= 3) {
  fit1 <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ pathway_group, data = bcl2_data)
  logrank1 <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ pathway_group, data = bcl2_data)
  pval1 <- 1 - pchisq(logrank1$chisq, df = 1)

  cat("\nLog-rank p-value:", format(pval1, digits = 3), "\n")
  cat("\nSurvival summary:\n")
  print(summary(fit1)$table[, c("records", "events", "median", "0.95LCL", "0.95UCL")])

  # Plot
  png(file.path(figures_dir, "km_bcl2_pathway_mutation.png"), width = 800, height = 600)
  plot(fit1, col = c("#2E9FDF", "#E7B800"), lwd = 3, mark.time = TRUE,
       xlab = "Time (Months)", ylab = "Overall Survival",
       main = paste0("REMoDL-B BCL2 Subset: Pathway Mutation vs No Mutation\n",
                     "(n=", nrow(bcl2_data), ", Log-rank p = ", format(pval1, digits = 3), ")"))
  legend("bottomleft", legend = c(
    paste0("No Mutation (n=", n_nomut, ")"),
    paste0("Pathway Mutated (n=", n_mut, ")")
  ), col = c("#2E9FDF", "#E7B800"), lwd = 3, bty = "n")
  dev.off()
  cat("\nSaved: km_bcl2_pathway_mutation.png\n")
} else {
  pval1 <- NA
  cat("Insufficient patients in one group for comparison\n")
}

# -----------------------------------------------------------------------------
# Analysis 2: Score Categories (0 vs 1 vs 2+)
# -----------------------------------------------------------------------------

cat("\n--- Analysis 2: Score Categories in BCL2 ---\n\n")

bcl2_data$score_cat <- case_when(
  bcl2_data$Combined == 0 ~ "Score 0",
  bcl2_data$Combined == 1 ~ "Score 1",
  bcl2_data$Combined >= 2 ~ "Score 2+"
)

print(table(bcl2_data$score_cat))

n0 <- sum(bcl2_data$score_cat == "Score 0", na.rm = TRUE)
n1 <- sum(bcl2_data$score_cat == "Score 1", na.rm = TRUE)
n2 <- sum(bcl2_data$score_cat == "Score 2+", na.rm = TRUE)

if (sum(c(n0, n1, n2) >= 3) >= 2) {
  fit2 <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ score_cat, data = bcl2_data)
  logrank2 <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ score_cat, data = bcl2_data)
  pval2 <- 1 - pchisq(logrank2$chisq, df = length(unique(bcl2_data$score_cat)) - 1)

  cat("\nLog-rank p-value:", format(pval2, digits = 3), "\n")

  # Plot
  png(file.path(figures_dir, "km_bcl2_score_categories.png"), width = 800, height = 600)
  plot(fit2, col = c("forestgreen", "orange", "red"), lwd = 3, mark.time = TRUE,
       xlab = "Time (Months)", ylab = "Overall Survival",
       main = paste0("REMoDL-B BCL2 Subset: Survival by Pathway Score\n",
                     "(n=", nrow(bcl2_data), ", Log-rank p = ", format(pval2, digits = 3), ")"))
  legend("bottomleft", legend = c(
    paste0("Score 0 (n=", n0, ")"),
    paste0("Score 1 (n=", n1, ")"),
    paste0("Score 2+ (n=", n2, ")")
  ), col = c("forestgreen", "orange", "red"), lwd = 3, bty = "n")
  dev.off()
  cat("Saved: km_bcl2_score_categories.png\n")
} else {
  pval2 <- NA
  cat("Insufficient patients in groups for stratified analysis\n")
}

# -----------------------------------------------------------------------------
# Analysis 3: Binary High vs Low
# -----------------------------------------------------------------------------

cat("\n--- Analysis 3: High (>=2) vs Low (0-1) in BCL2 ---\n\n")

bcl2_data$score_high <- ifelse(bcl2_data$Combined >= 2, "High (>=2)", "Low (0-1)")
print(table(bcl2_data$score_high))

n_high <- sum(bcl2_data$score_high == "High (>=2)")
n_low <- sum(bcl2_data$score_high == "Low (0-1)")

if (n_high >= 3 && n_low >= 3) {
  fit3 <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ score_high, data = bcl2_data)
  logrank3 <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ score_high, data = bcl2_data)
  pval3 <- 1 - pchisq(logrank3$chisq, df = 1)

  cat("\nLog-rank p-value:", format(pval3, digits = 3), "\n")

  # Median survival
  cat("\nMedian survival by category:\n")
  print(summary(fit3)$table[, c("records", "events", "median", "0.95LCL", "0.95UCL")])

  # Plot
  png(file.path(figures_dir, "km_bcl2_high_vs_low.png"), width = 800, height = 600)
  plot(fit3, col = c("red", "forestgreen"), lwd = 3, mark.time = TRUE,
       xlab = "Time (Months)", ylab = "Overall Survival",
       main = paste0("REMoDL-B BCL2: High vs Low Pathway Score\n",
                     "(Log-rank p = ", format(pval3, digits = 3), ")"))
  legend("bottomleft", legend = c(
    paste0("High >=2 (n=", n_high, ")"),
    paste0("Low 0-1 (n=", n_low, ")")
  ), col = c("red", "forestgreen"), lwd = 3, bty = "n")
  dev.off()
  cat("Saved: km_bcl2_high_vs_low.png\n")
} else {
  pval3 <- NA
  cat("Too few patients with Score >=2 for this analysis (n=", n_high, ")\n")
}

# -----------------------------------------------------------------------------
# Cox Regression in BCL2
# -----------------------------------------------------------------------------

cat("\n--- Cox Regression in BCL2 Subset ---\n\n")

if (sum(bcl2_data$Combined > 0) >= 5) {
  cox_bcl2 <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ Combined, data = bcl2_data)
  cat("Univariate - Pathway Score (continuous) in BCL2:\n")
  print(summary(cox_bcl2))

  # HR per unit increase
  hr <- exp(coef(cox_bcl2))
  hr_ci <- exp(confint(cox_bcl2))
  cat("\nHazard Ratio per 1-unit score increase:", round(hr, 2),
      "(95% CI:", round(hr_ci[1], 2), "-", round(hr_ci[2], 2), ")\n")
}

# =============================================================================
# Compare to Other Subtypes
# =============================================================================

cat("\n--- Comparison Across All Subtypes ---\n\n")

subtype_results <- data.frame()

for (subtype in unique(merged_data$cluster_ICL)) {
  if (is.na(subtype)) next

  sub_data <- merged_data %>%
    filter(cluster_ICL == subtype) %>%
    filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT))

  if (nrow(sub_data) >= 20) {
    sub_data$pathway_mut <- ifelse(sub_data$Combined > 0, 1, 0)

    if (sum(sub_data$pathway_mut) >= 3 && sum(sub_data$pathway_mut) < nrow(sub_data) - 3) {
      fit <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ pathway_mut, data = sub_data)
      pval <- 1 - pchisq(fit$chisq, df = 1)
    } else {
      pval <- NA
    }

    # Direction of effect
    if (!is.na(pval) && sum(sub_data$pathway_mut) >= 3) {
      surv_mut <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ 1, data = sub_data[sub_data$pathway_mut == 1,])
      surv_nomut <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ 1, data = sub_data[sub_data$pathway_mut == 0,])
      direction <- ifelse(summary(surv_mut)$table["median"] < summary(surv_nomut)$table["median"],
                          "Worse", "Better")
    } else {
      direction <- NA
    }

    subtype_results <- rbind(subtype_results, data.frame(
      Subtype = subtype,
      N = nrow(sub_data),
      N_pathway_mut = sum(sub_data$pathway_mut),
      Pct_mut = round(100 * sum(sub_data$pathway_mut) / nrow(sub_data), 1),
      P_value = pval,
      Direction = direction,
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
cat("REMoDL-B BCL2 SUBSET SURVIVAL ANALYSIS SUMMARY\n")
cat("=============================================================\n\n")

cat("BCL2 patients analyzed:", nrow(bcl2_data), "\n")
cat("Deaths:", sum(bcl2_data$OS_EVENT), "(", round(100*sum(bcl2_data$OS_EVENT)/nrow(bcl2_data), 1), "%)\n")
cat("Median follow-up:", round(median(bcl2_data$OS_MONTHS), 1), "months\n\n")

cat("Pathway mutations in BCL2:\n")
cat("  - Any mutation:", sum(bcl2_data$Combined > 0), "(",
    round(100*sum(bcl2_data$Combined > 0)/nrow(bcl2_data), 1), "%)\n")
cat("  - Score 2+:", sum(bcl2_data$Combined >= 2), "\n\n")

cat("P-values:\n")
if (!is.na(pval1)) cat("  - Any pathway mutation:", format(pval1, digits = 3), "\n")
if (exists("pval2") && !is.na(pval2)) cat("  - Score categories (0/1/2+):", format(pval2, digits = 3), "\n")
if (exists("pval3") && !is.na(pval3)) cat("  - High vs Low:", format(pval3, digits = 3), "\n")

# Interpretation
cat("\n--- INTERPRETATION ---\n\n")

pvals <- c(pval1, if(exists("pval2")) pval2 else NA, if(exists("pval3")) pval3 else NA)
sig_found <- any(pvals < 0.05, na.rm = TRUE)
trend_found <- any(pvals < 0.1, na.rm = TRUE)

if (sig_found) {
  cat("SIGNIFICANT ASSOCIATION DETECTED in REMoDL-B BCL2 subset!\n")
  cat("This provides validation of the Chapuy finding.\n")
} else if (trend_found) {
  cat("TREND toward significance (p < 0.1) in REMoDL-B BCL2 subset.\n")
} else {
  cat("No significant association in REMoDL-B BCL2 subset.\n")
  cat("Consider:\n")
  cat("  1. REMoDL-B uses different classification method\n")
  cat("  2. Treatment differences (R-CHOP era, UK cohort)\n")
  cat("  3. Fewer pathway mutations detectable with 293-gene panel\n")
}

cat("\nFigures saved to:", figures_dir, "\n")
