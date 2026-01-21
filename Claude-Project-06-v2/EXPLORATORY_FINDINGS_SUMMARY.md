# Exploratory Bioinformatics Analysis of DLBCL Datasets
## Summary of Novel Findings

**Analysis Date**: January 2026
**Analyst**: Eric Perkey with Claude

---

## Overview

Analysis of 6 DLBCL cohorts totaling >4,000 patients with genomic, transcriptomic, and clinical data to identify novel biology and prognostic factors related to germinal center B-cell positioning (egress) pathway.

### Datasets Analyzed

| Cohort | N (Genomic) | N (Expression) | Key Data |
|--------|-------------|----------------|----------|
| Chapuy_Broad | 135 | - | WES, CNAs, Clusters |
| Reddy_Duke | 1,001 | - | Targeted panel, Subtypes |
| Dreval_GAMBL | 969 | - | Mutation data |
| Lacy_HMRN | 928 | 1,311 | 293-gene panel + Microarray |
| Sha_REMoDL-B | - | 928 | Expression, Clinical trial |
| **Total** | **~3,000** | **~2,200** | |

---

## KEY FINDING 1: MHG-Specific Transcriptomic Egress Effect

### Discovery
**High transcriptomic egress (tEgress) specifically predicts poor survival in Molecular High-Grade (MHG) DLBCL**

| Subtype | N | tEgress HR | 95% CI | P-value |
|---------|---|------------|--------|---------|
| **MHG** | 170 | **1.32** | 1.10-1.57 | **0.002** |
| ABC | 345 | 1.12 | 0.97-1.29 | 0.14 |
| GCB | 517 | 0.99 | 0.87-1.13 | 0.88 |
| UNC | 278 | 0.98 | 0.82-1.17 | 0.84 |

### Validation
- **Interaction test significant**: p = 0.04 for tEgress × MHG interaction
- **Quartile analysis**: Q4 (High) vs Q1 (Low) significantly different (log-rank p = 0.005)
- **Effect size**: Combined MHG tEgress HR = 1.35 vs 1.11 in non-MHG

### Biological Interpretation
MHG-DLBCL is already an aggressive subtype with poor prognosis (62.4% mortality vs 50.6% in others). The egress phenotype may facilitate dissemination of these high-grade cells, explaining the particularly poor outcomes when tEgress is high.

---

## KEY FINDING 2: Retention Gene Expression is Protective in MHG

### Individual Gene Effects in MHG Subtype (n=170)

| Gene | Pathway | HR per SD | 95% CI | P-value |
|------|---------|-----------|--------|---------|
| **P2RY8** | Retention | **0.71** | 0.62-0.82 | **<0.00001** |
| **S1PR2** | Retention | **0.73** | 0.63-0.86 | **0.0001** |
| CXCR4 | Egress | 1.13 | 0.93-1.38 | 0.21 |
| FOXO1 | - | 0.91 | 0.77-1.07 | 0.25 |

### Component Score Analysis in MHG
- **Retention score**: HR = 0.76 (p = 0.01) - *protective*
- **Egress score**: HR = 1.13 (p = 0.21) - *trend toward harmful*

### Implication
Therapeutic strategies that enhance retention signaling (S1PR2, P2RY8 agonism) may be particularly beneficial in MHG-DLBCL.

---

## KEY FINDING 3: tEgress Differs by Cell-of-Origin

### Distribution (Lacy Cohort, n=1,310)

| COO | Mean tEgress | SD | ANOVA p |
|-----|--------------|-----|---------|
| MHG | **+0.54** | 1.08 | |
| ABC | +0.36 | 0.92 | **p = 5.2e-35** |
| UNC | -0.08 | 0.99 | |
| GCB | **-0.38** | 1.01 | |

### REMoDL-B Validation (n=928)

| Subtype | Mean tEgress |
|---------|--------------|
| ABC | +0.29 |
| UNC | -0.02 |
| GCB | -0.09 |
| MHG | -0.34 |

*Note: REMoDL-B shows opposite MHG pattern - may reflect different patient selection (clinical trial vs population-based)*

---

## KEY FINDING 4: GNA13 Mutation Clusters with GCB Mutations

### Co-occurring Mutations (Lacy, n=928)

| Gene | OR with GNA13 | FDR | Association |
|------|---------------|-----|-------------|
| PIK3R1 | 11.65 | 0.006 | Co-occurs |
| TLR2 | 6.48 | 0.07 | Co-occurs |
| CIITA | 4.98 | 0.01 | Co-occurs |
| EP300 | 4.05 | 0.01 | Co-occurs |
| EZH2_646 | 3.67 | 0.0006 | Co-occurs |
| MEF2B | 3.43 | 0.009 | Co-occurs |
| TNFRSF14_del | 3.16 | 0.0006 | Co-occurs |
| **MYD88_265** | **0.24** | 0.046 | **Mutually exclusive** |

### Cluster Distribution

