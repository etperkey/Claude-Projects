# Schmitz et al. 2018 - NCI DLBCL Cohort

Validation cohort for GC B-cell Positioning Pathway analysis.

## Citation

Schmitz R, et al. Genetics and Pathogenesis of Diffuse Large B-Cell Lymphoma. *N Engl J Med* 2018;378(15):1396-1407. DOI: 10.1056/NEJMoa1801445

## Cohort Summary

- **N**: 574 DLBCL patients
- **Sequencing**: Whole exome + targeted panel (372 genes)
- **Genetic Subtypes**: MCD, BN2, N1, EZB, A53, Unclassified
- **EZB cases**: ~69 patients (validation target)
- **Clinical data**: OS, PFS, IPI, stage, treatment (R-CHOP)

## Data Sources

### 1. NCI GDC (Open Access)
**URL**: https://gdc.cancer.gov/about-data/publications/DLBCL-2018

Available files:
- MAF files (somatic mutations) - NCICCR-DLBCL project
- Copy number data
- Gene fusions (BCL2, BCL6, MYC)
- RNA-seq expression (FPKM)

### 2. dbGaP (Controlled Access)
**Study ID**: phs001444.v1.p1
**URL**: https://www.ncbi.nlm.nih.gov/projects/gap/cgi-bin/study.cgi?study_id=phs001444.v1.p1

Required for:
- Full clinical data with survival outcomes
- Patient-level identifiers

### 3. NEJM Supplementary Materials
**URL**: https://www.nejm.org/doi/suppl/10.1056/NEJMoa1801445

Tables include:
- Table S2: Patient clinical characteristics
- Table S4: Mutation frequencies by gene
- Table S9-S10: Genetic subtype classifications

## Data Access Steps

### Option A: GDC Open Access (Mutation Data)
1. Go to https://portal.gdc.cancer.gov/
2. Search for project "NCICCR-DLBCL"
3. Download MAF files (mutations)
4. Clinical data limited without dbGaP

### Option B: dbGaP (Full Data - Recommended)
1. Apply at https://dbgap.ncbi.nlm.nih.gov/
2. Submit Data Access Request (DAR)
3. Provide IRB approval or exemption
4. Typical approval: 2-4 weeks

## Key Genes for Egress Score

Retention LoF: S1PR2, GNA13, ARHGEF1, P2RY8, RHOA
Egress GoF: CXCR4, GNAI2, RAC2, ARHGAP25

## Validation Plan

1. Download mutation data (GDC MAF files)
2. Obtain clinical data (dbGaP or supplementary)
3. Filter for EZB subtype patients
4. Calculate Egress Scores
5. Compare OS by Egress Score category
6. Validate Chapuy finding: Score 2+ = poor prognosis in EZB

## Folder Structure

```
Schmitz_NCI/
├── README.md
├── data/
│   ├── raw/           # Downloaded GDC/dbGaP files
│   └── processed/     # Analysis outputs
├── figures/
└── scripts/
```
