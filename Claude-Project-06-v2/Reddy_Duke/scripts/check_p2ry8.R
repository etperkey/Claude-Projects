# Investigate P2RY8 absence in Duke cohort
library(httr)
library(jsonlite)

cat("=== Investigating P2RY8 in Duke Cohort ===\n\n")

base_api <- "https://www.cbioportal.org/api"

# 1. Check if P2RY8 is in the gene database
cat("1. Checking P2RY8 gene info...\n")
gene_url <- paste0(base_api, "/genes/P2RY8")
resp <- GET(gene_url, add_headers(accept = "application/json"))
if (status_code(resp) == 200) {
  gene_info <- fromJSON(content(resp, "text", encoding = "UTF-8"))
  cat("   Gene found: ", gene_info$hugoGeneSymbol, "\n")
  cat("   Entrez ID: ", gene_info$entrezGeneId, "\n")
  cat("   Type: ", gene_info$type, "\n")
} else {
  cat("   Gene NOT found in cBioPortal database!\n")
}

# 2. Check mutation count for P2RY8 across ALL studies
cat("\n2. Checking P2RY8 mutations across cBioPortal studies...\n")
mut_count_url <- paste0(base_api, "/genes/P2RY8/mutations?projection=META")
resp2 <- GET(mut_count_url, add_headers(accept = "application/json"))
# This might not work - try alternative

# 3. Search for P2RY8 in Duke specifically using different approach
cat("\n3. Searching for ANY P2RY8 mutation in Duke study...\n")

# Get all mutations and check if P2RY8 is present
study_id <- "dlbcl_duke_2017"
mut_profile <- "dlbcl_duke_2017_mutations"

# Try fetching P2RY8 specifically
p2ry8_url <- paste0(base_api, "/molecular-profiles/", mut_profile, "/mutations/fetch")
body_json <- sprintf('{"entrezGeneIds":[%d],"sampleListId":"%s_all"}', 286530, study_id)

resp3 <- POST(
  p2ry8_url,
  body = body_json,
  add_headers("Content-Type" = "application/json", "accept" = "application/json"),
  encode = "raw"
)

if (status_code(resp3) == 200) {
  p2ry8_muts <- fromJSON(content(resp3, "text", encoding = "UTF-8"))
  if (length(p2ry8_muts) > 0 && nrow(p2ry8_muts) > 0) {
    cat("   P2RY8 mutations found:", nrow(p2ry8_muts), "\n")
  } else {
    cat("   P2RY8 mutations: 0 (confirmed)\n")
  }
} else {
  cat("   Query failed. Status:", status_code(resp3), "\n")
}

# 4. Check gene panel - what genes are covered?
cat("\n4. Checking gene panel/coverage info for Duke study...\n")
panel_url <- paste0(base_api, "/studies/", study_id, "/gene-panels")
resp4 <- GET(panel_url, add_headers(accept = "application/json"))
if (status_code(resp4) == 200) {
  panels <- fromJSON(content(resp4, "text", encoding = "UTF-8"))
  if (length(panels) > 0) {
    cat("   Gene panels:", paste(panels$genePanelId, collapse = ", "), "\n")
  } else {
    cat("   No specific gene panel - likely WES/WGS\n")
  }
}

# 5. Compare with Chapuy
cat("\n5. Checking P2RY8 in Chapuy study...\n")
chapuy_profile <- "dlbcl_dfci_2018_mutations"
chapuy_study <- "dlbcl_dfci_2018"

chapuy_url <- paste0(base_api, "/molecular-profiles/", chapuy_profile, "/mutations/fetch")
chapuy_body <- sprintf('{"entrezGeneIds":[%d],"sampleListId":"%s_all"}', 286530, chapuy_study)

resp5 <- POST(
  chapuy_url,
  body = chapuy_body,
  add_headers("Content-Type" = "application/json", "accept" = "application/json"),
  encode = "raw"
)

if (status_code(resp5) == 200) {
  chapuy_p2ry8 <- fromJSON(content(resp5, "text", encoding = "UTF-8"))
  if (length(chapuy_p2ry8) > 0 && nrow(chapuy_p2ry8) > 0) {
    cat("   Chapuy P2RY8 mutations found:", nrow(chapuy_p2ry8), "\n")
    cat("   Unique samples:", length(unique(chapuy_p2ry8$sampleId)), "\n")
  }
}

# 6. Check study details
cat("\n6. Duke study sequencing info...\n")
study_url <- paste0(base_api, "/studies/", study_id)
resp6 <- GET(study_url, add_headers(accept = "application/json"))
if (status_code(resp6) == 200) {
  study_info <- fromJSON(content(resp6, "text", encoding = "UTF-8"))
  cat("   Name:", study_info$name, "\n")
  cat("   Description:", substr(study_info$description, 1, 300), "\n")
}

cat("\n=== SUMMARY ===\n")
cat("P2RY8 (Entrez ID 286530) is located on Xp22.33 (PAR1 region)\n")
cat("The pseudoautosomal region can have alignment/calling issues\n")
cat("Duke WES may have different coverage or calling parameters for this region\n")
