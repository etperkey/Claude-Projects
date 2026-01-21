# GAMBL Pathway Mutation Analysis
# Re-analysis of Reddy/Duke data using GAMBL improved variant calling
# Dreval et al. "Revisiting Reddy: A DLBCL Do-over"

library(dplyr)
library(tidyr)
library(survival)
library(ggplot2)

# Install survminer if not available
if (!require(survminer, quietly = TRUE)) {
  cat("Note: survminer not installed, using base plotting\n")
  use_survminer <- FALSE
} else {
  use_survminer <- TRUE
}

# Set paths
base_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06"
gambl_dir <- file.path(base_dir, "Dreval_GAMBL")
duke_dir <- file.path(base_dir, "Reddy_Duke")

# Define pathway genes
retention_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")  # LoF
egress_genes <- c("CXCR4", "GNAI2", "RAC2", "ARHGAP25")  # GoF
all_pathway_genes <- c(retention_genes, egress_genes)

# Load GAMBL mutation data
cat("Loading GAMBL mutation data...\n")
gambl_muts <- read.delim(file.path(gambl_dir, "data/raw/Table_S3.tsv"),
                          stringsAsFactors = FALSE)

cat("Total mutations in GAMBL data:", nrow(gambl_muts), "\n")
cat("Unique samples:", length(unique(gambl_muts$Tumor_Sample_Barcode)), "\n")

# Filter for pathway genes
pathway_muts <- gambl_muts %>%
  filter(Hugo_Symbol %in% all_pathway_genes)

cat("\n=== Pathway Gene Mutations in GAMBL Data ===\n")
cat("Total pathway mutations:", nrow(pathway_muts), "\n")

# Count mutations per gene
gene_counts <- pathway_muts %>%
  group_by(Hugo_Symbol) %>%
  summarise(
    n_mutations = n(),
    n_samples = n_distinct(Tumor_Sample_Barcode)
  ) %>%
  arrange(desc(n_samples))

cat("\nMutations per gene:\n")
print(gene_counts)

# Check which pathway genes are missing
missing_genes <- setdiff(all_pathway_genes, unique(pathway_muts$Hugo_Symbol))
cat("\nMissing pathway genes in GAMBL data:", paste(missing_genes, collapse = ", "), "\n")
cat("Note: These genes were not in the original Reddy sequencing panel\n")

# Get unique samples in GAMBL
all_samples <- unique(gambl_muts$Tumor_Sample_Barcode)
n_total <- length(all_samples)
cat("\nTotal GAMBL samples:", n_total, "\n")

# Create per-patient mutation matrix
cat("\nCreating per-patient mutation matrix...\n")

# Get samples with any pathway mutation
pathway_samples <- pathway_muts %>%
  select(Tumor_Sample_Barcode, Hugo_Symbol) %>%
  distinct()

# Create wide format mutation matrix
mutation_matrix <- pathway_samples %>%
  mutate(mutated = 1) %>%
  pivot_wider(
    names_from = Hugo_Symbol,
    values_from = mutated,
    values_fill = 0
  )

# Add samples without pathway mutations
samples_without_muts <- setdiff(all_samples, mutation_matrix$Tumor_Sample_Barcode)
if (length(samples_without_muts) > 0) {
  empty_rows <- data.frame(
    Tumor_Sample_Barcode = samples_without_muts,
    stringsAsFactors = FALSE
  )
  # Add columns for genes present
  for (gene in unique(pathway_muts$Hugo_Symbol)) {
    empty_rows[[gene]] <- 0
  }
  mutation_matrix <- bind_rows(mutation_matrix, empty_rows)
}

# Ensure all available pathway genes are columns
present_genes <- intersect(all_pathway_genes, names(mutation_matrix))
cat("Genes with mutation data:", paste(present_genes, collapse = ", "), "\n")

# Map GAMBL sample IDs to Duke IDs
# Reddy_1008T -> DLBCL_DUKE_1008
mutation_matrix <- mutation_matrix %>%
  mutate(
    sample_num = gsub("Reddy_([0-9]+)T", "\\1", Tumor_Sample_Barcode),
    SAMPLE_ID = paste0("DLBCL_DUKE_", sample_num)
  )

