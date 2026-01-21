# S1P Pathway Analysis - PDF Presentation for PI
# Version 5: Includes Chapuy + Duke + REMoDL-B validation cohorts
# Author: Eric Perkey

library(survival)
library(png)
library(grid)
library(dplyr)

project_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06"
chapuy_dir <- file.path(project_dir, "Chapuy_Broad")
duke_dir <- file.path(project_dir, "Duke")
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
duke_km_pathway <- readPNG(file.path(duke_fig_dir, "km_pathway_mutation.png"))
duke_km_egress <- readPNG(file.path(duke_fig_dir, "km_egress_score.png"))
duke_ezb_egress <- readPNG(file.path(duke_fig_dir, "km_ezb_egress_score.png"))
duke_ezb_high_low <- readPNG(file.path(duke_fig_dir, "km_ezb_high_vs_low.png"))

# Load REMoDL-B figures
remodlb_km_pathway <- readPNG(file.path(remodlb_fig_dir, "km_bcl2_pathway_mutation.png"))
remodlb_km_score <- readPNG(file.path(remodlb_fig_dir, "km_bcl2_score_categories.png"))

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

# ===== SLIDE 7: Duke Cohort Introduction =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Validation Cohort 1: Duke DLBCL (Reddy et al. Cell 2017)", cex.main = 1.8)

text(5, 8.5, "Cohort Characteristics", cex = 1.5, font = 2)

text(2.5, 7.5, "Metric", font = 2, cex = 1.1)
text(7, 7.5, "Value", font = 2, cex = 1.1)
segments(1, 7.2, 9, 7.2, lwd = 1)

text(2.5, 6.7, "Total Patients", cex = 1.1)
text(7, 6.7, "1,001", cex = 1.1, font = 2)
text(2.5, 6.1, "With Survival Data", cex = 1.1)
text(7, 6.1, "967", cex = 1.1)
text(2.5, 5.5, "Events (Deaths)", cex = 1.1)
text(7, 5.5, "305 (31.5%)", cex = 1.1)
text(2.5, 4.9, "Median Follow-up", cex = 1.1)
text(7, 4.9, "91.8 months", cex = 1.1)

segments(1, 4.5, 9, 4.5, lwd = 1)

rect(1, 2.5, 9, 4.2, col = "lightyellow", border = "orange", lwd = 2)
text(5, 3.7, "CHALLENGE:", cex = 1.1, font = 2, col = "orange3")
text(5, 3.1, "Duke lacks genetic subtype classification", cex = 1.0)

text(5, 1.5, "Solution: Reconstruct Chapuy-like subtypes from mutation data", cex = 1.2, font = 3)

# ===== SLIDE 8: Duke Subtype Classification Methods =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Methods: Duke Subtype Classification", cex.main = 1.8)

text(5, 9.2, "Mutation-Based Classification Algorithm", cex = 1.3, font = 2)

# EZB box
rect(0.3, 7.2, 4.8, 8.8, col = "lightyellow", border = "orange", lwd = 2)
text(2.55, 8.5, "EZB-like", font = 2, cex = 1.1, col = "orange3")
text(2.55, 8.0, "EZH2 mutation OR", cex = 0.9)
text(2.55, 7.6, "(GNA13 + CREBBP/KMT2D) OR", cex = 0.9)
text(2.55, 7.35, "(MEF2B + CREBBP)", cex = 0.9)

# MCD box
rect(5.2, 7.2, 9.7, 8.8, col = "lightblue", border = "steelblue", lwd = 2)
text(7.45, 8.5, "MCD-like", font = 2, cex = 1.1, col = "steelblue")
text(7.45, 8.0, "MYD88 + CD79B co-mutation", cex = 0.9)
text(7.45, 7.6, "(pathognomonic)", cex = 0.9, font = 3)

