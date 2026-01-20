# Generate figures for DLBCL Prognostic Signatures Presentation
# Creates methodology diagrams, heatmaps, and GSEA plots

library(dplyr)
library(ggplot2)
library(pheatmap)
library(RColorBrewer)
library(gridExtra)
library(grid)
library(survival)
library(survminer)

select <- dplyr::select

base_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06"
fig_dir <- file.path(base_dir, "global_scripts/figures")

# Create figures directory
if (!dir.exists(fig_dir)) dir.create(fig_dir, recursive = TRUE)

cat("=== Generating Presentation Figures ===\n\n")

#------------------------------------------------------------------------------
# 1. LOAD DATA
#------------------------------------------------------------------------------
cat("Loading data...\n")

# Load clinical data
tegress_scores <- read.csv(file.path(base_dir, "Lacy_HMRN/results/tegress_scores.csv"),
                           stringsAsFactors = FALSE)
clinical <- tegress_scores %>%
  filter(!is.na(OS_status) & !is.na(OS_time) & OS_time > 0)

# Load survival results
global_surv <- read.csv(file.path(base_dir, "global_scripts/survival_global_annotated.csv"),
                        stringsAsFactors = FALSE)
gcb_surv <- read.csv(file.path(base_dir, "global_scripts/survival_gcb_annotated.csv"),
                     stringsAsFactors = FALSE)
abc_surv <- read.csv(file.path(base_dir, "global_scripts/survival_abc_annotated.csv"),
                     stringsAsFactors = FALSE)
mhg_surv <- read.csv(file.path(base_dir, "global_scripts/survival_mhg_annotated.csv"),
                     stringsAsFactors = FALSE)
unc_surv <- read.csv(file.path(base_dir, "global_scripts/survival_unc_annotated.csv"),
                     stringsAsFactors = FALSE)

# Load enrichment results
prot_hallmark <- read.csv(file.path(base_dir, "global_scripts/enrichment_global_protective_MSigDB_Hallmark_2020.csv"),
                          stringsAsFactors = FALSE)
harm_hallmark <- read.csv(file.path(base_dir, "global_scripts/enrichment_global_harmful_MSigDB_Hallmark_2020.csv"),
                          stringsAsFactors = FALSE)

# Load expression data
cat("Loading expression data...\n")
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

#------------------------------------------------------------------------------
# 2. METHODOLOGY DIAGRAM
#------------------------------------------------------------------------------
cat("Creating methodology diagram...\n")

png(file.path(fig_dir, "methodology_diagram.png"), width = 1200, height = 800, res = 150)

# Create a simple flow diagram using ggplot
method_data <- data.frame(
  step = c(1, 2, 3, 4, 5),
  label = c("Expression Data\n(29,372 probes)",
            "Cox Regression\n(per probe)",
            "FDR Correction\n(BH method)",
            "Pathway Analysis\n(enrichR)",
            "IPI Adjustment\n(multivariate)"),
  x = c(1, 2, 3, 4, 5),
  y = c(1, 1, 1, 1, 1)
)

p_method <- ggplot(method_data, aes(x = x, y = y)) +
  geom_rect(aes(xmin = x - 0.4, xmax = x + 0.4, ymin = 0.7, ymax = 1.3),
            fill = c("#3498db", "#2ecc71", "#e74c3c", "#9b59b6", "#f39c12"),
            color = "white", size = 2) +
  geom_text(aes(label = label), color = "white", fontface = "bold", size = 4) +
  geom_segment(data = data.frame(x = c(1.4, 2.4, 3.4, 4.4), xend = c(1.6, 2.6, 3.6, 4.6)),
               aes(x = x, xend = xend, y = 1, yend = 1),
               arrow = arrow(length = unit(0.3, "cm")), size = 1.5, color = "gray40") +
  theme_void() +
  labs(title = "Analysis Pipeline") +
  theme(plot.title = element_text(hjust = 0.5, size = 16, face = "bold")) +
  coord_cartesian(xlim = c(0.3, 5.7), ylim = c(0.3, 1.7))

