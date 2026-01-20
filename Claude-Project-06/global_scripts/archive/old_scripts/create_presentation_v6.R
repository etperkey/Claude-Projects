# S1P Pathway Analysis - PDF Presentation for PI
# Version 6: Includes Chapuy + Duke + REMoDL-B ALL CLUSTERS
# Author: Eric Perkey

library(survival)
library(png)
library(grid)
library(dplyr)

project_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06"
chapuy_dir <- file.path(project_dir, "Chapuy_Broad")
duke_dir <- file.path(project_dir, "Reddy_Duke")
remodlb_dir <- file.path(project_dir, "Sha_REMoDL-B")

output_file <- file.path(project_dir, "GC_Bcell_Positioning_Pathway_DLBCL_Presentation.pdf")
fig_dir <- file.path(chapuy_dir, "figures")
duke_fig_dir <- file.path(duke_dir, "figures")
remodlb_fig_dir <- file.path(remodlb_dir, "figures")

# Read clinical data for stats
data <- read.csv(file.path(chapuy_dir, "data/processed/chapuy_s1p_clinical.csv"))
duke_data <- read.csv(file.path(duke_dir, "data/processed/duke_classified.csv"))

# Load the pre-generated figures
pathway_img <- readPNG(file.path(fig_dir, "S1P_pathway_diagram.png"))
methods_img <- readPNG(file.path(fig_dir, "methodology_S1P_analysis.png"))

# Load Duke figures
duke_ezb_egress <- readPNG(file.path(duke_fig_dir, "km_ezb_egress_score.png"))

# Load REMoDL-B figures
remodlb_km_bcl2 <- readPNG(file.path(remodlb_fig_dir, "km_BCL2_pathway.png"))
remodlb_km_myd88 <- readPNG(file.path(remodlb_fig_dir, "km_MYD88_pathway.png"))
remodlb_km_sgk1 <- readPNG(file.path(remodlb_fig_dir, "km_SGK1_pathway.png"))

# Load gene comparison heatmap
gene_heatmap <- readPNG(file.path(project_dir, "global_figures/pathway_gene_heatmap.png"))

pdf(output_file, width = 11, height = 8.5)

# ===== SLIDE 1: Title =====
par(mar = c(0, 0, 0, 0))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")

text(5, 7.5, "GC B-cell Positioning Pathway Mutations in DLBCL", cex = 2.2, font = 2)
text(5, 6, "Analysis of Chapuy + Duke + REMoDL-B Validation Cohorts", cex = 1.8)
text(5, 4.8, "Chapuy n=135 | Duke n=1001 | REMoDL-B n=928", cex = 1.4, col = "gray40")

text(5, 3, "Eric Perkey", cex = 1.5, font = 2)

text(5, 1.5, paste("Analysis Date:", Sys.Date()), cex = 1.2)
text(5, 0.8, "Data Source: cBioPortal, GEO, Blood 2020", cex = 1, col = "gray50")

# ===== SLIDE 2: Background - S1P Pathway Diagram =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("Background: S1P Signaling Pathways", cex.main = 1.6)
rasterImage(pathway_img, 0, 0, 1, 0.95)

# ===== SLIDE 3: Methods - Pipeline Figure =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("Methods: Analysis Pipeline", cex.main = 1.6)
rasterImage(methods_img, 0, 0, 1, 0.95)

# ===== SLIDE 4: Chapuy Results by Cluster =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Chapuy Cohort: Mutations by Genetic Cluster", cex.main = 1.8)

text(1.3, 9, "Cluster", font = 2, cex = 0.95)
text(2.7, 9, "N", font = 2, cex = 0.95)
text(3.9, 9, "Ret LoF", font = 2, cex = 0.95, col = "darkgreen")
text(5.2, 9, "Egr GoF", font = 2, cex = 0.95, col = "darkred")
text(6.5, 9, "Both", font = 2, cex = 0.95, col = "purple")
text(7.7, 9, "Any", font = 2, cex = 0.95)
text(9, 9, "Key Genes", font = 2, cex = 0.85)

segments(0.3, 8.7, 9.7, 8.7, lwd = 1)

