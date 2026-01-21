# =============================================================================
# 05_hotspot_analysis.R
# Identify recurrent missense hotspots (gain-of-function candidates)
# =============================================================================

library(dplyr)
library(tidyr)
library(readr)
library(stringr)
library(ggplot2)

# Output directory
output_dir <- "Reddy_Duke/analysis/output"
figures_dir <- "Reddy_Duke/analysis/figures"

# -----------------------------------------------------------------------------
# Load mutation data
# -----------------------------------------------------------------------------
cat("Loading mutation data...\n")

# Load Chapuy mutations (has HGVSp_Short for protein changes)
chapuy_muts <- read.delim("Chapuy_Broad/data/raw/data_mutations.txt",
                          stringsAsFactors = FALSE)
cat(sprintf("  Chapuy mutations: %d\n", nrow(chapuy_muts)))

# Load GAMBL mutations
gambl_muts <- read.delim("Dreval_GAMBL/data/raw/Table_S3.tsv",
                         stringsAsFactors = FALSE)
cat(sprintf("  GAMBL mutations: %d\n", nrow(gambl_muts)))

# Load gene selection data
gene_selection <- read_csv(file.path(output_dir, "gene_classification_with_selection.csv"),
                           show_col_types = FALSE)

# -----------------------------------------------------------------------------
# Process Chapuy missense mutations
# -----------------------------------------------------------------------------
cat("\nProcessing Chapuy missense mutations...\n")

chapuy_missense <- chapuy_muts %>%
  filter(Variant_Classification == "Missense_Mutation") %>%
  select(
    Gene = Hugo_Symbol,
    Patient = Tumor_Sample_Barcode,
    HGVSp_Short,
    Chromosome,
    Start_Position
  ) %>%
  # Extract amino acid position from HGVSp_Short (e.g., p.L265P -> 265)
  mutate(
    AA_Change = HGVSp_Short,
    AA_Position = as.numeric(str_extract(HGVSp_Short, "\\d+")),
    AA_Ref = str_extract(HGVSp_Short, "(?<=p\\.)[A-Z]"),
    AA_Alt = str_extract(HGVSp_Short, "[A-Z]$")
  ) %>%
  filter(!is.na(AA_Position))

cat(sprintf("  Missense mutations with position: %d\n", nrow(chapuy_missense)))

# -----------------------------------------------------------------------------
# Identify recurrent hotspots
# -----------------------------------------------------------------------------
cat("\nIdentifying recurrent hotspot positions...\n")

# Group by gene and position
hotspot_counts <- chapuy_missense %>%
  group_by(Gene, AA_Position, AA_Change) %>%
  summarise(
    N_patients = n_distinct(Patient),
    N_mutations = n(),
    AA_Ref = first(AA_Ref),
    AA_Alt = first(AA_Alt),
    .groups = "drop"
  ) %>%
  arrange(desc(N_patients))

# Gene-position level (combine all AA changes at same position)
position_counts <- chapuy_missense %>%
  group_by(Gene, AA_Position) %>%
  summarise(
    N_patients = n_distinct(Patient),
    N_mutations = n(),
    AA_Changes = paste(unique(AA_Change), collapse = ", "),
    .groups = "drop"
  ) %>%
  arrange(desc(N_patients))

# Define hotspots (>=3 patients at same position)
hotspots <- position_counts %>%
  filter(N_patients >= 3)

cat(sprintf("  Hotspot positions (>=3 patients): %d\n", nrow(hotspots)))

# Print top hotspots
cat("\nTop 30 recurrent missense hotspots:\n")
print(head(hotspots, 30), n = 30)

# -----------------------------------------------------------------------------
# Known oncogenic hotspots for validation
# -----------------------------------------------------------------------------
cat("\nValidating against known oncogenic hotspots...\n")

