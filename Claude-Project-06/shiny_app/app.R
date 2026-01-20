# DLBCL Genomics Explorer
# Clean rebuild for shinyapps.io deployment

library(shiny)
library(bslib)
library(dplyr)
library(tidyr)
library(ggplot2)
library(survival)
library(survminer)
library(DT)
library(plotly)

# =============================================================================
# DATA LOADING - All files must be in data/ folder
# =============================================================================

load_data <- function() {
  data <- list()

  # Duke data
  if (file.exists("data/duke_classified.csv")) {
    df <- read.csv("data/duke_classified.csv", stringsAsFactors = FALSE)
    data$duke <- df %>%
      mutate(
        cohort = "Duke",
        sample_id = SAMPLE_ID,
        os_months = OS_MONTHS,
        os_event = OS_EVENT,
        cluster = Subtype,
        S1PR2 = as.integer(S1PR2_mutated),
        GNA13 = as.integer(GNA13_mutated),
        ARHGEF1 = as.integer(ARHGEF1_mutated),
        P2RY8 = as.integer(P2RY8_mutated),
        RHOA = as.integer(RHOA_mutated),
        CXCR4 = as.integer(CXCR4_mutated),
        GNAI2 = as.integer(GNAI2_mutated),
        RAC2 = as.integer(RAC2_mutated),
        ARHGAP25 = as.integer(ARHGAP25_mutated)
      )
  }

  # Chapuy data
  if (file.exists("data/chapuy_integrated_135.csv")) {
    df <- read.csv("data/chapuy_integrated_135.csv", stringsAsFactors = FALSE)
    data$chapuy <- df %>%
      mutate(
        cohort = "Chapuy",
        sample_id = PATIENT_ID,
        os_months = OS_MONTHS,
        os_event = OS_Event,
        cluster = paste0("C", CLUSTER),
        coo = ANY_COO
      )
  }

  # Lacy genomic data
  if (file.exists("data/genomic_data.csv")) {
    df <- read.csv("data/genomic_data.csv", stringsAsFactors = FALSE)
    data$lacy <- df %>%
      rename(sample_id = PID) %>%
      mutate(cohort = "Lacy")
  }

  # Co-occurrence data
  if (file.exists("data/gna13_cooccurrence.csv")) {
    data$cooccur <- read.csv("data/gna13_cooccurrence.csv", stringsAsFactors = FALSE)
  }

  return(data)
}

# Load data at startup
app_data <- load_data()

# Gene lists
duke_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA", "CXCR4", "GNAI2", "RAC2", "ARHGAP25")

lacy_genes <- if (!is.null(app_data$lacy)) {
  cols <- colnames(app_data$lacy)
  cols[!cols %in% c("sample_id", "cohort")]
} else {
  character(0)
}

# =============================================================================
# UI
# =============================================================================

