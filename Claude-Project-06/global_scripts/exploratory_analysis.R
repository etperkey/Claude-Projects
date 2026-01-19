# Exploratory Bioinformatics Analysis of DLBCL Datasets
# Eric Perkey - January 2026

library(survival)
library(dplyr)
library(tidyr)

# Set working directory
setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=== EXPLORATORY DLBCL ANALYSIS ===\n\n")

#------------------------------------------------------------------------------
# 1. LOAD ALL DATASETS
#------------------------------------------------------------------------------
cat("Loading datasets...\n")

# Lacy HMRN - tEgress + gEgress merged
lacy_merged <- read.csv("Lacy_HMRN/results/gcb_tegress_gegress_merged.csv", stringsAsFactors = FALSE)
cat("  Lacy merged: ", nrow(lacy_merged), " samples\n")

# Lacy genomic data (full)
lacy_genomic <- read.csv("Lacy_HMRN/genomic_data.csv", stringsAsFactors = FALSE)
cat("  Lacy genomic: ", nrow(lacy_genomic), " samples\n")

# Chapuy integrated
chapuy <- read.csv("Chapuy_Broad/data/processed/chapuy_integrated_135.csv", stringsAsFactors = FALSE)
chapuy_pathway <- read.csv("Chapuy_Broad/data/processed/pathway_status_by_patient.csv", stringsAsFactors = FALSE)
cat("  Chapuy: ", nrow(chapuy), " samples\n")

# Duke
duke <- read.csv("Reddy_Duke/data/processed/duke_classified.csv", stringsAsFactors = FALSE)
cat("  Duke: ", nrow(duke), " samples\n")

# GAMBL
gambl <- read.csv("Dreval_GAMBL/data/processed/gambl_clinical_merged.csv", stringsAsFactors = FALSE)
cat("  GAMBL: ", nrow(gambl), " samples\n")

# REMoDL-B
remodlb <- read.csv("Sha_REMoDL-B/data/processed/tEgress_clinical.csv", stringsAsFactors = FALSE)
cat("  REMoDL-B: ", nrow(remodlb), " samples\n")

# Lacy tEgress scores (full dataset)
lacy_tegress <- read.csv("Lacy_HMRN/results/tegress_scores.csv", stringsAsFactors = FALSE)
cat("  Lacy tEgress: ", nrow(lacy_tegress), " samples\n")

# Lacy gEgress (genetic scores)
lacy_gegress <- read.csv("Lacy_HMRN/data/genetic_egress_scores.csv", stringsAsFactors = FALSE)
cat("  Lacy gEgress: ", nrow(lacy_gegress), " samples\n")

#------------------------------------------------------------------------------
# 2. ANALYSIS 1: tEgress vs gEgress CORRELATION (Lacy cohort)
#------------------------------------------------------------------------------
cat("\n=== ANALYSIS 1: tEgress vs gEgress Correlation ===\n")

# Check columns
cat("Lacy merged columns:\n")
print(names(lacy_merged))

# Filter to samples with both scores
if ("tEgress" %in% names(lacy_merged) && "gEgress" %in% names(lacy_merged)) {
  lacy_both <- lacy_merged %>% filter(!is.na(tEgress) & !is.na(gEgress))
  cat("\nSamples with both scores: ", nrow(lacy_both), "\n")

  # Correlation
  cor_result <- cor.test(lacy_both$tEgress, lacy_both$gEgress, method = "spearman")
  cat("Spearman correlation: rho = ", round(cor_result$estimate, 3),
      ", p = ", format(cor_result$p.value, digits = 3), "\n")

  # By mutation status
  if ("any_pathway_mut" %in% names(lacy_both)) {
    cat("\ntEgress by mutation status:\n")
    summary_by_mut <- lacy_both %>%
      group_by(any_pathway_mut) %>%
      summarise(
        n = n(),
        mean_tEgress = mean(tEgress, na.rm = TRUE),
        sd_tEgress = sd(tEgress, na.rm = TRUE),
        .groups = "drop"
      )
    print(summary_by_mut)

    # T-test
    mutant <- lacy_both %>% filter(any_pathway_mut == 1) %>% pull(tEgress)
    wildtype <- lacy_both %>% filter(any_pathway_mut == 0) %>% pull(tEgress)
    if (length(mutant) > 2 && length(wildtype) > 2) {
      ttest <- t.test(mutant, wildtype)
      cat("\ntEgress by pathway mutation: t = ", round(ttest$statistic, 2),
          ", p = ", format(ttest$p.value, digits = 3), "\n")
    }
  }
}

#------------------------------------------------------------------------------
# 3. ANALYSIS 2: Cross-cohort survival meta-analysis
#------------------------------------------------------------------------------
cat("\n=== ANALYSIS 2: Cross-Cohort Pathway Survival ===\n")

# Prepare standardized survival data from each cohort

# Duke
duke_surv <- duke %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT)) %>%
  mutate(
    cohort = "Duke",
    has_pathway_mut = ifelse(Has_Pathway_Mutation == "Yes", 1, 0),
    egress_high = ifelse(Egress_High == "High (2+)", 1, 0),
    os_time = OS_MONTHS,
    os_event = OS_EVENT,
    coo = Subtype
  ) %>%
  select(cohort, has_pathway_mut, egress_high, os_time, os_event, coo)

