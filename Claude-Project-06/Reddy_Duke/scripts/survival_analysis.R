# =============================================================================
# Duke DLBCL Survival Analysis - Egress Score
# Using base R graphics (no survminer dependency)
# =============================================================================

cat("=============================================================\n")
cat("Duke DLBCL Survival Analysis\n")
cat("=============================================================\n\n")

library(survival)
library(dplyr)

duke_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Duke"
processed_dir <- file.path(duke_dir, "data/processed")
figures_dir <- file.path(duke_dir, "figures")

dir.create(figures_dir, recursive = TRUE, showWarnings = FALSE)

# Load data
duke_data <- read.csv(file.path(processed_dir, "duke_egress_scores.csv"), stringsAsFactors = FALSE)
cat("Loaded:", nrow(duke_data), "patients\n")

# Filter to analyzable patients
surv_data <- duke_data %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT))

cat("With survival data:", nrow(surv_data), "patients\n")
cat("Events (deaths):", sum(surv_data$OS_EVENT), "\n\n")

# =============================================================================
# Analysis 1: Egress Score (Any mutation vs None)
# =============================================================================

cat("--- Analysis 1: Any Pathway Mutation vs None ---\n\n")

surv_data$pathway_group <- ifelse(surv_data$Egress_Score > 0, "Pathway Mutated", "No Mutation")

# Counts
print(table(surv_data$pathway_group))

# Kaplan-Meier
fit1 <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ pathway_group, data = surv_data)
print(fit1)

# Log-rank test
logrank1 <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ pathway_group, data = surv_data)
pval1 <- 1 - pchisq(logrank1$chisq, df = 1)
cat("\nLog-rank p-value:", format(pval1, digits = 3), "\n")

# Median survival
cat("\nMedian survival by group:\n")
print(summary(fit1)$table[, c("records", "events", "median", "0.95LCL", "0.95UCL")])

# Plot
png(file.path(figures_dir, "km_pathway_mutation.png"), width = 800, height = 600)
plot(fit1, col = c("#2E9FDF", "#E7B800"), lwd = 2, mark.time = TRUE,
     xlab = "Time (Months)", ylab = "Overall Survival",
     main = "Duke DLBCL: Pathway Mutation vs No Mutation")
legend("bottomleft", legend = c("No Mutation", "Pathway Mutated"),
       col = c("#2E9FDF", "#E7B800"), lwd = 2)
text(max(surv_data$OS_MONTHS) * 0.7, 0.9,
     paste0("Log-rank p = ", format(pval1, digits = 3)))
dev.off()
cat("Saved: km_pathway_mutation.png\n")

# =============================================================================
# Analysis 2: Egress Score Categories (0 vs 1 vs 2+)
# =============================================================================

cat("\n--- Analysis 2: Egress Score Categories (0 vs 1 vs 2+) ---\n\n")

surv_data$egress_cat <- case_when(
  surv_data$Egress_Score == 0 ~ "Score 0",
  surv_data$Egress_Score == 1 ~ "Score 1",
  surv_data$Egress_Score >= 2 ~ "Score 2+"
)

print(table(surv_data$egress_cat))

fit2 <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ egress_cat, data = surv_data)
logrank2 <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ egress_cat, data = surv_data)
pval2 <- 1 - pchisq(logrank2$chisq, df = 2)
cat("\nLog-rank p-value:", format(pval2, digits = 3), "\n")

png(file.path(figures_dir, "km_egress_score.png"), width = 800, height = 600)
plot(fit2, col = c("#2E9FDF", "#E7B800", "#FC4E07"), lwd = 2, mark.time = TRUE,
     xlab = "Time (Months)", ylab = "Overall Survival",
     main = "Duke DLBCL: Survival by Egress Score")
legend("bottomleft", legend = c("Score 0", "Score 1", "Score 2+"),
       col = c("#2E9FDF", "#E7B800", "#FC4E07"), lwd = 2)
text(max(surv_data$OS_MONTHS) * 0.7, 0.9,
     paste0("Log-rank p = ", format(pval2, digits = 3)))
dev.off()
cat("Saved: km_egress_score.png\n")

# =============================================================================
# Analysis 3: Individual Genes
# =============================================================================

cat("\n--- Analysis 3: Individual Gene Effects ---\n\n")

gene_cols <- c("S1PR2_mutated", "GNA13_mutated", "RHOA_mutated",
               "CXCR4_mutated", "GNAI2_mutated")

gene_results <- data.frame()

for (gene_col in gene_cols) {
  gene <- gsub("_mutated", "", gene_col)

  if (gene_col %in% names(surv_data) && sum(surv_data[[gene_col]] == 1, na.rm = TRUE) >= 5) {
    surv_data$gene_status <- ifelse(surv_data[[gene_col]] == 1, "Mutated", "Wild-type")

    fit_gene <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ gene_status, data = surv_data)
    logrank_gene <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ gene_status, data = surv_data)
    pval_gene <- 1 - pchisq(logrank_gene$chisq, df = 1)

    n_mut <- sum(surv_data[[gene_col]] == 1, na.rm = TRUE)
    n_wt <- sum(surv_data[[gene_col]] == 0, na.rm = TRUE)

    gene_results <- rbind(gene_results, data.frame(
      Gene = gene,
      N_Mutated = n_mut,
      N_WT = n_wt,
      P_value = pval_gene,
      stringsAsFactors = FALSE
    ))

    cat(sprintf("%s: n=%d mutated, p=%.3f\n", gene, n_mut, pval_gene))
  }
}

