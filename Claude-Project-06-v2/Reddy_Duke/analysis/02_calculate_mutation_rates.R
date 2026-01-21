# =============================================================================
# 02_calculate_mutation_rates.R
# Calculate per-gene mutation rates by functional consequence
# Using Chapuy WES data (includes silent mutations for aSHM signature)
# =============================================================================

library(dplyr)
library(tidyr)
library(readr)

# Output directory
output_dir <- "Reddy_Duke/analysis/output"
if (!dir.exists(output_dir)) dir.create(output_dir, recursive = TRUE)

# -----------------------------------------------------------------------------
# Load data
# -----------------------------------------------------------------------------
cat("Loading data...\n")

# Load Chapuy WES mutations
chapuy_muts <- read.delim("Chapuy_Broad/data/raw/data_mutations.txt",
                          stringsAsFactors = FALSE)
cat(sprintf("  Chapuy mutations: %d\n", nrow(chapuy_muts)))

# Load gene lengths
gene_lengths <- read_csv(file.path(output_dir, "gene_cds_lengths.csv"),
                         show_col_types = FALSE)
cat(sprintf("  Gene lengths: %d genes\n", nrow(gene_lengths)))

# Get number of patients for rate calculation
n_patients <- length(unique(chapuy_muts$Tumor_Sample_Barcode))
cat(sprintf("  Chapuy patients: %d\n", n_patients))

# -----------------------------------------------------------------------------
# Classify mutations by functional consequence
# -----------------------------------------------------------------------------
cat("\nClassifying mutations by functional consequence...\n")

# Define mutation categories based on Variant_Classification
classify_mutation <- function(var_class) {
  case_when(
    var_class == "Silent" ~ "Synonymous",
    var_class == "Missense_Mutation" ~ "Missense",
    var_class %in% c("Nonsense_Mutation", "Nonstop_Mutation") ~ "Truncating",
    var_class %in% c("Frame_Shift_Del", "Frame_Shift_Ins") ~ "Truncating",
    var_class %in% c("Splice_Site", "Translation_Start_Site") ~ "Truncating",
    var_class %in% c("In_Frame_Del", "In_Frame_Ins") ~ "Inframe_Indel",
    var_class %in% c("Splice_Region", "Intron", "3'UTR", "5'UTR", "5'Flank", "RNA") ~ "Other",
    TRUE ~ "Other"
  )
}

chapuy_muts <- chapuy_muts %>%
  mutate(Mutation_Category = classify_mutation(Variant_Classification))

# Count by category
cat("\nMutation category counts:\n")
category_counts <- chapuy_muts %>%
  count(Mutation_Category) %>%
  arrange(desc(n))
print(category_counts)

# -----------------------------------------------------------------------------
# Calculate gene-level mutation counts
# -----------------------------------------------------------------------------
cat("\nCalculating gene-level mutation counts...\n")

gene_mut_counts <- chapuy_muts %>%
  filter(Mutation_Category %in% c("Synonymous", "Missense", "Truncating")) %>%
  group_by(Hugo_Symbol, Mutation_Category) %>%
  summarise(n_mutations = n(), .groups = "drop") %>%
  pivot_wider(
    names_from = Mutation_Category,
    values_from = n_mutations,
    values_fill = 0
  ) %>%
  rename(Gene = Hugo_Symbol)

# Ensure all columns exist
if (!"Synonymous" %in% names(gene_mut_counts)) gene_mut_counts$Synonymous <- 0
if (!"Missense" %in% names(gene_mut_counts)) gene_mut_counts$Missense <- 0
if (!"Truncating" %in% names(gene_mut_counts)) gene_mut_counts$Truncating <- 0

gene_mut_counts <- gene_mut_counts %>%
  mutate(
    Total_Coding = Synonymous + Missense + Truncating
  )

cat(sprintf("  Genes with mutations: %d\n", nrow(gene_mut_counts)))

# -----------------------------------------------------------------------------
# Merge with gene lengths and calculate rates
# -----------------------------------------------------------------------------
cat("\nCalculating mutation rates per Mb of CDS...\n")

gene_rates <- gene_mut_counts %>%
  inner_join(gene_lengths %>% select(Gene, CDS_length_bp), by = "Gene") %>%
  mutate(
    CDS_length_Mb = CDS_length_bp / 1e6,
    # Rates per Mb of CDS (across all patients)
    Rate_synonymous = Synonymous / CDS_length_Mb,
    Rate_missense = Missense / CDS_length_Mb,
    Rate_truncating = Truncating / CDS_length_Mb,
    Rate_total = Total_Coding / CDS_length_Mb,
    # Rates per patient per Mb
    Rate_syn_per_patient = Rate_synonymous / n_patients,
    Rate_mis_per_patient = Rate_missense / n_patients,
    Rate_trunc_per_patient = Rate_truncating / n_patients,
    # dN/dS-like ratios
    Ratio_mis_to_syn = ifelse(Synonymous > 0, Missense / Synonymous, NA),
    Ratio_trunc_to_mis = ifelse(Missense > 0, Truncating / Missense, NA),
    Ratio_trunc_to_syn = ifelse(Synonymous > 0, Truncating / Synonymous, NA),
    # Rate ratios (more robust)
    Rate_ratio_mis_syn = ifelse(Rate_synonymous > 0, Rate_missense / Rate_synonymous, NA),
    Rate_ratio_trunc_mis = ifelse(Rate_missense > 0, Rate_truncating / Rate_missense, NA)
  )

