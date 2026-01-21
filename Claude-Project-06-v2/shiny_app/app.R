# DLBCL Genomics Explorer - Shiny App
# Interactive visualization of DLBCL pathway mutations and survival outcomes

# =============================================================================
# PACKAGES
# =============================================================================
library(shiny)
library(bslib)
library(dplyr)
library(ggplot2)
library(survival)
library(survminer)
library(DT)
library(plotly)
library(tidyr)

# =============================================================================
# DATA LOADING
# =============================================================================

# Define base path (adjust for deployment)
# Check for local data/ directory first (shinyapps.io deployment)
# Then fall back to parent directory (local development)
if (dir.exists("data") && length(list.files("data", pattern = "\\.csv$")) > 0) {
  base_path <- "."
  data_subdir <- "data"
} else {
  base_path <- normalizePath("..", mustWork = FALSE)
  data_subdir <- NULL
}

# Load datasets with error handling
load_data <- function() {
  data <- list()

  # Helper to find file (checks deployed data/ dir first, then original location)
  find_file <- function(filename, original_path) {
    if (!is.null(data_subdir)) {
      deployed_path <- file.path(base_path, data_subdir, filename)
      if (file.exists(deployed_path)) return(deployed_path)
    }
    full_path <- file.path(base_path, original_path)
    if (file.exists(full_path)) return(full_path)
    return(NULL)
  }

  # Combined survival data
  survival_path <- find_file("combined_survival_data.csv", "global_scripts/combined_survival_data.csv")
  if (!is.null(survival_path)) {
    data$survival <- read.csv(survival_path, stringsAsFactors = FALSE)
  }

  # Chapuy integrated data
  chapuy_path <- find_file("chapuy_integrated_135.csv", "Chapuy_Broad/data/processed/chapuy_integrated_135.csv")
  if (!is.null(chapuy_path)) {
    data$chapuy <- read.csv(chapuy_path, stringsAsFactors = FALSE)
  }

  # tEgress clinical data (REMoDL-B)
  tegress_path <- find_file("tEgress_clinical.csv", "Sha_REMoDL-B/data/processed/tEgress_clinical.csv")
  if (!is.null(tegress_path)) {
    data$tegress <- read.csv(tegress_path, stringsAsFactors = FALSE)
  }

  # GNA13 co-occurrence
  cooccur_path <- find_file("gna13_cooccurrence.csv", "global_scripts/gna13_cooccurrence.csv")
  if (!is.null(cooccur_path)) {
    data$cooccur <- read.csv(cooccur_path, stringsAsFactors = FALSE)
  }

  # Pathway status by patient (Chapuy)
  pathway_path <- find_file("pathway_status_by_patient.csv", "Chapuy_Broad/data/processed/pathway_status_by_patient.csv")
  if (!is.null(pathway_path)) {
    data$pathway <- read.csv(pathway_path, stringsAsFactors = FALSE)
  }

  return(data)
}

# Load data at startup
app_data <- load_data()

# =============================================================================
# UI
# =============================================================================

