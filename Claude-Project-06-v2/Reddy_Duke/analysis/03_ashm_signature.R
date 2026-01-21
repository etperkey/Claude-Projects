# =============================================================================
# 03_ashm_signature.R
# Identify aberrant somatic hypermutation (aSHM) target genes
# and calculate patient-level aSHM scores
# =============================================================================

library(dplyr)
library(tidyr)
library(readr)
library(ggplot2)

# Output directory
output_dir <- "Reddy_Duke/analysis/output"
figures_dir <- "Reddy_Duke/analysis/figures"
if (!dir.exists(figures_dir)) dir.create(figures_dir, recursive = TRUE)

# -----------------------------------------------------------------------------
# Load data
# -----------------------------------------------------------------------------
cat("Loading data...\n")

# Load mutation rates from previous step
gene_rates <- read_csv(file.path(output_dir, "chapuy_mutation_rates.csv"),
                       show_col_types = FALSE)
cat(sprintf("  Gene rates: %d genes\n", nrow(gene_rates)))

# Load baseline rates
baseline <- read_csv(file.path(output_dir, "baseline_mutation_rates.csv"),
                     show_col_types = FALSE)

# Load raw Chapuy mutations for AID motif analysis
chapuy_muts <- read.delim("Chapuy_Broad/data/raw/data_mutations.txt",
                          stringsAsFactors = FALSE)

# Get number of patients
n_patients <- baseline$Value[baseline$Metric == "N_patients"]

# -----------------------------------------------------------------------------
# Define known aSHM target genes (literature reference)
# -----------------------------------------------------------------------------
cat("\nDefining known aSHM target genes from literature...\n")

# Known aSHM targets in DLBCL (from Pasqualucci et al., various publications)
known_ashm_targets <- c(
  # Ig genes (always hypermutated)
  "IGLL5", "IGHV", "IGLV", "IGKV",
  # BCL6 locus
  "BCL6",
  # Classic aSHM targets
  "PIM1", "MYC", "RHOH", "PAX5", "IRF4", "BCL7A",
  # Other frequently affected
  "CIITA", "SOCS1", "CD79B", "BTG1", "BTG2",
  "HIST1H1E", "HIST1H1C", "HIST1H1D", "HIST1H1B",
  "ETV6", "SGK1", "DUSP2", "ZFP36L1", "OSBPL10"
)

cat(sprintf("  Known aSHM targets: %d genes\n", length(known_ashm_targets)))

# -----------------------------------------------------------------------------
# Criteria for aSHM target identification
# -----------------------------------------------------------------------------
cat("\nIdentifying aSHM targets based on mutation patterns...\n")

# aSHM characteristics:
# 1. High total mutation rate (above median)
# 2. High proportion of synonymous + missense (vs truncating)
# 3. Low truncating-to-missense ratio (<0.2)
# 4. At least some synonymous mutations (AID signature)

# Calculate mutation rate quantiles
rate_median <- median(gene_rates$Rate_total, na.rm = TRUE)
rate_75th <- quantile(gene_rates$Rate_total, 0.75, na.rm = TRUE)

cat(sprintf("  Median mutation rate: %.1f per Mb\n", rate_median))
cat(sprintf("  75th percentile rate: %.1f per Mb\n", rate_75th))

# Identify aSHM candidates
gene_rates <- gene_rates %>%
  mutate(
    # aSHM scoring criteria
    High_mutation_rate = Rate_total >= rate_median,
    Has_synonymous = Synonymous >= 2,
    Low_truncating_ratio = is.na(Ratio_trunc_to_mis) | Ratio_trunc_to_mis < 0.2,
    # Combined aSHM score
    aSHM_criteria_met = High_mutation_rate & Has_synonymous & Low_truncating_ratio,
    # Check if known target
    Known_aSHM_target = Gene %in% known_ashm_targets
  )

# -----------------------------------------------------------------------------
# Calculate aSHM score for each gene
# -----------------------------------------------------------------------------
cat("\nCalculating aSHM scores for each gene...\n")

# aSHM score formula:
# Higher score = more likely aSHM target
# Based on: high synonymous+missense, low truncating proportion

gene_rates <- gene_rates %>%
  mutate(
    # Proportion non-truncating (syn + mis) / total
    Prop_non_truncating = (Synonymous + Missense) / pmax(Total_Coding, 1),
    # aSHM score: mutation rate weighted by non-truncating proportion
    aSHM_gene_score = Rate_total * Prop_non_truncating,
    # Negative selection indicator (excess truncating)
    Prop_truncating = Truncating / pmax(Total_Coding, 1)
  )