print(p_method)
dev.off()

#------------------------------------------------------------------------------
# 3. COHORT OVERVIEW
#------------------------------------------------------------------------------
cat("Creating cohort overview...\n")

png(file.path(fig_dir, "cohort_overview.png"), width = 1000, height = 600, res = 150)

coo_counts <- clinical %>%
  group_by(COO) %>%
  summarise(n = n(), events = sum(OS_status)) %>%
  mutate(pct = round(100 * n / sum(n), 1))

p_cohort <- ggplot(coo_counts, aes(x = reorder(COO, -n), y = n, fill = COO)) +
  geom_bar(stat = "identity", width = 0.7) +
  geom_text(aes(label = paste0(n, "\n(", pct, "%)")),
            vjust = -0.3, size = 4, fontface = "bold") +
  scale_fill_manual(values = c("GCB" = "#2ecc71", "ABC" = "#e74c3c",
                               "MHG" = "#9b59b6", "UNC" = "#95a5a6")) +
  labs(title = "HMRN/Lacy Cohort Distribution",
       subtitle = paste0("Total: ", sum(coo_counts$n), " samples"),
       x = "Cell of Origin", y = "Number of Samples") +
  theme_minimal() +
  theme(legend.position = "none",
        plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
        plot.subtitle = element_text(hjust = 0.5, size = 11),
        axis.text = element_text(size = 12)) +
  ylim(0, max(coo_counts$n) * 1.2)

print(p_cohort)
dev.off()

#------------------------------------------------------------------------------
# 4. VOLCANO PLOT - GLOBAL
#------------------------------------------------------------------------------
cat("Creating volcano plot...\n")

png(file.path(fig_dir, "volcano_global.png"), width = 1000, height = 800, res = 150)

volcano_data <- global_surv %>%
  filter(!is.na(gene)) %>%
  mutate(
    log_HR = log2(HR),
    neg_log_p = -log10(p_value),
    sig_category = case_when(
      FDR < 0.05 & HR < 1 ~ "Protective (FDR<0.05)",
      FDR < 0.05 & HR > 1 ~ "Adverse (FDR<0.05)",
      TRUE ~ "Not Significant"
    )
  )

# Label top genes
top_labels <- volcano_data %>%
  filter(FDR < 0.001) %>%
  arrange(p_value) %>%
  group_by(sig_category) %>%
  slice_head(n = 5) %>%
  ungroup()

p_volcano <- ggplot(volcano_data, aes(x = log_HR, y = neg_log_p, color = sig_category)) +
  geom_point(alpha = 0.5, size = 1) +
  geom_point(data = top_labels, size = 2) +
  geom_text(data = top_labels, aes(label = gene),
            hjust = -0.1, vjust = 0.5, size = 3, show.legend = FALSE) +
  geom_hline(yintercept = -log10(0.05), linetype = "dashed", color = "gray50") +
  geom_vline(xintercept = 0, linetype = "solid", color = "gray50") +
  scale_color_manual(values = c("Protective (FDR<0.05)" = "#2ecc71",
                                "Adverse (FDR<0.05)" = "#e74c3c",
                                "Not Significant" = "gray70")) +
  labs(title = "Global Survival Analysis - Volcano Plot",
       subtitle = "n = 1,303 samples",
       x = "log2(Hazard Ratio)",
       y = "-log10(P-value)",
       color = "") +
  theme_bw() +
  theme(plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
        plot.subtitle = element_text(hjust = 0.5),
        legend.position = "bottom")

print(p_volcano)
dev.off()

#------------------------------------------------------------------------------
# 5. HEATMAPS FOR SIGNATURES
#------------------------------------------------------------------------------
cat("Creating signature heatmaps...\n")

# Get common samples
common_samples <- intersect(colnames(expr_data), clinical$sample_id)
expr_sub <- expr_data[, common_samples]
expr_mat <- as.matrix(expr_sub)
expr_mat <- apply(expr_mat, 2, as.numeric)
rownames(expr_mat) <- rownames(expr_sub)

