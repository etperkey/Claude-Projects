# Chapuy DLBCL Data Integration Pipeline
# Focus: 135 patients with WES + CNA + Clinical data
# Output: Integrated dataset + Pipeline figure

library(dplyr)
library(tidyr)

chapuy_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Chapuy_Broad"

cat("=============================================================\n")
cat("Chapuy DLBCL Data Integration Pipeline\n")
cat("=============================================================\n\n")

# ============================================================
# STEP 1: Load Clinical Data
# ============================================================
cat("=== STEP 1: Loading Clinical Data ===\n")

# Patient-level clinical data
clinical_patient <- read.delim(
  file.path(chapuy_dir, "data/raw/data_clinical_patient.txt"),
  comment.char = "#", stringsAsFactors = FALSE
)
cat(sprintf("  Patients loaded: %d\n", nrow(clinical_patient)))

# Sample-level clinical data (includes cluster assignments)
clinical_sample <- read.delim(
  file.path(chapuy_dir, "data/raw/data_clinical_sample.txt"),
  comment.char = "#", stringsAsFactors = FALSE
)
cat(sprintf("  Samples loaded: %d\n", nrow(clinical_sample)))

# Merge patient and sample data
clinical <- merge(clinical_patient, clinical_sample, by = "PATIENT_ID", all = TRUE)
cat(sprintf("  Merged clinical records: %d\n", nrow(clinical)))

# Display available clinical variables
cat("\n  Clinical variables available:\n")
cat("  Demographics: AGE_AT_DIAGNOSIS, SEX, COHORT\n")
cat("  IPI: IPI, IPI_AGE, IPI_LDH, IPI_ECOG, IPI_STAGE, IPI_EXBM\n")
cat("  Survival: OS_MONTHS, OS_STATUS, PFS_MONTHS, PFS_STATUS\n")
cat("  Molecular: CLUSTER, COO_GEP, COO_LYMPH2CX, ANY_COO\n")
cat("  Genomic: TOTAL_CNA, MUTATION_DENSITY, TMB_NONSYNONYMOUS\n")

# ============================================================
# STEP 2: Load WES Mutation Data
# ============================================================
cat("\n=== STEP 2: Loading WES Mutation Data ===\n")

mutations <- read.delim(
  file.path(chapuy_dir, "data/raw/data_mutations.txt"),
  comment.char = "#", stringsAsFactors = FALSE
)
cat(sprintf("  Total mutations: %d\n", nrow(mutations)))

# Get unique samples with WES
wes_samples <- unique(mutations$Tumor_Sample_Barcode)
cat(sprintf("  Samples with WES: %d\n", length(wes_samples)))

# Summarize mutations per sample
mutation_summary <- mutations %>%
  group_by(Tumor_Sample_Barcode) %>%
  summarise(
    n_mutations = n(),
    n_genes_mutated = n_distinct(Hugo_Symbol),
    .groups = "drop"
  )
cat(sprintf("  Median mutations/sample: %.0f\n", median(mutation_summary$n_mutations)))

# Display mutation types
cat("\n  Variant classifications:\n")
print(table(mutations$Variant_Classification))

# ============================================================
# STEP 3: Verify CNA Data Availability
# ============================================================
cat("\n=== STEP 3: Verifying CNA Data ===\n")

# CNA data is embedded in clinical_sample via TOTAL_CNA column
cna_available <- sum(!is.na(clinical$TOTAL_CNA) & clinical$TOTAL_CNA > 0)
cat(sprintf("  Samples with CNA data: %d\n", cna_available))
cat(sprintf("  CNA range: %d - %d events\n",
            min(clinical$TOTAL_CNA, na.rm = TRUE),
            max(clinical$TOTAL_CNA, na.rm = TRUE)))

# ============================================================
# STEP 4: Identify Complete Cases (WES + CNA + Clinical)
# ============================================================
cat("\n=== STEP 4: Identifying Complete Cases ===\n")

