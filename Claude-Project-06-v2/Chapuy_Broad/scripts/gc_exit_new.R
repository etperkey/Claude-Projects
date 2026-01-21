# NEW GC EXIT SIGNATURE
# Definition: (GNA13 mut OR S1PR2 mut OR P2RY8 mut) AND NOT RHOA del
# All samples included, but GCexit+ excludes those with RHOA deletion

library(dplyr)
library(tidyr)
library(survival)
library(readxl)

# Load data
clinical_patient <- read.delim("data/raw/data_clinical_patient.txt", comment.char = "#")
clinical_sample <- read.delim("data/raw/data_clinical_sample.txt", comment.char = "#")
mutations <- read.delim("data/raw/data_mutations.txt", comment.char = "#")
clinical <- merge(clinical_patient, clinical_sample, by = "PATIENT_ID", all = TRUE)

# Load SCNA for RHOA deletion
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

# Get RHOA deletion
rhoa_del <- scna %>% filter(Name == "3P21.31:DEL")
sample_cols <- names(scna)[7:ncol(scna)]

rhoa_long <- rhoa_del %>%
  select(Name, all_of(sample_cols)) %>%
  pivot_longer(cols = all_of(sample_cols), names_to = "scna_id", values_to = "cnv_value") %>%
  mutate(
    RHOA_del = cnv_value != 0,
    scna_norm = normalize_id(scna_id),
    scna_base = extract_base_id(scna_norm)
  )

# Get non-silent mutations
nonsilent <- mutations %>%
  filter(!Variant_Classification %in% c("Silent", "Intron", "3'UTR", "5'UTR", "IGR", "RNA"))

wes_samples <- unique(mutations$Tumor_Sample_Barcode)

get_mut <- function(gene) {
  nonsilent %>% filter(Hugo_Symbol == gene) %>% pull(Tumor_Sample_Barcode) %>% unique()
}

# Build analysis data
data <- clinical %>%
  filter(PATIENT_ID %in% wes_samples | SAMPLE_ID %in% wes_samples) %>%
  mutate(
    GNA13_mut = PATIENT_ID %in% get_mut("GNA13") | SAMPLE_ID %in% get_mut("GNA13"),
    S1PR2_mut = PATIENT_ID %in% get_mut("S1PR2") | SAMPLE_ID %in% get_mut("S1PR2"),
    P2RY8_mut = PATIENT_ID %in% get_mut("P2RY8") | SAMPLE_ID %in% get_mut("P2RY8"),
    # New GCexit signature: GNA13 OR S1PR2 OR P2RY8
    GCexit = GNA13_mut | S1PR2_mut | P2RY8_mut,
    OS_Event = as.numeric(OS_STATUS == "1:DECEASED"),
    PFS_Event = as.numeric(PFS_STATUS == "1:Progressed"),
    sample_norm = normalize_id(SAMPLE_ID),
    patient_norm = normalize_id(PATIENT_ID),
    sample_base = extract_base_id(sample_norm),
    patient_base = extract_base_id(patient_norm)
  ) %>%
  filter(!is.na(OS_MONTHS) & !is.na(OS_Event))

# Match RHOA deletion
data <- data %>%
  left_join(rhoa_long %>% select(scna_base, RHOA_del) %>% distinct(),
            by = c("sample_base" = "scna_base")) %>%
  left_join(rhoa_long %>% select(scna_base, RHOA_del) %>% distinct() %>% rename(RHOA_del2 = RHOA_del),
            by = c("patient_base" = "scna_base")) %>%
  mutate(RHOA_del = coalesce(RHOA_del, RHOA_del2, FALSE)) %>%
  select(-RHOA_del2)

# Redefine GCexit: must have mutation AND NOT have RHOA deletion
data <- data %>%
  mutate(
    has_mutation = GNA13_mut | S1PR2_mut | P2RY8_mut,
    GCexit = has_mutation & !RHOA_del
  )

cat("=============================================================\n")
cat("NEW GC EXIT SIGNATURE\n")
cat("=============================================================\n\n")
cat("Definition: (GNA13 mut OR S1PR2 mut OR P2RY8 mut) AND NOT RHOA del\n")
cat("All samples included in analysis\n\n")