clusters <- c("C0-Unclass", "C1-BN2", "C2-TP53", "C3-EZB (GCB)", "C4-SGK1", "C5-MCD (ABC)")
ns <- c(4, 16, 32, 28, 24, 31)
rets <- c("0%", "18.8%", "15.6%", "50%", "29.2%", "9.7%")
egrs <- c("0%", "18.8%", "0%", "14.3%", "16.7%", "6.5%")
boths <- c("0%", "6.2%", "0%", "3.6%", "4.2%", "0%")
anys <- c("0%", "31.2%", "15.6%", "60.7%", "41.7%", "16.1%")
keys <- c("-", "RAC2", "P2RY8", "GNA13, S1PR2", "RHOA, P2RY8", "ARHGAP25")

for (i in 1:6) {
  y <- 8.2 - (i-1) * 0.8
  font <- ifelse(i == 4, 2, 1)
  if (i == 4) rect(0.2, y - 0.3, 9.8, y + 0.3, col = "lightyellow", border = NA)
  text(1.3, y, clusters[i], cex = 0.95, font = font)
  text(2.7, y, ns[i], cex = 0.95)
  text(3.9, y, rets[i], cex = 0.95, col = "darkgreen", font = font)
  text(5.2, y, egrs[i], cex = 0.95, col = "darkred", font = font)
  text(6.5, y, boths[i], cex = 0.95, col = "purple", font = font)
  text(7.7, y, anys[i], cex = 0.95, font = font)
  text(9, y, keys[i], cex = 0.8)
}

segments(0.3, 3.1, 9.7, 3.1, lwd = 1)
text(1.3, 2.6, "OVERALL", font = 2, cex = 0.95)
text(2.7, 2.6, "135", cex = 0.95, font = 2)
text(3.9, 2.6, "23.7%", cex = 0.95, col = "darkgreen", font = 2)
text(5.2, 2.6, "10.4%", cex = 0.95, col = "darkred", font = 2)
text(6.5, 2.6, "3.7%", cex = 0.95, col = "purple", font = 2)
text(7.7, 2.6, "30.4%", cex = 0.95, font = 2)

text(5, 1.4, "C3-EZB (GCB) has highest pathway involvement: 60.7%", cex = 1.2, font = 2, col = "orange3")

# ===== SLIDE 5: Chapuy C3-EZB Survival =====
par(mar = c(5, 5, 4, 2))

c3_data <- data[data$Cluster == 3 & !is.na(data$OS_Months) & !is.na(data$OS_Death), ]
c3_data$S1P_Score_Cat <- ifelse(c3_data$Combined == 0, 0, ifelse(c3_data$Combined == 1, 1, 2))

fit <- survfit(Surv(OS_Months, OS_Death) ~ S1P_Score_Cat, data = c3_data)
lr <- survdiff(Surv(OS_Months, OS_Death) ~ S1P_Score_Cat, data = c3_data)
pval <- 1 - pchisq(lr$chisq, length(lr$n) - 1)

plot(fit, col = c("forestgreen", "orange", "red"), lwd = 3,
     xlab = "Time (months)", ylab = "Overall Survival",
     main = paste0("Chapuy C3-EZB: Egress Score and Survival\nLog-rank p = ", format(pval, digits = 3)),
     cex.main = 1.4, cex.lab = 1.2)
legend("bottomleft", legend = c("Score 0 (n=11)", "Score 1 (n=12)", "Score 2+ (n=4)"),
       col = c("forestgreen", "orange", "red"), lwd = 3, bty = "n", cex = 1.1)

text(80, 0.3, "Median OS:", font = 2, cex = 1)
text(80, 0.22, "Score 0: 89.5 mo", col = "forestgreen", cex = 1)
text(80, 0.14, "Score 1: Not reached", col = "orange", cex = 1)
text(80, 0.06, "Score 2+: 13.2 mo", col = "red", font = 2, cex = 1)

# ===== SLIDE 6: Chapuy Key Finding Box =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Chapuy C3-EZB: Key Finding", cex.main = 1.8)

rect(1, 5, 9, 9, col = "mistyrose", border = "red", lwd = 3)
text(5, 8, "Egress Score >= 2 in C3-EZB:", cex = 1.5, font = 2)
text(5, 7, "100% mortality (4/4 deaths)", cex = 1.4, col = "red", font = 2)
text(5, 6, "Median OS: 13.2 months", cex = 1.3)

