# S1P Pathway Analysis - PDF Presentation for PI
# Version 3: Includes Chapuy + Duke cohort validation
# Author: Eric Perkey

library(survival)
library(png)
library(grid)

project_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06"
chapuy_dir <- file.path(project_dir, "Chapuy")
duke_dir <- file.path(project_dir, "Duke")

output_file <- file.path(project_dir, "GC_Bcell_Positioning_Pathway_DLBCL_Presentation.pdf")
fig_dir <- file.path(chapuy_dir, "figures")
duke_fig_dir <- file.path(duke_dir, "figures")

# Read clinical data for stats
data <- read.csv(file.path(chapuy_dir, "data/processed/chapuy_s1p_clinical.csv"))
duke_data <- read.csv(file.path(duke_dir, "data/processed/duke_egress_scores.csv"))

# Load the pre-generated figures
pathway_img <- readPNG(file.path(fig_dir, "S1P_pathway_diagram.png"))
methods_img <- readPNG(file.path(fig_dir, "methodology_S1P_analysis.png"))

# Load Duke figures
duke_km_pathway <- readPNG(file.path(duke_fig_dir, "km_pathway_mutation.png"))
duke_km_egress <- readPNG(file.path(duke_fig_dir, "km_egress_score.png"))

pdf(output_file, width = 11, height = 8.5)

# ===== SLIDE 1: Title =====
par(mar = c(0, 0, 0, 0))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")

text(5, 7.5, "GC B-cell Positioning Pathway Mutations in DLBCL", cex = 2.2, font = 2)
text(5, 6, "Analysis of Chapuy et al. + Duke Validation Cohort", cex = 1.8)
text(5, 4.8, "Chapuy n=135 | Duke n=1001", cex = 1.4, col = "gray40")

text(5, 3, "Eric Perkey", cex = 1.5, font = 2)

text(5, 1.5, paste("Analysis Date:", Sys.Date()), cex = 1.2)
text(5, 0.8, "Data Source: cBioPortal", cex = 1, col = "gray50")

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

# ===== SLIDE 4: Representative Mutations - LoF vs GoF =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Representative Mutations: LoF vs GoF", cex.main = 1.8)

# RETENTION LoF SIDE
text(2.5, 9.2, "RETENTION LoF", font = 2, cex = 1.3, col = "darkgreen")

# S1PR2
text(0.3, 8.5, "S1PR2 (7TM GPCR):", adj = 0, font = 2, cex = 1.0, col = "darkgreen")
text(0.5, 8.0, "Q34P, C45R (N-term/TM1)", adj = 0, cex = 0.9)
text(0.5, 7.6, "L72P, L92P, L98M (TM2)", adj = 0, cex = 0.9)
text(0.5, 7.2, "L116R, A118V (TM3)", adj = 0, cex = 0.9)

# GNA13
text(0.3, 6.6, "GNA13 (G-alpha):", adj = 0, font = 2, cex = 1.0, col = "darkgreen")
text(0.5, 6.1, "Q27L (P-loop), G57S, G60D (GTPase)", adj = 0, cex = 0.9)
text(0.5, 5.7, "Q67*, K94*, Y189* (Nonsense)", adj = 0, cex = 0.9)
text(0.5, 5.3, "L319Kfs*38 (Frameshift)", adj = 0, cex = 0.9)

# RHOA
text(0.3, 4.7, "RHOA (Rho GTPase):", adj = 0, font = 2, cex = 1.0, col = "darkgreen")
text(0.5, 4.2, "R5W (pre-P-loop)", adj = 0, cex = 0.9)
text(0.5, 3.8, "T37K, Y42S (Switch I)", adj = 0, cex = 0.9)
text(0.5, 3.4, "L69P, Y66N (Switch II)", adj = 0, cex = 0.9)

# P2RY8
text(0.3, 2.8, "P2RY8 (7TM GPCR):", adj = 0, font = 2, cex = 1.0, col = "darkgreen")
text(0.5, 2.3, "W181* (Nonsense)", adj = 0, cex = 0.9)
text(0.5, 1.9, "Multiple TM missense", adj = 0, cex = 0.9)

# ARHGEF1
text(0.3, 1.3, "ARHGEF1 (RhoGEF):", adj = 0, font = 2, cex = 1.0, col = "darkgreen")
text(0.5, 0.8, "X515_splice (PH domain)", adj = 0, cex = 0.9)

# Dividing line
segments(5, 9.3, 5, 0.5, lwd = 2, col = "gray60")