cat("=== SAMPLE BREAKDOWN ===\n")
cat(sprintf("Total samples: %d\n", nrow(data)))
cat(sprintf("With any mutation (GNA13/S1PR2/P2RY8): %d (%.1f%%)\n", sum(data$has_mutation), sum(data$has_mutation)/nrow(data)*100))
cat(sprintf("With RHOA deletion: %d (%.1f%%)\n", sum(data$RHOA_del), sum(data$RHOA_del)/nrow(data)*100))
cat(sprintf("With mutation AND RHOA del (excluded from GCexit+): %d\n", sum(data$has_mutation & data$RHOA_del)))
cat(sprintf("GCexit+ (mutation, no RHOA del): %d (%.1f%%)\n", sum(data$GCexit), sum(data$GCexit)/nrow(data)*100))

# Test function
test_sig <- function(df, label) {
  n <- nrow(df)
  n_pos <- sum(df$GCexit)

  if (n_pos < 2 || n_pos > (n - 2)) {
    return(data.frame(Subset = label, N = n, N_pos = n_pos, Pct = round(n_pos/n*100,1),
                      OS_HR = NA, OS_95CI = NA, OS_p = NA,
                      PFS_HR = NA, PFS_95CI = NA, PFS_p = NA, Direction = NA))
  }

  os_fit <- tryCatch(coxph(Surv(OS_MONTHS, OS_Event) ~ GCexit, data = df), error = function(e) NULL)
  pfs_df <- df %>% filter(!is.na(PFS_MONTHS) & !is.na(PFS_Event))
  pfs_fit <- tryCatch(coxph(Surv(PFS_MONTHS, PFS_Event) ~ GCexit, data = pfs_df), error = function(e) NULL)

  if (!is.null(os_fit)) {
    os_s <- summary(os_fit)
    os_hr <- round(os_s$conf.int[1,1], 2)
    os_ci <- paste0(round(os_s$conf.int[1,3],2), "-", round(os_s$conf.int[1,4],2))
    os_p <- round(os_s$coefficients[1,5], 4)
    direction <- ifelse(os_hr > 1, "WORSE", ifelse(os_hr < 1, "BETTER", "Neutral"))
  } else { os_hr <- NA; os_ci <- NA; os_p <- NA; direction <- NA }

  if (!is.null(pfs_fit)) {
    pfs_s <- summary(pfs_fit)
    pfs_hr <- round(pfs_s$conf.int[1,1], 2)
    pfs_ci <- paste0(round(pfs_s$conf.int[1,3],2), "-", round(pfs_s$conf.int[1,4],2))
    pfs_p <- round(pfs_s$coefficients[1,5], 4)
  } else { pfs_hr <- NA; pfs_ci <- NA; pfs_p <- NA }

  data.frame(Subset = label, N = n, N_pos = n_pos, Pct = round(n_pos/n*100,1),
             OS_HR = os_hr, OS_95CI = os_ci, OS_p = os_p,
             PFS_HR = pfs_hr, PFS_95CI = pfs_ci, PFS_p = pfs_p, Direction = direction)
}

cat("\n\n=============================================================\n")
cat("GC EXIT SURVIVAL ANALYSIS\n")
cat("=============================================================\n\n")

results <- rbind(
  test_sig(data, "Global"),
  test_sig(data %>% filter(ANY_COO == "GCB"), "COO: GCB"),
  test_sig(data %>% filter(ANY_COO == "ABC"), "COO: ABC"),
  test_sig(data %>% filter(ANY_COO == "Unclassified"), "COO: Unclass"),
  test_sig(data %>% filter(CLUSTER == 0), "Cluster 0"),
  test_sig(data %>% filter(CLUSTER == 1), "Cluster 1"),
  test_sig(data %>% filter(CLUSTER == 2), "Cluster 2"),
  test_sig(data %>% filter(CLUSTER == 3), "Cluster 3"),
  test_sig(data %>% filter(CLUSTER == 4), "Cluster 4"),
  test_sig(data %>% filter(CLUSTER == 5), "Cluster 5")
)
print(results, row.names = FALSE)
