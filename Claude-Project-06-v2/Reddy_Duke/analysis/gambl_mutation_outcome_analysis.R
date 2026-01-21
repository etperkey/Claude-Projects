# GAMBL Mutation-Outcome Association Analysis
# Tests all genes for association with OS and treatment response

library(tidyverse)
library(survival)
library(broom)

cat("=" %>% rep(70) %>% paste(collapse=""), "\n")
cat("GAMBL MUTATION-OUTCOME ASSOCIATION ANALYSIS\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n\n")

# =============================================================================
# Load Data
# =============================================================================

gambl_muts <- read_tsv("../../Dreval_GAMBL/data/raw/Table_S3.tsv", show_col_types = FALSE)
clinical <- read_csv("../data/raw/data_clinical_combined.csv", show_col_types = FALSE)

# Convert sample IDs
gambl_muts <- gambl_muts %>%
  mutate(PATIENT_ID = gsub("Reddy_", "DLBCL_DUKE_", Tumor_Sample_Barcode),
         PATIENT_ID = gsub("T$", "", PATIENT_ID))

cat("Loaded", nrow(gambl_muts), "mutations across", n_distinct(gambl_muts$Hugo_Symbol), "genes\n")
cat("Patients with mutations:", n_distinct(gambl_muts$PATIENT_ID), "\n")
cat("Clinical cohort size:", nrow(clinical), "\n\n")

# =============================================================================
# Create Gene-Level Mutation Matrix
# =============================================================================

# Define mutation types
truncating_types <- c("Nonsense_Mutation", "Frame_Shift_Ins", "Frame_Shift_Del",
                      "Splice_Site", "Nonstop_Mutation")

# Patient-level: any mutation in gene
gene_patient_any <- gambl_muts %>%
  group_by(PATIENT_ID, Hugo_Symbol) %>%
  summarise(mutated = 1, .groups = "drop") %>%
  pivot_wider(names_from = Hugo_Symbol, values_from = mutated, values_fill = 0)

# Patient-level: truncating mutations only
gene_patient_trunc <- gambl_muts %>%
  filter(Variant_Classification %in% truncating_types) %>%
  group_by(PATIENT_ID, Hugo_Symbol) %>%
  summarise(mutated = 1, .groups = "drop") %>%
  pivot_wider(names_from = Hugo_Symbol, values_from = mutated, values_fill = 0,
              names_prefix = "trunc_")

# Merge with clinical data
clinical_mut <- clinical %>%
  left_join(gene_patient_any, by = "PATIENT_ID") %>%
  left_join(gene_patient_trunc, by = "PATIENT_ID") %>%
  mutate(
    OS_event = as.numeric(grepl("DECEASED", OS_STATUS)),
    CR = INITIAL_TX_RESPONSE == "Complete response"
  )

# Replace NA with 0 for mutation columns
mutation_cols <- names(gene_patient_any)[-1]  # exclude PATIENT_ID
trunc_cols <- names(gene_patient_trunc)[-1]

clinical_mut <- clinical_mut %>%
  mutate(across(all_of(c(mutation_cols, trunc_cols)), ~replace_na(., 0)))

# Filter genes with sufficient mutations (>=5 mutated patients)
gene_counts <- colSums(clinical_mut[, mutation_cols], na.rm = TRUE)
genes_to_test <- names(gene_counts[gene_counts >= 5])

cat("Genes with >=5 mutated patients:", length(genes_to_test), "\n\n")

# =============================================================================
# OVERALL SURVIVAL ANALYSIS
# =============================================================================

cat("=" %>% rep(70) %>% paste(collapse=""), "\n")
cat("OVERALL SURVIVAL ANALYSIS\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n\n")

os_results <- tibble()