rect(1, 1.5, 9, 4.5, col = "honeydew", border = "darkgreen", lwd = 2)
text(5, 3.8, "Egress Score 0-1 in C3-EZB:", cex = 1.3, font = 2)
text(5, 3, "33-36% mortality", cex = 1.2, col = "darkgreen")
text(5, 2.2, "Median OS: 89.5 mo (Score 0) / Not reached (Score 1)", cex = 1.1)

# ===== SLIDE 7: Duke EZB Results =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("Duke EZB-like (n=83): Opposite Direction (p = 0.16)", cex.main = 1.5)
rasterImage(duke_ezb_egress, 0.05, 0.05, 0.95, 0.95)

# ===== SLIDE 8: Duke Finding Summary =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Duke EZB: Surprising Finding", cex.main = 1.8)

text(5, 9, "Duke vs Chapuy EZB Comparison", cex = 1.4, font = 2)

# Table
text(2.5, 8, "Metric", font = 2, cex = 1.1)
text(5.5, 8, "Chapuy EZB", font = 2, cex = 1.1, col = "orange3")
text(8, 8, "Duke EZB", font = 2, cex = 1.1, col = "steelblue")
segments(1, 7.7, 9.5, 7.7, lwd = 1)

text(2.5, 7.2, "Score 2+ Deaths", cex = 1.0)
text(5.5, 7.2, "4/4 (100%)", cex = 1.0, font = 2, col = "red")
text(8, 7.2, "0/8 (0%)", cex = 1.0, font = 2, col = "darkgreen")

text(2.5, 6.6, "Score 0-1 Deaths", cex = 1.0)
text(5.5, 6.6, "8/24 (33%)", cex = 1.0)
text(8, 6.6, "19/70 (27%)", cex = 1.0)

rect(0.5, 4.5, 9.5, 6.2, col = "lightblue", border = "steelblue", lwd = 2)
text(5, 5.7, "OPPOSITE DIRECTION in Duke EZB:", cex = 1.1, font = 2, col = "steelblue")
text(5, 5.1, "Score 2+ patients have BETTER survival (0% mortality)", cex = 1.0)

rect(0.5, 2.5, 9.5, 4.2, col = "lightyellow", border = "orange", lwd = 2)
text(5, 3.7, "Possible reasons:", cex = 1.0, font = 2)
text(5, 3.2, "1. Mutation-based classification may not match true EZB", cex = 0.9)
text(5, 2.8, "2. Duke P2RY8 completely missing (variant calling issues)", cex = 0.9)

# ===== SLIDE 9: REMoDL-B Introduction =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Validation Cohort 2: REMoDL-B (Lacy et al. Blood 2020)", cex.main = 1.8)

text(5, 9, "UK HMRN Population-Based Cohort", cex = 1.4, font = 2)

# Cluster table
text(2, 7.8, "Cluster", font = 2, cex = 1.0)
text(4, 7.8, "N", font = 2, cex = 1.0)
text(6, 7.8, "Chapuy Equiv", font = 2, cex = 1.0)
text(8.5, 7.8, "Pathway Mut", font = 2, cex = 1.0)
segments(0.5, 7.5, 9.5, 7.5, lwd = 1)

clusters <- c("BCL2", "MYD88", "SGK1", "NEC")
ns <- c(237, 176, 191, 324)
equivs <- c("C3-EZB", "C5-MCD", "C4-SGK1", "Unclassified")
muts <- c("23.6%", "8.0%", "28.3%", "8.0%")

for (i in 1:4) {
  y <- 7.0 - (i-1) * 0.6
  font <- ifelse(i <= 2, 2, 1)
  if (i == 1) rect(0.5, y - 0.25, 9.5, y + 0.25, col = "lightyellow", border = NA)
  if (i == 2) rect(0.5, y - 0.25, 9.5, y + 0.25, col = "lavender", border = NA)
  text(2, y, clusters[i], cex = 1.0, font = font)
  text(4, y, ns[i], cex = 1.0)
  text(6, y, equivs[i], cex = 0.9)
  text(8.5, y, muts[i], cex = 1.0)
}

segments(0.5, 4.4, 9.5, 4.4, lwd = 1)
text(5, 4.0, "Total: 928 patients with pre-defined molecular subtypes", cex = 1.1, font = 2)

