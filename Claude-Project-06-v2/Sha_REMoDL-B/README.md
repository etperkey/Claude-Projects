# Sha/REMoDL-B DLBCL Dataset

## Overview

This dataset contains gene expression data from the **REMoDL-B Phase III clinical trial** investigating bortezomib addition to R-CHOP in DLBCL patients.

## Key Publication

**Ennishi D, Jiang A, Boyle M, et al.** Molecular High-Grade B-Cell Lymphoma: Defining a Poor-Risk Group That Requires Different Approaches to Therapy. *J Clin Oncol.* 2019;37(3):202-212.

- PMID: 30523719
- DOI: https://doi.org/10.1200/JCO.18.01314

## Study Summary

- **Cohort**: 928 DLBCL patients from REMoDL-B clinical trial
- **Trial**: Phase III, multicenter, randomized trial (NCT01324596)
- **Treatment**: R-CHOP vs R-CHOP + bortezomib
- **Expression Platform**: Illumina HumanHT-12 WG-DASL V4.0
- **Key Finding**: Defined Molecular High-Grade (MHG) subgroup with poor prognosis

## Data Files

### Raw Data (GEO: GSE117556)
| File | Description |
|------|-------------|
| `GSE117556_non-normalized.csv.gz` | Raw expression data (928 samples) |
| `GSE117556_series_matrix.txt.gz` | Series matrix with sample annotations |

### Processed Data
| File | Description |
|------|-------------|
| `sha_geo_clinical.csv` | Clinical data extracted from GEO metadata |
| `sha_expression.rds` | Processed expression matrix (R object) |
| `remodlb_cluster_survival_summary.csv` | MHG cluster survival analysis |

## Important Note

**This dataset is DISTINCT from the Lacy/HMRN cohort.**

The REMoDL-B trial (this dataset) and the HMRN population cohort (Lacy et al. 2020) are separate patient populations that coincidentally both have 928 samples. Do not mix data between these datasets.

| Dataset | Source | GEO | Expression | Sequencing |
|---------|--------|-----|------------|------------|
| REMoDL-B (this) | Clinical trial | GSE117556 | 928 pts | 400 pts (70-gene) |
| Lacy/HMRN | Population registry | GSE181063 | 1311 pts | 928 pts (293-gene) |

For mutation/genomic data with clinical outcomes, use the **Lacy_HMRN** folder.

## MHG (Molecular High-Grade) Classification

The MHG group comprises ~9% of DLBCL cases with:
- Centroblast-like gene expression
- Enriched for MYC rearrangement and double-hit
- 36-month PFS: 37% (vs 72% for others)
- Possible benefit from bortezomib addition

## Directory Structure

```
Sha_REMoDL-B/
├── README.md
├── data/
│   ├── raw/
│   │   ├── GSE117556_non-normalized.csv.gz
│   │   └── GSE117556_series_matrix.txt.gz
│   └── processed/
│       ├── sha_geo_clinical.csv
│       ├── sha_expression.rds
│       └── remodlb_cluster_survival_summary.csv
├── figures/
└── scripts/
```

## Related Resources

- GEO: https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE117556
- Trial: https://clinicaltrials.gov/ct2/show/NCT01324596
