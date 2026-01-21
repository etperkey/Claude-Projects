# =============================================================================
# Classify Duke DLBCL Patients into Chapuy-like Genetic Subtypes
# Based on key defining mutations from Chapuy et al. 2018
# =============================================================================

cat("=============================================================\n")
cat("Duke DLBCL Genetic Subtype Classification\n")
cat("=============================================================\n\n")

library(httr)
library(jsonlite)
library(dplyr)

duke_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Duke"
raw_dir <- file.path(duke_dir, "data/raw")
processed_dir <- file.path(duke_dir, "data/processed")

base_api <- "https://www.cbioportal.org/api"
study_id <- "dlbcl_duke_2017"
mut_profile <- "dlbcl_duke_2017_mutations"

# =============================================================================
# Define Classifier Genes for Each Subtype
# Based on Chapuy et al. 2018 and Schmitz et al. 2018
# =============================================================================

# C3-EZB (GCB): EZH2, BCL2 amp/transloc, CREBBP, KMT2D, TNFRSF14, MEF2B, GNA13
ezb_genes <- c("EZH2", "CREBBP", "KMT2D", "TNFRSF14", "MEF2B", "GNA13", "EP300",
               "IRF8", "CIITA", "S1PR2")

# C5-MCD (ABC): MYD88 (esp L265P), CD79B, PIM1, BTG2
mcd_genes <- c("MYD88", "CD79B", "PIM1", "BTG1", "BTG2", "OSBPL10")

# C1-BN2: NOTCH2, BCL6 fusions, CD70, DTX1, SPEN
bn2_genes <- c("NOTCH2", "CD70", "DTX1", "SPEN", "CCND3", "BCL10")

# C4-ST2/SGK1: SGK1, TET2, NFKBIE, STAT3, KLHL6
st2_genes <- c("SGK1", "TET2", "NFKBIE", "STAT3", "KLHL6", "ZFP36L1")

# C2-TP53: TP53, complex karyotype markers
tp53_genes <- c("TP53", "CDKN2A", "RB1")

# Additional common DLBCL genes
other_genes <- c("BCL2", "MYC", "PRDM1", "CARD11", "TNFAIP3", "B2M", "CD58",
                 "FOXO1", "HIST1H1E", "IRF4", "ARID1A", "SOCS1")

all_classifier_genes <- unique(c(ezb_genes, mcd_genes, bn2_genes, st2_genes,
                                  tp53_genes, other_genes))

cat("Classifier genes:", length(all_classifier_genes), "\n")
cat(paste(all_classifier_genes, collapse = ", "), "\n\n")

# =============================================================================
# Fetch Mutations for Classifier Genes
# =============================================================================

cat("--- Fetching Mutations for Classifier Genes ---\n\n")

# Get gene Entrez IDs
genes_url <- paste0(base_api, "/genes/fetch?geneIdType=HUGO_GENE_SYMBOL")
gene_resp <- POST(
  genes_url,
  body = toJSON(all_classifier_genes),
  add_headers("Content-Type" = "application/json", "accept" = "application/json"),
  encode = "raw"
)

gene_info <- fromJSON(content(gene_resp, "text", encoding = "UTF-8"))
cat("Found", nrow(gene_info), "genes in cBioPortal\n")

# Get all samples
samples_url <- paste0(base_api, "/studies/", study_id, "/samples")
samples_resp <- GET(samples_url, add_headers(accept = "application/json"))
samples <- fromJSON(content(samples_resp, "text", encoding = "UTF-8"))
sample_ids <- samples$sampleId
cat("Total samples:", length(sample_ids), "\n")

# Fetch mutations
mutations_url <- paste0(base_api, "/molecular-profiles/", mut_profile, "/mutations/fetch")
body_json <- sprintf(
  '{"sampleIds":%s,"entrezGeneIds":%s}',
  toJSON(as.character(sample_ids)),
  toJSON(as.integer(gene_info$entrezGeneId))
)

cat("Fetching classifier gene mutations...\n")
resp <- POST(
  mutations_url,
  body = body_json,
  add_headers("Content-Type" = "application/json", "accept" = "application/json"),
  encode = "raw"
)

