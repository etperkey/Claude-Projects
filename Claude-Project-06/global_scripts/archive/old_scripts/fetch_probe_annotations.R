# Fetch probe annotations from NCBI
# Alternative approach using txt file

library(dplyr)
library(httr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("   FETCHING PROBE ANNOTATIONS\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. LOAD SURVIVAL RESULTS AND GET TOP PROBES
#------------------------------------------------------------------------------
global_surv <- read.csv("global_scripts/survival_global_all_coo.csv", stringsAsFactors = FALSE)
gcb_surv <- read.csv("global_scripts/survival_gcb.csv", stringsAsFactors = FALSE)
abc_surv <- read.csv("global_scripts/survival_abc.csv", stringsAsFactors = FALSE)
mhg_surv <- read.csv("global_scripts/survival_mhg.csv", stringsAsFactors = FALSE)
unc_surv <- read.csv("global_scripts/survival_unc.csv", stringsAsFactors = FALSE)

# Get top 100 probes from each analysis
get_top <- function(df, n = 100) {
  df %>% filter(FDR < 0.1) %>% head(n) %>% pull(probe)
}

all_probes <- unique(c(
  get_top(global_surv),
  get_top(gcb_surv),
  get_top(abc_surv),
  get_top(mhg_surv),
  get_top(unc_surv)
))

cat("Top probes to annotate:", length(all_probes), "\n\n")

#------------------------------------------------------------------------------
# 2. TRY TO DOWNLOAD ANNOT FILE FROM GEO
#------------------------------------------------------------------------------
annot_file <- "Lacy_HMRN/GPL14951_annot.txt"

if (!file.exists(annot_file)) {
  cat("Downloading annotation file...\n")

  # Try the txt file which is smaller
  url <- "https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GPL14951&targ=self&form=text&view=data"

  tryCatch({
    download.file(url, annot_file, mode = "w", quiet = FALSE, timeout = 120)
    cat("Downloaded annotation file\n")
  }, error = function(e) {
    cat("Download failed:", e$message, "\n")
  })
}

#------------------------------------------------------------------------------
# 3. PARSE ANNOTATION FILE
#------------------------------------------------------------------------------
if (file.exists(annot_file)) {
  cat("\nParsing annotation file...\n")

  # Read the file
  lines <- readLines(annot_file)

  # Find table start and headers
  table_start <- which(grepl("^!platform_table_begin", lines))
  table_end <- which(grepl("^!platform_table_end", lines))

  if (length(table_start) > 0 && length(table_end) > 0) {
    header <- strsplit(lines[table_start + 1], "\t")[[1]]
    cat("Found columns:", paste(header[1:min(10, length(header))], collapse = ", "), "\n")

    # Parse data
    data_lines <- lines[(table_start + 2):(table_end - 1)]
    split_data <- strsplit(data_lines, "\t")

    # Make sure all rows have same length
    n_cols <- length(header)
    split_data <- lapply(split_data, function(x) {
      if (length(x) < n_cols) {
        c(x, rep("", n_cols - length(x)))
      } else if (length(x) > n_cols) {
        x[1:n_cols]
      } else {
        x
      }
    })

    annot <- as.data.frame(do.call(rbind, split_data), stringsAsFactors = FALSE)
    names(annot) <- header

    cat("Parsed", nrow(annot), "probes\n")

    # Find ID and Symbol columns
    id_col <- "ID"
    symbol_col <- grep("Symbol", names(annot), value = TRUE)[1]

    if (is.na(symbol_col)) {
      symbol_col <- grep("Gene", names(annot), value = TRUE)[1]
    }

    cat("ID column:", id_col, "\n")
    cat("Symbol column:", symbol_col, "\n\n")

    if (!is.na(symbol_col)) {
      # Create simple annotation
      simple_annot <- annot %>%
        select(all_of(c(id_col, symbol_col))) %>%
        rename(probe = 1, gene = 2) %>%
        filter(probe %in% all_probes | probe %in% global_surv$probe)

      cat("Matched", nrow(simple_annot), "probes\n")

      # Save annotation
      write.csv(simple_annot, "Lacy_HMRN/GPL14951_simple_annotation.csv", row.names = FALSE)
    }
  }
}

#------------------------------------------------------------------------------
# 4. DISPLAY TOP RESULTS WITH GENE SYMBOLS
#------------------------------------------------------------------------------
simple_annot_file <- "Lacy_HMRN/GPL14951_simple_annotation.csv"

if (file.exists(simple_annot_file)) {
  cat("\n=== TOP PROGNOSTIC GENES BY SUBSET ===\n\n")

  annot <- read.csv(simple_annot_file, stringsAsFactors = FALSE)

  # Function to annotate and display
  display_annotated <- function(results, name) {
    cat("\n--- ", name, " ---\n")

    annotated <- results %>%
      left_join(annot, by = "probe") %>%
      mutate(gene = ifelse(is.na(gene) | gene == "", probe, gene))

    # Protective
    cat("\nProtective (HR < 1, FDR < 0.05):\n")
    protective <- annotated %>%
      filter(HR < 1, FDR < 0.05) %>%
      arrange(p_value) %>%
      head(15)
    print(protective %>%
            mutate(HR = round(HR, 3), p = signif(p_value, 3)) %>%
            select(gene, HR, p))

    # Harmful
    cat("\nHarmful (HR > 1, FDR < 0.05):\n")
    harmful <- annotated %>%
      filter(HR > 1, FDR < 0.05) %>%
      arrange(p_value) %>%
      head(15)
    print(harmful %>%
            mutate(HR = round(HR, 3), p = signif(p_value, 3)) %>%
            select(gene, HR, p))
  }

  display_annotated(global_surv, "GLOBAL (n=1303)")
  display_annotated(gcb_surv, "GCB (n=517)")
  display_annotated(abc_surv, "ABC (n=345)")
  display_annotated(mhg_surv, "MHG (n=164)")
  display_annotated(unc_surv, "UNC (n=277)")
}

cat("\n=== COMPLETE ===\n")
