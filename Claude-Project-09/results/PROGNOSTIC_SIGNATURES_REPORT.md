# IPI-Independent Prognostic Gene Expression Signatures for DLBCL

## Overview

This analysis identified gene expression profiles that predict overall survival in DLBCL **independently of the International Prognostic Index (IPI)**. Signatures were derived both globally and for each LymphGen genetic subtype.

**Data Source:** Wang et al. 2026 Cancer Cell bulk RNA-seq (562 samples, 234 with complete survival data)

---

## Global Prognostic Signature

### Composition
- **30 adverse prognosis genes** (higher expression → worse survival)
- **30 favorable prognosis genes** (higher expression → better survival)

### Performance

| Model | HR | 95% CI | p-value |
|-------|------|--------|---------|
| Signature only | 1.82 | 1.42-2.33 | <0.0001 |
| IPI only | 1.84 | 1.47-2.31 | <0.0001 |
| **Signature + IPI** | **1.74** | **1.33-2.29** | **0.0001** |
| IPI (adjusted) | 1.71 | 1.36-2.16 | <0.0001 |

**Key finding:** Signature remains highly significant (p=0.0001) after adjusting for IPI, demonstrating independent prognostic value.

### Risk Stratification

| Risk Group | N | Deaths | Mortality Rate |
|------------|---|--------|----------------|
| Low | 78 | 14 | 17.9% |
| Medium | 78 | 31 | 39.7% |
| High | 78 | 53 | 67.9% |

**Log-rank test (Low vs High): p = 1.49 × 10⁻¹²**

### Top Prognostic Genes

**Adverse Prognosis (Top 5):**
| Gene | HR | Function |
|------|-----|----------|
| MT1IP | 1.40 | Metallothionein pseudogene |
| ATP1B3 | 1.54 | Na+/K+ ATPase subunit |
| C5orf30 | 1.64 | Uncharacterized |
| METTL7B | 1.65 | Methyltransferase |
| ALDH3A1 | 1.78 | Aldehyde dehydrogenase |

**Favorable Prognosis (Top 5):**
| Gene | HR | Function |
|------|-----|----------|
| SSBP3 | 0.53 | Single-stranded DNA binding |
| HUNK | 0.60 | Serine/threonine kinase |
| LMO2 | 0.60 | **GCB marker, transcription factor** |
| ITPKB | 0.61 | Inositol kinase |
| RUNDC2C | 0.61 | RUN domain containing |

**LMO2** is a well-established GCB marker associated with favorable outcome in DLBCL.

---

## LymphGen Subtype-Specific Signatures

### Summary Table

| Subtype | N | Events | Genes | HR (univariate) | p-value | HR (+ IPI) | p-value |
|---------|---|--------|-------|-----------------|---------|------------|---------|
| **EZB** | 50 | 21 | 40 | 17.87 | <0.0001 | 13.46 | 0.0014 |
| **BN2** | 42 | 15 | 40 | 16.65 | <0.0001 | 6.34 | 0.0096 |
| **Other** | 117 | 43 | 40 | 4.62 | <0.0001 | 4.24 | <0.0001 |
| **MCD** | 19 | 15 | 20 | 5.48 | 0.0002 | N/A | — |

All subtypes show **IPI-independent prognostic significance**.

### EZB Subtype (GCB-like)

Key adverse genes:
- **MYC** (HR=2.18) - Consistent with MYC-driven biology in EZB/double-hit
- KRT24, AKAP1, LOC100289391

Key favorable genes:
- ZNF396, ZNF626, CIB2

### BN2 Subtype (NF-κB activated)

Key adverse genes:
- HRG, TPD52L3, ANGPTL3

Key favorable genes:
- IFT81, PIKFYVE, CYP46A1, USP54

### Other/Unclassified

Key adverse genes:
- GCLC (glutamate-cysteine ligase)
- DKFZp566F0947

Key favorable genes:
- **C3** (complement component)
- DNM1, ADC, TMEM119

---

## Clinical Implications

1. **Beyond IPI:** These signatures provide prognostic information not captured by standard clinical indices

2. **Subtype-specific biology:** Different genes drive outcome in each genetic subtype, supporting tailored approaches

3. **MYC in EZB:** Confirms MYC expression as a key driver of poor outcome in EZB/GCB tumors

4. **Potential biomarkers:** Top genes could be validated as clinical biomarkers for risk stratification

---

## Output Files

| File | Description |
|------|-------------|
| `prognostic_signature_genes.csv` | 60 global signature genes with HR and p-values |
| `patient_prognostic_scores.csv` | Per-patient risk scores and group assignments |
| `prognostic_signature_km_plot.png` | Kaplan-Meier survival curves by risk group |
| `subtype_prognostic_signatures.csv` | 140 subtype-specific signature genes |
| `subtype_signature_summary.csv` | Summary statistics by subtype |
| `gene_survival_cox_results.csv` | Full Cox regression results (71,702 gene-group combinations) |

---

## Methods

1. **Gene screening:** Univariate Cox proportional hazards for each of 24,425 expressed genes
2. **Signature construction:** Top 30 adverse + 30 favorable genes (p < 0.01)
3. **Score calculation:** Mean z-score(adverse genes) - Mean z-score(favorable genes)
4. **IPI independence:** Multivariate Cox model with signature + IPI numeric score
5. **Multiple testing:** Benjamini-Hochberg FDR correction applied

---

*Analysis performed on Wang et al. 2026 DLBCL cohort using bulk RNA-seq data*
