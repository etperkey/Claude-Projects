# S1P Pathway Analysis - PDF Presentation for PI
# Version 7: Chapuy + Duke + GAMBL Reanalysis (REMoDL-B removed for redo)
# Author: Eric Perkey

library(survival)
library(png)
library(grid)
library(dplyr)

project_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06"
chapuy_dir <- file.path(project_dir, "Chapuy_Broad")
duke_dir <- file.path(project_dir, "Reddy_Duke")
gambl_dir <- file.path(project_dir, "Dreval_GAMBL")

output_file <- file.path(project_dir, "GC_Bcell_Positioning_Pathway_DLBCL_Presentation.pdf")
fig_dir <- file.path(chapuy_dir, "figures")
duke_fig_dir <- file.path(duke_dir, "figures")
gambl_fig_dir <- file.path(gambl_dir, "data/processed")

# Read clinical data for stats
data <- read.csv(file.path(chapuy_dir, "data/processed/chapuy_s1p_clinical.csv"))
duke_data <- read.csv(file.path(duke_dir, "data/processed/duke_classified.csv"))
gambl_freq <- read.csv(file.path(gambl_dir, "data/processed/gambl_vs_duke_frequencies.csv"))
gambl_ezb <- read.csv(file.path(gambl_dir, "data/processed/gambl_ezb_results.csv"))

# Load the pre-generated figures
pathway_img <- readPNG(file.path(fig_dir, "S1P_pathway_diagram.png"))
methods_img <- readPNG(file.path(fig_dir, "methodology_S1P_analysis.png"))

# Load Duke figures
duke_ezb_egress <- readPNG(file.path(duke_fig_dir, "km_ezb_egress_score.png"))

# Load GAMBL figures
gambl_ezb_surv <- readPNG(file.path(gambl_fig_dir, "gambl_ezb_survival.png"))
gambl_ezb_score2 <- readPNG(file.path(gambl_fig_dir, "gambl_ezb_survival_score2.png"))

# Load gene comparison heatmap
gene_heatmap <- readPNG(file.path(project_dir, "global_figures/pathway_gene_heatmap.png"))

pdf(output_file, width = 11, height = 8.5)

# ===== SLIDE 1: Title =====
par(mar = c(0, 0, 0, 0))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")

text(5, 7.5, "GC B-cell Positioning Pathway Mutations in DLBCL", cex = 2.2, font = 2)
text(5, 6, "Analysis of Chapuy + Duke/GAMBL Cohorts", cex = 1.8)
text(5, 4.8, "Chapuy n=135 | Duke/GAMBL n=969", cex = 1.4, col = "gray40")

text(5, 3, "Eric Perkey", cex = 1.5, font = 2)

text(5, 1.5, paste("Analysis Date:", Sys.Date()), cex = 1.2)
text(5, 0.8, "Data Source: cBioPortal, GAMBL/bioRxiv", cex = 1, col = "gray50")

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
text(5, 2.8, "2. Duke missing 4/9 pathway genes (P2RY8, ARHGEF1, RAC2, ARHGAP25)", cex = 0.9)

# ===== SLIDE 9: GAMBL Introduction =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("GAMBL Reanalysis of Duke Data", cex.main = 1.8)

text(5, 9, "Dreval et al. 'Revisiting Reddy: A DLBCL Do-over' (bioRxiv 2023)", cex = 1.1, font = 3)

rect(0.5, 6.5, 9.5, 8.5, col = "lightblue", border = "steelblue", lwd = 2)
text(5, 8.0, "GAMBL: Improved variant calling pipeline", cex = 1.2, font = 2, col = "steelblue")
text(5, 7.3, "Reanalyzed Reddy/Duke DLBCL data (n=969 samples)", cex = 1.0)
text(5, 6.8, "Found thousands of missed mutations in original analysis", cex = 1.0)

# Frequency comparison table
text(5, 5.8, "Pathway Gene Frequencies: GAMBL vs Original Duke", cex = 1.1, font = 2)

text(2.0, 5.2, "Gene", font = 2, cex = 0.95)
text(4.0, 5.2, "GAMBL", font = 2, cex = 0.95, col = "steelblue")
text(5.8, 5.2, "Duke", font = 2, cex = 0.95, col = "gray50")
text(7.5, 5.2, "Difference", font = 2, cex = 0.95)
segments(0.8, 4.9, 8.5, 4.9, lwd = 1)

