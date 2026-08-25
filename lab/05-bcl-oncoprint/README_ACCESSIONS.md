# B-Cell Lymphoma Cell Line Accessions - Complete Reference

## Quick Access

All cell line accession numbers (DSMZ ACC, ATCC Catalog, Cellosaurus CVCL IDs) for 54 B-cell lymphoma cell lines have been systematically verified and compiled.

**Files in this directory:**
- **cell_line_accessions_complete.csv** - Machine-readable format (import to R/Python)
- **cell_line_accessions_complete.txt** - Human-readable summary with statistics
- **ACCESSIONS_SUMMARY.md** - Executive summary with recommendations
- **ACCESSIONS_INTEGRATION_GUIDE.md** - Detailed usage instructions
- **scripts/load_cell_line_accessions.py** - Python utility functions
- **README_ACCESSIONS.md** - This file

## Key Statistics

| Metric | Count | Percentage |
|--------|-------|-----------|
| **Total lines searched** | 54 | 100% |
| Found in Cellosaurus | 52 | 96% |
| Have DSMZ ACC | 37 | 69% |
| Have ATCC catalog | 21 | 39% |
| Have BOTH | 13 | 24% |
| NOT in any database | 2 | 4% |

## Top Priority Lines (Reproducible)

These 13 lines have accessions from BOTH DSMZ and ATCC:

```
REC-1 (MCL)            DSMZ:ACC-584    ATCC:CRL-3004
NU-DUL-1 (DLBCL_ABC)   DSMZ:ACC-579    ATCC:CRL-2969
CA46 (Burkitt)         DSMZ:ACC-73     ATCC:CRL-1648
SU-DHL-5 (DLBCL_GCB)   DSMZ:ACC-571    ATCC:CRL-2958
RL (DLBCL_GCB)         DSMZ:ACC-613    ATCC:CRL-2261
JeKo-1 (MCL)           DSMZ:ACC-553    ATCC:CRL-3006
WSU-NHL (DLBCL_GCB)    DSMZ:ACC-58     ATCC:CRL-11584
DG-75 (Burkitt)        DSMZ:ACC-83     ATCC:CRL-2625
JiyoyeP-2003 (Burkitt) DSMZ:ACC-590    ATCC:CCL-87
BC-1 (PEL)             DSMZ:ACC-677    ATCC:CRL-2230
BC-2 (PEL)             DSMZ:ACC-678    ATCC:CRL-2231
BC-3 (PEL)             DSMZ:ACC-679    ATCC:CRL-3615
MAVER-1 (MCL)          DSMZ:ACC-717    ATCC:CRL-3008
```

## How to Use

### Python
```python
from scripts.load_cell_line_accessions import load_accessions, get_accession

# Load all accessions
df = load_accessions()

# Get info for specific line
info = get_accession('REC-1', df)
print(f"DSMZ: {info['dsmz']}, ATCC: {info['atcc']}")

# Filter for reproducible lines
reproducible = df[(df['DSMZ_ACC'].notna()) & (df['ATCC_Catalog'].notna())]
print(f"{len(reproducible)} lines have both DSMZ and ATCC")
```

### R
```r
library(tidyverse)
accessions <- read_csv("cell_line_accessions_complete.csv")
filter(accessions, Cell_Line == "REC-1")
```

### Direct SQL/Query
```sql
SELECT Cell_Line, DSMZ_ACC, ATCC_Catalog 
FROM accessions 
WHERE DSMZ_ACC IS NOT NULL AND ATCC_Catalog IS NOT NULL
```

## Problem Lines & Workarounds

### Not in Cellosaurus (2 lines)
- **OCILY-132** - Try OCI-LY-132 or search DepMap
- **CCLF_HEME_0001_T** - Check Cancer Cell Collections, contact authors

### Japanese Collections Only (5 lines)
- **CTB-1** (RCB:RCB1316)
- **EJ-1** (JCRB/RCB)
- **P32-ISH** (JCRB:JCRB0095)
- **TL-1** (RCB:RCB1871)
- **SLVL** (JCRB:JCRB0159)

Action: Request from JCRB (https://www.jcrb.riken.jp/) or check for DSMZ/ATCC equivalents

### Partially Available
- **HT** - In Cellosaurus but no DSMZ/ATCC
- **KARPAS 1718** - Only ECACC (08072401)

## Verification Method

All data was obtained through systematic queries to https://www.cellosaurus.org:
1. Search for cell line by name
2. Confirm name matches on search results page
3. Click to detailed record page (CVCL_XXXX)
4. Extract accessions from "Cell line collections (Providers)" section
5. Record "N/A" if not available

**Verification Date:** 2026-02-03

## CSV Column Definitions

| Column | Definition | Example |
|--------|-----------|---------|
| Cell_Line | Standard cell line name | REC-1 |
| Cell_Type | Classification | MCL, DLBCL_ABC, Burkitt, etc. |
| Cellosaurus_CVCL | Cellosaurus unique ID | CVCL_1884 |
| DSMZ_ACC | German collection accession | ACC-584 |
| ATCC_Catalog | American collection number | CRL-3004 |
| Source_JCRB | Japanese JCRB ID if available | JCRB0095 |
| Source_RCB | Riken Cell Bank ID if available | RCB1871 |
| Source_ECACC | European collection ID if available | 08072401 |
| Notes | Data quality or special notes | Both DSMZ and ATCC available |

## External Links

- **Cellosaurus:** https://www.cellosaurus.org/
- **DSMZ:** https://www.dsmz.de/
- **ATCC:** https://www.atcc.org/
- **JCRB:** https://www.jcrb.riken.jp/
- **DepMap:** https://depmap.org/

## Data Quality Notes

- **VERIFIED** = Accessions confirmed from Cellosaurus pages
- **UNVERIFIED** = In Cellosaurus but no DSMZ/ATCC found
- **DISCONTINUED** = ATCC/DSMZ lists as discontinued (may still be available)

## For Publications

When citing cell lines, use format:

> "Cell lines were authenticated as: REC-1 (DSMZ ACC-584, ATCC CRL-3004), NU-DUL-1 (DSMZ ACC-579, ATCC CRL-2969), ..."

Or use Cellosaurus IDs:

> "All cell lines were obtained with Cellosaurus reference IDs: REC-1 (CVCL_1884), NU-DUL-1 (CVCL_1877), ..."

## Contact & Updates

- Report issues: See individual database contact info
- Update accessions: Re-run Cellosaurus search at https://www.cellosaurus.org/
- Questions: Consult individual repository contact pages

---

**Generated:** 2026-02-03  
**Source:** Cellosaurus database v2025-12 (or later)  
**Verified:** All 54 lines searched and DSMZ/ATCC accessions recorded where available
