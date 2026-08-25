# Cell Line Accessions Integration Guide

## Overview

This guide documents the complete collection of DSMZ ACC numbers, Cellosaurus CVCL IDs, and ATCC catalog numbers for 54 B-cell lymphoma cell lines. All accessions were verified through direct queries to https://www.cellosaurus.org on 2026-02-03.

## Files Generated

- **cell_line_accessions_complete.csv** - Machine-readable accessions table
- **cell_line_accessions_complete.txt** - Human-readable summary with statistics
- **scripts/load_cell_line_accessions.py** - Python utility for programmatic access

## Quick Summary

| Category | Count | Examples |
|----------|-------|----------|
| Both DSMZ + ATCC | 13 | REC-1, CA46, RL, BC-1, BC-2, BC-3 |
| DSMZ only | 24 | GRANTA-519, OCI-LY3, BL-41, BJAB, BL-2 |
| ATCC only | 8 | Toledo, ST486, BCP-1, P3HR-1, EB-3 |
| Japanese collections only | 5 | CTB-1, EJ-1, P32-ISH, TL-1, SLVL |
| Not in Cellosaurus | 2 | OCILY-132, CCLF_HEME_0001_T |
| Other (ECACC, partial data) | 2 | KARPAS 1718, HT |

## Top Priority Lines (Best Availability)

These lines have accessions from BOTH DSMZ and ATCC, making them highly reproducible:

```
REC-1 (MCL)           DSMZ: ACC-584      ATCC: CRL-3004
NU-DUL-1 (DLBCL_ABC)  DSMZ: ACC-579      ATCC: CRL-2969
CA46 (Burkitt)        DSMZ: ACC-73       ATCC: CRL-1648
SU-DHL-5 (DLBCL_GCB)  DSMZ: ACC-571      ATCC: CRL-2958
RL (DLBCL_GCB)        DSMZ: ACC-613      ATCC: CRL-2261
JeKo-1 (MCL)          DSMZ: ACC-553      ATCC: CRL-3006
WSU-NHL (DLBCL_GCB)   DSMZ: ACC-58       ATCC: CRL-11584
DG-75 (Burkitt)       DSMZ: ACC-83       ATCC: CRL-2625
JiyoyeP-2003 (Burkitt) DSMZ: ACC-590     ATCC: CCL-87
BC-1 (PEL)            DSMZ: ACC-677      ATCC: CRL-2230
BC-2 (PEL)            DSMZ: ACC-678      ATCC: CRL-2231
BC-3 (PEL)            DSMZ: ACC-679      ATCC: CRL-3615
MAVER-1 (MCL)         DSMZ: ACC-717      ATCC: CRL-3008
```

## Using in Python

```python
from scripts.load_cell_line_accessions import load_accessions, get_accession

# Load all accessions
df = load_accessions()

# Get info for a specific line
info = get_accession('REC-1', df)
print(f"DSMZ: {info['dsmz']}")
print(f"ATCC: {info['atcc']}")
print(f"Cellosaurus: {info['cvcl']}")

# Filter by availability
complete = df[(df['DSMZ_ACC'].notna()) & (df['ATCC_Catalog'].notna())]
print(f"Lines with both DSMZ and ATCC: {len(complete)}")
```

## Using in R

```r
library(tidyverse)

# Load accessions
accessions <- read_csv("cell_line_accessions_complete.csv")

# Get specific line
rec1 <- filter(accessions, Cell_Line == "REC-1")

# Filter for reproducible lines
reproducible <- accessions %>%
  filter(!is.na(DSMZ_ACC) & !is.na(ATCC_Catalog))
```

## Troubleshooting Problematic Lines

### Not in Cellosaurus (2 lines)

**OCILY-132** and **CCLF_HEME_0001_T** do not appear in the Cellosaurus database.

Recommended actions:
1. Check original publication for alternate names
2. Search Cancer Cell Collections (cancercelllines.org)
3. Try alternative spellings (OCI-LY-132, CCLF-HEME-0001-T, etc.)
4. Contact original authors for accession info

### Japanese Collections Only (5 lines)

**CTB-1, EJ-1, P32-ISH, TL-1, SLVL** are maintained primarily by:
- **JCRB** (Japanese Collection of Research Bioresources)
- **RCB** (Riken Cell Bank)

Actions:
1. Check if DSMZ/ATCC have them under different names
2. Request from JCRB: https://www.jcrb.riken.jp/
3. Contact ATCC for equivalents

### Partial Data

**KARPAS 1718** - Only ECACC (08072401) available in Cellosaurus
**HT** - No DSMZ/ATCC in Cellosaurus

## Cellosaurus URLs for Reference

All cell lines can be looked up at:
```
https://www.cellosaurus.org/search?input={cell_line_name}
https://www.cellosaurus.org/{CVCL_ID}
```

Example:
```
https://www.cellosaurus.org/CVCL_1884  # REC-1
https://www.cellosaurus.org/CVCL_1079  # BC-1
```

## Verification Method

All accessions were retrieved via systematic web queries to Cellosaurus:

1. Search page: `https://www.cellosaurus.org/search?input={cell_line_name}`
2. Confirm cell line name matches exactly
3. Fetch detailed page: `https://www.cellosaurus.org/{CVCL_ID}`
4. Extract DSMZ ACC and ATCC catalog numbers from Cross-references section
5. Record "UNVERIFIED" if cell line name or accessions could not be confirmed

## Data Quality Notes

- **VERIFIED**: Cell line name and accessions confirmed via Cellosaurus
- **UNVERIFIED**: Cell line in Cellosaurus but no DSMZ/ATCC accessions found
- **NOT IN CELLOSAURUS**: Search returned 0 hits
- **Discontinued**: ATCC listing shows discontinued status (e.g., CRL-2769, JSC-1)

## Contact Information

- **Cellosaurus**: https://www.cellosaurus.org/
- **DSMZ**: https://www.dsmz.de/
- **ATCC**: https://www.atcc.org/
- **JCRB**: https://www.jcrb.riken.jp/

## Last Updated

2026-02-03 (All accessions verified)

## File Locations

```
05-bcl-oncoprint/  (relative to lab/)
├── cell_line_accessions_complete.csv          (Machine-readable)
├── cell_line_accessions_complete.txt          (Human-readable)
├── scripts/
│   └── load_cell_line_accessions.py           (Python utility)
└── ACCESSIONS_INTEGRATION_GUIDE.md            (This file)
```

