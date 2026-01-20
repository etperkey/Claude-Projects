# GSEA Pathway Analysis of Top Prognostic Genes
# All COO subsets from unbiased survival analysis

library(dplyr)

# Ensure dplyr::select is used (conflicts with AnnotationDbi)
select <- dplyr::select

setwd("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06")

cat("=============================================================\n")
cat("   GSEA PATHWAY ANALYSIS - TOP PROGNOSTIC GENES\n")
cat("=============================================================\n\n")

#------------------------------------------------------------------------------
# 1. LOAD SURVIVAL RESULTS
#------------------------------------------------------------------------------
cat("=== Loading Survival Results ===\n")

global_surv <- read.csv("global_scripts/survival_global_all_coo.csv", stringsAsFactors = FALSE)
gcb_surv <- read.csv("global_scripts/survival_gcb.csv", stringsAsFactors = FALSE)
abc_surv <- read.csv("global_scripts/survival_abc.csv", stringsAsFactors = FALSE)
mhg_surv <- read.csv("global_scripts/survival_mhg.csv", stringsAsFactors = FALSE)
unc_surv <- read.csv("global_scripts/survival_unc.csv", stringsAsFactors = FALSE)

cat("Loaded all subset results\n\n")

#------------------------------------------------------------------------------
# 2. TRY TO LOAD ILLUMINA ANNOTATION
#------------------------------------------------------------------------------
cat("=== Loading Probe Annotations ===\n")

# Try illuminaHumanv4.db first
has_illumina_db <- tryCatch({
  library(illuminaHumanv4.db)
  TRUE
}, error = function(e) FALSE)

if (has_illumina_db) {
  cat("Using illuminaHumanv4.db for annotation\n")
  probe2symbol <- as.list(illuminaHumanv4SYMBOL)

  get_gene <- function(probe) {
    sym <- probe2symbol[[probe]]
    if (is.null(sym) || is.na(sym) || sym == "") return(NA)
    return(sym)
  }
} else {
  cat("illuminaHumanv4.db not available, trying to install...\n")

  tryCatch({
    if (!require("BiocManager", quietly = TRUE)) {
      install.packages("BiocManager", repos = "https://cloud.r-project.org")
    }
    BiocManager::install("illuminaHumanv4.db", update = FALSE, ask = FALSE)
    library(illuminaHumanv4.db)

    probe2symbol <- as.list(illuminaHumanv4SYMBOL)
    get_gene <- function(probe) {
      sym <- probe2symbol[[probe]]
      if (is.null(sym) || is.na(sym) || sym == "") return(NA)
      return(sym)
    }
    has_illumina_db <- TRUE
    cat("Successfully installed illuminaHumanv4.db\n")
  }, error = function(e) {
    cat("Could not install illuminaHumanv4.db:", e$message, "\n")
    has_illumina_db <<- FALSE
  })
}

# Fallback: use existing annotation file
if (!has_illumina_db) {
  cat("Using local annotation file\n")

  # Load any available annotation
  annot_file <- "Lacy_HMRN/GPL14951_annotation.csv"
  if (file.exists(annot_file)) {
    local_annot <- read.csv(annot_file, stringsAsFactors = FALSE)
    names(local_annot) <- c("probe", "gene")

    get_gene <- function(probe) {
      idx <- match(probe, local_annot$probe)
      if (is.na(idx)) return(NA)
      return(local_annot$gene[idx])
    }
  } else {
    get_gene <- function(probe) NA
  }
}

#------------------------------------------------------------------------------
# 3. ANNOTATE ALL RESULTS
#------------------------------------------------------------------------------
cat("\n=== Annotating Results ===\n")

annotate_df <- function(df) {
  df$gene <- sapply(df$probe, get_gene)
  return(df)
}

global_annot <- annotate_df(global_surv)
gcb_annot <- annotate_df(gcb_surv)
abc_annot <- annotate_df(abc_surv)
mhg_annot <- annotate_df(mhg_surv)
unc_annot <- annotate_df(unc_surv)

# Count annotated
count_annotated <- function(df) {
  sum(!is.na(df$gene) & df$gene != "")
}

cat("Annotated probes:\n")
cat("  Global:", count_annotated(global_annot), "/", nrow(global_annot), "\n")
cat("  GCB:", count_annotated(gcb_annot), "/", nrow(gcb_annot), "\n")
cat("  ABC:", count_annotated(abc_annot), "/", nrow(abc_annot), "\n")
cat("  MHG:", count_annotated(mhg_annot), "/", nrow(mhg_annot), "\n")
cat("  UNC:", count_annotated(unc_annot), "/", nrow(unc_annot), "\n")

