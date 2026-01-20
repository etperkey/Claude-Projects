# GNA13/S1P Pathway Analysis: Integrating Mutations and Expression
# Comparing Retention vs Egress in DLBCL

library(dplyr)
library(survival)
library(ggplot2)
library(tidyr)

base_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06"

cat("=============================================================\n")
cat("   GNA13/S1P PATHWAY: MUTATIONS vs EXPRESSION ANALYSIS\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. DEFINE THE PATHWAY
#------------------------------------------------------------------------------
cat("=== The S1P/GNA13 Retention-Egress Pathway ===\n\n")

cat("RETENTION PATHWAY (Loss-of-Function mutations promote egress):\n")
cat("  P2RY8 (orphan GPCR) ──┐\n")
cat("                        ├──> GNA13 ──> ARHGEF1 ──> RHOA ──> Retention\n")
cat("  S1PR2 ────────────────┘\n")
cat("\n")
cat("EGRESS PATHWAY (Gain-of-Function mutations promote egress):\n")
cat("  S1PR1 ──> GNAI2 ──> RAC2 ──> Egress\n")
cat("  CXCR4 (truncating mutations) ──> Enhanced chemotaxis\n")
cat("\n")

#------------------------------------------------------------------------------
# 2. LOAD MUTATION DATA
#------------------------------------------------------------------------------
cat("=== Loading Mutation Data ===\n")

# Lacy/HMRN genomic data
genomic_data <- read.csv(file.path(base_dir, "Lacy_HMRN/genomic_data.csv"),
                         stringsAsFactors = FALSE)

# Cross-cohort comparison
pathway_comparison <- read.csv(file.path(base_dir, "pathway_gene_comparison.csv"),
                               stringsAsFactors = FALSE)

# GNA13 co-occurrence
gna13_cooccur <- read.csv(file.path(base_dir, "global_scripts/gna13_cooccurrence.csv"),
                          stringsAsFactors = FALSE)

cat("Genomic data:", nrow(genomic_data), "patients x", ncol(genomic_data)-1, "features\n")

#------------------------------------------------------------------------------
# 3. MUTATION FREQUENCIES IN LACY COHORT
#------------------------------------------------------------------------------
cat("\n=== Pathway Gene Mutation Frequencies (Lacy Cohort) ===\n\n")

# Check which pathway genes are in the data
pathway_genes <- c("GNA13", "P2RY8", "RHOA", "CXCR4")
available_genes <- pathway_genes[pathway_genes %in% colnames(genomic_data)]

mutation_freq <- data.frame(
  Gene = available_genes,
  N_mutated = sapply(available_genes, function(g) sum(genomic_data[[g]], na.rm = TRUE)),
  N_total = nrow(genomic_data)
) %>%
  mutate(
    Pct = round(N_mutated / N_total * 100, 1),
    Pathway = case_when(
      Gene %in% c("GNA13", "P2RY8", "RHOA") ~ "Retention (LoF)",
      Gene == "CXCR4" ~ "Egress (GoF)"
    )
  )

print(mutation_freq)

#------------------------------------------------------------------------------
# 4. CROSS-COHORT MUTATION COMPARISON
#------------------------------------------------------------------------------
cat("\n=== Cross-Cohort Mutation Comparison ===\n\n")

print(pathway_comparison %>%
        select(Gene, Pathway, Chapuy_Pct, Duke_Pct) %>%
        rename(Chapuy = Chapuy_Pct, Duke = Duke_Pct))

#------------------------------------------------------------------------------
# 5. LOAD EXPRESSION-SURVIVAL DATA
#------------------------------------------------------------------------------
cat("\n=== Loading Expression-Survival Data ===\n")

expr_survival <- read.csv(file.path(base_dir, "Lacy_HMRN/results/pathway_genes_mortality.csv"),
                          stringsAsFactors = FALSE)

cat("\nExpression-Survival Results by COO:\n\n")

# Summarize key findings
expr_summary <- expr_survival %>%
  filter(Cohort == "Global") %>%
  select(Gene, Pathway, Log2FC, P_value, Direction) %>%
  mutate(
    Significant = P_value < 0.05,
    Effect = case_when(
      Direction == "GOOD" ~ "Protective (↑expr = better survival)",
      Direction == "POOR" ~ "Adverse (↑expr = worse survival)"
    )
  ) %>%
  arrange(P_value)

print(expr_summary)

#------------------------------------------------------------------------------
# 6. INTEGRATE MUTATIONS AND EXPRESSION
#------------------------------------------------------------------------------
cat("\n\n=== INTEGRATED ANALYSIS: Mutations vs Expression ===\n\n")

integrated <- data.frame(
  Gene = c("GNA13", "S1PR2", "P2RY8", "RHOA", "ARHGEF1", "CXCR4", "GNAI2", "RAC2"),
  Pathway = c(rep("Retention", 5), rep("Egress", 3)),
  Mutation_Type = c("LoF", "LoF", "LoF", "LoF", "LoF", "GoF", "GoF", "GoF"),
  Mutation_Freq = c("8-9%", "2-4%", "3-9%", "3-4%", "<1%", "1-2%", "2-3%", "~3%"),
  Expression_Direction = c("NS", "Protective", "Protective", "Protective", "NS", "Adverse", "NS", "Protective"),
  Expr_P = c(0.99, 1.7e-6, 1.5e-6, 0.005, 0.23, 0.03, 0.12, 0.004),
  Biological_Interpretation = c(
    "Mutations = loss of retention signaling",
    "High expr = GC retention, good prognosis; Mutations = egress",
    "Orphan GPCR; High expr = retention, protective",
    "Downstream of GNA13; High expr = protective",
    "RhoGEF; Links GNA13 to RHOA",
    "Truncating muts = enhanced chemotaxis; High expr = adverse",
    "Downstream of S1PR1; Promotes egress",
    "Paradox: egress gene but high expr is protective"
  )
)

cat("Gene-by-Gene Summary:\n\n")
for (i in 1:nrow(integrated)) {
  cat(sprintf("%-8s | %-10s | Mut: %-5s | Expr: %-11s (p=%s)\n",
              integrated$Gene[i],
              integrated$Pathway[i],
              integrated$Mutation_Freq[i],
              integrated$Expression_Direction[i],
              formatC(integrated$Expr_P[i], format = "e", digits = 1)))
  cat(sprintf("         -> %s\n\n", integrated$Biological_Interpretation[i]))
}

#------------------------------------------------------------------------------
# 7. GNA13 CO-OCCURRENCE ANALYSIS
#------------------------------------------------------------------------------
cat("\n=== GNA13 Mutation Co-occurrence ===\n\n")

cat("Genes significantly co-occurring with GNA13 mutations:\n\n")
print(gna13_cooccur %>%
        filter(fdr < 0.1) %>%
        select(gene, freq_gna13_pos, freq_gna13_neg, odds_ratio, p_value) %>%
        rename(
          `GNA13+ (%)` = freq_gna13_pos,
          `GNA13- (%)` = freq_gna13_neg,
          OR = odds_ratio
        ))

#------------------------------------------------------------------------------
# 8. CREATE VISUALIZATIONS
#------------------------------------------------------------------------------
cat("\n\n=== Creating Visualizations ===\n")

fig_dir <- file.path(base_dir, "global_scripts/figures")

# 1. Cross-cohort mutation comparison
png(file.path(fig_dir, "gna13_pathway_mutations_cohorts.png"),
    width = 1200, height = 600, res = 150)

mutation_long <- pathway_comparison %>%
  select(Gene, Pathway, Chapuy_Pct, Duke_Pct) %>%
  filter(!is.na(Chapuy_Pct) & !is.na(Duke_Pct)) %>%
  pivot_longer(cols = c(Chapuy_Pct, Duke_Pct),
               names_to = "Cohort", values_to = "Pct") %>%
  mutate(Cohort = gsub("_Pct", "", Cohort))

ggplot(mutation_long, aes(x = Gene, y = Pct, fill = Cohort)) +
  geom_bar(stat = "identity", position = "dodge", width = 0.7) +
  facet_wrap(~Pathway, scales = "free_x") +
  scale_fill_manual(values = c("Chapuy" = "#3498db", "Duke" = "#e74c3c")) +
  labs(title = "Retention/Egress Pathway Mutation Frequencies",
       subtitle = "Cross-cohort comparison",
       y = "Mutation Frequency (%)", x = "") +
  theme_minimal() +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"),
        axis.text.x = element_text(angle = 45, hjust = 1))

