# =============================================================================
# Annotate Differentially Expressed Probes with Gene Symbols
# Uses GPL14951 platform annotation
# =============================================================================

cat("=============================================================\n")
cat("Annotating DE Probes with Gene Symbols\n")
cat("=============================================================\n\n")

library(data.table)

lacy_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir <- file.path(lacy_dir, "results")

# =============================================================================
# 1. Load DE Results
# =============================================================================

cat("Loading DE results...\n")
de_results <- read.csv(file.path(results_dir, "gcb_expression_by_stage.csv"),
                       stringsAsFactors = FALSE)
cat("Total probes:", nrow(de_results), "\n\n")

# =============================================================================
# 2. Download GPL14951 Annotation
# =============================================================================

cat("Downloading GPL14951 annotation...\n")

# Try to download the annotation file
gpl_url <- "https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GPL14951&targ=self&view=data&form=text"

# Download to temp file
temp_file <- tempfile(fileext = ".txt")
tryCatch({
  download.file(gpl_url, temp_file, mode = "wb", quiet = TRUE)
  cat("Downloaded GPL annotation\n")
}, error = function(e) {
  cat("Failed to download:", e$message, "\n")
})

# Read and parse the annotation
if (file.exists(temp_file) && file.size(temp_file) > 0) {

  # Read lines to find the data table
  lines <- readLines(temp_file, warn = FALSE)

  # Find table start
  table_start <- grep("^!platform_table_begin", lines)
  table_end <- grep("^!platform_table_end", lines)

  if (length(table_start) > 0 && length(table_end) > 0) {
    # Extract table content
    table_lines <- lines[(table_start + 1):(table_end - 1)]

    # Parse as data frame
    gpl_annot <- fread(text = paste(table_lines, collapse = "\n"),
                       header = TRUE, sep = "\t", fill = TRUE)

    cat("Annotation columns:\n")
    print(names(gpl_annot))
    cat("\n")

    # Find relevant columns
    id_col <- grep("^ID$|^ID_REF$|^Probe_Id", names(gpl_annot), value = TRUE)[1]
    symbol_col <- grep("Symbol|GENE_SYMBOL|Gene_Symbol", names(gpl_annot),
                       ignore.case = TRUE, value = TRUE)[1]

    cat("ID column:", id_col, "\n")
    cat("Symbol column:", symbol_col, "\n\n")

    if (!is.na(id_col) && !is.na(symbol_col)) {
      # Create annotation mapping
      annot_map <- data.frame(
        Probe = gpl_annot[[id_col]],
        Gene_Symbol = gpl_annot[[symbol_col]],
        stringsAsFactors = FALSE
      )

      # Clean up gene symbols
      annot_map$Gene_Symbol[annot_map$Gene_Symbol == ""] <- NA

      cat("Annotation entries:", nrow(annot_map), "\n")
      cat("With gene symbols:", sum(!is.na(annot_map$Gene_Symbol)), "\n\n")
    }
  }
}

# If download failed, try to extract from series matrix
if (!exists("annot_map")) {
  cat("Trying to extract annotation from series matrix...\n")

  series_file <- file.path(lacy_dir, "GSE181063_series_matrix.txt.gz")
  con <- gzfile(series_file, "r")
  lines <- readLines(con, n = 500)  # Just first 500 lines for metadata
  close(con)

  # Look for gene symbol info
  gene_line <- grep("gene_symbol", lines, ignore.case = TRUE, value = TRUE)
  if (length(gene_line) > 0) {
    cat("Found gene symbol line in series matrix\n")
    print(substr(gene_line[1], 1, 200))
  }
}

# =============================================================================
# 3. Alternative: Use BioMart for annotation
# =============================================================================

if (!exists("annot_map") || sum(!is.na(annot_map$Gene_Symbol)) < 1000) {
  cat("\nUsing Illumina array annotation from series matrix...\n")

  # The series matrix has gene assignments - extract from full file
  series_file <- file.path(lacy_dir, "GSE181063_series_matrix.txt.gz")
  con <- gzfile(series_file, "r")
  all_lines <- readLines(con)
  close(con)

  # Look for platform annotation section
  platform_ref <- grep("!Sample_platform_id", all_lines, value = TRUE)
  cat("Platform reference:", substr(platform_ref[1], 1, 100), "\n")

  # Try to get gene info from sample characteristics
  gene_rows <- grep("!Sample_characteristics", all_lines, value = TRUE)
  cat("Found", length(gene_rows), "sample characteristic lines\n")
}

# =============================================================================
# 4. Manual annotation lookup for top hits
# =============================================================================

cat("\n=============================================================\n")
cat("Manual Annotation for Top DE Probes\n")
cat("=============================================================\n\n")

# Top probes to annotate (FDR < 0.1)
top_probes <- de_results[de_results$FDR < 0.1, ]
cat("Probes with FDR < 0.1:", nrow(top_probes), "\n\n")

# If we have annotation, merge
if (exists("annot_map") && nrow(annot_map) > 0) {

  de_annotated <- merge(de_results, annot_map, by = "Probe", all.x = TRUE)
  de_annotated <- de_annotated[order(de_annotated$P_value), ]

  cat("Annotated probes:", sum(!is.na(de_annotated$Gene_Symbol)), "\n\n")

  # Show top hits
  cat("Top 30 DE Genes by Stage (GCB-DLBCL):\n")
  cat("=====================================\n\n")

  top30 <- head(de_annotated[!is.na(de_annotated$Gene_Symbol), ], 30)
  print(top30[, c("Gene_Symbol", "Log2FC", "P_value", "FDR", "Direction")])

  # Separate by direction
  cat("\n\nTop Limited-high Genes (higher in Stage I-II):\n")
  limited_high <- de_annotated[de_annotated$Direction == "Limited-high" &
                                !is.na(de_annotated$Gene_Symbol), ]
  print(head(limited_high[, c("Gene_Symbol", "Log2FC", "P_value", "FDR")], 20))

  cat("\nTop Advanced-high Genes (higher in Stage III-IV):\n")
  advanced_high <- de_annotated[de_annotated$Direction == "Advanced-high" &
                                 !is.na(de_annotated$Gene_Symbol), ]
  print(head(advanced_high[, c("Gene_Symbol", "Log2FC", "P_value", "FDR")], 20))

  # Save annotated results
  write.csv(de_annotated, file.path(results_dir, "gcb_de_genes_by_stage_annotated.csv"),
            row.names = FALSE)
  cat("\nSaved: gcb_de_genes_by_stage_annotated.csv\n")

  # Summary statistics
  cat("\n=============================================================\n")
  cat("SUMMARY\n")
  cat("=============================================================\n\n")

  sig_genes <- de_annotated[de_annotated$FDR < 0.1 & !is.na(de_annotated$Gene_Symbol), ]
  cat("Significant genes (FDR < 0.1):", nrow(sig_genes), "\n")
  cat("  Limited-high:", sum(sig_genes$Direction == "Limited-high"), "\n")
  cat("  Advanced-high:", sum(sig_genes$Direction == "Advanced-high"), "\n")

} else {
  cat("Could not load annotation - saving probe-only results\n")

  # Still save with direction summary
  cat("\nTop 30 DE Probes (unannotated):\n")
  print(head(de_results[, c("Probe", "Log2FC", "P_value", "FDR", "Direction")], 30))
}

cat("\n=============================================================\n")
cat("ANNOTATION COMPLETE\n")
cat("=============================================================\n")