ui <- page_navbar(
  title = "DLBCL Genomics Explorer",
  theme = bs_theme(version = 5, bootswatch = "flatly"),

  # Overview Tab
  nav_panel(
    title = "Overview",
    icon = icon("home"),
    layout_columns(
      col_widths = c(4, 4, 4),
      value_box(
        title = "Duke (WES)",
        value = if (!is.null(app_data$duke)) nrow(app_data$duke) else 0,
        showcase = icon("users"),
        theme = "primary"
      ),
      value_box(
        title = "Chapuy (WES)",
        value = if (!is.null(app_data$chapuy)) nrow(app_data$chapuy) else 0,
        showcase = icon("users"),
        theme = "info"
      ),
      value_box(
        title = "Lacy (Panel)",
        value = if (!is.null(app_data$lacy)) nrow(app_data$lacy) else 0,
        showcase = icon("dna"),
        theme = "success"
      )
    ),
    card(
      card_header("Cohort Information"),
      card_body(
        tableOutput("cohort_table")
      )
    )
  ),

  # Survival by Subtype Tab
  nav_panel(
    title = "Survival by Subtype",
    icon = icon("chart-line"),
    layout_sidebar(
      sidebar = sidebar(
        title = "Options",
        selectInput("subtype_cohort", "Cohort:", choices = c("Duke", "Chapuy"), selected = "Duke"),
        conditionalPanel(
          condition = "input.subtype_cohort == 'Duke'",
          checkboxGroupInput("duke_subtypes", "Subtypes:",
                             choices = c("EZB", "MCD", "BN2", "ST2", "TP53"),
                             selected = c("EZB", "MCD", "BN2", "ST2", "TP53"))
        ),
        conditionalPanel(
          condition = "input.subtype_cohort == 'Chapuy'",
          checkboxGroupInput("chapuy_clusters", "Clusters:",
                             choices = c("C0", "C1", "C2", "C3", "C4", "C5"),
                             selected = c("C0", "C1", "C2", "C3", "C4", "C5"))
        ),
        checkboxInput("show_risk_table", "Show Risk Table", TRUE)
      ),
      card(
        card_header("Kaplan-Meier Survival Curve"),
        plotOutput("km_subtype", height = "550px")
      )
    )
  ),

  # Survival by Mutation Tab
  nav_panel(
    title = "Survival by Mutation",
    icon = icon("dna"),
    layout_sidebar(
      sidebar = sidebar(
        title = "Gene Selection",
        selectInput("mut_cohort", "Cohort:",
                    choices = c("Duke (WES)" = "Duke", "Lacy (Panel - no survival)" = "Lacy"),
                    selected = "Duke"),
        uiOutput("gene_selector"),
        radioButtons("gene_logic", "Logic:",
                     choices = c("Any mutated" = "any", "All mutated" = "all"),
                     selected = "any")
      ),
      card(
        card_header(textOutput("mut_title")),
        plotOutput("km_mutation", height = "550px")
      ),
      card(
        card_header("Mutation Frequencies"),
        plotlyOutput("mut_freq", height = "300px")
      )
    )
  ),

  # Mutation Frequencies Tab
  nav_panel(
    title = "Compare Frequencies",
    icon = icon("chart-bar"),
    layout_sidebar(
      sidebar = sidebar(
        title = "Options",
        checkboxGroupInput("freq_cohorts", "Cohorts:",
                           choices = c("Duke", "Lacy"),
                           selected = c("Duke", "Lacy")),
        selectizeInput("freq_genes", "Genes:",
                       choices = c("GNA13", "RHOA", "CXCR4", "P2RY8"),
                       selected = c("GNA13", "RHOA"),
                       multiple = TRUE)
      ),
      card(
        card_header("Mutation Frequency Comparison"),
        plotlyOutput("freq_plot", height = "500px")
      )
    )
  ),

  # Co-occurrence Tab
  nav_panel(
    title = "Co-occurrence",
    icon = icon("project-diagram"),
    layout_sidebar(
      sidebar = sidebar(
        sliderInput("fdr_cut", "FDR Cutoff:", min = 0.01, max = 0.2, value = 0.1)
      ),
      card(
        card_header("Genes Co-occurring with GNA13"),
        plotlyOutput("cooccur_plot", height = "450px")
      ),
      card(
        card_header("Statistics"),
        DTOutput("cooccur_table")
      )
    )
  ),

  # Data Explorer Tab
  nav_panel(
    title = "Data Explorer",
    icon = icon("table"),
    layout_sidebar(
      sidebar = sidebar(
        selectInput("data_choice", "Dataset:",
                    choices = c("Duke" = "duke", "Chapuy" = "chapuy", "Lacy" = "lacy")),
        downloadButton("download_csv", "Download CSV")
      ),
      card(
        card_header("Data Table"),
        DTOutput("data_table")
      )
    )
  )
)

# =============================================================================
# SERVER
# =============================================================================