cat("Duke survival data: n = ", nrow(duke_surv), "\n")

# Chapuy
chapuy_surv <- chapuy %>%
  left_join(chapuy_pathway %>% select(PATIENT_ID, Retention_Score, Egress_Score, Pathway_Status),
            by = "PATIENT_ID") %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_Event)) %>%
  mutate(
    cohort = "Chapuy",
    has_pathway_mut = ifelse(Pathway_Status != "Neither", 1, 0),
    egress_high = ifelse((Retention_Score + Egress_Score) >= 2, 1, 0),
    os_time = OS_MONTHS,
    os_event = OS_Event,
    coo = ANY_COO
  ) %>%
  select(cohort, has_pathway_mut, egress_high, os_time, os_event, coo)

cat("Chapuy survival data: n = ", nrow(chapuy_surv), "\n")

# GAMBL
gambl_surv <- gambl %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT)) %>%
  mutate(
    cohort = "GAMBL",
    has_pathway_mut = ifelse((CXCR4 + GNA13 + GNAI2 + RHOA + S1PR2) > 0, 1, 0),
    combined_score = Retention_Score + Egress_Score,
    egress_high = ifelse(combined_score >= 2, 1, 0),
    os_time = OS_MONTHS,
    os_event = OS_EVENT,
    coo = NA_character_
  ) %>%
  select(cohort, has_pathway_mut, egress_high, os_time, os_event, coo)

cat("GAMBL survival data: n = ", nrow(gambl_surv), "\n")

# Combine all cohorts
combined_surv <- bind_rows(duke_surv, chapuy_surv, gambl_surv)
cat("\nCombined survival data: n = ", nrow(combined_surv), "\n")

# Overall pathway mutation effect
cat("\n--- Any Pathway Mutation vs Survival ---\n")
fit_pathway <- survfit(Surv(os_time, os_event) ~ has_pathway_mut, data = combined_surv)
print(summary(fit_pathway)$table)

cox_pathway <- coxph(Surv(os_time, os_event) ~ has_pathway_mut + cohort, data = combined_surv)
cat("\nCox regression (adjusted for cohort):\n")
print(summary(cox_pathway)$coefficients)

# High egress score effect
cat("\n--- Egress Score ≥2 vs Survival ---\n")
cat("Egress High n: ", sum(combined_surv$egress_high, na.rm = TRUE), "\n")
fit_egress <- survfit(Surv(os_time, os_event) ~ egress_high, data = combined_surv)
print(summary(fit_egress)$table)

cox_egress <- coxph(Surv(os_time, os_event) ~ egress_high + cohort, data = combined_surv)
cat("\nCox regression (adjusted for cohort):\n")
print(summary(cox_egress)$coefficients)

#------------------------------------------------------------------------------
# 4. ANALYSIS 3: COO-specific effects
#------------------------------------------------------------------------------
cat("\n=== ANALYSIS 3: COO-Specific Pathway Effects ===\n")

# Filter to samples with COO
coo_data <- combined_surv %>% filter(!is.na(coo) & coo != "" & coo != "Unclassified")

cat("Samples with COO classification: ", nrow(coo_data), "\n")
print(table(coo_data$coo))

# Test by COO
for (coo_type in c("GCB", "ABC")) {
  coo_subset <- coo_data %>% filter(coo == coo_type)
  cat("\n--- ", coo_type, " Subtype (n = ", nrow(coo_subset), ") ---\n")

  if (nrow(coo_subset) > 10) {
    # Pathway mutation
    events_mut <- sum(coo_subset$os_event[coo_subset$has_pathway_mut == 1], na.rm = TRUE)
    events_wt <- sum(coo_subset$os_event[coo_subset$has_pathway_mut == 0], na.rm = TRUE)
    cat("Events in mutant: ", events_mut, "\n")
    cat("Events in wildtype: ", events_wt, "\n")

    if (events_mut > 0 && events_wt > 0) {
      cox_coo <- coxph(Surv(os_time, os_event) ~ has_pathway_mut, data = coo_subset)
      hr <- exp(coef(cox_coo))
      ci <- exp(confint(cox_coo))
      pval <- summary(cox_coo)$coefficients[5]
      cat("HR = ", round(hr, 2), " (95% CI: ", round(ci[1], 2), "-", round(ci[2], 2),
          "), p = ", format(pval, digits = 3), "\n")
    }
  }
}

#------------------------------------------------------------------------------
# 5. ANALYSIS 4: Novel gene correlations with tEgress
#------------------------------------------------------------------------------
cat("\n=== ANALYSIS 4: Novel Gene Correlations with tEgress ===\n")

# Use Lacy tEgress full dataset
if (nrow(lacy_tegress) > 0 && "tEgress" %in% names(lacy_tegress)) {
  cat("Analyzing tEgress correlations in Lacy cohort...\n")

  # Load mortality signature genes
  mort_sig <- read.csv("Lacy_HMRN/results/mortality_signature_gcb.csv", stringsAsFactors = FALSE)
  cat("Top mortality-associated genes in GCB:\n")
  print(head(mort_sig, 10))
}

