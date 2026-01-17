# =============================================================================
# Statistical Analysis Module
# GC B-cell Lymphoma Pathway Mutation Analysis
# =============================================================================

# Load required packages
suppressPackageStartupMessages({
  library(tidyverse)
  library(yaml)
  library(broom)
})

# =============================================================================
# Configuration and Setup
# =============================================================================

get_project_root <- function() {
  # Get script directory and navigate to project root
  here::here()
}

load_config <- function(config_file = "config/genes.yaml") {
  config_path <- file.path(get_project_root(), config_file)
  yaml::read_yaml(config_path)
}

load_processed_data <- function(filename) {
  data_path <- file.path(get_project_root(), "data", "processed", filename)
  if (!file.exists(data_path)) {
    stop(paste("Data file not found:", data_path))
  }
  read_csv(data_path, show_col_types = FALSE)
}

save_results <- function(df, filename, subdir = "tables") {
  output_path <- file.path(get_project_root(), "results", subdir, filename)
  write_csv(df, output_path)
  message(paste("Saved:", output_path))
}

# =============================================================================
# Frequency Calculations
# =============================================================================

#' Calculate mutation frequency per gene per stage
#' @param data Sample summary data frame
#' @param genes Vector of gene symbols
#' @return Data frame with frequency by gene and stage
calculate_gene_frequencies <- function(data, genes) {
  # Get gene mutation columns
  gene_cols <- paste0(genes, "_mut")
  gene_cols <- gene_cols[gene_cols %in% names(data)]

  # Filter to samples with staging
  staged_data <- data %>%
    filter(!is.na(stage_category))

  results <- list()

  for (gene_col in gene_cols) {
    gene <- gsub("_mut$", "", gene_col)

    freq_df <- staged_data %>%
      group_by(stage_category) %>%
      summarise(
        n_samples = n(),
        n_mutated = sum(get(gene_col), na.rm = TRUE),
        frequency = n_mutated / n_samples,
        .groups = "drop"
      ) %>%
      mutate(gene = gene)

    results[[gene]] <- freq_df
  }

  bind_rows(results)
}

#' Calculate pathway-level mutation frequency per stage
#' @param data Sample summary data frame
#' @return Data frame with pathway frequency by stage
calculate_pathway_frequencies <- function(data) {
  pathway_cols <- c("tumor_suppressor_mutated", "pro_migratory_mutated")
  pathway_cols <- pathway_cols[pathway_cols %in% names(data)]

  staged_data <- data %>%
    filter(!is.na(stage_category))

  results <- list()

  for (pathway_col in pathway_cols) {
    pathway <- gsub("_mutated$", "", pathway_col)

    freq_df <- staged_data %>%
      group_by(stage_category) %>%
      summarise(
        n_samples = n(),
        n_mutated = sum(get(pathway_col), na.rm = TRUE),
        frequency = n_mutated / n_samples,
        .groups = "drop"
      ) %>%
      mutate(pathway = pathway)

    results[[pathway]] <- freq_df
  }

  bind_rows(results)
}

#' Calculate overall frequencies (unstratified)
#' @param data Sample summary data frame
#' @param genes Vector of gene symbols
#' @return Data frame with overall frequencies
calculate_overall_frequencies <- function(data, genes) {
  gene_cols <- paste0(genes, "_mut")
  gene_cols <- gene_cols[gene_cols %in% names(data)]

  results <- tibble(
    gene = character(),
    n_samples = integer(),
    n_mutated = integer(),
    frequency = numeric()
  )

  for (gene_col in gene_cols) {
    gene <- gsub("_mut$", "", gene_col)

    row <- tibble(
      gene = gene,
      n_samples = nrow(data),
      n_mutated = sum(data[[gene_col]], na.rm = TRUE),
      frequency = sum(data[[gene_col]], na.rm = TRUE) / nrow(data)
    )
    results <- bind_rows(results, row)
  }

  results
}

# =============================================================================
# Statistical Tests
# =============================================================================

#' Perform Fisher's exact test for mutation vs stage
#' @param data Sample summary data frame
#' @param mutation_col Name of mutation column
#' @param stage_groups Optional subset of stages to compare
#' @return Tidy data frame with test results
fishers_test_mutation_stage <- function(data, mutation_col, stage_groups = NULL) {
  test_data <- data %>%
    filter(!is.na(stage_category), !is.na(get(mutation_col)))

  if (!is.null(stage_groups)) {
    test_data <- test_data %>%
      filter(stage_category %in% stage_groups)
  }

  # Need at least 2 stages
  if (n_distinct(test_data$stage_category) < 2) {
    return(tibble(
      variable = mutation_col,
      method = "Fisher's exact test",
      p_value = NA_real_,
      note = "Insufficient stage groups"
    ))
  }

  # Create contingency table
  cont_table <- table(
    test_data[[mutation_col]],
    test_data$stage_category
  )

  # Perform test
  tryCatch({
    test_result <- fisher.test(cont_table, simulate.p.value = TRUE, B = 10000)

    tibble(
      variable = mutation_col,
      method = "Fisher's exact test",
      p_value = test_result$p.value,
      note = NA_character_
    )
  }, error = function(e) {
    tibble(
      variable = mutation_col,
      method = "Fisher's exact test",
      p_value = NA_real_,
      note = as.character(e$message)
    )
  })
}

