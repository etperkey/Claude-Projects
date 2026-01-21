library(survival)
library(dplyr)

cat("=============================================================================\n")
cat("Genes Predictive of OS by Cluster - Lacy/HMRN\n")
cat("=============================================================================\n\n")

# Load data
genomic <- read.csv("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/genomic_data.csv")
clinical <- read.csv("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/data/genetic_egress_scores.csv")

# Merge
data <- merge(genomic, clinical[, c("PID", "cluster_ICL", "cell_of_origin", "OS_time", "OS_status")], by = "PID")
data$OS_MONTHS <- data$OS_time / 30.44
data$OS_EVENT <- data$OS_status

cat("Total patients with genomic + survival:", nrow(data), "\n\n")

# Get gene columns (exclude metadata)
gene_cols <- setdiff(names(genomic), "PID")
cat("Total genes tested:", length(gene_cols), "\n\n")

# Function to test genes in a subset
test_genes_in_subset <- function(subset_data, subset_name, min_mut = 5) {
  results <- data.frame()

  for (gene in gene_cols) {
    n_mut <- sum(subset_data[[gene]], na.rm = TRUE)
    n_wt <- sum(subset_data[[gene]] == 0, na.rm = TRUE)

    if (n_mut >= min_mut && n_wt >= min_mut) {
      tryCatch({
        cox <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ subset_data[[gene]], data = subset_data)
        hr <- exp(coef(cox))
        ci <- exp(confint(cox))
        p <- summary(cox)$coefficients[, "Pr(>|z|)"]

        results <- rbind(results, data.frame(
          Subset = subset_name,
          Gene = gene,
          N = nrow(subset_data),
          N_mut = n_mut,
          Pct = round(100 * n_mut / nrow(subset_data), 1),
          HR = round(hr, 3),
          CI_lower = round(ci[1], 3),
          CI_upper = round(ci[2], 3),
          P_value = p,
          Direction = ifelse(hr > 1, "Harmful", "Protective")
        ))
      }, error = function(e) {})
    }
  }

  return(results)
}

all_results <- data.frame()

# Global
cat("Testing GLOBAL...\n")
res <- test_genes_in_subset(data, "GLOBAL")
all_results <- rbind(all_results, res)

# By cluster
for (cluster in c("BCL2", "SGK1", "MYD88", "NEC")) {
  cat("Testing", cluster, "cluster...\n")
  subset <- data[data$cluster_ICL == cluster, ]
  res <- test_genes_in_subset(subset, cluster)
  all_results <- rbind(all_results, res)
}

# Sort by p-value within each subset
all_results <- all_results %>%
  arrange(Subset, P_value)

# Add FDR correction within each subset
all_results <- all_results %>%
  group_by(Subset) %>%
  mutate(FDR = p.adjust(P_value, method = "BH")) %>%
  ungroup()

# Show top genes by subset
cat("\n\n=============================================================================\n")
cat("TOP SIGNIFICANT GENES BY CLUSTER (p < 0.05)\n")
cat("=============================================================================\n\n")

for (subset in c("GLOBAL", "BCL2", "SGK1", "MYD88", "NEC")) {
  sig <- all_results %>%
    filter(Subset == subset & P_value < 0.05) %>%
    arrange(P_value) %>%
    head(15)

  if (nrow(sig) > 0) {
    cat(sprintf("\n--- %s (n=%d) ---\n", subset, sig$N[1]))
    print(as.data.frame(sig[, c("Gene", "N_mut", "Pct", "HR", "P_value", "FDR", "Direction")]), row.names = FALSE)
  } else {
    cat(sprintf("\n--- %s ---\n", subset))
    cat("  No genes with p < 0.05\n")
  }
}

# Save full results
write.csv(all_results,
          "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/results/genes_os_by_cluster.csv",
          row.names = FALSE)

cat("\n\nFull results saved to: Lacy_HMRN/results/genes_os_by_cluster.csv\n")

# Summary of FDR-significant genes
cat("\n\n=============================================================================\n")
cat("FDR-SIGNIFICANT GENES (FDR < 0.1)\n")
cat("=============================================================================\n\n")

fdr_sig <- all_results %>%
  filter(FDR < 0.1) %>%
  arrange(Subset, FDR)

if (nrow(fdr_sig) > 0) {
  print(as.data.frame(fdr_sig[, c("Subset", "Gene", "N_mut", "HR", "P_value", "FDR", "Direction")]), row.names = FALSE)
} else {
  cat("No genes reach FDR < 0.1\n")
}
