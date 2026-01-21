# CNV/Cytogenetic Alterations - Survival Analysis
# Global, COO, and Cluster subsets

library(dplyr)
library(tidyr)
library(survival)
library(readxl)

cat("=============================================================\n")
cat("CNV/CYTOGENETIC SURVIVAL ANALYSIS\n")
cat("=============================================================\n\n")

# Load data
clinical_patient <- read.delim("data/raw/data_clinical_patient.txt", comment.char = "#")
clinical_sample <- read.delim("data/raw/data_clinical_sample.txt", comment.char = "#")
mutations <- read.delim("data/raw/data_mutations.txt", comment.char = "#")
clinical <- merge(clinical_patient, clinical_sample, by = "PATIENT_ID", all = TRUE)

# Load SCNA data
scna <- read_excel("data/raw/chapuy_supp_table8_downloaded.xlsx",
                   sheet = "a) List of significant SCNAs", skip = 1)

# ID normalization
normalize_id <- function(x) toupper(gsub("-", "_", x))
extract_base_id <- function(x) {
  x <- gsub("_DT$", "", x)
  x <- gsub("_NULLPAIR$", "", x)
  x <- gsub("_T$", "", x)
  x
}

wes_samples <- unique(mutations$Tumor_Sample_Barcode)
sample_cols <- names(scna)[7:ncol(scna)]

# Build base clinical dataset
data <- clinical %>%
  filter(PATIENT_ID %in% wes_samples | SAMPLE_ID %in% wes_samples) %>%
  mutate(
    OS_Event = as.numeric(OS_STATUS == "1:DECEASED"),
    PFS_Event = as.numeric(PFS_STATUS == "1:Progressed"),
    sample_norm = normalize_id(SAMPLE_ID),
    patient_norm = normalize_id(PATIENT_ID),
    sample_base = extract_base_id(sample_norm),
    patient_base = extract_base_id(patient_norm)
  ) %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_Event))

cat(sprintf("Patients with survival data: %d\n", nrow(data)))
cat(sprintf("CNV peaks to test: %d\n\n", nrow(scna)))

# Function to test a single CNV
test_cnv <- function(df, cnv_col, label) {
  n <- nrow(df)
  n_pos <- sum(df[[cnv_col]], na.rm = TRUE)

  if (n_pos < 2 || n_pos > (n - 2)) {
    return(data.frame(
      Subset = label, N = n, N_alt = n_pos, Pct = round(n_pos/n*100, 1),
      OS_HR = NA, OS_p = NA, PFS_HR = NA, PFS_p = NA, Direction = NA
    ))
  }

  # OS
  os_fit <- tryCatch(
    coxph(as.formula(paste("Surv(OS_MONTHS, OS_Event) ~", cnv_col)), data = df),
    error = function(e) NULL
  )

  # PFS
  pfs_df <- df %>% filter(!is.na(PFS_MONTHS) & !is.na(PFS_Event))
  pfs_fit <- tryCatch(
    coxph(as.formula(paste("Surv(PFS_MONTHS, PFS_Event) ~", cnv_col)), data = pfs_df),
    error = function(e) NULL
  )

  if (!is.null(os_fit)) {
    os_s <- summary(os_fit)
    os_hr <- round(os_s$conf.int[1,1], 2)
    os_p <- round(os_s$coefficients[1,5], 4)
    direction <- ifelse(os_hr > 1, "WORSE", ifelse(os_hr < 1, "BETTER", "Neutral"))
  } else {
    os_hr <- NA; os_p <- NA; direction <- NA
  }

  if (!is.null(pfs_fit)) {
    pfs_s <- summary(pfs_fit)
    pfs_hr <- round(pfs_s$conf.int[1,1], 2)
    pfs_p <- round(pfs_s$coefficients[1,5], 4)
  } else {
    pfs_hr <- NA; pfs_p <- NA
  }

  data.frame(
    Subset = label, N = n, N_alt = n_pos, Pct = round(n_pos/n*100, 1),
    OS_HR = os_hr, OS_p = os_p, PFS_HR = pfs_hr, PFS_p = pfs_p, Direction = direction
  )
}

# Process all CNV peaks
all_results <- data.frame()

