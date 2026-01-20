# EZB and COO-Specific Pathway Analysis
# Eric Perkey - January 2026

library(survival)
library(dplyr)
library(tidyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=== EZB AND COO-SPECIFIC PATHWAY ANALYSIS ===\n\n")

#------------------------------------------------------------------------------
# 1. LOAD DATA
#------------------------------------------------------------------------------
duke <- read.csv("Reddy_Duke/data/processed/duke_classified.csv", stringsAsFactors = FALSE)
chapuy <- read.csv("Chapuy_Broad/data/processed/chapuy_integrated_135.csv", stringsAsFactors = FALSE)
chapuy_pathway <- read.csv("Chapuy_Broad/data/processed/pathway_status_by_patient.csv", stringsAsFactors = FALSE)

# Merge Chapuy data
chapuy_full <- chapuy %>%
  left_join(chapuy_pathway %>% select(PATIENT_ID, Retention_Score, Egress_Score, Pathway_Status),
            by = "PATIENT_ID")

#------------------------------------------------------------------------------
# 2. DUKE: SUBTYPE-SPECIFIC ANALYSIS
#------------------------------------------------------------------------------
cat("=== DUKE: Genetic Subtype Analysis ===\n")
cat("Total Duke samples with survival: ", sum(!is.na(duke$OS_EVENT)), "\n\n")

# Subtypes
cat("Subtype distribution:\n")
print(table(duke$Subtype, useNA = "ifany"))

# EZB-specific analysis
cat("\n--- EZB Subtype ---\n")
ezb <- duke %>% filter(Subtype == "EZB" & !is.na(OS_EVENT))
cat("EZB samples: ", nrow(ezb), "\n")

# Pathway mutation rates in EZB
cat("\nPathway mutation rates in EZB:\n")
cat("  S1PR2: ", round(mean(ezb$S1PR2_mutated, na.rm = TRUE) * 100, 1), "%\n")
cat("  GNA13: ", round(mean(ezb$GNA13_mutated, na.rm = TRUE) * 100, 1), "%\n")
cat("  RHOA: ", round(mean(ezb$RHOA_mutated, na.rm = TRUE) * 100, 1), "%\n")
cat("  CXCR4: ", round(mean(ezb$CXCR4_mutated, na.rm = TRUE) * 100, 1), "%\n")
cat("  Any pathway: ", round(mean(ezb$Has_Pathway_Mutation == "Yes", na.rm = TRUE) * 100, 1), "%\n")

# Survival by pathway mutation in EZB
cat("\n--- EZB Survival by Pathway Mutation ---\n")
fit_ezb <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ Has_Pathway_Mutation, data = ezb)
print(summary(fit_ezb)$table)

if (sum(ezb$Has_Pathway_Mutation == "Yes") >= 5) {
  cox_ezb <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ Has_Pathway_Mutation, data = ezb)
  hr <- exp(coef(cox_ezb))
  ci <- exp(confint(cox_ezb))
  pval <- summary(cox_ezb)$coefficients[5]
  cat("\nCox HR (pathway mut Yes vs No): ", round(hr, 2),
      " (95% CI: ", round(ci[1], 2), "-", round(ci[2], 2), "), p = ", format(pval, digits = 3), "\n")
}

# Survival by egress score category in EZB
cat("\n--- EZB Survival by Egress Score ---\n")
cat("Egress score distribution:\n")
print(table(ezb$Egress_High))

fit_ezb_egress <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ Egress_High, data = ezb)
print(summary(fit_ezb_egress)$table)

# Try log-rank test
if (length(unique(ezb$Egress_High)) > 1) {
  lr <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ Egress_High, data = ezb)
  cat("Log-rank p = ", format(1 - pchisq(lr$chisq, df = 1), digits = 3), "\n")
}

#------------------------------------------------------------------------------
# 3. DUKE: ALL SUBTYPES COMPARISON
#------------------------------------------------------------------------------
cat("\n=== Pathway Effect by Genetic Subtype ===\n")

subtype_results <- data.frame(
  Subtype = character(),
  N = integer(),
  N_pathway = integer(),
  Events = integer(),
  HR = numeric(),
  HR_lower = numeric(),
  HR_upper = numeric(),
  P_value = numeric(),
  stringsAsFactors = FALSE
)

for (st in unique(duke$Subtype)) {
  if (!is.na(st) && st != "") {
    subset_data <- duke %>% filter(Subtype == st & !is.na(OS_EVENT))

    n_total <- nrow(subset_data)
    n_pathway <- sum(subset_data$Has_Pathway_Mutation == "Yes", na.rm = TRUE)
    n_events <- sum(subset_data$OS_EVENT, na.rm = TRUE)

    if (n_total >= 20 && n_pathway >= 5 && (n_total - n_pathway) >= 5) {
      cox <- tryCatch({
        coxph(Surv(OS_MONTHS, OS_EVENT) ~ Has_Pathway_Mutation, data = subset_data)
      }, error = function(e) NULL)

      if (!is.null(cox)) {
        hr <- exp(coef(cox))
        ci <- exp(confint(cox))
        pval <- summary(cox)$coefficients[5]

        subtype_results <- rbind(subtype_results, data.frame(
          Subtype = st,
          N = n_total,
          N_pathway = n_pathway,
          Events = n_events,
          HR = round(hr, 2),
          HR_lower = round(ci[1], 2),
          HR_upper = round(ci[2], 2),
          P_value = round(pval, 4)
        ))
      }
    }
  }
}

cat("\nPathway mutation survival effect by subtype:\n")
print(subtype_results)