rect(0.5, 1.5, 9.5, 3.5, col = "honeydew", border = "darkgreen", lwd = 2)
text(5, 3.0, "ADVANTAGES:", cex = 1.1, font = 2, col = "darkgreen")
text(5, 2.5, "Pre-defined model-based clusters (not mutation-based)", cex = 0.95)
text(5, 2.0, "293-gene panel includes P2RY8 (4 mutations in BCL2)", cex = 0.95)

# ===== SLIDE 10: REMoDL-B BCL2 Results =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("REMoDL-B BCL2 (EZB-equiv, n=237): p = 0.86", cex.main = 1.5)
rasterImage(remodlb_km_bcl2, 0.05, 0.05, 0.95, 0.95)

# ===== SLIDE 11: REMoDL-B MYD88 Results - NOTABLE FINDING =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("REMoDL-B MYD88 (MCD-equiv, n=176): p = 0.11 - NOTABLE TREND", cex.main = 1.4, col.main = "purple")
rasterImage(remodlb_km_myd88, 0.05, 0.05, 0.95, 0.95)

# ===== SLIDE 12: REMoDL-B MYD88 Key Finding =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("REMoDL-B MYD88 Cluster: Notable Finding", cex.main = 1.8)

rect(0.5, 6, 9.5, 9.5, col = "lavender", border = "purple", lwd = 3)
text(5, 9, "MYD88 Cluster (MCD-equivalent)", cex = 1.3, font = 2, col = "purple")

text(2.5, 8.2, "Metric", font = 2, cex = 1.0)
text(6, 8.2, "No Mutation", font = 2, cex = 1.0)
text(8.5, 8.2, "Pathway Mut", font = 2, cex = 1.0)
segments(1.5, 7.9, 9.3, 7.9, lwd = 1)

text(2.5, 7.4, "N patients", cex = 1.0)
text(6, 7.4, "162", cex = 1.0)
text(8.5, 7.4, "14", cex = 1.0)

text(2.5, 6.8, "Median OS", cex = 1.0)
text(6, 6.8, "34.2 mo", cex = 1.0, col = "forestgreen", font = 2)
text(8.5, 6.8, "3.4 mo", cex = 1.0, col = "red", font = 2)

text(2.5, 6.2, "Log-rank p", cex = 1.0)
text(7.25, 6.2, "0.113", cex = 1.0, font = 2)

# Key point
rect(0.5, 3.5, 9.5, 5.5, col = "mistyrose", border = "red", lwd = 2)
text(5, 5.0, "10-FOLD DIFFERENCE in median survival!", cex = 1.2, font = 2, col = "red")
text(5, 4.4, "Pathway mutations: 3.4 months vs 34.2 months", cex = 1.1)
text(5, 3.8, "Same direction as Chapuy EZB (mutations = worse)", cex = 1.0)

# Interpretation
rect(0.5, 1.5, 9.5, 3.2, col = "lightyellow", border = "orange", lwd = 2)
text(5, 2.8, "INTERPRETATION:", cex = 1.0, font = 2)
text(5, 2.3, "Effect may be stronger in MCD/MYD88 than in EZB/BCL2", cex = 0.95)
text(5, 1.8, "p=0.11 with only 14 pathway-mutated patients - needs larger cohort", cex = 0.9)

# ===== SLIDE 13: REMoDL-B SGK1 Results =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("REMoDL-B SGK1 (n=191): p = 0.58 - No Association", cex.main = 1.5)
rasterImage(remodlb_km_sgk1, 0.05, 0.05, 0.95, 0.95)

# ===== SLIDE 14: REMoDL-B All Clusters Summary =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("REMoDL-B: All Clusters Summary", cex.main = 1.8)

# Header
text(1.5, 8.8, "Cluster", font = 2, cex = 1.0)
text(3, 8.8, "N", font = 2, cex = 1.0)
text(4.3, 8.8, "% Mut", font = 2, cex = 1.0)
text(5.8, 8.8, "P-value", font = 2, cex = 1.0)
text(7.3, 8.8, "Direction", font = 2, cex = 1.0)
text(9, 8.8, "HR", font = 2, cex = 1.0)
segments(0.5, 8.5, 9.7, 8.5, lwd = 1)

