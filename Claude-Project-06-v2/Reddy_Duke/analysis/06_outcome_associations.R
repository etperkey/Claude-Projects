# =============================================================================
# 06_outcome_associations.R
# Test associations between mutation burden/patterns and clinical outcomes
# =============================================================================

library(dplyr)
library(tidyr)
library(readr)
library(survival)
library(survminer)
library(ggplot2)

# Output directory
output_dir <- "Reddy_Duke/analysis/output"
figures_dir <- "Reddy_Duke/analysis/figures"

# -----------------------------------------------------------------------------
# Load data
# -----------------------------------------------------------------------------
cat("Loading data...\n")

# Load patient mutation burden from aSHM analysis
patient_ashm <- read_csv(file.path(output_dir, "patient_ashm_burden.csv"),
                         show_col_types = FALSE)
cat(sprintf("  Patient aSHM burden: %d patients\n", nrow(patient_ashm)))

# Load patient GoF hotspot data
patient_gof <- read_csv(file.path(output_dir, "patient_gof_hotspots.csv"),
                        show_col_types = FALSE)

# Load Chapuy clinical data
chapuy_clin <- read.delim("Chapuy_Broad/data/raw/data_clinical_patient.txt",
                          stringsAsFactors = FALSE, skip = 4)
cat(sprintf("  Chapuy clinical: %d patients\n", nrow(chapuy_clin)))

# Load Reddy/Duke clinical data for larger cohort analysis
duke_clin <- read_csv("Reddy_Duke/data/raw/data_clinical_combined.csv",
                      show_col_types = FALSE)
cat(sprintf("  Duke clinical: %d patients\n", nrow(duke_clin)))

# Load gene selection data for gene-level testing
gene_selection <- read_csv(file.path(output_dir, "gene_classification_with_selection.csv"),
                           show_col_types = FALSE)

# Load tumor suppressor list
tumor_suppressors <- read_csv(file.path(output_dir, "tumor_suppressors.csv"),
                              show_col_types = FALSE)

# -----------------------------------------------------------------------------
# Prepare Chapuy clinical data for survival analysis
# -----------------------------------------------------------------------------
cat("\nPreparing Chapuy survival data...\n")

# Parse OS status
chapuy_clin <- chapuy_clin %>%
  mutate(
    OS_event = case_when(
      grepl("DECEASED", OS_STATUS) | OS_STATUS == "1:DECEASED" ~ 1,
      grepl("LIVING", OS_STATUS) | OS_STATUS == "0:LIVING" ~ 0,
      TRUE ~ NA_real_
    ),
    OS_MONTHS = as.numeric(OS_MONTHS),
    PFS_event = case_when(
      grepl("Progressed", PFS_STATUS) | PFS_STATUS == "1:Progressed" ~ 1,
      grepl("Not Progressed", PFS_STATUS) | PFS_STATUS == "0:Not Progressed" ~ 0,
      TRUE ~ NA_real_
    ),
    PFS_MONTHS = as.numeric(PFS_MONTHS),
    IPI = as.numeric(IPI)
  )

# Merge clinical with mutation burden
# First, standardize patient IDs
patient_ashm <- patient_ashm %>%
  mutate(PATIENT_ID = Patient_ID)

patient_gof <- patient_gof %>%
  mutate(PATIENT_ID = Patient_ID)

chapuy_merged <- chapuy_clin %>%
  left_join(patient_ashm, by = "PATIENT_ID") %>%
  left_join(patient_gof %>% select(PATIENT_ID, GoF_hotspot_count, Has_GoF_hotspot),
            by = "PATIENT_ID")

# Fill NAs with 0 for burden scores
chapuy_merged <- chapuy_merged %>%
  mutate(
    across(c(aSHM_burden, Selected_LoF_burden, GoF_hotspot_count),
           ~ifelse(is.na(.), 0, .)),
    Has_GoF_hotspot = ifelse(is.na(Has_GoF_hotspot), FALSE, Has_GoF_hotspot)
  )

# Create burden categories
chapuy_merged <- chapuy_merged %>%
  mutate(
    aSHM_high = aSHM_burden > median(aSHM_burden, na.rm = TRUE),
    LoF_high = Selected_LoF_burden > median(Selected_LoF_burden, na.rm = TRUE),
    aSHM_tertile = ntile(aSHM_burden, 3),
    Total_burden = Total_mutations
  )

