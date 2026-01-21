# Deployment script for shinyapps.io
# Run this script to deploy the DLBCL Genomics Explorer

# Prerequisites:
# 1. Create a free account at https://www.shinyapps.io
# 2. Get your token from: Account > Tokens > Show > Copy to clipboard
# 3. Run rsconnect::setAccountInfo() with your credentials (one time only)

library(rsconnect)

# First-time setup (uncomment and run once with your credentials):
# rsconnect::setAccountInfo(
#   name = 'YOUR_ACCOUNT_NAME',
#   token = 'YOUR_TOKEN',
#   secret = 'YOUR_SECRET'
# )

# Copy data files to shiny_app/data for deployment
copy_data_for_deploy <- function() {
  base_path <- normalizePath("..", mustWork = FALSE)
  data_dir <- file.path(getwd(), "data")

  if (!dir.exists(data_dir)) {
    dir.create(data_dir)
  }

  # Files to copy
  files <- list(
    combined_survival = file.path(base_path, "global_scripts", "combined_survival_data.csv"),
    chapuy = file.path(base_path, "Chapuy_Broad", "data", "processed", "chapuy_integrated_135.csv"),
    tegress = file.path(base_path, "Sha_REMoDL-B", "data", "processed", "tEgress_clinical.csv"),
    cooccur = file.path(base_path, "global_scripts", "gna13_cooccurrence.csv"),
    pathway = file.path(base_path, "Chapuy_Broad", "data", "processed", "pathway_status_by_patient.csv")
  )

  for (name in names(files)) {
    src <- files[[name]]
    if (file.exists(src)) {
      dest <- file.path(data_dir, basename(src))
      file.copy(src, dest, overwrite = TRUE)
      message("Copied: ", basename(src))
    } else {
      message("Not found: ", src)
    }
  }
}

# Run data copy
message("Copying data files for deployment...")
copy_data_for_deploy()

# Deploy to shinyapps.io
message("\nDeploying to shinyapps.io...")
rsconnect::deployApp(
  appDir = getwd(),
  appName = "dlbcl-genomics-explorer",
  appTitle = "DLBCL Genomics Explorer"
)