#------------------------------------------------------------------------------
# 4. EXTRACT TOP GENES
#------------------------------------------------------------------------------
cat("\n=== Extracting Top Genes ===\n")

get_top_genes <- function(df, n = 500, direction = "both") {
  df_filt <- df %>% filter(!is.na(gene), gene != "", FDR < 0.1)

  if (direction == "protective") {
    df_filt <- df_filt %>% filter(HR < 1)
  } else if (direction == "harmful") {
    df_filt <- df_filt %>% filter(HR > 1)
  }

  df_filt %>%
    arrange(p_value) %>%
    head(n) %>%
    pull(gene) %>%
    unique()
}

# Get top genes from each subset
global_genes <- get_top_genes(global_annot, 500)
gcb_genes <- get_top_genes(gcb_annot, 300)
abc_genes <- get_top_genes(abc_annot, 300)
mhg_genes <- get_top_genes(mhg_annot, 100)
unc_genes <- get_top_genes(unc_annot, 200)

# Protective vs Harmful
global_protective <- get_top_genes(global_annot, 250, "protective")
global_harmful <- get_top_genes(global_annot, 250, "harmful")

cat("Top genes extracted:\n")
cat("  Global:", length(global_genes), "\n")
cat("  GCB:", length(gcb_genes), "\n")
cat("  ABC:", length(abc_genes), "\n")
cat("  MHG:", length(mhg_genes), "\n")
cat("  UNC:", length(unc_genes), "\n")
cat("  Global Protective:", length(global_protective), "\n")
cat("  Global Harmful:", length(global_harmful), "\n")

#------------------------------------------------------------------------------
# 5. DISPLAY TOP GENES BY SUBSET
#------------------------------------------------------------------------------
cat("\n", paste(rep("=", 60), collapse = ""), "\n")
cat("   TOP ANNOTATED GENES BY SUBSET\n")
cat(paste(rep("=", 60), collapse = ""), "\n")

display_top_genes <- function(df, name, n = 20) {
  cat("\n--- ", name, " ---\n")

  # Protective
  cat("\nTop Protective Genes (HR < 1):\n")
  protective <- df %>%
    filter(!is.na(gene), gene != "", HR < 1, FDR < 0.1) %>%
    arrange(p_value) %>%
    head(n)
  if (nrow(protective) > 0) {
    print(protective %>%
            mutate(HR = round(HR, 3), p = signif(p_value, 3)) %>%
            select(gene, HR, p))
  } else {
    cat("  No significant protective genes\n")
  }

  # Harmful
  cat("\nTop Harmful Genes (HR > 1):\n")
  harmful <- df %>%
    filter(!is.na(gene), gene != "", HR > 1, FDR < 0.1) %>%
    arrange(p_value) %>%
    head(n)
  if (nrow(harmful) > 0) {
    print(harmful %>%
            mutate(HR = round(HR, 3), p = signif(p_value, 3)) %>%
            select(gene, HR, p))
  } else {
    cat("  No significant harmful genes\n")
  }
}

display_top_genes(global_annot, "GLOBAL (n=1303)", 20)
display_top_genes(gcb_annot, "GCB (n=517)", 15)
display_top_genes(abc_annot, "ABC (n=345)", 15)
display_top_genes(mhg_annot, "MHG (n=164)", 15)
display_top_genes(unc_annot, "UNC (n=277)", 15)

#------------------------------------------------------------------------------
# 6. GSEA PATHWAY ANALYSIS
#------------------------------------------------------------------------------
cat("\n", paste(rep("=", 60), collapse = ""), "\n")
cat("   GSEA PATHWAY ANALYSIS\n")
cat(paste(rep("=", 60), collapse = ""), "\n\n")

# Try to use clusterProfiler or enrichR
has_clusterprofiler <- tryCatch({
  library(clusterProfiler)
  library(org.Hs.eg.db)
  TRUE
}, error = function(e) FALSE)

if (!has_clusterprofiler) {
  cat("Installing clusterProfiler...\n")
  tryCatch({
    BiocManager::install(c("clusterProfiler", "org.Hs.eg.db"), update = FALSE, ask = FALSE)
    library(clusterProfiler)
    library(org.Hs.eg.db)
    has_clusterprofiler <- TRUE
  }, error = function(e) {
    cat("Could not install clusterProfiler\n")
    has_clusterprofiler <- FALSE
  })
}