# Z-score normalize
expr_z <- t(scale(t(expr_mat)))

# Prepare annotation
clin_annot <- clinical[match(common_samples, clinical$sample_id), ]
row_annot <- data.frame(
  COO = clin_annot$COO,
  Survival = ifelse(clin_annot$OS_status == 1, "Dead", "Alive"),
  row.names = common_samples
)

# Get top genes for heatmap
top_prot <- global_surv %>%
  filter(HR < 1, FDR < 0.001, !is.na(gene)) %>%
  arrange(p_value) %>%
  head(25)

top_harm <- global_surv %>%
  filter(HR > 1, FDR < 0.001, !is.na(gene)) %>%
  arrange(p_value) %>%
  head(25)

# Combined signature genes - handle duplicates by making unique names
sig_probes <- c(top_prot$probe, top_harm$probe)
sig_genes <- c(top_prot$gene, top_harm$gene)

# Make gene names unique by appending probe suffix for duplicates
sig_genes_unique <- make.unique(sig_genes, sep = "_")

# Subset expression matrix
heatmap_mat <- expr_z[sig_probes, ]
rownames(heatmap_mat) <- sig_genes_unique

# Create gene annotation
gene_annot <- data.frame(
  Direction = c(rep("Protective", nrow(top_prot)), rep("Adverse", nrow(top_harm))),
  row.names = sig_genes_unique
)

# Color scales
ann_colors <- list(
  COO = c("GCB" = "#2ecc71", "ABC" = "#e74c3c", "MHG" = "#9b59b6", "UNC" = "#95a5a6"),
  Survival = c("Dead" = "black", "Alive" = "white"),
  Direction = c("Protective" = "#2ecc71", "Adverse" = "#e74c3c")
)

# Reorder samples by COO
sample_order <- order(row_annot$COO)
heatmap_mat_ordered <- heatmap_mat[, sample_order]
row_annot_ordered <- row_annot[sample_order, , drop = FALSE]

# Create heatmap
png(file.path(fig_dir, "heatmap_global_signature.png"), width = 1400, height = 1000, res = 150)

pheatmap(heatmap_mat_ordered,
         annotation_col = row_annot_ordered,
         annotation_row = gene_annot,
         annotation_colors = ann_colors,
         cluster_cols = FALSE,
         cluster_rows = TRUE,
         show_colnames = FALSE,
         fontsize_row = 8,
         color = colorRampPalette(c("#2166AC", "white", "#B2182B"))(100),
         breaks = seq(-3, 3, length.out = 101),
         main = "Global Prognostic Signature - Top 50 Genes",
         legend_breaks = c(-3, -1.5, 0, 1.5, 3),
         legend_labels = c("-3", "-1.5", "0", "1.5", "3"))

dev.off()

#------------------------------------------------------------------------------
# 6. GSEA ENRICHMENT PLOTS
#------------------------------------------------------------------------------
cat("Creating GSEA enrichment plots...\n")

# Protective pathways barplot
png(file.path(fig_dir, "gsea_protective_barplot.png"), width = 1000, height = 700, res = 150)

prot_top <- prot_hallmark %>%
  filter(Adjusted.P.value < 0.1) %>%
  arrange(Adjusted.P.value) %>%
  head(10) %>%
  mutate(neg_log_p = -log10(Adjusted.P.value),
         Term = gsub("_", " ", Term))

p_prot_gsea <- ggplot(prot_top, aes(x = reorder(Term, neg_log_p), y = neg_log_p)) +
  geom_bar(stat = "identity", fill = "#2ecc71", width = 0.7) +
  geom_hline(yintercept = -log10(0.05), linetype = "dashed", color = "red") +
  coord_flip() +
  labs(title = "Protective Signature - Pathway Enrichment",
       subtitle = "MSigDB Hallmark 2020",
       x = "", y = "-log10(Adjusted P-value)") +
  theme_minimal() +
  theme(plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
        plot.subtitle = element_text(hjust = 0.5),
        axis.text.y = element_text(size = 10))

