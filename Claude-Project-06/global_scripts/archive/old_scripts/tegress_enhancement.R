# Enhancing tEgress: Finding Correlated Genes for IPI-Independent Prediction
# Goal: Identify genes that correlate with tEgress components and improve prognostic power

library(survival)
library(dplyr)
library(tidyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("   ENHANCING tEGRESS: CORRELATED GENES ANALYSIS\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. LOAD EXPRESSION DATA FROM GEO SERIES MATRIX
#------------------------------------------------------------------------------
cat("=== Loading Expression Data ===\n")

# Read the series matrix file
series_file <- "Lacy_HMRN/GSE181063_series_matrix.txt.gz"

# Read header info to find data start
con <- gzfile(series_file, "r")
header_lines <- c()
line_num <- 0
while (TRUE) {
  line <- readLines(con, n = 1)
  line_num <- line_num + 1
  if (length(line) == 0) break
  header_lines <- c(header_lines, line)
  if (grepl("^!series_matrix_table_begin", line)) break
}
close(con)

cat("Header lines:", line_num, "\n")

# Now read the expression data
expr_data <- read.delim(gzfile(series_file), skip = line_num, header = TRUE,
                        stringsAsFactors = FALSE, check.names = FALSE)

# Remove the end marker row if present
expr_data <- expr_data[!grepl("series_matrix_table_end", expr_data[,1]), ]

# Set probe IDs as rownames
rownames(expr_data) <- expr_data[,1]
expr_data <- expr_data[, -1]

cat("Expression matrix: ", nrow(expr_data), " probes x ", ncol(expr_data), " samples\n\n")

#------------------------------------------------------------------------------
# 2. LOAD tEGRESS SCORES AND CLINICAL DATA
#------------------------------------------------------------------------------
cat("=== Loading tEgress Scores ===\n")

tegress_scores <- read.csv("Lacy_HMRN/results/tegress_scores.csv", stringsAsFactors = FALSE)
cat("tEgress samples: ", nrow(tegress_scores), "\n")

# Load GCB staged data with IPI
gcb_staged <- read.csv("Lacy_HMRN/results/gcb_staged_tegress.csv", stringsAsFactors = FALSE)
gcb_staged$ipi_num <- as.numeric(gcb_staged$ipi_score)
cat("GCB samples with IPI: ", sum(!is.na(gcb_staged$ipi_num)), "\n\n")

#------------------------------------------------------------------------------
# 3. IDENTIFY tEGRESS COMPONENT PROBES
#------------------------------------------------------------------------------
cat("=== tEgress Component Genes ===\n\n")

# tEgress is calculated from these genes:
# Retention (positive in score): S1PR2, P2RY8, GNA13, RHOA, SGK1
# Egress (negative in score): GNAI2, FOXO1, CXCR4

# The z-scores in tegress_scores tell us the probe mappings
tegress_genes <- c("S1PR2", "P2RY8", "GNA13", "RHOA", "SGK1", "GNAI2", "FOXO1", "CXCR4")
cat("tEgress component genes:\n")
cat("  Retention: S1PR2, P2RY8, GNA13, RHOA, SGK1\n")
cat("  Egress: GNAI2, FOXO1, CXCR4\n\n")

# Load GPL annotation to map probes to genes
# First, let's extract annotation from the series matrix header
annot_lines <- header_lines[grepl("^!platform_table_begin|^!Sample_title|^ID_REF", header_lines)]

# We need to get probe-gene mapping - let's try GEOquery approach
# For now, work with what we have

#------------------------------------------------------------------------------
# 4. FIND ALL PROBES CORRELATED WITH tEGRESS
#------------------------------------------------------------------------------
cat("=== Finding Genes Correlated with tEgress ===\n\n")

# Match samples between expression and tEgress data
common_samples <- intersect(colnames(expr_data), tegress_scores$sample_id)
cat("Common samples: ", length(common_samples), "\n")

if (length(common_samples) > 100) {
  # Subset and align data
  expr_subset <- expr_data[, common_samples]
  tegress_subset <- tegress_scores[match(common_samples, tegress_scores$sample_id), ]

  # Convert to numeric matrix
  expr_mat <- as.matrix(expr_subset)
  expr_mat <- apply(expr_mat, 2, as.numeric)
  rownames(expr_mat) <- rownames(expr_subset)

  # Calculate correlation of each probe with tEgress
  cat("Calculating correlations...\n")

  tegress_cor <- apply(expr_mat, 1, function(probe_expr) {
    if (sum(!is.na(probe_expr)) > 50) {
      cor(probe_expr, tegress_subset$tEgress, use = "pairwise.complete.obs")
    } else {
      NA
    }
  })

  # Also calculate p-values
  tegress_cor_p <- apply(expr_mat, 1, function(probe_expr) {
    if (sum(!is.na(probe_expr)) > 50) {
      cor.test(probe_expr, tegress_subset$tEgress)$p.value
    } else {
      NA
    }
  })

  cor_results <- data.frame(
    probe = names(tegress_cor),
    correlation = tegress_cor,
    p_value = tegress_cor_p,
    stringsAsFactors = FALSE
  ) %>%
    filter(!is.na(correlation)) %>%
    mutate(FDR = p.adjust(p_value, method = "BH")) %>%
    arrange(desc(abs(correlation)))

  cat("Probes tested: ", nrow(cor_results), "\n")
  cat("Significant (FDR < 0.05): ", sum(cor_results$FDR < 0.05), "\n\n")

  cat("--- Top 30 Positively Correlated Probes (High tEgress = High Expression) ---\n")
  print(head(cor_results %>% filter(correlation > 0), 30))

  cat("\n--- Top 30 Negatively Correlated Probes (High tEgress = Low Expression) ---\n")
  print(head(cor_results %>% filter(correlation < 0), 30))

  #------------------------------------------------------------------------------
  # 5. TEST SURVIVAL ASSOCIATION OF TOP CORRELATED PROBES
  #------------------------------------------------------------------------------
  cat("\n=============================================================\n")
  cat("   SURVIVAL ANALYSIS OF tEGRESS-CORRELATED PROBES\n")
  cat("=============================================================\n\n")

  # Merge with survival data
  surv_samples <- tegress_subset %>%
    filter(!is.na(OS_status) & !is.na(OS_time))

  cat("Samples with survival: ", nrow(surv_samples), "\n\n")

  # Test top correlated probes for survival association
  top_probes <- c(
    head(cor_results$probe[cor_results$correlation > 0], 50),
    head(cor_results$probe[cor_results$correlation < 0], 50)
  )

  surv_results <- data.frame()

  for (probe in top_probes) {
    probe_expr <- as.numeric(expr_mat[probe, surv_samples$sample_id])

    if (sum(!is.na(probe_expr)) > 50) {
      # Create survival data frame
      surv_df <- data.frame(
        OS_time = surv_samples$OS_time,
        OS_status = surv_samples$OS_status,
        expr = probe_expr,
        tEgress = surv_samples$tEgress
      ) %>% filter(!is.na(expr))

      # Median split
      surv_df$expr_high <- ifelse(surv_df$expr > median(surv_df$expr, na.rm = TRUE), 1, 0)

      # Cox regression - univariate
      cox_uni <- tryCatch({
        coxph(Surv(OS_time, OS_status) ~ expr, data = surv_df)
      }, error = function(e) NULL)

      # Cox regression - adjusted for tEgress (to find additive value)
      cox_adj <- tryCatch({
        coxph(Surv(OS_time, OS_status) ~ expr + tEgress, data = surv_df)
      }, error = function(e) NULL)

      if (!is.null(cox_uni) && !is.null(cox_adj)) {
        uni_hr <- exp(coef(cox_uni))
        uni_p <- summary(cox_uni)$coefficients[5]

        adj_coefs <- summary(cox_adj)$coefficients
        adj_hr <- exp(adj_coefs[1, 1])
        adj_p <- adj_coefs[1, 5]

        # Get tEgress correlation
        teg_cor <- cor_results$correlation[cor_results$probe == probe]

        surv_results <- rbind(surv_results, data.frame(
          probe = probe,
          tEgress_cor = round(teg_cor, 3),
          uni_HR = round(uni_hr, 3),
          uni_p = uni_p,
          adj_HR = round(adj_hr, 3),
          adj_p = adj_p
        ))
      }
    }
  }

  surv_results$uni_FDR <- p.adjust(surv_results$uni_p, method = "BH")
  surv_results <- surv_results %>% arrange(uni_p)

  cat("--- Probes with Univariate Survival Association (p < 0.05) ---\n")
  print(surv_results %>% filter(uni_p < 0.05) %>% head(30))

  cat("\n--- Probes with INDEPENDENT Survival Value (adj p < 0.1) ---\n")
  cat("(These add prognostic value beyond tEgress alone)\n\n")
  indep_probes <- surv_results %>% filter(adj_p < 0.1) %>% arrange(adj_p)
  print(indep_probes)

  #------------------------------------------------------------------------------
  # 6. BUILD ENHANCED tEGRESS SCORE
  #------------------------------------------------------------------------------
  cat("\n=============================================================\n")
  cat("   BUILDING ENHANCED tEGRESS SCORE\n")
  cat("=============================================================\n\n")

  # Select probes that:
  # 1. Correlate with tEgress (|r| > 0.3)
  # 2. Have independent survival value (adj_p < 0.2)

  enhancer_probes <- surv_results %>%
    filter(abs(tEgress_cor) > 0.2 & adj_p < 0.2)

  cat("Candidate enhancer probes: ", nrow(enhancer_probes), "\n")
  print(enhancer_probes)

  if (nrow(enhancer_probes) >= 3) {
    # Calculate enhanced score
    # Use probes where HR direction matches correlation direction

    # For positively correlated probes: high expression = high tEgress = poor outcome if HR > 1
    # For negatively correlated probes: high expression = low tEgress = good outcome if HR < 1

    enhancement_samples <- surv_samples$sample_id

    enhanced_score <- rep(0, length(enhancement_samples))
    n_probes_used <- 0

    for (i in 1:nrow(enhancer_probes)) {
      probe <- enhancer_probes$probe[i]
      probe_expr <- as.numeric(expr_mat[probe, enhancement_samples])

      if (sum(!is.na(probe_expr)) > 50) {
        # Z-score the expression
        probe_z <- scale(probe_expr)[,1]

        # Direction: if HR > 1, high expression is bad
        # If correlated with tEgress, use same direction
        weight <- sign(enhancer_probes$tEgress_cor[i])

        # Add to score (weighted by absolute correlation)
        enhanced_score <- enhanced_score + weight * abs(enhancer_probes$tEgress_cor[i]) * probe_z
        n_probes_used <- n_probes_used + 1
      }
    }

    cat("Probes used in enhanced score: ", n_probes_used, "\n\n")

    # Create enhanced tEgress
    enhanced_df <- data.frame(
      sample_id = enhancement_samples,
      tEgress = surv_samples$tEgress,
      enhancement = enhanced_score,
      tEgress_enhanced = surv_samples$tEgress + 0.5 * scale(enhanced_score)[,1],
      OS_time = surv_samples$OS_time,
      OS_status = surv_samples$OS_status
    )

    # Compare performance
    cat("--- Comparing Original vs Enhanced tEgress ---\n\n")

    # Original tEgress
    cox_orig <- coxph(Surv(OS_time, OS_status) ~ tEgress, data = enhanced_df)
    cat("Original tEgress:\n")
    cat("  HR =", round(exp(coef(cox_orig)), 3), "\n")
    cat("  p =", format(summary(cox_orig)$coefficients[5], digits = 3), "\n")
    cat("  C-index =", round(summary(cox_orig)$concordance[1], 3), "\n\n")

    # Enhanced tEgress
    cox_enh <- coxph(Surv(OS_time, OS_status) ~ tEgress_enhanced, data = enhanced_df)
    cat("Enhanced tEgress:\n")
    cat("  HR =", round(exp(coef(cox_enh)), 3), "\n")
    cat("  p =", format(summary(cox_enh)$coefficients[5], digits = 3), "\n")
    cat("  C-index =", round(summary(cox_enh)$concordance[1], 3), "\n\n")

    # Enhancement alone
    cox_add <- coxph(Surv(OS_time, OS_status) ~ enhancement, data = enhanced_df)
    cat("Enhancement score alone:\n")
    cat("  HR =", round(exp(coef(cox_add)), 3), "\n")
    cat("  p =", format(summary(cox_add)$coefficients[5], digits = 3), "\n")
    cat("  C-index =", round(summary(cox_add)$concordance[1], 3), "\n\n")

    # Combined model
    cox_comb <- coxph(Surv(OS_time, OS_status) ~ tEgress + enhancement, data = enhanced_df)
    cat("Combined model (tEgress + enhancement):\n")
    print(summary(cox_comb)$coefficients)
    cat("  C-index =", round(summary(cox_comb)$concordance[1], 3), "\n")
  }

  #------------------------------------------------------------------------------
  # 7. TEST IPI INDEPENDENCE OF ENHANCED SCORE
  #------------------------------------------------------------------------------
  cat("\n=============================================================\n")
  cat("   IPI INDEPENDENCE OF ENHANCED SCORE\n")
  cat("=============================================================\n\n")

  # Merge with IPI data
  ipi_samples <- gcb_staged %>%
    filter(!is.na(ipi_num) & sample_id %in% enhancement_samples)

  if (nrow(ipi_samples) > 50) {
    ipi_enhanced <- enhanced_df %>%
      inner_join(ipi_samples %>% select(sample_id, ipi_num), by = "sample_id")

    cat("Samples with IPI and enhanced score: ", nrow(ipi_enhanced), "\n\n")

    # Test correlation with IPI
    cat("--- Correlation with IPI ---\n")
    cor_orig <- cor.test(ipi_enhanced$tEgress, ipi_enhanced$ipi_num)
    cor_enh <- cor.test(ipi_enhanced$tEgress_enhanced, ipi_enhanced$ipi_num)
    cor_add <- cor.test(ipi_enhanced$enhancement, ipi_enhanced$ipi_num)

    cat("Original tEgress vs IPI: r =", round(cor_orig$estimate, 3), ", p =", format(cor_orig$p.value, digits = 3), "\n")
    cat("Enhanced tEgress vs IPI: r =", round(cor_enh$estimate, 3), ", p =", format(cor_enh$p.value, digits = 3), "\n")
    cat("Enhancement vs IPI: r =", round(cor_add$estimate, 3), ", p =", format(cor_add$p.value, digits = 3), "\n\n")

    # Multivariate model with IPI
    cat("--- Multivariate Models with IPI ---\n\n")

    # Original tEgress + IPI
    cox_orig_ipi <- coxph(Surv(OS_time, OS_status) ~ tEgress + ipi_num, data = ipi_enhanced)
    cat("Original tEgress + IPI:\n")
    print(summary(cox_orig_ipi)$coefficients)
    cat("\n")

    # Enhanced tEgress + IPI
    cox_enh_ipi <- coxph(Surv(OS_time, OS_status) ~ tEgress_enhanced + ipi_num, data = ipi_enhanced)
    cat("Enhanced tEgress + IPI:\n")
    print(summary(cox_enh_ipi)$coefficients)
    cat("\n")

    # Full model
    cox_full <- coxph(Surv(OS_time, OS_status) ~ tEgress + enhancement + ipi_num, data = ipi_enhanced)
    cat("Full model (tEgress + enhancement + IPI):\n")
    print(summary(cox_full)$coefficients)
  }

  #------------------------------------------------------------------------------
  # 8. IDENTIFY BIOLOGICAL PATHWAYS IN ENHANCER GENES
  #------------------------------------------------------------------------------
  cat("\n=============================================================\n")
  cat("   BIOLOGICAL INTERPRETATION\n")
  cat("=============================================================\n\n")

  cat("Top probes correlated with tEgress that add independent prognostic value:\n\n")

  if (nrow(enhancer_probes) > 0) {
    for (i in 1:min(10, nrow(enhancer_probes))) {
      probe <- enhancer_probes$probe[i]
      cat(sprintf("%d. %s: cor=%.3f, adj_HR=%.2f, adj_p=%.4f\n",
                  i, probe, enhancer_probes$tEgress_cor[i],
                  enhancer_probes$adj_HR[i], enhancer_probes$adj_p[i]))
    }
  }

  #------------------------------------------------------------------------------
  # 9. SAVE RESULTS
  #------------------------------------------------------------------------------
  cat("\n=============================================================\n")
  cat("                    SAVING RESULTS\n")
  cat("=============================================================\n\n")

  write.csv(cor_results, "global_scripts/tegress_correlated_probes.csv", row.names = FALSE)
  write.csv(surv_results, "global_scripts/tegress_correlated_survival.csv", row.names = FALSE)

  if (exists("enhancer_probes") && nrow(enhancer_probes) > 0) {
    write.csv(enhancer_probes, "global_scripts/tegress_enhancer_probes.csv", row.names = FALSE)
  }

  if (exists("enhanced_df")) {
    write.csv(enhanced_df, "global_scripts/tegress_enhanced_scores.csv", row.names = FALSE)
  }

  cat("Saved:\n")
  cat("  - tegress_correlated_probes.csv\n")
  cat("  - tegress_correlated_survival.csv\n")
  cat("  - tegress_enhancer_probes.csv\n")
  cat("  - tegress_enhanced_scores.csv\n")

} else {
  cat("ERROR: Not enough common samples between expression and tEgress data\n")
}

cat("\n=== ANALYSIS COMPLETE ===\n")
