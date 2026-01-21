# =============================================================================
# Extract Clinical/Phenotype Data from GEO Series Matrix
# GSE117556 - REMoDL-B DLBCL Cohort
# =============================================================================

library(dplyr)
library(tidyr)
library(stringr)

sha_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Sha"
raw_dir <- file.path(sha_dir, "data/raw")
processed_dir <- file.path(sha_dir, "data/processed")

cat("=============================================================================\n")
cat("Extracting Clinical Data from GEO GSE117556\n")
cat("=============================================================================\n\n")

# Read the series matrix file
matrix_file <- file.path(raw_dir, "GSE117556_series_matrix.txt.gz")

if (!file.exists(matrix_file)) {
  stop("Series matrix file not found. Download it first.")
}

# Read all lines to parse header and sample info
cat("Reading series matrix file...\n")
lines <- readLines(gzfile(matrix_file))

# Find sample characteristic lines
char_lines <- lines[grepl("^!Sample_characteristics", lines)]
sample_id_line <- lines[grepl("^!Sample_geo_accession", lines)]
title_line <- lines[grepl("^!Sample_title", lines)]

cat("  Found", length(char_lines), "characteristic rows\n")

# Parse sample IDs
sample_ids <- unlist(strsplit(sample_id_line, "\t"))[-1]
sample_ids <- gsub('"', '', sample_ids)
cat("  Found", length(sample_ids), "samples\n")

# Parse sample titles (often contain patient IDs)
sample_titles <- unlist(strsplit(title_line, "\t"))[-1]
sample_titles <- gsub('"', '', sample_titles)

# Create base dataframe
clinical <- data.frame(
  GEO_ID = sample_ids,
  Sample_Title = sample_titles,
  stringsAsFactors = FALSE
)

# Parse each characteristic row
cat("\nParsing sample characteristics...\n")

for (i in seq_along(char_lines)) {
  values <- unlist(strsplit(char_lines[i], "\t"))[-1]
  values <- gsub('"', '', values)

  if (length(values) == length(sample_ids)) {
    # Extract variable name and values
    # Format is usually "variable: value"
    first_val <- values[1]
    if (grepl(":", first_val)) {
      var_name <- trimws(sub(":.*", "", first_val))
      var_name <- gsub(" ", "_", var_name)
      var_name <- gsub("[^a-zA-Z0-9_]", "", var_name)

      # Extract just the value part
      values <- sapply(values, function(x) {
        if (grepl(":", x)) {
          trimws(sub(".*:", "", x))
        } else {
          x
        }
      })

      clinical[[var_name]] <- unname(values)
      cat("  Added:", var_name, "\n")
    }
  }
}

# Display summary of clinical variables
cat("\n=============================================================================\n")
cat("Clinical Variables Extracted\n")
cat("=============================================================================\n\n")

cat("Total samples:", nrow(clinical), "\n")
cat("Variables:", ncol(clinical), "\n\n")

cat("Variables found:\n")
for (var in names(clinical)) {
  n_unique <- length(unique(clinical[[var]]))
  example <- clinical[[var]][1]
  if (nchar(example) > 50) example <- paste0(substr(example, 1, 47), "...")
  cat(sprintf("  %-25s %5d unique values  (e.g., %s)\n", var, n_unique, example))
}

# Look for key clinical variables
cat("\n=============================================================================\n")
cat("Key Clinical Variables\n")
cat("=============================================================================\n\n")

# Cell of origin
if ("cell_of_origin" %in% names(clinical) || "coo" %in% tolower(names(clinical))) {
  coo_var <- names(clinical)[tolower(names(clinical)) %in% c("cell_of_origin", "coo", "celloforigin")]
  if (length(coo_var) > 0) {
    cat("Cell of Origin distribution:\n")
    print(table(clinical[[coo_var[1]]]))
    cat("\n")
  }
}

# MHG class
mhg_vars <- names(clinical)[grepl("mhg|molecular.*grade|high.*grade", tolower(names(clinical)))]
if (length(mhg_vars) > 0) {
  cat("Molecular High Grade (MHG) distribution:\n")
  print(table(clinical[[mhg_vars[1]]]))
  cat("\n")
}

# Any survival data
surv_vars <- names(clinical)[grepl("survival|os|pfs|death|event", tolower(names(clinical)))]
if (length(surv_vars) > 0) {
  cat("Survival-related variables found:\n")
  for (sv in surv_vars) {
    cat("  ", sv, ":", length(unique(clinical[[sv]])), "unique values\n")
  }
  cat("\n")
}

# Save clinical data
output_file <- file.path(processed_dir, "sha_geo_clinical.csv")
write.csv(clinical, output_file, row.names = FALSE)
cat("Saved:", output_file, "\n")

# Also save a summary
cat("\n=============================================================================\n")
cat("Complete Variable Summary\n")
cat("=============================================================================\n\n")

for (var in names(clinical)[3:min(length(names(clinical)), 15)]) {
  cat(sprintf("\n--- %s ---\n", var))
  tbl <- table(clinical[[var]], useNA = "ifany")
  if (length(tbl) <= 10) {
    print(tbl)
  } else {
    cat("(", length(tbl), "unique values - showing first 10)\n")
    print(head(sort(tbl, decreasing = TRUE), 10))
  }
}

cat("\n=============================================================================\n")
cat("Extraction Complete\n")
cat("=============================================================================\n")