print(p_prot_gsea)
dev.off()

# Harmful pathways barplot
png(file.path(fig_dir, "gsea_adverse_barplot.png"), width = 1000, height = 700, res = 150)

harm_top <- harm_hallmark %>%
  filter(Adjusted.P.value < 0.1) %>%
  arrange(Adjusted.P.value) %>%
  head(10) %>%
  mutate(neg_log_p = -log10(Adjusted.P.value),
         Term = gsub("_", " ", Term))

p_harm_gsea <- ggplot(harm_top, aes(x = reorder(Term, neg_log_p), y = neg_log_p)) +
  geom_bar(stat = "identity", fill = "#e74c3c", width = 0.7) +
  geom_hline(yintercept = -log10(0.05), linetype = "dashed", color = "red") +
  coord_flip() +
  labs(title = "Adverse Signature - Pathway Enrichment",
       subtitle = "MSigDB Hallmark 2020",
       x = "", y = "-log10(Adjusted P-value)") +
  theme_minimal() +
  theme(plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
        plot.subtitle = element_text(hjust = 0.5),
        axis.text.y = element_text(size = 10))

print(p_harm_gsea)
dev.off()

#------------------------------------------------------------------------------
# 7. COMBINED PATHWAY DOTPLOT
#------------------------------------------------------------------------------
cat("Creating combined pathway dotplot...\n")

png(file.path(fig_dir, "gsea_combined_dotplot.png"), width = 1200, height = 800, res = 150)

prot_for_plot <- prot_hallmark %>%
  filter(Adjusted.P.value < 0.1) %>%
  head(8) %>%
  mutate(Direction = "Protective",
         Term = gsub("_", " ", Term),
         GeneCount = as.numeric(gsub("/.*", "", Overlap)))

harm_for_plot <- harm_hallmark %>%
  filter(Adjusted.P.value < 0.1) %>%
  head(8) %>%
  mutate(Direction = "Adverse",
         Term = gsub("_", " ", Term),
         GeneCount = as.numeric(gsub("/.*", "", Overlap)))

combined_pathways <- bind_rows(prot_for_plot, harm_for_plot)

p_combined <- ggplot(combined_pathways, aes(x = Direction, y = reorder(Term, -Adjusted.P.value))) +
  geom_point(aes(size = GeneCount, color = -log10(Adjusted.P.value))) +
  scale_color_gradient(low = "blue", high = "red", name = "-log10(P.adj)") +
  scale_size_continuous(name = "Gene Count", range = c(3, 10)) +
  labs(title = "Pathway Enrichment - Protective vs Adverse Signatures",
       x = "", y = "") +
  theme_bw() +
  theme(plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
        axis.text.y = element_text(size = 9),
        legend.position = "right")

print(p_combined)
dev.off()

#------------------------------------------------------------------------------
# 8. COO-SPECIFIC COMPARISON
#------------------------------------------------------------------------------
cat("Creating COO comparison plot...\n")

png(file.path(fig_dir, "coo_comparison.png"), width = 1000, height = 600, res = 150)

coo_results <- data.frame(
  Subset = c("Global", "GCB", "ABC", "MHG", "UNC"),
  N = c(1303, 517, 345, 164, 277),
  Significant = c(
    sum(global_surv$FDR < 0.05),
    sum(gcb_surv$FDR < 0.05),
    sum(abc_surv$FDR < 0.05),
    sum(mhg_surv$FDR < 0.05),
    sum(unc_surv$FDR < 0.05)
  )
) %>%
  mutate(Subset = factor(Subset, levels = c("Global", "GCB", "ABC", "MHG", "UNC")))