# Match WES samples to clinical data
clinical$has_wes <- clinical$PATIENT_ID %in% wes_samples |
                    clinical$SAMPLE_ID %in% wes_samples

# Check for complete data
clinical$has_cna <- !is.na(clinical$TOTAL_CNA)
clinical$has_survival <- !is.na(clinical$OS_MONTHS) & !is.na(clinical$OS_STATUS)
clinical$has_cluster <- !is.na(clinical$CLUSTER)

complete_cases <- clinical %>%
  filter(has_wes & has_cna & has_survival & has_cluster)

cat(sprintf("  With WES: %d\n", sum(clinical$has_wes)))
cat(sprintf("  With CNA: %d\n", sum(clinical$has_cna)))
cat(sprintf("  With Survival: %d\n", sum(clinical$has_survival)))
cat(sprintf("  With Cluster: %d\n", sum(clinical$has_cluster)))
cat(sprintf("  COMPLETE CASES: %d\n", nrow(complete_cases)))

# ============================================================
# STEP 5: Build Integrated Dataset
# ============================================================
cat("\n=== STEP 5: Building Integrated Dataset ===\n")

# Select key variables for analysis
integrated <- complete_cases %>%
  select(
    # IDs
    PATIENT_ID, SAMPLE_ID, COHORT,
    # Demographics
    AGE_AT_DIAGNOSIS, SEX,
    # IPI
    IPI, IPI_AGE, IPI_LDH, IPI_ECOG, IPI_STAGE, IPI_EXBM,
    # Survival
    OS_MONTHS, OS_STATUS, PFS_MONTHS, PFS_STATUS,
    # Molecular classification
    CLUSTER, COO_GEP, COO_LYMPH2CX, ANY_COO,
    # Genomic features
    TOTAL_CNA, TOTAL_REARRANGEMENT, MUTATION_DENSITY,
    NUM_NONSILENT_MUTATION, TMB_NONSYNONYMOUS,
    PURITY_ABSOLUTE, PLOIDY_ABSOLUTE,
    # Treatment
    R_CHOP_LIKE_CHEMO
  )

# Convert survival status to numeric
integrated$OS_Event <- as.numeric(integrated$OS_STATUS == "1:DECEASED")
integrated$PFS_Event <- as.numeric(integrated$PFS_STATUS == "1:Progressed")

cat(sprintf("  Final integrated dataset: %d patients x %d variables\n",
            nrow(integrated), ncol(integrated)))

# ============================================================
# STEP 6: Cohort Summary
# ============================================================
cat("\n=== STEP 6: Cohort Summary ===\n")

cat("\n  By Cohort:\n")
print(table(integrated$COHORT))

cat("\n  By Cluster:\n")
print(table(integrated$CLUSTER))

cat("\n  By Cell of Origin (COO):\n")
print(table(integrated$ANY_COO, useNA = "ifany"))

cat("\n  Survival Events:\n")
cat(sprintf("    OS events: %d/%d (%.1f%%)\n",
            sum(integrated$OS_Event), nrow(integrated),
            sum(integrated$OS_Event)/nrow(integrated)*100))
cat(sprintf("    PFS events: %d/%d (%.1f%%)\n",
            sum(integrated$PFS_Event, na.rm = TRUE),
            sum(!is.na(integrated$PFS_Event)),
            sum(integrated$PFS_Event, na.rm = TRUE)/sum(!is.na(integrated$PFS_Event))*100))

cat("\n  Median follow-up (OS): %.1f months\n", median(integrated$OS_MONTHS))

# ============================================================
# STEP 7: Save Integrated Dataset
# ============================================================
cat("\n=== STEP 7: Saving Integrated Dataset ===\n")

output_file <- file.path(chapuy_dir, "data/processed/chapuy_integrated_135.csv")
write.csv(integrated, output_file, row.names = FALSE)
cat(sprintf("  Saved: %s\n", output_file))

# Also save mutation data for complete cases only
complete_mutations <- mutations %>%
  filter(Tumor_Sample_Barcode %in% integrated$PATIENT_ID |
         Tumor_Sample_Barcode %in% integrated$SAMPLE_ID)