# BN2 box
rect(0.3, 5.3, 4.8, 6.9, col = "lavender", border = "purple", lwd = 2)
text(2.55, 6.6, "BN2-like", font = 2, cex = 1.1, col = "purple")
text(2.55, 6.1, "NOTCH2 mutation", cex = 0.9)
text(2.55, 5.7, "(BCL6 translocation not available)", cex = 0.8, font = 3)

# TP53 box
rect(5.2, 5.3, 9.7, 6.9, col = "mistyrose", border = "red", lwd = 2)
text(7.45, 6.6, "TP53", font = 2, cex = 1.1, col = "red")
text(7.45, 6.1, "TP53 mutation", cex = 0.9)
text(7.45, 5.7, "(high priority)", cex = 0.8, font = 3)

# ST2 box
rect(0.3, 3.8, 4.8, 5.0, col = "honeydew", border = "darkgreen", lwd = 2)
text(2.55, 4.7, "ST2-like", font = 2, cex = 1.1, col = "darkgreen")
text(2.55, 4.2, "SGK1 mutation", cex = 0.9)

# Results
text(5, 3.0, "Classification Results:", cex = 1.2, font = 2)
text(5, 2.3, "EZB: 83 | MCD: 25 | MCD-like: 147 | BN2: 51 | ST2: 41 | TP53: 68 | Other: 586", cex = 0.95)

rect(2, 0.8, 8, 1.8, col = "lightyellow", border = "orange", lwd = 2)
text(5, 1.3, "83 Duke patients classified as EZB-like", cex = 1.1, font = 2)

# ===== SLIDE 9: Duke EZB Results =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("Duke EZB Subset: Egress Score Categories (p = 0.16)", cex.main = 1.6)
rasterImage(duke_ezb_egress, 0.05, 0.05, 0.95, 0.95)

# ===== SLIDE 10: Duke Surprising Finding =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Duke EZB: Surprising Finding - Opposite Direction", cex.main = 1.8)

text(5, 9, "Comparison: Chapuy vs Duke EZB Subset", cex = 1.4, font = 2)

# Table header
text(2.5, 8, "Metric", font = 2, cex = 1.1)
text(5.5, 8, "Chapuy EZB", font = 2, cex = 1.1, col = "orange3")
text(8, 8, "Duke EZB", font = 2, cex = 1.1, col = "steelblue")

segments(1, 7.7, 9.5, 7.7, lwd = 1)

# Data rows
text(2.5, 7.2, "N patients", cex = 1.0)
text(5.5, 7.2, "28", cex = 1.0)
text(8, 7.2, "78", cex = 1.0)

text(2.5, 6.6, "Pathway mutated %", cex = 1.0)
text(5.5, 6.6, "60.7%", cex = 1.0)
text(8, 6.6, "55.1%", cex = 1.0)

text(2.5, 6.0, "Score 2+ patients", cex = 1.0)
text(5.5, 6.0, "4", cex = 1.0)
text(8, 6.0, "8", cex = 1.0)

segments(1, 5.7, 9.5, 5.7, lwd = 1)

# Deaths in Score 2+ - THE KEY DIFFERENCE
rect(1, 4.5, 9.5, 5.5, col = "lightyellow", border = "orange", lwd = 2)
text(2.5, 5.1, "Score 2+ Deaths", font = 2, cex = 1.1)
text(5.5, 5.1, "4/4 (100%)", cex = 1.1, font = 2, col = "red")
text(8, 5.1, "0/8 (0%)", cex = 1.1, font = 2, col = "darkgreen")

text(2.5, 4.0, "Score 0-1 Deaths", cex = 1.0)
text(5.5, 4.0, "8/24 (33%)", cex = 1.0)
text(8, 4.0, "19/70 (27%)", cex = 1.0)

# Interpretation
rect(0.5, 1.5, 9.5, 3.3, col = "lightblue", border = "steelblue", lwd = 2)
text(5, 2.9, "OPPOSITE DIRECTION:", cex = 1.2, font = 2, col = "steelblue")
text(5, 2.3, "In Duke EZB, Score 2+ patients have BETTER survival", cex = 1.1)
text(5, 1.8, "(0% mortality vs 27% in Score 0-1)", cex = 1.0)

