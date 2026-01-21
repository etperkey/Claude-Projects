# Transcriptomic Egress Analysis
# Eric Perkey - January 2026

library(survival)
library(dplyr)
library(tidyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=== TRANSCRIPTOMIC EGRESS ANALYSIS ===\n\n")

#------------------------------------------------------------------------------
# 1. LOAD DATA
#------------------------------------------------------------------------------
# Lacy tEgress (full expression cohort)
lacy_tegress <- read.csv("Lacy_HMRN/results/tegress_scores.csv", stringsAsFactors = FALSE)
cat("Lacy tEgress samples: ", nrow(lacy_tegress), "\n")

# REMoDL-B tEgress
remodlb <- read.csv("Sha_REMoDL-B/data/processed/tEgress_clinical.csv", stringsAsFactors = FALSE)
cat("REMoDL-B samples: ", nrow(remodlb), "\n")

#------------------------------------------------------------------------------
# 2. LACY: tEGRESS SURVIVAL ANALYSIS
#------------------------------------------------------------------------------
cat("\n=== LACY tEGRESS SURVIVAL ANALYSIS ===\n")

# Check columns
cat("Columns: ", paste(names(lacy_tegress)[1:10], collapse = ", "), "...\n")

# Filter to samples with survival
lacy_surv <- lacy_tegress %>%
  filter(!is.na(OS_status) & !is.na(OS_time) & !is.na(tEgress))
cat("Samples with survival: ", nrow(lacy_surv), "\n")

# COO distribution
cat("\nCOO distribution:\n")
print(table(lacy_surv$COO, useNA = "ifany"))

# tEgress by COO
cat("\ntEgress by COO:\n")
tegress_by_coo <- lacy_surv %>%
  group_by(COO) %>%
  summarise(
    n = n(),
    mean_tEgress = mean(tEgress, na.rm = TRUE),
    sd_tEgress = sd(tEgress, na.rm = TRUE),
    events = sum(OS_status, na.rm = TRUE),
    .groups = "drop"
  )
print(tegress_by_coo)

# ANOVA for tEgress by COO
anova_result <- aov(tEgress ~ COO, data = lacy_surv)
cat("\nANOVA p-value: ", summary(anova_result)[[1]][1, 5], "\n")

# Overall tEgress survival
cat("\n--- Overall tEgress Survival ---\n")
lacy_surv$tEgress_group <- ifelse(lacy_surv$tEgress > median(lacy_surv$tEgress, na.rm = TRUE), "High", "Low")
fit_overall <- survfit(Surv(OS_time/365.25, OS_status) ~ tEgress_group, data = lacy_surv)
print(summary(fit_overall)$table)

cox_overall <- coxph(Surv(OS_time, OS_status) ~ tEgress, data = lacy_surv)
cat("\nContinuous tEgress Cox HR per unit increase: ", round(exp(coef(cox_overall)), 3),
    ", p = ", format(summary(cox_overall)$coefficients[5], digits = 3), "\n")

# By COO subtype
cat("\n--- tEgress Survival by COO ---\n")
for (coo in c("GCB", "ABC", "UNC", "MHG")) {
  coo_data <- lacy_surv %>% filter(COO == coo)
  if (nrow(coo_data) >= 30) {
    cox <- tryCatch({
      coxph(Surv(OS_time, OS_status) ~ tEgress, data = coo_data)
    }, error = function(e) NULL)

    if (!is.null(cox)) {
      hr <- exp(coef(cox))
      ci <- exp(confint(cox))
      pval <- summary(cox)$coefficients[5]
      cat(coo, ": n =", nrow(coo_data), ", HR =", round(hr, 3),
          " (", round(ci[1], 3), "-", round(ci[2], 3), "), p =", format(pval, digits = 3), "\n")
    }
  }
}

#------------------------------------------------------------------------------
# 3. REMODLB: tEGRESS SURVIVAL ANALYSIS
#------------------------------------------------------------------------------
cat("\n=== REMODL-B tEGRESS ANALYSIS ===\n")

# Check columns
cat("Columns: ", paste(names(remodlb), collapse = ", "), "\n")

# Filter and prepare data
remodlb_analysis <- remodlb %>%
  filter(!is.na(tEgress))
cat("Samples with tEgress: ", nrow(remodlb_analysis), "\n")

# COO distribution
cat("\nMolecular subtype distribution:\n")
print(table(remodlb_analysis$molecular_subtype, useNA = "ifany"))

# tEgress by subtype
cat("\ntEgress by molecular subtype:\n")
tegress_by_subtype <- remodlb_analysis %>%
  group_by(molecular_subtype) %>%
  summarise(
    n = n(),
    mean_tEgress = mean(tEgress, na.rm = TRUE),
    sd_tEgress = sd(tEgress, na.rm = TRUE),
    .groups = "drop"
  )
print(tegress_by_subtype)

# ANOVA
anova_result2 <- aov(tEgress ~ molecular_subtype, data = remodlb_analysis)
cat("\nANOVA p-value: ", summary(anova_result2)[[1]][1, 5], "\n")

#------------------------------------------------------------------------------
# 4. MORTALITY SIGNATURE GENES
#------------------------------------------------------------------------------
cat("\n=== MORTALITY SIGNATURE ANALYSIS ===\n")

# Load mortality signatures
mort_global <- read.csv("Lacy_HMRN/results/mortality_signature_global.csv", stringsAsFactors = FALSE)
mort_gcb <- read.csv("Lacy_HMRN/results/mortality_signature_gcb.csv", stringsAsFactors = FALSE)
mort_abc <- read.csv("Lacy_HMRN/results/mortality_signature_abc.csv", stringsAsFactors = FALSE)

cat("\n--- Top 20 Global Mortality Genes ---\n")
print(mort_global %>% select(Probe, Gene_Symbol, Log2FC, P_value, Direction) %>% head(20))

cat("\n--- Top 20 GCB Mortality Genes ---\n")
print(mort_gcb %>% select(Probe, Gene_Symbol, Log2FC, P_value, Direction) %>% head(20))

cat("\n--- Top 20 ABC Mortality Genes ---\n")
print(mort_abc %>% select(Probe, Gene_Symbol, Log2FC, P_value, Direction) %>% head(20))

#------------------------------------------------------------------------------
# 5. PATHWAY GENES IN MORTALITY SIGNATURES
#------------------------------------------------------------------------------
cat("\n=== PATHWAY GENES IN MORTALITY SIGNATURES ===\n")

pathway_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA", "CXCR4", "GNAI2", "RAC2", "ARHGAP25", "SGK1", "FOXO1")

# Check pathway genes in mortality signatures
cat("\nPathway genes in mortality signatures:\n")

# Load pathway mortality results
pathway_mort <- read.csv("Lacy_HMRN/results/pathway_genes_mortality.csv", stringsAsFactors = FALSE)
cat("\nPathway gene mortality associations:\n")
print(pathway_mort %>% filter(FDR < 0.1))

#------------------------------------------------------------------------------
# 6. CLUSTER ANALYSIS
#------------------------------------------------------------------------------
cat("\n=== CLUSTER ANALYSIS (Lacy Subtypes) ===\n")

# Load genetic egress scores which should have cluster info
lacy_genetic <- read.csv("Lacy_HMRN/data/genetic_egress_scores.csv", stringsAsFactors = FALSE)
cat("Lacy genetic samples: ", nrow(lacy_genetic), "\n")

# Check columns
cat("Columns: ", paste(names(lacy_genetic)[1:15], collapse = ", "), "...\n")

# Check for cluster column
if ("cluster_ICL" %in% names(lacy_genetic)) {
  cat("\nCluster distribution:\n")
  print(table(lacy_genetic$cluster_ICL, useNA = "ifany"))

  # Mutation rates by cluster
  cat("\nGNA13 mutation rate by cluster:\n")
  if ("GNA13" %in% names(lacy_genetic)) {
    gna13_by_cluster <- lacy_genetic %>%
      group_by(cluster_ICL) %>%
      summarise(
        n = n(),
        gna13_rate = round(mean(GNA13, na.rm = TRUE) * 100, 1),
        .groups = "drop"
      ) %>%
      arrange(desc(gna13_rate))
    print(gna13_by_cluster)
  }
}

#------------------------------------------------------------------------------
# 7. SAVE SUMMARY
#------------------------------------------------------------------------------
cat("\n=== ANALYSIS COMPLETE ===\n")

# Create summary data frame
summary_results <- data.frame(
  Analysis = c(
    "Lacy tEgress Overall",
    "Lacy tEgress in GCB",
    "Lacy tEgress in ABC",
    "REMoDL-B mean tEgress GCB",
    "REMoDL-B mean tEgress ABC"
  ),
  Value = c(
    round(exp(coef(cox_overall)), 3),
    NA, NA,
    tegress_by_subtype$mean_tEgress[tegress_by_subtype$molecular_subtype == "GCB"],
    tegress_by_subtype$mean_tEgress[tegress_by_subtype$molecular_subtype == "ABC"]
  ),
  stringsAsFactors = FALSE
)

write.csv(summary_results, "global_scripts/transcriptomic_summary.csv", row.names = FALSE)
cat("Saved: transcriptomic_summary.csv\n")
