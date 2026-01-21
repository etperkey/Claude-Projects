# GAMBL TRUNCATING Mutation-Outcome Association Analysis
# Tests only truncating mutations (nonsense, frameshift, splice) for outcome association

library(tidyverse)
library(survival)
library(broom)

cat("=" %>% rep(70) %>% paste(collapse=""), "\n")
cat("GAMBL TRUNCATING MUTATION-OUTCOME ANALYSIS\n")
cat("(Nonsense, Frameshift, Splice Site mutations only)\n")
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

# Define truncating mutations
truncating_types <- c("Nonsense_Mutation", "Frame_Shift_Ins", "Frame_Shift_Del",
                      "Splice_Site", "Nonstop_Mutation")

# Filter to truncating mutations only
trunc_muts <- gambl_muts %>%
  filter(Variant_Classification %in% truncating_types)

cat("Total mutations in GAMBL:", nrow(gambl_muts), "\n")
cat("Truncating mutations only:", nrow(trunc_muts), "\n")
cat("Genes with truncating mutations:", n_distinct(trunc_muts$Hugo_Symbol), "\n")
cat("Patients with truncating mutations:", n_distinct(trunc_muts$PATIENT_ID), "\n\n")

# Breakdown by type
cat("Truncating mutation types:\n")
print(table(trunc_muts$Variant_Classification))

# =============================================================================
# Create Gene-Level Truncating Mutation Matrix
# =============================================================================

# Patient-level: truncating mutation in gene
gene_patient_trunc <- trunc_muts %>%
  group_by(PATIENT_ID, Hugo_Symbol) %>%
  summarise(mutated = 1, .groups = "drop") %>%
  pivot_wider(names_from = Hugo_Symbol, values_from = mutated, values_fill = 0)

# Merge with clinical data
clinical_trunc <- clinical %>%
  left_join(gene_patient_trunc, by = "PATIENT_ID") %>%
  mutate(
    OS_event = as.numeric(grepl("DECEASED", OS_STATUS)),
    CR = INITIAL_TX_RESPONSE == "Complete response"
  )

# Get gene columns
gene_cols <- names(gene_patient_trunc)[-1]  # exclude PATIENT_ID

# Replace NA with 0 for mutation columns
clinical_trunc <- clinical_trunc %>%
  mutate(across(any_of(gene_cols), ~replace_na(., 0)))

# Filter genes with sufficient truncating mutations (>=5 mutated patients)
gene_counts <- colSums(clinical_trunc[, gene_cols], na.rm = TRUE)
genes_to_test <- names(gene_counts[gene_counts >= 5])

cat("\n\nGenes with >=5 patients with truncating mutations:", length(genes_to_test), "\n")
cat("\nTop 20 genes by truncating mutation frequency:\n")
print(sort(gene_counts, decreasing = TRUE)[1:20])

# =============================================================================
# OVERALL SURVIVAL ANALYSIS - TRUNCATING ONLY
# =============================================================================

cat("\n\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n")
cat("OVERALL SURVIVAL ANALYSIS (TRUNCATING MUTATIONS ONLY)\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n\n")

os_results <- tibble()

