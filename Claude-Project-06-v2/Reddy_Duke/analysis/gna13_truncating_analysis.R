# GNA13 Truncating Mutation Analysis - Reddy Duke Cohort
# Analyzes survival outcomes by GNA13 truncating vs missense vs wild-type

library(tidyverse)
library(survival)
library(survminer)

# Load data
mutations <- read_csv("../data/raw/data_mutations.csv")
clinical <- read_csv("../data/raw/data_clinical_combined.csv")

# Filter to GNA13 mutations only
gna13_muts <- mutations %>%
  filter(Hugo_Symbol == "GNA13")

cat("=== GNA13 Mutation Summary ===\n\n")
cat("Total GNA13 mutations:", nrow(gna13_muts), "\n")
cat("Unique patients with GNA13 mutations:", n_distinct(gna13_muts$Tumor_Sample_Barcode), "\n\n")

# Categorize variant types
cat("Variant Classification Breakdown:\n")
print(table(gna13_muts$Variant_Classification))

# Define truncating mutations
truncating_types <- c("Nonsense_Mutation", "Frame_Shift_Ins", "Frame_Shift_Del",
                      "Splice_Site", "Splice_Region", "Nonstop_Mutation")

gna13_muts <- gna13_muts %>%
  mutate(mutation_type = case_when(
    Variant_Classification %in% truncating_types ~ "Truncating",
    Variant_Classification == "Missense_Mutation" ~ "Missense",
    TRUE ~ "Other"
  ))

cat("\n\nMutation Type Summary:\n")
print(table(gna13_muts$mutation_type))

# Get patient-level mutation status (one row per patient with worst mutation)
# Truncating > Missense > Other (taking the most damaging)
patient_gna13 <- gna13_muts %>%
  mutate(severity = case_when(
    mutation_type == "Truncating" ~ 3,
    mutation_type == "Missense" ~ 2,
    TRUE ~ 1
  )) %>%
  group_by(Tumor_Sample_Barcode) %>%
  summarise(
    GNA13_mutation_type = mutation_type[which.max(severity)],
    n_mutations = n(),
    mutations = paste(HGVSp_Short, collapse = "; "),
    .groups = "drop"
  ) %>%
  rename(PATIENT_ID = Tumor_Sample_Barcode)

cat("\n\n=== Patient-Level GNA13 Status ===\n")
cat("Patients with Truncating:", sum(patient_gna13$GNA13_mutation_type == "Truncating"), "\n")
cat("Patients with Missense only:", sum(patient_gna13$GNA13_mutation_type == "Missense"), "\n")

# Merge with clinical data
clinical_gna13 <- clinical %>%
  left_join(patient_gna13, by = "PATIENT_ID") %>%
  mutate(
    GNA13_status = case_when(
      GNA13_mutation_type == "Truncating" ~ "Truncating",
      GNA13_mutation_type == "Missense" ~ "Missense",
      is.na(GNA13_mutation_type) ~ "Wild-type"
    ),
    GNA13_any = ifelse(is.na(GNA13_mutation_type), "Wild-type", "Mutant"),
    GNA13_trunc = ifelse(GNA13_mutation_type == "Truncating" & !is.na(GNA13_mutation_type),
                         "Truncating", "Non-truncating/WT"),
    # Parse OS_STATUS
    OS_event = as.numeric(grepl("DECEASED", OS_STATUS))
  )

cat("\n\n=== Clinical Cohort Summary ===\n")
cat("Total patients:", nrow(clinical_gna13), "\n")
print(table(clinical_gna13$GNA13_status, useNA = "ifany"))

# Summary statistics by group
cat("\n\n=== Clinical Characteristics by GNA13 Status ===\n")
summary_stats <- clinical_gna13 %>%
  group_by(GNA13_status) %>%
  summarise(
    N = n(),
    Median_Age = median(AGE_AT_DIAGNOSIS, na.rm = TRUE),
    Median_OS_months = median(OS_MONTHS, na.rm = TRUE),
    Deaths = sum(OS_event, na.rm = TRUE),
    Death_rate = round(mean(OS_event, na.rm = TRUE) * 100, 1),
    Median_IPI = median(IPI, na.rm = TRUE),
    .groups = "drop"
  )
print(summary_stats)

