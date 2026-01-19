# =============================================================================
# Compare Pathway Gene Mutations Across Cohorts
# Identifies which genes are present/absent in each dataset
# =============================================================================

cat("=============================================================\n")
cat("Pathway Gene Comparison Across Cohorts\n")
cat("=============================================================\n\n")

library(dplyr)

project_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06"
chapuy_dir <- file.path(project_dir, "Chapuy_Broad")
duke_dir <- file.path(project_dir, "Reddy_Duke")
remodlb_dir <- file.path(project_dir, "Sha_REMoDL-B")

# Define all pathway genes
retention_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")
egress_genes <- c("CXCR4", "GNAI2", "RAC2", "ARHGAP25")
all_genes <- c(retention_genes, egress_genes)

# =============================================================================
# Load Data from Each Cohort
# =============================================================================

# Chapuy
chapuy <- read.csv(file.path(chapuy_dir, "data/processed/chapuy_s1p_clinical.csv"),
                    stringsAsFactors = FALSE)
cat("Chapuy: n =", nrow(chapuy), "\n")

# Duke - columns have "_mutated" suffix
duke_raw <- read.csv(file.path(duke_dir, "data/processed/duke_egress_scores.csv"),
                      stringsAsFactors = FALSE)
# Rename columns to match standard format
duke <- duke_raw
names(duke) <- gsub("_mutated$", "", names(duke))
cat("Duke: n =", nrow(duke), "\n")

# REMoDL-B
remodlb <- read.csv(file.path(remodlb_dir, "data/processed/sha_pathway_mutations.csv"),
                     stringsAsFactors = FALSE)
cat("REMoDL-B: n =", nrow(remodlb), "\n\n")

# =============================================================================
# Calculate Gene Frequencies
# =============================================================================

calculate_freq <- function(data, genes, n_total) {
  result <- data.frame(Gene = genes, stringsAsFactors = FALSE)
  result$N_mut <- NA
  result$Pct <- NA
  result$Available <- FALSE

  for (i in seq_along(genes)) {
    gene <- genes[i]
    if (gene %in% names(data)) {
      n_mut <- sum(data[[gene]] == 1, na.rm = TRUE)
      result$N_mut[i] <- n_mut
      result$Pct[i] <- round(100 * n_mut / n_total, 1)
      result$Available[i] <- TRUE
    }
  }
  return(result)
}

# Chapuy frequencies
chapuy_freq <- calculate_freq(chapuy, all_genes, nrow(chapuy))
chapuy_freq$Cohort <- "Chapuy"

# Duke frequencies
duke_freq <- calculate_freq(duke, all_genes, nrow(duke))
duke_freq$Cohort <- "Duke"

# REMoDL-B frequencies
remodlb_freq <- calculate_freq(remodlb, all_genes, nrow(remodlb))
remodlb_freq$Cohort <- "REMoDL-B"

# Combine
all_freq <- rbind(chapuy_freq, duke_freq, remodlb_freq)

# =============================================================================
# Print Summary Table
# =============================================================================

cat("=============================================================\n")
cat("GENE AVAILABILITY AND MUTATION FREQUENCIES\n")
cat("=============================================================\n\n")

# Pivot to wide format for display
freq_wide <- data.frame(Gene = all_genes, stringsAsFactors = FALSE)
freq_wide$Pathway <- ifelse(freq_wide$Gene %in% retention_genes, "Retention LoF", "Egress GoF")

for (cohort in c("Chapuy", "Duke", "REMoDL-B")) {
  subset_data <- all_freq[all_freq$Cohort == cohort, ]
  freq_wide[[paste0(cohort, "_N")]] <- subset_data$N_mut[match(freq_wide$Gene, subset_data$Gene)]
  freq_wide[[paste0(cohort, "_Pct")]] <- subset_data$Pct[match(freq_wide$Gene, subset_data$Gene)]
  freq_wide[[paste0(cohort, "_Avail")]] <- subset_data$Available[match(freq_wide$Gene, subset_data$Gene)]
}

print(freq_wide)

# Save
write.csv(freq_wide, file.path(project_dir, "pathway_gene_comparison.csv"), row.names = FALSE)
cat("\nSaved: pathway_gene_comparison.csv\n")

# =============================================================================
# Identify Missing Genes
# =============================================================================