known_hotspots <- tribble(
  ~Gene,    ~Position, ~Description,
  "MYD88",  265,       "L265P - constitutive TLR signaling (ABC-DLBCL)",
  "EZH2",   641,       "Y641F/N/H/S - gain-of-function H3K27me3",
  "EZH2",   646,       "A646 - gain-of-function",
  "CD79B",  196,       "Y196 - BCR signaling activation",
  "CARD11", NA,        "Coiled-coil domain mutations",
  "STAT6",  NA,        "DNA-binding domain mutations",
  "BRAF",   600,       "V600E - constitutive kinase",
  "KRAS",   12,        "G12 - constitutive signaling",
  "KRAS",   13,        "G13 - constitutive signaling",
  "NRAS",   12,        "G12 - constitutive signaling",
  "NRAS",   61,        "Q61 - constitutive signaling"
)

# Check for known hotspots
validation_results <- known_hotspots %>%
  filter(!is.na(Position)) %>%
  left_join(position_counts, by = c("Gene", "Position" = "AA_Position")) %>%
  select(Gene, Position, Description, N_patients, AA_Changes)

cat("\nKnown hotspot validation:\n")
print(validation_results)

# -----------------------------------------------------------------------------
# Classify hotspots by gene context
# -----------------------------------------------------------------------------
cat("\nClassifying hotspots by gene selection context...\n")

hotspots_annotated <- hotspots %>%
  left_join(
    gene_selection %>% select(Gene, Selection_Status, Gene_Class),
    by = "Gene"
  ) %>%
  mutate(
    Hotspot_Class = case_when(
      Selection_Status == "Positive_Selection_LoF" ~ "LoF_Gene_Hotspot",
      Gene_Class == "aSHM_Target" ~ "aSHM_Passenger",
      N_patients >= 5 ~ "Putative_GoF",
      TRUE ~ "Recurrent_Unknown"
    )
  )

cat("\nHotspot classification:\n")
print(table(hotspots_annotated$Hotspot_Class))

# High-confidence GoF hotspots
gof_hotspots <- hotspots_annotated %>%
  filter(Hotspot_Class == "Putative_GoF" |
           (N_patients >= 3 & !Gene_Class %in% c("aSHM_Target"))) %>%
  arrange(desc(N_patients))

cat("\nPutative gain-of-function hotspots:\n")
print(gof_hotspots, n = 20)

# -----------------------------------------------------------------------------
# Calculate patient-level hotspot burden
# -----------------------------------------------------------------------------
cat("\nCalculating patient-level GoF hotspot burden...\n")

# Get list of GoF hotspot positions
gof_positions <- gof_hotspots %>%
  select(Gene, AA_Position)

# Count hotspot mutations per patient
patient_hotspots <- chapuy_missense %>%
  inner_join(gof_positions, by = c("Gene", "AA_Position")) %>%
  group_by(Patient) %>%
  summarise(
    GoF_hotspot_count = n(),
    GoF_genes = paste(unique(Gene), collapse = ", "),
    .groups = "drop"
  ) %>%
  rename(Patient_ID = Patient)

# All patients (including those without hotspots)
all_patients <- data.frame(
  Patient_ID = unique(chapuy_muts$Tumor_Sample_Barcode)
) %>%
  left_join(patient_hotspots, by = "Patient_ID") %>%
  mutate(
    GoF_hotspot_count = ifelse(is.na(GoF_hotspot_count), 0, GoF_hotspot_count),
    Has_GoF_hotspot = GoF_hotspot_count > 0
  )

cat(sprintf("  Patients with GoF hotspots: %d / %d (%.1f%%)\n",
            sum(all_patients$Has_GoF_hotspot),
            nrow(all_patients),
            100 * mean(all_patients$Has_GoF_hotspot)))

# MYD88 L265P specifically
myd88_patients <- chapuy_missense %>%
  filter(Gene == "MYD88", AA_Position == 265) %>%
  pull(Patient) %>%
  unique()

cat(sprintf("  MYD88 L265P patients: %d (%.1f%%)\n",
            length(myd88_patients),
            100 * length(myd88_patients) / nrow(all_patients)))

# EZH2 Y641 mutations
ezh2_patients <- chapuy_missense %>%
  filter(Gene == "EZH2", AA_Position == 641) %>%
  pull(Patient) %>%
  unique()