p_coo <- ggplot(coo_results, aes(x = Subset, y = Significant, fill = Subset)) +
  geom_bar(stat = "identity", width = 0.7) +
  geom_text(aes(label = format(Significant, big.mark = ",")),
            vjust = -0.3, size = 4, fontface = "bold") +
  scale_fill_manual(values = c("Global" = "#3498db", "GCB" = "#2ecc71",
                               "ABC" = "#e74c3c", "MHG" = "#9b59b6", "UNC" = "#95a5a6")) +
  labs(title = "Significant Prognostic Genes by COO Subset",
       subtitle = "FDR < 0.05",
       x = "", y = "Number of Significant Probes") +
  theme_minimal() +
  theme(legend.position = "none",
        plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
        plot.subtitle = element_text(hjust = 0.5),
        axis.text = element_text(size = 12)) +
  ylim(0, max(coo_results$Significant) * 1.15)

print(p_coo)
dev.off()

#------------------------------------------------------------------------------
# 9. IPI INDEPENDENCE PLOT
#------------------------------------------------------------------------------
cat("Creating IPI independence plot...\n")

# Load IPI results
ipi_results <- read.csv(file.path(base_dir, "global_scripts/ipi_independent_global.csv"),
                        stringsAsFactors = FALSE)

# Get gene annotation
gcb_annot <- read.csv(file.path(base_dir, "global_scripts/survival_gcb_annotated.csv"),
                      stringsAsFactors = FALSE)
probe_gene_map <- gcb_annot %>% select(probe, gene) %>% distinct()
ipi_results <- ipi_results %>% left_join(probe_gene_map, by = "probe")

png(file.path(fig_dir, "ipi_independence_scatter.png"), width = 1000, height = 800, res = 150)

ipi_plot_data <- ipi_results %>%
  filter(!is.na(gene)) %>%
  mutate(
    log_uni = -log10(uni_p),
    log_adj = -log10(adj_p),
    category = case_when(
      uni_p < 0.05 & adj_p < 0.05 ~ "Remain Significant",
      uni_p < 0.05 & adj_p >= 0.05 ~ "Lose Significance",
      uni_p >= 0.05 & adj_p < 0.05 ~ "Gain Significance",
      TRUE ~ "Not Significant"
    )
  )

# Count categories
cat_counts <- ipi_plot_data %>% count(category)

p_ipi <- ggplot(ipi_plot_data, aes(x = log_uni, y = log_adj, color = category)) +
  geom_point(alpha = 0.4, size = 1) +
  geom_abline(slope = 1, intercept = 0, linetype = "dashed", color = "gray40") +
  geom_hline(yintercept = -log10(0.05), linetype = "dotted", color = "red", alpha = 0.5) +
  geom_vline(xintercept = -log10(0.05), linetype = "dotted", color = "red", alpha = 0.5) +
  scale_color_manual(values = c(
    "Remain Significant" = "#2ecc71",
    "Lose Significance" = "#e74c3c",
    "Gain Significance" = "#3498db",
    "Not Significant" = "gray80"
  )) +
  labs(title = "IPI Independence Analysis",
       subtitle = "GCB samples with IPI data (n=317)",
       x = "-log10(Univariate P-value)",
       y = "-log10(IPI-Adjusted P-value)",
       color = "") +
  theme_bw() +
  theme(plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
        plot.subtitle = element_text(hjust = 0.5),
        legend.position = "bottom")

print(p_ipi)
dev.off()

#------------------------------------------------------------------------------
# 10. KAPLAN-MEIER CURVES
#------------------------------------------------------------------------------
cat("Creating Kaplan-Meier curves...\n")

# Get top signature genes
top_protective <- global_surv %>%
  filter(HR < 1, FDR < 0.01, !is.na(gene)) %>%
  arrange(p_value) %>%
  head(50) %>%
  pull(probe)

top_adverse <- global_surv %>%
  filter(HR > 1, FDR < 0.01, !is.na(gene)) %>%
  arrange(p_value) %>%
  head(50) %>%
  pull(probe)

# Calculate signature score
prot_probes <- intersect(top_protective, rownames(expr_z))
adv_probes <- intersect(top_adverse, rownames(expr_z))

prot_score <- colMeans(expr_z[prot_probes, , drop=FALSE], na.rm=TRUE)
adv_score <- colMeans(expr_z[adv_probes, , drop=FALSE], na.rm=TRUE)
sig_score <- adv_score - prot_score