if (status_code(resp) == 200) {
  mutations <- fromJSON(content(resp, "text", encoding = "UTF-8"))
  cat("Total mutations:", nrow(mutations), "\n")

  # Map Entrez to Hugo
  entrez_to_hugo <- setNames(gene_info$hugoGeneSymbol, as.character(gene_info$entrezGeneId))
  mutations$Hugo_Symbol <- entrez_to_hugo[as.character(mutations$entrezGeneId)]

  cat("Unique genes mutated:", length(unique(mutations$Hugo_Symbol)), "\n")
  cat("Unique samples with mutations:", length(unique(mutations$sampleId)), "\n\n")

  # Gene frequency table
  gene_counts <- mutations %>%
    group_by(Hugo_Symbol) %>%
    summarise(
      N_mutations = n(),
      N_samples = n_distinct(sampleId),
      .groups = "drop"
    ) %>%
    arrange(desc(N_samples))

  cat("Top mutated classifier genes:\n")
  print(head(gene_counts, 20))

} else {
  cat("Failed to fetch mutations. Status:", status_code(resp), "\n")
  stop("Cannot proceed without mutation data")
}

# =============================================================================
# Create Sample x Gene Mutation Matrix
# =============================================================================

cat("\n--- Creating Mutation Matrix ---\n\n")

# Binary matrix: 1 if sample has mutation in gene, 0 otherwise
mut_matrix <- mutations %>%
  select(sampleId, Hugo_Symbol) %>%
  distinct() %>%
  mutate(mutated = 1) %>%
  tidyr::pivot_wider(
    names_from = Hugo_Symbol,
    values_from = mutated,
    values_fill = 0
  )

# Add samples with no mutations
missing_samples <- setdiff(sample_ids, mut_matrix$sampleId)
if (length(missing_samples) > 0) {
  empty_rows <- data.frame(sampleId = missing_samples, stringsAsFactors = FALSE)
  for (gene in setdiff(names(mut_matrix), "sampleId")) {
    empty_rows[[gene]] <- 0
  }
  mut_matrix <- bind_rows(mut_matrix, empty_rows)
}

cat("Mutation matrix:", nrow(mut_matrix), "samples x", ncol(mut_matrix) - 1, "genes\n")

# =============================================================================
# Classify Samples into Genetic Subtypes
# =============================================================================

cat("\n--- Classifying Samples ---\n\n")

# Helper function to check if sample has mutation in any of the genes
has_mutation <- function(sample_row, genes) {
  genes_present <- intersect(genes, names(sample_row))
  if (length(genes_present) == 0) return(0)
  sum(as.numeric(sample_row[genes_present]), na.rm = TRUE) > 0
}

# Score each sample for each subtype
classify_sample <- function(row) {
  scores <- list(
    EZB = sum(as.numeric(row[intersect(ezb_genes, names(row))]), na.rm = TRUE),
    MCD = sum(as.numeric(row[intersect(mcd_genes, names(row))]), na.rm = TRUE),
    BN2 = sum(as.numeric(row[intersect(bn2_genes, names(row))]), na.rm = TRUE),
    ST2 = sum(as.numeric(row[intersect(st2_genes, names(row))]), na.rm = TRUE),
    TP53 = sum(as.numeric(row[intersect(tp53_genes, names(row))]), na.rm = TRUE)
  )

  # Key defining mutations (high weight)
  # MYD88 L265P is pathognomonic for MCD - check if MYD88 is mutated
  if ("MYD88" %in% names(row) && row["MYD88"] == 1) scores$MCD <- scores$MCD + 2
  # CD79B with MYD88 is strong MCD
  if ("CD79B" %in% names(row) && row["CD79B"] == 1) scores$MCD <- scores$MCD + 1

  # EZH2 is strong EZB marker
  if ("EZH2" %in% names(row) && row["EZH2"] == 1) scores$EZB <- scores$EZB + 2
  # GNA13 is EZB-enriched
  if ("GNA13" %in% names(row) && row["GNA13"] == 1) scores$EZB <- scores$EZB + 1

  # TP53 mutations are defining for C2
  if ("TP53" %in% names(row) && row["TP53"] == 1) scores$TP53 <- scores$TP53 + 3

  # NOTCH2 is BN2-defining
  if ("NOTCH2" %in% names(row) && row["NOTCH2"] == 1) scores$BN2 <- scores$BN2 + 2

  # SGK1 is ST2-defining
  if ("SGK1" %in% names(row) && row["SGK1"] == 1) scores$ST2 <- scores$ST2 + 2

  # Assign to highest scoring subtype (minimum score of 1 to classify)
  max_score <- max(unlist(scores))
  if (max_score >= 1) {
    subtype <- names(scores)[which.max(unlist(scores))]
  } else {
    subtype <- "Unclassified"
  }

  return(data.frame(
    EZB_score = scores$EZB,
    MCD_score = scores$MCD,
    BN2_score = scores$BN2,
    ST2_score = scores$ST2,
    TP53_score = scores$TP53,
    Subtype = subtype,
    stringsAsFactors = FALSE
  ))
}

