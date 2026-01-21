# =============================================================================
# GNA13 Survival Analysis in Lacy/HMRN Cohort
# =============================================================================

library(survival)
library(dplyr)

cat("=============================================================================\n")
cat("GNA13 Survival Analysis - Lacy/HMRN Blood 2020 Cohort\n")
cat("=============================================================================\n\n")

# Load data
data_file <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/data/genetic_egress_scores.csv"
data <- read.csv(data_file, stringsAsFactors = FALSE)

# Convert OS_time from days to months
data$OS_MONTHS <- data$OS_time / 30.44
data$OS_EVENT <- data$OS_status

# Convert PFS
data$PFS_MONTHS <- as.numeric(data$PFS_time) / 30.44
data$PFS_EVENT <- as.numeric(data$PFS_status)

cat("Total patients:", nrow(data), "\n")
cat("GNA13 mutated:", sum(data$GNA13), "(", round(100*sum(data$GNA13)/nrow(data), 1), "%)\n")
cat("GNA13 wild-type:", sum(data$GNA13 == 0), "\n\n")

# =============================================================================
# GLOBAL ANALYSIS
# =============================================================================

cat("=============================================================================\n")
cat("GLOBAL ANALYSIS (All patients)\n")
cat("=============================================================================\n\n")

os_data <- data %>% filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT))
cat("Patients with OS data:", nrow(os_data), "\n")
cat("GNA13 mutated:", sum(os_data$GNA13), "\n")
cat("Events (deaths):", sum(os_data$OS_EVENT), "\n\n")

# Kaplan-Meier
fit_global <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ GNA13, data = os_data)
logrank_global <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ GNA13, data = os_data)
pval_global <- 1 - pchisq(logrank_global$chisq, df = 1)

cat("--- OS by GNA13 Status ---\n")
cat("Log-rank p-value:", format(pval_global, digits = 4), "\n\n")

# Median survival
cat("Median OS (months):\n")
print(summary(fit_global)$table[, c("records", "events", "median", "0.95LCL", "0.95UCL")])

# Cox regression
cox_global <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ GNA13, data = os_data)
hr <- exp(coef(cox_global))
hr_ci <- exp(confint(cox_global))
cox_p <- summary(cox_global)$coefficients[, "Pr(>|z|)"]

cat("\nCox Regression:\n")
cat("  HR:", round(hr, 3), "\n")
cat("  95% CI:", round(hr_ci[1], 3), "-", round(hr_ci[2], 3), "\n")
cat("  p-value:", format(cox_p, digits = 4), "\n")

# =============================================================================
# BY CLUSTER
# =============================================================================

cat("\n\n=============================================================================\n")
cat("ANALYSIS BY CLUSTER (ICL Classification)\n")
cat("=============================================================================\n\n")

results_cluster <- data.frame()

for (cluster in unique(os_data$cluster_ICL)) {
  if (is.na(cluster)) next

  cluster_data <- os_data %>% filter(cluster_ICL == cluster)
  n_mut <- sum(cluster_data$GNA13)
  n_total <- nrow(cluster_data)

  if (n_mut >= 3 && n_mut < n_total - 2) {
    fit <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ GNA13, data = cluster_data)
    hr <- exp(coef(fit))
    hr_ci <- exp(confint(fit))
    p <- summary(fit)$coefficients[, "Pr(>|z|)"]

    results_cluster <- rbind(results_cluster, data.frame(
      Cluster = cluster,
      N = n_total,
      N_GNA13 = n_mut,
      Pct = round(100 * n_mut / n_total, 1),
      HR = round(hr, 3),
      HR_lower = round(hr_ci[1], 3),
      HR_upper = round(hr_ci[2], 3),
      P_value = round(p, 4),
      Direction = ifelse(hr > 1, "Worse", "Better")
    ))
  } else {
    results_cluster <- rbind(results_cluster, data.frame(
      Cluster = cluster,
      N = n_total,
      N_GNA13 = n_mut,
      Pct = round(100 * n_mut / n_total, 1),
      HR = NA,
      HR_lower = NA,
      HR_upper = NA,
      P_value = NA,
      Direction = NA
    ))
  }
}

print(results_cluster)

# =============================================================================
# BY CELL OF ORIGIN
# =============================================================================

