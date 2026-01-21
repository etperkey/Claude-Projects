# GAMBL EZB Subset Survival Analysis
# Compare pathway mutations in EZB subtype with Chapuy findings

library(dplyr)
library(tidyr)
library(survival)

# Set paths
base_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06"
gambl_dir <- file.path(base_dir, "Dreval_GAMBL")
duke_dir <- file.path(base_dir, "Reddy_Duke")

# Load GAMBL pathway mutations
cat("Loading GAMBL pathway mutations...\n")
gambl_muts <- read.csv(file.path(gambl_dir, "data/processed/gambl_pathway_mutations.csv"))

# Load Duke classified data with subtypes
cat("Loading Duke subtype classifications...\n")
duke_classified <- read.csv(file.path(duke_dir, "data/processed/duke_classified.csv"))

cat("Duke samples:", nrow(duke_classified), "\n")
cat("\nSubtype distribution:\n")
print(table(duke_classified$Subtype))

# Merge GAMBL mutations with Duke subtype data
merged <- merge(gambl_muts,
                duke_classified[, c("SAMPLE_ID", "Subtype", "Subtype_strict",
                                    "OS_MONTHS", "OS_EVENT", "EZB_score")],
                by = "SAMPLE_ID")

cat("\nMerged samples:", nrow(merged), "\n")

# Define pathway genes available in GAMBL
pathway_genes <- c("S1PR2", "GNA13", "RHOA", "CXCR4", "GNAI2")
retention_genes <- c("S1PR2", "GNA13", "RHOA")
egress_genes <- c("CXCR4", "GNAI2")

# Recalculate scores with GAMBL data
merged <- merged %>%
  rowwise() %>%
  mutate(
    GAMBL_Retention = sum(c_across(all_of(retention_genes)), na.rm = TRUE),
    GAMBL_Egress = sum(c_across(all_of(egress_genes)), na.rm = TRUE),
    GAMBL_Combined = GAMBL_Retention + GAMBL_Egress
  ) %>%
  ungroup()

# Filter for EZB subtype
cat("\n=== EZB Subset Analysis ===\n")
ezb_data <- merged %>% filter(Subtype == "EZB")
cat("EZB patients:", nrow(ezb_data), "\n")

# Filter for complete survival data
ezb_surv <- ezb_data %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT))
cat("EZB patients with survival data:", nrow(ezb_surv), "\n")

# Score distribution in EZB
cat("\nGAMBL Combined Score distribution in EZB:\n")
print(table(ezb_surv$GAMBL_Combined))

# Mutation frequencies in EZB
cat("\nPathway gene mutation frequencies in EZB:\n")
for (gene in pathway_genes) {
  freq <- mean(ezb_surv[[gene]], na.rm = TRUE) * 100
  n_mut <- sum(ezb_surv[[gene]], na.rm = TRUE)
  cat(sprintf("%s: %.1f%% (%d/%d)\n", gene, freq, n_mut, nrow(ezb_surv)))
}

# Survival analysis: Score >= 1 vs 0
cat("\n=== Survival Analysis: Score >= 1 vs 0 ===\n")
ezb_surv$Score_Cat <- ifelse(ezb_surv$GAMBL_Combined >= 1, "Score >= 1", "Score = 0")

fit1 <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ Score_Cat, data = ezb_surv)
print(fit1)

surv_diff1 <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ Score_Cat, data = ezb_surv)
p1 <- 1 - pchisq(surv_diff1$chisq, df = 1)
cat("\nLog-rank p-value:", format(p1, digits = 4), "\n")

# Survival analysis: Score >= 2 vs < 2
n_score2 <- sum(ezb_surv$GAMBL_Combined >= 2, na.rm = TRUE)
cat("\n=== Survival Analysis: Score >= 2 vs < 2 ===\n")
cat("Patients with Score >= 2:", n_score2, "\n")

if (n_score2 >= 3) {
  ezb_surv$Score_2plus <- ifelse(ezb_surv$GAMBL_Combined >= 2, "Score >= 2", "Score < 2")

  fit2 <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ Score_2plus, data = ezb_surv)
  print(fit2)

  surv_diff2 <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ Score_2plus, data = ezb_surv)
  p2 <- 1 - pchisq(surv_diff2$chisq, df = 1)
  cat("\nLog-rank p-value:", format(p2, digits = 4), "\n")

  # Median survival times
  cat("\nMedian OS:\n")
  print(summary(fit2)$table[, c("records", "events", "median")])
} else {
  cat("Not enough patients with Score >= 2 for analysis\n")
}

