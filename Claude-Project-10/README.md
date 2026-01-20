# CAR-T and T-Cell Engager (BiTE) Response Datasets

Publicly available datasets for studying immunotherapy response in B-cell malignancies.

## CAR-T Therapy Response Datasets

### GSE208052 - CAR-T Responders vs Non-Responders (LBCL)
- **Description**: scRNA-seq of CD19 CAR-T infusion products from 9 large B-cell lymphoma patients
- **Outcomes**: 5 CR (complete response), 4 PD (progressive disease) at 6-month follow-up
- **Data Type**: 10x Genomics 5' scRNA-seq, 21,469 cells
- **Files**:
  - `GSE208052_processed.csv` - Normalized gene expression matrix
  - `GSE208052_series_matrix.txt` - Clinical metadata
- **Citation**: PMID 38307835, 38750245
- **Contact**: Navin Varadarajan (nvaradar@central.uh.edu), University of Houston

### GSE151511 - CAR-T Infusion Products (24 patients)
- **Description**: scRNA-seq from 24 axi-cel CAR-T infusion products in LBCL patients
- **Key Finding**: Exhausted CD4+/CD8+ T cells enriched in non-responders; memory CD8+ T cells enriched in CR patients
- **Data Type**: 10x Genomics scRNA-seq, 24 samples (ac01-ac24)
- **Files**: 24 individual `bc_matrix.tar.gz` files per patient
- **Note**: Raw sequencing data at EGA (EGAR00002301477)
- **Citation**: Deng et al., Nature Medicine 2020

### GSE195525 - CAR-T Treated DLBCL Patient (Metoprolol Study)
- **Description**: scRNA-seq of bone marrow mononuclear cells before/after metoprolol treatment in CAR-T recipient
- **Data Type**: 10x Genomics 5' scRNA-seq, 2 samples (before/after)
- **Files**: 2 H5 files with filtered feature-barcode matrices
- **Contact**: Yuzhuo Yang, Tsinghua University

---

## T-Cell Engager (BiTE/Bispecific) Response Datasets

### GSE216571 & GSE217245 - BCMAxCD3 T-Cell Engager in Multiple Myeloma
- **Description**: scRNA-seq of bone marrow T cells from MM patients receiving BCMAxCD3 bispecific therapy
- **Key Finding**: Pre-existing exhausted-like CD8+ T cell clones associated with treatment failure
- **Samples**:
  - GSE216571: 62 samples (processed data, 690 MB)
  - GSE217245: 45 samples (raw data, 555 MB)
- **Data Type**: 10x Genomics 5' RNA + TCR sequencing
- **Patient Groups**: T-cell engager treated, CAR-T treated, healthy donors
- **Citation**: Cancer Cell 2023, PMID 36898378
- **Contact**: Nizar Bahlis (nbahlis@ucalgary.ca), University of Calgary

---

## Tumor Genomics (NCI DLBCL - Schmitz/Staudt 2018)

### NCICCR-DLBCL - Tumor Transcriptome (562 samples)
- **Description**: Pre-treatment tumor bulk RNAseq from the landmark NCI DLBCL study
- **Samples**: 562 DLBCL patients (NCICCR + TCGA + CTSP cohorts)
- **Data Type**: Log2 FPKM normalized gene expression
- **LymphGen Subtypes**: MCD, BN2, EZB, N1, A53, ST2 classifications available
- **Files**:
  - `RNAseq_gene_expression_562.txt` - Gene x Sample expression matrix (70 MB)
  - `clinical_data.json` - Clinical/demographic data from GDC API
- **Citation**: Schmitz et al., NEJM 2018 (PMID 29641966)
- **Source**: [GDC Data Portal](https://gdc.cancer.gov/about-data/publications/DLBCL-2018)

### Controlled Access Data (Requires dbGaP Authorization)
- **WES/Mutation data (MAF files)**: Somatic variants for all 574 samples
- **Copy Number data**: Segment-level and gene-level CNV calls
- **Access**: Apply via [dbGaP phs001444](https://www.ncbi.nlm.nih.gov/projects/gap/cgi-bin/study.cgi?study_id=phs001444)

### LymphGen Classification Tool
- **URL**: https://llmpp.nih.gov/lymphgen/index.php
- **Input**: Mutation calls (VCF/MAF) + optional CNV data
- **Output**: Probability scores for 7 genetic subtypes

---

## Controlled Access Datasets (Require Application)

### DLBCL-IQ Bispecific Antibody Study (Blood 2025)
- **Description**: Bulk transcriptomes from 74 R/R DLBCL patients treated with mosunetuzumab
- **Key Finding**: "Hot" immune environment associated with better PFS; GCB cold DLBCLs had worst outcomes
- **Access**: EGA under EGAC50000000317 Data Access Committee
- **Code**: https://github.com/kline-lab-group/immune-quadrant
- **Citation**: Blood 2025;145(21):2460-2472

---

## Directory Structure

```
Claude-Project-10/
├── CAR_T_datasets/                   # T-cell profiling (scRNA-seq)
│   ├── GSE195525/                    # DLBCL CAR-T patient BM scRNA-seq
│   │   └── *.h5                      # H5 feature-barcode matrices
│   ├── GSE151511/                    # 24 LBCL CAR-T infusion products
│   │   └── GSM*_bc_matrix.tar.gz     # Per-patient barcode matrices
│   ├── GSE208052_processed.csv       # Normalized expression (367 MB)
│   ├── GSE208052_series_matrix.txt   # Clinical metadata
│   └── *.tar                         # Raw archives
│
├── BiTE_datasets/                    # T-cell engager response (MM)
│   ├── GSE216571/                    # Processed scRNA-seq per patient
│   ├── GSE217245/                    # Raw RNA + TCR data
│   └── *.tar                         # Raw archives
│
└── NCI_DLBCL_tumor/                  # TUMOR genomics (562 samples)
    ├── RNAseq_gene_expression_562.txt  # Log2 FPKM matrix (70 MB)
    ├── clinical_data.json              # GDC clinical annotations
    └── manifest_rnaseq_open.txt        # File manifest for individual samples
```

## Total Size
- CAR-T datasets (T-cell scRNA-seq): ~5.1 GB
- BiTE datasets (T-cell scRNA-seq): ~1.6 GB
- NCI tumor transcriptome: ~70 MB
- **Total**: ~6.8 GB

## Usage Notes

1. **scRNA-seq analysis**: Use Seurat (R) or Scanpy (Python) to load H5/barcode matrix files
2. **Clinical metadata**: Extract from series_matrix.txt files
3. **Response classification**: Most datasets include responder/non-responder annotations

## Key Research Questions

1. What T-cell signatures predict CAR-T response in DLBCL/LBCL?
2. How does the pre-existing immune landscape affect T-cell engager efficacy?
3. Can transcriptomic markers identify patients likely to benefit from CAR-T vs BiTE therapy?
4. What mechanisms drive resistance to T-cell redirecting therapies?

## References

1. Rezvan et al. (2024) Nature Cancer - CD8-fit T cell signature
2. Deng et al. (2020) Nature Medicine - scRNA-seq of CAR-T infusion products
3. Cancer Cell (2023) - BCMAxCD3 T-cell engager response landscape
4. Blood (2025) - DLBCL immune quadrants and bispecific antibody response