run_enrichment <- function(genes, name) {
  cat("\n--- Enrichment Analysis:", name, "---\n")

  if (length(genes) < 5) {
    cat("Too few genes for enrichment analysis\n")
    return(NULL)
  }

  if (has_clusterprofiler) {
    # GO Biological Process
    cat("\nGO Biological Process:\n")
    ego <- tryCatch({
      enrichGO(gene = genes,
               OrgDb = org.Hs.eg.db,
               keyType = "SYMBOL",
               ont = "BP",
               pAdjustMethod = "BH",
               pvalueCutoff = 0.05,
               qvalueCutoff = 0.1)
    }, error = function(e) NULL)

    if (!is.null(ego) && nrow(ego@result) > 0) {
      top_go <- ego@result %>%
        filter(p.adjust < 0.05) %>%
        head(15) %>%
        select(Description, GeneRatio, p.adjust, Count)
      print(top_go)
    } else {
      cat("No significant GO terms\n")
    }

    # KEGG Pathways
    cat("\nKEGG Pathways:\n")

    # Convert symbols to Entrez IDs for KEGG
    entrez <- tryCatch({
      bitr(genes, fromType = "SYMBOL", toType = "ENTREZID", OrgDb = org.Hs.eg.db)
    }, error = function(e) NULL)

    if (!is.null(entrez) && nrow(entrez) > 0) {
      kegg <- tryCatch({
        enrichKEGG(gene = entrez$ENTREZID,
                   organism = "hsa",
                   pAdjustMethod = "BH",
                   pvalueCutoff = 0.05,
                   qvalueCutoff = 0.1)
      }, error = function(e) NULL)

      if (!is.null(kegg) && nrow(kegg@result) > 0) {
        top_kegg <- kegg@result %>%
          filter(p.adjust < 0.1) %>%
          head(15) %>%
          select(Description, GeneRatio, p.adjust, Count)
        print(top_kegg)
      } else {
        cat("No significant KEGG pathways\n")
      }
    }

    return(list(GO = ego, KEGG = kegg))
  } else {
    cat("clusterProfiler not available\n")
    return(NULL)
  }
}

# Run enrichment on each gene set
if (has_clusterprofiler) {
  global_enrich <- run_enrichment(global_genes, "GLOBAL - All Top Genes")
  global_prot_enrich <- run_enrichment(global_protective, "GLOBAL - Protective Genes")
  global_harm_enrich <- run_enrichment(global_harmful, "GLOBAL - Harmful Genes")

  gcb_enrich <- run_enrichment(gcb_genes, "GCB")
  abc_enrich <- run_enrichment(abc_genes, "ABC")
  mhg_enrich <- run_enrichment(mhg_genes, "MHG")
  unc_enrich <- run_enrichment(unc_genes, "UNC")
}

#------------------------------------------------------------------------------
# 7. SAVE ANNOTATED RESULTS
#------------------------------------------------------------------------------
cat("\n", paste(rep("=", 60), collapse = ""), "\n")
cat("   SAVING RESULTS\n")
cat(paste(rep("=", 60), collapse = ""), "\n\n")

# Save annotated survival results
write.csv(global_annot, "global_scripts/survival_global_annotated.csv", row.names = FALSE)
write.csv(gcb_annot, "global_scripts/survival_gcb_annotated.csv", row.names = FALSE)
write.csv(abc_annot, "global_scripts/survival_abc_annotated.csv", row.names = FALSE)
write.csv(mhg_annot, "global_scripts/survival_mhg_annotated.csv", row.names = FALSE)
write.csv(unc_annot, "global_scripts/survival_unc_annotated.csv", row.names = FALSE)

# Save gene lists for external GSEA tools
write.table(global_genes, "global_scripts/genes_global_top.txt",
            row.names = FALSE, col.names = FALSE, quote = FALSE)
write.table(gcb_genes, "global_scripts/genes_gcb_top.txt",
            row.names = FALSE, col.names = FALSE, quote = FALSE)
write.table(abc_genes, "global_scripts/genes_abc_top.txt",
            row.names = FALSE, col.names = FALSE, quote = FALSE)
write.table(mhg_genes, "global_scripts/genes_mhg_top.txt",
            row.names = FALSE, col.names = FALSE, quote = FALSE)
write.table(unc_genes, "global_scripts/genes_unc_top.txt",
            row.names = FALSE, col.names = FALSE, quote = FALSE)
write.table(global_protective, "global_scripts/genes_global_protective.txt",
            row.names = FALSE, col.names = FALSE, quote = FALSE)
write.table(global_harmful, "global_scripts/genes_global_harmful.txt",
            row.names = FALSE, col.names = FALSE, quote = FALSE)

cat("Saved:\n")
cat("  - Annotated survival results (5 files)\n")
cat("  - Gene lists for GSEA (7 files)\n")

cat("\n=== ANALYSIS COMPLETE ===\n")