for(gene in genes_to_test) {
  surv_data <- clinical_trunc %>%
    filter(!is.na(OS_MONTHS) & !is.na(OS_event)) %>%
    mutate(mutated = .data[[gene]])

  n_mut <- sum(surv_data$mutated)
  n_wt <- sum(surv_data$mutated == 0)

  if(n_mut < 5 || n_wt < 5) next

  tryCatch({
    cox_model <- coxph(Surv(OS_MONTHS, OS_event) ~ mutated, data = surv_data)
    cox_summary <- summary(cox_model)

    lr_test <- survdiff(Surv(OS_MONTHS, OS_event) ~ mutated, data = surv_data)
    lr_pval <- 1 - pchisq(lr_test$chisq, df = 1)

    death_rate_mut <- mean(surv_data$OS_event[surv_data$mutated == 1])
    death_rate_wt <- mean(surv_data$OS_event[surv_data$mutated == 0])

    os_results <- bind_rows(os_results, tibble(
      Gene = gene,
      N_truncating = n_mut,
      N_wildtype = n_wt,
      Pct_mutated = round(n_mut / (n_mut + n_wt) * 100, 1),
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

cat("Tested", nrow(os_results), "genes for OS association (truncating only)\n\n")

# Significant results
os_sig <- os_results %>% filter(Cox_pval < 0.05)
os_fdr_sig <- os_results %>% filter(FDR < 0.1)

cat("--- Nominally Significant (p < 0.05):", nrow(os_sig), "genes ---\n\n")
print(os_sig %>% select(Gene, N_truncating, Pct_mutated, HR, Cox_pval, FDR, Direction,
                        Death_rate_mut, Death_rate_wt), n = 30)

cat("\n\n--- FDR Significant (FDR < 0.1):", nrow(os_fdr_sig), "genes ---\n\n")
if(nrow(os_fdr_sig) > 0) {
  print(os_fdr_sig)
}

# =============================================================================
# TREATMENT RESPONSE ANALYSIS - TRUNCATING ONLY
# =============================================================================

cat("\n\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n")
cat("TREATMENT RESPONSE ANALYSIS (TRUNCATING MUTATIONS ONLY)\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n\n")

response_results <- tibble()

response_data <- clinical_trunc %>%
  filter(!is.na(INITIAL_TX_RESPONSE) & INITIAL_TX_RESPONSE != "")

for(gene in genes_to_test) {
  test_data <- response_data %>%
    mutate(mutated = .data[[gene]]) %>%
    filter(!is.na(CR))

  n_mut <- sum(test_data$mutated)
  n_wt <- sum(test_data$mutated == 0)

  if(n_mut < 5 || n_wt < 5) next

  cr_mut <- mean(test_data$CR[test_data$mutated == 1], na.rm = TRUE)
  cr_wt <- mean(test_data$CR[test_data$mutated == 0], na.rm = TRUE)

  tryCatch({
    tbl <- table(test_data$mutated, test_data$CR)
    if(nrow(tbl) == 2 && ncol(tbl) == 2) {
      fisher_test <- fisher.test(tbl)

      response_results <- bind_rows(response_results, tibble(
        Gene = gene,
        N_truncating = n_mut,
        N_wildtype = n_wt,
        Pct_mutated = round(n_mut / (n_mut + n_wt) * 100, 1),
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

cat("Tested", nrow(response_results), "genes for treatment response (truncating only)\n\n")

resp_sig <- response_results %>% filter(Fisher_pval < 0.05)
resp_fdr_sig <- response_results %>% filter(FDR < 0.1)

cat("--- Nominally Significant (p < 0.05):", nrow(resp_sig), "genes ---\n\n")
print(resp_sig %>% select(Gene, N_truncating, Pct_mutated, CR_rate_mut, CR_rate_wt,
                          CR_diff, Fisher_pval, FDR, Direction), n = 30)

cat("\n\n--- FDR Significant (FDR < 0.1):", nrow(resp_fdr_sig), "genes ---\n\n")
if(nrow(resp_fdr_sig) > 0) {
  print(resp_fdr_sig)
}

# =============================================================================
# MULTIVARIATE ANALYSIS (IPI-adjusted)
# =============================================================================

cat("\n\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n")
cat("MULTIVARIATE ANALYSIS (IPI-Adjusted) - TRUNCATING ONLY\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n\n")

top_os_genes <- os_sig$Gene[1:min(15, nrow(os_sig))]

if(length(top_os_genes) > 0) {
  cat("--- OS: IPI-Adjusted Cox Models ---\n\n")

  mv_os_results <- tibble()

  for(gene in top_os_genes) {
    surv_data <- clinical_trunc %>%
      filter(!is.na(OS_MONTHS) & !is.na(OS_event) & !is.na(IPI)) %>%
      mutate(mutated = .data[[gene]])

    tryCatch({
      cox_uni <- coxph(Surv(OS_MONTHS, OS_event) ~ mutated, data = surv_data)
      cox_mv <- coxph(Surv(OS_MONTHS, OS_event) ~ mutated + IPI, data = surv_data)

      mv_os_results <- bind_rows(mv_os_results, tibble(
        Gene = gene,
        N = sum(surv_data$mutated),
        HR_univariate = round(exp(coef(cox_uni)["mutated"]), 2),
        p_univariate = round(summary(cox_uni)$coefficients["mutated", 5], 4),
        HR_adjusted = round(exp(coef(cox_mv)["mutated"]), 2),
        p_adjusted = round(summary(cox_mv)$coefficients["mutated", 5], 4)
      ))
    }, error = function(e) {})
  }

  print(mv_os_results)
}

# =============================================================================
# KNOWN PROGNOSTIC GENES - TRUNCATING ONLY
# =============================================================================

cat("\n\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n")
cat("KNOWN DLBCL GENES - TRUNCATING MUTATIONS\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n\n")

known_genes <- c("TP53", "MYD88", "CD79B", "EZH2", "CREBBP", "KMT2D", "BCL2",
                 "NOTCH2", "NOTCH1", "TNFAIP3", "CARD11", "BCL6", "MYC",
                 "B2M", "CDKN2A", "PRDM1", "SOCS1", "SGK1", "GNA13", "MEF2B",
                 "PIM1", "BTG1", "BTG2", "IRF4", "FOXO1", "CD58", "KLHL14",
                 "HIST1H1E", "HIST1H1C", "EP300", "KMT2C", "ARID1A", "TET2")

known_summary <- tibble()

for(gene in known_genes) {
  if(gene %in% gene_cols) {
    n_trunc <- sum(clinical_trunc[[gene]], na.rm = TRUE)

    os_row <- os_results %>% filter(Gene == gene)
    resp_row <- response_results %>% filter(Gene == gene)

    known_summary <- bind_rows(known_summary, tibble(
      Gene = gene,
      N_truncating = n_trunc,
      Pct = round(n_trunc / nrow(clinical_trunc) * 100, 1),
      OS_HR = ifelse(nrow(os_row) > 0, round(os_row$HR, 2), NA),
      OS_pval = ifelse(nrow(os_row) > 0, round(os_row$Cox_pval, 4), NA),
      CR_diff = ifelse(nrow(resp_row) > 0, resp_row$CR_diff, NA),
      CR_pval = ifelse(nrow(resp_row) > 0, round(resp_row$Fisher_pval, 4), NA)
    ))
  } else {
    known_summary <- bind_rows(known_summary, tibble(
      Gene = gene, N_truncating = 0, Pct = 0,
      OS_HR = NA, OS_pval = NA, CR_diff = NA, CR_pval = NA
    ))
  }
}

print(known_summary %>% arrange(OS_pval) %>% filter(N_truncating >= 5), n = 30)

# =============================================================================
# SAVE RESULTS
# =============================================================================

write_csv(os_results, "gambl_truncating_os_results.csv")
write_csv(response_results, "gambl_truncating_response_results.csv")
write_csv(known_summary, "gambl_truncating_known_genes.csv")

# =============================================================================
# VOLCANO PLOTS
# =============================================================================

library(ggrepel)

# OS Volcano
os_plot_data <- os_results %>%
  mutate(
    neg_log_p = -log10(Cox_pval),
    log_HR = log2(HR),
    significant = Cox_pval < 0.05,
    label = ifelse(Cox_pval < 0.02 | (Cox_pval < 0.05 & abs(log_HR) > 0.7), Gene, "")
  )

p_volcano_os <- ggplot(os_plot_data, aes(x = log_HR, y = neg_log_p)) +
  geom_point(aes(color = significant, size = N_truncating), alpha = 0.6) +
  geom_hline(yintercept = -log10(0.05), linetype = "dashed", color = "red") +
  geom_vline(xintercept = 0, linetype = "dashed", color = "gray50") +
  geom_text_repel(aes(label = label), size = 3, max.overlaps = 25) +
  scale_color_manual(values = c("FALSE" = "gray60", "TRUE" = "red")) +
  scale_size_continuous(range = c(1, 6)) +
  labs(x = "log2(Hazard Ratio)", y = "-log10(p-value)",
       title = "TRUNCATING Mutations and Overall Survival",
       subtitle = paste0(nrow(os_sig), " genes nominally significant (p < 0.05)")) +
  theme_bw() +
  theme(legend.position = "bottom")

ggsave("gambl_truncating_os_volcano.pdf", p_volcano_os, width = 10, height = 8)
ggsave("gambl_truncating_os_volcano.png", p_volcano_os, width = 10, height = 8, dpi = 150)

# Response Volcano
resp_plot_data <- response_results %>%
  mutate(
    neg_log_p = -log10(Fisher_pval),
    significant = Fisher_pval < 0.05,
    label = ifelse(Fisher_pval < 0.02 | (Fisher_pval < 0.05 & abs(CR_diff) > 15), Gene, "")
  )

p_volcano_resp <- ggplot(resp_plot_data, aes(x = CR_diff, y = neg_log_p)) +
  geom_point(aes(color = significant, size = N_truncating), alpha = 0.6) +
  geom_hline(yintercept = -log10(0.05), linetype = "dashed", color = "red") +
  geom_vline(xintercept = 0, linetype = "dashed", color = "gray50") +
  geom_text_repel(aes(label = label), size = 3, max.overlaps = 25) +
  scale_color_manual(values = c("FALSE" = "gray60", "TRUE" = "blue")) +
  scale_size_continuous(range = c(1, 6)) +
  labs(x = "CR Rate Difference (Mutant - WT, %)", y = "-log10(p-value)",
       title = "TRUNCATING Mutations and Treatment Response",
       subtitle = paste0(nrow(resp_sig), " genes nominally significant (p < 0.05)")) +
  theme_bw() +
  theme(legend.position = "bottom")

ggsave("gambl_truncating_response_volcano.pdf", p_volcano_resp, width = 10, height = 8)
ggsave("gambl_truncating_response_volcano.png", p_volcano_resp, width = 10, height = 8, dpi = 150)

cat("\n\nResults and plots saved.\n")

# =============================================================================
# FINAL SUMMARY
# =============================================================================

cat("\n\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n")
cat("FINAL SUMMARY - TRUNCATING MUTATIONS ONLY\n")
cat("=" %>% rep(70) %>% paste(collapse=""), "\n\n")

cat("OVERALL SURVIVAL:\n")
cat("  Genes tested:", nrow(os_results), "\n")
cat("  Nominally significant (p < 0.05):", nrow(os_sig), "\n")
cat("  FDR significant (FDR < 0.1):", nrow(os_fdr_sig), "\n")

if(nrow(os_sig) > 0) {
  cat("\n  Top OS associations (truncating):\n")
  for(i in 1:min(10, nrow(os_sig))) {
    row <- os_sig[i,]
    cat(sprintf("    %s: N=%d (%.1f%%), HR=%.2f, p=%.4f - %s\n",
                row$Gene, row$N_truncating, row$Pct_mutated, row$HR, row$Cox_pval, row$Direction))
  }
}

cat("\n\nTREATMENT RESPONSE:\n")
cat("  Genes tested:", nrow(response_results), "\n")
cat("  Nominally significant (p < 0.05):", nrow(resp_sig), "\n")
cat("  FDR significant (FDR < 0.1):", nrow(resp_fdr_sig), "\n")

if(nrow(resp_sig) > 0) {
  cat("\n  Top response associations (truncating):\n")
  for(i in 1:min(10, nrow(resp_sig))) {
    row <- resp_sig[i,]
    cat(sprintf("    %s: N=%d, CR %.1f%% vs %.1f%%, p=%.4f - %s\n",
                row$Gene, row$N_truncating, row$CR_rate_mut, row$CR_rate_wt,
                row$Fisher_pval, row$Direction))
  }
}

cat("\n\nAnalysis complete.\n")