#' Perform chi-squared test for mutation vs stage
#' @param data Sample summary data frame
#' @param mutation_col Name of mutation column
#' @return Tidy data frame with test results
chisq_test_mutation_stage <- function(data, mutation_col) {
  test_data <- data %>%
    filter(!is.na(stage_category), !is.na(get(mutation_col)))

  cont_table <- table(
    test_data[[mutation_col]],
    test_data$stage_category
  )

  # Check if chi-squared is appropriate (expected counts > 5)
  expected <- chisq.test(cont_table)$expected
  if (any(expected < 5)) {
    return(tibble(
      variable = mutation_col,
      method = "Chi-squared",
      p_value = NA_real_,
      statistic = NA_real_,
      df = NA_integer_,
      note = "Expected counts < 5, use Fisher's test"
    ))
  }

  tryCatch({
    test_result <- chisq.test(cont_table)

    tibble(
      variable = mutation_col,
      method = "Chi-squared",
      p_value = test_result$p.value,
      statistic = test_result$statistic,
      df = test_result$parameter,
      note = NA_character_
    )
  }, error = function(e) {
    tibble(
      variable = mutation_col,
      method = "Chi-squared",
      p_value = NA_real_,
      statistic = NA_real_,
      df = NA_integer_,
      note = as.character(e$message)
    )
  })
}

#' Cochran-Armitage trend test for ordered stages
#' @param data Sample summary data frame
#' @param mutation_col Name of mutation column
#' @return Tidy data frame with test results
cochran_armitage_test <- function(data, mutation_col) {
  # Define stage ordering
  stage_order <- c(
    "early_localized" = 1,
    "regional" = 2,
    "disseminated" = 3,
    "disseminated_bm" = 4,
    "disseminated_cns" = 5
  )

  test_data <- data %>%
    filter(!is.na(stage_category), !is.na(get(mutation_col))) %>%
    mutate(stage_numeric = stage_order[stage_category]) %>%
    filter(!is.na(stage_numeric))

  if (nrow(test_data) < 10) {
    return(tibble(
      variable = mutation_col,
      method = "Cochran-Armitage trend",
      p_value = NA_real_,
      statistic = NA_real_,
      note = "Insufficient samples"
    ))
  }

  # Simple trend test using logistic regression
  tryCatch({
    model <- glm(
      as.formula(paste(mutation_col, "~ stage_numeric")),
      data = test_data,
      family = binomial()
    )

    coef_summary <- summary(model)$coefficients
    if (nrow(coef_summary) >= 2) {
      tibble(
        variable = mutation_col,
        method = "Cochran-Armitage trend (logistic)",
        p_value = coef_summary[2, 4],
        statistic = coef_summary[2, 3],
        coefficient = coef_summary[2, 1],
        note = NA_character_
      )
    } else {
      tibble(
        variable = mutation_col,
        method = "Cochran-Armitage trend (logistic)",
        p_value = NA_real_,
        statistic = NA_real_,
        coefficient = NA_real_,
        note = "Model failed to converge"
      )
    }
  }, error = function(e) {
    tibble(
      variable = mutation_col,
      method = "Cochran-Armitage trend (logistic)",
      p_value = NA_real_,
      statistic = NA_real_,
      coefficient = NA_real_,
      note = as.character(e$message)
    )
  })
}