genes <- c("GNA13", "RHOA", "GNAI2", "S1PR2", "CXCR4")
gambl_pcts <- c("8.6%", "3.1%", "2.3%", "2.0%", "1.1%")
duke_pcts <- c("8.3%", "3.0%", "2.2%", "1.9%", "1.4%")
diffs <- c("+0.3%", "+0.1%", "+0.1%", "+0.1%", "-0.3%")

for (i in 1:5) {
  y <- 4.5 - (i-1) * 0.5
  text(2.0, y, genes[i], cex = 0.9)
  text(4.0, y, gambl_pcts[i], cex = 0.9, col = "steelblue")
  text(5.8, y, duke_pcts[i], cex = 0.9, col = "gray50")
  text(7.5, y, diffs[i], cex = 0.9, col = ifelse(startsWith(diffs[i], "+"), "darkgreen", "red"))
}

rect(0.5, 0.8, 9.5, 2.2, col = "lightyellow", border = "orange", lwd = 2)
text(5, 1.8, "KEY FINDING: GAMBL didn't substantially change pathway frequencies", cex = 1.0, font = 2)
text(5, 1.3, "Missing genes (P2RY8, ARHGEF1, RAC2, ARHGAP25) still missing", cex = 0.95)
text(5, 0.9, "These genes weren't in the original Reddy sequencing panel", cex = 0.9, font = 3)

# ===== SLIDE 10: GAMBL EZB Survival Score >= 1 =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("GAMBL EZB Subset (n=314): Score >= 1 vs 0 (p = 0.61)", cex.main = 1.5)
rasterImage(gambl_ezb_surv, 0.05, 0.05, 0.95, 0.95)

# ===== SLIDE 11: GAMBL EZB Score >= 2 =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("GAMBL EZB: Score >= 2 vs < 2 (p = 0.058) - APPROACHING SIGNIFICANCE", cex.main = 1.3, col.main = "purple")
rasterImage(gambl_ezb_score2, 0.05, 0.05, 0.95, 0.95)

# ===== SLIDE 12: GAMBL EZB Finding Summary =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("GAMBL EZB: Surprising Result", cex.main = 1.8)

rect(0.5, 6.5, 9.5, 9.5, col = "honeydew", border = "darkgreen", lwd = 3)
text(5, 9.0, "Score >= 2 in GAMBL EZB (n=11):", cex = 1.3, font = 2, col = "darkgreen")
text(5, 8.2, "0 deaths (0%) - BETTER survival!", cex = 1.2, font = 2)
text(5, 7.4, "p = 0.058 (approaching significance)", cex = 1.1)
text(5, 6.8, "Score < 2: 84/303 deaths (28%)", cex = 1.0)

rect(0.5, 3.5, 9.5, 6.2, col = "mistyrose", border = "red", lwd = 2)
text(5, 5.8, "OPPOSITE DIRECTION vs Chapuy EZB!", cex = 1.2, font = 2, col = "red")
text(5, 5.2, "Chapuy EZB Score >= 2: 100% mortality, 13.2 mo median OS", cex = 1.0)
text(5, 4.6, "GAMBL EZB Score >= 2: 0% mortality, median OS not reached", cex = 1.0)
text(5, 3.9, "Gene coverage issue explains discrepancy (4 genes missing)", cex = 0.95, font = 3)

rect(0.5, 1.5, 9.5, 3.2, col = "lightyellow", border = "orange", lwd = 2)
text(5, 2.7, "INTERPRETATION:", cex = 1.0, font = 2)
text(5, 2.2, "GAMBL Score mainly reflects GNA13/RHOA (retention genes)", cex = 0.95)
text(5, 1.7, "Missing egress genes (P2RY8, RAC2, ARHGAP25) may explain reversed effect", cex = 0.9)

# ===== SLIDE 13: Cross-Cohort Summary =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Cross-Cohort Comparison: EZB Subsets", cex.main = 1.8)

# Header
text(1.8, 9.0, "Cohort", font = 2, cex = 1.0)
text(3.5, 9.0, "N", font = 2, cex = 1.0)
text(4.8, 9.0, "% Mut", font = 2, cex = 1.0)
text(6.2, 9.0, "Direction", font = 2, cex = 1.0)
text(7.6, 9.0, "P-value", font = 2, cex = 1.0)
text(9.0, 9.0, "Genes", font = 2, cex = 1.0)

segments(0.5, 8.7, 9.7, 8.7, lwd = 1)