cat(sprintf("  Mutations in complete cases: %d\n", nrow(complete_mutations)))

mut_output <- file.path(chapuy_dir, "data/processed/chapuy_mutations_135.csv")
write.csv(complete_mutations, mut_output, row.names = FALSE)
cat(sprintf("  Saved: %s\n", mut_output))

# ============================================================
# STEP 8: Generate Pipeline Figure
# ============================================================
cat("\n=== STEP 8: Generating Pipeline Figure ===\n")

pdf_file <- file.path(chapuy_dir, "figures/data_integration_pipeline.pdf")
pdf(pdf_file, width = 11, height = 8.5)

par(mar = c(1, 1, 2, 1))
plot.new()
plot.window(xlim = c(0, 10), ylim = c(0, 8))

# Title
text(5, 7.7, "Chapuy DLBCL Data Integration Pipeline", cex = 1.6, font = 2)
text(5, 7.3, sprintf("Final Cohort: n = %d patients", nrow(integrated)), cex = 1.1, col = "#2980B9")

# === TOP ROW: Raw Data Sources ===
# Clinical Patient
rect(0.3, 5.5, 2.2, 6.7, col = "#E8DAEF", border = "#8E44AD", lwd = 2)
text(1.25, 6.4, "Clinical", cex = 0.9, font = 2, col = "#8E44AD")
text(1.25, 6.1, "Patient Data", cex = 0.8)
text(1.25, 5.75, sprintf("n = %d", nrow(clinical_patient)), cex = 0.75, col = "gray40")

# Clinical Sample
rect(2.7, 5.5, 4.6, 6.7, col = "#D5F5E3", border = "#27AE60", lwd = 2)
text(3.65, 6.4, "Clinical", cex = 0.9, font = 2, col = "#27AE60")
text(3.65, 6.1, "Sample Data", cex = 0.8)
text(3.65, 5.75, sprintf("n = %d", nrow(clinical_sample)), cex = 0.75, col = "gray40")

# WES Mutations
rect(5.4, 5.5, 7.3, 6.7, col = "#FADBD8", border = "#E74C3C", lwd = 2)
text(6.35, 6.4, "WES", cex = 0.9, font = 2, col = "#E74C3C")
text(6.35, 6.1, "Mutations", cex = 0.8)
text(6.35, 5.75, sprintf("n = %d samples", length(wes_samples)), cex = 0.75, col = "gray40")

# CNA Data
rect(7.8, 5.5, 9.7, 6.7, col = "#EBF5FB", border = "#3498DB", lwd = 2)
text(8.75, 6.4, "CNA", cex = 0.9, font = 2, col = "#3498DB")
text(8.75, 6.1, "GISTIC", cex = 0.8)
text(8.75, 5.75, sprintf("n = %d samples", cna_available), cex = 0.75, col = "gray40")

# === ARROWS DOWN ===
arrows(1.25, 5.4, 1.25, 4.8, length = 0.1, lwd = 2, col = "gray50")
arrows(3.65, 5.4, 3.65, 4.8, length = 0.1, lwd = 2, col = "gray50")
arrows(6.35, 5.4, 6.35, 4.8, length = 0.1, lwd = 2, col = "gray50")
arrows(8.75, 5.4, 8.75, 4.8, length = 0.1, lwd = 2, col = "gray50")

# === MIDDLE ROW: Processing Steps ===
# Merge Clinical
rect(1.0, 4.0, 3.9, 4.8, col = "#F5EEF8", border = "#9B59B6", lwd = 1.5)
text(2.45, 4.55, "Merge Patient + Sample", cex = 0.8, font = 2)
text(2.45, 4.2, "by PATIENT_ID", cex = 0.7)

# Link WES
rect(5.0, 4.0, 7.7, 4.8, col = "#FDEDEC", border = "#E74C3C", lwd = 1.5)
text(6.35, 4.55, "Link WES to Clinical", cex = 0.8, font = 2)
text(6.35, 4.2, "by Sample Barcode", cex = 0.7)

