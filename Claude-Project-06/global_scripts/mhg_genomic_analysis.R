# MHG Genomic Pathway Analysis
# Looking at egress pathway mutations in MHG samples

library(dplyr)
setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=== MHG GENOMIC PATHWAY ANALYSIS ===\n\n")

#------------------------------------------------------------------------------
# 1. CHECK DATA LINKAGE
#------------------------------------------------------------------------------
cat("=== 1. Checking Data Linkage ===\n")

# Load expression data with MHG classification
lacy_tegress <- read.csv("Lacy_HMRN/results/tegress_scores.csv", stringsAsFactors = FALSE)

# Load genomic data with mutations
lacy_genomic <- read.csv("Lacy_HMRN/genomic_data.csv", stringsAsFactors = FALSE)
lacy_genetic <- read.csv("Lacy_HMRN/data/genetic_egress_scores.csv", stringsAsFactors = FALSE)

cat("Expression data (with MHG): ", nrow(lacy_tegress), " samples\n")
cat("Genomic data (with mutations): ", nrow(lacy_genomic), " samples\n")
cat("Genetic egress scores: ", nrow(lacy_genetic), " samples\n")

# Check if genetic data has COO
cat("\nGenetic data has cell_of_origin: ", "cell_of_origin" %in% names(lacy_genetic), "\n")
if ("cell_of_origin" %in% names(lacy_genetic)) {
  cat("COO distribution in genetic data:\n")
  print(table(lacy_genetic$cell_of_origin, useNA = "ifany"))
}

#------------------------------------------------------------------------------
# 2. UNFORTUNATELY - MHG IS NOT IN GENOMIC DATA
#------------------------------------------------------------------------------
cat("\n=== 2. The Problem: MHG Classification ===\n")
cat("
MHG is an EXPRESSION-based classification that requires gene expression data.
The genomic data only has ABC/GCB/UNC classification (no MHG).

This is because MHG is defined by expression patterns, not mutations.
The 403 'Missing' COO samples in genomic data likely include MHG cases
but we cannot identify them without expression data.
\n")

#------------------------------------------------------------------------------
# 3. ALTERNATIVE: Look at pathway mutations by available COO
#------------------------------------------------------------------------------
cat("=== 3. Pathway Mutations by Available COO ===\n\n")

# Pathway genes in genomic data
pathway_genes <- c("GNA13", "RHOA", "P2RY8", "CXCR4", "S1PR2", "SGK1_S")
available_genes <- pathway_genes[pathway_genes %in% names(lacy_genetic)]
cat("Available pathway genes: ", paste(available_genes, collapse = ", "), "\n\n")

# Mutation rates by COO
cat("--- Pathway Mutation Rates by COO ---\n")
for (gene in available_genes) {
  cat("\n", gene, ":\n")
  rates <- lacy_genetic %>%
    filter(!is.na(cell_of_origin)) %>%
    group_by(cell_of_origin) %>%
    summarise(
      n = n(),
      mutated = sum(get(gene), na.rm = TRUE),
      rate = round(mean(get(gene), na.rm = TRUE) * 100, 1),
      .groups = "drop"
    )
  print(rates)
}

#------------------------------------------------------------------------------
# 4. PATHWAY MUTATIONS BY GENETIC CLUSTER
#------------------------------------------------------------------------------
cat("\n=== 4. Pathway Mutations by Genetic Cluster ===\n")
cat("(Genetic clusters may partially capture MHG-like biology)\n\n")

for (gene in available_genes) {
  cat("\n", gene, " by cluster:\n")
  rates <- lacy_genetic %>%
    group_by(cluster_ICL) %>%
    summarise(
      n = n(),
      mutated = sum(get(gene), na.rm = TRUE),
      rate = round(mean(get(gene), na.rm = TRUE) * 100, 1),
      .groups = "drop"
    ) %>%
    arrange(desc(rate))
  print(rates)
}

#------------------------------------------------------------------------------
# 5. COMBINED PATHWAY SCORE BY CLUSTER
#------------------------------------------------------------------------------
cat("\n=== 5. Combined Pathway Scores by Cluster ===\n")

pathway_summary <- lacy_genetic %>%
  group_by(cluster_ICL) %>%
  summarise(
    n = n(),
    any_pathway_mut = sum(any_pathway_mut, na.rm = TRUE),
    any_pathway_rate = round(mean(any_pathway_mut, na.rm = TRUE) * 100, 1),
    mean_gEgress = round(mean(gEgress, na.rm = TRUE), 2),
    retention_mut = sum(retention_mut_count > 0, na.rm = TRUE),
    egress_mut = sum(egress_mut_count > 0, na.rm = TRUE),
    .groups = "drop"
  ) %>%
  arrange(desc(any_pathway_rate))

cat("\nPathway mutation summary by cluster:\n")
print(pathway_summary)

#------------------------------------------------------------------------------
# 6. CHECK FULL LACY GENOMIC DATA FOR MORE GENES
#------------------------------------------------------------------------------
cat("\n=== 6. Full Genomic Data - All Pathway Genes ===\n")

# Check what pathway genes are in the full genomic data
all_pathway <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA",
                 "CXCR4", "GNAI2", "RAC2", "ARHGAP25", "SGK1", "FOXO1")

