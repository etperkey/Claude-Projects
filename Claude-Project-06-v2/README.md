# GC B-cell Positioning Pathway Analysis in DLBCL

Analysis of germinal center B-cell positioning pathway mutations in diffuse large B-cell lymphoma (DLBCL) using the Chapuy et al. 2018 cohort.

## Key Findings

- **Egress Score ≥2 in C3-EZB**: Median OS 13.2 months vs 89.5 months (p = 0.004)
- **100% mortality** in Score 2+ group (4/4 patients)
- TMB is NOT different between score groups (p = 0.80) - effect is pathway-specific

## Pathway Genes

### Retention (Loss-of-Function)
- S1PR2, GNA13, ARHGEF1, P2RY8, RHOA

### Egress (Gain-of-Function)
- CXCR4, GNAI2, RAC2, ARHGAP25 (GAP-LoF)
- S1PR1 → GNAI2 signaling

## Data Source

- **Cohort**: Chapuy et al. Nature Medicine 2018
- **Source**: cBioPortal (dlbcl_dfci_2018)
- **Patients**: n = 135 DLBCL with clinical data
- **C3-EZB cluster**: n = 28 patients

## Requirements

- R >= 4.0
- R packages: `survival`, `png`, `grid`

Install packages:
```r
install.packages(c("survival", "png", "grid"))
```

## Usage

### Run Complete Pipeline

```bash
cd Claude-Project-06
Rscript Chapuy/scripts/run_analysis.R
```

### Run Individual Components

```r
# Set working directory to Chapuy folder first
setwd("Chapuy")

# Generate pathway figures
source("scripts/methodology_figure.R")

# Run full analysis (frequencies, survival)
source("scripts/full_analysis_code.R")

# TMB analysis
source("scripts/tmb_analysis.R")

# Generate mutation details table
source("scripts/mutation_details.R")

# Create presentation PDF
source("scripts/create_presentation_v2.R")
```

## Project Structure

```
Claude-Project-06/
├── README.md
├── GC_Bcell_Positioning_Pathway_DLBCL_Presentation.pdf  # Final output
└── Chapuy/                              # All Chapuy cohort analysis
    ├── data/
    │   ├── raw/                         # Raw cBioPortal data
    │   │   ├── data_mutations.txt
    │   │   ├── data_clinical_patient.txt
    │   │   └── data_clinical_sample.txt
    │   └── processed/                   # Analysis outputs
    │       ├── chapuy_s1p_clinical.csv
    │       ├── chapuy_tmb_analysis.csv
    │       ├── pathway_mutations_by_patient.csv
    │       └── patient_mutation_summary.csv
    ├── figures/
    │   ├── S1P_pathway_diagram.png
    │   ├── methodology_S1P_analysis.png
    │   └── TMB_by_EgressScore.png
    └── scripts/
        ├── run_analysis.R               # Master pipeline script
        ├── full_analysis_code.R         # Main analysis
        ├── methodology_figure.R         # Pathway diagrams
        ├── tmb_analysis.R               # TMB comparison
        ├── mutation_details.R           # Per-patient mutations
        └── create_presentation_v2.R     # PDF generation
```

## Egress Score Calculation

```
Egress Score = (# Retention LoF genes mutated) + (# Egress GoF genes mutated)

Categories:
- Score 0: No pathway mutations
- Score 1: Single gene affected
- Score 2+: Multiple pathway hits
```

## Output Files

| File | Description |
|------|-------------|
| `GC_Bcell_Positioning_Pathway_DLBCL_Presentation.pdf` | 13-slide presentation |
| `Chapuy/data/processed/chapuy_s1p_clinical.csv` | Patient-level pathway scores + clinical data |
| `Chapuy/data/processed/chapuy_tmb_analysis.csv` | TMB (mutations/Mb) by patient |
| `Chapuy/data/processed/pathway_mutations_by_patient.csv` | Specific mutations per patient |

## Citation

Chapuy B, et al. Molecular subtypes of diffuse large B cell lymphoma are associated with distinct pathogenic mechanisms and outcomes. *Nature Medicine* 2018;24(5):679-690.

## Author

Eric Perkey
