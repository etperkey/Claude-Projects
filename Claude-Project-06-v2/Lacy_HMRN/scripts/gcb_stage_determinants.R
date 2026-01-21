# =============================================================================
# GCB-DLBCL: Genomic and Transcriptional Determinants of Stage
# Identify molecular features associated with Limited vs Advanced stage
# =============================================================================

cat("=============================================================\n")
cat("GCB-DLBCL: Molecular Determinants of Stage\n")
cat("=============================================================\n\n")

library(data.table)

lacy_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir <- file.path(lacy_dir, "results")

# =============================================================================
# 1. Load Data
# =============================================================================

cat("Loading data...\n")

# Load GCB staged data (from previous analysis)
gcb_staged <- read.csv(file.path(results_dir, "gcb_staged_tegress.csv"), stringsAsFactors = FALSE)
cat("GCB patients with staging:", nrow(gcb_staged), "\n")

# Filter to Limited vs Advanced only
gcb_staged <- gcb_staged[gcb_staged$stage_group %in% c("Limited", "Advanced"), ]
cat("GCB with Limited/Advanced classification:", nrow(gcb_staged), "\n")
print(table(gcb_staged$stage_group))

# Load mutation data
mutations <- read.csv(file.path(lacy_dir, "genomic_data.csv"), stringsAsFactors = FALSE)
cat("\nMutation data:", nrow(mutations), "patients,", ncol(mutations) - 1, "features\n")

# Load clinical supplement for cluster info
library(readxl)
clinical_supp <- read_excel(file.path(lacy_dir, "blood_2020_supplement.xlsx"),
                            sheet = "S4 Patient Characteristics")

# =============================================================================
# 2. Link Expression Samples to Mutation Data
# =============================================================================

cat("\n=============================================================\n")
cat("Linking Expression to Mutation Data\n")
cat("=============================================================\n\n")

# Parse PID mapping from GEO
series_file <- file.path(lacy_dir, "GSE181063_series_matrix.txt.gz")
con <- gzfile(series_file, "r")
lines <- readLines(con)
close(con)

# Get sample IDs
sample_line <- grep("^!Sample_geo_accession", lines, value = TRUE)
sample_ids <- strsplit(sample_line, "\t")[[1]][-1]
sample_ids <- gsub("\"", "", sample_ids)

# Get PID mapping
pid_line <- grep("pid_pmid_32187361", lines, value = TRUE)
if (length(pid_line) > 0) {
  parts <- strsplit(pid_line, "\t")[[1]][-1]
  parts <- gsub("\"", "", parts)

  pid_map <- data.frame(sample_id = sample_ids, stringsAsFactors = FALSE)
  pid_map$PID <- sapply(parts, function(p) {
    if (grepl(":", p)) {
      trimws(strsplit(p, ":")[[1]][2])
    } else {
      NA
    }
  })
}

# Merge with GCB data
gcb_staged$PID <- pid_map$PID[match(gcb_staged$sample_id, pid_map$sample_id)]
cat("GCB with PID mapping:", sum(!is.na(gcb_staged$PID)), "\n")

# Merge with mutations
gcb_with_mut <- merge(gcb_staged, mutations, by = "PID", all.x = FALSE)
cat("GCB with mutation data:", nrow(gcb_with_mut), "\n")
print(table(gcb_with_mut$stage_group))

# =============================================================================
# 3. Mutation Analysis by Stage
# =============================================================================

cat("\n=============================================================\n")
cat("GENOMIC ANALYSIS: Mutations by Stage\n")
cat("=============================================================\n\n")