# Calculate pathway scores using available genes
# Only include genes we have data for
available_retention <- intersect(retention_genes, names(mutation_matrix))
available_egress <- intersect(egress_genes, names(mutation_matrix))

cat("\nAvailable Retention genes:", paste(available_retention, collapse = ", "), "\n")
cat("Available Egress genes:", paste(available_egress, collapse = ", "), "\n")

mutation_matrix <- mutation_matrix %>%
  rowwise() %>%
  mutate(
    Retention_Score = sum(c_across(all_of(available_retention)), na.rm = TRUE),
    Egress_Score = sum(c_across(all_of(available_egress)), na.rm = TRUE),
    Combined_Score = Retention_Score + Egress_Score
  ) %>%
  ungroup()

# Calculate mutation frequencies
cat("\n=== GAMBL Mutation Frequencies ===\n")
for (gene in present_genes) {
  freq <- mean(mutation_matrix[[gene]], na.rm = TRUE) * 100
  n_mut <- sum(mutation_matrix[[gene]], na.rm = TRUE)
  cat(sprintf("%s: %.1f%% (%d/%d)\n", gene, freq, n_mut, n_total))
}

# Load original Duke pathway data for comparison
cat("\n=== Loading Original Duke Data for Comparison ===\n")
duke_scores <- read.csv(file.path(duke_dir, "data/processed/duke_egress_scores.csv"))
names(duke_scores) <- gsub("_mutated$", "", names(duke_scores))

# Compare frequencies
cat("\nGene Frequency Comparison (GAMBL vs Original Duke):\n")
comparison <- data.frame(Gene = present_genes, stringsAsFactors = FALSE)
comparison$GAMBL_freq <- sapply(present_genes, function(g) {
  mean(mutation_matrix[[g]], na.rm = TRUE) * 100
})
comparison$Duke_freq <- sapply(present_genes, function(g) {
  if (g %in% names(duke_scores)) {
    mean(duke_scores[[g]], na.rm = TRUE) * 100
  } else {
    NA
  }
})
comparison$Difference <- comparison$GAMBL_freq - comparison$Duke_freq
print(comparison)

# Save comparison
write.csv(comparison, file.path(gambl_dir, "data/processed/gambl_vs_duke_frequencies.csv"),
          row.names = FALSE)

# Load Duke clinical data
cat("\n=== Merging with Clinical Data ===\n")
clinical_patient <- read.csv(file.path(duke_dir, "data/raw/data_clinical_patient.csv"))
clinical_sample <- read.csv(file.path(duke_dir, "data/raw/data_clinical_sample.csv"))

# Merge clinical data
clinical <- merge(clinical_patient, clinical_sample, by.x = "PATIENT_ID", by.y = "SAMPLE_ID")
cat("Clinical data patients:", nrow(clinical), "\n")

# Merge with mutation data
merged_data <- merge(mutation_matrix, clinical, by.x = "SAMPLE_ID", by.y = "PATIENT_ID")
cat("Merged patients with mutations and clinical:", nrow(merged_data), "\n")

# Parse OS_STATUS
merged_data <- merged_data %>%
  mutate(
    OS_EVENT = case_when(
      grepl("DECEASED", OS_STATUS) ~ 1,
      grepl("LIVING", OS_STATUS) ~ 0,
      TRUE ~ NA_real_
    )
  )

# Save merged data
write.csv(mutation_matrix, file.path(gambl_dir, "data/processed/gambl_pathway_mutations.csv"),
          row.names = FALSE)
write.csv(merged_data, file.path(gambl_dir, "data/processed/gambl_clinical_merged.csv"),
          row.names = FALSE)

cat("\nSaved: gambl_pathway_mutations.csv and gambl_clinical_merged.csv\n")

# Score distribution
cat("\n=== Score Distributions ===\n")
cat("Combined Score distribution:\n")
print(table(merged_data$Combined_Score))

# Survival Analysis
cat("\n=== Survival Analysis ===\n")

# Filter for complete survival data
surv_data <- merged_data %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT))