# Cox regression
cat("\n=== Cox Regression in EZB ===\n")
cox_model <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ GAMBL_Combined, data = ezb_surv)
print(summary(cox_model))

# Save survival plot
png(file.path(gambl_dir, "data/processed/gambl_ezb_survival.png"),
    width = 800, height = 600)
plot(fit1, col = c("#2E9FDF", "#E7B800"), lwd = 2,
     xlab = "Time (months)", ylab = "Overall Survival",
     main = sprintf("GAMBL EZB Subset: OS by Pathway Score\np = %s (n=%d)",
                    format(p1, digits = 4), nrow(ezb_surv)))
legend("bottomleft", legend = c("Score = 0", "Score >= 1"),
       col = c("#2E9FDF", "#E7B800"), lwd = 2)
dev.off()
cat("\nSaved: gambl_ezb_survival.png\n")

# Save Score >= 2 plot if applicable
if (n_score2 >= 3) {
  png(file.path(gambl_dir, "data/processed/gambl_ezb_survival_score2.png"),
      width = 800, height = 600)
  plot(fit2, col = c("#2E9FDF", "#E7B800"), lwd = 2,
       xlab = "Time (months)", ylab = "Overall Survival",
       main = sprintf("GAMBL EZB Subset: OS by Score >= 2\np = %s (n=%d)",
                      format(p2, digits = 4), nrow(ezb_surv)))
  legend("bottomleft", legend = c("Score < 2", "Score >= 2"),
         col = c("#2E9FDF", "#E7B800"), lwd = 2)
  dev.off()
  cat("Saved: gambl_ezb_survival_score2.png\n")
}

# Also analyze strict EZB subtype
cat("\n=== Strict EZB Subset Analysis ===\n")
ezb_strict <- merged %>% filter(Subtype_strict == "EZB")
ezb_strict_surv <- ezb_strict %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT))
cat("Strict EZB patients with survival data:", nrow(ezb_strict_surv), "\n")

if (nrow(ezb_strict_surv) >= 20) {
  cat("\nGAMBL Combined Score distribution in strict EZB:\n")
  print(table(ezb_strict_surv$GAMBL_Combined))

  ezb_strict_surv$Score_Cat <- ifelse(ezb_strict_surv$GAMBL_Combined >= 1,
                                       "Score >= 1", "Score = 0")

  fit_strict <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ Score_Cat, data = ezb_strict_surv)
  surv_diff_strict <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ Score_Cat, data = ezb_strict_surv)
  p_strict <- 1 - pchisq(surv_diff_strict$chisq, df = 1)
  cat("\nStrict EZB Log-rank p-value:", format(p_strict, digits = 4), "\n")
}

# Summary
cat("\n=== GAMBL EZB Analysis Summary ===\n")
cat("EZB patients total:", nrow(ezb_data), "\n")
cat("EZB with survival data:", nrow(ezb_surv), "\n")
cat("Pathway mutation rate in EZB:",
    sprintf("%.1f%%", mean(ezb_surv$GAMBL_Combined > 0) * 100), "\n")
cat("Score >= 2 in EZB:", n_score2,
    sprintf("(%.1f%%)", n_score2/nrow(ezb_surv) * 100), "\n")
cat("Pathway genes available: 5/9 (ARHGEF1, P2RY8, RAC2, ARHGAP25 missing)\n")

# Save results
ezb_results <- data.frame(
  Metric = c("EZB_total", "EZB_survival", "Pathway_mut_rate", "Score2plus_n",
             "Score2plus_pct", "pval_score1", "pval_score2"),
  Value = c(nrow(ezb_surv), nrow(ezb_surv), mean(ezb_surv$GAMBL_Combined > 0) * 100,
            n_score2, n_score2/nrow(ezb_surv) * 100, p1,
            ifelse(n_score2 >= 3, p2, NA))
)
write.csv(ezb_results, file.path(gambl_dir, "data/processed/gambl_ezb_results.csv"),
          row.names = FALSE)
cat("\nSaved: gambl_ezb_results.csv\n")
