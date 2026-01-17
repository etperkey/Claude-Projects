# GC B-cell Lymphoma Pathway Mutation Analysis

Bioinformatics pipeline comparing mutation frequencies between competing signaling pathways in Follicular Lymphoma (FL) and GCB-DLBCL across disease stages.

## Biological Background

GC B-cell lymphomas arise from germinal center B cells. Two competing signaling pathways regulate GC B-cell migration:

**Tumor Suppressor (Confinement) Pathway:**
- S1PR2 → GNA13 → ARHGEF1 → RHOA
- Promotes GC B-cell confinement within the germinal center
- Loss-of-function mutations allow escape/dissemination

**Pro-migratory (Dissemination) Pathway:**
- S1PR1/CXCR4 → GNAI2 → RAC1/RAC2
- Promotes GC B-cell migration
- Gain-of-function mutations enhance dissemination

## Pipeline Overview

```
Data Acquisition (Python) → Processing (Python) → Analysis (R) → Visualization (R)
```

## Installation

### Python Dependencies

```bash
cd Claude-Project-06
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### R Dependencies

```r
install.packages(c("tidyverse", "yaml", "here", "broom", "scales", "RColorBrewer", "nnet"))
```

## Usage

### 1. Data Acquisition

```bash
cd src/python
python fetch_cbioportal.py
```

### 2. Data Processing

```bash
python process_mutations.py
```

### 3. Statistical Analysis

```r
source("src/R/statistical_analysis.R")
run_analysis()
```

### 4. Visualization

```r
source("src/R/visualizations.R")
create_visualizations()
```

## Output Files

**Statistical Results** (`results/tables/`):
- Gene and pathway mutation frequencies by stage
- Fisher's exact tests and trend tests
- Pairwise stage comparisons with odds ratios
- Logistic regression results

**Figures** (`results/figures/`):
- `gene_frequency_heatmap.png` - Mutation frequencies by gene/stage
- `pathway_comparison.png` - Pathway frequency bar chart
- `frequency_trends.png` - Trend lines across stages
- `forest_plot_odds_ratios.png` - Odds ratios for comparisons
- `mutation_landscape.png` - Oncoplot-style visualization

## Configuration

Edit `config/genes.yaml` to modify pathway genes, studies, staging rules, and filtering criteria.

## Key References

1. Muppidi JR, et al. *Nature*. 2014;516(7530):254-258.
2. Schmitz R, et al. *N Engl J Med*. 2018;378(15):1396-1407.