cat("\n\n=============================================================================\n")
cat("ANALYSIS BY CELL OF ORIGIN\n")
cat("=============================================================================\n\n")

results_coo <- data.frame()

for (coo in c("GCB", "ABC", "UNC")) {
  coo_data <- os_data %>% filter(cell_of_origin == coo)
  n_mut <- sum(coo_data$GNA13)
  n_total <- nrow(coo_data)

  if (n_mut >= 3 && n_mut < n_total - 2) {
    fit <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ GNA13, data = coo_data)
    hr <- exp(coef(fit))
    hr_ci <- exp(confint(fit))
    p <- summary(fit)$coefficients[, "Pr(>|z|)"]

    results_coo <- rbind(results_coo, data.frame(
      COO = coo,
      N = n_total,
      N_GNA13 = n_mut,
      Pct = round(100 * n_mut / n_total, 1),
      HR = round(hr, 3),
      HR_lower = round(hr_ci[1], 3),
      HR_upper = round(hr_ci[2], 3),
      P_value = round(p, 4),
      Direction = ifelse(hr > 1, "Worse", "Better")
    ))
  } else {
    results_coo <- rbind(results_coo, data.frame(
      COO = coo,
      N = n_total,
      N_GNA13 = n_mut,
      Pct = round(100 * n_mut / n_total, 1),
      HR = NA,
      HR_lower = NA,
      HR_upper = NA,
      P_value = NA,
      Direction = NA
    ))
  }
}

print(results_coo)

# =============================================================================
# PFS ANALYSIS
# =============================================================================

cat("\n\n=============================================================================\n")
cat("PFS ANALYSIS\n")
cat("=============================================================================\n\n")

pfs_data <- data %>% filter(!is.na(PFS_MONTHS) & !is.na(PFS_EVENT))
cat("Patients with PFS data:", nrow(pfs_data), "\n")

if (sum(pfs_data$GNA13) >= 3) {
  fit_pfs <- survfit(Surv(PFS_MONTHS, PFS_EVENT) ~ GNA13, data = pfs_data)
  logrank_pfs <- survdiff(Surv(PFS_MONTHS, PFS_EVENT) ~ GNA13, data = pfs_data)
  pval_pfs <- 1 - pchisq(logrank_pfs$chisq, df = 1)

  cat("Log-rank p-value:", format(pval_pfs, digits = 4), "\n\n")

  cox_pfs <- coxph(Surv(PFS_MONTHS, PFS_EVENT) ~ GNA13, data = pfs_data)
  hr_pfs <- exp(coef(cox_pfs))
  hr_pfs_ci <- exp(confint(cox_pfs))

  cat("Cox Regression (PFS):\n")
  cat("  HR:", round(hr_pfs, 3), "\n")
  cat("  95% CI:", round(hr_pfs_ci[1], 3), "-", round(hr_pfs_ci[2], 3), "\n")
}

# =============================================================================
# SUMMARY
# =============================================================================

cat("\n\n=============================================================================\n")
cat("SUMMARY: GNA13 Survival in Lacy/HMRN (n=", nrow(os_data), ")\n")
cat("=============================================================================\n\n")

cat("GLOBAL:\n")
cat("  GNA13 mutation rate:", round(100*sum(os_data$GNA13)/nrow(os_data), 1), "%\n")
cat("  OS HR:", round(exp(coef(cox_global)), 3),
    "(95% CI:", round(exp(confint(cox_global))[1], 3), "-",
    round(exp(confint(cox_global))[2], 3), ")\n")
cat("  OS p-value:", format(summary(cox_global)$coefficients[, "Pr(>|z|)"], digits = 4), "\n")

cat("\nCONCLUSION:\n")
if (summary(cox_global)$coefficients[, "Pr(>|z|)"] < 0.05) {
  cat("  SIGNIFICANT association between GNA13 and OS\n")
} else {
  cat("  NO significant association between GNA13 and OS (p > 0.05)\n")
}

# Save results
write.csv(results_cluster,
          "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/results/gna13_survival_by_cluster.csv",
          row.names = FALSE)
write.csv(results_coo,
          "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/results/gna13_survival_by_coo.csv",
          row.names = FALSE)

cat("\nResults saved to Lacy_HMRN/results/\n")