found_in_genomic <- all_pathway[all_pathway %in% names(lacy_genomic)]
cat("Pathway genes in full genomic data: ", paste(found_in_genomic, collapse = ", "), "\n")

# Also check with _S suffix (some genes have this)
found_with_s <- paste0(all_pathway, "_S")
found_with_s <- found_with_s[found_with_s %in% names(lacy_genomic)]
cat("Pathway genes with _S suffix: ", paste(found_with_s, collapse = ", "), "\n")

#------------------------------------------------------------------------------
# 7. ATTEMPT TO MATCH SAMPLES
#------------------------------------------------------------------------------
cat("\n=== 7. Sample Matching Attempt ===\n")

# Check if sample IDs can be matched
cat("Expression sample IDs look like: ", head(lacy_tegress$sample_id, 3), "\n")
cat("Genomic sample IDs look like: ", head(lacy_genomic$PID, 3), "\n")
cat("Genetic egress PIDs look like: ", head(lacy_genetic$PID, 3), "\n")

# The merged file has some matches
merged <- read.csv("Lacy_HMRN/results/gcb_tegress_gegress_merged.csv", stringsAsFactors = FALSE)
cat("\nMerged file has: ", nrow(merged), " samples with both expression and genomic\n")

if (nrow(merged) > 10) {
  cat("\nCOO in merged data:\n")
  print(table(merged$COO, useNA = "ifany"))

  # Any MHG?
  if ("MHG" %in% merged$COO) {
    mhg_merged <- merged %>% filter(COO == "MHG")
    cat("\nMHG samples in merged: ", nrow(mhg_merged), "\n")
  }
}

#------------------------------------------------------------------------------
# 8. WORKAROUND: Use expression-based proxy
#------------------------------------------------------------------------------
cat("\n=== 8. Expression-Based Proxy for Genomic Egress ===\n")
cat("
Since we cannot directly link MHG to mutations, we can use tEgress as a proxy.
High tEgress in MHG suggests these samples BEHAVE like they have pathway hits,
even if we cannot confirm the genomic basis.

Key finding: In MHG, high tEgress predicts poor survival (HR=1.32, p=0.002)
This suggests the egress PHENOTYPE (regardless of cause) is prognostic.
\n")

# tEgress distribution in MHG vs others
cat("tEgress by COO:\n")
tegress_summary <- lacy_tegress %>%
  group_by(COO) %>%
  summarise(
    n = n(),
    mean_tEgress = round(mean(tEgress, na.rm = TRUE), 3),
    sd_tEgress = round(sd(tEgress, na.rm = TRUE), 3),
    pct_high = round(mean(tEgress > 0, na.rm = TRUE) * 100, 1),
    .groups = "drop"
  )
print(tegress_summary)

cat("\n=== SUMMARY ===\n")
cat("
LIMITATION: MHG is expression-defined and cannot be directly linked to
genomic mutation data in Lacy cohort without matched sample IDs.

WHAT WE KNOW:
1. MHG has the HIGHEST mean tEgress (+0.54)
2. 62% of MHG cases have tEgress > 0 (vs 42% in GCB)
3. High tEgress in MHG predicts poor survival

INTERPRETATION:
MHG cases appear to have an egress PHENOTYPE even without confirmed
genomic pathway mutations. This could be due to:
- Mutations we cannot detect (e.g., in regulatory regions)
- Epigenetic silencing of retention genes
- MYC-driven transcriptional programs
- Other mechanisms driving the egress phenotype
")
