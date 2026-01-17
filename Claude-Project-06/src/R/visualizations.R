# =============================================================================
# Visualization Module
# GC B-cell Lymphoma Pathway Mutation Analysis
# =============================================================================

# Load required packages
suppressPackageStartupMessages({
  library(tidyverse)
  library(yaml)
  library(ggplot2)
  library(RColorBrewer)
  library(scales)
})

# =============================================================================
# Configuration and Setup
# =============================================================================

get_project_root <- function() {
  here::here()
}

load_config <- function(config_file = "config/genes.yaml") {
  config_path <- file.path(get_project_root(), config_file)
  yaml::read_yaml(config_path)
}

load_processed_data <- function(filename) {
  data_path <- file.path(get_project_root(), "data", "processed", filename)
  read_csv(data_path, show_col_types = FALSE)
}

load_results <- function(filename) {
  results_path <- file.path(get_project_root(), "results", "tables", filename)
  read_csv(results_path, show_col_types = FALSE)
}

save_figure <- function(plot, filename, width = 10, height = 8) {
  output_path <- file.path(get_project_root(), "results", "figures", filename)
  ggsave(output_path, plot, width = width, height = height, dpi = 300)
  message(paste("Saved:", output_path))
}

# Define consistent color palettes
STAGE_COLORS <- c(
  "early_localized" = "#2E86AB",
  "regional" = "#A23B72",
  "disseminated" = "#F18F01",
  "disseminated_bm" = "#C73E1D",
  "disseminated_cns" = "#3B1F2B"
)

PATHWAY_COLORS <- c(
  "tumor_suppressor" = "#4ECDC4",
  "pro_migratory" = "#FF6B6B"
)

STAGE_LABELS <- c(
  "early_localized" = "Early/Localized (I-II)",
  "regional" = "Regional (III)",
  "disseminated" = "Disseminated (IV)",
  "disseminated_bm" = "IV + BM",
  "disseminated_cns" = "IV + CNS"
)

STAGE_ORDER <- c("early_localized", "regional", "disseminated",
                 "disseminated_bm", "disseminated_cns")

# =============================================================================
# Heatmap: Mutation Frequency by Gene and Stage
# =============================================================================

#' Create mutation frequency heatmap
#' @param gene_freq Gene frequency data frame
#' @return ggplot object
plot_gene_frequency_heatmap <- function(gene_freq) {
  # Order stages and genes
  plot_data <- gene_freq %>%
    filter(!is.na(stage_category)) %>%
    mutate(
      stage_category = factor(stage_category, levels = STAGE_ORDER),
      stage_label = STAGE_LABELS[as.character(stage_category)]
    )

  # Calculate gene ordering by overall frequency
  gene_order <- plot_data %>%
    group_by(gene) %>%
    summarise(mean_freq = mean(frequency, na.rm = TRUE)) %>%
    arrange(desc(mean_freq)) %>%
    pull(gene)

  plot_data <- plot_data %>%
    mutate(gene = factor(gene, levels = gene_order))

  p <- ggplot(plot_data, aes(x = stage_label, y = gene, fill = frequency)) +
    geom_tile(color = "white", linewidth = 0.5) +
    geom_text(aes(label = sprintf("%.1f%%", frequency * 100)),
              size = 3, color = "black") +
    scale_fill_gradient2(
      low = "white",
      mid = "#FFE066",
      high = "#D63230",
      midpoint = 0.15,
      name = "Mutation\nFrequency",
      labels = percent_format()
    ) +
    labs(
      title = "Mutation Frequency by Gene and Disease Stage",
      subtitle = "GCB-DLBCL and Follicular Lymphoma",
      x = "Disease Stage",
      y = "Gene"
    ) +
    theme_minimal() +
    theme(
      axis.text.x = element_text(angle = 45, hjust = 1, size = 10),
      axis.text.y = element_text(size = 10),
      panel.grid = element_blank(),
      plot.title = element_text(face = "bold", size = 14),
      legend.position = "right"
    )

  p
}

# =============================================================================
# Bar Chart: Pathway Mutation Comparison
# =============================================================================