# ===== SLIDE 11: REMoDL-B Cohort Introduction =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Validation Cohort 2: REMoDL-B (Lacy et al. Blood 2020)", cex.main = 1.8)

text(5, 8.8, "UK HMRN Population-Based Cohort", cex = 1.3, font = 2)

text(2.5, 7.8, "Metric", font = 2, cex = 1.1)
text(7, 7.8, "Value", font = 2, cex = 1.1)
segments(1, 7.5, 9, 7.5, lwd = 1)

text(2.5, 7.0, "Total Patients", cex = 1.1)
text(7, 7.0, "928", cex = 1.1, font = 2)
text(2.5, 6.4, "With Survival Data", cex = 1.1)
text(7, 6.4, "928 (100%)", cex = 1.1)
text(2.5, 5.8, "BCL2 Cluster (EZB equiv)", cex = 1.1)
text(7, 5.8, "237 (25.5%)", cex = 1.1, font = 2, col = "orange3")
text(2.5, 5.2, "Events in BCL2", cex = 1.1)
text(7, 5.2, "136 (57.4%)", cex = 1.1)
text(2.5, 4.6, "Median Follow-up", cex = 1.1)
text(7, 4.6, "79.8 months", cex = 1.1)

segments(1, 4.2, 9, 4.2, lwd = 1)

rect(1, 2.5, 9, 4.0, col = "honeydew", border = "darkgreen", lwd = 2)
text(5, 3.6, "ADVANTAGES:", cex = 1.1, font = 2, col = "darkgreen")
text(5, 3.1, "Pre-defined molecular subtypes (BCL2 = EZB equivalent)", cex = 0.95)
text(5, 2.7, "293-gene targeted panel includes P2RY8", cex = 0.95)

text(5, 1.5, "BCL2 cluster: 237 patients with survival data", cex = 1.2, font = 2)

# ===== SLIDE 12: REMoDL-B BCL2 Results =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("REMoDL-B BCL2 Subset: Pathway Mutation vs No Mutation (p = 0.86)", cex.main = 1.5)
rasterImage(remodlb_km_pathway, 0.05, 0.05, 0.95, 0.95)

# ===== SLIDE 13: REMoDL-B Score Categories =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("REMoDL-B BCL2 Subset: Score Categories (p = 0.37)", cex.main = 1.5)
rasterImage(remodlb_km_score, 0.05, 0.05, 0.95, 0.95)

# ===== SLIDE 14: REMoDL-B Key Finding =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("REMoDL-B BCL2: Key Findings", cex.main = 1.8)

# Summary stats
text(5, 9, "REMoDL-B BCL2 Subset Summary", cex = 1.4, font = 2)

text(2.5, 8.1, "Metric", font = 2, cex = 1.0)
text(7.5, 8.1, "Value", font = 2, cex = 1.0)
segments(1, 7.8, 9, 7.8, lwd = 1)

text(2.5, 7.4, "BCL2 patients", cex = 1.0)
text(7.5, 7.4, "237", cex = 1.0)
text(2.5, 6.9, "With pathway mutations", cex = 1.0)
text(7.5, 6.9, "56 (23.6%)", cex = 1.0)
text(2.5, 6.4, "Score 2+ patients", cex = 1.0)
text(7.5, 6.4, "2 (0.8%)", cex = 1.0, col = "red", font = 2)

segments(1, 6.0, 9, 6.0, lwd = 1)

text(2.5, 5.5, "Log-rank p-value", font = 2, cex = 1.0)
text(7.5, 5.5, "0.856", cex = 1.0)
text(2.5, 5.0, "Cox HR per unit", cex = 1.0)
text(7.5, 5.0, "0.91 (0.62-1.32)", cex = 1.0)