# Chapuy row (highlighted)
rect(0.5, 7.9, 9.7, 8.6, col = "lightyellow", border = NA)
text(1.8, 8.25, "Chapuy C3-EZB", cex = 0.95, font = 2)
text(3.5, 8.25, "28", cex = 0.95)
text(4.8, 8.25, "60.7%", cex = 0.95)
text(6.2, 8.25, "WORSE", cex = 0.95, font = 2, col = "red")
text(7.6, 8.25, "0.004", cex = 0.95, font = 2)
text(9.0, 8.25, "9/9", cex = 0.95, col = "darkgreen")

# Duke EZB row
text(1.8, 7.4, "Duke EZB", cex = 0.95)
text(3.5, 7.4, "83", cex = 0.95)
text(4.8, 7.4, "55.1%", cex = 0.95)
text(6.2, 7.4, "BETTER", cex = 0.95, font = 2, col = "darkgreen")
text(7.6, 7.4, "0.16", cex = 0.95)
text(9.0, 7.4, "5/9", cex = 0.95, col = "red")

# GAMBL EZB row (highlighted)
rect(0.5, 6.2, 9.7, 6.9, col = "lightblue", border = NA)
text(1.8, 6.55, "GAMBL EZB", cex = 0.95, font = 2)
text(3.5, 6.55, "314", cex = 0.95)
text(4.8, 6.55, "29.6%", cex = 0.95)
text(6.2, 6.55, "BETTER", cex = 0.95, font = 2, col = "darkgreen")
text(7.6, 6.55, "0.058", cex = 0.95)
text(9.0, 6.55, "5/9", cex = 0.95, col = "red")

segments(0.5, 5.8, 9.7, 5.8, lwd = 1)

# Gene coverage box
rect(0.5, 4.0, 9.5, 5.5, col = "mistyrose", border = "red", lwd = 2)
text(5, 5.1, "GENE COVERAGE IS CRITICAL", cex = 1.2, font = 2, col = "red")
text(5, 4.5, "Cohorts with 5/9 genes show OPPOSITE DIRECTION from Chapuy (9/9)", cex = 1.0)

# Interpretation
rect(0.5, 1.8, 9.5, 3.7, col = "honeydew", border = "darkgreen", lwd = 2)
text(5, 3.3, "KEY INSIGHT:", cex = 1.1, font = 2)
text(5, 2.8, "Full pathway (9 genes) = WORSE survival (Chapuy)", cex = 1.0)
text(5, 2.3, "Partial pathway (5 genes) = BETTER survival (Duke/GAMBL)", cex = 1.0)

text(5, 1.2, "Missing egress genes (P2RY8, RAC2, ARHGAP25) likely drive poor prognosis", cex = 0.95, font = 3)

# ===== SLIDE 14: Gene Coverage Comparison =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("Pathway Gene Detection: Critical Gaps Across Cohorts", cex.main = 1.5)
rasterImage(gene_heatmap, 0.02, 0.02, 0.98, 0.92)

# ===== SLIDE 15: Gene Coverage Summary =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Gene Coverage: Key Differences Explain Discrepancies", cex.main = 1.7)

# Header
text(1.5, 9.2, "Gene", font = 2, cex = 1.0)
text(4.0, 9.2, "Chapuy", font = 2, cex = 1.0)
text(6.5, 9.2, "Duke/GAMBL", font = 2, cex = 1.0, col = "steelblue")
text(9.0, 9.2, "Notes", font = 2, cex = 0.9)
segments(0.5, 8.9, 9.7, 8.9, lwd = 1)

# RETENTION GENES
text(0.7, 8.5, "RETENTION LoF", adj = 0, font = 2, cex = 0.9, col = "darkgreen")

genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA")
chapuy_vals <- c("4.4%", "8.9%", "0.7%", "8.9%", "4.4%")
gambl_vals <- c("2.0%", "8.6%", "-", "-", "3.1%")
notes <- c("Similar", "Similar", "GAMBL 0!", "GAMBL 0!", "Similar")
issue <- c(FALSE, FALSE, TRUE, TRUE, FALSE)

for (i in 1:5) {
  y <- 8.1 - (i-1) * 0.55
  if (issue[i]) rect(0.5, y - 0.22, 9.7, y + 0.22, col = "mistyrose", border = NA)
  text(1.5, y, genes[i], cex = 0.95)
  text(4.0, y, chapuy_vals[i], cex = 0.95)
  text(6.5, y, gambl_vals[i], cex = 0.95, col = ifelse(gambl_vals[i] == "-", "red", "steelblue"), font = ifelse(gambl_vals[i] == "-", 2, 1))
  text(9.0, y, notes[i], cex = 0.85, col = ifelse(issue[i], "red", "gray50"))
}