#' Create pathway frequency comparison bar chart
#' @param pathway_freq Pathway frequency data frame
#' @return ggplot object
plot_pathway_comparison <- function(pathway_freq) {
  plot_data <- pathway_freq %>%
    filter(!is.na(stage_category)) %>%
    mutate(
      stage_category = factor(stage_category, levels = STAGE_ORDER),
      stage_label = STAGE_LABELS[as.character(stage_category)],
      pathway_label = case_when(
        pathway == "tumor_suppressor" ~ "Tumor Suppressor\n(S1PR2 pathway)",
        pathway == "pro_migratory" ~ "Pro-migratory\n(CXCR4/S1PR1 pathway)",
        TRUE ~ pathway
      )
    )

  p <- ggplot(plot_data, aes(x = stage_label, y = frequency, fill = pathway_label)) +
    geom_col(position = position_dodge(width = 0.8), width = 0.7) +
    geom_text(
      aes(label = sprintf("%.0f%%", frequency * 100)),
      position = position_dodge(width = 0.8),
      vjust = -0.5,
      size = 3
    ) +
    scale_fill_manual(values = c(
      "Tumor Suppressor\n(S1PR2 pathway)" = PATHWAY_COLORS["tumor_suppressor"],
      "Pro-migratory\n(CXCR4/S1PR1 pathway)" = PATHWAY_COLORS["pro_migratory"]
    )) +
    scale_y_continuous(
      labels = percent_format(),
      expand = expansion(mult = c(0, 0.15))
    ) +
    labs(
      title = "Pathway Mutation Frequency by Disease Stage",
      subtitle = "Comparing confinement vs dissemination signaling pathways",
      x = "Disease Stage",
      y = "Mutation Frequency",
      fill = "Pathway"
    ) +
    theme_minimal() +
    theme(
      axis.text.x = element_text(angle = 45, hjust = 1, size = 10),
      panel.grid.major.x = element_blank(),
      plot.title = element_text(face = "bold", size = 14),
      legend.position = "bottom"
    )

  p
}

# =============================================================================
# Forest Plot: Odds Ratios
# =============================================================================

#' Create forest plot from pairwise comparisons
#' @param pairwise_data Pairwise comparison results
#' @return ggplot object
plot_forest <- function(pairwise_data) {
  plot_data <- pairwise_data %>%
    filter(!is.na(odds_ratio), !is.na(ci_lower), !is.na(ci_upper)) %>%
    mutate(
      pathway_label = case_when(
        grepl("tumor_suppressor", variable) ~ "Tumor Suppressor",
        grepl("pro_migratory", variable) ~ "Pro-migratory",
        TRUE ~ variable
      ),
      # Clean up comparison labels
      comparison_label = gsub("_", " ", comparison),
      comparison_label = gsub("early localized", "Early", comparison_label),
      comparison_label = gsub("disseminated cns", "IV+CNS", comparison_label),
      comparison_label = gsub("disseminated bm", "IV+BM", comparison_label),
      comparison_label = gsub("disseminated", "IV", comparison_label),
      comparison_label = gsub("regional", "III", comparison_label)
    )

  if (nrow(plot_data) == 0) {
    message("No valid odds ratios for forest plot")
    return(NULL)
  }

  p <- ggplot(plot_data, aes(x = odds_ratio, y = comparison_label, color = pathway_label)) +
    geom_vline(xintercept = 1, linetype = "dashed", color = "gray50") +
    geom_errorbarh(aes(xmin = ci_lower, xmax = ci_upper),
                   height = 0.2, linewidth = 0.8) +
    geom_point(size = 3) +
    scale_x_log10() +
    scale_color_manual(values = c(
      "Tumor Suppressor" = PATHWAY_COLORS["tumor_suppressor"],
      "Pro-migratory" = PATHWAY_COLORS["pro_migratory"]
    )) +
    facet_wrap(~pathway_label, ncol = 1, scales = "free_y") +
    labs(
      title = "Odds Ratios for Pathway Mutations by Stage Comparison",
      subtitle = "OR > 1 indicates higher mutation frequency in later stage",
      x = "Odds Ratio (95% CI, log scale)",
      y = "Comparison",
      color = "Pathway"
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(face = "bold", size = 14),
      strip.text = element_text(face = "bold"),
      legend.position = "none"
    )

  p
}