for (i in 1:nrow(scna)) {
  peak_name <- scna$Name[i]

  # Get CNV data for this peak
  cnv_long <- scna[i, ] %>%
    select(Name, all_of(sample_cols)) %>%
    pivot_longer(cols = all_of(sample_cols), names_to = "scna_id", values_to = "cnv_value") %>%
    mutate(
      has_cnv = cnv_value != 0,
      scna_norm = normalize_id(scna_id),
      scna_base = extract_base_id(scna_norm)
    )

  # Match to clinical data
  data_cnv <- data %>%
    left_join(cnv_long %>% select(scna_base, has_cnv) %>% distinct(),
              by = c("sample_base" = "scna_base")) %>%
    left_join(cnv_long %>% select(scna_base, has_cnv) %>% distinct() %>% rename(has_cnv2 = has_cnv),
              by = c("patient_base" = "scna_base")) %>%
    mutate(CNV = coalesce(has_cnv, has_cnv2, FALSE)) %>%
    select(-has_cnv, -has_cnv2)

  # Test globally
  global_res <- test_cnv(data_cnv, "CNV", "Global")
  global_res$Peak <- peak_name
  all_results <- rbind(all_results, global_res)

  # Test by COO
  for (coo in c("GCB", "ABC", "Unclassified")) {
    coo_data <- data_cnv %>% filter(ANY_COO == coo)
    if (nrow(coo_data) >= 5) {
      coo_res <- test_cnv(coo_data, "CNV", paste0("COO:", coo))
      coo_res$Peak <- peak_name
      all_results <- rbind(all_results, coo_res)
    }
  }

  # Test by Cluster
  for (cl in 0:5) {
    cl_data <- data_cnv %>% filter(CLUSTER == cl)
    if (nrow(cl_data) >= 5) {
      cl_res <- test_cnv(cl_data, "CNV", paste0("C", cl))
      cl_res$Peak <- peak_name
      all_results <- rbind(all_results, cl_res)
    }
  }
}

# Reorder columns
all_results <- all_results %>%
  select(Peak, Subset, N, N_alt, Pct, OS_HR, OS_p, PFS_HR, PFS_p, Direction)

# ============================================================
# RESULTS
# ============================================================

cat("\n=============================================================\n")
cat("GLOBAL RESULTS (sorted by OS p-value)\n")
cat("=============================================================\n\n")

global_results <- all_results %>%
  filter(Subset == "Global") %>%
  filter(!is.na(OS_HR)) %>%
  arrange(OS_p)

print(head(global_results, 20), row.names = FALSE)

cat("\n\n=============================================================\n")
cat("SIGNIFICANT ASSOCIATIONS (p < 0.05)\n")
cat("=============================================================\n\n")

sig_results <- all_results %>%
  filter(OS_p < 0.05 | PFS_p < 0.05) %>%
  arrange(pmin(OS_p, PFS_p, na.rm = TRUE))

if (nrow(sig_results) > 0) {
  print(sig_results, row.names = FALSE)
} else {
  cat("No significant associations at p < 0.05\n")
}

cat("\n\n=============================================================\n")
cat("TRENDING ASSOCIATIONS (p < 0.1)\n")
cat("=============================================================\n\n")

trend_results <- all_results %>%
  filter((OS_p < 0.1 | PFS_p < 0.1) & (OS_p >= 0.05 & PFS_p >= 0.05 | is.na(PFS_p))) %>%
  arrange(pmin(OS_p, PFS_p, na.rm = TRUE))

if (nrow(trend_results) > 0) {
  print(head(trend_results, 20), row.names = FALSE)
}

# Save full results
write.csv(all_results, "data/raw/cnv_survival_all_results.csv", row.names = FALSE)
cat("\n\nSaved: data/raw/cnv_survival_all_results.csv\n")

# Summary of worst CNVs (HR > 1, p < 0.1)
cat("\n\n=============================================================\n")
cat("CNVs ASSOCIATED WITH WORSE OUTCOMES (HR > 1, p < 0.1)\n")
cat("=============================================================\n\n")

worse_os <- all_results %>%
  filter(OS_HR > 1 & OS_p < 0.1) %>%
  arrange(OS_p)

worse_pfs <- all_results %>%
  filter(PFS_HR > 1 & PFS_p < 0.1) %>%
  arrange(PFS_p)

cat("=== WORSE OS ===\n")
if (nrow(worse_os) > 0) {
  print(worse_os, row.names = FALSE)
} else {
  cat("None\n")
}

cat("\n=== WORSE PFS ===\n")
if (nrow(worse_pfs) > 0) {
  print(worse_pfs, row.names = FALSE)
} else {
  cat("None\n")
}

# Summary of better CNVs (HR < 1, p < 0.1)
cat("\n\n=============================================================\n")
cat("CNVs ASSOCIATED WITH BETTER OUTCOMES (HR < 1, p < 0.1)\n")
cat("=============================================================\n\n")

better_os <- all_results %>%
  filter(OS_HR < 1 & OS_p < 0.1) %>%
  arrange(OS_p)

better_pfs <- all_results %>%
  filter(PFS_HR < 1 & PFS_p < 0.1) %>%
  arrange(PFS_p)

cat("=== BETTER OS ===\n")
if (nrow(better_os) > 0) {
  print(better_os, row.names = FALSE)
} else {
  cat("None\n")
}

cat("\n=== BETTER PFS ===\n")
if (nrow(better_pfs) > 0) {
  print(better_pfs, row.names = FALSE)
} else {
  cat("None\n")
}
