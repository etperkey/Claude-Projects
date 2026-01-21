# GSE119214 - Follicular Lymphoma Clinicogenetic Risk Dataset

## Overview
- **GEO Accession**: GSE119214
- **Title**: Clinicogenetic Risk Prognostication for First-Line Treatment of Symptomatic Follicular Lymphoma
- **Samples**: 137 FL patients
- **Platform**: Illumina HumanHT-12 WG-DASL V4.0 (GPL13938)
- **Publication Date**: February 2019
- **PubMed ID**: 30606786

## Clinical Data Available
- **Failure-Free Survival (FFS)**: codeffs (event 0/1), ffs (time in years)
- **Overall Survival (OS)**: codeos (event 0/1), os (time in years)
- **m7-FLIPI score**: Clinico-genetic risk model (0/1/NA)
- **FOXP1 expression**: POS/NEG
- **EZH2 mutation status**: Referenced in publication

## Files
- `GSE119214_series_matrix.txt.gz` - Expression data + clinical annotations
- `GSE119214_Non-normalized_data.txt.gz` - Raw non-normalized expression values
- `GSE119214_family.soft.gz` - Full SOFT format file with all metadata
- `filelist.txt` - List of supplementary files

## Data Processing Notes
- FFPE tissue samples processed with Illumina DASL assay
- BC Cancer Agency cohort
- Rituximab + chemotherapy treated patients (modern treatment era)
- Validated the 23-gene predictor (MRS) from PRIMA trial

## Key Features for Analysis
- Rich survival data (FFS and OS)
- Genetic risk scores (m7-FLIPI)
- Biomarker status (FOXP1)
- Modern treatment era (rituximab-based)

## Download Source
https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE119214
