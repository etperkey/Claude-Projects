# Check all metadata in GSE117556 series matrix
matrix_file <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Sha_REMoDL-B/data/raw/GSE117556_series_matrix.txt.gz"

cat("Reading series matrix...\n")
lines <- readLines(gzfile(matrix_file))

# Get all sample-related lines
sample_lines <- lines[grepl("^!Sample_", lines)]

cat("\nAll sample metadata fields:\n")
cat("==========================\n\n")

for (line in sample_lines[1:min(50, length(sample_lines))]) {
  # Get field name
  field <- sub("\t.*", "", line)
  # Get first few values
  values <- strsplit(line, "\t")[[1]]
  n_values <- length(values) - 1
  first_val <- if(length(values) > 1) gsub('"', '', values[2]) else "NA"

  cat(sprintf("%-40s [%d values] e.g.: %s\n", field, n_values, substr(first_val, 1, 60)))
}

# Specifically look for survival-related fields
cat("\n\nSearching for survival/clinical fields...\n")
cat("==========================================\n\n")

survival_keywords <- c("survival", "os", "pfs", "death", "event", "status", "time", "follow", "outcome", "response", "alive", "dead")

for (line in sample_lines) {
  field <- tolower(sub("\t.*", "", line))
  for (kw in survival_keywords) {
    if (grepl(kw, field)) {
      values <- strsplit(line, "\t")[[1]]
      first_val <- if(length(values) > 1) gsub('"', '', values[2]) else "NA"
      cat(sprintf("FOUND: %s -> %s\n", sub("\t.*", "", line), first_val))
      break
    }
  }
}