# Classify genes
gene_rates <- gene_rates %>%
  mutate(
    Gene_Class = case_when(
      aSHM_criteria_met | Known_aSHM_target ~ "aSHM_Target",
      Prop_truncating > 0.3 & Total_Coding >= 5 ~ "Selection_Candidate",
      TRUE ~ "Other"
    )
  )

# Summary of gene classes
cat("\nGene classification summary:\n")
print(table(gene_rates$Gene_Class))

# -----------------------------------------------------------------------------
# Final aSHM target gene list
# -----------------------------------------------------------------------------
ashm_genes <- gene_rates %>%
  filter(Gene_Class == "aSHM_Target") %>%
  arrange(desc(aSHM_gene_score)) %>%
  select(Gene, Synonymous, Missense, Truncating, Total_Coding,
         Rate_total, Ratio_trunc_to_mis, aSHM_gene_score,
         Known_aSHM_target, aSHM_criteria_met)

cat(sprintf("\nIdentified %d aSHM target genes:\n", nrow(ashm_genes)))
print(head(ashm_genes, 30), n = 30)

# Validate against known targets
known_found <- sum(ashm_genes$Known_aSHM_target)
cat(sprintf("\nKnown aSHM targets found: %d / %d\n", known_found, length(known_ashm_targets)))

# Known targets in data but not identified
known_in_data <- gene_rates %>%
  filter(Known_aSHM_target)
cat(sprintf("Known targets present in data: %d\n", nrow(known_in_data)))

missing_known <- known_in_data %>%
  filter(Gene_Class != "aSHM_Target") %>%
  select(Gene, Synonymous, Missense, Truncating, Rate_total, Gene_Class)

if (nrow(missing_known) > 0) {
  cat("\nKnown targets not meeting criteria (low mutations in this cohort):\n")
  print(missing_known)
}

# -----------------------------------------------------------------------------
# Calculate patient-level aSHM burden
# -----------------------------------------------------------------------------
cat("\nCalculating patient-level aSHM burden scores...\n")

# Get list of aSHM genes
ashm_gene_list <- ashm_genes$Gene

# Classify mutations
classify_mutation <- function(var_class) {
  case_when(
    var_class == "Silent" ~ "Synonymous",
    var_class == "Missense_Mutation" ~ "Missense",
    var_class %in% c("Nonsense_Mutation", "Nonstop_Mutation",
                     "Frame_Shift_Del", "Frame_Shift_Ins",
                     "Splice_Site", "Translation_Start_Site") ~ "Truncating",
    TRUE ~ "Other"
  )
}

chapuy_muts <- chapuy_muts %>%
  mutate(
    Mutation_Category = classify_mutation(Variant_Classification),
    Is_aSHM_gene = Hugo_Symbol %in% ashm_gene_list
  )

# Patient-level aSHM burden
patient_ashm <- chapuy_muts %>%
  filter(Mutation_Category %in% c("Synonymous", "Missense", "Truncating")) %>%
  group_by(Tumor_Sample_Barcode) %>%
  summarise(
    Total_mutations = n(),
    aSHM_gene_mutations = sum(Is_aSHM_gene),
    aSHM_synonymous = sum(Is_aSHM_gene & Mutation_Category == "Synonymous"),
    aSHM_missense = sum(Is_aSHM_gene & Mutation_Category == "Missense"),
    aSHM_truncating = sum(Is_aSHM_gene & Mutation_Category == "Truncating"),
    Non_aSHM_mutations = sum(!Is_aSHM_gene),
    Non_aSHM_truncating = sum(!Is_aSHM_gene & Mutation_Category == "Truncating"),
    .groups = "drop"
  ) %>%
  rename(Patient_ID = Tumor_Sample_Barcode) %>%
  mutate(
    # aSHM burden score (weighted by syn+mis in aSHM genes)
    aSHM_burden = aSHM_synonymous + aSHM_missense,
    # Proportion of mutations in aSHM genes
    Prop_aSHM = aSHM_gene_mutations / pmax(Total_mutations, 1),
    # Selected LoF burden (truncating in non-aSHM genes)
    Selected_LoF_burden = Non_aSHM_truncating
  )

cat(sprintf("  Patient aSHM scores calculated: %d patients\n", nrow(patient_ashm)))

