# Analysis of Features Associated with No Complete Response
# Genomic, Transcriptomic, and Clinical Predictors

library(survival)
library(dplyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("   FEATURES ASSOCIATED WITH NO COMPLETE RESPONSE (CR)\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. DUKE DATA - CLINICAL AND GENOMIC PREDICTORS
#------------------------------------------------------------------------------
cat("=== DUKE COHORT (n=1,001) ===\n\n")

duke_patient <- read.csv("Reddy_Duke/data/raw/data_clinical_patient.csv", stringsAsFactors = FALSE)
duke_sample <- read.csv("Reddy_Duke/data/raw/data_clinical_sample.csv", stringsAsFactors = FALSE)
duke_class <- read.csv("Reddy_Duke/data/processed/duke_classified.csv", stringsAsFactors = FALSE)

# Merge data
duke <- duke_patient %>%
  left_join(duke_sample, by = c("PATIENT_ID" = "SAMPLE_ID")) %>%
  left_join(duke_class %>% select(PATIENT_ID, Subtype, EZB_score, MCD_score,
                                   S1PR2_mutated, GNA13_mutated, RHOA_mutated,
                                   CXCR4_mutated, GNAI2_mutated, Egress_Score,
                                   Has_Pathway_Mutation),
            by = "PATIENT_ID") %>%
  filter(!is.na(INITIAL_TX_RESPONSE) & INITIAL_TX_RESPONSE != "")

duke$CR <- ifelse(duke$INITIAL_TX_RESPONSE == "Complete response", 1, 0)
duke$no_CR <- 1 - duke$CR

cat("Patients with response data: ", nrow(duke), "\n")
cat("CR rate: ", round(mean(duke$CR) * 100, 1), "%\n")
cat("No CR: ", sum(duke$no_CR), " patients\n\n")

#------------------------------------------------------------------------------
# 2. CLINICAL PREDICTORS OF NO CR
#------------------------------------------------------------------------------
cat("--- CLINICAL PREDICTORS OF NO CR ---\n\n")

# Age
cat("Age:\n")
age_summary <- duke %>%
  group_by(CR) %>%
  summarise(
    n = n(),
    mean_age = round(mean(AGE_AT_DIAGNOSIS, na.rm = TRUE), 1),
    .groups = "drop"
  )
print(age_summary)
age_test <- t.test(AGE_AT_DIAGNOSIS ~ CR, data = duke)
cat("T-test p =", format(age_test$p.value, digits = 3), "\n\n")

# IPI
cat("IPI Score:\n")
ipi_summary <- duke %>%
  filter(!is.na(IPI)) %>%
  group_by(CR) %>%
  summarise(
    n = n(),
    mean_IPI = round(mean(IPI, na.rm = TRUE), 2),
    high_IPI_rate = round(mean(IPI >= 3, na.rm = TRUE) * 100, 1),
    .groups = "drop"
  )
print(ipi_summary)
ipi_test <- t.test(IPI ~ CR, data = duke)
cat("T-test p =", format(ipi_test$p.value, digits = 3), "\n\n")

# IPI Components
cat("IPI Components (% positive by CR status):\n")
ipi_comps <- c("IPI_AGE", "IPI_ANNARBOR_STAGE", "IPI_ECOG", "IPI_EXTRANODAL_SITES", "IPI_LDH")
for (comp in ipi_comps) {
  comp_data <- duke %>% filter(!is.na(get(comp)))
  rate_cr <- mean(comp_data[[comp]][comp_data$CR == 1], na.rm = TRUE) * 100
  rate_nocr <- mean(comp_data[[comp]][comp_data$CR == 0], na.rm = TRUE) * 100
  test <- chisq.test(table(comp_data$CR, comp_data[[comp]]))
  cat(sprintf("  %s: CR=%.1f%%, No CR=%.1f%%, p=%s\n",
              comp, rate_cr, rate_nocr, format(test$p.value, digits = 3)))
}

# B Symptoms
cat("\nB Symptoms:\n")
bsym_data <- duke %>% filter(B_SYMPTOMS_AT_DIAGNOSIS %in% c("Yes", "No"))
bsym_data$B_sym <- ifelse(bsym_data$B_SYMPTOMS_AT_DIAGNOSIS == "Yes", 1, 0)
bsym_summary <- bsym_data %>%
  group_by(CR) %>%
  summarise(B_sym_rate = round(mean(B_sym) * 100, 1), .groups = "drop")
print(bsym_summary)
bsym_test <- chisq.test(table(bsym_data$CR, bsym_data$B_sym))
cat("Chi-sq p =", format(bsym_test$p.value, digits = 3), "\n\n")

# Sex
cat("Sex:\n")
sex_summary <- duke %>%
  filter(!is.na(SEX)) %>%
  group_by(CR, SEX) %>%
  summarise(n = n(), .groups = "drop") %>%
  tidyr::pivot_wider(names_from = SEX, values_from = n)
print(sex_summary)

#------------------------------------------------------------------------------
# 3. GENOMIC PREDICTORS OF NO CR (DUKE)
#------------------------------------------------------------------------------
cat("\n--- GENOMIC PREDICTORS OF NO CR ---\n\n")

# Subtype
cat("CR Rate by Genetic Subtype:\n")
subtype_cr <- duke %>%
  filter(!is.na(Subtype)) %>%
  group_by(Subtype) %>%
  summarise(
    n = n(),
    CR_rate = round(mean(CR) * 100, 1),
    no_CR_n = sum(no_CR),
    .groups = "drop"
  ) %>%
  arrange(CR_rate)
print(subtype_cr)

# Chi-square test
subtype_test <- chisq.test(table(duke$Subtype[!is.na(duke$Subtype)],
                                  duke$CR[!is.na(duke$Subtype)]))
cat("Chi-sq p =", format(subtype_test$p.value, digits = 3), "\n\n")

# Pathway mutations
cat("Egress Pathway Mutations and CR:\n")
pathway_genes <- c("S1PR2_mutated", "GNA13_mutated", "RHOA_mutated", "CXCR4_mutated", "GNAI2_mutated")
for (gene in pathway_genes) {
  if (gene %in% names(duke)) {
    gene_data <- duke %>% filter(!is.na(get(gene)))
    cr_mut <- mean(gene_data$CR[gene_data[[gene]] == 1], na.rm = TRUE) * 100
    cr_wt <- mean(gene_data$CR[gene_data[[gene]] == 0], na.rm = TRUE) * 100
    n_mut <- sum(gene_data[[gene]], na.rm = TRUE)
    if (n_mut >= 10) {
      test <- chisq.test(table(gene_data$CR, gene_data[[gene]]))
      cat(sprintf("  %s: CR(mut)=%.1f%%, CR(wt)=%.1f%%, n_mut=%d, p=%s\n",
                  gsub("_mutated", "", gene), cr_mut, cr_wt, n_mut,
                  format(test$p.value, digits = 3)))
    }
  }
}

# Any pathway mutation
cat("\nAny Pathway Mutation:\n")
pathway_data <- duke %>% filter(!is.na(Has_Pathway_Mutation))
pathway_cr <- pathway_data %>%
  group_by(Has_Pathway_Mutation) %>%
  summarise(
    n = n(),
    CR_rate = round(mean(CR) * 100, 1),
    .groups = "drop"
  )
print(pathway_cr)

# Egress Score
cat("\nEgress Score and CR:\n")
egress_data <- duke %>% filter(!is.na(Egress_Score))
egress_cr <- egress_data %>%
  group_by(Egress_Score) %>%
  summarise(
    n = n(),
    CR_rate = round(mean(CR) * 100, 1),
    .groups = "drop"
  )
print(egress_cr)

#------------------------------------------------------------------------------
# 4. CHAPUY CLUSTER ANALYSIS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   CHAPUY CLUSTER ANALYSIS\n")
cat("=============================================================\n\n")

# Load Chapuy data
chapuy <- read.csv("Chapuy_Broad/data/processed/chapuy_integrated_135.csv", stringsAsFactors = FALSE)

cat("Chapuy cohort: ", nrow(chapuy), " patients\n")

# Check for treatment response data
cat("\nAvailable columns:\n")
response_cols <- grep("RESPONSE|response|CR|CHEMO|chemo|treatment|TREATMENT", names(chapuy), value = TRUE)
print(response_cols)

# Check R_CHOP_LIKE_CHEMO
cat("\nR-CHOP-like treatment:\n")
print(table(chapuy$R_CHOP_LIKE_CHEMO, useNA = "ifany"))

# Cluster distribution
cat("\nCluster distribution:\n")
print(table(chapuy$CLUSTER, useNA = "ifany"))

# Survival by cluster (as proxy for response)
cat("\n--- Survival by Chapuy Cluster ---\n")
chapuy_surv <- chapuy %>% filter(!is.na(OS_Event) & !is.na(OS_MONTHS))

cluster_surv <- chapuy_surv %>%
  group_by(CLUSTER) %>%
  summarise(
    n = n(),
    events = sum(OS_Event),
    event_rate = round(mean(OS_Event) * 100, 1),
    median_OS = round(median(OS_MONTHS, na.rm = TRUE), 1),
    .groups = "drop"
  ) %>%
  arrange(desc(event_rate))
print(cluster_surv)

# Cox regression
cat("\nCox regression by cluster:\n")
chapuy_surv$CLUSTER <- factor(chapuy_surv$CLUSTER)
cox_cluster <- coxph(Surv(OS_MONTHS, OS_Event) ~ CLUSTER, data = chapuy_surv)
print(summary(cox_cluster)$coefficients)

# COO distribution by cluster
cat("\n--- COO by Chapuy Cluster ---\n")
coo_cluster <- chapuy %>%
  filter(!is.na(ANY_COO) & ANY_COO != "") %>%
  group_by(CLUSTER, ANY_COO) %>%
  summarise(n = n(), .groups = "drop") %>%
  tidyr::pivot_wider(names_from = ANY_COO, values_from = n, values_fill = 0)
print(coo_cluster)

#------------------------------------------------------------------------------
# 5. LOAD CHAPUY RAW CLINICAL DATA FOR RESPONSE
#------------------------------------------------------------------------------
cat("\n--- Checking Chapuy Raw Clinical Data ---\n")

chapuy_clinical <- read.delim("Chapuy_Broad/data/raw/data_clinical_patient.txt",
                               stringsAsFactors = FALSE, comment.char = "#")
cat("Chapuy clinical columns:\n")
print(names(chapuy_clinical))

# Check for response-related columns
if ("TREATMENT_RESPONSE" %in% names(chapuy_clinical) ||
    "BEST_RESPONSE" %in% names(chapuy_clinical)) {
  cat("\nResponse data found!\n")
}

#------------------------------------------------------------------------------
# 6. LACY TRANSCRIPTOMIC ANALYSIS - SURVIVAL AS PROXY
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   LACY TRANSCRIPTOMIC ANALYSIS\n")
cat("=============================================================\n\n")

# Load tEgress data with survival
lacy_tegress <- read.csv("Lacy_HMRN/results/tegress_scores.csv", stringsAsFactors = FALSE)
cat("Lacy expression samples: ", nrow(lacy_tegress), "\n")

# Early death (within 1 year) as proxy for poor response
lacy_tegress$early_death <- ifelse(lacy_tegress$OS_status == 1 &
                                    lacy_tegress$OS_time < 365, 1, 0)

cat("\nEarly death (<1 year) rate: ", round(mean(lacy_tegress$early_death, na.rm = TRUE) * 100, 1), "%\n")

# tEgress and early death
cat("\n--- tEgress and Early Death ---\n")
tegress_early <- lacy_tegress %>%
  filter(!is.na(early_death)) %>%
  group_by(early_death) %>%
  summarise(
    n = n(),
    mean_tEgress = round(mean(tEgress, na.rm = TRUE), 3),
    .groups = "drop"
  )
print(tegress_early)

tegress_test <- t.test(tEgress ~ early_death, data = lacy_tegress)
cat("T-test p =", format(tegress_test$p.value, digits = 3), "\n")

# By COO
cat("\n--- Early Death by COO ---\n")
coo_early <- lacy_tegress %>%
  filter(!is.na(early_death)) %>%
  group_by(COO) %>%
  summarise(
    n = n(),
    early_death_rate = round(mean(early_death, na.rm = TRUE) * 100, 1),
    .groups = "drop"
  ) %>%
  arrange(desc(early_death_rate))
print(coo_early)

# Retention/Egress scores and early death
cat("\n--- Retention/Egress Scores and Early Death ---\n")
score_early <- lacy_tegress %>%
  filter(!is.na(early_death)) %>%
  group_by(early_death) %>%
  summarise(
    n = n(),
    mean_retention = round(mean(Retention_score, na.rm = TRUE), 3),
    mean_egress = round(mean(Egress_score, na.rm = TRUE), 3),
    .groups = "drop"
  )
print(score_early)

#------------------------------------------------------------------------------
# 7. LACY GENETIC CLUSTERS AND SURVIVAL
#------------------------------------------------------------------------------
cat("\n--- Lacy Genetic Clusters and Early Death ---\n")

lacy_genetic <- read.csv("Lacy_HMRN/data/genetic_egress_scores.csv", stringsAsFactors = FALSE)

# Early death
lacy_genetic$early_death <- ifelse(lacy_genetic$OS_status == 1 &
                                    lacy_genetic$OS_time < 365, 1, 0)

cluster_early <- lacy_genetic %>%
  filter(!is.na(early_death) & !is.na(cluster_ICL)) %>%
  group_by(cluster_ICL) %>%
  summarise(
    n = n(),
    early_death_rate = round(mean(early_death, na.rm = TRUE) * 100, 1),
    events_1yr = sum(early_death),
    .groups = "drop"
  ) %>%
  arrange(desc(early_death_rate))

cat("\nEarly Death Rate by Lacy Cluster:\n")
print(cluster_early)

#------------------------------------------------------------------------------
# 8. MULTIVARIATE MODEL FOR NO CR (DUKE)
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   MULTIVARIATE ANALYSIS: PREDICTORS OF NO CR\n")
cat("=============================================================\n\n")

# Prepare data
duke_model <- duke %>%
  filter(!is.na(IPI) & !is.na(Subtype) & !is.na(AGE_AT_DIAGNOSIS)) %>%
  mutate(
    age_gt_60 = ifelse(AGE_AT_DIAGNOSIS > 60, 1, 0),
    high_IPI = ifelse(IPI >= 3, 1, 0),
    is_BN2 = ifelse(Subtype == "BN2", 1, 0),
    is_TP53 = ifelse(Subtype == "TP53", 1, 0),
    is_MCD = ifelse(Subtype == "MCD", 1, 0)
  )

cat("Multivariate sample size: ", nrow(duke_model), "\n\n")

# Logistic regression for no CR
logit_model <- glm(no_CR ~ high_IPI + age_gt_60 + is_BN2 + is_TP53 + is_MCD,
                   data = duke_model, family = binomial)

cat("Logistic Regression: Predictors of No CR\n")
cat("(Odds ratios with 95% CI)\n\n")

coefs <- summary(logit_model)$coefficients
or <- exp(coefs[, 1])
ci_lower <- exp(coefs[, 1] - 1.96 * coefs[, 2])
ci_upper <- exp(coefs[, 1] + 1.96 * coefs[, 2])
p_vals <- coefs[, 4]

results <- data.frame(
  Variable = rownames(coefs),
  OR = round(or, 2),
  CI_lower = round(ci_lower, 2),
  CI_upper = round(ci_upper, 2),
  P_value = p_vals
)
print(results[-1, ])  # Exclude intercept

#------------------------------------------------------------------------------
# 9. SAVE RESULTS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("                    SAVING RESULTS\n")
cat("=============================================================\n\n")

write.csv(subtype_cr, "global_scripts/cr_rate_by_subtype.csv", row.names = FALSE)
write.csv(cluster_surv, "global_scripts/chapuy_cluster_survival.csv", row.names = FALSE)
write.csv(cluster_early, "global_scripts/lacy_cluster_early_death.csv", row.names = FALSE)

cat("Saved:\n")
cat("  - cr_rate_by_subtype.csv\n")
cat("  - chapuy_cluster_survival.csv\n")
cat("  - lacy_cluster_early_death.csv\n")

cat("\n=== ANALYSIS COMPLETE ===\n")
