# Check all clinical attributes in Duke study
library(httr)
library(jsonlite)

base_api <- "https://www.cbioportal.org/api"
study_id <- "dlbcl_duke_2017"

# Get clinical attribute metadata
attr_url <- paste0(base_api, "/studies/", study_id, "/clinical-attributes")
resp <- GET(attr_url, add_headers(accept = "application/json"))
attrs <- fromJSON(content(resp, "text", encoding = "UTF-8"))

cat("All clinical attributes:\n\n")
print(attrs[, c("clinicalAttributeId", "displayName", "datatype")])

# Look specifically for survival-related
cat("\n\nSurvival/Status related:\n")
survival_attrs <- attrs[grepl("OS|STATUS|SURVIVAL|DEAD|ALIVE|EVENT|CENSOR",
                              attrs$clinicalAttributeId, ignore.case = TRUE), ]
if (nrow(survival_attrs) > 0) {
  print(survival_attrs[, c("clinicalAttributeId", "displayName")])
} else {
  cat("None found\n")
}