# EGRESS GoF SIDE
text(7.5, 9.2, "EGRESS GoF", font = 2, cex = 1.3, col = "darkred")

# CXCR4
text(5.3, 8.5, "CXCR4 (7TM GPCR):", adj = 0, font = 2, cex = 1.0, col = "darkred")
text(5.5, 8.0, "F199S, F201Y (TM5)", adj = 0, cex = 0.9)
text(5.5, 7.6, "S338* (C-term truncation)", adj = 0, cex = 0.9)
rect(5.4, 7.0, 9.6, 7.4, col = "mistyrose", border = NA)
text(5.5, 7.2, "WHIM-like: prevents receptor", adj = 0, cex = 0.85, font = 3)
text(5.5, 6.85, "internalization = sustained signaling", adj = 0, cex = 0.85, font = 3)

# GNAI2
text(5.3, 6.3, "GNAI2 (G-alpha-i):", adj = 0, font = 2, cex = 1.0, col = "darkred")
text(5.5, 5.8, "Q45E, Q52H (Helical domain)", adj = 0, cex = 0.9)
text(5.5, 5.4, "Q205R, R209W (Switch II)", adj = 0, cex = 0.9)
text(5.5, 5.0, "K210T (GTPase domain)", adj = 0, cex = 0.9)

# RAC2
text(5.3, 4.4, "RAC2 (Rho GTPase):", adj = 0, font = 2, cex = 1.0, col = "darkred")
text(5.5, 3.9, "D11N, I21S (P-loop region)", adj = 0, cex = 0.9)
text(5.5, 3.5, "N39I (Switch I)", adj = 0, cex = 0.9)
text(5.5, 3.1, "R66H (Switch II)", adj = 0, cex = 0.9)
rect(5.4, 2.5, 9.6, 2.9, col = "mistyrose", border = NA)
text(5.5, 2.7, "Activating: enhanced GTP binding", adj = 0, cex = 0.85, font = 3)

# ARHGAP25
text(5.3, 2.1, "ARHGAP25 (RhoGAP):", adj = 0, font = 2, cex = 1.0, col = "darkred")
text(5.5, 1.6, "GAP domain mutations", adj = 0, cex = 0.9)
text(5.5, 1.2, "LoF of GAP = increased RAC", adj = 0, cex = 0.9, font = 3)

# ===== SLIDE 5: Results by Cluster =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Chapuy Cohort: Mutations by Genetic Cluster", cex.main = 1.8)

# Header
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

# Overall row
segments(0.3, 3.1, 9.7, 3.1, lwd = 1)
text(1.3, 2.6, "OVERALL", font = 2, cex = 0.95)
text(2.7, 2.6, "135", cex = 0.95, font = 2)
text(3.9, 2.6, "23.7%", cex = 0.95, col = "darkgreen", font = 2)
text(5.2, 2.6, "10.4%", cex = 0.95, col = "darkred", font = 2)
text(6.5, 2.6, "3.7%", cex = 0.95, col = "purple", font = 2)
text(7.7, 2.6, "30.4%", cex = 0.95, font = 2)

text(5, 1.4, "C3-EZB (GCB) has highest pathway involvement: 60.7%", cex = 1.2, font = 2, col = "orange3")
text(5, 0.7, "Driven by upstream retention defects (GNA13 25%, S1PR2 18%)", cex = 1.0)

# ===== SLIDE 6: Survival Analysis - Key Finding =====
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

# ===== SLIDE 7: Clinical Summary Table =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Chapuy C3-EZB: Clinical Outcomes by Egress Score", cex.main = 1.8)

text(2, 9, "Metric", font = 2, cex = 1.1)
text(4.5, 9, "Score 0", font = 2, cex = 1.1)
text(6.5, 9, "Score 1", font = 2, cex = 1.1)
text(8.5, 9, "Score 2+", font = 2, cex = 1.1, col = "red")

segments(1, 8.7, 9.5, 8.7, lwd = 1)

metrics <- c("N", "Deaths", "Death Rate", "Median OS (mo)", "Mean IPI")
s0 <- c("11", "4", "36.4%", "89.5", "1.82")
s1 <- c("12", "4", "33.3%", "Not reached", "2.54")
s2 <- c("4", "4", "100%", "13.2", "2.75")

for (i in 1:5) {
  y <- 8.2 - (i-1) * 1
  text(2, y, metrics[i], cex = 1.1, font = ifelse(i %in% c(3,4), 2, 1))
  text(4.5, y, s0[i], cex = 1.1)
  text(6.5, y, s1[i], cex = 1.1)
  col <- ifelse(i %in% c(3,4), "red", "black")
  text(8.5, y, s2[i], cex = 1.1, font = 2, col = col)
}