# Verify CNA
rect(7.9, 4.0, 9.6, 4.8, col = "#EBF5FB", border = "#3498DB", lwd = 1.5)
text(8.75, 4.55, "Verify CNA", cex = 0.8, font = 2)
text(8.75, 4.2, "Coverage", cex = 0.7)

# === ARROWS TO CENTER ===
arrows(2.45, 3.9, 4.5, 3.2, length = 0.1, lwd = 2, col = "gray50")
arrows(6.35, 3.9, 5.5, 3.2, length = 0.1, lwd = 2, col = "gray50")
arrows(8.75, 3.9, 6.0, 3.2, length = 0.1, lwd = 2, col = "gray50")

# === CENTER: Integration ===
rect(3.5, 2.4, 6.5, 3.3, col = "#FCF3CF", border = "#F1C40F", lwd = 3)
text(5, 3.0, "INTEGRATE", cex = 1.0, font = 2, col = "#B7950B")
text(5, 2.65, "WES + CNA + Clinical", cex = 0.85)

# === ARROW DOWN ===
arrows(5, 2.3, 5, 1.8, length = 0.1, lwd = 3, col = "#F1C40F")

# === BOTTOM: Final Dataset ===
rect(2.5, 0.6, 7.5, 1.7, col = "#27AE60", border = "#1E8449", lwd = 3)
text(5, 1.35, sprintf("FINAL INTEGRATED DATASET", nrow(integrated)),
     cex = 1.1, font = 2, col = "white")
text(5, 0.95, sprintf("n = %d patients | WES + CNA + Clinical + Survival", nrow(integrated)),
     cex = 0.9, col = "white")

# === SIDE PANEL: Data Summary ===
rect(0.2, 0.3, 2.3, 2.2, col = "#F8F9F9", border = "gray60", lwd = 1)
text(1.25, 2.0, "Data Available", cex = 0.8, font = 2)
text(1.25, 1.7, sprintf("Mutations: %s", format(nrow(complete_mutations), big.mark = ",")), cex = 0.65, adj = 0.5)
text(1.25, 1.45, sprintf("Genes: %d", n_distinct(complete_mutations$Hugo_Symbol)), cex = 0.65, adj = 0.5)
text(1.25, 1.2, "CNA events/sample", cex = 0.65, adj = 0.5)
text(1.25, 0.95, sprintf("OS events: %d", sum(integrated$OS_Event)), cex = 0.65, adj = 0.5)
text(1.25, 0.7, sprintf("PFS events: %d", sum(integrated$PFS_Event, na.rm=TRUE)), cex = 0.65, adj = 0.5)

# === SIDE PANEL: Cohorts ===
rect(7.7, 0.3, 9.8, 2.2, col = "#F8F9F9", border = "gray60", lwd = 1)
text(8.75, 2.0, "Cohorts", cex = 0.8, font = 2)
cohort_counts <- table(integrated$COHORT)
y_pos <- 1.7
for (i in seq_along(cohort_counts)) {
  text(8.75, y_pos, sprintf("%s: %d", names(cohort_counts)[i], cohort_counts[i]),
       cex = 0.65)
  y_pos <- y_pos - 0.25
}

dev.off()
cat(sprintf("  Pipeline figure saved: %s\n", pdf_file))

# ============================================================
# SUMMARY
# ============================================================
cat("\n=============================================================\n")
cat("PIPELINE COMPLETE\n")
cat("=============================================================\n")
cat(sprintf("Final dataset: %d patients with complete data\n", nrow(integrated)))
cat(sprintf("Variables: %d clinical/genomic features\n", ncol(integrated)))
cat(sprintf("Mutations: %s in complete cases\n", format(nrow(complete_mutations), big.mark = ",")))
cat("\nOutputs:\n")
cat(sprintf("  1. %s\n", output_file))
cat(sprintf("  2. %s\n", mut_output))
cat(sprintf("  3. %s\n", pdf_file))
