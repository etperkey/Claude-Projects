# GNA13 Truncating Mutation Analysis using GAMBL Reanalyzed Calls
# Compares original Reddy calls vs GAMBL improved variant calling

library(tidyverse)
library(survival)
library(survminer)

cat("=" %>% rep(60) %>% paste(collapse=""), "\n")
cat("GNA13 ANALYSIS - GAMBL REANALYZED MUTATION CALLS\n")
cat("=" %>% rep(60) %>% paste(collapse=""), "\n\n")

# =============================================================================
# Load GAMBL mutations
# =============================================================================

gambl_muts <- read_tsv("../../Dreval_GAMBL/data/raw/Table_S3.tsv", show_col_types = FALSE)

cat("GAMBL dataset: ", nrow(gambl_muts), " total mutations\n")
cat("Unique samples: ", n_distinct(gambl_muts$Tumor_Sample_Barcode), "\n\n")

# Convert GAMBL sample IDs to match clinical data format
# Reddy_2043T -> DLBCL_DUKE_2043
gambl_muts <- gambl_muts %>%
  mutate(PATIENT_ID = gsub("Reddy_", "DLBCL_DUKE_", Tumor_Sample_Barcode),
         PATIENT_ID = gsub("T$", "", PATIENT_ID))

# Load clinical data
clinical <- read_csv("../data/raw/data_clinical_combined.csv", show_col_types = FALSE)

# Also load original Reddy mutations for comparison
reddy_muts <- read_csv("../data/raw/data_mutations.csv", show_col_types = FALSE)

# =============================================================================
# Compare GNA13 mutations: GAMBL vs Original Reddy
# =============================================================================

cat("=== GNA13 MUTATION COMPARISON: GAMBL vs ORIGINAL ===\n\n")

gna13_gambl <- gambl_muts %>% filter(Hugo_Symbol == "GNA13")
gna13_reddy <- reddy_muts %>% filter(Hugo_Symbol == "GNA13")

cat("GNA13 mutations:\n")
cat("  GAMBL:    ", nrow(gna13_gambl), " mutations in ",
    n_distinct(gna13_gambl$PATIENT_ID), " patients\n")
cat("  Original: ", nrow(gna13_reddy), " mutations in ",
    n_distinct(gna13_reddy$Tumor_Sample_Barcode), " patients\n\n")

# Variant classification comparison
cat("Variant Classification - GAMBL:\n")
print(table(gna13_gambl$Variant_Classification))

cat("\nVariant Classification - Original Reddy:\n")
print(table(gna13_reddy$Variant_Classification))

# =============================================================================
# Define truncating mutations and create patient-level status
# =============================================================================

# GAMBL uses slightly different classification names
truncating_types <- c("Nonsense_Mutation", "Frame_Shift_Ins", "Frame_Shift_Del",
                      "Splice_Site", "Splice_Region", "Nonstop_Mutation")

# GAMBL patient-level GNA13 status
gna13_patient_gambl <- gna13_gambl %>%
  mutate(mutation_type = case_when(
    Variant_Classification %in% truncating_types ~ "Truncating",
    Variant_Classification == "Missense_Mutation" ~ "Missense",
    Variant_Classification == "In_Frame_Del" ~ "In-frame indel",
    TRUE ~ "Other"
  ),
  severity = case_when(
    mutation_type == "Truncating" ~ 3,
    mutation_type == "Missense" ~ 2,
    mutation_type == "In-frame indel" ~ 1.5,
    TRUE ~ 1
  )) %>%
  group_by(PATIENT_ID) %>%
  summarise(
    GNA13_mutation_type = mutation_type[which.max(severity)],
    n_mutations = n(),
    mutations = paste(HGVSp_Short, collapse = "; "),
    mean_VAF = mean(VAF, na.rm = TRUE),
    .groups = "drop"
  )

cat("\n\n=== GAMBL GNA13 Patient-Level Summary ===\n")
cat("Patients with Truncating: ", sum(gna13_patient_gambl$GNA13_mutation_type == "Truncating"), "\n")
cat("Patients with Missense:   ", sum(gna13_patient_gambl$GNA13_mutation_type == "Missense"), "\n")
cat("Patients with In-frame:   ", sum(gna13_patient_gambl$GNA13_mutation_type == "In-frame indel"), "\n")

# List truncating mutations from GAMBL
cat("\n\nGAMBL GNA13 Truncating Mutations:\n")
truncating_detail <- gna13_gambl %>%
  filter(Variant_Classification %in% truncating_types) %>%
  select(PATIENT_ID, Variant_Classification, HGVSp_Short, VAF) %>%
  arrange(HGVSp_Short)
print(truncating_detail, n = 40)

# =============================================================================
# Merge with clinical data
# =============================================================================

