# =============================================================================
# Annotate Expression Data with Gene Symbols
# GSE117556 - Illumina HumanHT-12 WG-DASL V4.0 (GPL14951)
# =============================================================================

library(dplyr)

sha_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Sha"
raw_dir <- file.path(sha_dir, "data/raw")
processed_dir <- file.path(sha_dir, "data/processed")

cat("=============================================================================\n")
cat("Annotating Expression Data with Gene Symbols\n")
cat("=============================================================================\n\n")

# Load expression data
expr_file <- file.path(processed_dir, "sha_expression.rds")
if (!file.exists(expr_file)) {
  stop("Expression RDS file not found. Run process_expression_data.R first.")
}

cat("Loading expression data...\n")
expr_data <- readRDS(expr_file)
cat("  Probes:", nrow(expr_data), "\n")

# Try to get annotation from GEO
cat("\nFetching platform annotation from GEO (GPL14951)...\n")

# Download annotation if not cached
annot_file <- file.path(raw_dir, "GPL14951_annotation.txt")

if (!file.exists(annot_file)) {
  tryCatch({
    annot_url <- "https://ftp.ncbi.nlm.nih.gov/geo/platforms/GPL14nnn/GPL14951/annot/GPL14951.annot.gz"
    temp_gz <- tempfile(fileext = ".gz")
    download.file(annot_url, temp_gz, mode = "wb", quiet = TRUE)
    annot_lines <- readLines(gzfile(temp_gz))
    writeLines(annot_lines, annot_file)
    unlink(temp_gz)
    cat("  Downloaded platform annotation\n")
  }, error = function(e) {
    cat("  Could not download annotation:", conditionMessage(e), "\n")
    cat("  Using backup method...\n")
  })
}

if (file.exists(annot_file)) {
  # Parse annotation file
  cat("Parsing annotation file...\n")

  # Read annotation (skip comment lines)
  annot_lines <- readLines(annot_file)
  header_line <- which(grepl("^ID\t", annot_lines))[1]

  if (!is.na(header_line)) {
    annot <- read.delim(annot_file, skip = header_line - 1,
                        stringsAsFactors = FALSE, comment.char = "")

    cat("  Annotation rows:", nrow(annot), "\n")
    cat("  Columns:", paste(names(annot)[1:min(5, ncol(annot))], collapse = ", "), "...\n")

    # Find gene symbol column
    symbol_col <- names(annot)[grepl("gene.*symbol|symbol", names(annot), ignore.case = TRUE)][1]

    if (!is.na(symbol_col)) {
      cat("  Gene symbol column:", symbol_col, "\n")

      # Merge annotation with expression data
      expr_annotated <- merge(expr_data, annot[, c("ID", symbol_col)],
                               by.x = "ID_REF", by.y = "ID", all.x = TRUE)
      names(expr_annotated)[names(expr_annotated) == symbol_col] <- "Gene_Symbol"

      # Check S1P pathway genes
      s1p_genes <- c("S1PR2", "GNA13", "ARHGEF1", "P2RY8", "RHOA",
                     "CXCR4", "GNAI2", "RAC2", "ARHGAP25")

      cat("\nS1P pathway gene probes:\n")
      for (gene in s1p_genes) {
        matches <- sum(grepl(paste0("^", gene, "$"), expr_annotated$Gene_Symbol, ignore.case = TRUE))
        if (matches > 0) {
          cat(sprintf("  %s: %d probes\n", gene, matches))
        }
      }

      # Save annotated expression data
      saveRDS(expr_annotated, file.path(processed_dir, "sha_expression_annotated.rds"))
      cat("\nSaved: sha_expression_annotated.rds\n")

      # Extract S1P pathway expression
      s1p_pattern <- paste0("^(", paste(s1p_genes, collapse = "|"), ")$")
      s1p_expr <- expr_annotated[grepl(s1p_pattern, expr_annotated$Gene_Symbol, ignore.case = TRUE), ]

      if (nrow(s1p_expr) > 0) {
        # Get sample columns (not ID, annotation, or detection p-value columns)
        sample_cols <- names(s1p_expr)[!grepl("ID_REF|Gene_Symbol|DetectionPval", names(s1p_expr))]

        write.csv(s1p_expr, file.path(processed_dir, "sha_s1p_expression.csv"), row.names = FALSE)
        cat("Saved: sha_s1p_expression.csv (", nrow(s1p_expr), "probes)\n")
      }
    }
  }
} else {
  cat("\nAnnotation file not available. Probe IDs remain unannotated.\n")
  cat("Expression data saved with probe IDs only.\n")
}

cat("\n=============================================================================\n")
cat("Annotation Complete\n")
cat("=============================================================================\n")
