# GNA13 Truncating Mutation Comprehensive Analysis
# 1. Treatment response (Reddy Duke)
# 2. CNS relapse (Reddy Duke)
# 3. PFS analysis (Chapuy)

library(tidyverse)
library(survival)
library(survminer)

cat("=" %>% rep(60) %>% paste(collapse=""), "\n")
cat("GNA13 TRUNCATING MUTATION COMPREHENSIVE ANALYSIS\n")
cat("=" %>% rep(60) %>% paste(collapse=""), "\n\n")

# =============================================================================
# PART 1: REDDY DUKE - Treatment Response & CNS Relapse
# =============================================================================

cat("\n### PART 1: REDDY DUKE COHORT ###\n\n")

# Load Reddy Duke data
mutations_duke <- read_csv("../data/raw/data_mutations.csv", show_col_types = FALSE)
clinical_duke <- read_csv("../data/raw/data_clinical_combined.csv", show_col_types = FALSE)

# Define truncating mutations
truncating_types <- c("Nonsense_Mutation", "Frame_Shift_Ins", "Frame_Shift_Del",
                      "Splice_Site", "Splice_Region", "Nonstop_Mutation")

# Get GNA13 patient-level status
gna13_duke <- mutations_duke %>%
  filter(Hugo_Symbol == "GNA13") %>%
  mutate(mutation_type = case_when(
    Variant_Classification %in% truncating_types ~ "Truncating",
    Variant_Classification == "Missense_Mutation" ~ "Missense",
    TRUE ~ "Other"
  ),
  severity = case_when(
    mutation_type == "Truncating" ~ 3,
    mutation_type == "Missense" ~ 2,
    TRUE ~ 1
  )) %>%
  group_by(Tumor_Sample_Barcode) %>%
  summarise(
    GNA13_mutation_type = mutation_type[which.max(severity)],
    .groups = "drop"
  ) %>%
  rename(PATIENT_ID = Tumor_Sample_Barcode)

# Merge with clinical
clinical_duke <- clinical_duke %>%
  left_join(gna13_duke, by = "PATIENT_ID") %>%
  mutate(
    GNA13_status = case_when(
      GNA13_mutation_type == "Truncating" ~ "Truncating",
      GNA13_mutation_type == "Missense" ~ "Missense",
      is.na(GNA13_mutation_type) ~ "Wild-type"
    ),
    GNA13_status = factor(GNA13_status, levels = c("Wild-type", "Missense", "Truncating"))
  )

# -----------------------------------------------------------------------------
# 1A. TREATMENT RESPONSE ANALYSIS
# -----------------------------------------------------------------------------
cat("--- 1A. TREATMENT RESPONSE ANALYSIS ---\n\n")

response_data <- clinical_duke %>%
  filter(!is.na(INITIAL_TX_RESPONSE) & INITIAL_TX_RESPONSE != "") %>%
  mutate(
    response_binary = ifelse(INITIAL_TX_RESPONSE == "Complete response", "CR", "Non-CR"),
    response_cat = factor(INITIAL_TX_RESPONSE,
                          levels = c("Complete response", "Partial response", "No response"))
  )

# Response rates by GNA13 status
cat("Treatment Response by GNA13 Status:\n")
response_table <- response_data %>%
  group_by(GNA13_status) %>%
  summarise(
    N = n(),
    CR = sum(response_binary == "CR"),
    CR_rate = round(mean(response_binary == "CR") * 100, 1),
    PR = sum(INITIAL_TX_RESPONSE == "Partial response"),
    NR = sum(INITIAL_TX_RESPONSE == "No response"),
    .groups = "drop"
  )
print(response_table)

# Chi-square test for CR vs non-CR
cat("\n\nChi-square test (CR vs Non-CR by GNA13 status):\n")
chisq_response <- chisq.test(table(response_data$GNA13_status, response_data$response_binary))
print(chisq_response)

# Fisher's exact test - Truncating vs WT
cat("\nFisher's exact test (Truncating vs Wild-type, CR vs Non-CR):\n")
fisher_trunc_wt <- response_data %>%
  filter(GNA13_status %in% c("Wild-type", "Truncating")) %>%
  {table(.$GNA13_status, .$response_binary)} %>%
  fisher.test()
print(fisher_trunc_wt)