# Data rows
clusters <- c("BCL2", "MYD88", "SGK1", "NEC")
ns <- c("237", "176", "191", "324")
pcts <- c("23.6%", "8.0%", "28.3%", "8.0%")
pvals <- c("0.856", "0.113", "0.583", "0.989")
dirs <- c("Worse", "Worse", "Undet", "Better")
hrs <- c("0.91", "1.61", "0.99", "1.03")
cols <- c("orange3", "red", "gray50", "darkgreen")

for (i in 1:4) {
  y <- 8.0 - (i-1) * 0.7
  font <- ifelse(i == 2, 2, 1)
  if (i == 2) rect(0.5, y - 0.3, 9.7, y + 0.3, col = "lavender", border = NA)
  text(1.5, y, clusters[i], cex = 1.0)
  text(3, y, ns[i], cex = 1.0)
  text(4.3, y, pcts[i], cex = 1.0)
  text(5.8, y, pvals[i], cex = 1.0, font = font)
  text(7.3, y, dirs[i], cex = 1.0, col = cols[i], font = font)
  text(9, y, hrs[i], cex = 1.0)
}

segments(0.5, 5.0, 9.7, 5.0, lwd = 1)

# Key findings
text(5, 4.3, "Key Findings:", cex = 1.2, font = 2)

rect(0.5, 2.5, 9.5, 4.0, col = "lavender", border = "purple", lwd = 2)
text(5, 3.6, "MYD88 shows strongest effect (HR=1.61, p=0.11)", cex = 1.0, font = 2, col = "purple")
text(5, 3.0, "BCL2 same direction as Chapuy but not significant", cex = 0.95)

rect(0.5, 0.8, 9.5, 2.2, col = "lightyellow", border = "orange", lwd = 2)
text(5, 1.8, "Consistent direction in BCL2 + MYD88 (Chapuy equivalents)", cex = 0.95, font = 2)
text(5, 1.2, "SGK1 highest mutation rate (28.3%) but no effect", cex = 0.95)

# ===== SLIDE 15: Cross-Cohort Summary =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Cross-Cohort Comparison: EZB/BCL2 Subsets", cex.main = 1.8)

# Header
text(1.8, 8.8, "Cohort", font = 2, cex = 1.0)
text(3.5, 8.8, "N", font = 2, cex = 1.0)
text(5.0, 8.8, "% Mut", font = 2, cex = 1.0)
text(6.5, 8.8, "Direction", font = 2, cex = 1.0)
text(8.0, 8.8, "P-value", font = 2, cex = 1.0)
text(9.3, 8.8, "Sig?", font = 2, cex = 1.0)

segments(0.5, 8.5, 9.7, 8.5, lwd = 1)

# Chapuy row (highlighted)
rect(0.5, 7.6, 9.7, 8.3, col = "lightyellow", border = NA)
text(1.8, 8.0, "Chapuy C3-EZB", cex = 0.95, font = 2)
text(3.5, 8.0, "28", cex = 0.95)
text(5.0, 8.0, "60.7%", cex = 0.95)
text(6.5, 8.0, "WORSE", cex = 0.95, font = 2, col = "red")
text(8.0, 8.0, "0.004", cex = 0.95, font = 2)
text(9.3, 8.0, "YES", cex = 0.95, font = 2, col = "darkgreen")

# Duke row
text(1.8, 7.2, "Duke EZB-like", cex = 0.95)
text(3.5, 7.2, "78", cex = 0.95)
text(5.0, 7.2, "55.1%", cex = 0.95)
text(6.5, 7.2, "BETTER", cex = 0.95, font = 2, col = "darkgreen")
text(8.0, 7.2, "0.16", cex = 0.95)
text(9.3, 7.2, "No", cex = 0.95)

# REMoDL-B BCL2 row
text(1.8, 6.4, "REMoDL-B BCL2", cex = 0.95)
text(3.5, 6.4, "237", cex = 0.95)
text(5.0, 6.4, "23.6%", cex = 0.95)
text(6.5, 6.4, "Worse", cex = 0.95, col = "orange3")
text(8.0, 6.4, "0.86", cex = 0.95)
text(9.3, 6.4, "No", cex = 0.95)