dev.off()
cat("Saved: gna13_pathway_mutations_cohorts.png\n")

# 2. Expression-survival heatmap by COO
png(file.path(fig_dir, "gna13_pathway_expression_coo.png"),
    width = 1000, height = 800, res = 150)

expr_heatmap <- expr_survival %>%
  mutate(
    neg_log_p = -log10(P_value),
    signed_effect = ifelse(Direction == "GOOD", -Log2FC, Log2FC),
    sig_label = case_when(
      P_value < 0.001 ~ "***",
      P_value < 0.01 ~ "**",
      P_value < 0.05 ~ "*",
      TRUE ~ ""
    )
  )

ggplot(expr_heatmap, aes(x = Cohort, y = Gene, fill = signed_effect)) +
  geom_tile(color = "white", size = 0.5) +
  geom_text(aes(label = sig_label), color = "black", size = 4) +
  scale_fill_gradient2(low = "#2ecc71", mid = "white", high = "#e74c3c",
                       midpoint = 0, name = "Effect\n(signed)") +
  facet_wrap(~Pathway, scales = "free_y", ncol = 1) +
  labs(title = "Pathway Gene Expression and Survival by COO",
       subtitle = "Green = higher expr protective; Red = higher expr adverse\n* p<0.05, ** p<0.01, *** p<0.001",
       x = "", y = "") +
  theme_minimal() +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"),
        axis.text.x = element_text(angle = 45, hjust = 1))

dev.off()
cat("Saved: gna13_pathway_expression_coo.png\n")