for(gene in genes_to_test) {
  # Prepare data
  surv_data <- clinical_mut %>%
    filter(!is.na(OS_MONTHS) & !is.na(OS_event)) %>%
    mutate(mutated = .data[[gene]])

  n_mut <- sum(surv_data$mutated)
  n_wt <- sum(surv_data$mutated == 0)

  if(n_mut < 5 || n_wt < 5) next

  # Cox regression
  tryCatch({
    cox_model <- coxph(Surv(OS_MONTHS, OS_event) ~ mutated, data = surv_data)
    cox_summary <- summary(cox_model)

    # Log-rank test
    lr_test <- survdiff(Surv(OS_MONTHS, OS_event) ~ mutated, data = surv_data)
    lr_pval <- 1 - pchisq(lr_test$chisq, df = 1)

    # Death rates
    death_rate_mut <- mean(surv_data$OS_event[surv_data$mutated == 1])
    death_rate_wt <- mean(surv_data$OS_event[surv_data$mutated == 0])

    os_results <- bind_rows(os_results, tibble(
      Gene = gene,
      N_mutated = n_mut,
      N_wildtype = n_wt,
      HR = exp(coef(cox_model)),
      HR_lower = exp(confint(cox_model))[1],
      HR_upper = exp(confint(cox_model))[2],
      Cox_pval = cox_summary$coefficients[5],
      LogRank_pval = lr_pval,
      Death_rate_mut = round(death_rate_mut * 100, 1),
      Death_rate_wt = round(death_rate_wt * 100, 1)
    ))
  }, error = function(e) {})
}

# Multiple testing correction
os_results <- os_results %>%
  mutate(
    FDR = p.adjust(Cox_pval, method = "BH"),
    Direction = ifelse(HR > 1, "Worse", "Better")
  ) %>%
  arrange(Cox_pval)

cat("Tested", nrow(os_results), "genes for OS association\n\n")

# Significant results
os_sig <- os_results %>% filter(Cox_pval < 0.05)
os_fdr_sig <- os_results %>% filter(FDR < 0.1)

cat("--- Nominally Significant (p < 0.05):", nrow(os_sig), "genes ---\n\n")
print(os_sig %>% select(Gene, N_mutated, HR, Cox_pval, FDR, Direction, Death_rate_mut, Death_rate_wt), n = 30)

cat("\n\n--- FDR Significant (FDR < 0.1):", nrow(os_fdr_sig), "genes ---\n\n")
if(nrow(os_fdr_sig) > 0) {
  print(os_fdr_sig)
}

# =============================================================================
# TREATMENT RESPONSE ANALYSIS
# =============================================================================

cat("\n\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n")
cat("TREATMENT RESPONSE ANALYSIS (Complete Response)\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n\n")

response_results <- tibble()

response_data <- clinical_mut %>%
  filter(!is.na(INITIAL_TX_RESPONSE) & INITIAL_TX_RESPONSE != "")

for(gene in genes_to_test) {
  test_data <- response_data %>%
    mutate(mutated = .data[[gene]]) %>%
    filter(!is.na(CR))

  n_mut <- sum(test_data$mutated)
  n_wt <- sum(test_data$mutated == 0)

  if(n_mut < 5 || n_wt < 5) next

  # CR rates
  cr_mut <- mean(test_data$CR[test_data$mutated == 1], na.rm = TRUE)
  cr_wt <- mean(test_data$CR[test_data$mutated == 0], na.rm = TRUE)

  # Fisher's exact test
  tryCatch({
    tbl <- table(test_data$mutated, test_data$CR)
    if(nrow(tbl) == 2 && ncol(tbl) == 2) {
      fisher_test <- fisher.test(tbl)

      response_results <- bind_rows(response_results, tibble(
        Gene = gene,
        N_mutated = n_mut,
        N_wildtype = n_wt,
        CR_rate_mut = round(cr_mut * 100, 1),
        CR_rate_wt = round(cr_wt * 100, 1),
        CR_diff = round((cr_mut - cr_wt) * 100, 1),
        OR = fisher_test$estimate,
        Fisher_pval = fisher_test$p.value
      ))
    }
  }, error = function(e) {})
}

# Multiple testing correction
response_results <- response_results %>%
  mutate(
    FDR = p.adjust(Fisher_pval, method = "BH"),
    Direction = ifelse(CR_diff > 0, "Better CR", "Worse CR")
  ) %>%
  arrange(Fisher_pval)

cat("Tested", nrow(response_results), "genes for treatment response\n\n")

# Significant results
resp_sig <- response_results %>% filter(Fisher_pval < 0.05)
resp_fdr_sig <- response_results %>% filter(FDR < 0.1)

cat("--- Nominally Significant (p < 0.05):", nrow(resp_sig), "genes ---\n\n")
print(resp_sig %>% select(Gene, N_mutated, CR_rate_mut, CR_rate_wt, CR_diff, Fisher_pval, FDR, Direction), n = 30)

