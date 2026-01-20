# Novel Clinical Features Analysis
# Exploring underutilized data in DLBCL cohorts

library(survival)
library(dplyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("      NOVEL CLINICAL FEATURES ANALYSIS - DLBCL\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. LOAD DUKE DATA (RICHEST CLINICAL DATA)
#------------------------------------------------------------------------------
cat("=== Loading Duke Data ===\n")

duke_patient <- read.csv("Reddy_Duke/data/raw/data_clinical_patient.csv", stringsAsFactors = FALSE)
duke_sample <- read.csv("Reddy_Duke/data/raw/data_clinical_sample.csv", stringsAsFactors = FALSE)
duke_class <- read.csv("Reddy_Duke/data/processed/duke_classified.csv", stringsAsFactors = FALSE)

# Merge patient and sample data (PATIENT_ID in patient, SAMPLE_ID in sample - same values)
duke_merged <- duke_patient %>%
  left_join(duke_sample, by = c("PATIENT_ID" = "SAMPLE_ID")) %>%
  left_join(duke_class %>% select(PATIENT_ID, Subtype, Subtype_strict, EZB_score, MCD_score),
            by = "PATIENT_ID")

cat("Duke merged data: ", nrow(duke_merged), " rows\n")

# Create survival event variable
duke_merged$OS_EVENT <- ifelse(grepl("DECEASED", duke_merged$OS_STATUS), 1, 0)

#------------------------------------------------------------------------------
# 2. TREATMENT RESPONSE ANALYSIS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("           TREATMENT RESPONSE ANALYSIS\n")
cat("=============================================================\n\n")

cat("Treatment response distribution:\n")
print(table(duke_merged$INITIAL_TX_RESPONSE, useNA = "ifany"))

# Clean up response data
duke_resp <- duke_merged %>%
  filter(!is.na(INITIAL_TX_RESPONSE) & INITIAL_TX_RESPONSE != "" &
         !is.na(OS_MONTHS) & !is.na(OS_EVENT)) %>%
  mutate(
    complete_response = ifelse(INITIAL_TX_RESPONSE == "Complete response", 1, 0),
    any_response = ifelse(INITIAL_TX_RESPONSE %in% c("Complete response", "Partial response"), 1, 0)
  )

cat("\nPatients with response + survival data: ", nrow(duke_resp), "\n")
cat("Complete response rate: ", round(mean(duke_resp$complete_response) * 100, 1), "%\n")

# Treatment response by subtype
cat("\n--- Complete Response Rate by Subtype ---\n")
resp_by_subtype <- duke_resp %>%
  filter(!is.na(Subtype)) %>%
  group_by(Subtype) %>%
  summarise(
    n = n(),
    CR_rate = round(mean(complete_response, na.rm = TRUE) * 100, 1),
    .groups = "drop"
  ) %>%
  arrange(desc(CR_rate))
print(resp_by_subtype)

# Treatment response and survival
cat("\n--- Treatment Response and Survival ---\n")
fit_resp <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ complete_response, data = duke_resp)
print(summary(fit_resp)$table)

cox_resp <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ complete_response, data = duke_resp)
hr <- exp(coef(cox_resp))
ci <- exp(confint(cox_resp))
pval <- summary(cox_resp)$coefficients[5]
cat("\nComplete response (protective) HR = ", round(hr, 2),
    " (", round(ci[1], 2), "-", round(ci[2], 2), "), p = ", format(pval, digits = 3), "\n")

# No response vs any response
cat("\n--- No Response vs Any Response ---\n")
fit_any <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ any_response, data = duke_resp)
print(summary(fit_any)$table)

#------------------------------------------------------------------------------
# 3. B SYMPTOMS ANALYSIS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("              B SYMPTOMS ANALYSIS\n")
cat("=============================================================\n\n")

cat("B symptoms distribution:\n")
print(table(duke_merged$B_SYMPTOMS_AT_DIAGNOSIS, useNA = "ifany"))

duke_bsym <- duke_merged %>%
  filter(!is.na(B_SYMPTOMS_AT_DIAGNOSIS) & B_SYMPTOMS_AT_DIAGNOSIS %in% c("Yes", "No") &
         !is.na(OS_MONTHS) & !is.na(OS_EVENT))