# EGRESS GENES
text(0.7, 5.2, "EGRESS GoF", adj = 0, font = 2, cex = 0.9, col = "darkred")

genes2 <- c("CXCR4", "GNAI2", "RAC2", "ARHGAP25")
chapuy_vals2 <- c("1.5%", "3.0%", "3.0%", "3.7%")
gambl_vals2 <- c("1.1%", "2.3%", "-", "-")
notes2 <- c("Similar", "Similar", "GAMBL 0!", "GAMBL 0!")
issue2 <- c(FALSE, FALSE, TRUE, TRUE)

for (i in 1:4) {
  y <- 4.8 - (i-1) * 0.55
  if (issue2[i]) rect(0.5, y - 0.22, 9.7, y + 0.22, col = "mistyrose", border = NA)
  text(1.5, y, genes2[i], cex = 0.95)
  text(4.0, y, chapuy_vals2[i], cex = 0.95)
  text(6.5, y, gambl_vals2[i], cex = 0.95, col = ifelse(gambl_vals2[i] == "-", "red", "steelblue"), font = ifelse(gambl_vals2[i] == "-", 2, 1))
  text(9.0, y, notes2[i], cex = 0.85, col = ifelse(issue2[i], "red", "gray50"))
}

segments(0.5, 2.4, 9.7, 2.4, lwd = 1)

# Key finding box
rect(0.3, 0.8, 9.7, 2.2, col = "lightblue", border = "steelblue", lwd = 2)
text(5, 1.8, "DUKE/GAMBL: 4 genes missing from Reddy sequencing panel", cex = 1.0, font = 2, col = "steelblue")
text(5, 1.3, "P2RY8, ARHGEF1, RAC2, ARHGAP25 - can't be reanalyzed", cex = 0.95)

# ===== SLIDE 16: Conclusions =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Conclusions & Next Steps", cex.main = 1.8)

text(0.5, 9.3, "Key Findings:", adj = 0, cex = 1.3, font = 2)

text(0.8, 8.5, "1. Chapuy C3-EZB: Score >= 2 predicts poor survival (p = 0.004)", adj = 0, cex = 1.0)
text(1.2, 8.0, "   All 9 pathway genes available in WES data", adj = 0, cex = 0.9, col = "darkgreen")

text(0.8, 7.2, "2. Duke/GAMBL EZB: Score >= 2 shows BETTER survival (p = 0.058)", adj = 0, cex = 1.0)
text(1.2, 6.7, "   Only 5/9 genes in Reddy panel - cannot detect full pathway", adj = 0, cex = 0.9, col = "steelblue")

rect(0.4, 4.6, 9.6, 6.3, col = "mistyrose", border = "red", lwd = 3)
text(5, 5.9, "CRITICAL: Full gene panel (9/9) required to see effect", cex = 1.1, font = 2, col = "red")
text(5, 5.3, "Missing egress genes (P2RY8, RAC2, ARHGAP25) appear essential", cex = 0.95)
text(5, 4.8, "Partial pathway (5/9 genes) shows OPPOSITE direction", cex = 0.95)

text(0.5, 4.0, "Next Steps:", adj = 0, cex = 1.2, font = 2, col = "darkblue")
text(0.8, 3.4, "- Schmitz/NCI cohort (dbGaP pending) - has all 9 genes + large sample", adj = 0, cex = 0.95)
text(0.8, 2.8, "- Need cohorts with complete pathway coverage", adj = 0, cex = 0.95)
text(0.8, 2.2, "- Focus on finding Score 2+ patients with full gene panel", adj = 0, cex = 0.95)

rect(0.4, 0.7, 9.6, 1.7, col = "honeydew", border = "darkgreen", lwd = 2)
text(5, 1.2, "GAMBL confirms: Duke variant calling was reasonable - issue is gene panel coverage", cex = 0.9, font = 2)

text(5, 0.2, paste("Analysis updated:", Sys.Date()), cex = 0.9, col = "gray50")

dev.off()

cat("Presentation saved to:", output_file, "\n")
cat("Total slides: 16\n")
cat("Contents: Chapuy + Duke + GAMBL (REMoDL-B removed for redo)\n")
