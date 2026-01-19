# Download sample-level clinical data (includes CENSORED status)
library(httr)
library(jsonlite)
library(dplyr)

cat("=== Downloading Sample-Level Clinical Data ===\n\n")

duke_dir <- "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Duke"
raw_dir <- file.path(duke_dir, "data/raw")

study_id <- "dlbcl_duke_2017"
base_api <- "https://www.cbioportal.org/api"

# Get sample clinical data (includes CENSORED)
sample_url <- paste0(base_api, "/studies/", study_id, "/clinical-data?clinicalDataType=SAMPLE")
resp <- GET(sample_url, add_headers(accept = "application/json"))

if (status_code(resp) == 200) {
  sample_raw <- fromJSON(content(resp, "text", encoding = "UTF-8"))
  cat("Sample clinical data points:", nrow(sample_raw), "\n")

  # Pivot to wide format
  samples <- unique(sample_raw$sampleId)
  attrs <- unique(sample_raw$clinicalAttributeId)

  cat("Unique samples:", length(samples), "\n")
  cat("Sample attributes:", paste(attrs, collapse = ", "), "\n\n")

  # Pivot
  sample_wide <- data.frame(SAMPLE_ID = samples, stringsAsFactors = FALSE)
  for (attr in attrs) {
    vals <- sample_raw[sample_raw$clinicalAttributeId == attr, c("sampleId", "value")]
    names(vals) <- c("SAMPLE_ID", attr)
    sample_wide <- merge(sample_wide, vals, by = "SAMPLE_ID", all.x = TRUE)
  }

  cat("Sample clinical (wide format):", nrow(sample_wide), "samples,", ncol(sample_wide), "columns\n\n")

  # Check CENSORED column
  if ("CENSORED" %in% names(sample_wide)) {
    cat("CENSORED values:\n")
    print(table(sample_wide$CENSORED, useNA = "ifany"))

    # Create OS_STATUS based on CENSORED
    # CENSORED can be "LIVING"/"DECEASED" or "true"/"false"
    sample_wide$OS_STATUS <- case_when(
      sample_wide$CENSORED == "LIVING" ~ "0:LIVING",
      sample_wide$CENSORED == "true" ~ "0:LIVING",
      sample_wide$CENSORED == "DECEASED" ~ "1:DECEASED",
      sample_wide$CENSORED == "false" ~ "1:DECEASED",
      TRUE ~ NA_character_
    )
    cat("\nOS_STATUS derived:\n")
    print(table(sample_wide$OS_STATUS, useNA = "ifany"))
  }

  # Check FISH status for subtyping
  fish_cols <- c("BCL2_FISH_STATUS", "BCL6_FISH_STATUS", "MYC_FISH")
  for (col in fish_cols) {
    if (col %in% names(sample_wide)) {
      cat("\n", col, ":\n")
      print(table(sample_wide[[col]], useNA = "ifany"))
    }
  }

  # Save
  write.csv(sample_wide, file.path(raw_dir, "data_clinical_sample.csv"), row.names = FALSE)
  cat("\nSaved: data_clinical_sample.csv\n")

  # Merge with patient data
  patient_data <- read.csv(file.path(raw_dir, "data_clinical_patient.csv"), stringsAsFactors = FALSE)

  # Sample ID is typically PATIENT_ID_01 format
  sample_wide$PATIENT_ID <- gsub("_01$", "", sample_wide$SAMPLE_ID)

  # Merge
  combined <- merge(patient_data, sample_wide, by = "PATIENT_ID", all.x = TRUE)
  cat("Combined clinical data:", nrow(combined), "patients\n")

  write.csv(combined, file.path(raw_dir, "data_clinical_combined.csv"), row.names = FALSE)
  cat("Saved: data_clinical_combined.csv\n")

  # Summary for survival analysis readiness
  cat("\n=== SURVIVAL ANALYSIS READINESS ===\n")
  has_time <- sum(!is.na(combined$OS_MONTHS))
  has_status <- sum(!is.na(combined$OS_STATUS))
  has_both <- sum(!is.na(combined$OS_MONTHS) & !is.na(combined$OS_STATUS))

  cat("Patients with OS_MONTHS:", has_time, "\n")
  cat("Patients with OS_STATUS:", has_status, "\n")
  cat("Patients with BOTH (analyzable):", has_both, "\n")

} else {
  cat("Failed to get sample clinical data. Status:", status_code(resp), "\n")
}
