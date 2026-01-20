# Broad Exploratory Analysis of DLBCL Datasets
# Looking beyond egress pathway for novel findings

library(survival)
library(dplyr)
library(tidyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("       BROAD EXPLORATORY ANALYSIS OF DLBCL DATASETS\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. LOAD ALL DATA
#------------------------------------------------------------------------------
cat("=== Loading Data ===\n")

# Lacy genomic (928 patients, 117 features)
lacy_genomic <- read.csv("Lacy_HMRN/genomic_data.csv", stringsAsFactors = FALSE)
lacy_genetic <- read.csv("Lacy_HMRN/data/genetic_egress_scores.csv", stringsAsFactors = FALSE)

# Chapuy (135 patients, WES)
chapuy <- read.csv("Chapuy_Broad/data/processed/chapuy_integrated_135.csv", stringsAsFactors = FALSE)

# Duke (1001 patients)
duke <- read.csv("Reddy_Duke/data/processed/duke_classified.csv", stringsAsFactors = FALSE)

# Expression-based mortality signatures
mort_global <- read.csv("Lacy_HMRN/results/mortality_signature_global.csv", stringsAsFactors = FALSE)
mort_gcb <- read.csv("Lacy_HMRN/results/mortality_signature_gcb.csv", stringsAsFactors = FALSE)
mort_abc <- read.csv("Lacy_HMRN/results/mortality_signature_abc.csv", stringsAsFactors = FALSE)

cat("Lacy genomic: ", nrow(lacy_genomic), " patients, ", ncol(lacy_genomic)-1, " features\n")
cat("Chapuy: ", nrow(chapuy), " patients\n")
cat("Duke: ", nrow(duke), " patients\n")

#------------------------------------------------------------------------------
# 2. MOST COMMONLY MUTATED GENES (LACY)
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("           MUTATION LANDSCAPE (LACY n=928)\n")
cat("=============================================================\n\n")

# Calculate mutation frequencies
gene_cols <- names(lacy_genomic)[names(lacy_genomic) != "PID"]
mutation_freq <- data.frame(
  gene = gene_cols,
  n_mutated = sapply(gene_cols, function(g) sum(lacy_genomic[[g]], na.rm = TRUE)),
  freq_pct = sapply(gene_cols, function(g) round(mean(lacy_genomic[[g]], na.rm = TRUE) * 100, 1))
)
mutation_freq <- mutation_freq %>% arrange(desc(freq_pct))

cat("Top 30 most frequently mutated genes:\n")
print(head(mutation_freq, 30))

#------------------------------------------------------------------------------
# 3. SURVIVAL ANALYSIS FOR TOP MUTATIONS (LACY)
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("         MUTATION-SURVIVAL ASSOCIATIONS (LACY)\n")
cat("=============================================================\n\n")

# Merge with survival data
surv_data <- lacy_genetic %>%
  select(PID, OS_time, OS_status, PFS_time, PFS_status, cluster_ICL, cell_of_origin)

lacy_surv <- lacy_genomic %>%
  left_join(surv_data, by = "PID") %>%
  filter(!is.na(OS_status) & !is.na(OS_time))

cat("Samples with survival data: ", nrow(lacy_surv), "\n\n")

# Test top 50 genes for OS association
top_genes <- head(mutation_freq$gene, 50)
surv_results <- data.frame(
  gene = character(),
  n_mutated = integer(),
  freq_pct = numeric(),
  HR = numeric(),
  HR_lower = numeric(),
  HR_upper = numeric(),
  p_value = numeric(),
  stringsAsFactors = FALSE
)

for (gene in top_genes) {
  n_mut <- sum(lacy_surv[[gene]], na.rm = TRUE)
  if (n_mut >= 20 && n_mut <= (nrow(lacy_surv) - 20)) {
    cox <- tryCatch({
      coxph(as.formula(paste("Surv(OS_time, OS_status) ~", gene)), data = lacy_surv)
    }, error = function(e) NULL)

    if (!is.null(cox)) {
      hr <- exp(coef(cox))
      ci <- exp(confint(cox))
      pval <- summary(cox)$coefficients[5]

      surv_results <- rbind(surv_results, data.frame(
        gene = gene,
        n_mutated = n_mut,
        freq_pct = round(n_mut / nrow(lacy_surv) * 100, 1),
        HR = round(hr, 2),
        HR_lower = round(ci[1], 2),
        HR_upper = round(ci[2], 2),
        p_value = pval
      ))
    }
  }
}

surv_results$FDR <- p.adjust(surv_results$p_value, method = "BH")
surv_results <- surv_results %>% arrange(p_value)

cat("--- Mutations Associated with Overall Survival ---\n")
cat("(Showing genes with p < 0.05)\n\n")
sig_surv <- surv_results %>% filter(p_value < 0.05)
print(sig_surv)

cat("\n--- Top Protective Mutations (HR < 1) ---\n")
protective <- surv_results %>% filter(HR < 1) %>% arrange(HR) %>% head(10)
print(protective)

cat("\n--- Top Harmful Mutations (HR > 1) ---\n")
harmful <- surv_results %>% filter(HR > 1) %>% arrange(desc(HR)) %>% head(10)
print(harmful)

#------------------------------------------------------------------------------
# 4. CLUSTER-SPECIFIC MUTATION PROFILES
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("          CLUSTER-SPECIFIC MUTATION PROFILES\n")
cat("=============================================================\n\n")

# Mutation rates by cluster
cluster_mut_rates <- data.frame(gene = character())

for (cluster in c("BCL2", "MYD88", "SGK1", "NEC")) {
  cluster_data <- lacy_surv %>% filter(cluster_ICL == cluster)
  rates <- sapply(top_genes[1:30], function(g) round(mean(cluster_data[[g]], na.rm = TRUE) * 100, 1))
  cluster_mut_rates[[cluster]] <- rates
}
cluster_mut_rates$gene <- top_genes[1:30]
cluster_mut_rates <- cluster_mut_rates %>% select(gene, everything())

cat("Mutation rates (%) by genetic cluster (top 30 genes):\n")
print(cluster_mut_rates)

# Find cluster-defining mutations (highest enrichment)
cat("\n--- Cluster-Defining Mutations ---\n")
for (cluster in c("BCL2", "MYD88", "SGK1", "NEC")) {
  cat("\n", cluster, " cluster:\n")
  cluster_data <- lacy_surv %>% filter(cluster_ICL == cluster)
  other_data <- lacy_surv %>% filter(cluster_ICL != cluster)

  enriched <- data.frame(gene = character(), cluster_rate = numeric(),
                         other_rate = numeric(), fold_enrichment = numeric(),
                         p_value = numeric())

  for (gene in top_genes[1:50]) {
    rate_cluster <- mean(cluster_data[[gene]], na.rm = TRUE)
    rate_other <- mean(other_data[[gene]], na.rm = TRUE)

    if (rate_cluster > 0.05 && rate_other > 0) {
      fold <- rate_cluster / rate_other
      test <- tryCatch(fisher.test(table(lacy_surv$cluster_ICL == cluster, lacy_surv[[gene]])),
                       error = function(e) NULL)
      if (!is.null(test) && fold > 2) {
        enriched <- rbind(enriched, data.frame(
          gene = gene,
          cluster_rate = round(rate_cluster * 100, 1),
          other_rate = round(rate_other * 100, 1),
          fold_enrichment = round(fold, 1),
          p_value = test$p.value
        ))
      }
    }
  }
  enriched <- enriched %>% arrange(desc(fold_enrichment)) %>% head(5)
  print(enriched)
}

#------------------------------------------------------------------------------
# 5. NOVEL CO-MUTATION PATTERNS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("            NOVEL CO-MUTATION PATTERNS\n")
cat("=============================================================\n\n")

# Find strongly co-occurring or mutually exclusive pairs
# Focus on top 30 most mutated genes
top30 <- top_genes[1:30]
co_mut_results <- data.frame(
  gene1 = character(), gene2 = character(),
  both = integer(), gene1_only = integer(), gene2_only = integer(), neither = integer(),
  odds_ratio = numeric(), p_value = numeric(), pattern = character()
)

for (i in 1:(length(top30)-1)) {
  for (j in (i+1):length(top30)) {
    g1 <- top30[i]
    g2 <- top30[j]

    tbl <- table(lacy_genomic[[g1]], lacy_genomic[[g2]])
    if (nrow(tbl) == 2 && ncol(tbl) == 2) {
      test <- tryCatch(fisher.test(tbl), error = function(e) NULL)
      if (!is.null(test) && test$p.value < 0.001) {
        co_mut_results <- rbind(co_mut_results, data.frame(
          gene1 = g1, gene2 = g2,
          both = tbl[2,2], gene1_only = tbl[2,1], gene2_only = tbl[1,2], neither = tbl[1,1],
          odds_ratio = round(test$estimate, 2),
          p_value = test$p.value,
          pattern = ifelse(test$estimate > 1, "Co-occurring", "Mutually exclusive")
        ))
      }
    }
  }
}

co_mut_results$FDR <- p.adjust(co_mut_results$p_value, method = "BH")

cat("--- Strongly Co-occurring Mutations (OR > 2, FDR < 0.05) ---\n")
cooccur <- co_mut_results %>%
  filter(odds_ratio > 2 & FDR < 0.05) %>%
  arrange(desc(odds_ratio))
print(head(cooccur, 15))

cat("\n--- Mutually Exclusive Mutations (OR < 0.5, FDR < 0.05) ---\n")
exclusive <- co_mut_results %>%
  filter(odds_ratio < 0.5 & FDR < 0.05) %>%
  arrange(odds_ratio)
print(head(exclusive, 15))

#------------------------------------------------------------------------------
# 6. TP53 MUTATION ANALYSIS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("              TP53 MUTATION ANALYSIS\n")
cat("=============================================================\n\n")

if ("TP53" %in% names(lacy_surv) || "TP53_OR_del" %in% names(lacy_surv)) {
  tp53_col <- ifelse("TP53" %in% names(lacy_surv), "TP53", "TP53_OR_del")

  cat("TP53 mutation/deletion rate: ", round(mean(lacy_surv[[tp53_col]], na.rm = TRUE) * 100, 1), "%\n")

  # Survival
  cox_tp53 <- coxph(as.formula(paste("Surv(OS_time, OS_status) ~", tp53_col)), data = lacy_surv)
  hr <- exp(coef(cox_tp53))
  ci <- exp(confint(cox_tp53))
  pval <- summary(cox_tp53)$coefficients[5]
  cat("TP53 OS: HR = ", round(hr, 2), " (", round(ci[1], 2), "-", round(ci[2], 2), "), p = ",
      format(pval, digits = 3), "\n")

  # TP53 by cluster
  cat("\nTP53 rate by cluster:\n")
  tp53_by_cluster <- lacy_surv %>%
    group_by(cluster_ICL) %>%
    summarise(
      n = n(),
      tp53_rate = round(mean(get(tp53_col), na.rm = TRUE) * 100, 1),
      .groups = "drop"
    ) %>%
    arrange(desc(tp53_rate))
  print(tp53_by_cluster)

  # What co-occurs with TP53?
  cat("\nGenes co-occurring with TP53:\n")
  tp53_pos <- lacy_genomic %>% filter(get(tp53_col) == 1)
  tp53_neg <- lacy_genomic %>% filter(get(tp53_col) == 0)

  tp53_cooccur <- data.frame(gene = character(), tp53_pos_rate = numeric(),
                              tp53_neg_rate = numeric(), OR = numeric(), p = numeric())
  for (gene in top_genes[1:40]) {
    if (gene != tp53_col) {
      rate_pos <- mean(tp53_pos[[gene]], na.rm = TRUE)
      rate_neg <- mean(tp53_neg[[gene]], na.rm = TRUE)
      tbl <- table(lacy_genomic[[tp53_col]], lacy_genomic[[gene]])
      if (nrow(tbl) == 2 && ncol(tbl) == 2) {
        test <- tryCatch(fisher.test(tbl), error = function(e) NULL)
        if (!is.null(test) && test$p.value < 0.01) {
          tp53_cooccur <- rbind(tp53_cooccur, data.frame(
            gene = gene,
            tp53_pos_rate = round(rate_pos * 100, 1),
            tp53_neg_rate = round(rate_neg * 100, 1),
            OR = round(test$estimate, 2),
            p = test$p.value
          ))
        }
      }
    }
  }
  tp53_cooccur <- tp53_cooccur %>% arrange(p)
  print(head(tp53_cooccur, 10))
}

#------------------------------------------------------------------------------
# 7. EXPRESSION MORTALITY SIGNATURES - IDENTIFY GENES
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("         MORTALITY SIGNATURE GENES (EXPRESSION)\n")
cat("=============================================================\n\n")

cat("--- Global Mortality Signature (top 20) ---\n")
cat("(Genes where expression differs between alive vs dead)\n\n")
print(mort_global %>%
        select(Probe, Gene_Symbol, Log2FC, P_value, FDR, Direction) %>%
        head(20))

cat("\n--- GCB-Specific Mortality Signature (top 20) ---\n")
print(mort_gcb %>%
        select(Probe, Gene_Symbol, Log2FC, P_value, FDR, Direction) %>%
        head(20))

cat("\n--- ABC-Specific Mortality Signature (top 20) ---\n")
print(mort_abc %>%
        select(Probe, Gene_Symbol, Log2FC, P_value, FDR, Direction) %>%
        head(20))

#------------------------------------------------------------------------------
# 8. CHAPUY CLUSTER ANALYSIS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("            CHAPUY CLUSTER ANALYSIS (n=135)\n")
cat("=============================================================\n\n")

cat("Cluster distribution:\n")
print(table(chapuy$CLUSTER, useNA = "ifany"))

cat("\nSurvival by cluster:\n")
chapuy_surv <- chapuy %>% filter(!is.na(OS_Event) & !is.na(OS_MONTHS))

cluster_surv <- chapuy_surv %>%
  group_by(CLUSTER) %>%
  summarise(
    n = n(),
    events = sum(OS_Event),
    event_rate = round(mean(OS_Event) * 100, 1),
    median_OS = round(median(OS_MONTHS[OS_Event == 1], na.rm = TRUE), 1),
    .groups = "drop"
  ) %>%
  arrange(desc(event_rate))
print(cluster_surv)

# Cox regression for clusters
cat("\nCox regression by cluster (vs C0):\n")
chapuy_surv$CLUSTER <- factor(chapuy_surv$CLUSTER)
cox_cluster <- coxph(Surv(OS_MONTHS, OS_Event) ~ CLUSTER, data = chapuy_surv)
print(summary(cox_cluster)$coefficients)

#------------------------------------------------------------------------------
# 9. DUKE SUBTYPE ANALYSIS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("            DUKE SUBTYPE ANALYSIS (n=1001)\n")
cat("=============================================================\n\n")

cat("Subtype distribution:\n")
print(table(duke$Subtype, useNA = "ifany"))

cat("\nSurvival by subtype:\n")
duke_surv <- duke %>% filter(!is.na(OS_EVENT) & !is.na(OS_MONTHS))

subtype_surv <- duke_surv %>%
  group_by(Subtype) %>%
  summarise(
    n = n(),
    events = sum(OS_EVENT),
    event_rate = round(mean(OS_EVENT) * 100, 1),
    median_OS = round(median(OS_MONTHS[OS_EVENT == 1], na.rm = TRUE), 1),
    .groups = "drop"
  ) %>%
  arrange(desc(event_rate))
print(subtype_surv)

#------------------------------------------------------------------------------
# 10. SAVE KEY RESULTS
#------------------------------------------------------------------------------
cat("\n=============================================================\n")
cat("                  SAVING RESULTS\n")
cat("=============================================================\n\n")

write.csv(mutation_freq, "global_scripts/lacy_mutation_frequencies.csv", row.names = FALSE)
write.csv(surv_results, "global_scripts/lacy_mutation_survival.csv", row.names = FALSE)
write.csv(co_mut_results, "global_scripts/lacy_comutation_patterns.csv", row.names = FALSE)

cat("Saved:\n")
cat("  - lacy_mutation_frequencies.csv\n")
cat("  - lacy_mutation_survival.csv\n")
cat("  - lacy_comutation_patterns.csv\n")

cat("\n=== ANALYSIS COMPLETE ===\n")