# Logistic regression for CR
cat("\nLogistic Regression (CR ~ GNA13 status, adjusted for IPI):\n")
logit_model <- glm(response_binary == "CR" ~ GNA13_status + IPI,
                   data = response_data, family = binomial)
print(summary(logit_model)$coefficients)

# Odds ratios
cat("\nOdds Ratios (95% CI):\n")
or_ci <- exp(cbind(OR = coef(logit_model), confint(logit_model)))
print(or_ci)

# -----------------------------------------------------------------------------
# 1B. CNS RELAPSE ANALYSIS
# -----------------------------------------------------------------------------
cat("\n\n--- 1B. CNS RELAPSE ANALYSIS ---\n\n")

cns_data <- clinical_duke %>%
  filter(!is.na(CNS_RELAPSE) & CNS_RELAPSE %in% c("Yes", "No")) %>%
  mutate(CNS_relapse_event = ifelse(CNS_RELAPSE == "Yes", 1, 0))

cat("CNS Relapse by GNA13 Status:\n")
cns_table <- cns_data %>%
  group_by(GNA13_status) %>%
  summarise(
    N = n(),
    CNS_relapse = sum(CNS_relapse_event),
    CNS_rate = round(mean(CNS_relapse_event) * 100, 1),
    .groups = "drop"
  )
print(cns_table)

# Fisher's exact test (overall)
cat("\n\nFisher's exact test (CNS relapse by GNA13 status):\n")
fisher_cns <- fisher.test(table(cns_data$GNA13_status, cns_data$CNS_relapse_event))
print(fisher_cns)

# Fisher's exact - Truncating vs WT
cat("\nFisher's exact (Truncating vs Wild-type for CNS relapse):\n")
fisher_cns_trunc <- cns_data %>%
  filter(GNA13_status %in% c("Wild-type", "Truncating")) %>%
  {table(.$GNA13_status, .$CNS_relapse_event)} %>%
  fisher.test()
print(fisher_cns_trunc)

# Logistic regression for CNS relapse
if(sum(cns_data$CNS_relapse_event) >= 5) {
  cat("\nLogistic Regression (CNS relapse ~ GNA13 status):\n")
  logit_cns <- glm(CNS_relapse_event ~ GNA13_status, data = cns_data, family = binomial)
  print(summary(logit_cns)$coefficients)
}

# =============================================================================
# PART 2: CHAPUY - PFS ANALYSIS
# =============================================================================

cat("\n\n### PART 2: CHAPUY COHORT - PFS ANALYSIS ###\n\n")

# Load Chapuy data
clinical_chapuy <- read_tsv("../../Chapuy_Broad/data/raw/data_clinical_patient.txt",
                            skip = 4, show_col_types = FALSE)
mutations_chapuy <- read_tsv("../../Chapuy_Broad/data/raw/data_mutations.txt",
                             show_col_types = FALSE)

cat("Chapuy cohort size:", nrow(clinical_chapuy), "patients\n")
cat("Total mutations:", nrow(mutations_chapuy), "\n\n")

# Get GNA13 mutations in Chapuy
gna13_chapuy <- mutations_chapuy %>%
  filter(Hugo_Symbol == "GNA13") %>%
  mutate(mutation_type = case_when(
    Variant_Classification %in% truncating_types ~ "Truncating",
    Variant_Classification == "Missense_Mutation" ~ "Missense",
    TRUE ~ "Other"
  ),
  severity = case_when(
    mutation_type == "Truncating" ~ 3,
    mutation_type == "Missense" ~ 2,
    TRUE ~ 1
  )) %>%
  group_by(Tumor_Sample_Barcode) %>%
  summarise(
    GNA13_mutation_type = mutation_type[which.max(severity)],
    mutations = paste(HGVSp_Short, collapse = "; "),
    .groups = "drop"
  )

cat("GNA13 mutations in Chapuy:\n")
print(table(gna13_chapuy$GNA13_mutation_type))

# List the truncating mutations
cat("\nGNA13 Truncating mutations in Chapuy:\n")
truncating_chapuy <- mutations_chapuy %>%
  filter(Hugo_Symbol == "GNA13" & Variant_Classification %in% truncating_types) %>%
  select(Tumor_Sample_Barcode, Variant_Classification, HGVSp_Short)
print(truncating_chapuy)

