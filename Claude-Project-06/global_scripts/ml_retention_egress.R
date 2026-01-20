# Machine Learning Model for Retention/Egress Pathways in DLBCL
# Hypothesis: Lymphocyte trafficking genes predict outcome

library(dplyr)
library(survival)
library(glmnet)
library(survminer)
library(ggplot2)

select <- dplyr::select

base_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06"

cat("=============================================================\n")
cat("   RETENTION/EGRESS ML SURVIVAL MODEL\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. DEFINE RETENTION/EGRESS GENE SETS
#------------------------------------------------------------------------------
cat("=== Defining Retention/Egress Gene Sets ===\n\n")

# RETENTION genes - signals that keep cells in lymphoid tissues
retention_genes <- c(
  # Chemokine receptors (homing/retention)
  "CXCR4",    # Major retention signal, CXCL12 receptor
  "CXCR5",    # B-cell follicle homing
  "CCR7",     # T-zone homing
  "CCR6",     # Mucosal homing
  "CXCR3",    # Inflammatory homing

  # Chemokine ligands
  "CXCL12",   # SDF-1, major retention factor
  "CXCL13",   # B-cell attractant
  "CCL19",    # T-zone chemokine
  "CCL21",    # T-zone/HEV chemokine

  # Integrins and adhesion (retention)
  "ITGA4",    # VLA-4 alpha (CD49d)
  "ITGB1",    # VLA-4 beta (CD29)
  "ITGAL",    # LFA-1 alpha (CD11a)
  "ITGB2",    # LFA-1 beta (CD18)
  "ITGB7",    # Gut homing integrin
  "CD44",     # Hyaluronan receptor
  "SELL",     # CD62L, L-selectin
  "SELPLG",   # PSGL-1

  # Adhesion ligands (stromal)
  "VCAM1",    # VCAM-1
  "ICAM1",    # ICAM-1
  "ICAM2",    # ICAM-2
  "MADCAM1",  # MAdCAM-1

  # Signaling molecules
  "DOCK2",    # Rac activator, chemotaxis
  "RAC1",     # Rho GTPase
  "RAC2",     # Hematopoietic Rac
  "GNAI2",    # G-protein signaling
  "PIK3CG",   # PI3K gamma
  "PREX1",    # Rac-GEF

  # Survival/retention niche
  "TNFRSF13B", # TACI
  "TNFRSF13C", # BAFF-R
  "TNFRSF17",  # BCMA
  "TNFSF13B",  # BAFF
  "IL7R",      # IL-7 receptor
  "IL21R"      # IL-21 receptor
)

# EGRESS genes - signals that promote cell exit from tissues
egress_genes <- c(
  # Sphingosine-1-phosphate receptors (major egress)
  "S1PR1",    # Primary egress receptor
  "S1PR2",    # Retention signal (antagonizes S1PR1)
  "S1PR3",    # Egress
  "S1PR4",    # Lymphocyte function
  "S1PR5",    # NK cell egress


  # S1P metabolism
  "SPHK1",    # Sphingosine kinase 1
  "SPHK2",    # Sphingosine kinase 2
  "SGPL1",    # S1P lyase
  "SGPP1",    # S1P phosphatase

  # Transcriptional regulators of egress
  "KLF2",     # Master regulator of egress
  "FOXO1",    # Promotes S1PR1 expression

  # Egress-promoting chemokines
  "CXCL9",    # Inflammatory egress

  "CXCL10",   # Inflammatory egress
  "CXCL11",   # Inflammatory egress

  # Matrix remodeling (egress)
  "MMP2",     # Matrix metalloproteinase
  "MMP9",     # Matrix metalloproteinase
  "MMP14",    # Membrane MMP

  # Motility
  "CDC42",    # Cell polarity
  "RHOA",     # Cell migration
  "ROCK1",    # Rho kinase
  "ROCK2",    # Rho kinase
  "MYH9",     # Myosin
  "ACTB",     # Actin
  "ARPC2",    # Arp2/3 complex

  # Downregulation of retention
  "GRK2",     # GPCR kinase (desensitization)
  "ARRB1",    # Beta-arrestin
  "ARRB2"     # Beta-arrestin
)

# Combined trafficking genes
all_trafficking <- unique(c(retention_genes, egress_genes))

cat("Retention genes:", length(retention_genes), "\n")
cat("Egress genes:", length(egress_genes), "\n")
cat("Total unique trafficking genes:", length(all_trafficking), "\n\n")

#------------------------------------------------------------------------------
# 2. LOAD DATA
#------------------------------------------------------------------------------
cat("=== Loading Data ===\n")

# Load clinical data
tegress_scores <- read.csv(file.path(base_dir, "Lacy_HMRN/results/tegress_scores.csv"),
                           stringsAsFactors = FALSE)
clinical <- tegress_scores %>%
  filter(!is.na(OS_status) & !is.na(OS_time) & OS_time > 0)

# Load expression data
series_file <- file.path(base_dir, "Lacy_HMRN/GSE181063_series_matrix.txt.gz")

con <- gzfile(series_file, "r")
line_num <- 0
while (TRUE) {
  line <- readLines(con, n = 1)
  line_num <- line_num + 1
  if (length(line) == 0) break
  if (grepl("^!series_matrix_table_begin", line)) break
}
close(con)

expr_data <- read.delim(gzfile(series_file), skip = line_num, header = TRUE,
                        stringsAsFactors = FALSE, check.names = FALSE)
expr_data <- expr_data[!grepl("series_matrix_table_end", expr_data[,1]), ]
rownames(expr_data) <- expr_data[,1]
expr_data <- expr_data[, -1]

# Load annotation from previous survival analysis
global_surv <- read.csv(file.path(base_dir, "global_scripts/survival_global_annotated.csv"),
                        stringsAsFactors = FALSE)

cat("Expression:", nrow(expr_data), "probes x", ncol(expr_data), "samples\n")
cat("Clinical:", nrow(clinical), "samples\n\n")

#------------------------------------------------------------------------------
# 3. MAP GENES TO PROBES
#------------------------------------------------------------------------------
cat("=== Mapping Trafficking Genes to Probes ===\n")

# Create probe-to-gene mapping
probe_gene_map <- global_surv %>%
  filter(!is.na(gene)) %>%
  select(probe, gene) %>%
  distinct()

# Find probes for retention genes
retention_probes <- probe_gene_map %>%
  filter(gene %in% retention_genes)

# Find probes for egress genes
egress_probes <- probe_gene_map %>%
  filter(gene %in% egress_genes)

cat("Retention genes found:", length(unique(retention_probes$gene)), "/",
    length(retention_genes), "\n")
cat("Egress genes found:", length(unique(egress_probes$gene)), "/",
    length(egress_genes), "\n")

# List missing genes
missing_retention <- setdiff(retention_genes, retention_probes$gene)
missing_egress <- setdiff(egress_genes, egress_probes$gene)

if (length(missing_retention) > 0) {
  cat("\nMissing retention genes:", paste(missing_retention, collapse = ", "), "\n")
}
if (length(missing_egress) > 0) {
  cat("Missing egress genes:", paste(missing_egress, collapse = ", "), "\n")
}

# Combine all trafficking probes
trafficking_probes <- rbind(
  retention_probes %>% mutate(category = "Retention"),
  egress_probes %>% mutate(category = "Egress")
)

cat("\nTotal trafficking probes:", nrow(trafficking_probes), "\n")

#------------------------------------------------------------------------------
# 4. UNIVARIATE SURVIVAL ANALYSIS OF TRAFFICKING GENES
#------------------------------------------------------------------------------
cat("\n=== Univariate Survival Analysis of Trafficking Genes ===\n")

# Prepare data
common_samples <- intersect(colnames(expr_data), clinical$sample_id)
expr_mat <- as.matrix(expr_data[, common_samples])
expr_mat <- apply(expr_mat, 2, as.numeric)
rownames(expr_mat) <- rownames(expr_data)

clin_aligned <- clinical[match(common_samples, clinical$sample_id), ]

# Run Cox regression for each trafficking probe
trafficking_results <- data.frame()

for (i in 1:nrow(trafficking_probes)) {
  probe <- trafficking_probes$probe[i]
  gene <- trafficking_probes$gene[i]
  category <- trafficking_probes$category[i]

  if (probe %in% rownames(expr_mat)) {
    expr_vals <- as.numeric(expr_mat[probe, ])

    # Standardize expression
    expr_z <- scale(expr_vals)[,1]

    tryCatch({
      cox_fit <- coxph(Surv(clin_aligned$OS_time, clin_aligned$OS_status) ~ expr_z)
      cox_sum <- summary(cox_fit)

      trafficking_results <- rbind(trafficking_results, data.frame(
        probe = probe,
        gene = gene,
        category = category,
        HR = cox_sum$conf.int[1, "exp(coef)"],
        HR_lower = cox_sum$conf.int[1, "lower .95"],
        HR_upper = cox_sum$conf.int[1, "upper .95"],
        p_value = cox_sum$coefficients[1, "Pr(>|z|)"],
        z_score = cox_sum$coefficients[1, "z"],
        direction = ifelse(cox_sum$conf.int[1, "exp(coef)"] > 1, "Adverse", "Protective")
      ))
    }, error = function(e) NULL)
  }
}

# FDR correction
trafficking_results$FDR <- p.adjust(trafficking_results$p_value, method = "BH")

# Sort by significance
trafficking_results <- trafficking_results %>%
  arrange(p_value)

cat("\nTop 20 Trafficking Genes by Significance:\n\n")
print(head(trafficking_results %>%
             select(gene, category, HR, p_value, FDR, direction), 20))

# Summary by category
cat("\n\n=== Summary by Category ===\n")
category_summary <- trafficking_results %>%
  group_by(category, direction) %>%
  summarise(
    n_genes = n(),
    n_sig_nominal = sum(p_value < 0.05),
    n_sig_fdr = sum(FDR < 0.1),
    .groups = "drop"
  )
print(category_summary)

# Save results
write.csv(trafficking_results,
          file.path(base_dir, "global_scripts/trafficking_survival_results.csv"),
          row.names = FALSE)

#------------------------------------------------------------------------------
# 5. BUILD ML MODEL FOR RETENTION/EGRESS SIGNATURE
#------------------------------------------------------------------------------
cat("\n\n=== Building ML Model for Trafficking Signature ===\n")

# Extract trafficking probe expression
trafficking_probe_ids <- trafficking_probes$probe[trafficking_probes$probe %in% rownames(expr_mat)]
X_traffic <- t(expr_mat[trafficking_probe_ids, ])
y_traffic <- Surv(clin_aligned$OS_time, clin_aligned$OS_status)

cat("Feature matrix:", nrow(X_traffic), "samples x", ncol(X_traffic), "features\n")
cat("Events:", sum(clin_aligned$OS_status), "\n\n")

# Standardize
X_scaled <- scale(X_traffic)
X_scaled[is.na(X_scaled)] <- 0

# Elastic Net Cox Model
set.seed(42)
cat("Training Elastic Net Cox model...\n")

cv_enet <- cv.glmnet(X_scaled, y_traffic, family = "cox", alpha = 0.5,
                     nfolds = 10, type.measure = "C")

# Get selected features
coef_enet <- coef(cv_enet, s = "lambda.min")
selected_probes <- rownames(coef_enet)[which(coef_enet[,1] != 0)]

cat("Selected probes:", length(selected_probes), "\n")

# Map back to genes
selected_genes <- trafficking_probes %>%
  filter(probe %in% selected_probes) %>%
  select(probe, gene, category)

cat("\nSelected genes by category:\n")
print(table(selected_genes$category))

# Create signature data frame
signature_coefs <- data.frame(
  probe = selected_probes,
  coefficient = coef_enet[selected_probes, 1]
) %>%
  left_join(trafficking_probes, by = "probe") %>%
  mutate(
    HR = exp(coefficient),
    direction = ifelse(coefficient > 0, "Adverse", "Protective")
  ) %>%
  arrange(desc(abs(coefficient)))

cat("\nTop Trafficking Signature Genes:\n")
print(head(signature_coefs %>% select(gene, category, coefficient, HR, direction), 15))

# Calculate risk scores
risk_scores <- as.vector(predict(cv_enet, newx = X_scaled, s = "lambda.min", type = "link"))

# Risk stratification
risk_tertiles <- cut(risk_scores,
                     breaks = quantile(risk_scores, c(0, 0.33, 0.67, 1)),
                     labels = c("Low", "Intermediate", "High"),
                     include.lowest = TRUE)

surv_data <- data.frame(
  sample_id = common_samples,
  time = clin_aligned$OS_time,
  status = clin_aligned$OS_status,
  risk_score = risk_scores,
  risk_group = risk_tertiles,
  COO = clin_aligned$COO
)

# C-index
c_index <- concordance(y_traffic ~ risk_scores)$concordance
cat("\nTrafficking Signature C-index:", round(c_index, 4), "\n")

# Log-rank test
surv_diff <- survdiff(Surv(time, status) ~ risk_group, data = surv_data)
p_logrank <- 1 - pchisq(surv_diff$chisq, df = 2)
cat("Log-rank p-value:", signif(p_logrank, 3), "\n")

#------------------------------------------------------------------------------
# 6. RETENTION vs EGRESS BALANCE SCORE
#------------------------------------------------------------------------------
cat("\n\n=== Retention vs Egress Balance Analysis ===\n")

# Calculate separate scores for retention and egress
retention_probe_ids <- retention_probes$probe[retention_probes$probe %in% rownames(expr_mat)]
egress_probe_ids <- egress_probes$probe[egress_probes$probe %in% rownames(expr_mat)]

# Mean expression for each category (z-scored)
X_retention <- scale(t(expr_mat[retention_probe_ids, ]))
X_egress <- scale(t(expr_mat[egress_probe_ids, ]))

retention_score <- rowMeans(X_retention, na.rm = TRUE)
egress_score <- rowMeans(X_egress, na.rm = TRUE)

# Balance score: Retention - Egress (positive = more retention)
balance_score <- retention_score - egress_score

# Cox regression on balance score
balance_cox <- coxph(y_traffic ~ balance_score)
balance_summary <- summary(balance_cox)

cat("Retention-Egress Balance Score:\n")
cat("  HR:", round(balance_summary$conf.int[1, "exp(coef)"], 3), "\n")
cat("  95% CI:", round(balance_summary$conf.int[1, "lower .95"], 3), "-",
    round(balance_summary$conf.int[1, "upper .95"], 3), "\n")
cat("  P-value:", signif(balance_summary$coefficients[1, "Pr(>|z|)"], 3), "\n")

# Add to survival data
surv_data$retention_score <- retention_score
surv_data$egress_score <- egress_score
surv_data$balance_score <- balance_score

# Balance score risk groups
balance_tertiles <- cut(balance_score,
                        breaks = quantile(balance_score, c(0, 0.33, 0.67, 1)),
                        labels = c("Egress-High", "Balanced", "Retention-High"),
                        include.lowest = TRUE)
surv_data$balance_group <- balance_tertiles

#------------------------------------------------------------------------------
# 7. COO-SPECIFIC ANALYSIS
#------------------------------------------------------------------------------
cat("\n\n=== COO-Specific Trafficking Analysis ===\n")

coo_results <- data.frame()

for (coo in c("GCB", "ABC", "MHG", "UNC")) {
  coo_idx <- which(surv_data$COO == coo)

  if (length(coo_idx) >= 50) {
    # ML signature
    ml_cox <- coxph(Surv(time, status) ~ risk_score, data = surv_data[coo_idx, ])
    ml_sum <- summary(ml_cox)

    # Balance score
    bal_cox <- coxph(Surv(time, status) ~ balance_score, data = surv_data[coo_idx, ])
    bal_sum <- summary(bal_cox)

    coo_results <- rbind(coo_results, data.frame(
      COO = coo,
      N = length(coo_idx),
      Events = sum(surv_data$status[coo_idx]),
      ML_HR = ml_sum$conf.int[1, "exp(coef)"],
      ML_p = ml_sum$coefficients[1, "Pr(>|z|)"],
      Balance_HR = bal_sum$conf.int[1, "exp(coef)"],
      Balance_p = bal_sum$coefficients[1, "Pr(>|z|)"]
    ))
  }
}

cat("\nTrafficking Signature by COO:\n")
print(coo_results)

#------------------------------------------------------------------------------
# 8. VISUALIZATIONS
#------------------------------------------------------------------------------
cat("\n\n=== Creating Visualizations ===\n")

fig_dir <- file.path(base_dir, "global_scripts/figures")

# 1. KM curve for trafficking signature
png(file.path(fig_dir, "ml_trafficking_km.png"), width = 1000, height = 800, res = 150)

fit <- survfit(Surv(time, status) ~ risk_group, data = surv_data)
p <- ggsurvplot(fit, data = surv_data,
                palette = c("#2ecc71", "#f39c12", "#e74c3c"),
                risk.table = TRUE,
                pval = TRUE,
                conf.int = FALSE,
                xlab = "Time (years)",
                ylab = "Overall Survival",
                title = "Trafficking Signature Risk Stratification",
                subtitle = paste("C-index:", round(c_index, 3),
                                 "| Genes:", length(selected_probes)),
                legend.title = "Risk Group",
                risk.table.height = 0.25,
                ggtheme = theme_bw())
print(p)
dev.off()
cat("Saved: ml_trafficking_km.png\n")

# 2. KM curve for balance score
png(file.path(fig_dir, "ml_retention_egress_balance_km.png"), width = 1000, height = 800, res = 150)

fit_balance <- survfit(Surv(time, status) ~ balance_group, data = surv_data)
p2 <- ggsurvplot(fit_balance, data = surv_data,
                 palette = c("#3498db", "#9b59b6", "#e74c3c"),
                 risk.table = TRUE,
                 pval = TRUE,
                 conf.int = FALSE,
                 xlab = "Time (years)",
                 ylab = "Overall Survival",
                 title = "Retention vs Egress Balance",
                 subtitle = paste("Balance HR:", round(balance_summary$conf.int[1, "exp(coef)"], 3)),
                 legend.title = "Balance",
                 risk.table.height = 0.25,
                 ggtheme = theme_bw())
print(p2)
dev.off()
cat("Saved: ml_retention_egress_balance_km.png\n")

# 3. Volcano plot of trafficking genes
png(file.path(fig_dir, "trafficking_volcano.png"), width = 1000, height = 800, res = 150)

trafficking_results$neg_log_p <- -log10(trafficking_results$p_value)
trafficking_results$log_HR <- log2(trafficking_results$HR)

ggplot(trafficking_results, aes(x = log_HR, y = neg_log_p, color = category)) +
  geom_point(alpha = 0.7, size = 3) +
  geom_hline(yintercept = -log10(0.05), linetype = "dashed", color = "gray") +
  geom_vline(xintercept = 0, linetype = "dashed", color = "gray") +
  geom_text(data = trafficking_results %>% filter(p_value < 0.01),
            aes(label = gene), hjust = -0.1, vjust = 0.5, size = 3) +
  scale_color_manual(values = c("Retention" = "#e74c3c", "Egress" = "#3498db")) +
  labs(title = "Trafficking Genes: Univariate Survival Association",
       x = "log2(Hazard Ratio)",
       y = "-log10(p-value)",
       color = "Category") +
  theme_minimal() +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"))

dev.off()
cat("Saved: trafficking_volcano.png\n")

# 4. Retention vs Egress score scatter
png(file.path(fig_dir, "retention_vs_egress_scatter.png"), width = 1000, height = 800, res = 150)

ggplot(surv_data, aes(x = retention_score, y = egress_score, color = risk_group)) +
  geom_point(alpha = 0.6, size = 2) +
  geom_abline(slope = 1, intercept = 0, linetype = "dashed", color = "gray") +
  scale_color_manual(values = c("Low" = "#2ecc71", "Intermediate" = "#f39c12", "High" = "#e74c3c")) +
  labs(title = "Retention vs Egress Expression Scores",
       x = "Retention Score (z-scored mean)",
       y = "Egress Score (z-scored mean)",
       color = "Risk Group") +
  theme_minimal() +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"))

dev.off()
cat("Saved: retention_vs_egress_scatter.png\n")

# 5. Signature coefficients by category
png(file.path(fig_dir, "trafficking_signature_coefficients.png"), width = 1200, height = 800, res = 150)

signature_plot <- signature_coefs %>%
  filter(!is.na(gene)) %>%
  head(20) %>%
  mutate(gene = factor(gene, levels = rev(gene)))

ggplot(signature_plot, aes(x = coefficient, y = gene, fill = category)) +
  geom_bar(stat = "identity") +
  geom_vline(xintercept = 0, linetype = "dashed") +
  scale_fill_manual(values = c("Retention" = "#e74c3c", "Egress" = "#3498db")) +
  labs(title = "Top 20 Trafficking Signature Genes",
       subtitle = "Elastic Net Cox Coefficients",
       x = "Coefficient (positive = adverse)",
       y = "",
       fill = "Category") +
  theme_minimal() +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"))

dev.off()
cat("Saved: trafficking_signature_coefficients.png\n")

#------------------------------------------------------------------------------
# 9. SAVE OUTPUTS
#------------------------------------------------------------------------------
cat("\n\n=== Saving Results ===\n")

# Save signature
write.csv(signature_coefs,
          file.path(base_dir, "global_scripts/ml_signature_trafficking.csv"),
          row.names = FALSE)

# Save patient scores
write.csv(surv_data,
          file.path(base_dir, "global_scripts/trafficking_patient_scores.csv"),
          row.names = FALSE)

#------------------------------------------------------------------------------
# 10. SUMMARY
#------------------------------------------------------------------------------
cat("\n\n", paste(rep("=", 70), collapse = ""), "\n")
cat("   RETENTION/EGRESS TRAFFICKING MODEL SUMMARY\n")
cat(paste(rep("=", 70), collapse = ""), "\n\n")

cat("INPUT:\n")
cat("  Retention genes defined:", length(retention_genes), "\n")
cat("  Egress genes defined:", length(egress_genes), "\n")
cat("  Genes found in data:", length(unique(trafficking_probes$gene)), "\n")
cat("  Probes used:", nrow(trafficking_probes), "\n\n")

cat("UNIVARIATE RESULTS:\n")
cat("  Significant at p<0.05:", sum(trafficking_results$p_value < 0.05), "/",
    nrow(trafficking_results), "\n")
cat("  Significant at FDR<0.1:", sum(trafficking_results$FDR < 0.1), "/",
    nrow(trafficking_results), "\n\n")

cat("ML SIGNATURE:\n")
cat("  Selected features:", length(selected_probes), "\n")
cat("  C-index:", round(c_index, 4), "\n")
cat("  Log-rank p-value:", signif(p_logrank, 3), "\n\n")

cat("BALANCE SCORE (Retention - Egress):\n")
cat("  HR:", round(balance_summary$conf.int[1, "exp(coef)"], 3), "\n")
cat("  P-value:", signif(balance_summary$coefficients[1, "Pr(>|z|)"], 3), "\n\n")

cat("INTERPRETATION:\n")
if (balance_summary$conf.int[1, "exp(coef)"] > 1) {
  cat("  Higher RETENTION relative to EGRESS is associated with WORSE survival\n")
  cat("  This suggests tumor retention in lymphoid niches may be detrimental\n")
} else {
  cat("  Higher RETENTION relative to EGRESS is associated with BETTER survival\n")
  cat("  This suggests egress/dissemination may be detrimental\n")
}

cat("\n=== ANALYSIS COMPLETE ===\n")