server <- function(input, output, session) {

  # Overview table
  output$cohort_table <- renderTable({
    data.frame(
      Cohort = c("Duke", "Chapuy", "Lacy"),
      Patients = c(
        if (!is.null(app_data$duke)) nrow(app_data$duke) else 0,
        if (!is.null(app_data$chapuy)) nrow(app_data$chapuy) else 0,
        if (!is.null(app_data$lacy)) nrow(app_data$lacy) else 0
      ),
      Source = c("WES", "WES", "117-gene Panel"),
      Subtypes = c("EZB/MCD/BN2/ST2/TP53", "Clusters C0-C5", "COO-based"),
      Survival = c("Yes", "Yes", "No")
    )
  }, striped = TRUE, bordered = TRUE)

  # Survival by subtype
  subtype_df <- reactive({
    if (input$subtype_cohort == "Duke" && !is.null(app_data$duke)) {
      app_data$duke %>%
        filter(cluster %in% input$duke_subtypes) %>%
        filter(!is.na(os_months), !is.na(os_event))
    } else if (input$subtype_cohort == "Chapuy" && !is.null(app_data$chapuy)) {
      app_data$chapuy %>%
        filter(cluster %in% input$chapuy_clusters) %>%
        filter(!is.na(os_months), !is.na(os_event))
    } else {
      NULL
    }
  })

  output$km_subtype <- renderPlot({
    req(subtype_df(), nrow(subtype_df()) > 0)
    fit <- survfit(Surv(os_months, os_event) ~ cluster, data = subtype_df())
    ggsurvplot(fit, data = subtype_df(),
               pval = TRUE, risk.table = input$show_risk_table,
               palette = "jco", ggtheme = theme_minimal(),
               title = paste(input$subtype_cohort, "- Survival by Subtype"))
  })

  # Gene selector for mutation analysis
  output$gene_selector <- renderUI({
    if (input$mut_cohort == "Duke") {
      genes <- duke_genes
    } else {
      genes <- lacy_genes[1:min(30, length(lacy_genes))]
    }
    checkboxGroupInput("selected_genes", "Select Genes:", choices = genes,
                       selected = if ("GNA13" %in% genes) "GNA13" else genes[1])
  })

  output$mut_title <- renderText({
    genes <- input$selected_genes
    if (is.null(genes) || length(genes) == 0) return("Select genes")
    paste("Survival by", paste(genes, collapse = "+"), "Mutation")
  })

  # Mutation survival
  mut_df <- reactive({
    req(input$selected_genes)

    if (input$mut_cohort == "Duke" && !is.null(app_data$duke)) {
      df <- app_data$duke
      genes <- input$selected_genes[input$selected_genes %in% colnames(df)]
      req(length(genes) > 0)

      gene_mat <- df[, genes, drop = FALSE]
      if (input$gene_logic == "any") {
        df$mut_status <- as.integer(rowSums(gene_mat, na.rm = TRUE) > 0)
      } else {
        df$mut_status <- as.integer(rowSums(gene_mat, na.rm = TRUE) == length(genes))
      }

      df %>%
        filter(!is.na(os_months), !is.na(os_event)) %>%
        mutate(mut_label = factor(mut_status, 0:1, c("Wild-type", "Mutated")))
    } else {
      NULL
    }
  })

  output$km_mutation <- renderPlot({
    if (input$mut_cohort == "Lacy") {
      plot.new()
      text(0.5, 0.5, "Lacy cohort has no survival data", cex = 1.5, col = "gray50")
      return()
    }

    req(mut_df(), nrow(mut_df()) > 10)
    fit <- survfit(Surv(os_months, os_event) ~ mut_label, data = mut_df())
    ggsurvplot(fit, data = mut_df(),
               pval = TRUE, palette = c("#2C3E50", "#E74C3C"),
               ggtheme = theme_minimal())
  })

  output$mut_freq <- renderPlotly({
    if (input$mut_cohort == "Duke" && !is.null(app_data$duke)) {
      df <- app_data$duke
      genes <- duke_genes
      color <- "#3498DB"
    } else if (!is.null(app_data$lacy)) {
      df <- app_data$lacy
      genes <- lacy_genes[1:20]
      color <- "#27AE60"
    } else {
      return(NULL)
    }

    freqs <- sapply(genes, function(g) {
      if (g %in% colnames(df)) round(100 * mean(df[[g]], na.rm = TRUE), 1) else NA
    })

    plot_df <- data.frame(gene = names(freqs), freq = freqs) %>%
      filter(!is.na(freq)) %>%
      arrange(desc(freq))

    p <- ggplot(plot_df, aes(x = reorder(gene, freq), y = freq)) +
      geom_col(fill = color) +
      coord_flip() +
      labs(x = "Gene", y = "Frequency (%)") +
      theme_minimal()

    ggplotly(p)
  })

  # Frequency comparison
  output$freq_plot <- renderPlotly({
    req(length(input$freq_cohorts) > 0, length(input$freq_genes) > 0)

    results <- list()
    for (coh in input$freq_cohorts) {
      df <- if (coh == "Duke") app_data$duke else app_data$lacy
      if (is.null(df)) next

      for (g in input$freq_genes) {
        if (g %in% colnames(df)) {
          results <- c(results, list(data.frame(
            cohort = coh, gene = g,
            freq = round(100 * mean(df[[g]], na.rm = TRUE), 1)
          )))
        }
      }
    }

    req(length(results) > 0)
    plot_df <- bind_rows(results)

    p <- ggplot(plot_df, aes(x = gene, y = freq, fill = cohort)) +
      geom_col(position = "dodge") +
      scale_fill_manual(values = c("Duke" = "#3498DB", "Lacy" = "#27AE60")) +
      labs(y = "Frequency (%)") +
      theme_minimal()

    ggplotly(p)
  })

  # Co-occurrence
  output$cooccur_plot <- renderPlotly({
    req(app_data$cooccur)

    df <- app_data$cooccur %>%
      filter(fdr <= input$fdr_cut) %>%
      mutate(direction = ifelse(odds_ratio > 1, "Co-occurring", "Exclusive"))

    req(nrow(df) > 0)

    p <- ggplot(df, aes(x = odds_ratio, y = reorder(gene, odds_ratio), fill = direction)) +
      geom_col() +
      geom_vline(xintercept = 1, linetype = "dashed") +
      scale_fill_manual(values = c("Co-occurring" = "#E74C3C", "Exclusive" = "#3498DB")) +
      labs(x = "Odds Ratio", y = "Gene") +
      theme_minimal()

    ggplotly(p)
  })

  output$cooccur_table <- renderDT({
    req(app_data$cooccur)
    app_data$cooccur %>%
      mutate(odds_ratio = round(odds_ratio, 2), fdr = round(fdr, 4)) %>%
      datatable(options = list(pageLength = 10))
  })

  # Data explorer
  selected_data <- reactive({
    switch(input$data_choice,
           "duke" = app_data$duke,
           "chapuy" = app_data$chapuy,
           "lacy" = app_data$lacy)
  })

  output$data_table <- renderDT({
    req(selected_data())
    datatable(selected_data(), options = list(scrollX = TRUE, pageLength = 20), filter = "top")
  })

  output$download_csv <- downloadHandler(
    filename = function() paste0(input$data_choice, "_", Sys.Date(), ".csv"),
    content = function(file) write.csv(selected_data(), file, row.names = FALSE)
  )
}

shinyApp(ui, server)
