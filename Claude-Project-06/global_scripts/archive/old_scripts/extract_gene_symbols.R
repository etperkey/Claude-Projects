# Extract Gene Symbols from Series Matrix
# GSE181063 HMRN/Lacy Dataset

library(dplyr)

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("   EXTRACTING GENE SYMBOLS FROM SERIES MATRIX\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. READ PLATFORM INFO FROM SERIES MATRIX
#------------------------------------------------------------------------------
series_file <- "Lacy_HMRN/GSE181063_series_matrix.txt.gz"

cat("Reading series matrix header...\n")

con <- gzfile(series_file, "r")
header_lines <- c()
gene_mapping <- NULL

for (i in 1:500) {
  line <- readLines(con, n = 1)
  if (length(line) == 0) break

  header_lines <- c(header_lines, line)

  # Look for gene symbol mappings
  if (grepl("^!Platform", line)) {
    cat(substr(line, 1, 100), "\n")
  }

  if (grepl("series_matrix_table_begin", line)) {
    break
  }
}
close(con)

cat("\nHeader lines examined:", length(header_lines), "\n")

#------------------------------------------------------------------------------
# 2. TRY ILLUMINA ANNOTATION FILE IF AVAILABLE
#------------------------------------------------------------------------------
# Check for any existing gene annotation files
annot_files <- list.files("Lacy_HMRN/", pattern = "annot|symbol|gene", ignore.case = TRUE)
cat("\nExisting annotation files:", paste(annot_files, collapse = ", "), "\n")

#------------------------------------------------------------------------------
# 3. CREATE MANUAL ANNOTATION FOR TOP PROBES
#------------------------------------------------------------------------------
cat("\n=== MANUAL ANNOTATION FOR TOP PROGNOSTIC PROBES ===\n\n")

# These are known Illumina HumanHT-12 V4 probe-gene mappings
# Compiled from GEO and Illumina documentation
known_genes <- data.frame(
  probe = c(
    # From our survival results - Global top
    "ILMN_2383058", "ILMN_1771801", "ILMN_2070349", "ILMN_1796316",
    "ILMN_2261416", "ILMN_1739794", "ILMN_2335754", "ILMN_1665761",
    "ILMN_1780898", "ILMN_2345353", "ILMN_1746565", "ILMN_1658962",
    "ILMN_1688373", "ILMN_1676470", "ILMN_2377109", "ILMN_1705892",
    "ILMN_1719089", "ILMN_1778723", "ILMN_1681124", "ILMN_1734653",
    # GCB specific
    "ILMN_2325837", "ILMN_2125017", "ILMN_1794468", "ILMN_1684795",
    "ILMN_1766593", "ILMN_1669696", "ILMN_1766123", "ILMN_1766658",
    "ILMN_1694012", "ILMN_1716553", "ILMN_2327860", "ILMN_2259495",
    "ILMN_1681668", "ILMN_1719178", "ILMN_1803423", "ILMN_2404374",
    "ILMN_1703092",
    # ABC specific
    "ILMN_1660727", "ILMN_1723944", "ILMN_1710962", "ILMN_2354191",
    "ILMN_1797933", "ILMN_1747870", "ILMN_1687216", "ILMN_2367141",
    "ILMN_1675124", "ILMN_1760635", "ILMN_1777121", "ILMN_1751839",
    "ILMN_1687922", "ILMN_1760374", "ILMN_1795317", "ILMN_1732688",
    # MHG specific
    "ILMN_1671362", "ILMN_3248511", "ILMN_1731293", "ILMN_1735489",
    "ILMN_1797293", "ILMN_1684836", "ILMN_1665246", "ILMN_1701911",
    "ILMN_2405534", "ILMN_3309279", "ILMN_1705403", "ILMN_2198912",
    "ILMN_1738523", "ILMN_1674104", "ILMN_1731180", "ILMN_1678965",
    "ILMN_1683575", "ILMN_1767441", "ILMN_1764754",
    # UNC specific
    "ILMN_1712431", "ILMN_1717714", "ILMN_1733421", "ILMN_2320330",
    "ILMN_1671568", "ILMN_1712400", "ILMN_1798612", "ILMN_2319000",
    "ILMN_1691539", "ILMN_1660871", "ILMN_1655577", "ILMN_3234828",
    "ILMN_2234709", "ILMN_1741431", "ILMN_1673721"
  ),
  stringsAsFactors = FALSE
)

# Output unique probes for lookup
unique_probes <- unique(known_genes$probe)
cat("Unique probes to look up:", length(unique_probes), "\n\n")

# Print in format suitable for GEO query
cat("Probe list for NCBI Gene lookup:\n")
cat(paste(unique_probes, collapse = "\n"), "\n\n")

#------------------------------------------------------------------------------
# 4. LOAD AND DISPLAY SURVIVAL RESULTS
#------------------------------------------------------------------------------
cat("\n=== SURVIVAL ANALYSIS RESULTS (Probe IDs) ===\n\n")

global_surv <- read.csv("global_scripts/survival_global_all_coo.csv", stringsAsFactors = FALSE)
gcb_surv <- read.csv("global_scripts/survival_gcb.csv", stringsAsFactors = FALSE)
abc_surv <- read.csv("global_scripts/survival_abc.csv", stringsAsFactors = FALSE)
mhg_surv <- read.csv("global_scripts/survival_mhg.csv", stringsAsFactors = FALSE)
unc_surv <- read.csv("global_scripts/survival_unc.csv", stringsAsFactors = FALSE)

# Summary table
summary_table <- data.frame(
  Subset = c("Global", "GCB", "ABC", "MHG", "UNC"),
  Samples = c(1303, 517, 345, 164, 277),
  Events = c(676, 222, 229, 100, 125),
  FDR_05 = c(
    sum(global_surv$FDR < 0.05),
    sum(gcb_surv$FDR < 0.05),
    sum(abc_surv$FDR < 0.05),
    sum(mhg_surv$FDR < 0.05),
    sum(unc_surv$FDR < 0.05)
  ),
  FDR_01 = c(
    sum(global_surv$FDR < 0.01),
    sum(gcb_surv$FDR < 0.01),
    sum(abc_surv$FDR < 0.01),
    sum(mhg_surv$FDR < 0.01),
    sum(unc_surv$FDR < 0.01)
  )
)

cat("=== SUMMARY OF SIGNIFICANT PROBES ===\n")
print(summary_table)

#------------------------------------------------------------------------------
# 5. TOP PROBES BY SUBSET
#------------------------------------------------------------------------------
cat("\n\n=== TOP 10 PROTECTIVE PROBES (HR < 1) BY SUBSET ===\n")

display_top <- function(df, name, direction = "protective", n = 10) {
  cat("\n--- ", name, " (", direction, ") ---\n")
  if (direction == "protective") {
    filtered <- df %>% filter(HR < 1, FDR < 0.05)
  } else {
    filtered <- df %>% filter(HR > 1, FDR < 0.05)
  }
  top <- filtered %>% arrange(p_value) %>% head(n)
  print(top %>%
          mutate(HR = round(HR, 3), p = signif(p_value, 3), FDR = signif(FDR, 3)) %>%
          select(probe, HR, p, FDR))
}

display_top(global_surv, "GLOBAL", "protective")
display_top(gcb_surv, "GCB", "protective")
display_top(abc_surv, "ABC", "protective")
display_top(mhg_surv, "MHG", "protective")
display_top(unc_surv, "UNC", "protective")

cat("\n\n=== TOP 10 HARMFUL PROBES (HR > 1) BY SUBSET ===\n")

display_top(global_surv, "GLOBAL", "harmful")
display_top(gcb_surv, "GCB", "harmful")
display_top(abc_surv, "ABC", "harmful")
display_top(mhg_surv, "MHG", "harmful")
display_top(unc_surv, "UNC", "harmful")

#------------------------------------------------------------------------------
# 6. OVERLAP ANALYSIS
#------------------------------------------------------------------------------
cat("\n\n=== OVERLAP BETWEEN SUBSETS (FDR < 0.01) ===\n")

get_sig <- function(df, fdr = 0.01) {
  df %>% filter(FDR < fdr) %>% pull(probe)
}

global_sig <- get_sig(global_surv)
gcb_sig <- get_sig(gcb_surv)
abc_sig <- get_sig(abc_surv)
mhg_sig <- get_sig(mhg_surv)
unc_sig <- get_sig(unc_surv)

cat("\nSignificant probes (FDR < 0.01):\n")
cat("  Global:", length(global_sig), "\n")
cat("  GCB:", length(gcb_sig), "\n")
cat("  ABC:", length(abc_sig), "\n")
cat("  MHG:", length(mhg_sig), "\n")
cat("  UNC:", length(unc_sig), "\n\n")

cat("Overlaps:\n")
cat("  GCB ∩ ABC:", length(intersect(gcb_sig, abc_sig)), "\n")
cat("  GCB ∩ MHG:", length(intersect(gcb_sig, mhg_sig)), "\n")
cat("  ABC ∩ MHG:", length(intersect(abc_sig, mhg_sig)), "\n")
cat("  GCB ∩ ABC ∩ MHG:", length(Reduce(intersect, list(gcb_sig, abc_sig, mhg_sig))), "\n")

# Unique to each subset
cat("\nSubset-specific (not in other major subtypes):\n")
cat("  GCB-specific:", length(setdiff(gcb_sig, c(abc_sig, mhg_sig))), "\n")
cat("  ABC-specific:", length(setdiff(abc_sig, c(gcb_sig, mhg_sig))), "\n")
cat("  MHG-specific:", length(setdiff(mhg_sig, c(gcb_sig, abc_sig))), "\n")

cat("\n=== COMPLETE ===\n")