# Merge with clinical
clinical_chapuy <- clinical_chapuy %>%
  left_join(gna13_chapuy, by = c("PATIENT_ID" = "Tumor_Sample_Barcode")) %>%
  mutate(
    GNA13_status = case_when(
      GNA13_mutation_type == "Truncating" ~ "Truncating",
      GNA13_mutation_type == "Missense" ~ "Missense",
      is.na(GNA13_mutation_type) ~ "Wild-type"
    ),
    GNA13_status = factor(GNA13_status, levels = c("Wild-type", "Missense", "Truncating")),
    PFS_event = as.numeric(grepl("Progressed", PFS_STATUS)),
    OS_event = as.numeric(grepl("DECEASED", OS_STATUS))
  )

cat("\n\nGNA13 Status Distribution in Chapuy:\n")
print(table(clinical_chapuy$GNA13_status, useNA = "ifany"))

# PFS Summary stats
cat("\n\nPFS Summary by GNA13 Status:\n")
pfs_summary <- clinical_chapuy %>%
  filter(!is.na(PFS_MONTHS)) %>%
  group_by(GNA13_status) %>%
  summarise(
    N = n(),
    Events = sum(PFS_event, na.rm = TRUE),
    Event_rate = round(mean(PFS_event, na.rm = TRUE) * 100, 1),
    Median_PFS = median(PFS_MONTHS, na.rm = TRUE),
    .groups = "drop"
  )
print(pfs_summary)

# PFS Survival Analysis
cat("\n\n--- PFS SURVIVAL ANALYSIS ---\n\n")

pfs_data <- clinical_chapuy %>%
  filter(!is.na(PFS_MONTHS) & !is.na(PFS_event))

# Kaplan-Meier
fit_pfs <- survfit(Surv(PFS_MONTHS, PFS_event) ~ GNA13_status, data = pfs_data)
print(fit_pfs)

# Log-rank test
lr_pfs <- survdiff(Surv(PFS_MONTHS, PFS_event) ~ GNA13_status, data = pfs_data)
pval_pfs <- 1 - pchisq(lr_pfs$chisq, df = length(unique(pfs_data$GNA13_status)) - 1)
cat("\nLog-rank test p-value:", format.pval(pval_pfs, digits = 3), "\n")

# Cox regression
cox_pfs <- coxph(Surv(PFS_MONTHS, PFS_event) ~ GNA13_status, data = pfs_data)
cat("\nCox Regression (PFS ~ GNA13 status):\n")
print(summary(cox_pfs)$coefficients)

# Truncating vs Others (binary)
pfs_data <- pfs_data %>%
  mutate(GNA13_trunc = ifelse(GNA13_status == "Truncating", "Truncating", "Non-truncating/WT"))

cat("\n\n--- Truncating vs Non-Truncating/WT (PFS) ---\n")
fit_pfs_binary <- survfit(Surv(PFS_MONTHS, PFS_event) ~ GNA13_trunc, data = pfs_data)
print(fit_pfs_binary)

lr_pfs_binary <- survdiff(Surv(PFS_MONTHS, PFS_event) ~ GNA13_trunc, data = pfs_data)
pval_binary <- 1 - pchisq(lr_pfs_binary$chisq, df = 1)
cat("\nLog-rank p-value (Truncating vs Others):", format.pval(pval_binary, digits = 3), "\n")

cox_pfs_binary <- coxph(Surv(PFS_MONTHS, PFS_event) ~ I(GNA13_trunc == "Truncating"), data = pfs_data)
cat("\nCox HR (Truncating vs Others):\n")
hr <- exp(coef(cox_pfs_binary))
hr_ci <- exp(confint(cox_pfs_binary))
cat(sprintf("  HR = %.2f (95%% CI: %.2f - %.2f)\n", hr, hr_ci[1], hr_ci[2]))

# Also do OS for Chapuy for completeness
cat("\n\n--- OS ANALYSIS (Chapuy) ---\n")
os_data <- clinical_chapuy %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_event))

fit_os <- survfit(Surv(OS_MONTHS, OS_event) ~ GNA13_status, data = os_data)
print(fit_os)

lr_os <- survdiff(Surv(OS_MONTHS, OS_event) ~ GNA13_status, data = os_data)
pval_os <- 1 - pchisq(lr_os$chisq, df = length(unique(os_data$GNA13_status)) - 1)
cat("\nLog-rank test p-value (OS):", format.pval(pval_os, digits = 3), "\n")