# 3. GNA13 co-occurrence forest plot
png(file.path(fig_dir, "gna13_cooccurrence_forest.png"),
    width = 1000, height = 800, res = 150)

cooccur_plot <- gna13_cooccur %>%
  filter(p_value < 0.05) %>%
  arrange(odds_ratio) %>%
  mutate(gene = factor(gene, levels = gene))

ggplot(cooccur_plot, aes(x = odds_ratio, y = gene)) +
  geom_vline(xintercept = 1, linetype = "dashed", color = "gray") +
  geom_point(aes(color = odds_ratio > 1), size = 3) +
  geom_segment(aes(x = 1, xend = odds_ratio, y = gene, yend = gene,
                   color = odds_ratio > 1), size = 1) +
  scale_color_manual(values = c("TRUE" = "#e74c3c", "FALSE" = "#3498db"),
                     labels = c("Mutually Exclusive", "Co-occurring"),
                     name = "") +
  scale_x_log10() +
  labs(title = "GNA13 Mutation Co-occurrence",
       subtitle = "Odds ratios for co-mutation with GNA13",
       x = "Odds Ratio (log scale)", y = "") +
  theme_minimal() +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"))

dev.off()
cat("Saved: gna13_cooccurrence_forest.png\n")

# 4. Integrated pathway summary
png(file.path(fig_dir, "gna13_pathway_integrated_summary.png"),
    width = 1200, height = 600, res = 150)

integrated_plot <- integrated %>%
  mutate(
    Expr_Sig = ifelse(Expr_P < 0.05, "Significant", "NS"),
    Gene = factor(Gene, levels = c("S1PR2", "GNA13", "P2RY8", "RHOA", "ARHGEF1",
                                   "CXCR4", "GNAI2", "RAC2"))
  )

ggplot(integrated_plot, aes(x = Gene, y = 1)) +
  geom_tile(aes(fill = Expression_Direction), color = "white", size = 1, height = 0.8) +
  geom_text(aes(label = Mutation_Freq), y = 0.7, size = 3) +
  geom_text(aes(label = ifelse(Expr_P < 0.05,
                                sprintf("p=%s", formatC(Expr_P, format = "e", digits = 0)),
                                "NS")),
            y = 1.3, size = 2.5) +
  scale_fill_manual(values = c("Protective" = "#2ecc71", "Adverse" = "#e74c3c", "NS" = "gray80"),
                    name = "Expression\nEffect") +
  facet_wrap(~Pathway, scales = "free_x") +
  labs(title = "GNA13 Pathway: Mutations and Expression Effects",
       subtitle = "Numbers = mutation frequency; p-values = expression-survival association",
       x = "", y = "") +
  theme_minimal() +
  theme(plot.title = element_text(hjust = 0.5, face = "bold"),
        axis.text.y = element_blank(),
        axis.ticks.y = element_blank(),
        axis.text.x = element_text(angle = 45, hjust = 1))

dev.off()
cat("Saved: gna13_pathway_integrated_summary.png\n")

#------------------------------------------------------------------------------
# 9. SAVE INTEGRATED RESULTS
#------------------------------------------------------------------------------
write.csv(integrated,
          file.path(base_dir, "global_scripts/gna13_pathway_integrated.csv"),
          row.names = FALSE)

#------------------------------------------------------------------------------
# 10. SUMMARY
#------------------------------------------------------------------------------
cat("\n\n", paste(rep("=", 70), collapse = ""), "\n")
cat("   INTEGRATED PATHWAY SUMMARY\n")
cat(paste(rep("=", 70), collapse = ""), "\n\n")

cat("KEY FINDINGS:\n\n")

cat("1. RETENTION PATHWAY (GNA13 axis):\n")
cat("   - GNA13 mutated in 8-9% of DLBCL (highest in GCB)\n")
cat("   - P2RY8 (orphan receptor) mutated in 3-9%\n")
cat("   - S1PR2, P2RY8, RHOA expression all PROTECTIVE\n")
cat("   - GNA13 expression NOT prognostic (transcriptional compensation?)\n\n")

cat("2. EGRESS PATHWAY:\n")
cat("   - CXCR4 mutations rare (1-2%) but expression is ADVERSE\n")
cat("   - RAC2 expression paradoxically PROTECTIVE\n\n")

cat("3. GNA13 CO-OCCURRENCE:\n")
cat("   - Strongly co-occurs with EZH2 (OR=3.67), TNFRSF14 del (OR=3.16)\n")
cat("   - Defines GCB/EZB molecular subtype\n")
cat("   - Mutually exclusive with MYD88 L265P (ABC marker)\n\n")

cat("4. BIOLOGICAL MODEL:\n")
cat("   - Loss of retention signaling (GNA13/S1PR2/P2RY8 mutations)\n")
cat("     allows tumor cells to escape germinal center\n")
cat("   - High expression of these genes = retained in GC = better prognosis\n")
cat("   - CXCR4 high expression = enhanced dissemination = worse prognosis\n\n")

cat("=== ANALYSIS COMPLETE ===\n")