# Direction box
rect(1, 3.0, 9, 4.5, col = "lightyellow", border = "orange", lwd = 2)
text(5, 4.1, "DIRECTION: Same as Chapuy (pathway mutations = worse)", cex = 1.0, font = 2)
text(5, 3.5, "Median OS: 78 mo (mutated) vs 87 mo (no mutation)", cex = 0.95)

# Key limitation
rect(1, 1.2, 9, 2.7, col = "mistyrose", border = "red", lwd = 2)
text(5, 2.3, "LIMITATION: Only 2 patients with Score 2+", cex = 1.0, font = 2, col = "red")
text(5, 1.7, "Cannot adequately test high-score effect", cex = 0.95)

# ===== SLIDE 15: Cross-Cohort Comparison =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Cross-Cohort Comparison: EZB/BCL2 Subsets", cex.main = 1.8)

# Header
text(1.8, 8.8, "Cohort", font = 2, cex = 1.0)
text(3.5, 8.8, "N", font = 2, cex = 1.0)
text(4.8, 8.8, "Score 2+", font = 2, cex = 1.0)
text(6.3, 8.8, "Direction", font = 2, cex = 1.0)
text(8.0, 8.8, "P-value", font = 2, cex = 1.0)
text(9.3, 8.8, "Sig?", font = 2, cex = 1.0)

segments(0.5, 8.5, 9.7, 8.5, lwd = 1)

# Chapuy row (highlighted)
rect(0.5, 7.6, 9.7, 8.3, col = "lightyellow", border = NA)
text(1.8, 8.0, "Chapuy C3-EZB", cex = 0.95, font = 2)
text(3.5, 8.0, "28", cex = 0.95)
text(4.8, 8.0, "4 (14%)", cex = 0.95)
text(6.3, 8.0, "WORSE", cex = 0.95, font = 2, col = "red")
text(8.0, 8.0, "0.004", cex = 0.95, font = 2)
text(9.3, 8.0, "YES", cex = 0.95, font = 2, col = "darkgreen")

# Duke row
text(1.8, 7.2, "Duke EZB-like", cex = 0.95)
text(3.5, 7.2, "78", cex = 0.95)
text(4.8, 7.2, "8 (10%)", cex = 0.95)
text(6.3, 7.2, "BETTER", cex = 0.95, font = 2, col = "darkgreen")
text(8.0, 7.2, "0.085", cex = 0.95)
text(9.3, 7.2, "trend", cex = 0.95, col = "orange3")

# REMoDL-B row
text(1.8, 6.4, "REMoDL-B BCL2", cex = 0.95)
text(3.5, 6.4, "237", cex = 0.95)
text(4.8, 6.4, "2 (0.8%)", cex = 0.95, col = "red")
text(6.3, 6.4, "Worse", cex = 0.95, col = "orange3")
text(8.0, 6.4, "0.856", cex = 0.95)
text(9.3, 6.4, "No", cex = 0.95)

segments(0.5, 6.0, 9.7, 6.0, lwd = 1)

# Key observations
text(5, 5.3, "Key Observations:", cex = 1.2, font = 2)

rect(0.5, 3.5, 9.5, 5.0, col = "honeydew", border = "darkgreen", lwd = 2)
text(5, 4.6, "1. REMoDL-B has same DIRECTION as Chapuy (pathway mut = worse)", cex = 0.95)
text(5, 4.1, "2. But effect is NOT significant - very few Score 2+ patients", cex = 0.95)
text(5, 3.7, "3. Duke shows OPPOSITE direction (possible classification issues)", cex = 0.95)

rect(0.5, 1.5, 9.5, 3.2, col = "mistyrose", border = "red", lwd = 2)
text(5, 2.8, "CRITICAL GAP: Need cohort with adequate Score 2+ patients", cex = 1.0, font = 2)
text(5, 2.3, "Chapuy: 4 | Duke: 8 | REMoDL-B: 2", cex = 0.95)
text(5, 1.8, "Schmitz/NCI cohort (dbGaP pending) may provide this", cex = 0.95)

