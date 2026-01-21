data <- read.csv("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Lacy_HMRN/data/genetic_egress_scores.csv")

cat("=== Lacy/HMRN Subsets (n=", nrow(data), ") ===\n\n")

cat("--- Cluster (ICL Classification) ---\n")
print(table(data$cluster_ICL, useNA="ifany"))

cat("\n--- Cell of Origin (COO) ---\n")
print(table(data$cell_of_origin, useNA="ifany"))

cat("\n--- Cross-tabulation: Cluster x COO ---\n")
print(table(data$cluster_ICL, data$cell_of_origin, useNA="ifany"))

cat("\n--- GNA13 by Cluster ---\n")
for (cl in unique(data$cluster_ICL)) {
  sub <- data[data$cluster_ICL == cl, ]
  n <- nrow(sub)
  n_gna13 <- sum(sub$GNA13)
  pct <- round(100 * n_gna13 / n, 1)
  cat(sprintf("  %-8s n=%3d, GNA13=%2d (%5.1f%%)\n", cl, n, n_gna13, pct))
}

cat("\n--- GNA13 by COO ---\n")
for (coo in c("GCB", "ABC", "UNC", "Missing")) {
  sub <- data[data$cell_of_origin == coo, ]
  if (nrow(sub) == 0) next
  n <- nrow(sub)
  n_gna13 <- sum(sub$GNA13)
  pct <- round(100 * n_gna13 / n, 1)
  cat(sprintf("  %-8s n=%3d, GNA13=%2d (%5.1f%%)\n", coo, n, n_gna13, pct))
}