if (nrow(gcb_with_mut) >= 20) {

  # Get mutation columns (exclude PID and clinical columns)
  clinical_cols <- c("PID", "sample_id", "COO", "Stage", "stage_group",
                     "num_extranodal", "nodal_only", "tEgress", "OS_years",
                     "OS_status", "ipi_score")
  mut_cols <- setdiff(names(gcb_with_mut), clinical_cols)

  # Calculate mutation frequencies by stage
  limited <- gcb_with_mut[gcb_with_mut$stage_group == "Limited", ]
  advanced <- gcb_with_mut[gcb_with_mut$stage_group == "Advanced", ]

  cat("Limited stage GCB:", nrow(limited), "\n")
  cat("Advanced stage GCB:", nrow(advanced), "\n\n")

  # Fisher's exact test for each mutation
  results <- data.frame(
    Gene = character(),
    Limited_N = integer(),
    Limited_Pct = numeric(),
    Advanced_N = integer(),
    Advanced_Pct = numeric(),
    OR = numeric(),
    P_value = numeric(),
    stringsAsFactors = FALSE
  )

  for (gene in mut_cols) {
    if (is.numeric(gcb_with_mut[[gene]]) || all(gcb_with_mut[[gene]] %in% c(0, 1, NA))) {

      lim_mut <- sum(limited[[gene]] == 1, na.rm = TRUE)
      lim_wt <- sum(limited[[gene]] == 0, na.rm = TRUE)
      adv_mut <- sum(advanced[[gene]] == 1, na.rm = TRUE)
      adv_wt <- sum(advanced[[gene]] == 0, na.rm = TRUE)

      # Only test if there are mutations in both groups or one group
      if ((lim_mut + adv_mut) >= 3) {

        mat <- matrix(c(lim_mut, lim_wt, adv_mut, adv_wt), nrow = 2)

        tryCatch({
          fisher <- fisher.test(mat)

          lim_pct <- 100 * lim_mut / (lim_mut + lim_wt)
          adv_pct <- 100 * adv_mut / (adv_mut + adv_wt)

          results <- rbind(results, data.frame(
            Gene = gene,
            Limited_N = lim_mut,
            Limited_Pct = round(lim_pct, 1),
            Advanced_N = adv_mut,
            Advanced_Pct = round(adv_pct, 1),
            OR = round(fisher$estimate, 2),
            P_value = fisher$p.value,
            stringsAsFactors = FALSE
          ))
        }, error = function(e) {})
      }
    }
  }

  # Sort by p-value
  results <- results[order(results$P_value), ]

  # Calculate direction
  results$Direction <- ifelse(results$Limited_Pct > results$Advanced_Pct,
                               "Limited-enriched", "Advanced-enriched")

  cat("Top mutations by stage association:\n\n")
  print(head(results, 20))

  # Significant mutations
  sig_mutations <- results[results$P_value < 0.05, ]
  cat("\n\nSignificant mutations (p < 0.05):", nrow(sig_mutations), "\n")
  if (nrow(sig_mutations) > 0) {
    print(sig_mutations)
  }

  # Borderline significant
  borderline <- results[results$P_value >= 0.05 & results$P_value < 0.1, ]
  cat("\nBorderline mutations (0.05 <= p < 0.1):", nrow(borderline), "\n")
  if (nrow(borderline) > 0) {
    print(borderline)
  }

  # Save results
  write.csv(results, file.path(results_dir, "gcb_mutations_by_stage.csv"), row.names = FALSE)
  cat("\nSaved: gcb_mutations_by_stage.csv\n")

  # Check egress pathway genes specifically
  cat("\n--- Egress Pathway Genes by Stage ---\n")
  pathway_genes <- c("GNA13", "RHOA", "P2RY8", "CXCR4", "SGK1_S", "S1PR2")
  pathway_results <- results[results$Gene %in% pathway_genes, ]
  if (nrow(pathway_results) > 0) {
    print(pathway_results)
  } else {
    cat("No egress pathway genes with sufficient mutations for testing\n")
  }

} else {
  cat("Insufficient GCB patients with mutation data for analysis\n")
}

# =============================================================================
# 4. Transcriptional Analysis by Stage
# =============================================================================

cat("\n=============================================================\n")
cat("TRANSCRIPTIONAL ANALYSIS: Gene Expression by Stage\n")
cat("=============================================================\n\n")

# Read expression data
expr_start <- grep("!series_matrix_table_begin", lines) + 1
expr_end <- grep("!series_matrix_table_end", lines) - 1

expr_text <- lines[expr_start:expr_end]
expr_df <- fread(text = paste(expr_text, collapse = "\n"), header = TRUE)