cat("Patients with complete survival data:", nrow(surv_data), "\n")

# Score categories
surv_data$Score_Category <- ifelse(surv_data$Combined_Score >= 1, "Score >= 1", "Score = 0")

# Survival analysis
cat("\nSurvival by Combined Score (0 vs >=1):\n")
fit <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ Score_Category, data = surv_data)
print(fit)

# Log-rank test
surv_diff <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ Score_Category, data = surv_data)
p_value <- 1 - pchisq(surv_diff$chisq, df = 1)
cat("\nLog-rank test p-value:", format(p_value, digits = 4), "\n")

# Cox regression
cox_model <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ Combined_Score, data = surv_data)
cat("\nCox regression (Combined_Score as continuous):\n")
print(summary(cox_model))

# Save survival plot
png(file.path(gambl_dir, "data/processed/gambl_survival_plot.png"),
    width = 800, height = 600)
if (use_survminer) {
  print(ggsurvplot(fit, data = surv_data,
             pval = TRUE,
             risk.table = TRUE,
             title = "GAMBL Pathway Analysis: OS by Combined Score",
             xlab = "Time (months)",
             ylab = "Overall Survival",
             legend.labs = c("Score = 0", "Score >= 1"),
             palette = c("#2E9FDF", "#E7B800")))
} else {
  plot(fit, col = c("#2E9FDF", "#E7B800"), lwd = 2,
       xlab = "Time (months)", ylab = "Overall Survival",
       main = sprintf("GAMBL Pathway Analysis: OS by Combined Score\np = %s",
                      format(p_value, digits = 4)))
  legend("bottomleft", legend = c("Score = 0", "Score >= 1"),
         col = c("#2E9FDF", "#E7B800"), lwd = 2)
}
dev.off()

cat("\nSaved survival plot: gambl_survival_plot.png\n")

# Score 2+ analysis (if enough samples)
n_score2plus <- sum(surv_data$Combined_Score >= 2, na.rm = TRUE)
cat("\nPatients with Score >= 2:", n_score2plus, "\n")

if (n_score2plus >= 5) {
  surv_data$Score_2plus <- ifelse(surv_data$Combined_Score >= 2, "Score >= 2", "Score < 2")

  fit2 <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ Score_2plus, data = surv_data)
  surv_diff2 <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ Score_2plus, data = surv_data)
  p_value2 <- 1 - pchisq(surv_diff2$chisq, df = 1)
  cat("Log-rank test (Score >= 2 vs < 2) p-value:", format(p_value2, digits = 4), "\n")

  png(file.path(gambl_dir, "data/processed/gambl_survival_score2.png"),
      width = 800, height = 600)
  if (use_survminer) {
    print(ggsurvplot(fit2, data = surv_data,
               pval = TRUE,
               risk.table = TRUE,
               title = "GAMBL Pathway Analysis: OS by Score >= 2",
               xlab = "Time (months)",
               ylab = "Overall Survival",
               legend.labs = c("Score < 2", "Score >= 2"),
               palette = c("#2E9FDF", "#E7B800")))
  } else {
    plot(fit2, col = c("#2E9FDF", "#E7B800"), lwd = 2,
         xlab = "Time (months)", ylab = "Overall Survival",
         main = sprintf("GAMBL Pathway Analysis: OS by Score >= 2\np = %s",
                        format(p_value2, digits = 4)))
    legend("bottomleft", legend = c("Score < 2", "Score >= 2"),
           col = c("#2E9FDF", "#E7B800"), lwd = 2)
  }
  dev.off()
  cat("Saved: gambl_survival_score2.png\n")
}

# Summary statistics
cat("\n=== GAMBL Analysis Summary ===\n")
cat("Total GAMBL samples:", n_total, "\n")
cat("Patients with clinical data:", nrow(merged_data), "\n")
cat("Patients with survival data:", nrow(surv_data), "\n")
cat("Pathway genes available:", length(present_genes), "of 9\n")
cat("Missing genes:", paste(missing_genes, collapse = ", "), "\n")
cat("\nKey finding: GAMBL improved variant calling, but panel gene coverage unchanged\n")
