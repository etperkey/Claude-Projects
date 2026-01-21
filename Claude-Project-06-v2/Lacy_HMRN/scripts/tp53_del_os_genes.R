library(survival)
library(dplyr)

cat("=============================================================================\n")
cat("Genes Predictive of OS in TP53-Deleted Lymphoma - Lacy/HMRN\n")
cat("=============================================================================\n\n")

# Load data
genomic <- read.csv("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/genomic_data.csv")
clinical <- read.csv("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/data/genetic_egress_scores.csv")

# Merge
data <- merge(genomic, clinical[, c("PID", "cluster_ICL", "cell_of_origin", "OS_time", "OS_status")], by = "PID")
data$OS_MONTHS <- data$OS_time / 30.44
data$OS_EVENT <- data$OS_status

# Filter to TP53-deleted
tp53_del <- data[data$TP53_OR_del == 1, ]

cat("TP53-deleted patients:", nrow(tp53_del), "\n")
cat("Events (deaths):", sum(tp53_del$OS_EVENT), "\n")
cat("Median OS:", round(median(tp53_del$OS_MONTHS[tp53_del$OS_EVENT == 1]), 1), "months\n\n")

cat("Cluster distribution:\n")
print(table(tp53_del$cluster_ICL))

cat("\nCOO distribution:\n")
print(table(tp53_del$cell_of_origin))

# Get gene columns
gene_cols <- setdiff(names(genomic), c("PID", "TP53_OR_del"))

# Test each gene
results <- data.frame()

for (gene in gene_cols) {
  n_mut <- sum(tp53_del[[gene]], na.rm = TRUE)
  n_wt <- sum(tp53_del[[gene]] == 0, na.rm = TRUE)

  if (n_mut >= 5 && n_wt >= 5) {
    tryCatch({
      cox <- coxph(Surv(OS_MONTHS, OS_EVENT) ~ tp53_del[[gene]], data = tp53_del)
      hr <- exp(coef(cox))
      ci <- exp(confint(cox))
      p <- summary(cox)$coefficients[, "Pr(>|z|)"]

      results <- rbind(results, data.frame(
        Gene = gene,
        N_mut = n_mut,
        Pct = round(100 * n_mut / nrow(tp53_del), 1),
        HR = round(hr, 3),
        CI_lower = round(ci[1], 3),
        CI_upper = round(ci[2], 3),
        P_value = p,
        Direction = ifelse(hr > 1, "Harmful", "Protective")
      ))
    }, error = function(e) {})
  }
}

results <- results %>% arrange(P_value)
results$FDR <- p.adjust(results$P_value, method = "BH")

cat("\n=============================================================================\n")
cat("PROTECTIVE GENES in TP53-del (HR < 1, p < 0.1)\n")
cat("=============================================================================\n\n")

protective <- results %>% filter(HR < 1 & P_value < 0.1) %>% arrange(P_value)
if (nrow(protective) > 0) {
  print(as.data.frame(protective[, c("Gene", "N_mut", "Pct", "HR", "CI_lower", "CI_upper", "P_value", "FDR")]), row.names = FALSE)
} else {
  cat("None with p < 0.1\n")
}

cat("\n=============================================================================\n")
cat("HARMFUL GENES in TP53-del (HR > 1, p < 0.1)\n")
cat("=============================================================================\n\n")

harmful <- results %>% filter(HR > 1 & P_value < 0.1) %>% arrange(P_value)
if (nrow(harmful) > 0) {
  print(as.data.frame(harmful[, c("Gene", "N_mut", "Pct", "HR", "CI_lower", "CI_upper", "P_value", "FDR")]), row.names = FALSE)
} else {
  cat("None with p < 0.1\n")
}

cat("\n=============================================================================\n")
cat("ALL GENES (p < 0.05)\n")
cat("=============================================================================\n\n")

sig <- results %>% filter(P_value < 0.05)
if (nrow(sig) > 0) {
  print(as.data.frame(sig[, c("Gene", "N_mut", "Pct", "HR", "P_value", "FDR", "Direction")]), row.names = FALSE)
} else {
  cat("None with p < 0.05\n")
}

# Save
write.csv(results,
          "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/results/tp53_del_os_genes.csv",
          row.names = FALSE)

cat("\n\nFull results saved to: Lacy_HMRN/results/tp53_del_os_genes.csv\n")

# Check GNA13 specifically
cat("\n=============================================================================\n")
cat("GNA13 in TP53-deleted subset\n")
cat("=============================================================================\n\n")

n_gna13 <- sum(tp53_del$GNA13)
cat("GNA13 mutated:", n_gna13, "(", round(100*n_gna13/nrow(tp53_del), 1), "%)\n")

if (n_gna13 >= 3) {
  gna13_row <- results[results$Gene == "GNA13", ]
  if (nrow(gna13_row) > 0) {
    cat("HR:", gna13_row$HR, "\n")
    cat("95% CI:", gna13_row$CI_lower, "-", gna13_row$CI_upper, "\n")
    cat("p-value:", round(gna13_row$P_value, 4), "\n")
  }
}