#------------------------------------------------------------------------------
# 6. ANALYSIS 5: Gene mutations co-occurring with pathway genes
#------------------------------------------------------------------------------
cat("\n=== ANALYSIS 5: Co-occurring Mutations ===\n")

# Check Lacy genomic data for co-mutations
if ("GNA13" %in% names(lacy_genomic)) {
  cat("Analyzing co-mutations with GNA13...\n")

  gna13_pos <- lacy_genomic %>% filter(GNA13 == 1)
  gna13_neg <- lacy_genomic %>% filter(GNA13 == 0)

  cat("GNA13 mutant: n = ", nrow(gna13_pos), "\n")
  cat("GNA13 wildtype: n = ", nrow(gna13_neg), "\n")

  # Find significantly co-occurring genes
  gene_cols <- names(lacy_genomic)[!names(lacy_genomic) %in% c("PID", "GNA13")]

  co_occur_results <- data.frame(
    gene = character(),
    freq_gna13_pos = numeric(),
    freq_gna13_neg = numeric(),
    odds_ratio = numeric(),
    p_value = numeric(),
    stringsAsFactors = FALSE
  )

  for (gene in gene_cols) {
    if (is.numeric(lacy_genomic[[gene]]) || all(lacy_genomic[[gene]] %in% c(0, 1, NA))) {
      freq_pos <- mean(gna13_pos[[gene]], na.rm = TRUE)
      freq_neg <- mean(gna13_neg[[gene]], na.rm = TRUE)

      if (!is.na(freq_pos) && !is.na(freq_neg) && freq_pos > 0.01) {
        tbl <- table(lacy_genomic$GNA13, lacy_genomic[[gene]])
        if (nrow(tbl) == 2 && ncol(tbl) == 2) {
          test <- tryCatch(fisher.test(tbl), error = function(e) NULL)
          if (!is.null(test)) {
            co_occur_results <- rbind(co_occur_results, data.frame(
              gene = gene,
              freq_gna13_pos = round(freq_pos * 100, 1),
              freq_gna13_neg = round(freq_neg * 100, 1),
              odds_ratio = round(test$estimate, 2),
              p_value = test$p.value
            ))
          }
        }
      }
    }
  }

  # Adjust p-values
  co_occur_results$fdr <- p.adjust(co_occur_results$p_value, method = "BH")

  # Show significant results
  sig_cooccur <- co_occur_results %>%
    filter(fdr < 0.1) %>%
    arrange(p_value)

  cat("\nSignificantly co-occurring mutations with GNA13 (FDR < 0.1):\n")
  print(sig_cooccur)
}

#------------------------------------------------------------------------------
# 7. ANALYSIS 6: Stage-specific pathway effects
#------------------------------------------------------------------------------
cat("\n=== ANALYSIS 6: Stage-Specific Effects ===\n")

# Check if we have stage data in merged file
if ("Stage" %in% names(lacy_merged) || "stage_group" %in% names(lacy_merged)) {
  stage_data <- lacy_merged %>%
    filter(!is.na(stage_group) & !is.na(tEgress) & !is.na(OS_years) & !is.na(OS_status_x))

  cat("Samples with stage data: ", nrow(stage_data), "\n")

  if (nrow(stage_data) > 50) {
    # tEgress by stage
    cat("\ntEgress by stage group:\n")
    stage_summary <- stage_data %>%
      group_by(stage_group) %>%
      summarise(
        n = n(),
        mean_tEgress = mean(tEgress, na.rm = TRUE),
        events = sum(OS_status_x, na.rm = TRUE),
        .groups = "drop"
      )
    print(stage_summary)

    # Stage-tEgress interaction
    if (length(unique(stage_data$stage_group)) >= 2) {
      stage_data$tEgress_high <- ifelse(stage_data$tEgress > median(stage_data$tEgress, na.rm = TRUE), 1, 0)

      cox_int <- tryCatch(
        coxph(Surv(OS_years, OS_status_x) ~ tEgress_high * stage_group, data = stage_data),
        error = function(e) NULL
      )

      if (!is.null(cox_int)) {
        cat("\nCox regression with stage-tEgress interaction:\n")
        print(summary(cox_int)$coefficients)
      }
    }
  }
}

#------------------------------------------------------------------------------
# 8. SAVE RESULTS
#------------------------------------------------------------------------------
cat("\n=== Saving Results ===\n")

# Save combined survival data
write.csv(combined_surv, "global_scripts/combined_survival_data.csv", row.names = FALSE)
cat("Saved: combined_survival_data.csv\n")

# Save co-occurrence results if generated
if (exists("sig_cooccur") && nrow(sig_cooccur) > 0) {
  write.csv(sig_cooccur, "global_scripts/gna13_cooccurrence.csv", row.names = FALSE)
  cat("Saved: gna13_cooccurrence.csv\n")
}

cat("\n=== ANALYSIS COMPLETE ===\n")
