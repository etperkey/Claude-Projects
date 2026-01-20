# MHG-Specific tEgress Validation
# Eric Perkey - January 2026

library(survival)
library(dplyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=== MHG-SPECIFIC tEGRESS VALIDATION ===\n\n")

# Load data
lacy_tegress <- read.csv("Lacy_HMRN/results/tegress_scores.csv", stringsAsFactors = FALSE)
remodlb <- read.csv("Sha_REMoDL-B/data/processed/tEgress_clinical.csv", stringsAsFactors = FALSE)

#------------------------------------------------------------------------------
# 1. LACY MHG DETAILED ANALYSIS
#------------------------------------------------------------------------------
cat("=== LACY: MHG Subtype Analysis ===\n")

mhg <- lacy_tegress %>%
  filter(COO == "MHG" & !is.na(OS_status) & !is.na(OS_time) & !is.na(tEgress))
cat("MHG samples: ", nrow(mhg), "\n")
cat("Events: ", sum(mhg$OS_status), "\n")

# tEgress quartiles
mhg$tEgress_quartile <- cut(mhg$tEgress,
                            breaks = quantile(mhg$tEgress, probs = c(0, 0.25, 0.5, 0.75, 1), na.rm = TRUE),
                            labels = c("Q1 (Low)", "Q2", "Q3", "Q4 (High)"),
                            include.lowest = TRUE)

cat("\ntEgress quartile distribution:\n")
print(table(mhg$tEgress_quartile))

# Survival by quartile
cat("\n--- Survival by tEgress Quartile ---\n")
fit_quartile <- survfit(Surv(OS_time/365.25, OS_status) ~ tEgress_quartile, data = mhg)
print(summary(fit_quartile)$table)

# Log-rank test
lr <- survdiff(Surv(OS_time, OS_status) ~ tEgress_quartile, data = mhg)
cat("\nLog-rank p = ", format(1 - pchisq(lr$chisq, df = 3), digits = 3), "\n")

# Q1 vs Q4 comparison
cat("\n--- Q1 (Low) vs Q4 (High) Comparison ---\n")
mhg_extreme <- mhg %>% filter(tEgress_quartile %in% c("Q1 (Low)", "Q4 (High)"))
if (nrow(mhg_extreme) > 20) {
  cox_extreme <- coxph(Surv(OS_time, OS_status) ~ tEgress_quartile, data = mhg_extreme)
  hr <- exp(coef(cox_extreme))
  ci <- exp(confint(cox_extreme))
  pval <- summary(cox_extreme)$coefficients[5]
  cat("Q4 vs Q1 HR = ", round(hr, 2), " (95% CI: ", round(ci[1], 2), "-", round(ci[2], 2),
      "), p = ", format(pval, digits = 3), "\n")
}

# Median survival by group
cat("\n--- Median Survival ---\n")
for (q in c("Q1 (Low)", "Q4 (High)")) {
  q_data <- mhg %>% filter(tEgress_quartile == q)
  median_os <- median(q_data$OS_time[q_data$OS_status == 1], na.rm = TRUE) / 365.25
  cat(q, ": n =", nrow(q_data), ", events =", sum(q_data$OS_status),
      ", median OS =", round(median_os, 1), "years\n")
}

#------------------------------------------------------------------------------
# 2. COMPONENT SCORES IN MHG
#------------------------------------------------------------------------------
cat("\n=== MHG: Component Score Analysis ===\n")

# Check if retention/egress scores are available
if ("Retention_score" %in% names(mhg) && "Egress_score" %in% names(mhg)) {
  cat("\nRetention score survival:\n")
  cox_ret <- coxph(Surv(OS_time, OS_status) ~ Retention_score, data = mhg)
  cat("  HR per unit: ", round(exp(coef(cox_ret)), 3), ", p = ",
      format(summary(cox_ret)$coefficients[5], digits = 3), "\n")

  cat("\nEgress score survival:\n")
  cox_egr <- coxph(Surv(OS_time, OS_status) ~ Egress_score, data = mhg)
  cat("  HR per unit: ", round(exp(coef(cox_egr)), 3), ", p = ",
      format(summary(cox_egr)$coefficients[5], digits = 3), "\n")
}

#------------------------------------------------------------------------------
# 3. INDIVIDUAL GENE EXPRESSION IN MHG
#------------------------------------------------------------------------------
cat("\n=== MHG: Individual Gene Effects ===\n")

gene_cols <- c("S1PR2_z", "P2RY8_z", "GNA13_z", "RHOA_z", "GNAI2_z", "CXCR4_z", "FOXO1_z", "SGK1_z")
available_genes <- gene_cols[gene_cols %in% names(mhg)]

if (length(available_genes) > 0) {
  gene_results <- data.frame(
    Gene = character(),
    HR = numeric(),
    CI_lower = numeric(),
    CI_upper = numeric(),
    P_value = numeric(),
    stringsAsFactors = FALSE
  )

  for (gene in available_genes) {
    gene_clean <- gsub("_z$", "", gene)
    cox <- tryCatch({
      coxph(as.formula(paste("Surv(OS_time, OS_status) ~", gene)), data = mhg)
    }, error = function(e) NULL)

    if (!is.null(cox)) {
      hr <- exp(coef(cox))
      ci <- exp(confint(cox))
      pval <- summary(cox)$coefficients[5]

      gene_results <- rbind(gene_results, data.frame(
        Gene = gene_clean,
        HR = round(hr, 3),
        CI_lower = round(ci[1], 3),
        CI_upper = round(ci[2], 3),
        P_value = pval
      ))
    }
  }

  # Sort by p-value
  gene_results <- gene_results %>% arrange(P_value)
  cat("\nIndividual gene effects on survival in MHG:\n")
  print(gene_results)
}

#------------------------------------------------------------------------------
# 4. COMPARE MHG TO OTHER SUBTYPES
#------------------------------------------------------------------------------
cat("\n=== COMPARISON: MHG vs Other Subtypes ===\n")

lacy_all <- lacy_tegress %>%
  filter(!is.na(OS_status) & !is.na(OS_time) & !is.na(tEgress))

# Cox with interaction
lacy_all$is_MHG <- ifelse(lacy_all$COO == "MHG", 1, 0)
cox_int <- coxph(Surv(OS_time, OS_status) ~ tEgress * is_MHG, data = lacy_all)
cat("\nCox interaction model (tEgress x MHG):\n")
print(summary(cox_int)$coefficients)

# Is the MHG-specific effect significantly different?
cat("\nInterpretation:\n")
cat("  - tEgress effect in non-MHG: HR =", round(exp(coef(cox_int)["tEgress"]), 3), "\n")
cat("  - Additional effect in MHG: HR =", round(exp(coef(cox_int)["tEgress:is_MHG"]), 3), "\n")
cat("  - Combined MHG effect: HR =", round(exp(coef(cox_int)["tEgress"] + coef(cox_int)["tEgress:is_MHG"]), 3), "\n")

#------------------------------------------------------------------------------
# 5. MHG CHARACTERISTICS
#------------------------------------------------------------------------------
cat("\n=== MHG CHARACTERISTICS ===\n")

# Compare MHG to others
mhg_vs_others <- lacy_tegress %>%
  mutate(is_MHG = ifelse(COO == "MHG", "MHG", "Other")) %>%
  group_by(is_MHG) %>%
  summarise(
    n = n(),
    events = sum(OS_status, na.rm = TRUE),
    event_rate = round(mean(OS_status, na.rm = TRUE) * 100, 1),
    median_OS_days = median(OS_time[OS_status == 1], na.rm = TRUE),
    mean_tEgress = round(mean(tEgress, na.rm = TRUE), 3),
    .groups = "drop"
  )

cat("\nMHG vs Other subtypes:\n")
print(mhg_vs_others)

cat("\n=== ANALYSIS COMPLETE ===\n")
