# Install required packages for DLBCL Genomics Explorer

packages <- c(
  "shiny",
  "bslib",
  "dplyr",
  "ggplot2",
  "survival",
  "survminer",
  "DT",
  "plotly",
  "tidyr"
)

# Install missing packages
installed <- installed.packages()[, "Package"]
to_install <- packages[!packages %in% installed]

if (length(to_install) > 0) {
  message("Installing: ", paste(to_install, collapse = ", "))
  install.packages(to_install)
} else {
  message("All packages already installed.")
}

# Verify installation
message("\nVerifying packages:")
for (pkg in packages) {
  if (require(pkg, character.only = TRUE, quietly = TRUE)) {
    message("  ", pkg, " - OK")
  } else {
    message("  ", pkg, " - FAILED")
  }
}
