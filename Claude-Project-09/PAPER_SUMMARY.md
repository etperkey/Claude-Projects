# Wang et al. 2026: Key Findings That Update Bulk RNA-seq Studies

## Paper Overview
**Title:** Axes of biological variation in diffuse large B cell lymphoma
**Authors:** Wang, Wright, Enssle et al. (Staudt Lab, NCI)
**Journal:** Cancer Cell 44, 1-19 (March 2026)

This single-cell multiomics study of 103 DLBCL biopsies significantly advances understanding from bulk studies (Chapuy et al. 2018, Schmitz/NCI 2018).

---

## Key Updates to Prior Bulk RNA-seq Knowledge

### 1. Genetic Subtypes Have DISTINCT Phenotypes (Not Just Genetic Variants)

**Prior understanding (Schmitz 2018, Chapuy 2018):**
- LymphGen subtypes (MCD, BN2, N1, A53, EZB, ST2) defined by genetic lesions
- Unclear if subtypes were phenotypically distinct or just "different genetic routes to similar endpoints"

**New finding:**
- Each genetic subtype has a **characteristic gene expression signature** validated across 3 cohorts
- ROC analysis shows signatures can distinguish subtypes (AUC 0.68-0.93)
- Subtypes represent **distinct biological entities**, not just genetic variants
- Subtype signatures can classify "unassigned" tumors that LymphGen cannot genotype

**Clinical implication:** Gene expression signatures could enable rapid molecular diagnosis when genetic data is incomplete.

---

### 2. Intratumoral Subclonal Heterogeneity is the RULE, Not Exception

**Prior understanding:**
- DLBCL assumed to be largely monoclonal
- Bulk RNA-seq averages signal across all cells

**New finding:**
- **79% of tumors contain multiple genetic subclones** (2-5 per tumor)
- Subclones defined by distinct CNV patterns (aneuploidy)
- Subclones are **phenotypically distinct** - express different biological themes
- Even within a single tumor, subclones may occupy different differentiation states

**Implications:**
- Bulk RNA-seq masks this heterogeneity
- Treatment resistance may arise from pre-existing subclonal diversity
- Future trials should assess if therapy selects for specific subclones

---

### 3. Six "Gene Expression Themes" Capture Biological Variation

**Prior understanding:**
- Ecotyper identified 5 B cell "states" (Steen et al. 2021)
- Cell-of-origin (COO) was primary phenotypic axis

**New finding - Six independent themes:**

| Theme | Key Genes | Biological Meaning |
|-------|-----------|-------------------|
| **GC B cell** | MME (CD10), LRMP, MYBL1, NR3C1 | Germinal center phenotype |
| **Memory B cell** | CCR6, S1PR1, KLF2, SIGLEC6 | Memory B cell differentiation |
| **Plasma cell** | PRDM1, IRF4 targets, XBP1 targets | Plasmacytic differentiation |
| **Pan-B cell** | PAX5, MS4A1, CD22 | General B cell identity |
| **Cell cycle** | Proliferation genes | Active division |
| **Cell growth** | ENO1, PGAM1, LDHA, MYC targets | Metabolic/anabolic state |

**Critical distinction:**
- **Cell growth theme** (NOT cell cycle) associated with **adverse survival**
- This explains the historical "Proliferation signature" confusion
- Cell growth theme is MYC-driven metabolic state

---

### 4. REL Amplification Blocks Memory B Cell Differentiation

**Prior understanding:**
- REL amplification occurs in 20-25% of GCB tumors
- Function was unclear

**New finding:**
- REL amplification **suppresses memory B cell theme expression**
- REL-amplified GCB cell lines are **highly sensitive to REL inhibition**
- IκB super-repressor kills REL-amplified cells and induces memory B cell genes
- Mechanism: REL promotes metabolic state antagonistic to quiescent memory phenotype

**Therapeutic implication:** REL-amplified GCB tumors may be targetable.

---

### 5. Genetic Subtypes Map to Normal B Cell Differentiation States