cat(sprintf("  Merged data: %d patients with survival + mutations\n",
            sum(!is.na(chapuy_merged$OS_event) & !is.na(chapuy_merged$aSHM_burden))))

# -----------------------------------------------------------------------------
# OS analysis: Mutation burden associations
# -----------------------------------------------------------------------------
cat("\nTesting OS associations...\n")

# Filter to complete cases
os_data <- chapuy_merged %>%
  filter(!is.na(OS_event), !is.na(OS_MONTHS), OS_MONTHS > 0)

cat(sprintf("  Patients for OS analysis: %d\n", nrow(os_data)))
cat(sprintf("  Events: %d (%.1f%%)\n", sum(os_data$OS_event),
            100 * mean(os_data$OS_event)))

# Cox models
results_list <- list()

# Model 1: aSHM burden only
if (sum(!is.na(os_data$aSHM_burden)) > 10) {
  fit_ashm <- coxph(Surv(OS_MONTHS, OS_event) ~ aSHM_burden, data = os_data)
  results_list$aSHM_univariate <- broom::tidy(fit_ashm, exponentiate = TRUE, conf.int = TRUE)
  cat("\n  aSHM burden univariate:\n")
  print(summary(fit_ashm))
}

# Model 2: Selected LoF burden only
if (sum(!is.na(os_data$Selected_LoF_burden)) > 10) {
  fit_lof <- coxph(Surv(OS_MONTHS, OS_event) ~ Selected_LoF_burden, data = os_data)
  results_list$LoF_univariate <- broom::tidy(fit_lof, exponentiate = TRUE, conf.int = TRUE)
  cat("\n  Selected LoF burden univariate:\n")
  print(summary(fit_lof))
}

# Model 3: GoF hotspot
if (sum(os_data$Has_GoF_hotspot, na.rm = TRUE) >= 5) {
  fit_gof <- coxph(Surv(OS_MONTHS, OS_event) ~ Has_GoF_hotspot, data = os_data)
  results_list$GoF_univariate <- broom::tidy(fit_gof, exponentiate = TRUE, conf.int = TRUE)
  cat("\n  GoF hotspot univariate:\n")
  print(summary(fit_gof))
}

# Model 4: Multivariate (all burden types)
if (nrow(os_data) >= 30) {
  fit_multi <- coxph(Surv(OS_MONTHS, OS_event) ~ aSHM_burden + Selected_LoF_burden +
                       Has_GoF_hotspot, data = os_data)
  results_list$Multivariate_burden <- broom::tidy(fit_multi, exponentiate = TRUE, conf.int = TRUE)
  cat("\n  Multivariate burden model:\n")
  print(summary(fit_multi))
}

# Model 5: Adjusted for IPI
ipi_data <- os_data %>% filter(!is.na(IPI))
if (nrow(ipi_data) >= 30) {
  fit_ipi <- coxph(Surv(OS_MONTHS, OS_event) ~ aSHM_burden + Selected_LoF_burden +
                     Has_GoF_hotspot + IPI, data = ipi_data)
  results_list$IPI_adjusted <- broom::tidy(fit_ipi, exponentiate = TRUE, conf.int = TRUE)
  cat("\n  IPI-adjusted model:\n")
  print(summary(fit_ipi))
}

# -----------------------------------------------------------------------------
# Gene-level OS associations (selected genes only)
# -----------------------------------------------------------------------------
cat("\nTesting gene-level OS associations for selected genes...\n")

# Load raw mutations for gene-level analysis
chapuy_muts <- read.delim("Chapuy_Broad/data/raw/data_mutations.txt",
                          stringsAsFactors = FALSE)

# Get genes under selection (not aSHM passengers)
selected_genes <- gene_selection %>%
  filter(Selection_Status %in% c("Positive_Selection_LoF", "Negative_Selection") |
           Total_Coding >= 10) %>%
  filter(Gene_Class != "aSHM_Target") %>%
  pull(Gene)

cat(sprintf("  Testing %d selected genes\n", length(selected_genes)))