# =============================================================================
# PLOTS
# =============================================================================

# PFS plot - Chapuy
p_pfs <- ggsurvplot(fit_pfs,
                    data = pfs_data,
                    pval = TRUE,
                    risk.table = TRUE,
                    palette = c("#2E9FDF", "#E7B800", "#FC4E07"),
                    legend.title = "GNA13 Status",
                    legend.labs = c("Wild-type", "Missense", "Truncating"),
                    xlab = "Time (months)",
                    ylab = "Progression-Free Survival",
                    title = "GNA13 Status and PFS - Chapuy Cohort",
                    ggtheme = theme_bw())

ggsave("gna13_pfs_chapuy.pdf", p_pfs$plot, width = 8, height = 6)
ggsave("gna13_pfs_chapuy.png", p_pfs$plot, width = 8, height = 6, dpi = 150)

# Treatment response barplot
response_plot_data <- response_table %>%
  pivot_longer(cols = c(CR, PR, NR), names_to = "Response", values_to = "Count") %>%
  mutate(Response = factor(Response, levels = c("CR", "PR", "NR")))

p_response <- ggplot(response_plot_data, aes(x = GNA13_status, y = Count, fill = Response)) +
  geom_bar(stat = "identity", position = "fill") +
  scale_y_continuous(labels = scales::percent) +
  scale_fill_manual(values = c("CR" = "#4CAF50", "PR" = "#FFC107", "NR" = "#F44336"),
                    labels = c("Complete Response", "Partial Response", "No Response")) +
  labs(x = "GNA13 Status", y = "Proportion",
       title = "Treatment Response by GNA13 Status - Reddy Duke",
       fill = "Response") +
  theme_bw() +
  geom_text(aes(label = Count), position = position_fill(vjust = 0.5), color = "white", fontface = "bold")

ggsave("gna13_treatment_response.pdf", p_response, width = 8, height = 6)
ggsave("gna13_treatment_response.png", p_response, width = 8, height = 6, dpi = 150)

cat("\n\nPlots saved:\n")
cat("  - gna13_pfs_chapuy.pdf/png\n")
cat("  - gna13_treatment_response.pdf/png\n")

# =============================================================================
# SUMMARY TABLE
# =============================================================================

cat("\n\n")
cat("=" %>% rep(60) %>% paste(collapse=""), "\n")
cat("SUMMARY OF FINDINGS\n")
cat("=" %>% rep(60) %>% paste(collapse=""), "\n\n")

cat("REDDY DUKE (n=1,001):\n")
cat("  Treatment Response (CR rate):\n")
cat(sprintf("    - Wild-type:  %.1f%% (%d/%d)\n",
            response_table$CR_rate[1], response_table$CR[1], response_table$N[1]))
cat(sprintf("    - Missense:   %.1f%% (%d/%d)\n",
            response_table$CR_rate[2], response_table$CR[2], response_table$N[2]))
cat(sprintf("    - Truncating: %.1f%% (%d/%d)\n",
            response_table$CR_rate[3], response_table$CR[3], response_table$N[3]))
cat(sprintf("    Chi-square p = %.3f\n\n", chisq_response$p.value))

cat("  CNS Relapse:\n")
cat(sprintf("    - Wild-type:  %.1f%% (%d/%d)\n",
            cns_table$CNS_rate[1], cns_table$CNS_relapse[1], cns_table$N[1]))
cat(sprintf("    - Missense:   %.1f%% (%d/%d)\n",
            cns_table$CNS_rate[2], cns_table$CNS_relapse[2], cns_table$N[2]))
cat(sprintf("    - Truncating: %.1f%% (%d/%d)\n",
            cns_table$CNS_rate[3], cns_table$CNS_relapse[3], cns_table$N[3]))
cat(sprintf("    Fisher p = %.3f\n\n", fisher_cns$p.value))

cat("CHAPUY (n=", nrow(clinical_chapuy), "):\n", sep="")
cat("  PFS Analysis:\n")
cat(sprintf("    Log-rank p = %.3f\n", pval_pfs))
cat(sprintf("    Truncating vs Others: HR = %.2f (95%% CI: %.2f-%.2f), p = %.3f\n",
            hr, hr_ci[1], hr_ci[2], pval_binary))

cat("\n\nAnalysis complete.\n")