# Summary statistics
cat("\nPatient aSHM burden summary:\n")
cat(sprintf("  Median aSHM burden: %.0f\n", median(patient_ashm$aSHM_burden)))
cat(sprintf("  Mean aSHM burden: %.1f\n", mean(patient_ashm$aSHM_burden)))
cat(sprintf("  Range: %d - %d\n", min(patient_ashm$aSHM_burden), max(patient_ashm$aSHM_burden)))

# Correlation between aSHM burden and total mutations
cor_total <- cor(patient_ashm$aSHM_burden, patient_ashm$Total_mutations)
cat(sprintf("  Correlation with total mutations: %.3f\n", cor_total))

# -----------------------------------------------------------------------------
# Visualizations
# -----------------------------------------------------------------------------
cat("\nGenerating visualizations...\n")

# 1. Gene mutation pattern scatter plot
p1 <- ggplot(gene_rates %>% filter(Total_Coding >= 5),
             aes(x = log10(Rate_total + 1),
                 y = Prop_truncating,
                 color = Gene_Class)) +
  geom_point(alpha = 0.6) +
  geom_text(data = gene_rates %>%
              filter(Total_Coding >= 5, Gene_Class == "aSHM_Target") %>%
              slice_max(aSHM_gene_score, n = 15),
            aes(label = Gene),
            size = 2.5, vjust = -0.5, hjust = 0.5) +
  scale_color_manual(values = c(
    "aSHM_Target" = "#E41A1C",
    "Selection_Candidate" = "#377EB8",
    "Other" = "gray60"
  )) +
  labs(
    title = "Gene Mutation Patterns: aSHM vs Selection",
    subtitle = "Genes with >= 5 coding mutations",
    x = "Log10(Mutation Rate per Mb + 1)",
    y = "Proportion Truncating Mutations",
    color = "Gene Class"
  ) +
  theme_minimal() +
  theme(legend.position = "bottom")

ggsave(file.path(figures_dir, "ashm_gene_classification.png"),
       p1, width = 10, height = 8, dpi = 150)

# 2. Patient aSHM burden distribution
p2 <- ggplot(patient_ashm, aes(x = aSHM_burden)) +
  geom_histogram(binwidth = 5, fill = "#E41A1C", color = "white", alpha = 0.7) +
  labs(
    title = "Distribution of Patient aSHM Burden",
    subtitle = sprintf("n = %d patients, Median = %.0f",
                       nrow(patient_ashm), median(patient_ashm$aSHM_burden)),
    x = "aSHM Burden (Syn + Mis mutations in aSHM genes)",
    y = "Number of Patients"
  ) +
  theme_minimal()

ggsave(file.path(figures_dir, "ashm_patient_burden_dist.png"),
       p2, width = 8, height = 6, dpi = 150)

# 3. aSHM burden vs total mutations
p3 <- ggplot(patient_ashm, aes(x = Total_mutations, y = aSHM_burden)) +
  geom_point(alpha = 0.6, color = "#E41A1C") +
  geom_smooth(method = "lm", se = TRUE, color = "black") +
  labs(
    title = "aSHM Burden vs Total Mutation Count",
    subtitle = sprintf("Correlation = %.3f", cor_total),
    x = "Total Coding Mutations",
    y = "aSHM Burden"
  ) +
  theme_minimal()

ggsave(file.path(figures_dir, "ashm_vs_total_mutations.png"),
       p3, width = 8, height = 6, dpi = 150)

cat("  Figures saved to: ", figures_dir, "\n")

# -----------------------------------------------------------------------------
# Save outputs
# -----------------------------------------------------------------------------

# aSHM target gene list
ashm_file <- file.path(output_dir, "ashm_signature_genes.csv")
write_csv(ashm_genes, ashm_file)
cat(sprintf("\nSaved aSHM signature genes to: %s\n", ashm_file))

# Full gene classification
gene_class_file <- file.path(output_dir, "gene_classification.csv")
write_csv(gene_rates, gene_class_file)
cat(sprintf("Saved gene classification to: %s\n", gene_class_file))

# Patient aSHM burden
patient_file <- file.path(output_dir, "patient_ashm_burden.csv")
write_csv(patient_ashm, patient_file)
cat(sprintf("Saved patient aSHM burden to: %s\n", patient_file))

# Simple aSHM gene list for other scripts
gene_list_file <- file.path(output_dir, "ashm_gene_list.txt")
writeLines(ashm_gene_list, gene_list_file)
cat(sprintf("Saved aSHM gene list to: %s\n", gene_list_file))

cat("\n=== aSHM signature identification complete ===\n")