probe_ids <- expr_df[[1]]
expr_matrix <- as.matrix(expr_df[, -1, with = FALSE])
rownames(expr_matrix) <- probe_ids
colnames(expr_matrix) <- sample_ids

cat("Expression matrix:", nrow(expr_matrix), "probes x", ncol(expr_matrix), "samples\n")

# Get GCB samples with stage
gcb_limited <- gcb_staged$sample_id[gcb_staged$stage_group == "Limited"]
gcb_advanced <- gcb_staged$sample_id[gcb_staged$stage_group == "Advanced"]

gcb_limited <- gcb_limited[gcb_limited %in% colnames(expr_matrix)]
gcb_advanced <- gcb_advanced[gcb_advanced %in% colnames(expr_matrix)]

cat("Limited GCB samples:", length(gcb_limited), "\n")
cat("Advanced GCB samples:", length(gcb_advanced), "\n\n")

# Differential expression analysis (simple t-test)
cat("Running differential expression analysis...\n")

de_results <- data.frame(
  Probe = character(),
  Mean_Limited = numeric(),
  Mean_Advanced = numeric(),
  Log2FC = numeric(),
  T_stat = numeric(),
  P_value = numeric(),
  stringsAsFactors = FALSE
)

for (i in 1:nrow(expr_matrix)) {
  probe <- rownames(expr_matrix)[i]

  limited_expr <- as.numeric(expr_matrix[i, gcb_limited])
  advanced_expr <- as.numeric(expr_matrix[i, gcb_advanced])

  # Remove NAs
  limited_expr <- limited_expr[!is.na(limited_expr)]
  advanced_expr <- advanced_expr[!is.na(advanced_expr)]

  if (length(limited_expr) > 5 & length(advanced_expr) > 5) {
    if (sd(limited_expr) > 0 & sd(advanced_expr) > 0) {

      ttest <- t.test(limited_expr, advanced_expr)

      mean_lim <- mean(limited_expr)
      mean_adv <- mean(advanced_expr)
      log2fc <- log2((mean_adv + 0.01) / (mean_lim + 0.01))

      de_results <- rbind(de_results, data.frame(
        Probe = probe,
        Mean_Limited = mean_lim,
        Mean_Advanced = mean_adv,
        Log2FC = log2fc,
        T_stat = ttest$statistic,
        P_value = ttest$p.value,
        stringsAsFactors = FALSE
      ))
    }
  }
}

# Adjust p-values
de_results$FDR <- p.adjust(de_results$P_value, method = "BH")

# Sort by p-value
de_results <- de_results[order(de_results$P_value), ]

# Direction
de_results$Direction <- ifelse(de_results$Log2FC > 0, "Advanced-high", "Limited-high")

cat("\nTop differentially expressed probes:\n")
print(head(de_results, 20))

# Significant DE probes
sig_de <- de_results[de_results$FDR < 0.1, ]
cat("\nProbes with FDR < 0.1:", nrow(sig_de), "\n")

# Nominal significant
nom_sig <- de_results[de_results$P_value < 0.01, ]
cat("Probes with p < 0.01:", nrow(nom_sig), "\n")

# Save results
write.csv(de_results, file.path(results_dir, "gcb_expression_by_stage.csv"), row.names = FALSE)
cat("\nSaved: gcb_expression_by_stage.csv\n")

# =============================================================================
# 5. Annotate Top DE Probes with Gene Symbols
# =============================================================================

cat("\n=============================================================\n")
cat("Annotating Top Probes\n")
cat("=============================================================\n\n")

# Load platform annotation (GPL14951)
# Try to get gene symbols from probe IDs or look up

# Check for annotation in series matrix
annot_line <- grep("^!platform_table_begin", lines)
if (length(annot_line) > 0) {
  cat("Platform annotation found in series matrix\n")
} else {
  cat("Platform annotation not in series matrix - using probe IDs\n")
}

# Report top probes (would need annotation file for gene symbols)
cat("\nTop 10 Limited-high probes (higher in limited stage):\n")
limited_high <- de_results[de_results$Direction == "Limited-high", ]
print(head(limited_high[, c("Probe", "Log2FC", "P_value", "FDR")], 10))