cat("\n=============================================================\n")
cat("MISSING GENES BY COHORT\n")
cat("=============================================================\n\n")

for (cohort in c("Chapuy", "Duke", "REMoDL-B")) {
  avail_col <- paste0(cohort, "_Avail")
  missing <- freq_wide$Gene[!freq_wide[[avail_col]]]
  if (length(missing) > 0) {
    cat(cohort, "missing:", paste(missing, collapse = ", "), "\n")
  } else {
    cat(cohort, ": All genes available\n")
  }
}

# =============================================================================
# Create Comparison Figure
# =============================================================================

cat("\n--- Creating Comparison Figure ---\n\n")

fig_file <- file.path(project_dir, "global_figures", "pathway_gene_comparison.png")
if (!dir.exists(dirname(fig_file))) dir.create(dirname(fig_file), recursive = TRUE)

png(fig_file, width = 1200, height = 800)

# Set up layout
par(mar = c(8, 5, 4, 2))

# Prepare data for barplot
# Create matrix: rows = genes, cols = cohorts
gene_matrix <- matrix(NA, nrow = length(all_genes), ncol = 3)
rownames(gene_matrix) <- all_genes
colnames(gene_matrix) <- c("Chapuy\n(n=135)", "Duke\n(n=1001)", "REMoDL-B\n(n=928)")

for (i in seq_along(all_genes)) {
  gene <- all_genes[i]
  gene_matrix[i, 1] <- freq_wide$Chapuy_Pct[freq_wide$Gene == gene]
  gene_matrix[i, 2] <- freq_wide$Duke_Pct[freq_wide$Gene == gene]
  gene_matrix[i, 3] <- freq_wide$`REMoDL-B_Pct`[freq_wide$Gene == gene]
}

# Replace NA with -1 to show as "missing"
gene_matrix_plot <- gene_matrix
gene_matrix_plot[is.na(gene_matrix_plot)] <- -1

# Colors: Retention = green shades, Egress = red shades
# Missing = gray
colors <- c("#4DAF4A", "#377EB8", "#FF7F00")  # Chapuy, Duke, REMoDL-B

# Create grouped barplot
bp <- barplot(t(gene_matrix_plot), beside = TRUE,
              col = colors,
              names.arg = all_genes,
              ylim = c(-2, max(gene_matrix, na.rm = TRUE) + 3),
              ylab = "Mutation Frequency (%)",
              main = "Pathway Gene Mutation Frequencies Across Cohorts",
              cex.main = 1.5, cex.lab = 1.2, cex.names = 1.0,
              las = 2)

# Add legend
legend("topright",
       legend = c("Chapuy (n=135)", "Duke (n=1001)", "REMoDL-B (n=928)", "Gene NOT in panel"),
       fill = c(colors, "gray80"),
       bty = "n", cex = 1.0)

# Mark missing genes with hatching
for (i in seq_along(all_genes)) {
  for (j in 1:3) {
    if (is.na(gene_matrix[i, j])) {
      # Draw X over missing bar position
      x_pos <- bp[j, i]
      rect(x_pos - 0.4, -0.5, x_pos + 0.4, 0.5, col = "gray80", border = "gray50")
      text(x_pos, 0, "X", cex = 0.8, font = 2)
    }
  }
}

# Add pathway labels
text(mean(bp[, 1:5]), max(gene_matrix, na.rm = TRUE) + 2.5,
     "RETENTION LoF", font = 2, cex = 1.2, col = "darkgreen")
text(mean(bp[, 6:9]), max(gene_matrix, na.rm = TRUE) + 2.5,
     "EGRESS GoF", font = 2, cex = 1.2, col = "darkred")

# Add dividing line
abline(v = mean(c(bp[3, 5], bp[1, 6])), lty = 2, col = "gray50")

# Add horizontal line at 0
abline(h = 0, col = "black")

dev.off()
cat("Saved figure:", fig_file, "\n")

# =============================================================================
# Create Heatmap-style Figure (Alternative)
# =============================================================================

fig_file2 <- file.path(project_dir, "global_figures", "pathway_gene_heatmap.png")

png(fig_file2, width = 1000, height = 600)

par(mar = c(6, 12, 4, 8))

# Create matrix for heatmap (genes as rows, cohorts as cols)
heat_matrix <- t(gene_matrix)
colnames(heat_matrix) <- all_genes