# Function to test gene-level association
test_gene_os <- function(gene_name, mutation_data, clinical_data) {
  # Get patients with mutation
  mutated_patients <- mutation_data %>%
    filter(Hugo_Symbol == gene_name) %>%
    pull(Tumor_Sample_Barcode) %>%
    unique()

  # Create gene mutation status
  clinical_data <- clinical_data %>%
    mutate(Gene_mutated = PATIENT_ID %in% mutated_patients)

  n_mut <- sum(clinical_data$Gene_mutated)
  n_wt <- sum(!clinical_data$Gene_mutated)

  if (n_mut < 5 | n_wt < 5) {
    return(NULL)
  }

  # Cox model
  tryCatch({
    fit <- coxph(Surv(OS_MONTHS, OS_event) ~ Gene_mutated, data = clinical_data)
    result <- broom::tidy(fit, exponentiate = TRUE, conf.int = TRUE)
    result$Gene <- gene_name
    result$N_mutated <- n_mut
    result$N_wildtype <- n_wt
    return(result)
  }, error = function(e) {
    return(NULL)
  })
}

# Test all selected genes
gene_os_results <- lapply(selected_genes, function(g) {
  test_gene_os(g, chapuy_muts, os_data)
}) %>%
  bind_rows()

if (nrow(gene_os_results) > 0) {
  gene_os_results <- gene_os_results %>%
    mutate(FDR = p.adjust(p.value, method = "BH")) %>%
    arrange(p.value)

  cat("\nTop gene-level OS associations:\n")
  print(head(gene_os_results %>%
               select(Gene, estimate, conf.low, conf.high, p.value, FDR,
                      N_mutated), 20))

  # Significant genes
  sig_genes <- gene_os_results %>%
    filter(p.value < 0.05)

  if (nrow(sig_genes) > 0) {
    cat(sprintf("\nSignificant genes (p < 0.05): %d\n", nrow(sig_genes)))
    print(sig_genes %>% select(Gene, estimate, p.value, FDR, N_mutated))
  }
}

# -----------------------------------------------------------------------------
# Treatment response analysis (if CR data available)
# -----------------------------------------------------------------------------
cat("\nTesting treatment response associations...\n")

# Check for response data in Duke clinical
if ("INITIAL_TX_RESPONSE" %in% names(duke_clin)) {
  response_data <- duke_clin %>%
    mutate(
      CR = INITIAL_TX_RESPONSE == "Complete response",
      Response_binary = !is.na(INITIAL_TX_RESPONSE) & CR
    ) %>%
    filter(!is.na(INITIAL_TX_RESPONSE))

  cat(sprintf("  Patients with response data: %d\n", nrow(response_data)))
  cat(sprintf("  Complete response: %d (%.1f%%)\n",
              sum(response_data$CR, na.rm = TRUE),
              100 * mean(response_data$CR, na.rm = TRUE)))
}

# Check Chapuy for response (R-CHOP treatment data)
if ("R_CHOP_LIKE_CHEMO" %in% names(chapuy_clin)) {
  rchop_data <- chapuy_clin %>%
    filter(R_CHOP_LIKE_CHEMO == "Yes")
  cat(sprintf("  R-CHOP treated in Chapuy: %d\n", nrow(rchop_data)))
}

# -----------------------------------------------------------------------------
# Survival plots
# -----------------------------------------------------------------------------
cat("\nGenerating survival plots...\n")

# KM plot for aSHM burden
if (sum(!is.na(os_data$aSHM_high)) >= 20) {
  km_ashm <- survfit(Surv(OS_MONTHS, OS_event) ~ aSHM_high, data = os_data)

  p_km_ashm <- ggsurvplot(
    km_ashm,
    data = os_data,
    pval = TRUE,
    risk.table = TRUE,
    palette = c("#377EB8", "#E41A1C"),
    legend.labs = c("Low aSHM", "High aSHM"),
    title = "OS by aSHM Mutation Burden",
    xlab = "Time (months)",
    ylab = "Overall Survival"
  )

  ggsave(file.path(figures_dir, "km_ashm_burden.png"),
         print(p_km_ashm), width = 10, height = 8, dpi = 150)
}

