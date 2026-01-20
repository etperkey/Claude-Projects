# Annotate Survival Results with Gene Symbols
# Using GPL14951 platform annotation

library(dplyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("   ANNOTATING SURVIVAL ANALYSIS RESULTS\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. GET FULL PLATFORM ANNOTATION
#------------------------------------------------------------------------------
cat("=== Loading Platform Annotation ===\n")

# Check if full annotation exists
full_annot_file <- "Lacy_HMRN/GPL14951_full_annotation.csv"

if (!file.exists(full_annot_file)) {
  cat("Downloading GPL14951 annotation from GEO...\n")

  # Download the full platform annotation
  url <- "https://ftp.ncbi.nlm.nih.gov/geo/platforms/GPL14nnn/GPL14951/soft/GPL14951_family.soft.gz"
  dest <- "Lacy_HMRN/GPL14951_family.soft.gz"

  tryCatch({
    download.file(url, dest, mode = "wb", quiet = TRUE)

    # Parse the SOFT file for probe annotations
    con <- gzfile(dest, "r")
    lines <- readLines(con)
    close(con)

    # Find the data table
    table_start <- which(grepl("^!platform_table_begin", lines))
    table_end <- which(grepl("^!platform_table_end", lines))

    if (length(table_start) > 0 && length(table_end) > 0) {
      header_line <- lines[table_start + 1]
      headers <- strsplit(header_line, "\t")[[1]]

      data_lines <- lines[(table_start + 2):(table_end - 1)]

      annot_df <- data.frame(
        do.call(rbind, strsplit(data_lines, "\t")),
        stringsAsFactors = FALSE
      )
      names(annot_df) <- headers

      write.csv(annot_df, full_annot_file, row.names = FALSE)
      cat("Saved annotation with", nrow(annot_df), "probes\n")
    }
  }, error = function(e) {
    cat("Could not download annotation:", e$message, "\n")
  })
}

# Load the annotation
if (file.exists(full_annot_file)) {
  annot <- read.csv(full_annot_file, stringsAsFactors = FALSE)
  cat("Loaded annotation for", nrow(annot), "probes\n")
  cat("Columns:", paste(names(annot)[1:10], collapse = ", "), "...\n\n")
} else {
  cat("No annotation file available\n")
  annot <- NULL
}

#------------------------------------------------------------------------------
# 2. LOAD SURVIVAL RESULTS
#------------------------------------------------------------------------------
cat("=== Loading Survival Results ===\n")

global_surv <- read.csv("global_scripts/survival_global_all_coo.csv", stringsAsFactors = FALSE)
gcb_surv <- read.csv("global_scripts/survival_gcb.csv", stringsAsFactors = FALSE)
abc_surv <- read.csv("global_scripts/survival_abc.csv", stringsAsFactors = FALSE)
mhg_surv <- read.csv("global_scripts/survival_mhg.csv", stringsAsFactors = FALSE)
unc_surv <- read.csv("global_scripts/survival_unc.csv", stringsAsFactors = FALSE)

cat("Loaded results for all subsets\n\n")

#------------------------------------------------------------------------------
# 3. ANNOTATE FUNCTION
#------------------------------------------------------------------------------
annotate_results <- function(results, annot, subset_name) {
  if (is.null(annot)) {
    cat("\nNo annotation available for", subset_name, "\n")
    return(results)
  }

  # Find the gene symbol column
  symbol_col <- grep("Symbol|SYMBOL|symbol", names(annot), value = TRUE)[1]
  id_col <- grep("^ID$|Probe_Id|ID_REF", names(annot), value = TRUE)[1]

  if (is.na(symbol_col) || is.na(id_col)) {
    cat("Could not find symbol or ID columns\n")
    return(results)
  }

  # Join annotation
  results_annotated <- results %>%
    left_join(annot %>% select(all_of(c(id_col, symbol_col))),
              by = setNames(id_col, "probe"))

  names(results_annotated)[names(results_annotated) == symbol_col] <- "gene"

  return(results_annotated)
}

#------------------------------------------------------------------------------
# 4. ANNOTATE ALL RESULTS
#------------------------------------------------------------------------------
if (!is.null(annot)) {
  global_annot <- annotate_results(global_surv, annot, "Global")
  gcb_annot <- annotate_results(gcb_surv, annot, "GCB")
  abc_annot <- annotate_results(abc_surv, annot, "ABC")
  mhg_annot <- annotate_results(mhg_surv, annot, "MHG")
  unc_annot <- annotate_results(unc_surv, annot, "UNC")

  #------------------------------------------------------------------------------
  # 5. DISPLAY TOP ANNOTATED RESULTS
  #------------------------------------------------------------------------------
  cat("\n", paste(rep("=", 60), collapse = ""), "\n")
  cat("   TOP PROGNOSTIC GENES BY SUBSET (Annotated)\n")
  cat(paste(rep("=", 60), collapse = ""), "\n\n")

  display_top <- function(results, subset_name, n = 15) {
    cat("\n--- ", subset_name, " ---\n")

    if (!"gene" %in% names(results)) {
      cat("No gene annotation\n")
      return()
    }

    # Top protective
    cat("\nProtective (HR < 1):\n")
    protective <- results %>%
      filter(HR < 1, FDR < 0.05) %>%
      arrange(p_value) %>%
      head(n)

    if (nrow(protective) > 0) {
      print(protective %>%
              mutate(HR = round(HR, 3), p_value = signif(p_value, 3)) %>%
              select(gene, probe, HR, p_value))
    }

    # Top harmful
    cat("\nHarmful (HR > 1):\n")
    harmful <- results %>%
      filter(HR > 1, FDR < 0.05) %>%
      arrange(p_value) %>%
      head(n)

    if (nrow(harmful) > 0) {
      print(harmful %>%
              mutate(HR = round(HR, 3), p_value = signif(p_value, 3)) %>%
              select(gene, probe, HR, p_value))
    }
  }

  display_top(global_annot, "GLOBAL", 15)
  display_top(gcb_annot, "GCB", 15)
  display_top(abc_annot, "ABC", 15)
  display_top(mhg_annot, "MHG", 15)
  display_top(unc_annot, "UNC", 15)

  #------------------------------------------------------------------------------
  # 6. CROSS-SUBSET COMPARISON
  #------------------------------------------------------------------------------
  cat("\n", paste(rep("=", 60), collapse = ""), "\n")
  cat("   SUBSET-SPECIFIC GENES\n")
  cat(paste(rep("=", 60), collapse = ""), "\n\n")

  # Get significant genes from each subset
  get_sig_genes <- function(results, fdr_thresh = 0.05) {
    if (!"gene" %in% names(results)) return(character(0))
    results %>%
      filter(FDR < fdr_thresh, !is.na(gene), gene != "") %>%
      pull(gene) %>%
      unique()
  }

  global_genes <- get_sig_genes(global_annot)
  gcb_genes <- get_sig_genes(gcb_annot)
  abc_genes <- get_sig_genes(abc_annot)
  mhg_genes <- get_sig_genes(mhg_annot)
  unc_genes <- get_sig_genes(unc_annot)

  cat("Significant genes by subset (FDR < 0.05):\n")
  cat("  Global:", length(global_genes), "\n")
  cat("  GCB:", length(gcb_genes), "\n")
  cat("  ABC:", length(abc_genes), "\n")
  cat("  MHG:", length(mhg_genes), "\n")
  cat("  UNC:", length(unc_genes), "\n\n")

  # MHG-specific
  mhg_specific <- setdiff(mhg_genes, c(gcb_genes, abc_genes))
  cat("MHG-specific genes (", length(mhg_specific), "):\n")
  if (length(mhg_specific) > 0) {
    # Show with HR info
    mhg_specific_df <- mhg_annot %>%
      filter(gene %in% mhg_specific, FDR < 0.05) %>%
      arrange(p_value) %>%
      head(20)
    print(mhg_specific_df %>%
            mutate(HR = round(HR, 3), p_value = signif(p_value, 3)) %>%
            select(gene, HR, p_value))
  }

  # ABC-specific
  abc_specific <- setdiff(abc_genes, c(gcb_genes, mhg_genes))
  cat("\nABC-specific genes (", length(abc_specific), "):\n")
  if (length(abc_specific) > 0) {
    abc_specific_df <- abc_annot %>%
      filter(gene %in% abc_specific, FDR < 0.05) %>%
      arrange(p_value) %>%
      head(20)
    print(abc_specific_df %>%
            mutate(HR = round(HR, 3), p_value = signif(p_value, 3)) %>%
            select(gene, HR, p_value))
  }

  # GCB-specific
  gcb_specific <- setdiff(gcb_genes, c(abc_genes, mhg_genes))
  cat("\nGCB-specific genes (", length(gcb_specific), "):\n")
  if (length(gcb_specific) > 0) {
    gcb_specific_df <- gcb_annot %>%
      filter(gene %in% gcb_specific, FDR < 0.05) %>%
      arrange(p_value) %>%
      head(20)
    print(gcb_specific_df %>%
            mutate(HR = round(HR, 3), p_value = signif(p_value, 3)) %>%
            select(gene, HR, p_value))
  }

  # Universal (in all 3 major subtypes)
  universal <- Reduce(intersect, list(gcb_genes, abc_genes, mhg_genes))
  cat("\nUniversal genes (in GCB, ABC, MHG):", length(universal), "\n")
  if (length(universal) > 0) {
    cat(paste(head(universal, 20), collapse = ", "), "\n")
  }

  #------------------------------------------------------------------------------
  # 7. SAVE ANNOTATED RESULTS
  #------------------------------------------------------------------------------
  cat("\n", paste(rep("=", 60), collapse = ""), "\n")
  cat("   SAVING ANNOTATED RESULTS\n")
  cat(paste(rep("=", 60), collapse = ""), "\n\n")

  write.csv(global_annot, "global_scripts/survival_global_annotated.csv", row.names = FALSE)
  write.csv(gcb_annot, "global_scripts/survival_gcb_annotated.csv", row.names = FALSE)
  write.csv(abc_annot, "global_scripts/survival_abc_annotated.csv", row.names = FALSE)
  write.csv(mhg_annot, "global_scripts/survival_mhg_annotated.csv", row.names = FALSE)
  write.csv(unc_annot, "global_scripts/survival_unc_annotated.csv", row.names = FALSE)

  cat("Saved all annotated results\n")
}

cat("\n=== ANNOTATION COMPLETE ===\n")