# Apply classification
classification <- bind_rows(lapply(1:nrow(mut_matrix), function(i) {
  row <- mut_matrix[i, ]
  result <- classify_sample(row)
  result$sampleId <- row$sampleId
  return(result)
}))

cat("Classification results:\n")
print(table(classification$Subtype))

# =============================================================================
# Alternative: LymphGen-style Classification
# =============================================================================

cat("\n--- Alternative: Key Mutation-Based Classification ---\n\n")

# More stringent classification based on key defining mutations
classification$Subtype_strict <- "Other"

# EZB: EZH2 mutation OR (GNA13 + CREBBP/KMT2D)
ezb_idx <- which(
  (mut_matrix$EZH2 == 1) |
  (mut_matrix$GNA13 == 1 & (mut_matrix$CREBBP == 1 | mut_matrix$KMT2D == 1)) |
  (mut_matrix$MEF2B == 1 & mut_matrix$CREBBP == 1)
)
classification$Subtype_strict[ezb_idx] <- "EZB"

# MCD: MYD88 + CD79B co-mutation (pathognomonic)
mcd_idx <- which(mut_matrix$MYD88 == 1 & mut_matrix$CD79B == 1)
classification$Subtype_strict[mcd_idx] <- "MCD"

# MCD also: MYD88 alone with high confidence
myd88_only <- which(mut_matrix$MYD88 == 1 & mut_matrix$CD79B == 0)
classification$Subtype_strict[myd88_only] <- "MCD-like"

# TP53: TP53 mutation (unless already classified)
tp53_idx <- which(mut_matrix$TP53 == 1 & classification$Subtype_strict == "Other")
classification$Subtype_strict[tp53_idx] <- "TP53"

# BN2: NOTCH2 mutation
bn2_idx <- which(mut_matrix$NOTCH2 == 1 & classification$Subtype_strict == "Other")
classification$Subtype_strict[bn2_idx] <- "BN2"

# ST2: SGK1 mutation
st2_idx <- which(mut_matrix$SGK1 == 1 & classification$Subtype_strict == "Other")
classification$Subtype_strict[st2_idx] <- "ST2"

cat("Strict classification:\n")
print(table(classification$Subtype_strict))

# =============================================================================
# Save Results
# =============================================================================

# Merge with existing Egress Score data
egress_data <- read.csv(file.path(processed_dir, "duke_egress_scores.csv"),
                         stringsAsFactors = FALSE)

# Add classification
classification$SAMPLE_ID <- classification$sampleId
duke_classified <- merge(egress_data,
                          classification[, c("SAMPLE_ID", "Subtype", "Subtype_strict",
                                            "EZB_score", "MCD_score")],
                          by = "SAMPLE_ID", all.x = TRUE)

# Fill NA with Unclassified
duke_classified$Subtype[is.na(duke_classified$Subtype)] <- "Unclassified"
duke_classified$Subtype_strict[is.na(duke_classified$Subtype_strict)] <- "Other"

cat("\n--- Summary of Classified Cohort ---\n\n")
cat("Total patients:", nrow(duke_classified), "\n\n")

cat("Subtype distribution (permissive):\n")
print(table(duke_classified$Subtype))

cat("\nSubtype distribution (strict):\n")
print(table(duke_classified$Subtype_strict))

# Save
write.csv(duke_classified, file.path(processed_dir, "duke_classified.csv"), row.names = FALSE)
cat("\nSaved: duke_classified.csv\n")

# =============================================================================
# EZB-specific Analysis Preview
# =============================================================================

cat("\n--- EZB Subset Analysis Preview ---\n\n")

ezb_patients <- duke_classified[duke_classified$Subtype_strict == "EZB", ]
cat("EZB patients:", nrow(ezb_patients), "\n")

if (nrow(ezb_patients) > 0) {
  cat("With survival data:", sum(!is.na(ezb_patients$OS_MONTHS) & !is.na(ezb_patients$OS_EVENT)), "\n")
  cat("With pathway mutations:", sum(ezb_patients$Egress_Score > 0, na.rm = TRUE), "\n")

  cat("\nEgress Score distribution in EZB:\n")
  print(table(ezb_patients$Egress_Score))

  cat("\nEgress Score >= 2 in EZB:", sum(ezb_patients$Egress_Score >= 2, na.rm = TRUE), "\n")
}

cat("\n=============================================================\n")
cat("CLASSIFICATION COMPLETE\n")
cat("=============================================================\n")