| Cluster | GNA13 Rate |
|---------|------------|
| SGK1 | 18.3% |
| BCL2 | 13.5% |
| MYD88 | 2.3% |
| NEC | 2.2% |

### Interpretation
GNA13 mutations define a GCB-derived molecular subset with BCL2, EZH2, and MEF2B co-mutations. The mutual exclusivity with MYD88 suggests distinct pathogenic mechanisms.

---

## KEY FINDING 5: Pathway Gene Expression Predicts Mortality

### Global Mortality Associations (Lacy, n=1,310)

| Gene | Pathway | Direction | FDR |
|------|---------|-----------|-----|
| **S1PR2** | Retention | Low = GOOD | <0.0001 |
| **P2RY8** | Retention | Low = GOOD | <0.0001 |
| **RAC2** | Egress | Low = GOOD | 0.02 |
| RHOA | Retention | Low = GOOD | 0.03 |
| CXCR4 | Egress | High = POOR | 0.10 |

### GCB-Specific Effect
- **RAC2**: Low expression strongly associated with survival in GCB (FDR = 0.03)
- **RHOA**: Low expression protective in GCB (FDR = 0.02)

---

## KEY FINDING 6: Cross-Cohort Meta-Analysis

### Combined Survival Analysis (n=2,024)

| Analysis | HR | 95% CI | P-value |
|----------|-----|--------|---------|
| Any pathway mutation | 0.95 | 0.78-1.15 | 0.61 |
| Egress score ≥2 | 0.53 | 0.25-1.15 | 0.11 |

### Subtype-Specific Effects (Duke, n=1,001)

| Subtype | N | HR | 95% CI | P-value |
|---------|---|-----|--------|---------|
| MCD | 205 | **1.71** | 0.82-3.58 | 0.15 |
| EZB | 328 | 1.13 | 0.71-1.79 | 0.61 |
| Unclassified | 200 | 1.71 | 0.53-5.48 | 0.37 |
| BN2 | 98 | 0.44 | 0.10-1.81 | 0.25 |
| TP53 | 84 | 0.99 | 0.38-2.62 | 0.99 |
| ST2 | 86 | 0.98 | 0.22-4.34 | 0.98 |

### Interpretation
Pathway mutations show **opposite effects by subtype**:
- **MCD (ABC-like)**: Trend toward *worse* survival (HR = 1.71)
- **BN2 (GCB-like)**: Trend toward *better* survival (HR = 0.44)

This suggests the egress pathway has context-dependent effects based on cell-of-origin.

---

## NOVEL HYPOTHESES FOR FUTURE INVESTIGATION

### 1. MHG-Specific Therapeutic Targeting
- S1PR2/P2RY8 agonists may be particularly effective in MHG-DLBCL
- tEgress could serve as a biomarker for patient selection

### 2. COO-Dependent Pathway Effects
- The egress pathway appears protective in GCB-derived lymphomas but potentially harmful in ABC-derived
- Different therapeutic implications by subtype

### 3. GNA13 Mutation as GCB Marker
- Strong co-occurrence with GCB-defining mutations (EZH2, BCL2, MEF2B)
- Potential for GNA13-targeted synthetic lethality in this context

### 4. RAC2 as Novel Prognostic Marker
- Significant mortality association in GCB-DLBCL
- Not previously identified as a key prognostic factor

---

## Limitations

1. **Sample size for rare events**: High egress score (≥2) is rare (~1.5%), limiting power
2. **Different mutation panels**: WES (Chapuy) vs targeted panels (others) affect mutation detection
3. **Transcriptomic platforms**: Different microarray platforms may affect tEgress calculation
4. **Clinical heterogeneity**: Population-based vs clinical trial cohorts may differ

---

## Files Generated

| File | Description |
|------|-------------|
| `global_scripts/exploratory_analysis.R` | Main exploration script |
| `global_scripts/ezb_coo_analysis.R` | EZB/subtype analysis |
| `global_scripts/transcriptomic_analysis.R` | tEgress analysis |
| `global_scripts/mhg_validation.R` | MHG validation |
| `global_scripts/combined_survival_data.csv` | Meta-analysis data |
| `global_scripts/gna13_cooccurrence.csv` | Co-mutation results |
| `global_scripts/subtype_pathway_survival.csv` | Subtype survival |

---

## Conclusions

This exploratory analysis identified several novel findings:

1. **MHG-specific tEgress effect** is the most robust novel finding - high transcriptomic egress specifically predicts poor survival in MHG subtype (p = 0.002)

2. **Retention gene expression (P2RY8, S1PR2) is strongly protective** in MHG, suggesting therapeutic opportunities

3. **COO-dependent pathway effects** - the egress pathway may have opposite prognostic implications in GCB vs ABC subtypes

4. **GNA13 mutations cluster with GCB-defining alterations** and are mutually exclusive with MYD88

These findings warrant further validation and could inform precision medicine approaches in DLBCL.
