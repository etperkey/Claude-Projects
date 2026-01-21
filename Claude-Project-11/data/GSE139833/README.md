# GSE139833 - Normal B Cell Reference Dataset

## Overview
- **GEO Accession**: GSE139833
- **Title**: Transcriptional profiles of human mature B cells from tonsil tissue
- **Samples**: 17 samples across 5 B cell populations
- **Platform**: Illumina HiSeq 2500 (GPL16791)
- **Data Type**: RNA-seq (TPM values)

## Sample Populations
| Population | Samples | Description |
|------------|---------|-------------|
| Naive B cells | 3 | CD19+IgD+CD38- |
| Total GC B cells | 3 | CD19+IgD-CD38+ |
| Memory B cells | 3 | CD19+IgD-CD38- |
| Dark Zone GC | 4 | CD19+IgD-CD38+CXCR4+ |
| Light Zone GC | 4 | CD19+IgD-CD38+CXCR4- |

## Purpose for FL Analysis
This dataset provides **normal germinal center B cell reference profiles** for:
- Identifying FL-specific gene expression changes
- Mapping FL transcriptional states to normal GC biology
- Validating germinal center program signatures
- Cell-of-origin analysis

## Files
- `GSE139833_series_matrix.txt.gz` - Sample annotations
- `GSE139833_family.soft.gz` - Full metadata
- `GSE139833_n_gc_m_lz_dz_tpm_grch38.txt.gz` - **TPM expression matrix** (GRCh38)

## Key Reference
Used in Krull et al. (2024) Cell Reports Medicine for GC program association analysis in FL.

## Download Source
https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE139833
