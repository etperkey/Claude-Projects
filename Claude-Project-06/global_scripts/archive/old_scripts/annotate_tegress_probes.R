# Annotate tEgress enhancer probes with gene symbols
# Using GPL14951 platform annotation

library(dplyr)
library(GEOquery)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("   ANNOTATING tEGRESS ENHANCER PROBES\n")
cat("=============================================================\n\n")

# Load the enhancer probes
enhancer <- read.csv("global_scripts/tegress_enhancer_probes.csv", stringsAsFactors = FALSE)
all_correlated <- read.csv("global_scripts/tegress_correlated_probes.csv", stringsAsFactors = FALSE)

cat("Enhancer probes to annotate: ", nrow(enhancer), "\n")

#------------------------------------------------------------------------------
# Get platform annotation from GEO
#------------------------------------------------------------------------------
cat("\n=== Getting Platform Annotation ===\n")

# Try to get GPL14951 annotation
tryCatch({
  gpl <- getGEO("GPL14951", destdir = "Lacy_HMRN/")
  annot <- Table(gpl)

  cat("Annotation columns:\n")
  print(names(annot)[1:20])

  # Save full annotation
  write.csv(annot, "Lacy_HMRN/GPL14951_full_annotation.csv", row.names = FALSE)

}, error = function(e) {
  cat("Could not download GPL annotation, trying alternative method...\n")

  # Try reading from the series matrix header
  series_file <- "Lacy_HMRN/GSE181063_series_matrix.txt.gz"

  # Read header to get sample annotations
  con <- gzfile(series_file, "r")
  header_lines <- c()
  while (TRUE) {
    line <- readLines(con, n = 1)
    if (length(line) == 0) break
    header_lines <- c(header_lines, line)
    if (grepl("^!series_matrix_table_begin", line)) break
  }
  close(con)

  # Parse platform annotation from header
  platform_lines <- header_lines[grepl("^!Platform", header_lines)]
  cat("Platform info found:\n")
  for (pl in platform_lines[1:min(10, length(platform_lines))]) {
    cat(pl, "\n")
  }
})

#------------------------------------------------------------------------------
# Alternative: Use biomaRt or manual lookup
#------------------------------------------------------------------------------
cat("\n=== Manual Probe-Gene Mapping ===\n")

# Known mappings for Illumina HumanHT-12 V4 platform
# These are the tEgress component genes
known_mappings <- data.frame(
  probe = c("ILMN_2246410"),  # This is the top correlated probe (r=0.90)
  gene = c("Unknown - need platform annotation"),
  stringsAsFactors = FALSE
)

# Try to extract from raw data file if available
raw_file <- "Lacy_HMRN/GSE181063_RawData.txt.gz"
if (file.exists(raw_file)) {
  cat("Reading raw data file for probe annotations...\n")

  # Read just the first few lines to get structure
  raw_header <- read.delim(gzfile(raw_file), nrows = 5, header = TRUE,
                           stringsAsFactors = FALSE)
  cat("Raw data columns:\n")
  print(names(raw_header))
}

#------------------------------------------------------------------------------
# Use existing annotation if available
#------------------------------------------------------------------------------
annot_file <- "Lacy_HMRN/GPL14951_full_annotation.csv"
if (file.exists(annot_file)) {
  cat("\n=== Using Existing Annotation ===\n")
  annot <- read.csv(annot_file, stringsAsFactors = FALSE)

  # Find gene symbol column
  symbol_cols <- grep("Symbol|SYMBOL|gene|Gene", names(annot), value = TRUE)
  cat("Potential symbol columns:", symbol_cols, "\n")

  if (length(symbol_cols) > 0) {
    # Merge with enhancer probes
    id_col <- grep("^ID$|Probe_Id|ID_REF", names(annot), value = TRUE)[1]

    if (!is.na(id_col)) {
      enhancer_annotated <- enhancer %>%
        left_join(annot %>% select(all_of(c(id_col, symbol_cols[1]))),
                  by = setNames(id_col, "probe"))

      cat("\n=== ANNOTATED ENHANCER PROBES ===\n\n")
      print(enhancer_annotated %>% head(30))
    }
  }
}

#------------------------------------------------------------------------------
# Try online lookup for top probes
#------------------------------------------------------------------------------
cat("\n=== Top Enhancer Probes for Manual Lookup ===\n\n")

# List top probes for manual annotation
top_probes <- enhancer %>%
  arrange(adj_p) %>%
  head(20) %>%
  select(probe, tEgress_cor, adj_HR, adj_p)

print(top_probes)

cat("\n\nThese Illumina probe IDs can be looked up at:\n")
cat("https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GPL14951\n")

#------------------------------------------------------------------------------
# Try to extract gene info from series matrix
#------------------------------------------------------------------------------
cat("\n=== Checking Series Matrix for Gene Info ===\n")

# Sometimes gene symbols are in a separate row
series_file <- "Lacy_HMRN/GSE181063_series_matrix.txt.gz"
con <- gzfile(series_file, "r")
gene_row <- NULL
for (i in 1:200) {
  line <- readLines(con, n = 1)
  if (grepl("Gene_Symbol|GENE_SYMBOL|gene_symbol", line, ignore.case = TRUE)) {
    gene_row <- line
    break
  }
}
close(con)

if (!is.null(gene_row)) {
  cat("Found gene symbol row!\n")
  cat(substr(gene_row, 1, 500), "\n")
}

cat("\n=== ANALYSIS COMPLETE ===\n")