surv_df <- data.frame(
  sample_id = names(sig_score),
  sig_score = sig_score
) %>%
  left_join(clinical, by = "sample_id") %>%
  filter(!is.na(OS_status), !is.na(OS_time), OS_time > 0)

surv_df$risk_group <- cut(surv_df$sig_score,
                          breaks = quantile(surv_df$sig_score, c(0, 0.33, 0.67, 1)),
                          labels = c("Low Risk", "Intermediate", "High Risk"),
                          include.lowest = TRUE)

fit <- survfit(Surv(OS_time, OS_status) ~ risk_group, data = surv_df)

png(file.path(fig_dir, "km_global_signature.png"), width = 1000, height = 800, res = 150)

p_km <- ggsurvplot(fit, data = surv_df,
           palette = c("#2ecc71", "#f39c12", "#e74c3c"),
           risk.table = TRUE,
           pval = TRUE,
           conf.int = FALSE,
           xlab = "Time (years)",
           ylab = "Overall Survival",
           title = "Global Prognostic Signature",
           legend.title = "Risk Group",
           legend.labs = c("Low Risk", "Intermediate", "High Risk"),
           risk.table.height = 0.25,
           ggtheme = theme_bw())

print(p_km)
dev.off()

#------------------------------------------------------------------------------
# 11. SUBSET-SPECIFIC HEATMAPS
#------------------------------------------------------------------------------
cat("Creating subset-specific heatmaps...\n")

# GCB heatmap
gcb_clinical <- clinical %>% filter(COO == "GCB")
common_gcb <- intersect(colnames(expr_data), gcb_clinical$sample_id)

top_gcb_prot <- gcb_surv %>% filter(HR < 1, FDR < 0.1, !is.na(gene)) %>% arrange(p_value) %>% head(15)
top_gcb_harm <- gcb_surv %>% filter(HR > 1, FDR < 0.1, !is.na(gene)) %>% arrange(p_value) %>% head(15)

gcb_sig_probes <- c(top_gcb_prot$probe, top_gcb_harm$probe)
gcb_sig_genes <- c(top_gcb_prot$gene, top_gcb_harm$gene)
gcb_sig_genes_unique <- make.unique(gcb_sig_genes, sep = "_")

expr_gcb <- expr_z[gcb_sig_probes, common_gcb]
rownames(expr_gcb) <- gcb_sig_genes_unique

gcb_gene_annot <- data.frame(
  Direction = c(rep("Protective", nrow(top_gcb_prot)), rep("Adverse", nrow(top_gcb_harm))),
  row.names = gcb_sig_genes_unique
)

png(file.path(fig_dir, "heatmap_gcb_signature.png"), width = 1000, height = 800, res = 150)

pheatmap(expr_gcb,
         annotation_row = gcb_gene_annot,
         annotation_colors = list(Direction = c("Protective" = "#2ecc71", "Adverse" = "#e74c3c")),
         cluster_cols = TRUE,
         cluster_rows = TRUE,
         show_colnames = FALSE,
         fontsize_row = 9,
         color = colorRampPalette(c("#2166AC", "white", "#B2182B"))(100),
         breaks = seq(-3, 3, length.out = 101),
         main = "GCB-Specific Prognostic Signature")

dev.off()

# ABC heatmap
abc_clinical <- clinical %>% filter(COO == "ABC")
common_abc <- intersect(colnames(expr_data), abc_clinical$sample_id)

top_abc_prot <- abc_surv %>% filter(HR < 1, FDR < 0.1, !is.na(gene)) %>% arrange(p_value) %>% head(15)
top_abc_harm <- abc_surv %>% filter(HR > 1, FDR < 0.1, !is.na(gene)) %>% arrange(p_value) %>% head(15)

abc_sig_probes <- c(top_abc_prot$probe, top_abc_harm$probe)
abc_sig_genes <- c(top_abc_prot$gene, top_abc_harm$gene)
abc_sig_genes_unique <- make.unique(abc_sig_genes, sep = "_")