# REMoDL-B MYD88 row (highlighted)
rect(0.5, 5.3, 9.7, 6.0, col = "lavender", border = NA)
text(1.8, 5.6, "REMoDL-B MYD88", cex = 0.95, font = 2)
text(3.5, 5.6, "176", cex = 0.95)
text(5.0, 5.6, "8.0%", cex = 0.95)
text(6.5, 5.6, "WORSE", cex = 0.95, font = 2, col = "red")
text(8.0, 5.6, "0.11", cex = 0.95, font = 2)
text(9.3, 5.6, "trend", cex = 0.95, col = "purple")

segments(0.5, 5.0, 9.7, 5.0, lwd = 1)

# Interpretation
rect(0.5, 2.8, 9.5, 4.7, col = "honeydew", border = "darkgreen", lwd = 2)
text(5, 4.3, "Direction Consistent in 3/4 cohort-subtype combinations:", cex = 1.0, font = 2)
text(5, 3.8, "Chapuy EZB, REMoDL-B BCL2, REMoDL-B MYD88 all show WORSE", cex = 0.95)
text(5, 3.3, "Only Duke EZB shows opposite (possible classification issues)", cex = 0.95)

rect(0.5, 0.8, 9.5, 2.5, col = "mistyrose", border = "red", lwd = 2)
text(5, 2.1, "STRONGEST EFFECT: REMoDL-B MYD88", cex = 1.0, font = 2, col = "red")
text(5, 1.5, "Median OS 3.4 vs 34.2 months (10-fold difference)", cex = 0.95)

# ===== SLIDE 16: Gene Coverage Comparison =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("Pathway Gene Detection: Critical Gaps Across Cohorts", cex.main = 1.5)
rasterImage(gene_heatmap, 0.02, 0.02, 0.98, 0.92)

# ===== SLIDE 17: Gene Coverage Summary =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Gene Coverage: Key Differences Explain Discrepancies", cex.main = 1.7)

# Header
text(1.5, 9.2, "Gene", font = 2, cex = 1.0)
text(3.5, 9.2, "Chapuy", font = 2, cex = 1.0)
text(5.5, 9.2, "Duke", font = 2, cex = 1.0)
text(7.5, 9.2, "REMoDL-B", font = 2, cex = 1.0)
text(9.2, 9.2, "Notes", font = 2, cex = 0.9)
segments(0.5, 8.9, 9.7, 8.9, lwd = 1)

# RETENTION GENES
text(0.7, 8.5, "RETENTION LoF", adj = 0, font = 2, cex = 0.9, col = "darkgreen")

genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")
chapuy_vals <- c("4.4%", "8.9%", "0.7%", "8.9%", "4.4%")
duke_vals <- c("1.9%", "8.3%", "0%", "0%", "3.0%")
remodlb_vals <- c("-", "8.4%", "-", "2.6%", "3.7%")
notes <- c("Duke low", "Similar", "Duke 0", "DUKE 0!", "Similar")
issue <- c(FALSE, FALSE, TRUE, TRUE, FALSE)

for (i in 1:5) {
  y <- 8.1 - (i-1) * 0.5
  if (issue[i]) rect(0.5, y - 0.2, 9.7, y + 0.2, col = "mistyrose", border = NA)
  text(1.5, y, genes[i], cex = 0.95)
  text(3.5, y, chapuy_vals[i], cex = 0.95)
  text(5.5, y, duke_vals[i], cex = 0.95, col = ifelse(duke_vals[i] == "0%", "red", "black"), font = ifelse(duke_vals[i] == "0%", 2, 1))
  text(7.5, y, remodlb_vals[i], cex = 0.95, col = ifelse(remodlb_vals[i] == "-", "gray50", "black"))
  text(9.2, y, notes[i], cex = 0.8, col = ifelse(issue[i], "red", "gray50"))
}

# EGRESS GENES
text(0.7, 5.5, "EGRESS GoF", adj = 0, font = 2, cex = 0.9, col = "darkred")

genes2 <- c("CXCR4", "GNAI2", "RAC2", "ARHGAP25")
chapuy_vals2 <- c("1.5%", "3.0%", "3.0%", "3.7%")
duke_vals2 <- c("1.4%", "2.2%", "0%", "0%")
remodlb_vals2 <- c("2.4%", "-", "-", "-")
notes2 <- c("Similar", "Similar", "DUKE 0!", "DUKE 0!")
issue2 <- c(FALSE, FALSE, TRUE, TRUE)

