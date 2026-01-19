# =============================================================================
# REMoDL-B All Clusters Survival Analysis
# Testing pathway mutation effect across all genetic subtypes
# =============================================================================

cat("=============================================================\n")
cat("REMoDL-B All Clusters Survival Analysis\n")
cat("=============================================================\n\n")

library(survival)
library(dplyr)

sha_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Sha_REMoDL-B"
processed_dir <- file.path(sha_dir, "data/processed")
figures_dir <- file.path(sha_dir, "figures")

if (!dir.exists(figures_dir)) dir.create(figures_dir, recursive = TRUE)

# =============================================================================
# Load and Merge Data
# =============================================================================

pathway_data <- read.csv(file.path(processed_dir, "sha_pathway_mutations.csv"),
                          stringsAsFactors = FALSE)
clinical <- read.csv(file.path(processed_dir, "sha_pmc_clinical.csv"),
                      stringsAsFactors = FALSE)

merged_data <- merge(pathway_data, clinical,
                      by.x = "PatientID", by.y = "PID",
                      all.x = TRUE)

merged_data$OS_MONTHS <- merged_data$OS_time / 30.44
merged_data$OS_EVENT <- merged_data$OS_status

cat("Total merged patients:", nrow(merged_data), "\n\n")

cat("Cluster distribution:\n")
print(table(merged_data$cluster_ICL, useNA = "ifany"))

# =============================================================================
# Analysis Function for Each Cluster
# =============================================================================

analyze_cluster <- function(data, cluster_name, cluster_col = "cluster_ICL") {

  cat("\n", paste(rep("=", 60), collapse = ""), "\n")
  cat("CLUSTER:", cluster_name, "\n")
  cat(paste(rep("=", 60), collapse = ""), "\n\n")

  cluster_data <- data %>%
    filter(!!sym(cluster_col) == cluster_name) %>%
    filter(!is.na(OS_MONTHS) & !is.na(OS_EVENT))

  if (nrow(cluster_data) < 20) {
    cat("Insufficient patients (n =", nrow(cluster_data), "). Skipping.\n")
    return(NULL)
  }

  cat("Patients with survival data:", nrow(cluster_data), "\n")
  cat("Events (deaths):", sum(cluster_data$OS_EVENT),
      "(", round(100*sum(cluster_data$OS_EVENT)/nrow(cluster_data), 1), "%)\n")
  cat("Median follow-up:", round(median(cluster_data$OS_MONTHS), 1), "months\n\n")

  # Pathway score distribution
  cat("Pathway Score distribution:\n")
  print(table(cluster_data$Combined))

  n_mut <- sum(cluster_data$Combined > 0)
  cat("\nWith any pathway mutation:", n_mut,
      "(", round(100*n_mut/nrow(cluster_data), 1), "%)\n")

  # Individual genes
  cat("\nIndividual gene mutations:\n")
  cat("  GNA13:", sum(cluster_data$GNA13, na.rm = TRUE), "\n")
  cat("  RHOA:", sum(cluster_data$RHOA, na.rm = TRUE), "\n")
  cat("  P2RY8:", sum(cluster_data$P2RY8, na.rm = TRUE), "\n")
  cat("  CXCR4:", sum(cluster_data$CXCR4, na.rm = TRUE), "\n")

  results <- list(
    cluster = cluster_name,
    n = nrow(cluster_data),
    events = sum(cluster_data$OS_EVENT),
    n_pathway_mut = n_mut,
    pct_mut = round(100*n_mut/nrow(cluster_data), 1)
  )

  # Analysis 1: Any Pathway Mutation
  cat("\n--- Any Pathway Mutation Analysis ---\n\n")

  cluster_data$pathway_group <- ifelse(cluster_data$Combined > 0,
                                        "Pathway Mutated", "No Mutation")

  n_nomut <- sum(cluster_data$pathway_group == "No Mutation")

  if (n_mut >= 5 && n_nomut >= 5) {
    fit <- survfit(Surv(OS_MONTHS, OS_EVENT) ~ pathway_group, data = cluster_data)
    logrank <- survdiff(Surv(OS_MONTHS, OS_EVENT) ~ pathway_group, data = cluster_data)
    pval <- 1 - pchisq(logrank$chisq, df = 1)

    cat("Log-rank p-value:", format(pval, digits = 3), "\n")

    # Get median survival for each group
    summ <- summary(fit)$table
    cat("\nSurvival summary:\n")
    print(summ[, c("records", "events", "median", "0.95LCL", "0.95UCL")])

    # Direction of effect
    med_mut <- summ["pathway_group=Pathway Mutated", "median"]
    med_nomut <- summ["pathway_group=No Mutation", "median"]

    if (!is.na(med_mut) && !is.na(med_nomut)) {
      direction <- ifelse(med_mut < med_nomut, "Worse", "Better")
    } else {
      # If median not reached, compare restricted mean survival
      direction <- "Undetermined"
    }

    results$pval <- pval
    results$direction <- direction
    results$median_mut <- med_mut
    results$median_nomut <- med_nomut

    # Plot
    safe_name <- gsub("/", "_", cluster_name)
    png(file.path(figures_dir, paste0("km_", safe_name, "_pathway.png")),
        width = 800, height = 600)
    plot(fit, col = c("#2E9FDF", "#E7B800"), lwd = 3, mark.time = TRUE,
         xlab = "Time (Months)", ylab = "Overall Survival",
         main = paste0("REMoDL-B ", cluster_name, ": Pathway Mutation Effect\n",
                       "(n=", nrow(cluster_data), ", Log-rank p = ",
                       format(pval, digits = 3), ")"))
    legend("bottomleft", legend = c(
      paste0("No Mutation (n=", n_nomut, ")"),
      paste0("Pathway Mutated (n=", n_mut, ")")
    ), col = c("#2E9FDF", "#E7B800"), lwd = 3, bty = "n")
    dev.off()
    cat("\nSaved: km_", safe_name, "_pathway.png\n")

  } else {
    cat("Insufficient patients in groups (need >=5 each).\n")
    cat("  No mutation:", n_nomut, "\n")
    cat("  Pathway mutated:", n_mut, "\n")
    results$pval <- NA
    results$direction <- NA
  }

  # Cox regression if enough patients
  if (n_mut >= 5) {
    cat("\n--- Cox Regression ---\n\n")
    cox <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ Combined, data = cluster_data)
    hr <- exp(coef(cox))
    hr_ci <- exp(confint(cox))
    pval_cox <- summary(cox)$coefficients[, "Pr(>|z|)"]

    cat("HR per 1-unit score increase:", round(hr, 2),
        "(95% CI:", round(hr_ci[1], 2), "-", round(hr_ci[2], 2), ")\n")
    cat("Wald p-value:", format(pval_cox, digits = 3), "\n")

    results$hr <- hr
    results$hr_lower <- hr_ci[1]
    results$hr_upper <- hr_ci[2]
    results$pval_cox <- pval_cox
  }

  return(results)
}