duke_bsym$B_symptoms <- ifelse(duke_bsym$B_SYMPTOMS_AT_DIAGNOSIS == "Yes", 1, 0)

cat("\nPatients with B symptoms data: ", nrow(duke_bsym), "\n")
cat("B symptoms positive: ", sum(duke_bsym$B_symptoms), " (",
    round(mean(duke_bsym$B_symptoms) * 100, 1), "%)\n")

# B symptoms and survival
cat("\n--- B Symptoms and Survival ---\n")
fit_bsym <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ B_symptoms, data = duke_bsym)
print(summary(fit_bsym)$table)

cox_bsym <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ B_symptoms, data = duke_bsym)
hr <- exp(coef(cox_bsym))
ci <- exp(confint(cox_bsym))
pval <- summary(cox_bsym)$coefficients[5]
cat("\nB symptoms HR = ", round(hr, 2),
    " (", round(ci[1], 2), "-", round(ci[2], 2), "), p = ", format(pval, digits = 3), "\n")

# B symptoms by subtype
cat("\n--- B Symptoms Rate by Subtype ---\n")
bsym_by_subtype <- duke_bsym %>%
  filter(!is.na(Subtype)) %>%
  group_by(Subtype) %>%
  summarise(
    n = n(),
    B_sym_rate = round(mean(B_symptoms, na.rm = TRUE) * 100, 1),
    .groups = "drop"
  ) %>%
  arrange(desc(B_sym_rate))
print(bsym_by_subtype)

#------------------------------------------------------------------------------
# 4. CNS INVOLVEMENT ANALYSIS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("            CNS INVOLVEMENT ANALYSIS\n")
cat("=============================================================\n\n")

cat("CNS status at diagnosis:\n")
print(table(duke_merged$CNS_STATUS, useNA = "ifany"))

cat("\nCNS relapse:\n")
print(table(duke_merged$CNS_RELAPSE, useNA = "ifany"))

# CNS relapse and survival
duke_cns <- duke_merged %>%
  filter(!is.na(CNS_RELAPSE) & CNS_RELAPSE %in% c("Yes", "No") &
         !is.na(OS_MONTHS) & !is.na(OS_EVENT))
duke_cns$CNS_relapse <- ifelse(duke_cns$CNS_RELAPSE == "Yes", 1, 0)

cat("\nPatients with CNS relapse data: ", nrow(duke_cns), "\n")
cat("CNS relapse rate: ", round(mean(duke_cns$CNS_relapse) * 100, 2), "%\n")

if (sum(duke_cns$CNS_relapse) >= 5) {
  cat("\n--- CNS Relapse and Survival ---\n")
  cox_cns <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ CNS_relapse, data = duke_cns)
  hr <- exp(coef(cox_cns))
  ci <- exp(confint(cox_cns))
  pval <- summary(cox_cns)$coefficients[5]
  cat("CNS relapse HR = ", round(hr, 2),
      " (", round(ci[1], 2), "-", round(ci[2], 2), "), p = ", format(pval, digits = 3), "\n")

  # CNS relapse by subtype
  cat("\n--- CNS Relapse Rate by Subtype ---\n")
  cns_by_subtype <- duke_cns %>%
    filter(!is.na(Subtype)) %>%
    group_by(Subtype) %>%
    summarise(
      n = n(),
      CNS_relapse_rate = round(mean(CNS_relapse, na.rm = TRUE) * 100, 2),
      .groups = "drop"
    ) %>%
    arrange(desc(CNS_relapse_rate))
  print(cns_by_subtype)
}

#------------------------------------------------------------------------------
# 5. FISH / TRANSLOCATION ANALYSIS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("           FISH / TRANSLOCATION ANALYSIS\n")
cat("=============================================================\n\n")

cat("BCL2 FISH status:\n")
print(table(duke_merged$BCL2_FISH_STATUS, useNA = "ifany"))

cat("\nBCL6 FISH status:\n")
print(table(duke_merged$BCL6_FISH_STATUS, useNA = "ifany"))

cat("\nMYC FISH status:\n")
print(table(duke_merged$MYC_FISH, useNA = "ifany"))

