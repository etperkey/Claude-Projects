# DLBCL Oncoprint Fusion Data Investigation Report

**Date**: 2026-02-03  
**Project**: 05-bcl-oncoprint (DLBCL Cell Line Oncoprint)

## Issue 1: Double-Hit Lymphomas Missing from Dataset

### Background
Double-hit lymphomas (DHLs) have **two simultaneous translocations** involving **MYC and either BCL2 or BCL6**. 
Known double-hit cell lines include: OCI-LY-18, SU-DHL-10, DOHH-2, VAL, Toledo

### Findings

| Cell Line | DepMap ID | MYC-IGH | BCL2-IGH | BCL6-IGH | Status |
|-----------|-----------|---------|----------|----------|--------|
| OCI-LY-18 | — | — | — | — | NOT IN DATASET |
| SU-DHL-10 | ACH-000271 | ✗ | ✗ | ✗ | MISSING BOTH HITS |
| DOHH-2 | ACH-000056 | ✗ | ✓ | ✗ | MISSING MYC |
| VAL | ACH-001703 | ✗ | ✓ | ✗ | MISSING MYC |
| Toledo | ACH-000285 | ✗ | ✗ | ✗ | NO FUSION DATA |

### Root Cause

1. **OCI-LY-18**: Cell line name not found in DepMap RNA-seq file
2. **SU-DHL-10, Toledo**: No fusion data in RNA-seq OR curated sources
3. **DOHH-2, VAL**: BCL2-IGH detected but MYC-IGH missing (RNA-seq caller limitation on 3' UTR breaks)

### Missing Curated Fusions

Need to add to `CURATED_FUSIONS` in `scripts/build_fusions.py`:

```python
{"names": ["OCI-LY-18"],  "gene": "MYC",  "event": "t(8;14)(q24;q32)", "partner": "IGH", "source": "DSMZ"},
{"names": ["SU-DHL-10"],  "gene": "BCL2", "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
{"names": ["SU-DHL-10"],  "gene": "MYC",  "event": "t(8;14)(q24;q32)", "partner": "IGH", "source": "DSMZ"},
{"names": ["Toledo"],     "gene": "BCL2", "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
{"names": ["Toledo"],     "gene": "MYC",  "event": "t(8;14)(q24;q32)", "partner": "IGH", "source": "DSMZ"},
{"names": ["DOHH-2"],     "gene": "MYC",  "event": "t(8;14)(q24;q32)", "partner": "IGH", "source": "DSMZ"},
{"names": ["VAL"],        "gene": "MYC",  "event": "t(8;14)(q24;q32)", "partner": "IGH", "source": "DSMZ"},
```

---

## Issue 2: Non-IG Fusions in Dataset

### Summary

17 of 19 non-IG structural fusions have at least one gene on the oncoprint panels.

### High-Priority: BOTH genes on panel (5 types)

- BACH2--BCL2L1 (BLUE-1): 840 junction reads, high confidence
- CCND1--CCND2 (JeKo-1): MCL with CCND1 amplification signature
- CIITA--EBF1 (SU-DHL-4): GCB-associated rearrangement
- MYD88--MT-ND5 (SU-DHL-5): Unusual mitochondrial fusion
- CCND2--CCND1 (JeKo-1): Reciprocal to above

### Medium-Priority: ONE gene on panel (12 types)

- AC008012.1--CCND1 (JeKo-1): CCND1 partner
- ARID4B--BCL6 (SU-DHL-4): BCL6 partner
- BCL6--RHOH / RHOH--BCL6 (VAL): Reciprocal BCL6 fusion
- CCND1--MT-ND1 (JeKo-1, REC-1): CCND1 in MCL
- CCND1--RPS28 (JeKo-1): CCND1 partner
- PRDM1--HBS1L (OCI-LY3): PRDM1 partner
- PRDM1--KIF14 (BC-2): PRDM1 in PEL
- RPL17--MYC (DOGKIT): MYC partner in Burkitt
- SPAG5--PAX5 (WSU-DLCL2): PAX5 partner
- TNIP1--CIITA (SU-DHL-4): CIITA partner
- TP53--SOX5 (Pfeiffer): TP53 partner

### Current Implementation: CORRECT

The OncoprintGrid.js logic (lines 282-301) properly marks non-IG fusions:
- When a cell has a non-IG fusion and a relevant gene is selected, the cell is colored red
- When the fusion occurs between two genes BOTH on the panel, both light up

This is working as designed. No changes needed.

---

## Recommendations

### Critical (Fix Double-Hit Data)

1. Update `scripts/build_fusions.py` with 7 missing MYC translocations
2. Rebuild fusions.json: `python scripts/build_fusions.py`
3. Reference: DSMZ cell line database, Drexler HG et al. (2001), Quentmeier H et al. (2019)

### Optional Enhancement

- Add "Fusion Indicators" panel showing all translocations for selected cell line
- Improves discovery of non-IG structural variants even when fusion partners aren't selected

---

## Data Quality Metrics

- Total cell lines: 80
- With fusions: 64 (80%)
- IG-partner translocations: 127
- Non-IG structural fusions: 19
- Known DHL lines in dataset: 3/5 (60%)
- Missing MYC hits: 4

