# Run the Shiny app locally
# Usage: source("run_local.R") or Rscript run_local.R

# Set working directory to shiny_app folder
if (!grepl("shiny_app$", getwd())) {
  if (file.exists("shiny_app/app.R")) {
    setwd("shiny_app")
  }
}

# Install packages if needed
if (!require("shiny", quietly = TRUE)) {
  source("install_packages.R")
}

# Run the app
message("Starting DLBCL Genomics Explorer...")
message("Open in browser: http://127.0.0.1:3838")
shiny::runApp(".", port = 3838, launch.browser = TRUE)