if (nrow(gene_results) > 0) {
  gene_results <- gene_results[order(gene_results$P_value), ]
  cat("\nGene results sorted by p-value:\n")
  print(gene_results)
}

# =============================================================================
# Analysis 4: GNA13 Specifically (most common)
# =============================================================================

cat("\n--- Analysis 4: GNA13 Mutation Effect ---\n\n")

surv_data$GNA13_status <- ifelse(surv_data$GNA13_mutated == 1, "GNA13 Mutated", "GNA13 Wild-type")
print(table(surv_data$GNA13_status))

fit_gna13 <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ GNA13_status, data = surv_data)
logrank_gna13 <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ GNA13_status, data = surv_data)
pval_gna13 <- 1 - pchisq(logrank_gna13$chisq, df = 1)
cat("\nGNA13 log-rank p-value:", format(pval_gna13, digits = 3), "\n")

png(file.path(figures_dir, "km_gna13.png"), width = 800, height = 600)
plot(fit_gna13, col = c("#00BA38", "#F8766D"), lwd = 2, mark.time = TRUE,
     xlab = "Time (Months)", ylab = "Overall Survival",
     main = "Duke DLBCL: GNA13 Mutation Effect")
legend("bottomleft", legend = c("GNA13 Mutated", "GNA13 Wild-type"),
       col = c("#00BA38", "#F8766D"), lwd = 2)
text(max(surv_data$OS_MONTHS) * 0.7, 0.9,
     paste0("Log-rank p = ", format(pval_gna13, digits = 3)))
dev.off()
cat("Saved: km_gna13.png\n")

# =============================================================================
# Cox Regression
# =============================================================================

cat("\n--- Cox Proportional Hazards Regression ---\n\n")

# Univariate - Egress Score
cox_egress <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ Egress_Score, data = surv_data)
cat("Univariate - Egress Score:\n")
print(summary(cox_egress))

# Multivariate with IPI if available
if ("IPI" %in% names(surv_data)) {
  surv_data_complete <- surv_data %>%
    filter(!is.na(IPI))

  if (nrow(surv_data_complete) > 50) {
    cat("\n\nMultivariate - Egress Score + IPI:\n")
    cox_multi <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ Egress_Score + IPI, data = surv_data_complete)
    print(summary(cox_multi))
  }
}

# =============================================================================
# Save Results Table
# =============================================================================

results_table <- data.frame(
  Analysis = c("Any Pathway Mutation", "Egress Score Categories", "GNA13 Mutation"),
  N_Patients = c(nrow(surv_data), nrow(surv_data), nrow(surv_data)),
  N_Events = c(sum(surv_data$OS_EVENT), sum(surv_data$OS_EVENT), sum(surv_data$OS_EVENT)),
  P_value = c(pval1, pval2, pval_gna13),
  stringsAsFactors = FALSE
)

write.csv(results_table, file.path(processed_dir, "survival_results.csv"), row.names = FALSE)
cat("\nSaved: survival_results.csv\n")

# =============================================================================
# Summary
# =============================================================================

cat("\n=============================================================\n")
cat("SURVIVAL ANALYSIS SUMMARY\n")
cat("=============================================================\n\n")

cat("Total patients analyzed:", nrow(surv_data), "\n")
cat("Deaths:", sum(surv_data$OS_EVENT), "\n")
cat("Median follow-up:", round(median(surv_data$OS_MONTHS), 1), "months\n\n")

cat("Pathway mutations:\n")
cat("  - Any mutation:", sum(surv_data$Egress_Score > 0), "patients (",
    round(100*sum(surv_data$Egress_Score > 0)/nrow(surv_data), 1), "%)\n")
cat("  - Egress Score 2+:", sum(surv_data$Egress_Score >= 2), "patients\n\n")

cat("Key p-values:\n")
cat("  - Any pathway mutation:", format(pval1, digits = 3), "\n")
cat("  - Egress Score categories:", format(pval2, digits = 3), "\n")
cat("  - GNA13 mutation:", format(pval_gna13, digits = 3), "\n")

cat("\nFigures saved to:", figures_dir, "\n")

# Interpretation
cat("\n--- INTERPRETATION ---\n\n")
if (pval1 < 0.05) {
  cat("SIGNIFICANT: Pathway mutations are associated with survival (p < 0.05)\n")
} else {
  cat("NOT SIGNIFICANT: No significant association between pathway mutations and survival\n")
  cat("This differs from the Chapuy EZB-specific finding.\n")
  cat("Note: Duke cohort lacks genetic subtype classification (EZB, etc.)\n")
  cat("The effect may only be visible within the EZB subtype as seen in Chapuy.\n")
}