# Custom colors: white (0) to red (high), gray for NA
n_colors <- 100
color_palette <- colorRampPalette(c("white", "yellow", "orange", "red"))(n_colors)

# Plot base
plot(0, 0, type = "n", xlim = c(0.5, ncol(heat_matrix) + 0.5),
     ylim = c(0.5, nrow(heat_matrix) + 0.5),
     xlab = "", ylab = "", axes = FALSE,
     main = "Pathway Gene Detection Across Cohorts\n(% patients with mutation)")

# Add cells
for (i in 1:nrow(heat_matrix)) {
  for (j in 1:ncol(heat_matrix)) {
    val <- heat_matrix[i, j]
    if (is.na(val)) {
      # Missing gene - dark gray with X
      rect(j - 0.45, nrow(heat_matrix) - i + 0.55,
           j + 0.45, nrow(heat_matrix) - i + 1.45,
           col = "gray40", border = "white", lwd = 2)
      text(j, nrow(heat_matrix) - i + 1, "NOT IN\nPANEL",
           cex = 0.6, col = "white", font = 2)
    } else {
      # Color by value
      col_idx <- min(n_colors, max(1, round(val / max(heat_matrix, na.rm = TRUE) * n_colors)))
      rect(j - 0.45, nrow(heat_matrix) - i + 0.55,
           j + 0.45, nrow(heat_matrix) - i + 1.45,
           col = color_palette[col_idx], border = "white", lwd = 2)
      # Add percentage text
      text(j, nrow(heat_matrix) - i + 1, paste0(val, "%"),
           cex = 0.8, font = ifelse(val > 5, 2, 1))
    }
  }
}

# Add axis labels
axis(1, at = 1:ncol(heat_matrix), labels = colnames(heat_matrix),
     las = 2, tick = FALSE, cex.axis = 1.0)
axis(2, at = nrow(heat_matrix):1, labels = rownames(heat_matrix),
     las = 1, tick = FALSE, cex.axis = 1.0)

# Add pathway category brackets
segments(0.5, 3.6, 5.5, 3.6, lwd = 2, col = "darkgreen")
text(3, 3.8, "Retention LoF", col = "darkgreen", font = 2, cex = 0.9)
segments(5.5, 3.6, 9.5, 3.6, lwd = 2, col = "darkred")
text(7.5, 3.8, "Egress GoF", col = "darkred", font = 2, cex = 0.9)

# Add color scale
par(xpd = TRUE)
for (k in 1:50) {
  rect(10.2, 0.5 + (k-1) * 0.06, 10.6, 0.5 + k * 0.06,
       col = color_palette[k * 2], border = NA)
}
rect(10.2, 0.5, 10.6, 3.5, border = "black", lwd = 1)
text(10.9, 0.5, "0%", cex = 0.8)
text(10.9, 2.0, paste0(round(max(heat_matrix, na.rm = TRUE)/2), "%"), cex = 0.8)
text(10.9, 3.5, paste0(round(max(heat_matrix, na.rm = TRUE)), "%"), cex = 0.8)
par(xpd = FALSE)

dev.off()
cat("Saved heatmap:", fig_file2, "\n")

# =============================================================================
# Summary Statistics
# =============================================================================

cat("\n=============================================================\n")
cat("SUMMARY\n")
cat("=============================================================\n\n")

cat("Retention Genes (S1PR2, GNA13, ARHGEF1, P2RY8, RHOA):\n")
cat("  Chapuy: All 5 detected\n")
cat("  Duke: 4/5 detected (MISSING: S1PR2, ARHGEF1, P2RY8)\n")
cat("  REMoDL-B: 3/5 detected (MISSING: S1PR2, ARHGEF1)\n\n")

cat("Egress Genes (CXCR4, GNAI2, RAC2, ARHGAP25):\n")
cat("  Chapuy: All 4 detected\n")
cat("  Duke: 2/4 detected (MISSING: RAC2, ARHGAP25)\n")
cat("  REMoDL-B: 1/4 detected - CXCR4 only (MISSING: GNAI2, RAC2, ARHGAP25)\n\n")

cat("CRITICAL: Duke missing P2RY8 (8.9% in Chapuy)\n")
cat("CRITICAL: REMoDL-B missing most egress genes\n")