cat("\n\n--- FDR Significant (FDR < 0.1):", nrow(resp_fdr_sig), "genes ---\n\n")
if(nrow(resp_fdr_sig) > 0) {
  print(resp_fdr_sig)
}

# =============================================================================
# MULTIVARIATE ANALYSIS (Top hits adjusted for IPI)
# =============================================================================

cat("\n\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n")
cat("MULTIVARIATE ANALYSIS (Adjusted for IPI)\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n\n")

# Top OS hits - adjust for IPI
top_os_genes <- os_sig$Gene[1:min(10, nrow(os_sig))]

if(length(top_os_genes) > 0) {
  cat("--- OS: IPI-Adjusted Cox Models ---\n\n")

  mv_os_results <- tibble()

  for(gene in top_os_genes) {
    surv_data <- clinical_mut %>%
      filter(!is.na(OS_MONTHS) & !is.na(OS_event) & !is.na(IPI)) %>%
      mutate(mutated = .data[[gene]])

    tryCatch({
      # Univariate
      cox_uni <- coxph(Surv(OS_MONTHS, OS_event) ~ mutated, data = surv_data)
      # Multivariate
      cox_mv <- coxph(Surv(OS_MONTHS, OS_event) ~ mutated + IPI, data = surv_data)

      mv_os_results <- bind_rows(mv_os_results, tibble(
        Gene = gene,
        HR_univariate = exp(coef(cox_uni)["mutated"]),
        p_univariate = summary(cox_uni)$coefficients["mutated", 5],
        HR_adjusted = exp(coef(cox_mv)["mutated"]),
        p_adjusted = summary(cox_mv)$coefficients["mutated", 5]
      ))
    }, error = function(e) {})
  }

  print(mv_os_results)
}

# =============================================================================
# KNOWN PROGNOSTIC GENES
# =============================================================================

cat("\n\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n")
cat("KNOWN DLBCL PROGNOSTIC GENES\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n\n")

known_genes <- c("TP53", "MYD88", "CD79B", "EZH2", "CREBBP", "KMT2D", "BCL2",
                 "NOTCH2", "NOTCH1", "TNFAIP3", "CARD11", "BCL6", "MYC",
                 "B2M", "CDKN2A", "PRDM1", "SOCS1", "SGK1", "GNA13", "MEF2B",
                 "PIM1", "BTG1", "BTG2", "IRF4", "FOXO1")

cat("Gene-level summary for known prognostic genes:\n\n")

known_summary <- tibble()

for(gene in known_genes) {
  if(gene %in% mutation_cols) {
    n_mut <- sum(clinical_mut[[gene]], na.rm = TRUE)

    # Get OS result if tested
    os_row <- os_results %>% filter(Gene == gene)
    # Get response result if tested
    resp_row <- response_results %>% filter(Gene == gene)

    known_summary <- bind_rows(known_summary, tibble(
      Gene = gene,
      N_mutated = n_mut,
      Pct = round(n_mut / nrow(clinical_mut) * 100, 1),
      OS_HR = ifelse(nrow(os_row) > 0, round(os_row$HR, 2), NA),
      OS_pval = ifelse(nrow(os_row) > 0, round(os_row$Cox_pval, 4), NA),
      CR_diff = ifelse(nrow(resp_row) > 0, resp_row$CR_diff, NA),
      CR_pval = ifelse(nrow(resp_row) > 0, round(resp_row$Fisher_pval, 4), NA)
    ))
  }
}

print(known_summary %>% arrange(OS_pval), n = 30)

# =============================================================================
# SAVE RESULTS
# =============================================================================

write_csv(os_results, "gambl_os_association_results.csv")
write_csv(response_results, "gambl_response_association_results.csv")
write_csv(known_summary, "gambl_known_genes_summary.csv")

cat("\n\nResults saved:\n")
cat("  - gambl_os_association_results.csv\n")
cat("  - gambl_response_association_results.csv\n")
cat("  - gambl_known_genes_summary.csv\n")

# =============================================================================
# VOLCANO PLOT
# =============================================================================

library(ggrepel)

# OS Volcano plot
os_plot_data <- os_results %>%
  mutate(
    neg_log_p = -log10(Cox_pval),
    log_HR = log2(HR),
    significant = Cox_pval < 0.05,
    label = ifelse(Cox_pval < 0.01 | (Cox_pval < 0.05 & abs(log_HR) > 0.5), Gene, "")
  )