# List truncating mutations
cat("\n\n=== GNA13 Truncating Mutations Detail ===\n")
truncating_detail <- gna13_muts %>%
  filter(mutation_type == "Truncating") %>%
  left_join(clinical %>% select(PATIENT_ID, OS_MONTHS, OS_STATUS, IPI, AGE_AT_DIAGNOSIS),
            by = c("Tumor_Sample_Barcode" = "PATIENT_ID")) %>%
  select(Tumor_Sample_Barcode, Variant_Classification, HGVSp_Short,
         OS_MONTHS, OS_STATUS, AGE_AT_DIAGNOSIS, IPI) %>%
  arrange(HGVSp_Short)

print(truncating_detail, n = 30)

# Survival Analysis
cat("\n\n=== SURVIVAL ANALYSIS ===\n\n")

# 1. Truncating vs All Others
cat("--- Truncating vs Non-Truncating/WT ---\n")
surv_data <- clinical_gna13 %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_event))

fit_trunc <- survfit(Surv(OS_MONTHS, OS_event) ~ GNA13_trunc, data = surv_data)
print(fit_trunc)

# Log-rank test
lr_trunc <- survdiff(Surv(OS_MONTHS, OS_event) ~ GNA13_trunc, data = surv_data)
cat("\nLog-rank test p-value:",
    format.pval(1 - pchisq(lr_trunc$chisq, df = 1), digits = 3), "\n")

# Cox regression
cox_trunc <- coxph(Surv(OS_MONTHS, OS_event) ~ I(GNA13_trunc == "Truncating"), data = surv_data)
cat("\nCox Regression (Truncating vs Others):\n")
print(summary(cox_trunc)$coefficients)

# 2. Three-way comparison: Truncating vs Missense vs WT
cat("\n\n--- Three-Way Comparison: Truncating vs Missense vs WT ---\n")
fit_3way <- survfit(Surv(OS_MONTHS, OS_event) ~ GNA13_status, data = surv_data)
print(fit_3way)

lr_3way <- survdiff(Surv(OS_MONTHS, OS_event) ~ GNA13_status, data = surv_data)
cat("\nLog-rank test p-value:",
    format.pval(1 - pchisq(lr_3way$chisq, df = 2), digits = 3), "\n")

# Cox with WT as reference
surv_data$GNA13_status <- factor(surv_data$GNA13_status,
                                  levels = c("Wild-type", "Missense", "Truncating"))
cox_3way <- coxph(Surv(OS_MONTHS, OS_event) ~ GNA13_status, data = surv_data)
cat("\nCox Regression (Reference = Wild-type):\n")
print(summary(cox_3way)$coefficients)

# Median survival by group
cat("\n\n=== Median Survival by Group ===\n")
median_surv <- surv_data %>%
  group_by(GNA13_status) %>%
  summarise(
    N = n(),
    Events = sum(OS_event),
    Median_OS = median(OS_MONTHS[OS_event == 1], na.rm = TRUE),
    .groups = "drop"
  )
print(median_surv)

# Plot
p <- ggsurvplot(fit_3way,
                data = surv_data,
                pval = TRUE,
                risk.table = TRUE,
                palette = c("#2E9FDF", "#E7B800", "#FC4E07"),
                legend.title = "GNA13 Status",
                legend.labs = c("Wild-type", "Missense", "Truncating"),
                xlab = "Time (months)",
                ylab = "Overall Survival",
                title = "GNA13 Mutation Status and Survival - Reddy Duke Cohort",
                ggtheme = theme_bw())

ggsave("gna13_truncating_survival.pdf", p$plot, width = 8, height = 6)
ggsave("gna13_truncating_survival.png", p$plot, width = 8, height = 6, dpi = 150)

cat("\n\nPlots saved to gna13_truncating_survival.pdf/png\n")

# Additional: Truncating vs Missense directly (excluding WT)
cat("\n\n--- Direct Comparison: Truncating vs Missense (excluding WT) ---\n")
mutant_only <- surv_data %>% filter(GNA13_status != "Wild-type")
if(nrow(mutant_only) > 10) {
  fit_mut <- survfit(Surv(OS_MONTHS, OS_event) ~ GNA13_status, data = mutant_only)
  print(fit_mut)
  lr_mut <- survdiff(Surv(OS_MONTHS, OS_event) ~ GNA13_status, data = mutant_only)
  cat("\nLog-rank p-value (Truncating vs Missense):",
      format.pval(1 - pchisq(lr_mut$chisq, df = 1), digits = 3), "\n")
}

# Save results
write_csv(summary_stats, "gna13_summary_stats.csv")
write_csv(truncating_detail, "gna13_truncating_mutations_detail.csv")

cat("\n\n=== Analysis Complete ===\n")