# =============================================================================
# Run Analysis for All Clusters
# =============================================================================

clusters <- c("BCL2", "MYD88", "SGK1", "NEC")

all_results <- list()

for (cluster in clusters) {
  result <- analyze_cluster(merged_data, cluster)
  if (!is.null(result)) {
    all_results[[cluster]] <- result
  }
}

# =============================================================================
# Summary Table
# =============================================================================

cat("\n", paste(rep("=", 70), collapse = ""), "\n")
cat("SUMMARY: PATHWAY MUTATIONS ACROSS ALL REMoDL-B CLUSTERS\n")
cat(paste(rep("=", 70), collapse = ""), "\n\n")

summary_df <- data.frame(
  Cluster = character(),
  N = integer(),
  Events = integer(),
  N_mut = integer(),
  Pct_mut = numeric(),
  P_value = numeric(),
  Direction = character(),
  HR = numeric(),
  stringsAsFactors = FALSE
)

for (cluster in names(all_results)) {
  r <- all_results[[cluster]]
  summary_df <- rbind(summary_df, data.frame(
    Cluster = r$cluster,
    N = r$n,
    Events = r$events,
    N_mut = r$n_pathway_mut,
    Pct_mut = r$pct_mut,
    P_value = ifelse(is.null(r$pval), NA, r$pval),
    Direction = ifelse(is.null(r$direction), NA, r$direction),
    HR = ifelse(is.null(r$hr), NA, r$hr),
    stringsAsFactors = FALSE
  ))
}

print(summary_df)

# Save summary
write.csv(summary_df, file.path(processed_dir, "remodlb_cluster_survival_summary.csv"),
          row.names = FALSE)
cat("\nSaved summary to: remodlb_cluster_survival_summary.csv\n")

# =============================================================================
# Interpretation
# =============================================================================

cat("\n", paste(rep("=", 70), collapse = ""), "\n")
cat("INTERPRETATION\n")
cat(paste(rep("=", 70), collapse = ""), "\n\n")

sig_clusters <- summary_df$Cluster[!is.na(summary_df$P_value) & summary_df$P_value < 0.05]
trend_clusters <- summary_df$Cluster[!is.na(summary_df$P_value) &
                                      summary_df$P_value >= 0.05 &
                                      summary_df$P_value < 0.1]

if (length(sig_clusters) > 0) {
  cat("SIGNIFICANT associations (p < 0.05):\n")
  for (cl in sig_clusters) {
    r <- all_results[[cl]]
    cat("  -", cl, ": p =", format(r$pval, digits = 3),
        "| Direction:", r$direction, "\n")
  }
} else {
  cat("No clusters showed significant association (p < 0.05)\n")
}

if (length(trend_clusters) > 0) {
  cat("\nTRENDS (0.05 <= p < 0.10):\n")
  for (cl in trend_clusters) {
    r <- all_results[[cl]]
    cat("  -", cl, ": p =", format(r$pval, digits = 3),
        "| Direction:", r$direction, "\n")
  }
}

cat("\nDirection summary:\n")
worse_clusters <- summary_df$Cluster[!is.na(summary_df$Direction) &
                                      summary_df$Direction == "Worse"]
better_clusters <- summary_df$Cluster[!is.na(summary_df$Direction) &
                                       summary_df$Direction == "Better"]

cat("  Worse survival with mutations:", paste(worse_clusters, collapse = ", "), "\n")
cat("  Better survival with mutations:", paste(better_clusters, collapse = ", "), "\n")

cat("\nConsistent with Chapuy (pathway mut = worse in EZB/BCL2):",
    ifelse("BCL2" %in% worse_clusters, "YES", "NO"), "\n")

cat("\nFigures saved to:", figures_dir, "\n")
