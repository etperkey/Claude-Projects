library(survival)
library(dplyr)

cat("=============================================================================\n")
cat("aSHM (Aberrant Somatic Hypermutation) Survival Analysis - Lacy/HMRN\n")
cat("=============================================================================\n\n")

# Load data
genomic <- read.csv("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/genomic_data.csv")
clinical <- read.csv("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/data/genetic_egress_scores.csv")

# Merge
data <- merge(genomic, clinical[, c("PID", "cluster_ICL", "cell_of_origin", "OS_time", "OS_status")], by = "PID")
data$OS_MONTHS <- data$OS_time / 30.44
data$OS_EVENT <- data$OS_status

cat("Total patients:", nrow(data), "\n\n")

# Identify aSHM columns
ashm_cols <- grep("_S$", names(genomic), value = TRUE)
cat("aSHM target genes (n=", length(ashm_cols), "):\n", sep = "")
print(ashm_cols)

# Calculate aSHM burden (number of genes with aSHM)
data$aSHM_count <- rowSums(data[, ashm_cols], na.rm = TRUE)
data$aSHM_any <- ifelse(data$aSHM_count > 0, 1, 0)
data$aSHM_high <- ifelse(data$aSHM_count >= 3, 1, 0)  # 3+ genes = high burden

cat("\n=============================================================================\n")
cat("aSHM Burden Distribution\n")
cat("=============================================================================\n\n")

cat("aSHM count distribution:\n")
print(table(data$aSHM_count))

cat("\naSHM any (>=1 gene):", sum(data$aSHM_any), "(", round(100*mean(data$aSHM_any), 1), "%)\n")
cat("aSHM high (>=3 genes):", sum(data$aSHM_high), "(", round(100*mean(data$aSHM_high), 1), "%)\n")

# aSHM by cluster
cat("\naSHM burden by cluster:\n")
cluster_summary <- data %>%
  group_by(cluster_ICL) %>%
  summarise(
    N = n(),
    aSHM_any_pct = round(100 * mean(aSHM_any), 1),
    aSHM_high_pct = round(100 * mean(aSHM_high), 1),
    Mean_count = round(mean(aSHM_count), 2)
  )
print(as.data.frame(cluster_summary))

# aSHM by COO
cat("\naSHM burden by COO:\n")
coo_summary <- data %>%
  filter(cell_of_origin %in% c("GCB", "ABC", "UNC")) %>%
  group_by(cell_of_origin) %>%
  summarise(
    N = n(),
    aSHM_any_pct = round(100 * mean(aSHM_any), 1),
    aSHM_high_pct = round(100 * mean(aSHM_high), 1),
    Mean_count = round(mean(aSHM_count), 2)
  )
print(as.data.frame(coo_summary))

cat("\n=============================================================================\n")
cat("Survival Analysis: aSHM vs Non-aSHM\n")
cat("=============================================================================\n\n")

results <- data.frame()

# Test 1: Any aSHM vs None
cat("--- Any aSHM (>=1 gene) vs None ---\n")
n_ashm <- sum(data$aSHM_any)
n_none <- sum(data$aSHM_any == 0)
cox <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ aSHM_any, data = data)
hr <- exp(coef(cox))
ci <- exp(confint(cox))
p <- summary(cox)$coefficients[, "Pr(>|z|)"]
cat("aSHM+ (n=", n_ashm, ") vs aSHM- (n=", n_none, ")\n", sep = "")
cat("HR:", round(hr, 3), "  95% CI:", round(ci[1], 3), "-", round(ci[2], 3), "  p =", round(p, 4), "\n\n")
results <- rbind(results, data.frame(Comparison = "Any_aSHM_vs_None", Subset = "GLOBAL", N_pos = n_ashm, N_neg = n_none, HR = round(hr, 3), CI_lower = round(ci[1], 3), CI_upper = round(ci[2], 3), P_value = p))

# Test 2: High aSHM (>=3) vs Low/None
cat("--- High aSHM (>=3 genes) vs Low/None ---\n")
n_high <- sum(data$aSHM_high)
n_low <- sum(data$aSHM_high == 0)
cox <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ aSHM_high, data = data)
hr <- exp(coef(cox))
ci <- exp(confint(cox))
p <- summary(cox)$coefficients[, "Pr(>|z|)"]
cat("High (n=", n_high, ") vs Low/None (n=", n_low, ")\n", sep = "")
cat("HR:", round(hr, 3), "  95% CI:", round(ci[1], 3), "-", round(ci[2], 3), "  p =", round(p, 4), "\n\n")
results <- rbind(results, data.frame(Comparison = "High_aSHM_vs_Low", Subset = "GLOBAL", N_pos = n_high, N_neg = n_low, HR = round(hr, 3), CI_lower = round(ci[1], 3), CI_upper = round(ci[2], 3), P_value = p))

# Test 3: aSHM count as continuous variable
cat("--- aSHM count (continuous) ---\n")
cox <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ aSHM_count, data = data)
hr <- exp(coef(cox))
ci <- exp(confint(cox))
p <- summary(cox)$coefficients[, "Pr(>|z|)"]
cat("HR per additional aSHM gene:", round(hr, 3), "  95% CI:", round(ci[1], 3), "-", round(ci[2], 3), "  p =", round(p, 4), "\n\n")
results <- rbind(results, data.frame(Comparison = "aSHM_count_continuous", Subset = "GLOBAL", N_pos = NA, N_neg = NA, HR = round(hr, 3), CI_lower = round(ci[1], 3), CI_upper = round(ci[2], 3), P_value = p))