cat("\nTop 10 Advanced-high probes (higher in advanced stage):\n")
advanced_high <- de_results[de_results$Direction == "Advanced-high", ]
print(head(advanced_high[, c("Probe", "Log2FC", "P_value", "FDR")], 10))

# =============================================================================
# 6. Check Specific Pathways
# =============================================================================

cat("\n=============================================================\n")
cat("Pathway-Specific Analysis\n")
cat("=============================================================\n\n")

# Define pathway probes (from tEgress analysis)
egress_pathway <- data.frame(
  gene = c("S1PR2", "GNA13", "ARHGEF1", "RHOA", "P2RY8", "ARHGAP25",
           "CXCR4", "GNAI2", "RAC2", "SGK1"),
  probe_id = c("ILMN_1812452", "ILMN_1758906", "ILMN_1772370", "ILMN_1781290",
               "ILMN_1768284", "ILMN_1658853", "ILMN_2246410", "ILMN_1775762",
               "ILMN_1709795", "ILMN_3229324"),
  type = c("retention", "retention", "retention", "retention", "retention", "retention",
           "egress", "egress", "egress", "egress")
)

# Extract egress pathway results
pathway_de <- de_results[de_results$Probe %in% egress_pathway$probe_id, ]
pathway_de <- merge(pathway_de, egress_pathway, by.x = "Probe", by.y = "probe_id")

cat("Egress/Retention Pathway Genes by Stage:\n")
print(pathway_de[, c("gene", "type", "Mean_Limited", "Mean_Advanced", "Log2FC", "P_value")])

# =============================================================================
# 7. Cluster Analysis
# =============================================================================

cat("\n=============================================================\n")
cat("Lacy Molecular Cluster Analysis by Stage\n")
cat("=============================================================\n\n")

# Get cluster info for GCB patients
gcb_staged$cluster_ICL <- clinical_supp$cluster_ICL[match(gcb_staged$PID, clinical_supp$PID)]

cat("GCB patients with cluster assignment:", sum(!is.na(gcb_staged$cluster_ICL)), "\n")
cat("\nCluster distribution in GCB:\n")
print(table(gcb_staged$cluster_ICL, useNA = "ifany"))

# Cluster by stage
cat("\nCluster x Stage:\n")
cluster_stage <- table(gcb_staged$cluster_ICL, gcb_staged$stage_group)
print(cluster_stage)

# Chi-square test
if (sum(cluster_stage) > 20) {
  chisq <- chisq.test(cluster_stage)
  cat("\nChi-square test (Cluster vs Stage):\n")
  cat("  Chi-square:", round(chisq$statistic, 2), "\n")
  cat("  p-value:", format(chisq$p.value, digits = 4), "\n")
}

# =============================================================================
# 8. Summary
# =============================================================================

cat("\n=============================================================\n")
cat("SUMMARY: Molecular Determinants of Stage in GCB-DLBCL\n")
cat("=============================================================\n\n")

cat("GENOMIC FINDINGS:\n")
if (exists("sig_mutations") && nrow(sig_mutations) > 0) {
  cat("  Significant mutations (p < 0.05):\n")
  for (i in 1:nrow(sig_mutations)) {
    cat(sprintf("    - %s: %s (%.1f%% vs %.1f%%, p=%.4f)\n",
                sig_mutations$Gene[i],
                sig_mutations$Direction[i],
                sig_mutations$Limited_Pct[i],
                sig_mutations$Advanced_Pct[i],
                sig_mutations$P_value[i]))
  }
} else {
  cat("  No significant mutations at p < 0.05\n")
}

cat("\nTRANSCRIPTIONAL FINDINGS:\n")
cat(sprintf("  Probes tested: %d\n", nrow(de_results)))
cat(sprintf("  FDR < 0.1: %d\n", nrow(sig_de)))
cat(sprintf("  P < 0.01: %d\n", nrow(nom_sig)))

cat("\n=============================================================\n")
cat("ANALYSIS COMPLETE\n")
cat("=============================================================\n")