# Create translocation indicators (case-insensitive)
duke_fish <- duke_merged %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT)) %>%
  mutate(
    BCL2_trans = case_when(
      grepl("positive|Positive|POSITIVE", BCL2_FISH_STATUS) ~ 1,
      grepl("negative|Negative|NEGATIVE", BCL2_FISH_STATUS) ~ 0,
      TRUE ~ NA_real_
    ),
    BCL6_trans = case_when(
      grepl("positive|Positive|POSITIVE", BCL6_FISH_STATUS) ~ 1,
      grepl("negative|Negative|NEGATIVE", BCL6_FISH_STATUS) ~ 0,
      TRUE ~ NA_real_
    ),
    MYC_trans = case_when(
      grepl("positive|Positive|POSITIVE", MYC_FISH) ~ 1,
      grepl("negative|Negative|NEGATIVE", MYC_FISH) ~ 0,
      TRUE ~ NA_real_
    )
  )

cat("\n--- Translocation Frequencies ---\n")
cat("BCL2 translocation: ", sum(duke_fish$BCL2_trans, na.rm = TRUE), "/",
    sum(!is.na(duke_fish$BCL2_trans)), " (",
    round(mean(duke_fish$BCL2_trans, na.rm = TRUE) * 100, 1), "%)\n")
cat("BCL6 translocation: ", sum(duke_fish$BCL6_trans, na.rm = TRUE), "/",
    sum(!is.na(duke_fish$BCL6_trans)), " (",
    round(mean(duke_fish$BCL6_trans, na.rm = TRUE) * 100, 1), "%)\n")
cat("MYC translocation: ", sum(duke_fish$MYC_trans, na.rm = TRUE), "/",
    sum(!is.na(duke_fish$MYC_trans)), " (",
    round(mean(duke_fish$MYC_trans, na.rm = TRUE) * 100, 1), "%)\n")

# Double-hit analysis
duke_fish <- duke_fish %>%
  mutate(
    double_hit = ifelse(MYC_trans == 1 & (BCL2_trans == 1 | BCL6_trans == 1), 1, 0),
    triple_hit = ifelse(MYC_trans == 1 & BCL2_trans == 1 & BCL6_trans == 1, 1, 0)
  )

cat("\nDouble-hit (MYC + BCL2 or BCL6): ", sum(duke_fish$double_hit, na.rm = TRUE), " cases\n")
cat("Triple-hit (MYC + BCL2 + BCL6): ", sum(duke_fish$triple_hit, na.rm = TRUE), " cases\n")

# Survival by MYC translocation
cat("\n--- MYC Translocation and Survival ---\n")
duke_myc <- duke_fish %>% filter(!is.na(MYC_trans))
cat("Patients with MYC FISH: ", nrow(duke_myc), "\n")

if (sum(duke_myc$MYC_trans, na.rm = TRUE) >= 5) {
  cox_myc <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ MYC_trans, data = duke_myc)
  hr <- exp(coef(cox_myc))
  ci <- exp(confint(cox_myc))
  pval <- summary(cox_myc)$coefficients[5]
  cat("MYC translocation HR = ", round(hr, 2),
      " (", round(ci[1], 2), "-", round(ci[2], 2), "), p = ", format(pval, digits = 3), "\n")
}

# Translocation by subtype
cat("\n--- Translocation Rate by Subtype ---\n")
trans_by_subtype <- duke_fish %>%
  filter(!is.na(Subtype)) %>%
  group_by(Subtype) %>%
  summarise(
    n = n(),
    BCL2_rate = round(mean(BCL2_trans, na.rm = TRUE) * 100, 1),
    BCL6_rate = round(mean(BCL6_trans, na.rm = TRUE) * 100, 1),
    MYC_rate = round(mean(MYC_trans, na.rm = TRUE) * 100, 1),
    DH_rate = round(mean(double_hit, na.rm = TRUE) * 100, 1),
    .groups = "drop"
  ) %>%
  arrange(desc(BCL2_rate))
print(trans_by_subtype)

#------------------------------------------------------------------------------
# 6. TESTICULAR INVOLVEMENT
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("         TESTICULAR INVOLVEMENT ANALYSIS\n")
cat("=============================================================\n\n")

cat("Testicular involvement:\n")
print(table(duke_merged$TESTICULAR_INVOLVEMENT, useNA = "ifany"))