cat("=============================================================================\n")
cat("Survival by aSHM Status Within Clusters\n")
cat("=============================================================================\n\n")

for (cluster in c("BCL2", "SGK1", "MYD88", "NEC")) {
  subset <- data[data$cluster_ICL == cluster, ]
  n_ashm <- sum(subset$aSHM_any)
  n_none <- sum(subset$aSHM_any == 0)

  if (n_ashm >= 10 && n_none >= 10) {
    tryCatch({
      cox <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ aSHM_any, data = subset)
      hr <- exp(coef(cox))
      ci <- exp(confint(cox))
      p <- summary(cox)$coefficients[, "Pr(>|z|)"]

      cat(cluster, "cluster: aSHM+ (n=", n_ashm, ") vs aSHM- (n=", n_none, ")\n", sep = "")
      cat("  HR:", round(hr, 3), "  95% CI:", round(ci[1], 3), "-", round(ci[2], 3), "  p =", round(p, 4), "\n")
      direction <- ifelse(hr > 1, "Harmful", "Protective")
      cat("  Direction:", direction, "\n\n")

      results <- rbind(results, data.frame(Comparison = "Any_aSHM_vs_None", Subset = cluster, N_pos = n_ashm, N_neg = n_none, HR = round(hr, 3), CI_lower = round(ci[1], 3), CI_upper = round(ci[2], 3), P_value = p))
    }, error = function(e) {
      cat(cluster, ": Error in analysis\n")
    })
  } else {
    cat(cluster, ": Insufficient cases (aSHM+ n=", n_ashm, ", aSHM- n=", n_none, ")\n\n", sep = "")
  }
}

cat("=============================================================================\n")
cat("Survival by aSHM Status Within COO\n")
cat("=============================================================================\n\n")

for (coo in c("GCB", "ABC", "UNC")) {
  subset <- data[data$cell_of_origin == coo, ]
  n_ashm <- sum(subset$aSHM_any)
  n_none <- sum(subset$aSHM_any == 0)

  if (n_ashm >= 10 && n_none >= 10) {
    tryCatch({
      cox <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ aSHM_any, data = subset)
      hr <- exp(coef(cox))
      ci <- exp(confint(cox))
      p <- summary(cox)$coefficients[, "Pr(>|z|)"]

      cat(coo, ": aSHM+ (n=", n_ashm, ") vs aSHM- (n=", n_none, ")\n", sep = "")
      cat("  HR:", round(hr, 3), "  95% CI:", round(ci[1], 3), "-", round(ci[2], 3), "  p =", round(p, 4), "\n")
      direction <- ifelse(hr > 1, "Harmful", "Protective")
      cat("  Direction:", direction, "\n\n")

      results <- rbind(results, data.frame(Comparison = "Any_aSHM_vs_None", Subset = coo, N_pos = n_ashm, N_neg = n_none, HR = round(hr, 3), CI_lower = round(ci[1], 3), CI_upper = round(ci[2], 3), P_value = p))
    }, error = function(e) {
      cat(coo, ": Error in analysis\n")
    })
  } else {
    cat(coo, ": Insufficient cases (aSHM+ n=", n_ashm, ", aSHM- n=", n_none, ")\n\n", sep = "")
  }
}

cat("=============================================================================\n")
cat("Individual aSHM Gene Survival Impact\n")
cat("=============================================================================\n\n")

gene_results <- data.frame()

for (gene in ashm_cols) {
  n_mut <- sum(data[[gene]], na.rm = TRUE)
  n_wt <- sum(data[[gene]] == 0, na.rm = TRUE)

  if (n_mut >= 10 && n_wt >= 10) {
    tryCatch({
      cox <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ data[[gene]], data = data)
      hr <- exp(coef(cox))
      ci <- exp(confint(cox))
      p <- summary(cox)$coefficients[, "Pr(>|z|)"]

      gene_results <- rbind(gene_results, data.frame(
        Gene = gene,
        N_aSHM = n_mut,
        Pct = round(100 * n_mut / nrow(data), 1),
        HR = round(hr, 3),
        CI_lower = round(ci[1], 3),
        CI_upper = round(ci[2], 3),
        P_value = p,
        Direction = ifelse(hr > 1, "Harmful", "Protective")
      ))
    }, error = function(e) {})
  }
}

gene_results <- gene_results %>% arrange(P_value)
gene_results$FDR <- p.adjust(gene_results$P_value, method = "BH")

cat("Individual aSHM genes (sorted by p-value):\n\n")
print(as.data.frame(gene_results[, c("Gene", "N_aSHM", "Pct", "HR", "P_value", "FDR", "Direction")]), row.names = FALSE)

# Save results
write.csv(results, "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/results/ashm_survival_summary.csv", row.names = FALSE)
write.csv(gene_results, "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/results/ashm_individual_genes.csv", row.names = FALSE)

cat("\n\nResults saved to:\n")
cat("  - Lacy_HMRN/results/ashm_survival_summary.csv\n")
cat("  - Lacy_HMRN/results/ashm_individual_genes.csv\n")
