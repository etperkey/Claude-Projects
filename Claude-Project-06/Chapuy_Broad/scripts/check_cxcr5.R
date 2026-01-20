library(dplyr)
mutations <- read.csv("C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Chapuy_Broad/data/processed/chapuy_mutations_135.csv")

cat("=== CXCR5 Mutations ===\n\n")
cxcr5 <- mutations %>%
  filter(Hugo_Symbol == "CXCR5") %>%
  select(Hugo_Symbol, Variant_Classification, HGVSp_Short, Protein_position)

for (i in 1:nrow(cxcr5)) {
  cat(sprintf("%s | %s | position %s\n",
              cxcr5$Variant_Classification[i],
              cxcr5$HGVSp_Short[i],
              cxcr5$Protein_position[i]))
}

cat("\nCXCR5 is 372 amino acids. C-terminus is involved in receptor internalization.\n")
