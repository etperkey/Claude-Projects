# Lacy/HMRN DLBCL Dataset

## Overview

This dataset contains genomic, transcriptomic, and clinical data from the **UK Haematological Malignancy Research Network (HMRN)** population-based cohort, with targeted sequencing of 928 DLBCL patients.

## Key Publication

**Lacy SE, Barrans SL, Beer PA, et al.** Targeted sequencing in DLBCL, molecular subtypes, and outcomes: a Haematological Malignancy Research Network report. *Blood.* 2020;135(20):1759-1771.

- PMID: 32187361
- DOI: https://doi.org/10.1182/blood.2019003535
- PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC7259825/

## Study Summary

- **Cohort**: UK population-based HMRN registry (~4 million catchment)
- **Sequenced**: 928 DLBCL patients (293-gene targeted panel)
- **Expression**: 1311 patients (Illumina DASL array)
- **Period**: Diagnosed Sept 2004 - Aug 2012
- **Key Finding**: Five molecular subtypes with distinct prognosis

## Data Files

### Mutation/Genomic Data
| File | Description | Source |
|------|-------------|--------|
| `genomic_data.csv` | Binary mutation matrix (928 pts × 117 features) | [GitHub](https://github.com/ecsg-uoy/DLBCLGenomicSubtyping) |
| `blood_2020_supplement.xlsx` | Full supplementary tables S1-S6 | Blood 2020 |

### Expression Data (GEO: GSE181063)
| File | Description |
|------|-------------|
| `GSE181063_RawData.txt.gz` | Raw expression data (1311 patients) |
| `GSE181063_series_matrix.txt.gz` | Series matrix with clinical annotations |

### Analysis Code
| File | Description |
|------|-------------|
| `fit_clusters.R` | Bernoulli mixture model clustering |
| `plotting_functions.R` | Visualization utilities |

### Documentation
| File | Description |
|------|-------------|
| `paper.pdf` | Full paper (White Rose repository) |

## Supplementary Tables (blood_2020_supplement.xlsx)

| Sheet | Contents |
|-------|----------|
| S1 Genetic features | 293-gene panel list |
| S2 DLBCL_SNV | Single nucleotide variants |
| S3 DLBCL_CNV | Copy number variants |
| S4 Patient Characteristics | Clinical data for 928 patients |
| S5 ICL Cluster Characteristics | Cluster assignments |
| S6 Genomic dataset | Full mutation matrix |

## Five Molecular Subtypes

| Subtype | Key Mutations | 5-Year Survival | Notes |
|---------|---------------|-----------------|-------|
| **MYD88** | MYD88, CD79B, PIM1 | 42% | Poor prognosis |
| **BCL2** | BCL2, EZH2, CREBBP, KMT2D | 62.5% | Favorable |
| **SOCS1/SGK1** | SOCS1, SGK1, NFKBIA | 65% | Excellent |
| **TET2/SGK1** | TET2, SGK1 | 60% | Good |
| **NOTCH2** | NOTCH2, BCL10, TNFAIP3 | 48% | Intermediate |

## Important Note

**This dataset is DISTINCT from REMoDL-B.**

| Dataset | Source | GEO | Expression | Sequencing |
|---------|--------|-----|------------|------------|
| Lacy/HMRN (this) | Population registry | GSE181063 | 1311 pts | 928 pts (293-gene) |
| REMoDL-B | Clinical trial | GSE117556 | 928 pts | 400 pts (70-gene) |

The 928 sample count is coincidental - these are different patient populations.

## Directory Structure

```
Lacy_HMRN/
├── README.md
├── genomic_data.csv
├── blood_2020_supplement.xlsx
├── GSE181063_RawData.txt.gz
├── GSE181063_series_matrix.txt.gz
├── paper.pdf
├── fit_clusters.R
└── plotting_functions.R
```

## Related Resources

- HMRN: https://hmrn.org/
- GEO: https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE181063
- GitHub: https://github.com/ecsg-uoy/DLBCLGenomicSubtyping

## Contact

Matthew A. Care (matthew.care@york.ac.uk) - University of York