# =============================================================================
# Stacked Bar: Sample Distribution
# =============================================================================

#' Create sample distribution by stage
#' @param data Sample summary data
#' @return ggplot object
plot_sample_distribution <- function(data) {
  plot_data <- data %>%
    filter(!is.na(stage_category)) %>%
    count(stage_category) %>%
    mutate(
      stage_category = factor(stage_category, levels = STAGE_ORDER),
      stage_label = STAGE_LABELS[as.character(stage_category)],
      pct = n / sum(n)
    )

  p <- ggplot(plot_data, aes(x = stage_label, y = n, fill = stage_category)) +
    geom_col(width = 0.7) +
    geom_text(aes(label = paste0(n, "\n(", sprintf("%.1f%%", pct * 100), ")")),
              vjust = -0.3, size = 3) +
    scale_fill_manual(values = STAGE_COLORS, guide = "none") +
    scale_y_continuous(expand = expansion(mult = c(0, 0.15))) +
    labs(
      title = "Sample Distribution by Disease Stage",
      x = "Disease Stage",
      y = "Number of Samples"
    ) +
    theme_minimal() +
    theme(
      axis.text.x = element_text(angle = 45, hjust = 1, size = 10),
      panel.grid.major.x = element_blank(),
      plot.title = element_text(face = "bold", size = 14)
    )

  p
}

# =============================================================================
# Mutation Landscape (Oncoplot-style)
# =============================================================================

#' Create simplified oncoplot-style visualization
#' @param data Sample summary data
#' @param genes Gene list
#' @return ggplot object
plot_mutation_landscape <- function(data, genes) {
  # Get mutation columns that exist
  gene_cols <- paste0(genes, "_mut")
  gene_cols <- gene_cols[gene_cols %in% names(data)]

  if (length(gene_cols) == 0) {
    message("No gene mutation columns found")
    return(NULL)
  }

  # Prepare data in long format
  plot_data <- data %>%
    filter(!is.na(stage_category)) %>%
    select(sample_id, stage_category, all_of(gene_cols)) %>%
    pivot_longer(
      cols = all_of(gene_cols),
      names_to = "gene",
      values_to = "mutated"
    ) %>%
    mutate(
      gene = gsub("_mut$", "", gene),
      stage_category = factor(stage_category, levels = STAGE_ORDER)
    ) %>%
    filter(mutated == TRUE)

  # Order samples by stage and mutation count
  sample_order <- data %>%
    filter(!is.na(stage_category)) %>%
    rowwise() %>%
    mutate(
      mut_count = sum(c_across(all_of(gene_cols)), na.rm = TRUE)
    ) %>%
    arrange(stage_category, desc(mut_count)) %>%
    pull(sample_id)

  plot_data <- plot_data %>%
    mutate(sample_id = factor(sample_id, levels = sample_order))

  # Order genes by frequency
  gene_order <- plot_data %>%
    count(gene) %>%
    arrange(desc(n)) %>%
    pull(gene)

  plot_data <- plot_data %>%
    mutate(gene = factor(gene, levels = gene_order))

  p <- ggplot(plot_data, aes(x = sample_id, y = gene, fill = stage_category)) +
    geom_tile(color = "white", linewidth = 0.1) +
    scale_fill_manual(values = STAGE_COLORS, labels = STAGE_LABELS, name = "Stage") +
    labs(
      title = "Mutation Landscape by Disease Stage",
      x = "Samples (ordered by stage)",
      y = "Gene"
    ) +
    theme_minimal() +
    theme(
      axis.text.x = element_blank(),
      axis.ticks.x = element_blank(),
      panel.grid = element_blank(),
      plot.title = element_text(face = "bold", size = 14),
      legend.position = "bottom"
    )

  p
}

# =============================================================================
# Line Plot: Frequency Trends
# =============================================================================