expr_abc <- expr_z[abc_sig_probes, common_abc]
rownames(expr_abc) <- abc_sig_genes_unique

abc_gene_annot <- data.frame(
  Direction = c(rep("Protective", nrow(top_abc_prot)), rep("Adverse", nrow(top_abc_harm))),
  row.names = abc_sig_genes_unique
)

png(file.path(fig_dir, "heatmap_abc_signature.png"), width = 1000, height = 800, res = 150)

pheatmap(expr_abc,
         annotation_row = abc_gene_annot,
         annotation_colors = list(Direction = c("Protective" = "#2ecc71", "Adverse" = "#e74c3c")),
         cluster_cols = TRUE,
         cluster_rows = TRUE,
         show_colnames = FALSE,
         fontsize_row = 9,
         color = colorRampPalette(c("#2166AC", "white", "#B2182B"))(100),
         breaks = seq(-3, 3, length.out = 101),
         main = "ABC-Specific Prognostic Signature")

dev.off()

#------------------------------------------------------------------------------
# 12. GSEA ENRICHMENT LOLLIPOP PLOTS
#------------------------------------------------------------------------------
cat("Creating GSEA lollipop plots...\n")

# Load all enrichment results for different subsets
gcb_hallmark_file <- file.path(base_dir, "global_scripts/enrichment_gcb_MSigDB_Hallmark_2020.csv")
abc_hallmark_file <- file.path(base_dir, "global_scripts/enrichment_abc_MSigDB_Hallmark_2020.csv")
unc_hallmark_file <- file.path(base_dir, "global_scripts/enrichment_unc_MSigDB_Hallmark_2020.csv")

if (file.exists(gcb_hallmark_file) & file.exists(abc_hallmark_file) & file.exists(unc_hallmark_file)) {
  gcb_hallmark <- read.csv(gcb_hallmark_file, stringsAsFactors = FALSE)
  abc_hallmark <- read.csv(abc_hallmark_file, stringsAsFactors = FALSE)
  unc_hallmark <- read.csv(unc_hallmark_file, stringsAsFactors = FALSE)

  # Create comparison plot
  png(file.path(fig_dir, "gsea_coo_comparison.png"), width = 1400, height = 800, res = 150)

  # Combine top pathways from each
  gcb_top <- gcb_hallmark %>% head(5) %>% mutate(Subset = "GCB", Term = gsub("_", " ", Term))
  abc_top <- abc_hallmark %>% head(5) %>% mutate(Subset = "ABC", Term = gsub("_", " ", Term))
  unc_top <- unc_hallmark %>% head(5) %>% mutate(Subset = "UNC", Term = gsub("_", " ", Term))

  combined_coo <- bind_rows(gcb_top, abc_top, unc_top)

  p_coo_gsea <- ggplot(combined_coo, aes(x = -log10(Adjusted.P.value), y = reorder(Term, -log10(Adjusted.P.value)))) +
    geom_segment(aes(x = 0, xend = -log10(Adjusted.P.value), yend = reorder(Term, -log10(Adjusted.P.value))),
                 color = "gray70") +
    geom_point(aes(color = Subset), size = 4) +
    geom_vline(xintercept = -log10(0.05), linetype = "dashed", color = "red") +
    scale_color_manual(values = c("GCB" = "#2ecc71", "ABC" = "#e74c3c", "UNC" = "#95a5a6")) +
    facet_wrap(~Subset, scales = "free_y", ncol = 3) +
    labs(title = "Top Pathways by COO Subset",
         x = "-log10(Adjusted P-value)", y = "") +
    theme_bw() +
    theme(plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
          legend.position = "none",
          strip.text = element_text(size = 12, face = "bold"))

  print(p_coo_gsea)
  dev.off()
}

cat("\n=== All figures generated! ===\n")
cat("Figures saved to:", fig_dir, "\n")

# List generated files
cat("\nGenerated files:\n")
print(list.files(fig_dir, pattern = "\\.png$"))