rect(1, 2.3, 9, 3.3, col = "lightyellow", border = "orange", lwd = 2)
text(5, 2.8, "Egress Score >= 2: 100% mortality, median OS 13.2 months", cex = 1.3, font = 2)

# ===== SLIDE 8: DUKE COHORT INTRODUCTION =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Validation: Duke DLBCL Cohort (Reddy et al. Cell 2017)", cex.main = 1.8)

text(5, 8.5, "Cohort Characteristics", cex = 1.5, font = 2)

# Table
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

text(2.5, 4.3, "Pathway Mutated", cex = 1.1)
text(7, 4.3, "154 (15.4%)", cex = 1.1, col = "darkblue", font = 2)

segments(1, 3.9, 9, 3.9, lwd = 1)

# Key difference
rect(1, 2.3, 9, 3.5, col = "lightyellow", border = "orange", lwd = 2)
text(5, 3.1, "KEY DIFFERENCE:", cex = 1.1, font = 2, col = "orange3")
text(5, 2.6, "Duke cohort lacks genetic subtype classification (EZB, etc.)", cex = 1.0)

text(5, 1.5, "Question: Does the Egress Score predict survival in unselected DLBCL?", cex = 1.2, font = 3)

# ===== SLIDE 9: DUKE MUTATION FREQUENCIES =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Duke Cohort: Pathway Mutation Frequencies", cex.main = 1.8)

# Comparison table
text(2, 8.8, "Gene", font = 2, cex = 1.0)
text(3.5, 8.8, "Pathway", font = 2, cex = 1.0)
text(5.3, 8.8, "Duke N", font = 2, cex = 1.0)
text(6.6, 8.8, "Duke %", font = 2, cex = 1.0)
text(8.2, 8.8, "Chapuy %", font = 2, cex = 1.0, col = "gray50")

segments(0.8, 8.5, 9.2, 8.5, lwd = 1)

genes <- c("GNA13", "RHOA", "GNAI2", "S1PR2", "CXCR4", "ARHGEF1", "P2RY8", "RAC2", "ARHGAP25")
pathways <- c("Retention", "Retention", "Egress", "Retention", "Egress", "Retention", "Retention", "Egress", "Egress")
duke_ns <- c(83, 30, 22, 19, 14, 0, 0, 0, 0)
duke_pcts <- c("8.3%", "3.0%", "2.2%", "1.9%", "1.4%", "0%", "0%", "0%", "0%")
chapuy_pcts <- c("8.9%", "4.4%", "3.0%", "4.4%", "1.5%", "0.7%", "8.9%", "3.0%", "3.7%")

for (i in 1:9) {
  y <- 8.0 - (i-1) * 0.55
  col <- ifelse(pathways[i] == "Retention", "darkgreen", "darkred")
  text(2, y, genes[i], cex = 0.95, col = col)
  text(3.5, y, pathways[i], cex = 0.95, col = col)
  text(5.3, y, duke_ns[i], cex = 0.95)
  text(6.6, y, duke_pcts[i], cex = 0.95, font = ifelse(duke_ns[i] > 20, 2, 1))
  text(8.2, y, chapuy_pcts[i], cex = 0.95, col = "gray50")
}

segments(0.8, 2.8, 9.2, 2.8, lwd = 1)

text(2.5, 2.3, "Any Pathway Mut", font = 2, cex = 0.95)
text(5.3, 2.3, "154", cex = 0.95, font = 2)
text(6.6, 2.3, "15.4%", cex = 0.95, font = 2)
text(8.2, 2.3, "30.4%", cex = 0.95, col = "gray50")

text(5, 1.3, "GNA13 is most commonly mutated (8.3%)", cex = 1.1, font = 2)
text(5, 0.7, "P2RY8, RAC2, ARHGAP25 not detected in Duke cohort", cex = 0.95, col = "gray40")

# ===== SLIDE 10: DUKE SURVIVAL - PATHWAY MUTATION =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("Duke: Survival by Pathway Mutation Status", cex.main = 1.6)
rasterImage(duke_km_pathway, 0.05, 0.05, 0.95, 0.95)

# ===== SLIDE 11: DUKE SURVIVAL - EGRESS SCORE =====
par(mar = c(0.5, 0.5, 1.5, 0.5))
plot(0, 0, type = "n", xlim = c(0, 1), ylim = c(0, 1), axes = FALSE, xlab = "", ylab = "")
title("Duke: Survival by Egress Score Categories", cex.main = 1.6)
rasterImage(duke_km_egress, 0.05, 0.05, 0.95, 0.95)