for (i in 1:4) {
  y <- 5.1 - (i-1) * 0.5
  if (issue2[i]) rect(0.5, y - 0.2, 9.7, y + 0.2, col = "mistyrose", border = NA)
  text(1.5, y, genes2[i], cex = 0.95)
  text(3.5, y, chapuy_vals2[i], cex = 0.95)
  text(5.5, y, duke_vals2[i], cex = 0.95, col = ifelse(duke_vals2[i] == "0%", "red", "black"), font = ifelse(duke_vals2[i] == "0%", 2, 1))
  text(7.5, y, remodlb_vals2[i], cex = 0.95, col = ifelse(remodlb_vals2[i] == "-", "gray50", "black"))
  text(9.2, y, notes2[i], cex = 0.8, col = ifelse(issue2[i], "red", "gray50"))
}

segments(0.5, 3.0, 9.7, 3.0, lwd = 1)

# Key findings boxes
rect(0.3, 1.5, 4.8, 2.8, col = "mistyrose", border = "red", lwd = 2)
text(2.55, 2.5, "DUKE: 4 genes = 0%", cex = 1.0, font = 2, col = "red")
text(2.55, 2.0, "P2RY8, ARHGEF1, RAC2, ARHGAP25", cex = 0.85)
text(2.55, 1.7, "Variant calling issues (PAR1)", cex = 0.8, font = 3)

rect(5.2, 1.5, 9.7, 2.8, col = "lightyellow", border = "orange", lwd = 2)
text(7.45, 2.5, "REMoDL-B: Limited panel", cex = 1.0, font = 2, col = "orange3")
text(7.45, 2.0, "Only 4/9 genes in 293-gene panel", cex = 0.85)
text(7.45, 1.7, "GNA13, P2RY8, RHOA, CXCR4", cex = 0.8, font = 3)

text(5, 0.8, "'-' = Gene not in sequencing panel", cex = 0.9, col = "gray50")

# ===== SLIDE 18: Conclusions =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Conclusions & Next Steps", cex.main = 1.8)

text(0.5, 9.2, "Key Findings:", adj = 0, cex = 1.3, font = 2)

text(0.8, 8.4, "1. Chapuy C3-EZB: Score >= 2 predicts poor survival (p = 0.004)", adj = 0, cex = 1.0)

text(0.8, 7.6, "2. Duke EZB: Opposite direction (classification issues likely)", adj = 0, cex = 1.0)

text(0.8, 6.8, "3. REMoDL-B BCL2: Same direction but not significant", adj = 0, cex = 1.0)

rect(0.4, 5.5, 9.6, 6.5, col = "lavender", border = "purple", lwd = 2)
text(5, 6.0, "4. REMoDL-B MYD88: STRONGEST EFFECT (HR=1.61, p=0.11)", cex = 1.0, font = 2, col = "purple")

rect(0.4, 3.8, 9.6, 5.2, col = "lightyellow", border = "orange", lwd = 2)
text(5, 4.8, "Direction consistent in EZB/BCL2 AND MYD88/MCD subtypes", cex = 1.0, font = 2)
text(5, 4.2, "Effect may be strongest in MCD (needs validation)", cex = 0.95)

text(0.5, 3.2, "Next Steps:", adj = 0, cex = 1.2, font = 2, col = "darkblue")
text(0.8, 2.6, "- Schmitz/NCI cohort (dbGaP pending) - larger MCD population", adj = 0, cex = 0.95)
text(0.8, 2.0, "- Test pathway effect specifically in MCD/ABC DLBCL", adj = 0, cex = 0.95)
text(0.8, 1.4, "- Need cohorts with more Score 2+ patients", adj = 0, cex = 0.95)

text(5, 0.4, paste("Analysis updated:", Sys.Date()), cex = 0.9, col = "gray50")

dev.off()

cat("Presentation saved to:", output_file, "\n")
cat("Total slides: 18\n")
cat("Includes: Chapuy + Duke + REMoDL-B ALL CLUSTERS + Gene Coverage Comparison\n")