cat(sprintf("  Genes with rates calculated: %d\n", nrow(gene_rates)))

# -----------------------------------------------------------------------------
# Calculate genome-wide baseline rates
# -----------------------------------------------------------------------------
cat("\nCalculating genome-wide baseline rates...\n")

# Sum across all genes
total_synonymous <- sum(gene_rates$Synonymous)
total_missense <- sum(gene_rates$Missense)
total_truncating <- sum(gene_rates$Truncating)
total_cds_mb <- sum(gene_rates$CDS_length_Mb)

baseline_rates <- data.frame(
  Metric = c(
    "Total_synonymous_mutations",
    "Total_missense_mutations",
    "Total_truncating_mutations",
    "Total_CDS_Mb",
    "Baseline_synonymous_rate_per_Mb",
    "Baseline_missense_rate_per_Mb",
    "Baseline_truncating_rate_per_Mb",
    "Genome_ratio_mis_syn",
    "Genome_ratio_trunc_mis",
    "N_patients"
  ),
  Value = c(
    total_synonymous,
    total_missense,
    total_truncating,
    round(total_cds_mb, 4),
    round(total_synonymous / total_cds_mb, 2),
    round(total_missense / total_cds_mb, 2),
    round(total_truncating / total_cds_mb, 2),
    round(total_missense / total_synonymous, 3),
    round(total_truncating / total_missense, 3),
    n_patients
  )
)

cat("\nGenome-wide baseline rates:\n")
print(baseline_rates)

# -----------------------------------------------------------------------------
# Identify top mutated genes
# -----------------------------------------------------------------------------
cat("\nTop 20 most mutated genes (by total coding mutations):\n")
top_genes <- gene_rates %>%
  arrange(desc(Total_Coding)) %>%
  head(20) %>%
  select(Gene, Synonymous, Missense, Truncating, Total_Coding, CDS_length_bp,
         Rate_total, Ratio_mis_to_syn, Ratio_trunc_to_mis)
print(top_genes, n = 20)

# -----------------------------------------------------------------------------
# Identify genes with high synonymous rate (potential aSHM targets)
# -----------------------------------------------------------------------------
cat("\nGenes with highest synonymous mutation rates (potential aSHM targets):\n")
high_syn_genes <- gene_rates %>%
  filter(Synonymous >= 3) %>%  # Require at least 3 synonymous mutations
  arrange(desc(Rate_synonymous)) %>%
  head(20) %>%
  select(Gene, Synonymous, Missense, Truncating, Rate_synonymous,
         Ratio_mis_to_syn, Ratio_trunc_to_mis)
print(high_syn_genes, n = 20)

# -----------------------------------------------------------------------------
# Save outputs
# -----------------------------------------------------------------------------

# Full gene rates table
output_file <- file.path(output_dir, "chapuy_mutation_rates.csv")
write_csv(gene_rates, output_file)
cat(sprintf("\nSaved mutation rates to: %s\n", output_file))

# Baseline rates
baseline_file <- file.path(output_dir, "baseline_mutation_rates.csv")
write_csv(baseline_rates, baseline_file)
cat(sprintf("Saved baseline rates to: %s\n", baseline_file))

# Also save patient-level mutation counts for later analysis
patient_counts <- chapuy_muts %>%
  filter(Mutation_Category %in% c("Synonymous", "Missense", "Truncating")) %>%
  group_by(Tumor_Sample_Barcode, Mutation_Category) %>%
  summarise(n = n(), .groups = "drop") %>%
  pivot_wider(
    names_from = Mutation_Category,
    values_from = n,
    values_fill = 0
  ) %>%
  rename(Patient_ID = Tumor_Sample_Barcode)

if (!"Synonymous" %in% names(patient_counts)) patient_counts$Synonymous <- 0
if (!"Missense" %in% names(patient_counts)) patient_counts$Missense <- 0
if (!"Truncating" %in% names(patient_counts)) patient_counts$Truncating <- 0

patient_counts <- patient_counts %>%
  mutate(Total_Coding = Synonymous + Missense + Truncating)

patient_file <- file.path(output_dir, "chapuy_patient_mutation_counts.csv")
write_csv(patient_counts, patient_file)
cat(sprintf("Saved patient counts to: %s\n", patient_file))

cat("\n=== Mutation rate calculation complete ===\n")
