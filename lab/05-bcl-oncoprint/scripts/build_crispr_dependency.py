#!/usr/bin/env python3
"""
Build CRISPR dependency data for the BCL Oncoprint.

Downloads DepMap 24Q4 CRISPRGeneDependency.csv (gene-level dependency probabilities
from Chronos) and extracts data for NHL cell lines in our panel.

Output: public/data/crispr_dependency.json

Source: DepMap 24Q4 (2024-Q4) CRISPR Genome-Wide Knockout Screens
  Probability that knocking out the gene has a cell growth effect.
  Values near 1 = strongly dependent; near 0 = not dependent.
"""

import csv
import io
import json
import os
import sys
import urllib.request
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_DIR / "public" / "data"
CELL_LINES_JSON = OUTPUT_DIR / "cell_lines.json"
GENES_JSON = OUTPUT_DIR / "genes.json"

# DepMap 24Q4 CRISPRGeneDependency.csv (~421 MB)
# Gene-level dependency probability (Chronos)
# File ID 51064631 from Figshare article 27993248 (DepMap 24Q4 Public)
DEPMAP_URL = "https://ndownloader.figshare.com/files/51064631"
LOCAL_CACHE = SCRIPT_DIR / "CRISPRGeneDependency.csv"


def download_if_needed():
    """Download the CRISPR dependency file if not already cached."""
    if LOCAL_CACHE.exists():
        size_mb = LOCAL_CACHE.stat().st_size / (1024 * 1024)
        print(f"  Using cached file: {LOCAL_CACHE.name} ({size_mb:.0f} MB)")
        return

    print(f"  Downloading CRISPRGeneDependency.csv from DepMap 24Q4...")
    print(f"  URL: {DEPMAP_URL}")
    print(f"  This is ~421 MB and may take a few minutes.")

    urllib.request.urlretrieve(DEPMAP_URL, LOCAL_CACHE)
    size_mb = LOCAL_CACHE.stat().st_size / (1024 * 1024)
    print(f"  Downloaded: {size_mb:.0f} MB")


def load_our_cell_lines():
    """Load our NHL cell line IDs from the existing cell_lines.json."""
    with open(CELL_LINES_JSON, "r") as f:
        cell_lines = json.load(f)
    # Map ModelID -> cell line name
    return {cl["id"]: cl["name"] for cl in cell_lines}


def load_panel_genes():
    """Load all genes from our gene panels."""
    with open(GENES_JSON, "r") as f:
        genes_data = json.load(f)

    all_genes = set()
    for panel_id, panel in genes_data.get("panels", {}).items():
        if panel.get("allGenes"):
            all_genes.update(panel["allGenes"])
    return all_genes


def build_crispr_data():
    """Extract CRISPR dependency data for our NHL cell lines."""

    # Load our cell lines and genes
    our_lines = load_our_cell_lines()
    panel_genes = load_panel_genes()

    print(f"  Our cell lines: {len(our_lines)}")
    print(f"  Panel genes: {len(panel_genes)}")

    # Download source data
    download_if_needed()

    # Parse the CSV header to find our cell lines and gene columns
    print("  Parsing CRISPR dependency data...")

    with open(LOCAL_CACHE, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)

    # Header format: first column is ModelID, remaining are "GENE (entrez_id)"
    # Extract gene names and their column indices
    gene_col_map = {}  # gene_name -> col_index
    for i, col in enumerate(header):
        if i == 0:
            continue
        gene_name = col.split(" (")[0].strip() if " (" in col else col.strip()
        gene_col_map[gene_name] = i

    # Find which of our panel genes are in the CRISPR data
    panel_genes_found = panel_genes & set(gene_col_map.keys())
    print(f"  Panel genes in CRISPR data: {len(panel_genes_found)}/{len(panel_genes)}")

    missing = panel_genes - panel_genes_found
    if missing:
        print(f"  Missing panel genes: {sorted(missing)}")

    # Columns to extract: panel genes + any gene (for non-panel genes with prob > 0.5)
    # We'll extract all columns and filter in memory for panel genes
    panel_col_indices = {gene_col_map[g] for g in panel_genes_found}

    # Read data for our cell lines
    screened_lines = []
    dependencies = []

    with open(LOCAL_CACHE, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # skip header

        for row in reader:
            model_id = row[0]
            if model_id not in our_lines:
                continue

            screened_lines.append(model_id)

            # Panel genes: include ALL entries (even 0.0) to distinguish
            # "not dependent" from "not tested"
            for gene in panel_genes_found:
                col_idx = gene_col_map[gene]
                try:
                    prob = float(row[col_idx])
                except (ValueError, IndexError):
                    continue
                dependencies.append({
                    "c": model_id,
                    "g": gene,
                    "p": round(prob, 3)
                })

            # Non-panel genes omitted to keep file size manageable
            # Users can check DepMap portal directly for non-panel gene dependencies

    print(f"  Screened NHL lines: {len(screened_lines)}/{len(our_lines)}")
    print(f"  Total dependency entries: {len(dependencies)}")

    # Report screened lines
    screened_names = [our_lines[mid] for mid in sorted(screened_lines)]
    print(f"  Screened: {', '.join(screened_names[:10])}...")

    # Build output JSON
    output = {
        "meta": {
            "source": "DepMap 24Q4 Chronos",
            "description": "Gene-level CRISPR knockout dependency probability",
            "nhlLinesTotal": len(our_lines),
            "nhlLinesScreened": len(screened_lines),
            "url": "https://depmap.org/portal/"
        },
        "screenedLines": sorted(screened_lines),
        "dependencies": dependencies
    }

    # Write output
    output_path = OUTPUT_DIR / "crispr_dependency.json"
    with open(output_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_kb = output_path.stat().st_size / 1024
    print(f"\n  Saved: {output_path}")
    print(f"  Size: {size_kb:.0f} KB")

    return output


def main():
    print("Building CRISPR dependency data for BCL Oncoprint\n")
    build_crispr_data()
    print("\nDone!")


if __name__ == "__main__":
    main()