#------------------------------------------------------------------------------
# 4. CHAPUY: CLUSTER-SPECIFIC ANALYSIS (C3 = EZB equivalent)
#------------------------------------------------------------------------------
cat("\n=== CHAPUY: Cluster-Specific Analysis ===\n")

# Chapuy clusters
cat("Cluster distribution:\n")
print(table(chapuy_full$CLUSTER, useNA = "ifany"))

# C3 (EZB-like) analysis
cat("\n--- Cluster C3 (EZB-like) ---\n")
c3 <- chapuy_full %>% filter(CLUSTER == 3 & !is.na(OS_Event))
cat("C3 samples: ", nrow(c3), "\n")

# Pathway rates
cat("\nPathway status in C3:\n")
print(table(c3$Pathway_Status, useNA = "ifany"))

# Create combined score
c3$Combined_Score <- c3$Retention_Score + c3$Egress_Score
cat("\nCombined score distribution in C3:\n")
print(table(c3$Combined_Score, useNA = "ifany"))

# Survival by score in C3
if (nrow(c3) > 10) {
  c3$Score_High <- ifelse(c3$Combined_Score >= 2, "Score 2+", "Score 0-1")

  cat("\n--- C3 Survival by Combined Egress Score ---\n")
  fit_c3 <- survfit(Surv(OS_MONTHS, OS_Event) ~ Score_High, data = c3)
  print(summary(fit_c3)$table)

  # Median survival
  for (grp in c("Score 0-1", "Score 2+")) {
    grp_data <- c3 %>% filter(Score_High == grp)
    cat("\n", grp, ": n =", nrow(grp_data),
        ", events =", sum(grp_data$OS_Event),
        ", median OS =", round(median(grp_data$OS_MONTHS[grp_data$OS_Event == 1], na.rm = TRUE), 1), "months\n")
  }

  if (sum(c3$Score_High == "Score 2+") >= 3) {
    lr <- survdiff(Surv(OS_MONTHS, OS_Event) ~ Score_High, data = c3)
    cat("\nLog-rank p = ", format(1 - pchisq(lr$chisq, df = 1), digits = 3), "\n")
  }
}

#------------------------------------------------------------------------------
# 5. COO-SUBTYPE INTERACTION ANALYSIS
#------------------------------------------------------------------------------
cat("\n=== COO-Subtype Interaction Analysis ===\n")

# Check if we can look at interaction
duke_coo <- duke %>% filter(!is.na(Subtype_strict) & Subtype_strict != "Other" & !is.na(OS_EVENT))
cat("Duke samples with strict subtype: ", nrow(duke_coo), "\n")

# Is subtype confounded with COO?
cat("\nSubtype by COO relationship:\n")
# EZB is typically GCB, MCD is typically ABC
cat("EZB: Likely GCB-derived\n")
cat("MCD: Likely ABC-derived\n")

# Look at survival interaction
duke_interact <- duke %>%
  filter(!is.na(Subtype) & !is.na(OS_EVENT)) %>%
  mutate(
    is_EZB = ifelse(Subtype == "EZB", 1, 0),
    has_pathway = ifelse(Has_Pathway_Mutation == "Yes", 1, 0)
  )

cat("\n--- Interaction Model: Subtype x Pathway ---\n")
cox_int <- tryCatch({
  coxph(Surv(OS_MONTHS, OS_EVENT) ~ is_EZB * has_pathway, data = duke_interact)
}, error = function(e) NULL)

if (!is.null(cox_int)) {
  cat("Cox regression with interaction:\n")
  print(summary(cox_int)$coefficients)
}

#------------------------------------------------------------------------------
# 6. DETAILED GNA13 ANALYSIS
#------------------------------------------------------------------------------
cat("\n=== GNA13 Mutation Analysis ===\n")

# GNA13 mutation rate by subtype
cat("\nGNA13 mutation rate by subtype:\n")
gna13_by_subtype <- duke %>%
  group_by(Subtype) %>%
  summarise(
    n = n(),
    gna13_mut = sum(GNA13_mutated, na.rm = TRUE),
    gna13_rate = round(mean(GNA13_mutated, na.rm = TRUE) * 100, 1),
    .groups = "drop"
  ) %>%
  arrange(desc(gna13_rate))
print(gna13_by_subtype)

# GNA13 survival effect in EZB
cat("\n--- GNA13 Survival Effect in EZB ---\n")
ezb_gna13 <- ezb %>% filter(!is.na(GNA13_mutated))
cat("EZB with GNA13 data: ", nrow(ezb_gna13), "\n")
cat("GNA13 mutant: ", sum(ezb_gna13$GNA13_mutated), "\n")

if (sum(ezb_gna13$GNA13_mutated) >= 5) {
  cox_gna13 <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ GNA13_mutated, data = ezb_gna13)
  hr <- exp(coef(cox_gna13))
  ci <- exp(confint(cox_gna13))
  pval <- summary(cox_gna13)$coefficients[5]
  cat("GNA13 HR in EZB: ", round(hr, 2),
      " (95% CI: ", round(ci[1], 2), "-", round(ci[2], 2), "), p = ", format(pval, digits = 3), "\n")
}

#------------------------------------------------------------------------------
# 7. SAVE RESULTS
#------------------------------------------------------------------------------
cat("\n=== Saving Results ===\n")
write.csv(subtype_results, "global_scripts/subtype_pathway_survival.csv", row.names = FALSE)
cat("Saved: subtype_pathway_survival.csv\n")

cat("\n=== ANALYSIS COMPLETE ===\n")