#' Pairwise comparisons between specific stages
#' @param data Sample summary data frame
#' @param mutation_col Name of mutation column
#' @param stage1 First stage to compare
#' @param stage2 Second stage to compare
#' @return Tidy data frame with comparison results
pairwise_stage_comparison <- function(data, mutation_col, stage1, stage2) {
  test_data <- data %>%
    filter(stage_category %in% c(stage1, stage2)) %>%
    filter(!is.na(get(mutation_col)))

  n1 <- sum(test_data$stage_category == stage1)
  n2 <- sum(test_data$stage_category == stage2)
  mut1 <- sum(test_data[[mutation_col]][test_data$stage_category == stage1], na.rm = TRUE)
  mut2 <- sum(test_data[[mutation_col]][test_data$stage_category == stage2], na.rm = TRUE)

  if (n1 < 5 || n2 < 5) {
    return(tibble(
      variable = mutation_col,
      comparison = paste(stage1, "vs", stage2),
      n1 = n1, n2 = n2,
      mut1 = mut1, mut2 = mut2,
      freq1 = mut1/n1, freq2 = mut2/n2,
      p_value = NA_real_,
      odds_ratio = NA_real_,
      note = "Insufficient samples"
    ))
  }

  cont_table <- matrix(
    c(mut1, n1 - mut1, mut2, n2 - mut2),
    nrow = 2, byrow = TRUE
  )

  tryCatch({
    test_result <- fisher.test(cont_table)

    tibble(
      variable = mutation_col,
      comparison = paste(stage1, "vs", stage2),
      n1 = n1, n2 = n2,
      mut1 = mut1, mut2 = mut2,
      freq1 = mut1/n1, freq2 = mut2/n2,
      p_value = test_result$p.value,
      odds_ratio = test_result$estimate,
      ci_lower = test_result$conf.int[1],
      ci_upper = test_result$conf.int[2],
      note = NA_character_
    )
  }, error = function(e) {
    tibble(
      variable = mutation_col,
      comparison = paste(stage1, "vs", stage2),
      p_value = NA_real_,
      note = as.character(e$message)
    )
  })
}

# =============================================================================
# Multivariable Analysis
# =============================================================================

#' Logistic regression: stage predicted by pathway mutations
#' @param data Sample summary data frame
#' @param outcome_stage Stage to use as outcome (disseminated vs earlier)
#' @return Tidy model results
logistic_stage_pathways <- function(data, outcome_stage = "disseminated") {
  # Create binary outcome: outcome_stage vs all others
  model_data <- data %>%
    filter(!is.na(stage_category)) %>%
    mutate(
      outcome = as.integer(stage_category == outcome_stage)
    )

  # Check if pathway columns exist
  has_ts <- "tumor_suppressor_mutated" %in% names(model_data)
  has_pm <- "pro_migratory_mutated" %in% names(model_data)

  if (!has_ts && !has_pm) {
    message("Pathway mutation columns not found")
    return(NULL)
  }

  # Build formula
  predictors <- c()
  if (has_ts) predictors <- c(predictors, "tumor_suppressor_mutated")
  if (has_pm) predictors <- c(predictors, "pro_migratory_mutated")

  formula_str <- paste("outcome ~", paste(predictors, collapse = " + "))

  tryCatch({
    model <- glm(
      as.formula(formula_str),
      data = model_data,
      family = binomial()
    )

    # Tidy results with odds ratios
    tidy(model, exponentiate = TRUE, conf.int = TRUE) %>%
      mutate(outcome_stage = outcome_stage)

  }, error = function(e) {
    message(paste("Logistic regression failed:", e$message))
    NULL
  })
}

#' Multinomial logistic regression for all stage categories
#' @param data Sample summary data frame
#' @return Model summary
multinomial_stage_pathways <- function(data) {
  # This requires nnet package
  if (!requireNamespace("nnet", quietly = TRUE)) {
    message("nnet package required for multinomial regression")
    return(NULL)
  }

  model_data <- data %>%
    filter(!is.na(stage_category)) %>%
    mutate(
      stage_factor = factor(stage_category, levels = c(
        "early_localized", "regional", "disseminated",
        "disseminated_bm", "disseminated_cns"
      ))
    )

  has_ts <- "tumor_suppressor_mutated" %in% names(model_data)
  has_pm <- "pro_migratory_mutated" %in% names(model_data)

  if (!has_ts && !has_pm) {
    return(NULL)
  }

  predictors <- c()
  if (has_ts) predictors <- c(predictors, "tumor_suppressor_mutated")
  if (has_pm) predictors <- c(predictors, "pro_migratory_mutated")

  formula_str <- paste("stage_factor ~", paste(predictors, collapse = " + "))

  tryCatch({
    model <- nnet::multinom(
      as.formula(formula_str),
      data = model_data,
      trace = FALSE
    )

    summary(model)
  }, error = function(e) {
    message(paste("Multinomial regression failed:", e$message))
    NULL
  })
}

# =============================================================================
# Main Analysis Pipeline
# =============================================================================