# KM plot for GoF hotspots
if (sum(os_data$Has_GoF_hotspot, na.rm = TRUE) >= 5) {
  km_gof <- survfit(Surv(OS_MONTHS, OS_event) ~ Has_GoF_hotspot, data = os_data)

  p_km_gof <- ggsurvplot(
    km_gof,
    data = os_data,
    pval = TRUE,
    risk.table = TRUE,
    palette = c("#377EB8", "#E41A1C"),
    legend.labs = c("No GoF hotspot", "GoF hotspot"),
    title = "OS by GoF Hotspot Presence",
    xlab = "Time (months)",
    ylab = "Overall Survival"
  )

  ggsave(file.path(figures_dir, "km_gof_hotspot.png"),
         print(p_km_gof), width = 10, height = 8, dpi = 150)
}

# KM plot for Selected LoF burden
if (sum(!is.na(os_data$LoF_high)) >= 20) {
  km_lof <- survfit(Surv(OS_MONTHS, OS_event) ~ LoF_high, data = os_data)

  p_km_lof <- ggsurvplot(
    km_lof,
    data = os_data,
    pval = TRUE,
    risk.table = TRUE,
    palette = c("#377EB8", "#E41A1C"),
    legend.labs = c("Low LoF", "High LoF"),
    title = "OS by Selected LoF Mutation Burden",
    xlab = "Time (months)",
    ylab = "Overall Survival"
  )

  ggsave(file.path(figures_dir, "km_lof_burden.png"),
         print(p_km_lof), width = 10, height = 8, dpi = 150)
}

# KM by aSHM tertile
if (sum(!is.na(os_data$aSHM_tertile)) >= 30) {
  km_tertile <- survfit(Surv(OS_MONTHS, OS_event) ~ aSHM_tertile, data = os_data)

  p_km_tertile <- ggsurvplot(
    km_tertile,
    data = os_data,
    pval = TRUE,
    risk.table = TRUE,
    palette = c("#377EB8", "#4DAF4A", "#E41A1C"),
    legend.labs = c("Low aSHM", "Medium aSHM", "High aSHM"),
    title = "OS by aSHM Burden Tertile",
    xlab = "Time (months)",
    ylab = "Overall Survival"
  )

  ggsave(file.path(figures_dir, "km_ashm_tertile.png"),
         print(p_km_tertile), width = 10, height = 8, dpi = 150)
}

cat("  Survival plots saved.\n")

# -----------------------------------------------------------------------------
# Summary of findings
# -----------------------------------------------------------------------------
cat("\n" , paste(rep("=", 60), collapse = ""), "\n")
cat("SUMMARY OF OUTCOME ASSOCIATIONS\n")
cat(paste(rep("=", 60), collapse = ""), "\n")

cat("\nCohort: Chapuy WES (n =", nrow(os_data), ")\n")

if (exists("fit_ashm")) {
  cat("\n1. aSHM Burden:\n")
  cat("   - Predominantly reflects AID-mediated passenger mutations\n")
  cat("   - May correlate with ABC-DLBCL subtype\n")
}

if (exists("fit_lof")) {
  cat("\n2. Selected LoF Burden:\n")
  cat("   - Truncating mutations in genes under positive selection\n")
  cat("   - Represents true driver alterations in tumor suppressors\n")
}

if (exists("fit_gof")) {
  cat("\n3. GoF Hotspots:\n")
  cat("   - Recurrent missense at oncogenic positions\n")
  cat("   - MYD88 L265P, EZH2 Y641, CD79B Y196, etc.\n")
}

# -----------------------------------------------------------------------------
# Save outputs
# -----------------------------------------------------------------------------
cat("\nSaving results...\n")

# Combine all burden results
burden_results <- bind_rows(results_list, .id = "Model")
write_csv(burden_results, file.path(output_dir, "outcome_burden_results.csv"))
cat("  Saved: outcome_burden_results.csv\n")

# Gene-level results
if (nrow(gene_os_results) > 0) {
  write_csv(gene_os_results, file.path(output_dir, "outcome_gene_results.csv"))
  cat("  Saved: outcome_gene_results.csv\n")
}

# Patient burden with clinical data
patient_complete <- chapuy_merged %>%
  select(PATIENT_ID, OS_MONTHS, OS_event, PFS_MONTHS, PFS_event, IPI,
         Total_mutations, aSHM_burden, Selected_LoF_burden, GoF_hotspot_count,
         aSHM_high, LoF_high, Has_GoF_hotspot)
write_csv(patient_complete, file.path(output_dir, "patient_burden_scores.csv"))
cat("  Saved: patient_burden_scores.csv\n")

cat("\n=== Outcome association analysis complete ===\n")