ui <- page_navbar(
  title = "DLBCL Genomics Explorer",
  theme = bs_theme(
    version = 5,
    bootswatch = "flatly",
    primary = "#2C3E50",
    secondary = "#18BC9C"
  ),

  # --- Overview Tab ---
  nav_panel(
    title = "Overview",
    icon = icon("home"),
    layout_columns(
      col_widths = c(4, 4, 4),
      value_box(
        title = "Total Patients",
        value = if (!is.null(app_data$survival)) nrow(app_data$survival) else "N/A",
        showcase = icon("users"),
        theme = "primary"
      ),
      value_box(
        title = "Cohorts",
        value = if (!is.null(app_data$survival)) length(unique(app_data$survival$cohort)) else "N/A",
        showcase = icon("database"),
        theme = "secondary"
      ),
      value_box(
        title = "Molecular Subtypes",
        value = if (!is.null(app_data$survival)) length(unique(app_data$survival$coo)) else "N/A",
        showcase = icon("dna"),
        theme = "info"
      )
    ),
    card(
      card_header("About This Application"),
      card_body(
        markdown("
### GC B-cell Positioning Pathway in DLBCL

This interactive application explores the relationship between **GC B-cell positioning pathway mutations**
and patient outcomes in Diffuse Large B-Cell Lymphoma (DLBCL).

**Key Pathways Analyzed:**
- **Retention genes** (Loss-of-Function): S1PR2, GNA13, ARHGEF1, P2RY8, RHOA
- **Egress genes** (Gain-of-Function): CXCR4, GNAI2, RAC2, ARHGAP25

**Data Sources:**
- Chapuy et al. (Broad Institute) - 135 patients with deep genomic profiling
- Duke (Reddy et al.) - 1,001 patients with clinical outcomes
- Lacy (HMRN) - 928 patients with transcriptomic data
- REMoDL-B (Sha et al.) - Expression-based tEgress signatures
- GAMBL (Dreval et al.) - Re-analyzed mutation data

**Navigate** using the tabs above to explore survival outcomes, pathway mutations, and transcriptomic signatures.
        ")
      )
    )
  ),

  # --- Survival Analysis Tab ---
  nav_panel(
    title = "Survival Analysis",
    icon = icon("chart-line"),
    layout_sidebar(
      sidebar = sidebar(
        title = "Filters",
        width = 300,
        selectInput(
          "surv_cohort",
          "Select Cohort(s):",
          choices = if (!is.null(app_data$survival)) c("All", unique(app_data$survival$cohort)) else "All",
          selected = "All",
          multiple = TRUE
        ),
        selectInput(
          "surv_coo",
          "Molecular Subtype:",
          choices = if (!is.null(app_data$survival)) c("All", unique(app_data$survival$coo)) else "All",
          selected = "All",
          multiple = TRUE
        ),
        radioButtons(
          "surv_stratify",
          "Stratify By:",
          choices = c(
            "Pathway Mutation" = "has_pathway_mut",
            "Egress Status" = "egress_high",
            "Molecular Subtype" = "coo"
          ),
          selected = "has_pathway_mut"
        ),
        hr(),
        checkboxInput("surv_risk_table", "Show Risk Table", value = TRUE),
        checkboxInput("surv_conf_int", "Show Confidence Interval", value = FALSE)
      ),
      card(
        card_header("Kaplan-Meier Survival Curve"),
        card_body(
          plotOutput("km_plot", height = "500px")
        )
      ),
      card(
        card_header("Survival Statistics"),
        card_body(
          verbatimTextOutput("surv_stats")
        )
      )
    )
  ),

  # --- Pathway Analysis Tab ---
  nav_panel(
    title = "Pathway Analysis",
    icon = icon("project-diagram"),
    layout_sidebar(
      sidebar = sidebar(
        title = "Options",
        width = 250,
        selectInput(
          "pathway_view",
          "View:",
          choices = c(
            "GNA13 Co-occurrence" = "cooccur",
            "Pathway Frequencies" = "freq"
          ),
          selected = "cooccur"
        ),
        conditionalPanel(
          condition = "input.pathway_view == 'cooccur'",
          sliderInput(
            "fdr_threshold",
            "FDR Threshold:",
            min = 0.01, max = 0.1, value = 0.05, step = 0.01
          )
        )
      ),
      card(
        card_header("Gene Co-occurrence with GNA13 Mutations"),
        card_body(
          plotlyOutput("pathway_plot", height = "500px")
        )
      ),
      card(
        card_header("Co-occurrence Data"),
        card_body(
          DTOutput("pathway_table")
        )
      )
    )
  ),

  # --- tEgress Explorer Tab ---
  nav_panel(
    title = "tEgress Scores",
    icon = icon("wave-square"),
    layout_sidebar(
      sidebar = sidebar(
        title = "Filters",
        width = 250,
        selectInput(
          "tegress_coo",
          "COO Subtype:",
          choices = if (!is.null(app_data$tegress)) c("All", unique(app_data$tegress$molecular_coo_subtype)) else "All",
          selected = "All"
        ),
        selectInput(
          "tegress_subtype",
          "Molecular Subtype:",
          choices = if (!is.null(app_data$tegress)) c("All", unique(app_data$tegress$molecular_subtype)) else "All",
          selected = "All"
        )
      ),
      layout_columns(
        col_widths = c(6, 6),
        card(
          card_header("tEgress Score Distribution"),
          card_body(
            plotOutput("tegress_hist", height = "350px")
          )
        ),
        card(
          card_header("Retention vs Egress Scores"),
          card_body(
            plotlyOutput("tegress_scatter", height = "350px")
          )
        )
      ),
      card(
        card_header("tEgress by Subtype"),
        card_body(
          plotOutput("tegress_box", height = "400px")
        )
      )
    )
  ),

  # --- Data Explorer Tab ---
  nav_panel(
    title = "Data Explorer",
    icon = icon("table"),
    layout_sidebar(
      sidebar = sidebar(
        title = "Dataset",
        width = 250,
        selectInput(
          "data_source",
          "Select Dataset:",
          choices = c(
            "Combined Survival" = "survival",
            "Chapuy (Broad)" = "chapuy",
            "tEgress (REMoDL-B)" = "tegress",
            "GNA13 Co-occurrence" = "cooccur"
          ),
          selected = "survival"
        ),
        downloadButton("download_data", "Download CSV")
      ),
      card(
        card_header("Data Table"),
        card_body(
          DTOutput("data_table")
        )
      )
    )
  ),

  # --- Footer ---
  nav_spacer(),
  nav_item(
    tags$a(
      icon("github"),
      "Source",
      href = "https://github.com/ericperkey",
      target = "_blank"
    )
  )
)

# =============================================================================
# SERVER
# =============================================================================

server <- function(input, output, session) {

  # ---------------------------------------------------------------------------
  # Reactive Data
  # ---------------------------------------------------------------------------

  # Filtered survival data
  surv_data <- reactive({
    req(app_data$survival)

    df <- app_data$survival

    # Filter by cohort
    if (!"All" %in% input$surv_cohort && length(input$surv_cohort) > 0) {
      df <- df %>% filter(cohort %in% input$surv_cohort)
    }

    # Filter by COO
    if (!"All" %in% input$surv_coo && length(input$surv_coo) > 0) {
      df <- df %>% filter(coo %in% input$surv_coo)
    }

    df
  })

  # Filtered tEgress data
  tegress_data <- reactive({
    req(app_data$tegress)

    df <- app_data$tegress

    if (input$tegress_coo != "All") {
      df <- df %>% filter(molecular_coo_subtype == input$tegress_coo)
    }

    if (input$tegress_subtype != "All") {
      df <- df %>% filter(molecular_subtype == input$tegress_subtype)
    }

    df
  })

  # ---------------------------------------------------------------------------
  # Survival Analysis
  # ---------------------------------------------------------------------------

  output$km_plot <- renderPlot({
    req(nrow(surv_data()) > 0)

    df <- surv_data()
    strat_var <- input$surv_stratify

    # Create survival formula
    if (strat_var == "has_pathway_mut") {
      df$strata <- factor(df$has_pathway_mut, levels = c(0, 1),
                          labels = c("No Pathway Mutation", "Pathway Mutation"))
    } else if (strat_var == "egress_high") {
      df$strata <- factor(df$egress_high, levels = c(0, 1),
                          labels = c("Low Egress", "High Egress"))
    } else {
      df$strata <- factor(df$coo)
    }

    # Remove NA strata
    df <- df %>% filter(!is.na(strata))

    # Fit survival model
    fit <- survfit(Surv(os_time, os_event) ~ strata, data = df)

    # Plot
    ggsurvplot(
      fit,
      data = df,
      pval = TRUE,
      pval.method = TRUE,
      conf.int = input$surv_conf_int,
      risk.table = input$surv_risk_table,
      risk.table.col = "strata",
      palette = c("#2C3E50", "#E74C3C", "#18BC9C", "#F39C12", "#9B59B6"),
      ggtheme = theme_minimal(base_size = 14),
      title = paste("Overall Survival by",
                    switch(strat_var,
                           "has_pathway_mut" = "Pathway Mutation Status",
                           "egress_high" = "Egress Score",
                           "coo" = "Molecular Subtype")),
      xlab = "Time (Months)",
      ylab = "Survival Probability"
    )
  })

  output$surv_stats <- renderPrint({
    req(nrow(surv_data()) > 0)

    df <- surv_data()
    strat_var <- input$surv_stratify

    if (strat_var == "has_pathway_mut") {
      df$strata <- factor(df$has_pathway_mut)
    } else if (strat_var == "egress_high") {
      df$strata <- factor(df$egress_high)
    } else {
      df$strata <- factor(df$coo)
    }

    df <- df %>% filter(!is.na(strata))

    fit <- survfit(Surv(os_time, os_event) ~ strata, data = df)

    cat("=== Survival Summary ===\n\n")
    print(fit)

    cat("\n=== Log-Rank Test ===\n")
    diff <- survdiff(Surv(os_time, os_event) ~ strata, data = df)
    print(diff)
  })

  # ---------------------------------------------------------------------------
  # Pathway Analysis
  # ---------------------------------------------------------------------------

  output$pathway_plot <- renderPlotly({
    req(app_data$cooccur)

    df <- app_data$cooccur %>%
      filter(fdr <= input$fdr_threshold) %>%
      mutate(
        gene = reorder(gene, odds_ratio),
        direction = ifelse(odds_ratio > 1, "Co-occurring", "Mutually Exclusive")
      )

    p <- ggplot(df, aes(x = odds_ratio, y = gene, fill = direction)) +
      geom_col() +
      geom_vline(xintercept = 1, linetype = "dashed", color = "gray50") +
      scale_fill_manual(values = c("Co-occurring" = "#E74C3C", "Mutually Exclusive" = "#3498DB")) +
      labs(
        x = "Odds Ratio",
        y = "Gene",
        fill = "Association",
        title = paste("Genes Associated with GNA13 Mutations (FDR <", input$fdr_threshold, ")")
      ) +
      theme_minimal(base_size = 12)

    ggplotly(p) %>% layout(showlegend = TRUE)
  })

  output$pathway_table <- renderDT({
    req(app_data$cooccur)

    app_data$cooccur %>%
      mutate(
        odds_ratio = round(odds_ratio, 2),
        p_value = format(p_value, scientific = TRUE, digits = 3),
        fdr = round(fdr, 4)
      ) %>%
      datatable(
        options = list(pageLength = 10, scrollX = TRUE),
        rownames = FALSE
      )
  })

  # ---------------------------------------------------------------------------
  # tEgress Explorer
  # ---------------------------------------------------------------------------

  output$tegress_hist <- renderPlot({
    req(nrow(tegress_data()) > 0)

    ggplot(tegress_data(), aes(x = tEgress, fill = molecular_coo_subtype)) +
      geom_histogram(bins = 30, alpha = 0.7, position = "identity") +
      scale_fill_manual(values = c("GCB" = "#2ECC71", "ABC" = "#E74C3C", "Unclassified" = "#95A5A6")) +
      labs(
        x = "tEgress Score",
        y = "Count",
        fill = "COO Subtype",
        title = "Distribution of tEgress Scores"
      ) +
      theme_minimal(base_size = 14) +
      theme(legend.position = "top")
  })

  output$tegress_scatter <- renderPlotly({
    req(nrow(tegress_data()) > 0)

    p <- ggplot(tegress_data(), aes(x = retention_score, y = egress_score,
                                     color = molecular_coo_subtype,
                                     text = paste("Sample:", sample_id))) +
      geom_point(alpha = 0.6, size = 2) +
      scale_color_manual(values = c("GCB" = "#2ECC71", "ABC" = "#E74C3C", "Unclassified" = "#95A5A6")) +
      labs(
        x = "Retention Score",
        y = "Egress Score",
        color = "COO",
        title = "Retention vs Egress Signature Scores"
      ) +
      theme_minimal(base_size = 12)

    ggplotly(p, tooltip = c("text", "x", "y"))
  })

  output$tegress_box <- renderPlot({
    req(nrow(tegress_data()) > 0)

    ggplot(tegress_data(), aes(x = molecular_subtype, y = tEgress, fill = molecular_subtype)) +
      geom_boxplot(alpha = 0.7, outlier.shape = 21) +
      geom_jitter(width = 0.2, alpha = 0.3, size = 1) +
      scale_fill_brewer(palette = "Set2") +
      labs(
        x = "Molecular Subtype",
        y = "tEgress Score",
        title = "tEgress Score by Molecular Subtype"
      ) +
      theme_minimal(base_size = 14) +
      theme(
        legend.position = "none",
        axis.text.x = element_text(angle = 45, hjust = 1)
      )
  })

  # ---------------------------------------------------------------------------
  # Data Explorer
  # ---------------------------------------------------------------------------

  selected_data <- reactive({
    switch(input$data_source,
           "survival" = app_data$survival,
           "chapuy" = app_data$chapuy,
           "tegress" = app_data$tegress,
           "cooccur" = app_data$cooccur)
  })

  output$data_table <- renderDT({
    req(selected_data())

    datatable(
      selected_data(),
      options = list(
        pageLength = 25,
        scrollX = TRUE,
        scrollY = "500px"
      ),
      filter = "top",
      rownames = FALSE
    )
  })

  output$download_data <- downloadHandler(
    filename = function() {
      paste0(input$data_source, "_", Sys.Date(), ".csv")
    },
    content = function(file) {
      write.csv(selected_data(), file, row.names = FALSE)
    }
  )
}

# =============================================================================
# RUN APP
# =============================================================================

shinyApp(ui = ui, server = server)