duke_test <- duke_merged %>%
  filter(!is.na(TESTICULAR_INVOLVEMENT) & TESTICULAR_INVOLVEMENT %in% c("Yes", "No") &
         !is.na(OS_MONTHS) & !is.na(OS_EVENT))
duke_test$testicular <- ifelse(duke_test$TESTICULAR_INVOLVEMENT == "Yes", 1, 0)

cat("\nTesticular involvement: ", sum(duke_test$testicular), " cases (",
    round(mean(duke_test$testicular) * 100, 1), "%)\n")

if (sum(duke_test$testicular) >= 5) {
  # By sex (should only be males)
  cat("\nTesticular involvement by sex:\n")
  print(table(duke_test$SEX, duke_test$testicular))

  # Survival
  cox_test <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ testicular, data = duke_test)
  hr <- exp(coef(cox_test))
  ci <- exp(confint(cox_test))
  pval <- summary(cox_test)$coefficients[5]
  cat("\nTesticular involvement HR = ", round(hr, 2),
      " (", round(ci[1], 2), "-", round(ci[2], 2), "), p = ", format(pval, digits = 3), "\n")

  # Testicular by subtype
  cat("\n--- Testicular Involvement by Subtype ---\n")
  test_by_subtype <- duke_test %>%
    filter(!is.na(Subtype)) %>%
    group_by(Subtype) %>%
    summarise(
      n = n(),
      testicular_rate = round(mean(testicular, na.rm = TRUE) * 100, 1),
      .groups = "drop"
    ) %>%
    arrange(desc(testicular_rate))
  print(test_by_subtype)
}

#------------------------------------------------------------------------------
# 7. IPI COMPONENT ANALYSIS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("            IPI COMPONENT ANALYSIS\n")
cat("=============================================================\n\n")

duke_ipi <- duke_merged %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT) & !is.na(IPI))

cat("IPI distribution:\n")
print(table(duke_ipi$IPI, useNA = "ifany"))

# IPI components
cat("\n--- IPI Component Survival Effects ---\n")

ipi_components <- c("IPI_AGE", "IPI_ANNARBOR_STAGE", "IPI_ECOG", "IPI_EXTRANODAL_SITES", "IPI_LDH")
for (comp in ipi_components) {
  if (comp %in% names(duke_ipi)) {
    comp_data <- duke_ipi %>% filter(!is.na(get(comp)))
    if (nrow(comp_data) > 50) {
      cox <- tryCatch({
        coxph(as.formula(paste("Surv(OS_MONTHS, OS_EVENT) ~", comp)), data = comp_data)
      }, error = function(e) NULL)

      if (!is.null(cox)) {
        hr <- exp(coef(cox))
        pval <- summary(cox)$coefficients[5]
        cat(comp, ": HR = ", round(hr, 2), ", p = ", format(pval, digits = 3), "\n")
      }
    }
  }
}

# IPI by subtype
cat("\n--- Mean IPI by Subtype ---\n")
ipi_by_subtype <- duke_ipi %>%
  filter(!is.na(Subtype)) %>%
  group_by(Subtype) %>%
  summarise(
    n = n(),
    mean_IPI = round(mean(IPI, na.rm = TRUE), 2),
    high_IPI_rate = round(mean(IPI >= 3, na.rm = TRUE) * 100, 1),
    .groups = "drop"
  ) %>%
  arrange(desc(mean_IPI))
print(ipi_by_subtype)

#------------------------------------------------------------------------------
# 8. SAVE RESULTS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("                    SAVING RESULTS\n")
cat("=============================================================\n\n")

write.csv(resp_by_subtype, "global_scripts/treatment_response_by_subtype.csv", row.names = FALSE)
write.csv(trans_by_subtype, "global_scripts/translocations_by_subtype.csv", row.names = FALSE)
write.csv(ipi_by_subtype, "global_scripts/ipi_by_subtype.csv", row.names = FALSE)

cat("Saved:\n")
cat("  - treatment_response_by_subtype.csv\n")
cat("  - translocations_by_subtype.csv\n")
cat("  - ipi_by_subtype.csv\n")

cat("\n=== ANALYSIS COMPLETE ===\n")
