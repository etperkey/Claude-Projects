lines <- readLines(gzfile("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06-v2/Sha_REMoDL-B/data/raw/GSE117556_series_matrix.txt.gz"))

cat("=== GSE117556 Contact Information ===\n\n")

contact_lines <- lines[grepl("^!Series_contact|^!Sample_contact", lines)]

for (l in unique(contact_lines)) {
  field <- sub("\t.*", "", l)
  field <- gsub("!Series_contact_|!Sample_contact_", "", field)
  value <- strsplit(l, "\t")[[1]][2]
  value <- gsub('"', '', value)
  cat(sprintf("%-20s %s\n", paste0(field, ":"), value))
}

cat("\n=== Available Clinical Variables ===\n\n")
char_lines <- lines[grepl("^!Sample_characteristics", lines)]
for (l in unique(char_lines)) {
  value <- strsplit(l, "\t")[[1]][2]
  value <- gsub('"', '', value)
  cat("  -", value, "\n")
}