# ===== SLIDE 12: DUKE RESULTS SUMMARY =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Duke Cohort: Survival Analysis Results", cex.main = 1.8)

text(5, 9, "Summary of Statistical Tests", cex = 1.4, font = 2)

# Results table
text(2.5, 8, "Analysis", font = 2, cex = 1.1)
text(6, 8, "Log-rank p", font = 2, cex = 1.1)
text(8.5, 8, "Result", font = 2, cex = 1.1)

segments(1, 7.7, 9.5, 7.7, lwd = 1)

text(2.5, 7.2, "Any Pathway Mutation", cex = 1.1)
text(6, 7.2, "0.868", cex = 1.1)
text(8.5, 7.2, "NS", cex = 1.1, col = "gray50")

text(2.5, 6.6, "Egress Score (0/1/2+)", cex = 1.1)
text(6, 6.6, "0.165", cex = 1.1)
text(8.5, 6.6, "NS", cex = 1.1, col = "gray50")

text(2.5, 6.0, "GNA13 Mutation", cex = 1.1)
text(6, 6.0, "0.362", cex = 1.1)
text(8.5, 6.0, "NS", cex = 1.1, col = "gray50")

text(2.5, 5.4, "GNAI2 Mutation", cex = 1.1)
text(6, 5.4, "0.101", cex = 1.1)
text(8.5, 5.4, "Trend", cex = 1.1, col = "orange3")

segments(1, 5.0, 9.5, 5.0, lwd = 1)

# Interpretation box
rect(0.5, 2.5, 9.5, 4.7, col = "lightblue", border = "steelblue", lwd = 2)
text(5, 4.3, "INTERPRETATION", cex = 1.2, font = 2, col = "steelblue")
text(5, 3.7, "No significant survival association in unselected DLBCL", cex = 1.1)
text(5, 3.1, "This is CONSISTENT with the Chapuy finding being EZB-specific", cex = 1.1, font = 2)

text(5, 1.6, "The Egress Score prognostic effect appears to be", cex = 1.1)
text(5, 1.0, "context-dependent and subtype-specific (EZB)", cex = 1.2, font = 2, col = "darkblue")

# ===== SLIDE 13: CONCLUSIONS =====
par(mar = c(1, 1, 2, 1))
plot(0, 0, type = "n", xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
title("Conclusions & Next Steps", cex.main = 1.8)

text(0.5, 9, "Key Findings:", adj = 0, cex = 1.3, font = 2)

text(0.8, 8.2, "1. Chapuy C3-EZB: Egress Score >= 2 predicts poor survival (p = 0.004)", adj = 0, cex = 1.1)
text(1.1, 7.6, "- 100% mortality in Score 2+ vs 35% in Score 0", adj = 0, cex = 1.0)
text(1.1, 7.1, "- Median OS: 13.2 mo (Score 2+) vs 89.5 mo (Score 0)", adj = 0, cex = 1.0)

text(0.8, 6.2, "2. Duke cohort: No survival association in unselected DLBCL (p = 0.87)", adj = 0, cex = 1.1)
text(1.1, 5.6, "- Effect appears to be EZB-subtype specific", adj = 0, cex = 1.0)

rect(0.4, 3.9, 9.6, 5.1, col = "lightyellow", border = "orange", lwd = 2)
text(0.8, 4.7, "3. Biological Interpretation:", adj = 0, cex = 1.1, font = 2)
text(1.1, 4.2, "GC retention pathway defects may enable dissemination specifically in EZB DLBCL", adj = 0, cex = 1.0)

text(0.5, 3.2, "Validation Needed:", adj = 0, cex = 1.2, font = 2, col = "darkblue")
text(0.8, 2.6, "- Schmitz/NCI cohort (dbGaP access pending) - has EZB classification", adj = 0, cex = 1.0)
text(0.8, 2.0, "- LymphGen-classified cohorts", adj = 0, cex = 1.0)
text(0.8, 1.4, "- UChicago Hoogland Lymphoma Biobank", adj = 0, cex = 1.0)

text(5, 0.5, paste("Analysis updated:", Sys.Date()), cex = 0.9, col = "gray50")

dev.off()

cat("Presentation saved to:", output_file, "\n")
cat("Total slides: 13\n")
cat("Includes: Chapuy analysis + Duke validation cohort\n")
