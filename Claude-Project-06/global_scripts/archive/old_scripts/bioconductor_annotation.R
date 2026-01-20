# Annotate probes using Bioconductor illuminaHumanv4.db
# Gene symbols for top prognostic probes

library(dplyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("   ANNOTATING PROBES WITH BIOCONDUCTOR\n")
cat("=============================================================\n\n")

# Try to load or install illuminaHumanv4.db
has_db <- tryCatch({
  library(illuminaHumanv4.db)
  TRUE
}, error = function(e) {
  cat("illuminaHumanv4.db not installed\n")
  FALSE
})

if (has_db) {
  cat("Using illuminaHumanv4.db for annotation\n")

  # Get mapping
  probe2symbol <- as.list(illuminaHumanv4SYMBOL)

  # Load results
  global_surv <- read.csv("global_scripts/survival_global_all_coo.csv", stringsAsFactors = FALSE)
  gcb_surv <- read.csv("global_scripts/survival_gcb.csv", stringsAsFactors = FALSE)
  abc_surv <- read.csv("global_scripts/survival_abc.csv", stringsAsFactors = FALSE)
  mhg_surv <- read.csv("global_scripts/survival_mhg.csv", stringsAsFactors = FALSE)
  unc_surv <- read.csv("global_scripts/survival_unc.csv", stringsAsFactors = FALSE)

  # Annotate function
  annotate_df <- function(df) {
    df$gene <- sapply(df$probe, function(p) {
      sym <- probe2symbol[[p]]
      if (is.null(sym) || is.na(sym)) return(NA)
      return(sym)
    })
    return(df)
  }

  global_annot <- annotate_df(global_surv)
  gcb_annot <- annotate_df(gcb_surv)
  abc_annot <- annotate_df(abc_surv)
  mhg_annot <- annotate_df(mhg_surv)
  unc_annot <- annotate_df(unc_surv)

  # Display annotated results
  display_annotated <- function(df, name) {
    cat("\n\n=== ", name, " ===\n")

    cat("\nProtective (HR < 1, FDR < 0.05):\n")
    protective <- df %>%
      filter(HR < 1, FDR < 0.05, !is.na(gene)) %>%
      arrange(p_value) %>%
      head(15)
    print(protective %>%
            mutate(HR = round(HR, 3), p = signif(p_value, 3)) %>%
            select(gene, probe, HR, p))

    cat("\nHarmful (HR > 1, FDR < 0.05):\n")
    harmful <- df %>%
      filter(HR > 1, FDR < 0.05, !is.na(gene)) %>%
      arrange(p_value) %>%
      head(15)
    print(harmful %>%
            mutate(HR = round(HR, 3), p = signif(p_value, 3)) %>%
            select(gene, probe, HR, p))
  }

  display_annotated(global_annot, "GLOBAL (1303 samples)")
  display_annotated(gcb_annot, "GCB (517 samples)")
  display_annotated(abc_annot, "ABC (345 samples)")
  display_annotated(mhg_annot, "MHG (164 samples)")
  display_annotated(unc_annot, "UNC (277 samples)")

  # Save annotated results
  write.csv(global_annot, "global_scripts/survival_global_annotated.csv", row.names = FALSE)
  write.csv(gcb_annot, "global_scripts/survival_gcb_annotated.csv", row.names = FALSE)
  write.csv(abc_annot, "global_scripts/survival_abc_annotated.csv", row.names = FALSE)
  write.csv(mhg_annot, "global_scripts/survival_mhg_annotated.csv", row.names = FALSE)
  write.csv(unc_annot, "global_scripts/survival_unc_annotated.csv", row.names = FALSE)

  cat("\n\nSaved annotated results\n")

} else {
  cat("\nTrying to install illuminaHumanv4.db...\n")

  if (!require("BiocManager", quietly = TRUE)) {
    install.packages("BiocManager")
  }

  tryCatch({
    BiocManager::install("illuminaHumanv4.db", update = FALSE, ask = FALSE)
    library(illuminaHumanv4.db)
    cat("Package installed successfully\n")
  }, error = function(e) {
    cat("Could not install:", e$message, "\n")
    cat("\nFalling back to manual annotation lookup...\n")
  })
}

cat("\n=== COMPLETE ===\n")
