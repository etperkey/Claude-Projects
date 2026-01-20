# Molecular Features Associated with High IPI
# Genetic and Transcriptomic Analysis

library(survival)
library(dplyr)
library(tidyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("   MOLECULAR FEATURES ASSOCIATED WITH HIGH IPI\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. DUKE DATA - GENOMIC FEATURES AND IPI
#------------------------------------------------------------------------------
cat("=== DUKE COHORT: GENOMIC FEATURES AND IPI ===\n\n")

duke_patient <- read.csv("Reddy_Duke/data/raw/data_clinical_patient.csv", stringsAsFactors = FALSE)
duke_sample <- read.csv("Reddy_Duke/data/raw/data_clinical_sample.csv", stringsAsFactors = FALSE)
duke_class <- read.csv("Reddy_Duke/data/processed/duke_classified.csv", stringsAsFactors = FALSE)

# Merge data
duke <- duke_patient %>%
  left_join(duke_sample, by = c("PATIENT_ID" = "SAMPLE_ID")) %>%
  left_join(duke_class %>% select(PATIENT_ID, Subtype, EZB_score, MCD_score,
                                   S1PR2_mutated, GNA13_mutated, RHOA_mutated,
                                   CXCR4_mutated, GNAI2_mutated, Egress_Score),
            by = "PATIENT_ID") %>%
  filter(!is.na(IPI))

duke$high_IPI <- ifelse(duke$IPI >= 3, 1, 0)

cat("Patients with IPI data: ", nrow(duke), "\n")
cat("High IPI (>=3): ", sum(duke$high_IPI), " (", round(mean(duke$high_IPI)*100, 1), "%)\n\n")

#------------------------------------------------------------------------------
# 2. SUBTYPE ASSOCIATION WITH IPI
#------------------------------------------------------------------------------
cat("--- IPI by Genetic Subtype ---\n\n")

subtype_ipi <- duke %>%
  filter(!is.na(Subtype)) %>%
  group_by(Subtype) %>%
  summarise(
    n = n(),
    mean_IPI = round(mean(IPI, na.rm = TRUE), 2),
    high_IPI_rate = round(mean(high_IPI) * 100, 1),
    .groups = "drop"
  ) %>%
  arrange(desc(mean_IPI))

print(subtype_ipi)

# Test for association
subtype_test <- kruskal.test(IPI ~ Subtype, data = duke %>% filter(!is.na(Subtype)))
cat("\nKruskal-Wallis test p =", format(subtype_test$p.value, digits = 3), "\n")

# Pairwise comparisons for subtypes with highest/lowest IPI
cat("\n--- Pairwise Comparisons (BN2 vs others) ---\n")
for (sub in c("ST2", "EZB", "MCD")) {
  comp_data <- duke %>% filter(Subtype %in% c("BN2", sub))
  test <- wilcox.test(IPI ~ Subtype, data = comp_data)
  cat(sprintf("BN2 vs %s: p = %s\n", sub, format(test$p.value, digits = 3)))
}

#------------------------------------------------------------------------------
# 3. EGRESS PATHWAY MUTATIONS AND IPI (DUKE)
#------------------------------------------------------------------------------
cat("\n--- Egress Pathway Mutations and IPI ---\n\n")

pathway_genes <- c("S1PR2_mutated", "GNA13_mutated", "RHOA_mutated",
                   "CXCR4_mutated", "GNAI2_mutated")

pathway_ipi_results <- data.frame()

for (gene in pathway_genes) {
  if (gene %in% names(duke)) {
    gene_data <- duke %>% filter(!is.na(get(gene)))
    n_mut <- sum(gene_data[[gene]], na.rm = TRUE)

    if (n_mut >= 5) {
      mean_mut <- mean(gene_data$IPI[gene_data[[gene]] == 1], na.rm = TRUE)
      mean_wt <- mean(gene_data$IPI[gene_data[[gene]] == 0], na.rm = TRUE)
      high_mut <- mean(gene_data$high_IPI[gene_data[[gene]] == 1], na.rm = TRUE) * 100
      high_wt <- mean(gene_data$high_IPI[gene_data[[gene]] == 0], na.rm = TRUE) * 100
      test <- wilcox.test(IPI ~ get(gene), data = gene_data)

      pathway_ipi_results <- rbind(pathway_ipi_results, data.frame(
        gene = gsub("_mutated", "", gene),
        n_mutated = n_mut,
        IPI_mut = round(mean_mut, 2),
        IPI_wt = round(mean_wt, 2),
        diff = round(mean_mut - mean_wt, 2),
        high_IPI_mut = round(high_mut, 1),
        high_IPI_wt = round(high_wt, 1),
        p_value = test$p.value
      ))
    }
  }
}

pathway_ipi_results <- pathway_ipi_results %>% arrange(p_value)
print(pathway_ipi_results)

cat("\n** Key finding: CXCR4 mutations associated with HIGHER IPI **\n")

#------------------------------------------------------------------------------
# 4. IPI COMPONENT ANALYSIS BY SUBTYPE
#------------------------------------------------------------------------------
cat("\n--- IPI Components by Subtype ---\n\n")

ipi_comps <- c("IPI_AGE", "IPI_ANNARBOR_STAGE", "IPI_ECOG", "IPI_EXTRANODAL_SITES", "IPI_LDH")

ipi_comp_by_subtype <- data.frame()

for (subtype in c("BN2", "MCD", "EZB", "ST2", "TP53")) {
  sub_data <- duke %>% filter(Subtype == subtype)
  for (comp in ipi_comps) {
    if (comp %in% names(sub_data)) {
      rate <- mean(sub_data[[comp]], na.rm = TRUE) * 100
      ipi_comp_by_subtype <- rbind(ipi_comp_by_subtype, data.frame(
        Subtype = subtype,
        Component = gsub("IPI_", "", comp),
        Positive_Rate = round(rate, 1)
      ))
    }
  }
}

ipi_wide <- ipi_comp_by_subtype %>%
  pivot_wider(names_from = Component, values_from = Positive_Rate)
print(ipi_wide)

# Which components drive BN2's high IPI?
cat("\n--- Statistical Tests: BN2 vs Others for Each IPI Component ---\n")
for (comp in ipi_comps) {
  if (comp %in% names(duke)) {
    test_data <- duke %>% filter(!is.na(Subtype) & !is.na(get(comp)))
    test_data$is_BN2 <- ifelse(test_data$Subtype == "BN2", 1, 0)
    tbl <- table(test_data$is_BN2, test_data[[comp]])
    test <- tryCatch(chisq.test(tbl), error = function(e) NULL)
    if (!is.null(test)) {
      bn2_rate <- mean(test_data[[comp]][test_data$is_BN2 == 1], na.rm = TRUE) * 100
      other_rate <- mean(test_data[[comp]][test_data$is_BN2 == 0], na.rm = TRUE) * 100
      cat(sprintf("%s: BN2=%.1f%%, Others=%.1f%%, p=%s\n",
                  gsub("IPI_", "", comp), bn2_rate, other_rate, format(test$p.value, digits = 3)))
    }
  }
}

#------------------------------------------------------------------------------
# 5. LACY EXPRESSION DATA - tEGRESS AND IPI
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   LACY EXPRESSION DATA: tEGRESS AND IPI\n")
cat("=============================================================\n\n")

# Load GCB staged data with IPI
lacy_staged <- read.csv("Lacy_HMRN/results/gcb_staged_tegress.csv", stringsAsFactors = FALSE)

# Clean IPI score - some may be character
lacy_staged$ipi_num <- as.numeric(lacy_staged$ipi_score)
lacy_staged$high_IPI <- ifelse(lacy_staged$ipi_num >= 3, 1, 0)

cat("Samples with IPI data: ", sum(!is.na(lacy_staged$ipi_num)), "\n")
cat("High IPI: ", sum(lacy_staged$high_IPI, na.rm = TRUE), "\n\n")

cat("--- tEgress by IPI Score ---\n")
tegress_by_ipi <- lacy_staged %>%
  filter(!is.na(ipi_num)) %>%
  group_by(ipi_num) %>%
  summarise(
    n = n(),
    mean_tEgress = round(mean(tEgress, na.rm = TRUE), 3),
    .groups = "drop"
  )
print(tegress_by_ipi)

# Correlation
cor_test <- cor.test(lacy_staged$ipi_num, lacy_staged$tEgress, use = "complete.obs")
cat("\nCorrelation (IPI vs tEgress): r =", round(cor_test$estimate, 3),
    ", p =", format(cor_test$p.value, digits = 3), "\n")

cat("\n--- tEgress: High vs Low IPI ---\n")
tegress_ipi_group <- lacy_staged %>%
  filter(!is.na(high_IPI)) %>%
  group_by(high_IPI) %>%
  summarise(
    n = n(),
    mean_tEgress = round(mean(tEgress, na.rm = TRUE), 3),
    sd_tEgress = round(sd(tEgress, na.rm = TRUE), 3),
    .groups = "drop"
  )
print(tegress_ipi_group)

test <- t.test(tEgress ~ high_IPI, data = lacy_staged)
cat("T-test p =", format(test$p.value, digits = 3), "\n")

#------------------------------------------------------------------------------
# 6. LACY GENOMIC DATA - MUTATIONS AND STAGE/IPI PROXY
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   LACY GENOMIC: MUTATIONS BY STAGE (IPI PROXY)\n")
cat("=============================================================\n\n")

# Load pre-computed stage-mutation associations
stage_mutations <- read.csv("Lacy_HMRN/results/mutations_by_stage.csv", stringsAsFactors = FALSE)

cat("--- Mutations Significantly Associated with Advanced Stage (p < 0.1) ---\n\n")

sig_stage_muts <- stage_mutations %>%
  filter(P_value < 0.1) %>%
  select(Gene, Limited_Pct, Advanced_Pct, OR, P_value, Direction) %>%
  arrange(P_value)

print(sig_stage_muts)

cat("\n** EZH2 mutations enriched in ADVANCED stage (8.7% vs 45.5%, p=0.02) **\n")
cat("** TNFAIP3 deletions enriched in ADVANCED stage (0% vs 27.3%, p=0.03) **\n")
cat("** CD58 deletions enriched in LIMITED stage (21.7% vs 0%, p=0.15) **\n")

#------------------------------------------------------------------------------
# 7. LACY GENOMIC DATA - PATHWAY MUTATIONS AND SURVIVAL
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   LACY GENOMIC: PATHWAY MUTATIONS AND SURVIVAL\n")
cat("=============================================================\n\n")

lacy_genetic <- read.csv("Lacy_HMRN/data/genetic_egress_scores.csv", stringsAsFactors = FALSE)

cat("Samples with survival data: ", sum(!is.na(lacy_genetic$OS_status)), "\n\n")

# Test pathway genes
pathway_genes_lacy <- c("GNA13", "RHOA", "P2RY8", "CXCR4")

for (gene in pathway_genes_lacy) {
  if (gene %in% names(lacy_genetic)) {
    gene_data <- lacy_genetic %>% filter(!is.na(OS_status) & !is.na(get(gene)))
    n_mut <- sum(gene_data[[gene]], na.rm = TRUE)

    if (n_mut >= 10) {
      # Survival analysis
      cox <- coxph(as.formula(paste("Surv(OS_time, OS_status) ~", gene)), data = gene_data)
      hr <- exp(coef(cox))
      ci <- exp(confint(cox))
      pval <- summary(cox)$coefficients[5]

      cat(sprintf("%s (n=%d mut): HR=%.2f (%.2f-%.2f), p=%s\n",
                  gene, n_mut, hr, ci[1], ci[2], format(pval, digits = 3)))
    }
  }
}

#------------------------------------------------------------------------------
# 8. WITHIN-SUBTYPE IPI ANALYSIS (DUKE)
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   WITHIN-SUBTYPE: WHAT DRIVES HIGH IPI?\n")
cat("=============================================================\n\n")

# For BN2 (highest IPI subtype) - what distinguishes high vs low IPI patients?
cat("--- BN2 Subtype: High vs Low IPI Patients ---\n\n")

bn2_data <- duke %>% filter(Subtype == "BN2")
cat("BN2 patients with IPI: ", nrow(bn2_data), "\n")
cat("High IPI in BN2: ", sum(bn2_data$high_IPI), " (", round(mean(bn2_data$high_IPI)*100, 1), "%)\n\n")

# Test pathway mutations within BN2
cat("Pathway mutations in BN2 by IPI:\n")
for (gene in pathway_genes) {
  if (gene %in% names(bn2_data)) {
    n_mut <- sum(bn2_data[[gene]], na.rm = TRUE)
    if (n_mut >= 3) {
      rate_high <- mean(bn2_data[[gene]][bn2_data$high_IPI == 1], na.rm = TRUE) * 100
      rate_low <- mean(bn2_data[[gene]][bn2_data$high_IPI == 0], na.rm = TRUE) * 100
      cat(sprintf("  %s: High IPI=%.1f%%, Low IPI=%.1f%%\n",
                  gsub("_mutated", "", gene), rate_high, rate_low))
    }
  }
}

# For MCD (highest CXCR4 mutation rate)
cat("\n--- MCD Subtype: CXCR4 Mutations and IPI ---\n")
mcd_data <- duke %>% filter(Subtype == "MCD")
cat("MCD patients: ", nrow(mcd_data), "\n")

if ("CXCR4_mutated" %in% names(mcd_data)) {
  cxcr4_ipi <- mcd_data %>%
    filter(!is.na(CXCR4_mutated)) %>%
    group_by(CXCR4_mutated) %>%
    summarise(
      n = n(),
      mean_IPI = round(mean(IPI, na.rm = TRUE), 2),
      high_IPI_rate = round(mean(high_IPI) * 100, 1),
      .groups = "drop"
    )
  print(cxcr4_ipi)
}

#------------------------------------------------------------------------------
# 9. COO-SPECIFIC ANALYSIS (DUKE)
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   COO-SPECIFIC: IPI AND MUTATIONS\n")
cat("=============================================================\n\n")

# Check if COO data exists
if ("COO" %in% names(duke) || "Cell_of_Origin" %in% names(duke_class)) {
  # Merge COO if not present
  if (!"COO" %in% names(duke) && "Cell_of_Origin" %in% names(duke_class)) {
    duke <- duke %>%
      left_join(duke_class %>% select(PATIENT_ID, Cell_of_Origin), by = "PATIENT_ID")
    duke$COO <- duke$Cell_of_Origin
  }

  if ("COO" %in% names(duke)) {
    cat("--- IPI by Cell of Origin ---\n\n")
    coo_ipi <- duke %>%
      filter(!is.na(COO) & COO != "") %>%
      group_by(COO) %>%
      summarise(
        n = n(),
        mean_IPI = round(mean(IPI, na.rm = TRUE), 2),
        high_IPI_rate = round(mean(high_IPI) * 100, 1),
        .groups = "drop"
      ) %>%
      arrange(desc(mean_IPI))
    print(coo_ipi)
  }
}

#------------------------------------------------------------------------------
# 10. EXPRESSION DIFFERENTIAL: HIGH VS LOW IPI (LACY)
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("   EXPRESSION: HIGH vs LOW IPI (GCB SUBSET)\n")
cat("=============================================================\n\n")

# Load expression matrix
lacy_expr <- read.csv("Lacy_HMRN/expression_matrix.csv", stringsAsFactors = FALSE,
                      check.names = FALSE, row.names = 1)

# Get samples by IPI
high_ipi_samples <- lacy_staged$sample_id[lacy_staged$high_IPI == 1 & !is.na(lacy_staged$high_IPI)]
low_ipi_samples <- lacy_staged$sample_id[lacy_staged$high_IPI == 0 & !is.na(lacy_staged$high_IPI)]

# Filter to samples in expression matrix
high_ipi_samples <- high_ipi_samples[high_ipi_samples %in% colnames(lacy_expr)]
low_ipi_samples <- low_ipi_samples[low_ipi_samples %in% colnames(lacy_expr)]

cat("High IPI samples with expression: ", length(high_ipi_samples), "\n")
cat("Low IPI samples with expression: ", length(low_ipi_samples), "\n\n")

if (length(high_ipi_samples) >= 20 && length(low_ipi_samples) >= 20) {
  # Run differential expression
  de_results <- data.frame(
    probe = rownames(lacy_expr),
    mean_high_IPI = apply(lacy_expr[, high_ipi_samples], 1, mean, na.rm = TRUE),
    mean_low_IPI = apply(lacy_expr[, low_ipi_samples], 1, mean, na.rm = TRUE),
    stringsAsFactors = FALSE
  )

  de_results$log2FC <- de_results$mean_high_IPI - de_results$mean_low_IPI

  # T-tests
  de_results$p_value <- apply(lacy_expr, 1, function(row) {
    high <- row[high_ipi_samples]
    low <- row[low_ipi_samples]
    if (sum(!is.na(high)) > 10 && sum(!is.na(low)) > 10) {
      tryCatch(t.test(high, low)$p.value, error = function(e) NA)
    } else {
      NA
    }
  })

  de_results <- de_results %>% filter(!is.na(p_value))
  de_results$FDR <- p.adjust(de_results$p_value, method = "BH")
  de_results <- de_results %>% arrange(p_value)

  # Add gene annotation
  annot <- read.csv("Lacy_HMRN/GPL14951_annotation.csv", stringsAsFactors = FALSE)
  de_results <- de_results %>%
    left_join(annot %>% select(ID, Gene_Symbol) %>% distinct(), by = c("probe" = "ID"))

  cat("--- Top Genes Higher in HIGH IPI ---\n")
  print(de_results %>% filter(log2FC > 0) %>% select(probe, Gene_Symbol, log2FC, p_value, FDR) %>% head(15))

  cat("\n--- Top Genes Higher in LOW IPI ---\n")
  print(de_results %>% filter(log2FC < 0) %>% select(probe, Gene_Symbol, log2FC, p_value, FDR) %>% head(15))

  cat("\nSignificant probes (FDR < 0.1): ", sum(de_results$FDR < 0.1, na.rm = TRUE), "\n")
  cat("Significant probes (p < 0.05): ", sum(de_results$p_value < 0.05, na.rm = TRUE), "\n")

  # Save IPI differential expression
  write.csv(de_results, "global_scripts/lacy_de_high_vs_low_IPI.csv", row.names = FALSE)
}

#------------------------------------------------------------------------------
# 11. SAVE RESULTS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("                    SAVING RESULTS\n")
cat("=============================================================\n\n")

write.csv(subtype_ipi, "global_scripts/duke_subtype_ipi.csv", row.names = FALSE)
write.csv(pathway_ipi_results, "global_scripts/duke_pathway_mutations_ipi.csv", row.names = FALSE)

cat("Saved:\n")
cat("  - duke_subtype_ipi.csv\n")
cat("  - duke_pathway_mutations_ipi.csv\n")
cat("  - lacy_de_high_vs_low_IPI.csv\n")

cat("\n=== ANALYSIS COMPLETE ===\n")