run_analysis <- function() {
  message("Starting statistical analysis...")

  # Load configuration and data
  config <- load_config()
  genes <- unlist(lapply(config$pathways, function(p) sapply(p$genes, `[[`, "symbol")))

  # Try to load GCB-filtered data first, fall back to all samples
  tryCatch({
    data <- load_processed_data("sample_summary_gcb.csv")
    message(paste("Loaded GCB-filtered data:", nrow(data), "samples"))
  }, error = function(e) {
    data <<- load_processed_data("sample_summary.csv")
    message(paste("Loaded all samples:", nrow(data), "samples"))
  })

  # Check data
  if (nrow(data) == 0) {
    stop("No data loaded")
  }

  results <- list()

  # 1. Calculate frequencies
  message("Calculating mutation frequencies...")

  gene_freq <- calculate_gene_frequencies(data, genes)
  pathway_freq <- calculate_pathway_frequencies(data)
  overall_freq <- calculate_overall_frequencies(data, genes)

  results$gene_frequencies_by_stage <- gene_freq
  results$pathway_frequencies_by_stage <- pathway_freq
  results$overall_frequencies <- overall_freq

  # 2. Statistical tests for each gene
  message("Running statistical tests...")

  gene_tests <- list()
  trend_tests <- list()

  for (gene in genes) {
    gene_col <- paste0(gene, "_mut")
    if (gene_col %in% names(data)) {
      # Fisher's test
      gene_tests[[gene]] <- fishers_test_mutation_stage(data, gene_col)

      # Trend test
      trend_tests[[gene]] <- cochran_armitage_test(data, gene_col)
    }
  }

  results$fisher_tests_genes <- bind_rows(gene_tests)
  results$trend_tests_genes <- bind_rows(trend_tests)

  # 3. Statistical tests for pathways
  pathway_tests <- list()
  pathway_trend <- list()

  for (pathway in c("tumor_suppressor", "pro_migratory")) {
    pathway_col <- paste0(pathway, "_mutated")
    if (pathway_col %in% names(data)) {
      pathway_tests[[pathway]] <- fishers_test_mutation_stage(data, pathway_col)
      pathway_trend[[pathway]] <- cochran_armitage_test(data, pathway_col)
    }
  }

  results$fisher_tests_pathways <- bind_rows(pathway_tests)
  results$trend_tests_pathways <- bind_rows(pathway_trend)

  # 4. Key pairwise comparisons
  message("Running pairwise comparisons...")

  comparisons <- list(
    c("early_localized", "disseminated"),
    c("early_localized", "disseminated_cns"),
    c("disseminated", "disseminated_cns"),
    c("disseminated", "disseminated_bm")
  )

  pairwise_results <- list()
  for (pathway in c("tumor_suppressor", "pro_migratory")) {
    pathway_col <- paste0(pathway, "_mutated")
    if (pathway_col %in% names(data)) {
      for (comp in comparisons) {
        key <- paste(pathway, comp[1], comp[2], sep = "_")
        pairwise_results[[key]] <- pairwise_stage_comparison(
          data, pathway_col, comp[1], comp[2]
        )
      }
    }
  }

  results$pairwise_comparisons <- bind_rows(pairwise_results)

  # 5. Logistic regression
  message("Running logistic regression...")

  logistic_dissem <- logistic_stage_pathways(data, "disseminated")
  logistic_cns <- logistic_stage_pathways(data, "disseminated_cns")
  logistic_bm <- logistic_stage_pathways(data, "disseminated_bm")

  results$logistic_disseminated <- logistic_dissem
  results$logistic_cns <- logistic_cns
  results$logistic_bm <- logistic_bm

  # 6. Save results
  message("Saving results...")

  save_results(gene_freq, "gene_frequencies_by_stage.csv")
  save_results(pathway_freq, "pathway_frequencies_by_stage.csv")
  save_results(overall_freq, "overall_frequencies.csv")
  save_results(results$fisher_tests_genes, "fisher_tests_genes.csv")
  save_results(results$trend_tests_genes, "trend_tests_genes.csv")
  save_results(results$fisher_tests_pathways, "fisher_tests_pathways.csv")
  save_results(results$trend_tests_pathways, "trend_tests_pathways.csv")
  save_results(results$pairwise_comparisons, "pairwise_comparisons.csv")

  if (!is.null(logistic_dissem)) {
    save_results(logistic_dissem, "logistic_disseminated.csv")
  }
  if (!is.null(logistic_cns)) {
    save_results(logistic_cns, "logistic_cns.csv")
  }
  if (!is.null(logistic_bm)) {
    save_results(logistic_bm, "logistic_bm.csv")
  }

  # 7. Print summary
  message("\n========================================")
  message("STATISTICAL ANALYSIS SUMMARY")
  message("========================================")

  message(paste("\nTotal samples analyzed:", nrow(data)))

  if (nrow(pathway_freq) > 0) {
    message("\nPathway mutation frequencies by stage:")
    print(pathway_freq %>% select(pathway, stage_category, frequency) %>%
            pivot_wider(names_from = stage_category, values_from = frequency))
  }

  if (nrow(results$trend_tests_pathways) > 0) {
    message("\nTrend test results (pathway mutations across stages):")
    print(results$trend_tests_pathways %>% select(variable, p_value, coefficient))
  }

  message("\nResults saved to: results/tables/")
  message("========================================\n")

  invisible(results)
}

# Run if executed directly
if (!interactive()) {
  run_analysis()
}
