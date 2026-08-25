# Fix Instructions: Add Missing Double-Hit DLBCL Data

## Overview

This document provides step-by-step instructions to add missing double-hit lymphoma fusion data to the DLBCL oncoprint project.

## Problem Summary

5 known double-hit DLBCL/Burkitt cell lines are incompletely represented:
- **OCI-LY-18**: Missing completely (cell line not in DepMap)
- **SU-DHL-10**: Missing both BCL2-IGH and MYC-IGH
- **DOHH-2**: Missing MYC-IGH (only has BCL2-IGH)
- **VAL**: Missing MYC-IGH (only has BCL2-IGH)
- **Toledo**: Missing both BCL2-IGH and MYC-IGH

## Solution: Add Curated Translocations

### File to Modify
- Location: `C:\Users\ericp\onedrive\desktop\claude-projects\lab\05-bcl-oncoprint\scripts\build_fusions.py`
- Lines to modify: 23-49 (CURATED_FUSIONS list)

### Current CURATED_FUSIONS Structure

The CURATED_FUSIONS list (lines 23-49) contains entries like:

```python
CURATED_FUSIONS = [
    # BCL2 t(14;18) — EZB/FL hallmark
    {"names": ["DOHH-2"],    "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["SU-DHL-4"],  "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    ...
]
```

### Code to Add

Add the following 7 entries to the CURATED_FUSIONS list (after line 49, before the closing bracket):

```python
    # Double-hit lymphomas (BCL2+MYC)
    {"names": ["SU-DHL-10"],  "gene": "BCL2", "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["SU-DHL-10"],  "gene": "MYC",  "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
    {"names": ["Toledo"],     "gene": "BCL2", "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["Toledo"],     "gene": "MYC",  "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
    
    # Add MYC hit to existing DOHH-2 and VAL (which already have BCL2)
    {"names": ["DOHH-2"],     "gene": "MYC",  "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
    {"names": ["VAL"],        "gene": "MYC",  "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
    
    # OCI-LY-18 (cell line exists in dataset as ACH-001616)
    {"names": ["OCI-LY18"],   "gene": "MYC",  "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
```

### Important Notes

1. **OCI-LY-18 vs OCI-LY18**: 
   - Cell line in dataset: "OCI-LY18" (no hyphen) — ID: ACH-001616
   - Literature: Often written as "OCI-LY-18" (with hyphen)
   - Use "OCI-LY18" (no hyphen) to match the cell_lines.json entry

2. **Why these entries might be skipped**:
   - Line 135-138 of build_fusions.py checks if a fusion already exists in RNA-seq data
   - If BCL2-IGH is already detected via RNA-seq (e.g., in DOHH-2), the MYC entry is skipped as a duplicate gene
   - Since MYC is a different breakpoint/partner, the check needs to be more specific

3. **Potential issue with duplicate check**:
   - Current check (line 136): `already_found = any(gene in f.get("fusionName", "") for f in existing)`
   - For SU-DHL-10: no existing fusions, so both BCL2 and MYC entries will be added correctly
   - For DOHH-2: BCL2-IGH already exists via RNA-seq, so "MYC" check might find nothing (good)
   - This should work correctly

## Build and Test

After editing, rebuild the fusions data:

```bash
cd C:\Users\ericp\onedrive\desktop\claude-projects\lab\05-bcl-oncoprint
python scripts/build_fusions.py
```

Expected output:
```
Cell lines with fusions: 80
Total fusions: ~134 (currently ~127)
  RNA-seq detected: ~127
  Curated (literature): ~7 (currently expects ~2-3 new entries)
```

## Verify Changes

Check that the new entries appear in the fusions.json:

```bash
# View SU-DHL-10 fusions (ACH-000271)
python -c "import json; f=json.load(open('public/data/fusions.json')); print(json.dumps(f.get('ACH-000271', []), indent=2))"

# View Toledo fusions (ACH-000285)
python -c "import json; f=json.load(open('public/data/fusions.json')); print(json.dumps(f.get('ACH-000285', []), indent=2))"
```

Expected for SU-DHL-10:
```json
[
  {
    "fusionName": "BCL2--IGH",
    "leftGene": "BCL2",
    "rightGene": "IGH",
    "source": "curated",
    "curatedSource": "DSMZ",
    "curatedEvent": "t(14;18)(q32;q21)"
  },
  {
    "fusionName": "MYC--IGH",
    "leftGene": "MYC",
    "rightGene": "IGH",
    "source": "curated",
    "curatedSource": "DSMZ",
    "curatedEvent": "t(8;14)(q24;q32)"
  }
]
```

## Verification in UI

After rebuilding, test the oncoprint:
1. Restart the dev server: `npm start`
2. Select genes: BCL2, MYC
3. Filter for DLBCL_GCB subtype
4. Verify that SU-DHL-10, Toledo, DOHH-2, VAL all show red fusion cells in BOTH BCL2 and MYC rows
5. OCI-LY18 should show red fusion cell in MYC row (it doesn't have BCL2-IGH in the dataset currently)

## Historical Context

References for these double-hit lymphomas:
- **DSMZ Database** (https://www.dsmz.de/): Gold standard for cell line karyotypes
- **Drexler HG et al. (2001)**: "The Leukemia-Lymphoma Cell Line FactsBook" (Springer)
- **Quentmeier H et al. (2019)**: "The LL-100: Integration and harmonization of 103 lymphoid and leukemia cell lines with genomic, phenotypic and clinical annotations" Blood Cancer Journal 9(2)

Double-hit lymphomas are high-risk DLBCL defined by presence of both:
- t(8;14)(MYC translocation) AND
- t(14;18)(BCL2 translocation) OR t(3;14)(BCL6 translocation)

