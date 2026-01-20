# Check for MHG mutation data across cohorts
library(dplyr)
library(readxl)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=== SEARCHING FOR MHG + MUTATION DATA ===\n\n")

#------------------------------------------------------------------------------
# 1. CHECK LACY BLOOD SUPPLEMENT
#------------------------------------------------------------------------------
cat("=== 1. Lacy Blood 2020 Supplement ===\n")

supp_file <- "Lacy_HMRN/blood_2020_supplement.xlsx"
if (file.exists(supp_file)) {
  sheets <- excel_sheets(supp_file)
  cat("Available sheets:\n")
  print(sheets)

  # Check S4 for clinical data
  if ("S4 Patient Characteristics" %in% sheets) {
    cat("\n--- S4 Patient Characteristics ---\n")
    s4 <- read_excel(supp_file, sheet = "S4 Patient Characteristics", n_max = 5)
    cat("Columns:\n")
    print(names(s4))
  }

  # Check S5 for cluster assignments
  if ("S5 ICL Cluster Characteristics" %in% sheets) {
    cat("\n--- S5 ICL Cluster Characteristics ---\n")
    s5 <- read_excel(supp_file, sheet = "S5 ICL Cluster Characteristics", n_max = 5)
    cat("Columns:\n")
    print(names(s5))
  }

  # Check S6 for genomic data
  if ("S6 Genomic dataset" %in% sheets) {
    cat("\n--- S6 Genomic Dataset ---\n")
    s6 <- read_excel(supp_file, sheet = "S6 Genomic dataset", n_max = 5)
    cat("Columns (first 20):\n")
    print(names(s6)[1:min(20, length(names(s6)))])
  }
} else {
  cat("File not found\n")
}

#------------------------------------------------------------------------------
# 2. CHECK GAMBL DATA FOR REMODL-B SAMPLES
#------------------------------------------------------------------------------
cat("\n=== 2. GAMBL - Looking for REMoDL-B samples ===\n")

gambl <- read.csv("Dreval_GAMBL/data/processed/gambl_clinical_merged.csv")
cat("Total GAMBL samples: ", nrow(gambl), "\n")
cat("Sample ID patterns:\n")
print(head(gambl$SAMPLE_ID, 10))

# Check for REMoDL-B or Sha samples
remodlb_samples <- gambl %>% filter(grepl("REMODL|Sha|RMDB", SAMPLE_ID, ignore.case = TRUE))
cat("\nREMoDL-B samples found: ", nrow(remodlb_samples), "\n")

#------------------------------------------------------------------------------
# 3. THE CORE PROBLEM: MHG IS EXPRESSION-BASED
#------------------------------------------------------------------------------
cat("\n=== 3. The Core Problem ===\n")
cat("
MHG (Molecular High-Grade) is defined by GENE EXPRESSION, not mutations.

It was originally defined by Ennishi et al. 2019 (JCO) using:
- Expression profiling to identify a 'centroblast-like' signature
- DHITsig (Double-Hit signature) genes
- Cases with MYC+BCL2 or MYC+BCL6 rearrangements

KEY POINT: MHG cases can have VARIOUS mutation patterns:
- Some have GCB-like mutations (BCL2, EZH2)
- Some have ABC-like mutations (MYD88, CD79B)
- What unifies them is the HIGH-GRADE expression phenotype

The pathway mutations (GNA13, S1PR2, etc.) are primarily GCB-associated.
MHG cases are a MIX of COO backgrounds, so pathway mutation rates
may be intermediate between pure GCB and pure ABC.
\n")

#------------------------------------------------------------------------------
# 4. BEST AVAILABLE DATA: LACY GENOMIC + EXPRESSION LINK
#------------------------------------------------------------------------------
cat("=== 4. Attempting Better Data Link ===\n")

# Load full genomic data from Lacy
lacy_genomic <- read.csv("Lacy_HMRN/genomic_data.csv")

# Load expression-derived scores with MHG labels
lacy_tegress <- read.csv("Lacy_HMRN/results/tegress_scores.csv")

cat("Genomic samples: ", nrow(lacy_genomic), "\n")
cat("Expression samples with MHG labels: ", nrow(lacy_tegress), "\n")

# The genomic data has cell_of_origin but not MHG classification
# However, we know MHG ~ high tEgress

# Let's check the "Missing" COO category in genomic data
# These 403 samples might include MHG cases
lacy_genetic <- read.csv("Lacy_HMRN/data/genetic_egress_scores.csv")

missing_coo <- lacy_genetic %>% filter(cell_of_origin == "Missing")
cat("\n'Missing' COO samples in genomic data: ", nrow(missing_coo), "\n")

# What are their pathway mutation rates?
cat("\nPathway mutations in 'Missing' COO (possibly MHG-enriched):\n")
pathway_genes <- c("GNA13", "RHOA", "P2RY8", "CXCR4")
for (gene in pathway_genes) {
  if (gene %in% names(missing_coo)) {
    rate <- round(mean(missing_coo[[gene]], na.rm = TRUE) * 100, 1)
    cat("  ", gene, ": ", rate, "%\n")
  }
}

# Compare to ABC and GCB
cat("\nFor comparison:\n")
for (coo in c("ABC", "GCB")) {
  coo_data <- lacy_genetic %>% filter(cell_of_origin == coo)
  cat("\n", coo, " (n=", nrow(coo_data), "):\n")
  for (gene in pathway_genes) {
    if (gene %in% names(coo_data)) {
      rate <- round(mean(coo_data[[gene]], na.rm = TRUE) * 100, 1)
      cat("  ", gene, ": ", rate, "%\n")
    }
  }
}

#------------------------------------------------------------------------------
# 5. PROXY ANALYSIS: High tEgress samples
#------------------------------------------------------------------------------
cat("\n=== 5. High tEgress as Proxy for 'Egress Active' ===\n")

# In MHG, 70.6% have tEgress > 0
# In GCB, only 31.5% have tEgress > 0

# This suggests MHG has an EGRESS PHENOTYPE at the transcriptomic level
# even if we cannot confirm genomic pathway mutations

cat("
Summary:
- We cannot directly measure pathway MUTATIONS in MHG samples
- But MHG has HIGH transcriptomic egress (mean tEgress = +0.54)
- 70.6% of MHG cases have tEgress > 0 (vs 31.5% in GCB)

This suggests MHG cases have an 'egress-active' PHENOTYPE
The mechanism could be:
1. Pathway gene mutations (like GCB)
2. MYC-driven transcriptional activation of egress
3. Epigenetic downregulation of retention genes
4. Other mechanisms

The PHENOTYPE matters for prognosis regardless of mechanism.
")
