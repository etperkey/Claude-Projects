# Dreval GAMBL Reanalysis

## Overview

Reanalysis of Duke/Reddy et al. (2017) DLBCL data using the GAMBL consortium's mutation calling pipeline.

## Source Paper

**Title:** "Revisiting Reddy: A DLBCL Do-over"

**Authors:** Kostiantyn Dreval, Manuela Cruz, Christopher Rushton, Nina Liuta, Houman Layegh Mirhosseini, Callum Brown, Ryan D. Morin, and the GAMBL consortium

**bioRxiv:** https://www.biorxiv.org/content/10.1101/2023.11.21.567983v1

## Key Findings

The Dreval et al. reanalysis discovered:
- Thousands of mutations that could not be independently reproduced from the original Reddy study
- A larger set of high-quality mutations not originally reported
- Artificial underrepresentation of mutations in clinically relevant genes (*EZH2*, *CD79B*)
- New associations between mutations (*TP53*, *KMT2D*, *PIM1*) and patient outcomes

## Data Resources

- **IGV Reports:** https://www.bcgsc.ca/downloads/morinlab/GAMBL/Reddy/igv_reports/
- Contains 700+ individual sample reports comparing GAMBL vs Reddy variant calls
- Columns: GAMBL-only | Intersect | Reddy-only

## Original Study Reference

Reddy A, et al. (2017). Genetic and Functional Drivers of Diffuse Large B Cell Lymphoma. *Cell*. 171(2):481-494.

## Analysis Goals

1. Compare mutation frequencies between original Reddy and GAMBL reanalysis
2. Re-evaluate S1P pathway gene mutations with corrected calls
3. Assess impact on staging/outcome associations

## Folder Structure

```
Dreval_GAMBL/
├── README.md           # This file
├── data/
│   └── raw/           # Downloaded GAMBL mutation data
├── scripts/           # Analysis scripts
└── results/           # Output figures and tables
```