#' Create trend line plot for pathway frequencies
#' @param pathway_freq Pathway frequency data
#' @return ggplot object
plot_frequency_trends <- function(pathway_freq) {
  plot_data <- pathway_freq %>%
    filter(!is.na(stage_category)) %>%
    mutate(
      stage_num = match(stage_category, STAGE_ORDER),
      stage_label = STAGE_LABELS[as.character(stage_category)],
      pathway_label = case_when(
        pathway == "tumor_suppressor" ~ "Tumor Suppressor (S1PR2)",
        pathway == "pro_migratory" ~ "Pro-migratory (CXCR4)",
        TRUE ~ pathway
      )
    )

  p <- ggplot(plot_data, aes(x = stage_num, y = frequency,
                             color = pathway_label, group = pathway_label)) +
    geom_line(linewidth = 1.2) +
    geom_point(size = 3) +
    geom_ribbon(aes(ymin = frequency - sqrt(frequency * (1-frequency) / n_samples),
                    ymax = frequency + sqrt(frequency * (1-frequency) / n_samples),
                    fill = pathway_label),
                alpha = 0.2, color = NA) +
    scale_x_continuous(
      breaks = 1:5,
      labels = c("I-II", "III", "IV", "IV+BM", "IV+CNS")
    ) +
    scale_y_continuous(labels = percent_format()) +
    scale_color_manual(values = c(
      "Tumor Suppressor (S1PR2)" = PATHWAY_COLORS["tumor_suppressor"],
      "Pro-migratory (CXCR4)" = PATHWAY_COLORS["pro_migratory"]
    )) +
    scale_fill_manual(values = c(
      "Tumor Suppressor (S1PR2)" = PATHWAY_COLORS["tumor_suppressor"],
      "Pro-migratory (CXCR4)" = PATHWAY_COLORS["pro_migratory"]
    )) +
    labs(
      title = "Pathway Mutation Frequency Trends Across Disease Stages",
      subtitle = "Shaded region shows standard error",
      x = "Disease Stage",
      y = "Mutation Frequency",
      color = "Pathway",
      fill = "Pathway"
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(face = "bold", size = 14),
      legend.position = "bottom"
    )

  p
}

# =============================================================================
# P-value Annotation Plot
# =============================================================================

#' Create summary plot with p-values
#' @param pathway_freq Pathway frequency data
#' @param trend_tests Trend test results
#' @return ggplot object
plot_summary_with_pvalues <- function(pathway_freq, trend_tests) {
  # Calculate overall frequencies for each pathway
  summary_data <- pathway_freq %>%
    filter(!is.na(stage_category)) %>%
    group_by(pathway) %>%
    summarise(
      overall_freq = weighted.mean(frequency, n_samples),
      total_n = sum(n_samples),
      total_mut = sum(n_mutated),
      .groups = "drop"
    ) %>%
    left_join(
      trend_tests %>% select(variable, p_value, coefficient),
      by = c("pathway" = "variable")
    ) %>%
    mutate(
      pathway_label = case_when(
        pathway == "tumor_suppressor_mutated" ~ "Tumor\nSuppressor",
        pathway == "pro_migratory_mutated" ~ "Pro-\nmigratory",
        pathway == "tumor_suppressor" ~ "Tumor\nSuppressor",
        pathway == "pro_migratory" ~ "Pro-\nmigratory",
        TRUE ~ pathway
      ),
      trend_direction = case_when(
        coefficient > 0 ~ "Increasing",
        coefficient < 0 ~ "Decreasing",
        TRUE ~ "No trend"
      ),
      p_label = case_when(
        is.na(p_value) ~ "",
        p_value < 0.001 ~ "p < 0.001",
        p_value < 0.01 ~ sprintf("p = %.3f", p_value),
        p_value < 0.05 ~ sprintf("p = %.2f", p_value),
        TRUE ~ sprintf("p = %.2f (NS)", p_value)
      )
    )

  p <- ggplot(summary_data, aes(x = pathway_label, y = overall_freq, fill = pathway)) +
    geom_col(width = 0.6) +
    geom_text(aes(label = sprintf("%.1f%%\n(n=%d)", overall_freq * 100, total_mut)),
              vjust = -0.3, size = 3.5) +
    geom_text(aes(label = paste0("Trend: ", trend_direction, "\n", p_label)),
              y = -0.05, size = 3, color = "gray30") +
    scale_fill_manual(values = c(
      "tumor_suppressor" = PATHWAY_COLORS["tumor_suppressor"],
      "pro_migratory" = PATHWAY_COLORS["pro_migratory"],
      "tumor_suppressor_mutated" = PATHWAY_COLORS["tumor_suppressor"],
      "pro_migratory_mutated" = PATHWAY_COLORS["pro_migratory"]
    ), guide = "none") +
    scale_y_continuous(
      labels = percent_format(),
      expand = expansion(mult = c(0.15, 0.2))
    ) +
    labs(
      title = "Overall Pathway Mutation Frequencies",
      subtitle = "With stage trend test results",
      x = "Pathway",
      y = "Mutation Frequency"
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(face = "bold", size = 14),
      panel.grid.major.x = element_blank()
    )

  p
}

