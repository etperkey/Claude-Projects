#!/usr/bin/env python3
"""
Build CRISPR gene effect data for the BCL Oncoprint.

Downloads DepMap 24Q4 CRISPRGeneEffect.csv (Chronos gene effect scores)
and extracts data for NHL cell lines in our panel.

Output: public/data/crispr_gene_effect.json

Source: DepMap 24Q4 (2024-Q4) CRISPR Genome-Wide Knockout Screens
  Chronos gene effect scores:
    Negative values = gene knockout reduces growth (gene is essential/dependency)
    Positive values = gene knockout INCREASES growth (loss promotes proliferation)
    ~0 = no effect on growth

This complements the dependency probability data (crispr_dependency.json) by
capturing the tumor-suppressor direction: genes whose loss helps cells grow.
"""

import csv
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

# DepMap 24Q4 CRISPRGeneEffect.csv (~490 MB)
# Chronos gene effect scores
# File ID 51064667 from Figshare article 27993248 (DepMap 24Q4 Public)
DEPMAP_URL = "https://ndownloader.figshare.com/files/51064667"
LOCAL_CACHE = SCRIPT_DIR / "CRISPRGeneEffect.csv"


def download_if_needed():
    """Download the CRISPR gene effect file if not already cached."""
    if LOCAL_CACHE.exists():
        size_mb = LOCAL_CACHE.stat().st_size / (1024 * 1024)
        print(f"  Using cached file: {LOCAL_CACHE.name} ({size_mb:.0f} MB)")
        return

    print(f"  Downloading CRISPRGeneEffect.csv from DepMap 24Q4...")
    print(f"  URL: {DEPMAP_URL}")
    print(f"  This is ~490 MB and may take a few minutes.")

    urllib.request.urlretrieve(DEPMAP_URL, LOCAL_CACHE)
    size_mb = LOCAL_CACHE.stat().st_size / (1024 * 1024)
    print(f"  Downloaded: {size_mb:.0f} MB")


def load_our_cell_lines():
    """Load our NHL cell line IDs from the existing cell_lines.json."""
    with open(CELL_LINES_JSON, "r") as f:
        cell_lines = json.load(f)
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


def build_gene_effect_data():
    """Extract CRISPR gene effect data for our NHL cell lines."""

    our_lines = load_our_cell_lines()
    panel_genes = load_panel_genes()

    print(f"  Our cell lines: {len(our_lines)}")
    print(f"  Panel genes: {len(panel_genes)}")

    download_if_needed()

    print("  Parsing CRISPR gene effect data...")

    with open(LOCAL_CACHE, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)

    # Header format: first column is ModelID, remaining are "GENE (entrez_id)"
    gene_col_map = {}
    for i, col in enumerate(header):
        if i == 0:
            continue
        gene_name = col.split(" (")[0].strip() if " (" in col else col.strip()
        gene_col_map[gene_name] = i

    panel_genes_found = panel_genes & set(gene_col_map.keys())
    print(f"  Panel genes in CRISPR data: {len(panel_genes_found)}/{len(panel_genes)}")

    missing = panel_genes - panel_genes_found
    if missing:
        print(f"  Missing panel genes: {sorted(missing)}")

    # Read data for our cell lines
    screened_lines = []
    effects = []
    positive_count = 0  # Track how many entries show growth-promoting loss

    with open(LOCAL_CACHE, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # skip header

        for row in reader:
            model_id = row[0]
            if model_id not in our_lines:
                continue

            screened_lines.append(model_id)

            for gene in panel_genes_found:
                col_idx = gene_col_map[gene]
                try:
                    effect = float(row[col_idx])
                except (ValueError, IndexError):
                    continue
                effects.append({
                    "c": model_id,
                    "g": gene,
                    "e": round(effect, 4)
                })
                if effect > 0:
                    positive_count += 1

    print(f"  Screened NHL lines: {len(screened_lines)}/{len(our_lines)}")
    print(f"  Total gene effect entries: {len(effects)}")
    print(f"  Entries with positive effect (loss helps growth): {positive_count}")

    # Report some stats
    if effects:
        vals = [e["e"] for e in effects]
        print(f"  Effect range: [{min(vals):.3f}, {max(vals):.3f}]")
        print(f"  Mean: {sum(vals)/len(vals):.3f}")

    screened_names = [our_lines[mid] for mid in sorted(screened_lines)]
    print(f"  Screened: {', '.join(screened_names[:10])}...")

    output = {
        "meta": {
            "source": "DepMap 24Q4 Chronos",
            "description": "Gene-level CRISPR knockout gene effect scores. Negative=essential, Positive=loss promotes growth.",
            "nhlLinesTotal": len(our_lines),
            "nhlLinesScreened": len(screened_lines),
            "url": "https://depmap.org/portal/"
        },
        "screenedLines": sorted(screened_lines),
        "effects": effects
    }

    output_path = OUTPUT_DIR / "crispr_gene_effect.json"
    with open(output_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_kb = output_path.stat().st_size / 1024
    print(f"\n  Saved: {output_path}")
    print(f"  Size: {size_kb:.0f} KB")

    return output


def main():
    print("Building CRISPR gene effect data for BCL Oncoprint\n")
    build_gene_effect_data()
    print("\nDone!")


if __name__ == "__main__":
    main()
