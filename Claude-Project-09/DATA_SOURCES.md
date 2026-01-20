# DLBCL Multi-Omic Data Sources

## Paper Reference
**Title:** Axes of biological variation in diffuse large B cell lymphoma
**Authors:** Wang, Wright, Enssle, et al.
**Journal:** Cancer Cell (2026)
**DOI:** 10.1016/j.ccell.2025.12.015
**Lead Contact:** Louis M. Staudt (lstaudt@mail.nih.gov)

---

## Study Overview

This study generated a comprehensive single-cell atlas of 103 DLBCL biopsies:
- **scRNA-seq**: 103 samples (504,444 transcriptomes)
- **scATAC-seq**: 102 samples
- **Bulk RNA-seq**: 103 samples
- **WES (Whole Exome Sequencing)**: 103 samples

### Key Findings
- Identified genetic subtypes: MCD, BN2, N1, A53, EZB (DH/nonDH), ST2
- Discovered gene expression themes: GC B cell, Memory B cell, Plasma cell, Pan-B cell, Cell cycle, Cell growth
- Most tumors (79%) contain multiple genetic subclones

---

## Data Repositories

### 1. Primary Data - Wang et al. 2025 (Controlled Access)

**Repository:** European Genome-phenome Archive (EGA)
**Accession:** EGAS50000001227
**URL:** https://ega-archive.org/studies/EGAS50000001227

**Contains:**
- Discovery Cohort 1 scRNA-seq (103 samples)
- Discovery Cohort 1 scATAC-seq (102 samples)
- Discovery Cohort 1 bulk RNA-seq
- Discovery Cohort 1 WES

**Access:** Requires Data Access Application to EGA

---

### 2. Validation Cohort - Schmitz et al. 2018

**Repository:** dbGaP
**Accession:** phs001444.v2.p1
**URL:** https://www.ncbi.nlm.nih.gov/projects/gap/cgi-bin/study.cgi?study_id=phs001444

**Also available via:**
- **AWS Open Data:** s3://gdc-nciccr-phs001444-2-open/
- **GDC Data Portal:** https://portal.gdc.cancer.gov/

**Contains (574 samples):**
- Whole exome sequencing
- RNA-seq (gene expression)
- DNA copy number analysis
- Targeted amplicon resequencing
- Clinical data

**Access:** Open data on AWS/GDC; controlled access requires dbGaP authorization

---

### 3. Discovery Cohort 2 - Ennishi et al.

**Repository:** European Genome-phenome Archive (EGA)
**Accession:** EGAS00001002199
**URL:** https://ega-archive.org/studies/EGAS00001002199

**Contains (376 samples):**
- Bulk RNA-seq
- Genetic profiling data

**Access:** Requires Data Access Application to EGA

---

### 4. Tonsil Reference Data - King et al.

**Repository:** GEO (OPEN ACCESS)
**Accession:** GSE165860
**URL:** https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE165860

**Contains:**
- Normal tonsillar B cell scRNA-seq
- Used as reference for B cell differentiation states

**Access:** Publicly available - no authorization needed

---

### 5. Additional DLBCL scRNA-seq Data (Related Studies)

#### GSE182436 - DLBCL Tumor Cell States (Newman Lab)
**URL:** https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE182436
**Contains:**
- GSE182434: scRNA-seq (16 samples from 7 DLBCL, 3 FL, 1 tonsil)
- GSE182435: scVDJ-seq

**Access:** Publicly available

---

## Data Download Instructions

### AWS S3 (GDC Open Data)
```bash
# List available files
aws s3 ls --no-sign-request s3://gdc-nciccr-phs001444-2-open/

# Download specific file
aws s3 cp --no-sign-request s3://gdc-nciccr-phs001444-2-open/<filename> ./data/GDC/
```

### GEO Data
```bash
# Using wget
wget -r -np -nd https://ftp.ncbi.nlm.nih.gov/geo/series/GSE165nnn/GSE165860/suppl/

# Or use GEOquery in R
library(GEOquery)
gse <- getGEO("GSE165860")
```

### EGA Data (Controlled Access)
1. Register at https://ega-archive.org/
2. Submit Data Access Application
3. Upon approval, download using EGA Download Client:
```bash
java -jar EgaDemoClient.jar -p <dataset_id> -cf <credentials_file>
```

### dbGaP Data (Controlled Access)
1. Register at https://dbgap.ncbi.nlm.nih.gov/
2. Submit Data Access Request
3. Use SRA Toolkit or dbGaP authorized access

---

## Supplementary Tables from Paper

The following tables are available from the Cancer Cell journal website:

| Table | Contents |
|-------|----------|
| S1 | Sample clinical data |
| S2 | Cell type and COO classifications |
| S3 | Subtype signature genes |
| S4 | Subtype signature scores |
| S5 | SignatureDB correlations |
| S6 | Genetic features vs signatures |
| S7 | Gene expression theme definitions |
| S8 | Genetic features vs themes |
| S9 | Tonsil eRegulons |
| S10 | DLBCL eRegulons |

---

## Analysis Tools & Software

| Tool | Version | Purpose | URL |
|------|---------|---------|-----|
| CellRanger ARC | 2.0.0 | scRNA+ATAC processing | 10xgenomics.com |
| CellRanger | 5.0.1 | scRNA-seq processing | 10xgenomics.com |
| Seurat | 4.2.0, 5.1.0 | Single-cell analysis | github.com/satijalab/seurat |
| ArchR | 1.0.3 | scATAC-seq analysis | github.com/GreenleafLab/ArchR |
| inferCNV | 1.11.1 | CNV inference from scRNA | github.com/broadinstitute/infercnv |
| SCENIC+ | - | TF network inference | github.com/aertslab/scenicplus |
| LymphGen | 2.0 | DLBCL genetic subtype classification | llmpp.nih.gov/lymphgen |
| GATK | 4.2.3.0 | Variant calling | github.com/broadinstitute/gatk |

---

## Directory Structure

```
Claude-Project-09/
├── data/
│   ├── raw/
│   │   ├── scRNA-seq/      # 10x scRNA-seq FASTQ/BAM
│   │   ├── scATAC-seq/     # 10x scATAC-seq FASTQ/BAM
│   │   ├── bulk_RNA-seq/   # Bulk RNA-seq data
│   │   └── WES/            # Whole exome sequencing
│   ├── processed/          # Processed matrices, Seurat objects
│   ├── clinical/           # Clinical metadata
│   ├── reference/          # Reference genomes, annotations
│   ├── GEO/               # GEO downloaded data
│   └── GDC/               # GDC portal data
├── scripts/               # Analysis scripts
├── results/              # Analysis outputs
└── DATA_SOURCES.md       # This file
```

---

## Contact & Resources

- **Lead Contact:** Louis M. Staudt (lstaudt@mail.nih.gov)
- **LymphGen Portal:** https://llmpp.nih.gov/lymphgen/
- **GDC DLBCL Data:** https://gdc.cancer.gov/about-data/publications/DLBCL-2018