# =============================================================================
# Main Visualization Pipeline
# =============================================================================

create_visualizations <- function() {
  message("Creating visualizations...")

  # Load configuration
  config <- load_config()
  genes <- unlist(lapply(config$pathways, function(p) sapply(p$genes, `[[`, "symbol")))

  # Load data
  tryCatch({
    data <- load_processed_data("sample_summary_gcb.csv")
    message(paste("Loaded GCB-filtered data:", nrow(data), "samples"))
  }, error = function(e) {
    data <<- load_processed_data("sample_summary.csv")
    message(paste("Loaded all samples:", nrow(data), "samples"))
  })

  # Load results
  gene_freq <- tryCatch(
    load_results("gene_frequencies_by_stage.csv"),
    error = function(e) NULL
  )

  pathway_freq <- tryCatch(
    load_results("pathway_frequencies_by_stage.csv"),
    error = function(e) NULL
  )

  pairwise <- tryCatch(
    load_results("pairwise_comparisons.csv"),
    error = function(e) NULL
  )

  trend_tests <- tryCatch(
    load_results("trend_tests_pathways.csv"),
    error = function(e) NULL
  )

  # Generate plots
  plots <- list()

  # 1. Sample distribution
  message("  Creating sample distribution plot...")
  plots$sample_dist <- plot_sample_distribution(data)
  save_figure(plots$sample_dist, "sample_distribution.png", width = 8, height = 6)

  # 2. Gene frequency heatmap
  if (!is.null(gene_freq) && nrow(gene_freq) > 0) {
    message("  Creating gene frequency heatmap...")
    plots$heatmap <- plot_gene_frequency_heatmap(gene_freq)
    save_figure(plots$heatmap, "gene_frequency_heatmap.png", width = 12, height = 8)
  }

  # 3. Pathway comparison bar chart
  if (!is.null(pathway_freq) && nrow(pathway_freq) > 0) {
    message("  Creating pathway comparison chart...")
    plots$pathway_bars <- plot_pathway_comparison(pathway_freq)
    save_figure(plots$pathway_bars, "pathway_comparison.png", width = 10, height = 7)

    message("  Creating frequency trend plot...")
    plots$trends <- plot_frequency_trends(pathway_freq)
    save_figure(plots$trends, "frequency_trends.png", width = 10, height = 6)
  }

  # 4. Forest plot
  if (!is.null(pairwise) && nrow(pairwise) > 0) {
    message("  Creating forest plot...")
    plots$forest <- plot_forest(pairwise)
    if (!is.null(plots$forest)) {
      save_figure(plots$forest, "forest_plot_odds_ratios.png", width = 10, height = 8)
    }
  }

  # 5. Mutation landscape
  message("  Creating mutation landscape...")
  plots$landscape <- plot_mutation_landscape(data, genes)
  if (!is.null(plots$landscape)) {
    save_figure(plots$landscape, "mutation_landscape.png", width = 14, height = 6)
  }

  # 6. Summary with p-values
  if (!is.null(pathway_freq) && !is.null(trend_tests)) {
    message("  Creating summary plot...")
    plots$summary <- plot_summary_with_pvalues(pathway_freq, trend_tests)
    save_figure(plots$summary, "pathway_summary.png", width = 8, height = 6)
  }

  message("\n========================================")
  message("VISUALIZATION COMPLETE")
  message("========================================")
  message(paste("Figures saved to:", file.path(get_project_root(), "results", "figures")))
  message("========================================\n")

  invisible(plots)
}

# Run if executed directly
if (!interactive()) {
  create_visualizations()
}