clinical_gambl <- clinical %>%
  left_join(gna13_patient_gambl, by = "PATIENT_ID") %>%
  mutate(
    GNA13_status = case_when(
      GNA13_mutation_type == "Truncating" ~ "Truncating",
      GNA13_mutation_type == "Missense" ~ "Missense",
      GNA13_mutation_type == "In-frame indel" ~ "In-frame",
      is.na(GNA13_mutation_type) ~ "Wild-type"
    ),
    GNA13_status = factor(GNA13_status, levels = c("Wild-type", "Missense", "In-frame", "Truncating")),
    GNA13_trunc = ifelse(GNA13_status == "Truncating", "Truncating", "Non-truncating/WT"),
    OS_event = as.numeric(grepl("DECEASED", OS_STATUS))
  )

cat("\n\n=== Clinical Cohort with GAMBL Calls ===\n")
print(table(clinical_gambl$GNA13_status, useNA = "ifany"))

# =============================================================================
# SURVIVAL ANALYSIS
# =============================================================================

cat("\n\n" %>% rep(1), "=" %>% rep(60) %>% paste(collapse=""), "\n")
cat("SURVIVAL ANALYSIS (GAMBL CALLS)\n")
cat("=" %>% rep(60) %>% paste(collapse=""), "\n")

surv_data <- clinical_gambl %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_event))

# Summary stats
cat("\n--- Summary by GNA13 Status ---\n")
summary_stats <- surv_data %>%
  group_by(GNA13_status) %>%
  summarise(
    N = n(),
    Deaths = sum(OS_event),
    Death_rate = round(mean(OS_event) * 100, 1),
    Median_OS = median(OS_MONTHS),
    .groups = "drop"
  )
print(summary_stats)

# Kaplan-Meier (3-way: WT vs Missense vs Truncating, excluding in-frame due to small N)
surv_data_main <- surv_data %>% filter(GNA13_status != "In-frame")
surv_data_main$GNA13_status <- droplevels(surv_data_main$GNA13_status)

cat("\n\n--- Kaplan-Meier (WT vs Missense vs Truncating) ---\n")
fit_3way <- survfit(Surv(OS_MONTHS, OS_event) ~ GNA13_status, data = surv_data_main)
print(fit_3way)

lr_3way <- survdiff(Surv(OS_MONTHS, OS_event) ~ GNA13_status, data = surv_data_main)
pval_3way <- 1 - pchisq(lr_3way$chisq, df = 2)
cat("\nLog-rank p-value:", format.pval(pval_3way, digits = 3), "\n")

# Cox regression
cox_3way <- coxph(Surv(OS_MONTHS, OS_event) ~ GNA13_status, data = surv_data_main)
cat("\nCox Regression (Reference = Wild-type):\n")
print(summary(cox_3way)$coefficients)

# Truncating vs Others
cat("\n\n--- Truncating vs Non-Truncating/WT ---\n")
fit_binary <- survfit(Surv(OS_MONTHS, OS_event) ~ GNA13_trunc, data = surv_data)
print(fit_binary)

lr_binary <- survdiff(Surv(OS_MONTHS, OS_event) ~ GNA13_trunc, data = surv_data)
pval_binary <- 1 - pchisq(lr_binary$chisq, df = 1)
cat("\nLog-rank p-value:", format.pval(pval_binary, digits = 3), "\n")

cox_binary <- coxph(Surv(OS_MONTHS, OS_event) ~ I(GNA13_trunc == "Truncating"), data = surv_data)
hr <- exp(coef(cox_binary))
hr_ci <- exp(confint(cox_binary))
cat(sprintf("\nHR (Truncating vs Others) = %.2f (95%% CI: %.2f - %.2f)\n", hr, hr_ci[1], hr_ci[2]))

# =============================================================================
# TREATMENT RESPONSE
# =============================================================================

cat("\n\n" %>% rep(1), "=" %>% rep(60) %>% paste(collapse=""), "\n")
cat("TREATMENT RESPONSE ANALYSIS (GAMBL CALLS)\n")
cat("=" %>% rep(60) %>% paste(collapse=""), "\n")

response_data <- clinical_gambl %>%
  filter(!is.na(INITIAL_TX_RESPONSE) & INITIAL_TX_RESPONSE != "" & GNA13_status != "In-frame")

response_table <- response_data %>%
  group_by(GNA13_status) %>%
  summarise(
    N = n(),
    CR = sum(INITIAL_TX_RESPONSE == "Complete response"),
    CR_rate = round(mean(INITIAL_TX_RESPONSE == "Complete response") * 100, 1),
    PR = sum(INITIAL_TX_RESPONSE == "Partial response"),
    NR = sum(INITIAL_TX_RESPONSE == "No response"),
    .groups = "drop"
  )
print(response_table)

# Chi-square / Fisher
cat("\nChi-square test (CR vs Non-CR):\n")
chisq_resp <- chisq.test(table(response_data$GNA13_status,
                               response_data$INITIAL_TX_RESPONSE == "Complete response"))
print(chisq_resp)

# =============================================================================
# CNS RELAPSE
# =============================================================================

cat("\n\n" %>% rep(1), "=" %>% rep(60) %>% paste(collapse=""), "\n")
cat("CNS RELAPSE ANALYSIS (GAMBL CALLS)\n")
cat("=" %>% rep(60) %>% paste(collapse=""), "\n")