cat(sprintf("  EZH2 Y641 patients: %d (%.1f%%)\n",
            length(ezh2_patients),
            100 * length(ezh2_patients) / nrow(all_patients)))

# -----------------------------------------------------------------------------
# Lollipop-style visualization for top genes
# -----------------------------------------------------------------------------
cat("\nGenerating hotspot visualizations...\n")

# Function to create lollipop plot for a gene
create_lollipop <- function(gene_name, mutation_data, title_suffix = "") {
  gene_muts <- mutation_data %>%
    filter(Gene == gene_name) %>%
    group_by(AA_Position) %>%
    summarise(Count = n(), .groups = "drop")

  if (nrow(gene_muts) == 0) return(NULL)

  max_pos <- max(gene_muts$AA_Position, na.rm = TRUE)

  ggplot(gene_muts, aes(x = AA_Position, y = Count)) +
    geom_segment(aes(x = AA_Position, xend = AA_Position, y = 0, yend = Count),
                 color = "gray50") +
    geom_point(aes(size = Count), color = "#E41A1C", alpha = 0.8) +
    scale_x_continuous(limits = c(0, max_pos * 1.05)) +
    labs(
      title = paste0(gene_name, " Missense Mutations", title_suffix),
      x = "Amino Acid Position",
      y = "Number of Mutations"
    ) +
    theme_minimal() +
    theme(legend.position = "none")
}

# Create plots for top mutated genes with hotspots
top_hotspot_genes <- hotspots %>%
  group_by(Gene) %>%
  summarise(Max_hotspot = max(N_patients), .groups = "drop") %>%
  arrange(desc(Max_hotspot)) %>%
  head(6) %>%
  pull(Gene)

# Combined plot
plots <- lapply(top_hotspot_genes, function(g) {
  create_lollipop(g, chapuy_missense)
})

# Save individual plots
for (i in seq_along(top_hotspot_genes)) {
  if (!is.null(plots[[i]])) {
    ggsave(
      file.path(figures_dir, paste0("hotspot_lollipop_", top_hotspot_genes[i], ".png")),
      plots[[i]], width = 10, height = 4, dpi = 150
    )
  }
}

# Hotspot summary barplot
p_summary <- ggplot(head(hotspots, 20),
                    aes(x = reorder(paste(Gene, AA_Position, sep = "_"), N_patients),
                        y = N_patients)) +
  geom_col(fill = "#E41A1C", alpha = 0.8) +
  coord_flip() +
  labs(
    title = "Top 20 Recurrent Missense Hotspots",
    subtitle = "Chapuy WES cohort",
    x = "Gene_Position",
    y = "Number of Patients"
  ) +
  theme_minimal()

ggsave(file.path(figures_dir, "hotspot_summary.png"),
       p_summary, width = 10, height = 8, dpi = 150)

cat("  Figures saved.\n")

# -----------------------------------------------------------------------------
# Save outputs
# -----------------------------------------------------------------------------

# All hotspots
hotspots_file <- file.path(output_dir, "gof_hotspots.csv")
write_csv(hotspots_annotated, hotspots_file)
cat(sprintf("\nSaved hotspot analysis to: %s\n", hotspots_file))

# Detailed mutation counts by position
position_file <- file.path(output_dir, "missense_position_counts.csv")
write_csv(position_counts, position_file)
cat(sprintf("Saved position counts to: %s\n", position_file))

# Patient hotspot burden
patient_file <- file.path(output_dir, "patient_gof_hotspots.csv")
write_csv(all_patients, patient_file)
cat(sprintf("Saved patient hotspot burden to: %s\n", patient_file))

# Key hotspot genes list
key_hotspots <- hotspots_annotated %>%
  filter(Hotspot_Class == "Putative_GoF") %>%
  select(Gene, AA_Position, N_patients, AA_Changes)

key_file <- file.path(output_dir, "key_gof_hotspots.csv")
write_csv(key_hotspots, key_file)
cat(sprintf("Saved key GoF hotspots to: %s\n", key_file))

cat("\n=== Hotspot analysis complete ===\n")
