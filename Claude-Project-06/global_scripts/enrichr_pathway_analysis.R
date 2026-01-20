# Pathway Analysis using enrichR API
# Simpler alternative to clusterProfiler

library(dplyr)

# Ensure dplyr::select is used
select <- dplyr::select

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("   PATHWAY ENRICHMENT ANALYSIS - TOP PROGNOSTIC GENES\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. LOAD GENE LISTS
#------------------------------------------------------------------------------
cat("=== Loading Gene Lists ===\n")

load_genes <- function(file) {
  if (file.exists(file)) {
    readLines(file)
  } else {
    character(0)
  }
}

global_genes <- load_genes("global_scripts/genes_global_top.txt")
gcb_genes <- load_genes("global_scripts/genes_gcb_top.txt")
abc_genes <- load_genes("global_scripts/genes_abc_top.txt")
mhg_genes <- load_genes("global_scripts/genes_mhg_top.txt")
unc_genes <- load_genes("global_scripts/genes_unc_top.txt")
global_protective <- load_genes("global_scripts/genes_global_protective.txt")
global_harmful <- load_genes("global_scripts/genes_global_harmful.txt")

cat("Gene lists loaded:\n")
cat("  Global:", length(global_genes), "\n")
cat("  GCB:", length(gcb_genes), "\n")
cat("  ABC:", length(abc_genes), "\n")
cat("  MHG:", length(mhg_genes), "\n")
cat("  UNC:", length(unc_genes), "\n")
cat("  Global Protective:", length(global_protective), "\n")
cat("  Global Harmful:", length(global_harmful), "\n\n")

#------------------------------------------------------------------------------
# 2. INSTALL/LOAD enrichR
#------------------------------------------------------------------------------
cat("=== Setting up enrichR ===\n")

has_enrichr <- tryCatch({
  library(enrichR)
  TRUE
}, error = function(e) FALSE)

if (!has_enrichr) {
  cat("Installing enrichR...\n")
  install.packages("enrichR", repos = "https://cloud.r-project.org", quiet = TRUE)
  library(enrichR)
}

# Set up enrichR
setEnrichrSite("Enrichr")  # Human genes

# Get available databases
dbs <- listEnrichrDbs()
cat("Available databases:", nrow(dbs), "\n")

# Databases of interest
target_dbs <- c(
  "KEGG_2021_Human",
  "GO_Biological_Process_2023",
  "GO_Molecular_Function_2023",
  "Reactome_2022",
  "WikiPathway_2023_Human",
  "MSigDB_Hallmark_2020",
  "BioPlanet_2019"
)

# Check which are available
available_dbs <- intersect(target_dbs, dbs$libraryName)
cat("Using databases:", paste(available_dbs, collapse = ", "), "\n\n")

#------------------------------------------------------------------------------
# 3. ENRICHMENT FUNCTION
#------------------------------------------------------------------------------
run_enrichr <- function(genes, name, dbs) {
  cat("\n", paste(rep("=", 60), collapse = ""), "\n")
  cat("   ENRICHMENT:", name, "(", length(genes), "genes )\n")
  cat(paste(rep("=", 60), collapse = ""), "\n")

  if (length(genes) < 5) {
    cat("Too few genes for enrichment\n")
    return(NULL)
  }

  # Run enrichment
  enriched <- tryCatch({
    enrichr(genes, dbs)
  }, error = function(e) {
    cat("Error:", e$message, "\n")
    return(NULL)
  })

  if (is.null(enriched)) return(NULL)

  results <- list()

  for (db in names(enriched)) {
    df <- enriched[[db]]
    if (nrow(df) > 0) {
      df_sig <- df %>%
        filter(Adjusted.P.value < 0.1) %>%
        arrange(Adjusted.P.value) %>%
        head(15)

      if (nrow(df_sig) > 0) {
        cat("\n---", db, "---\n")
        print(df_sig %>%
                select(Term, Overlap, Adjusted.P.value, Genes) %>%
                mutate(Adjusted.P.value = signif(Adjusted.P.value, 3),
                       Genes = substr(Genes, 1, 50)))
        results[[db]] <- df
      }
    }
  }

  return(results)
}

#------------------------------------------------------------------------------
# 4. RUN ENRICHMENT FOR ALL GENE SETS
#------------------------------------------------------------------------------

# Global - Protective Genes
global_prot_enrich <- run_enrichr(global_protective, "GLOBAL - Protective (good prognosis)", available_dbs)

# Global - Harmful Genes
global_harm_enrich <- run_enrichr(global_harmful, "GLOBAL - Harmful (poor prognosis)", available_dbs)

# Subset-specific analyses
gcb_enrich <- run_enrichr(gcb_genes, "GCB subset", available_dbs)
abc_enrich <- run_enrichr(abc_genes, "ABC subset", available_dbs)
mhg_enrich <- run_enrichr(mhg_genes, "MHG subset", available_dbs)
unc_enrich <- run_enrichr(unc_genes, "UNC subset", available_dbs)

#------------------------------------------------------------------------------
# 5. SUMMARY
#------------------------------------------------------------------------------
cat("\n\n", paste(rep("=", 60), collapse = ""), "\n")
cat("   SUMMARY OF KEY PATHWAYS\n")
cat(paste(rep("=", 60), collapse = ""), "\n\n")

summarize_top_pathways <- function(results, name) {
  if (is.null(results)) return()

  cat("\n---", name, "---\n")

  all_terms <- data.frame()
  for (db in names(results)) {
    df <- results[[db]]
    if (nrow(df) > 0) {
      top <- df %>%
        filter(Adjusted.P.value < 0.05) %>%
        head(3) %>%
        mutate(Database = db) %>%
        select(Database, Term, Adjusted.P.value)
      all_terms <- rbind(all_terms, top)
    }
  }

  if (nrow(all_terms) > 0) {
    all_terms <- all_terms %>%
      arrange(Adjusted.P.value) %>%
      head(10)
    print(all_terms)
  }
}

summarize_top_pathways(global_prot_enrich, "GLOBAL PROTECTIVE")
summarize_top_pathways(global_harm_enrich, "GLOBAL HARMFUL")
summarize_top_pathways(gcb_enrich, "GCB")
summarize_top_pathways(abc_enrich, "ABC")
summarize_top_pathways(mhg_enrich, "MHG")
summarize_top_pathways(unc_enrich, "UNC")

#------------------------------------------------------------------------------
# 6. SAVE RESULTS
#------------------------------------------------------------------------------
cat("\n\n=== Saving enrichment results ===\n")

save_enrichment <- function(results, prefix) {
  if (is.null(results)) return()

  for (db in names(results)) {
    df <- results[[db]]
    if (nrow(df) > 0) {
      filename <- paste0("global_scripts/enrichment_", prefix, "_",
                         gsub(" ", "_", db), ".csv")
      write.csv(df, filename, row.names = FALSE)
    }
  }
}

save_enrichment(global_prot_enrich, "global_protective")
save_enrichment(global_harm_enrich, "global_harmful")
save_enrichment(gcb_enrich, "gcb")
save_enrichment(abc_enrich, "abc")
save_enrichment(mhg_enrich, "mhg")
save_enrichment(unc_enrich, "unc")

cat("Results saved to global_scripts/enrichment_*.csv\n")

cat("\n=== ANALYSIS COMPLETE ===\n")
