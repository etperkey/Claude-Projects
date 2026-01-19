# MHG Explanation - What is the MHG cluster?
library(dplyr)
setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=== UNDERSTANDING MHG IN LACY/HMRN DATA ===\n\n")

# Load data
lacy_genetic <- read.csv("Lacy_HMRN/data/genetic_egress_scores.csv")
lacy_tegress <- read.csv("Lacy_HMRN/results/tegress_scores.csv")

cat("=== 1. COO/Subtype Classification in Expression Data ===\n")
cat("(Based on gene expression profiling - Lymph2Cx or similar)\n\n")
print(table(lacy_tegress$COO, useNA = "ifany"))

cat("\n=== 2. Genetic Clusters (ICL = Iterative Cluster Learning) ===\n")
cat("(Based on mutation patterns from 293-gene panel)\n\n")
print(table(lacy_genetic$cluster_ICL, useNA = "ifany"))

cat("\n=== 3. Cell of Origin in Genomic Data ===\n")
print(table(lacy_genetic$cell_of_origin, useNA = "ifany"))

cat("\n=== 4. Cross-tabulation: Cluster vs Cell of Origin ===\n")
print(table(lacy_genetic$cluster_ICL, lacy_genetic$cell_of_origin, useNA = "ifany"))

cat("\n=== 5. MHG Characteristics ===\n\n")

# MHG vs other survival
cat("--- Survival by COO ---\n")
surv_by_coo <- lacy_tegress %>%
  group_by(COO) %>%
  summarise(
    n = n(),
    events = sum(OS_status, na.rm = TRUE),
    event_rate = round(mean(OS_status, na.rm = TRUE) * 100, 1),
    median_OS_years = round(median(OS_time[OS_status == 1], na.rm = TRUE) / 365.25, 2),
    mean_tEgress = round(mean(tEgress, na.rm = TRUE), 3),
    .groups = "drop"
  ) %>%
  arrange(desc(event_rate))
print(surv_by_coo)

cat("\n=== 6. What is MHG? ===\n")
cat("
MHG = Molecular High-Grade

In the Lacy/HMRN classification (and Lymph2Cx), MHG represents cases that:
- Do NOT fit cleanly into ABC or GCB categories
- Often have features of BOTH subtypes (double-hit biology)
- Associated with MYC rearrangements + BCL2/BCL6 rearrangements
- Generally have POOR prognosis (as seen in our data: 62.4% mortality)

Key points:
1. MHG is expression-based (not mutation-based)
2. It captures 'high-grade' biology regardless of cell-of-origin
3. Often overlaps with 'double-hit' or 'triple-hit' lymphomas
4. Not the same as the genetic clusters (BCL2, MYD88, SGK1, NEC)

The genetic clusters (BCL2, MYD88, SGK1, NEC) are DIFFERENT from COO:
- BCL2 cluster ~ enriched for GCB
- MYD88 cluster ~ enriched for ABC
- SGK1 cluster ~ mixed
- NEC (not elsewhere classified) ~ mixed
")

cat("\n=== 7. Comparison: MHG vs Genetic Clusters ===\n")
# If we have matched data
if ("cluster_ICL" %in% names(lacy_tegress)) {
  cat("\nMHG by genetic cluster:\n")
  print(table(lacy_tegress$COO, lacy_tegress$cluster_ICL))
}

cat("\n=== 8. MHG Mutation Patterns ===\n")
# Check mutation rates in expression-matched samples
merged <- read.csv("Lacy_HMRN/results/gcb_tegress_gegress_merged.csv")
if ("COO" %in% names(merged) && nrow(merged) > 0) {
  cat("Matched expression-genomic samples: ", nrow(merged), "\n")
  cat("(Limited due to sample overlap)\n")
}