**Prior understanding:**
- Subtypes had distinct genetic lesions
- Relationship to normal B cell biology unclear

**New finding - Regulatory network mapping:**

| Subtype | Differentiation State | Key TF Networks |
|---------|----------------------|-----------------|
| **EZB, ST2** | GC B cell | MEF2B/MEF2C, IRF8, FOXO1 |
| **MCD, A53, BN2** | Plasmacytic | IRF4, BATF, SPIB, PRDM1, TCF4 |
| **N1** | Memory B cell | BACH2, STAT1, KLF2 |

**Key insight:** Genetic subtypes adopt phenotypes of B cells at different differentiation stages, explaining why:
- MCD/A53/BN2 use autoreactive BCRs → IRF4 upregulation → plasmacytic program
- N1 expresses CD11C, CXCR4, T-bet (atypical/age-associated memory B cells)
- PRDM1 inactivation in ABC blocks terminal plasmacytic differentiation

---

### 6. TME Differs Significantly by Genetic Subtype

**Prior understanding:**
- TME composition varied but not systematically characterized by subtype

**New finding:**

| Subtype | TME Enrichment | TME Depletion |
|---------|---------------|---------------|
| **EZB-DH** | Least T cells | — |
| **EZB-nonDH** | TFH, Treg CM2 | — |
| **MCD** | Angio-Mac (VEGF, SPP1) | T cells |
| **N1** | IFN-Mac (PD-L1), LA-Mac, Stromal | — |

**CD8+ T cells in MCD show highest exhaustion signature** - consistent with immune editing.

---

### 7. CDKN2A Deletion Drives Cell Cycle Theme

**Prior understanding:**
- CDKN2A deletion frequent in MCD
- Known tumor suppressor

**New finding:**
- CDKN2A deletion strongly associated with high **cell cycle theme** (p < 10⁻⁹)
- Confirmed at subclone level - deleted subclones proliferate more
- Explains why MCD has high cell cycle signature

---

### 8. TBL1XR1 and ETV6 as Tumor Suppressors

**Prior understanding:**
- TBL1XR1 and ETV6 mutated in N1 and MCD (>1/3 of cases)
- Function unclear

**New finding:**
- Both associate with NCOR/SMRT co-repressor complex
- TBL1XR1⁻/⁺ and ETV6⁻/⁺ eRegulons lower in N1/MCD
- Inactivation promotes malignant phenotype
- TBL1XR1 normally blocks memory B cell differentiation

---

## Comparison: What Single-Cell Adds Beyond Bulk

| Aspect | Bulk RNA-seq (Chapuy/Schmitz) | Single-Cell (Wang et al.) |
|--------|------------------------------|---------------------------|
| Subtype definition | Genetic lesions | Genetic + phenotypic signatures |
| Heterogeneity | Averaged signal | 79% have 2-5 subclones |
| Cell states | COO (ABC/GCB) | 6 biological themes |
| TME analysis | Limited | 12 T cell + 6 innate/stromal types |
| Regulatory networks | Inferred | Directly measured (scATAC-seq) |
| Survival associations | Proliferation signature | Cell GROWTH (not cycle) predicts outcome |

---

## Clinical Translation Potential

1. **Subtype signatures** can classify tumors LymphGen cannot assign genetically
2. **Cell growth theme** may predict R-CHOP resistance better than proliferation markers
3. **REL amplification** identifies targetable vulnerability in GCB tumors
4. **Memory B cell phenotype** (N1) predicts ibrutinib sensitivity
5. **Subclonal heterogeneity** should inform treatment strategies

---

## Data Resources

- **Primary data:** EGA EGAS50000001227 (controlled access)
- **Validation cohort:** dbGaP phs001444 / GDC portal
- **LymphGen tool:** https://llmpp.nih.gov/lymphgen/
- **Supplementary Tables S1-S10:** Clinical data, signatures, eRegulons

---

*Summary prepared from Wang et al. Cancer Cell 2026*
