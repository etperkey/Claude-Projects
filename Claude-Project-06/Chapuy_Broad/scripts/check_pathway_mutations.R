# Check all pathway-related mutations and characterize LoF vs GoF

library(dplyr)

chapuy_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Chapuy_Broad"
mutations <- read.csv(file.path(chapuy_dir, "data/processed/chapuy_mutations_135.csv"))

cat("Total mutations in dataset:", nrow(mutations), "\n\n")

# Expanded pathway-related genes
pathway_genes <- c(
  # S1P receptors
  "S1PR1", "S1PR2", "S1PR3", "S1PR4", "S1PR5",
  # G proteins
  "GNA13", "GNAI2", "GNAI1", "GNAI3", "GNAS",
  # Rho/Rac GTPases and regulators
  "RHOA", "ARHGEF1", "ARHGAP25", "RAC1", "RAC2",
  # Chemokine/GPCR receptors
  "P2RY8", "CXCR4", "CXCR5", "CCR7",
  # S1P metabolism
  "SPHK1", "SPHK2", "SGPP1", "SGPP2",
  # Transcription factors
  "FOXO1", "KLF2", "MEF2B",
  # Co-occurring/pathway related
  "EZH2", "TNFRSF14", "BCL2"
)

cat("=== Mutations in Pathway-Related Genes ===\n\n")

pathway_muts <- mutations %>%
  filter(Hugo_Symbol %in% pathway_genes) %>%
  select(Hugo_Symbol, Variant_Classification, HGVSp_Short, Tumor_Sample_Barcode)

# Summary by gene
gene_summary <- pathway_muts %>%
  group_by(Hugo_Symbol) %>%
  summarise(
    n_mutations = n(),
    n_patients = n_distinct(Tumor_Sample_Barcode),
    .groups = "drop"
  ) %>%
  arrange(desc(n_patients))

cat("Gene mutation summary:\n")
print(gene_summary, n = 50)

# Variant classification summary
cat("\n\n=== Variant Classifications by Gene ===\n")
var_summary <- pathway_muts %>%
  group_by(Hugo_Symbol, Variant_Classification) %>%
  summarise(n = n(), .groups = "drop") %>%
  arrange(Hugo_Symbol, desc(n))

print(var_summary, n = 100)

# Detailed look at key genes
cat("\n\n=== Detailed Mutations ===\n")

for (gene in c("CXCR4", "GNAI2", "S1PR1", "S1PR2", "GNA13", "RHOA",
               "MEF2B", "EZH2", "FOXO1", "TNFRSF14", "RAC2")) {
  gene_muts <- pathway_muts %>% filter(Hugo_Symbol == gene)
  if (nrow(gene_muts) > 0) {
    cat("\n---", gene, "---\n")
    for (i in 1:nrow(gene_muts)) {
      cat(sprintf("  %s: %s\n", gene_muts$Variant_Classification[i], gene_muts$HGVSp_Short[i]))
    }
  }
}

# Classify mutation types for functional impact
cat("\n\n=== Functional Classification ===\n\n")

# Truncating = likely LoF
truncating <- c("Nonsense_Mutation", "Frame_Shift_Del", "Frame_Shift_Ins",
                "Splice_Site", "Splice_Region")

pathway_muts <- pathway_muts %>%
  mutate(
    Functional_Type = case_when(
      Variant_Classification %in% truncating ~ "Truncating (likely LoF)",
      Variant_Classification == "Missense_Mutation" ~ "Missense (context-dependent)",
      Variant_Classification == "In_Frame_Del" ~ "In-frame del",
      Variant_Classification == "In_Frame_Ins" ~ "In-frame ins",
      TRUE ~ "Other"
    )
  )

func_summary <- pathway_muts %>%
  group_by(Hugo_Symbol, Functional_Type) %>%
  summarise(n = n(), .groups = "drop") %>%
  tidyr::pivot_wider(names_from = Functional_Type, values_from = n, values_fill = 0)

cat("Functional classification by gene:\n")
print(func_summary, n = 50)

# CXCR4 specific - check for C-terminal truncations (GoF)
cat("\n\n=== CXCR4 C-terminal Truncation Analysis ===\n")
cxcr4 <- pathway_muts %>% filter(Hugo_Symbol == "CXCR4")
if (nrow(cxcr4) > 0) {
  cat("CXCR4 mutations found:\n")
  for (i in 1:nrow(cxcr4)) {
    cat(sprintf("  %s: %s\n", cxcr4$Variant_Classification[i], cxcr4$HGVSp_Short[i]))
  }
  cat("\nNote: C-terminal truncating mutations in CXCR4 (after ~aa 310) are GoF\n")
  cat("because they remove the internalization signal, causing prolonged signaling.\n")
} else {
  cat("No CXCR4 mutations found in this dataset.\n")
}

# Check for genes NOT in the data
cat("\n\n=== Genes with NO mutations found ===\n")
missing_genes <- setdiff(pathway_genes, unique(pathway_muts$Hugo_Symbol))
cat(paste(missing_genes, collapse = ", "), "\n")