p_volcano_os <- ggplot(os_plot_data, aes(x = log_HR, y = neg_log_p)) +
  geom_point(aes(color = significant, size = N_mutated), alpha = 0.6) +
  geom_hline(yintercept = -log10(0.05), linetype = "dashed", color = "red") +
  geom_vline(xintercept = 0, linetype = "dashed", color = "gray50") +
  geom_text_repel(aes(label = label), size = 3, max.overlaps = 20) +
  scale_color_manual(values = c("FALSE" = "gray60", "TRUE" = "red")) +
  scale_size_continuous(range = c(1, 5)) +
  labs(x = "log2(Hazard Ratio)", y = "-log10(p-value)",
       title = "GAMBL Mutations and Overall Survival",
       subtitle = paste0(nrow(os_sig), " genes nominally significant (p < 0.05)")) +
  theme_bw() +
  theme(legend.position = "bottom")

ggsave("gambl_os_volcano.pdf", p_volcano_os, width = 10, height = 8)
ggsave("gambl_os_volcano.png", p_volcano_os, width = 10, height = 8, dpi = 150)

# Treatment Response Volcano
resp_plot_data <- response_results %>%
  mutate(
    neg_log_p = -log10(Fisher_pval),
    significant = Fisher_pval < 0.05,
    label = ifelse(Fisher_pval < 0.01 | (Fisher_pval < 0.05 & abs(CR_diff) > 10), Gene, "")
  )

p_volcano_resp <- ggplot(resp_plot_data, aes(x = CR_diff, y = neg_log_p)) +
  geom_point(aes(color = significant, size = N_mutated), alpha = 0.6) +
  geom_hline(yintercept = -log10(0.05), linetype = "dashed", color = "red") +
  geom_vline(xintercept = 0, linetype = "dashed", color = "gray50") +
  geom_text_repel(aes(label = label), size = 3, max.overlaps = 20) +
  scale_color_manual(values = c("FALSE" = "gray60", "TRUE" = "blue")) +
  scale_size_continuous(range = c(1, 5)) +
  labs(x = "CR Rate Difference (Mutant - WT, %)", y = "-log10(p-value)",
       title = "GAMBL Mutations and Treatment Response",
       subtitle = paste0(nrow(resp_sig), " genes nominally significant (p < 0.05)")) +
  theme_bw() +
  theme(legend.position = "bottom")

ggsave("gambl_response_volcano.pdf", p_volcano_resp, width = 10, height = 8)
ggsave("gambl_response_volcano.png", p_volcano_resp, width = 10, height = 8, dpi = 150)

cat("  - gambl_os_volcano.pdf/png\n")
cat("  - gambl_response_volcano.pdf/png\n")

# =============================================================================
# FINAL SUMMARY
# =============================================================================

cat("\n\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n")
cat("FINAL SUMMARY\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n\n")

cat("OVERALL SURVIVAL:\n")
cat("  Genes tested:", nrow(os_results), "\n")
cat("  Nominally significant (p < 0.05):", nrow(os_sig), "\n")
cat("  FDR significant (FDR < 0.1):", nrow(os_fdr_sig), "\n")

if(nrow(os_sig) > 0) {
  cat("\n  Top 5 OS associations:\n")
  for(i in 1:min(5, nrow(os_sig))) {
    row <- os_sig[i,]
    cat(sprintf("    %s: HR=%.2f (p=%.4f) - %s\n",
                row$Gene, row$HR, row$Cox_pval, row$Direction))
  }
}

cat("\n\nTREATMENT RESPONSE:\n")
cat("  Genes tested:", nrow(response_results), "\n")
cat("  Nominally significant (p < 0.05):", nrow(resp_sig), "\n")
cat("  FDR significant (FDR < 0.1):", nrow(resp_fdr_sig), "\n")

if(nrow(resp_sig) > 0) {
  cat("\n  Top 5 response associations:\n")
  for(i in 1:min(5, nrow(resp_sig))) {
    row <- resp_sig[i,]
    cat(sprintf("    %s: CR %.1f%% vs %.1f%% (p=%.4f) - %s\n",
                row$Gene, row$CR_rate_mut, row$CR_rate_wt, row$Fisher_pval, row$Direction))
  }
}

cat("\n\nAnalysis complete.\n")