cns_data <- clinical_gambl %>%
  filter(!is.na(CNS_RELAPSE) & CNS_RELAPSE %in% c("Yes", "No") & GNA13_status != "In-frame")

cns_table <- cns_data %>%
  group_by(GNA13_status) %>%
  summarise(
    N = n(),
    CNS_relapse = sum(CNS_RELAPSE == "Yes"),
    CNS_rate = round(mean(CNS_RELAPSE == "Yes") * 100, 1),
    .groups = "drop"
  )
print(cns_table)

fisher_cns <- fisher.test(table(cns_data$GNA13_status, cns_data$CNS_RELAPSE))
cat("\nFisher's exact p-value:", format.pval(fisher_cns$p.value, digits = 3), "\n")

# =============================================================================
# PLOTS
# =============================================================================

# OS by GNA13 status
p_os <- ggsurvplot(fit_3way,
                   data = surv_data_main,
                   pval = TRUE,
                   risk.table = TRUE,
                   palette = c("#2E9FDF", "#E7B800", "#FC4E07"),
                   legend.title = "GNA13 Status",
                   legend.labs = c("Wild-type", "Missense", "Truncating"),
                   xlab = "Time (months)",
                   ylab = "Overall Survival",
                   title = "GNA13 Status and OS - GAMBL Reanalyzed Calls",
                   ggtheme = theme_bw())

ggsave("gna13_os_gambl.pdf", p_os$plot, width = 8, height = 6)
ggsave("gna13_os_gambl.png", p_os$plot, width = 8, height = 6, dpi = 150)

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
       title = "Treatment Response by GNA13 Status - GAMBL Calls",
       fill = "Response") +
  theme_bw() +
  geom_text(aes(label = Count), position = position_fill(vjust = 0.5),
            color = "white", fontface = "bold")

ggsave("gna13_response_gambl.pdf", p_response, width = 8, height = 6)
ggsave("gna13_response_gambl.png", p_response, width = 8, height = 6, dpi = 150)

cat("\n\nPlots saved:\n")
cat("  - gna13_os_gambl.pdf/png\n")
cat("  - gna13_response_gambl.pdf/png\n")

# =============================================================================
# COMPARISON: GAMBL vs ORIGINAL CALLS
# =============================================================================

cat("\n\n" %>% rep(1), "=" %>% rep(60) %>% paste(collapse=""), "\n")
cat("COMPARISON: GAMBL vs ORIGINAL REDDY CALLS\n")
cat("=" %>% rep(60) %>% paste(collapse=""), "\n\n")

# Get original Reddy patient-level status
gna13_patient_reddy <- gna13_reddy %>%
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
    GNA13_status_reddy = mutation_type[which.max(severity)],
    .groups = "drop"
  ) %>%
  rename(PATIENT_ID = Tumor_Sample_Barcode)

# Merge both
comparison <- clinical %>%
  select(PATIENT_ID) %>%
  left_join(gna13_patient_gambl %>%
              select(PATIENT_ID, GNA13_mutation_type) %>%
              rename(GAMBL = GNA13_mutation_type), by = "PATIENT_ID") %>%
  left_join(gna13_patient_reddy %>%
              rename(Original = GNA13_status_reddy), by = "PATIENT_ID") %>%
  mutate(
    GAMBL = ifelse(is.na(GAMBL), "Wild-type", GAMBL),
    Original = ifelse(is.na(Original), "Wild-type", Original)
  )

# Cross-tabulation
cat("Cross-tabulation of GNA13 status (GAMBL vs Original):\n")
print(table(GAMBL = comparison$GAMBL, Original = comparison$Original))

# Patients with discordant calls
discordant <- comparison %>%
  filter(GAMBL != Original)

cat("\n\nDiscordant patients (", nrow(discordant), "):\n")
if(nrow(discordant) > 0) {
  print(discordant %>% filter(GAMBL == "Truncating" | Original == "Truncating"), n = 20)
}

# Summary
cat("\n\n=== FINAL SUMMARY ===\n\n")
cat("GNA13 Truncating mutations:\n")
cat("  GAMBL:    ", sum(gna13_patient_gambl$GNA13_mutation_type == "Truncating"), " patients\n")
cat("  Original: ", sum(gna13_patient_reddy$GNA13_status_reddy == "Truncating", na.rm = TRUE), " patients\n")

cat("\n\nKey findings with GAMBL calls:\n")
cat(sprintf("  - OS: HR = %.2f (p = %.3f)\n", hr, pval_binary))
cat(sprintf("  - CR rate: Truncating %.1f%% vs WT %.1f%%\n",
            response_table$CR_rate[response_table$GNA13_status == "Truncating"],
            response_table$CR_rate[response_table$GNA13_status == "Wild-type"]))
cat(sprintf("  - CNS relapse: Truncating %.1f%% vs WT %.1f%%\n",
            cns_table$CNS_rate[cns_table$GNA13_status == "Truncating"],
            cns_table$CNS_rate[cns_table$GNA13_status == "Wild-type"]))

cat("\n\nAnalysis complete.\n")
