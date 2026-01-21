# Content to Paste into CNGB Form Fields

Copy each section below into the corresponding field in the Word document.

---

## A. Project Title

```
Integrated Genomic and Transcriptomic Analysis of Follicular Lymphoma for Identification of Prognostic Biomarkers and Therapeutic Targets
```

---

## B. Data Requirement

**CNSA Project ID, Dataset, Data path:**
```
CNP0002472 - Whole Exome Sequencing (WES) data, 149 FL patient samples
CNP0002473 - RNA-seq Transcriptome data, 63 FL patient samples
```

**Statement of needs:**
```
We require access to paired genomic and transcriptomic data to conduct integrated multi-omics analysis of follicular lymphoma. This dataset uniquely provides WES and RNA-seq across FL histologic grades (FL1-2, FL3A, FL3B, FL/DLBCL), enabling investigation of genotype-phenotype relationships and identification of grade-specific molecular features associated with clinical outcomes.
```

---

## C. Lay Summary of the Project

```
Follicular lymphoma (FL) is the most common indolent B-cell non-Hodgkin lymphoma. Despite treatment advances, clinical outcomes remain highly variable, with some patients experiencing early progression or transformation. Current prognostic tools have limited precision in predicting individual outcomes.

RESEARCH PURPOSE:
This project aims to identify molecular biomarkers predicting clinical outcomes by integrating whole exome sequencing with transcriptomic profiling. We will:
1. Characterize mutational landscapes across FL histologic grades
2. Correlate somatic mutations with gene expression programs
3. Develop integrated genomic-transcriptomic prognostic signatures
4. Validate findings against independent FL cohorts with outcome data

RESEARCH PLAN:
- Months 1-3: Data preprocessing and quality control
- Months 4-6: Mutation calling and differential expression analysis
- Months 7-9: Multi-omics integration and biomarker development
- Months 10-12: Validation and manuscript preparation

RESEARCH CYCLE: 12 months
```

---

## D. Lay Data Utilization Plan

**How data will be used:**
```
WES data will be processed through somatic mutation calling pipelines (Mutect2, Strelka2) to identify variants. Mutation frequencies will be compared across FL grades. RNA-seq data will undergo differential expression analysis (DESeq2) and pathway enrichment (GSEA). Integration will use Multi-Omics Factor Analysis (MOFA) to link mutations with expression changes. Results will be validated against public datasets (GSE119214, GSE16131).
```

**Cloud computing plan:**
```
Data will be stored on institutional high-performance computing clusters with encryption and access controls. No external cloud services will be used for raw data. All analysis will occur within secure institutional infrastructure.
```

**Post-project data management:**
```
Upon project completion, raw sequencing data will be securely deleted. Only derived summary statistics and publication-ready results will be retained. Data destruction documentation will be provided upon request.
```

**Submit output to CNGBdb:** YES ✓

---

## E. Background of PI/Institution

```
[YOUR INSTITUTION] is a research institution with expertise in cancer genomics. The institution maintains secure computing infrastructure compliant with data protection requirements, including encrypted storage and access logging.

The Principal Investigator has experience in computational biology and cancer genomics research, with specific expertise in lymphoma molecular profiling. The laboratory maintains established protocols for handling controlled genomic data, with mandatory training for all personnel.
```

---

## F. External Collaborators

```
Personnel with data access:
1. [YOUR NAME] - Principal Investigator
2. [Add lab members as needed]

Foreign collaborators/funders: NO
```

---

## G. Ethics

Select: **DOES NOT** require ethics review

```
This is secondary analysis of existing de-identified genomic data. Per institutional policy, retrospective analysis of publicly deposited de-identified data does not require IRB review.
```

(If your institution DOES require IRB review for any data analysis, select DOES and attach approval)

---

## Tips for Approval

1. **Be specific** about data use - they want to know exactly what analyses you'll run
2. **Cite the original paper** (PMID: 40234612) to show you understand the data
3. **Emphasize data security** - institutional computing, no cloud, deletion plan
4. **Offer to contribute back** - agree to deposit derived data to CNGBdb
5. **Keep it academic** - non-commercial research purpose
6. **Get institutional sign-off** - the representative signature is required