# ===== SLIDE 16: Possible Explanations =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Possible Explanations for Variable Results", cex.main = 1.8)

text(0.5, 9, "1. Classification Methods Differ", adj = 0, cex = 1.2, font = 2, col = "darkblue")
text(0.8, 8.4, "- Chapuy: NMF clustering + WES + copy number", adj = 0, cex = 1.0)
text(0.8, 7.9, "- Duke: Simple mutation-based rules (no BCL2 transloc)", adj = 0, cex = 1.0)
text(0.8, 7.4, "- REMoDL-B: Pre-defined model-based clustering (ICL)", adj = 0, cex = 1.0)

text(0.5, 6.6, "2. Pathway Gene Detection Varies", adj = 0, cex = 1.2, font = 2, col = "darkblue")
text(0.8, 6.0, "- Chapuy WES: All 9 genes detected", adj = 0, cex = 1.0)
text(0.8, 5.5, "- Duke: P2RY8 completely missing (PAR1 region issues)", adj = 0, cex = 1.0)
text(0.8, 5.0, "- REMoDL-B 293-gene panel: P2RY8 included but rare (4/237)", adj = 0, cex = 1.0)

text(0.5, 4.2, "3. Score 2+ Patients Very Rare", adj = 0, cex = 1.2, font = 2, col = "darkblue")
text(0.8, 3.6, "- Chapuy: 4/28 = 14%", adj = 0, cex = 1.0)
text(0.8, 3.1, "- Duke: 8/78 = 10%", adj = 0, cex = 1.0)
text(0.8, 2.6, "- REMoDL-B: 2/237 = 0.8% (very underpowered)", adj = 0, cex = 1.0)

text(0.5, 1.8, "4. Treatment Era/Population Differences", adj = 0, cex = 1.2, font = 2, col = "darkblue")
text(0.8, 1.2, "- REMoDL-B is UK population-based, R-CHOP era", adj = 0, cex = 1.0)

# ===== SLIDE 17: Conclusions =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Conclusions & Next Steps", cex.main = 1.8)

text(0.5, 9, "Key Findings:", adj = 0, cex = 1.3, font = 2)

text(0.8, 8.2, "1. Chapuy C3-EZB: Score >= 2 predicts poor survival (p = 0.004)", adj = 0, cex = 1.1)

text(0.8, 7.4, "2. Duke EZB: Opposite direction (Score 2+ = BETTER survival)", adj = 0, cex = 1.1)

text(0.8, 6.6, "3. REMoDL-B BCL2: Same direction as Chapuy but NOT significant", adj = 0, cex = 1.1)

rect(0.4, 4.8, 9.6, 6.2, col = "lightyellow", border = "orange", lwd = 2)
text(5, 5.8, "Direction consistent in 2/3 cohorts (Chapuy + REMoDL-B)", cex = 1.0, font = 2)
text(5, 5.3, "But too few Score 2+ patients for adequate validation", cex = 1.0)

text(0.5, 4.2, "Validation Still Needed:", adj = 0, cex = 1.2, font = 2, col = "darkblue")
text(0.8, 3.6, "- Schmitz/NCI cohort (dbGaP pending) - has LymphGen + WES", adj = 0, cex = 1.0)
text(0.8, 3.0, "- Cohorts with true BCL2 translocation status", adj = 0, cex = 1.0)
text(0.8, 2.4, "- Larger EZB-enriched cohorts with Score 2+ patients", adj = 0, cex = 1.0)

rect(0.4, 0.8, 9.6, 1.8, col = "lightblue", border = "steelblue", lwd = 2)
text(5, 1.3, "Consider focusing on BN2 subtype (Duke p = 0.065)", cex = 1.0, font = 2)

text(5, 0.3, paste("Analysis updated:", Sys.Date()), cex = 0.9, col = "gray50")

dev.off()

cat("Presentation saved to:", output_file, "\n")
cat("Total slides: 17\n")
cat("Includes: Chapuy + Duke + REMoDL-B validation cohorts\n")
