#!/usr/bin/env python3
"""
Build gene expression data for the BCL Oncoprint.

Downloads DepMap 24Q4 OmicsExpressionProteinCodingGenesTPMLogp1.csv
and extracts data for NHL cell lines in our panel.

Output: public/data/expression.json

Source: DepMap 24Q4 RNA-seq (Figshare article 27993248)
  OmicsExpressionProteinCodingGenesTPMLogp1.csv:
    Values = log2(TPM + 1) for protein-coding genes.
    Rows = cell lines (DepMap ACH- IDs), Columns = "GENE (entrez_id)"
"""

import csv
import json
import urllib.request
from pathlib import Path
import statistics

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_DIR / "public" / "data"
CELL_LINES_JSON = OUTPUT_DIR / "cell_lines.json"
GENES_JSON = OUTPUT_DIR / "genes.json"

# DepMap 24Q4 OmicsExpressionProteinCodingGenesTPMLogp1.csv (~506 MB)
# File ID 51065489 from Figshare article 27993248 (DepMap 24Q4 Public)
DEPMAP_URL = "https://ndownloader.figshare.com/files/51065489"
LOCAL_CACHE = SCRIPT_DIR / "OmicsExpressionProteinCodingGenesTPMLogp1.csv"


def download_if_needed():
    """Download the expression file if not already cached."""
    if LOCAL_CACHE.exists():
        size_mb = LOCAL_CACHE.stat().st_size / (1024 * 1024)
        print(f"  Using cached file: {LOCAL_CACHE.name} ({size_mb:.0f} MB)")
        return

    print(f"  Downloading OmicsExpressionProteinCodingGenesTPMLogp1.csv from DepMap 24Q4...")
    print(f"  URL: {DEPMAP_URL}")
    print(f"  This is ~506 MB and may take a few minutes.")

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


def build_expression_data():
    """Extract gene expression data for our NHL cell lines."""

    our_lines = load_our_cell_lines()
    panel_genes = load_panel_genes()

    print(f"  Our cell lines: {len(our_lines)}")
    print(f"  Panel genes: {len(panel_genes)}")

    download_if_needed()

    print("  Parsing expression data...")

    # Gene alias mapping: DepMap name -> panel canonical name
    # DepMap 24Q4 expression uses new HGNC symbols for most genes,
    # but some histones may still use old names
    ALIAS_TO_CANONICAL = {
        "HIST1H1E": "H1-4",
        "HIST1H1C": "H1-2",
        "HIST1H1D": "H1-3",
        "H3F3A": "H3-3A",
        "H3F3B": "H3-3B",
    }

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

    # Resolve panel genes: try direct match first, then alias
    resolved = {}  # panel_gene -> col_index
    for gene in panel_genes:
        if gene in gene_col_map:
            resolved[gene] = gene_col_map[gene]
        else:
            # Check if any alias of this gene exists in the data
            for alias, canonical in ALIAS_TO_CANONICAL.items():
                if canonical == gene and alias in gene_col_map:
                    resolved[gene] = gene_col_map[alias]
                    break

    print(f"  Panel genes in expression data: {len(resolved)}/{len(panel_genes)}")

    missing = panel_genes - set(resolved.keys())
    if missing:
        print(f"  Missing panel genes: {sorted(missing)}")

    # Read data for our cell lines
    screened_lines = []
    entries = []

    with open(LOCAL_CACHE, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # skip header

        for row in reader:
            model_id = row[0]
            if model_id not in our_lines:
                continue

            screened_lines.append(model_id)

            for gene, col_idx in resolved.items():
                try:
                    value = float(row[col_idx])
                except (ValueError, IndexError):
                    continue
                entries.append({
                    "c": model_id,
                    "g": gene,
                    "v": round(value, 3)
                })

    print(f"  Screened NHL lines: {len(screened_lines)}/{len(our_lines)}")
    print(f"  Total expression entries: {len(entries)}")

    # Report distribution stats
    if entries:
        vals = [e["v"] for e in entries]
        vals_sorted = sorted(vals)
        n = len(vals_sorted)
        print(f"\n  Expression distribution (log2(TPM+1)):")
        print(f"    Min:  {vals_sorted[0]:.3f}")
        print(f"    p5:   {vals_sorted[int(n*0.05)]:.3f}")
        print(f"    p25:  {vals_sorted[int(n*0.25)]:.3f}")
        print(f"    p50:  {statistics.median(vals):.3f}")
        print(f"    p75:  {vals_sorted[int(n*0.75)]:.3f}")
        print(f"    p95:  {vals_sorted[int(n*0.95)]:.3f}")
        print(f"    Max:  {vals_sorted[-1]:.3f}")
        print(f"    Mean: {statistics.mean(vals):.3f}")

        # Classification distribution
        not_expr = sum(1 for v in vals if v < 0.5)
        low = sum(1 for v in vals if 0.5 <= v < 2)
        moderate = sum(1 for v in vals if 2 <= v < 5)
        high = sum(1 for v in vals if v >= 5)
        print(f"\n  Classification distribution:")
        print(f"    Not expressed (<0.5):  {not_expr} ({not_expr/n*100:.1f}%)")
        print(f"    Low (0.5-2):           {low} ({low/n*100:.1f}%)")
        print(f"    Moderate (2-5):        {moderate} ({moderate/n*100:.1f}%)")
        print(f"    Highly expressed (>=5): {high} ({high/n*100:.1f}%)")

    screened_names = [our_lines[mid] for mid in sorted(screened_lines)]
    print(f"\n  Screened: {', '.join(screened_names[:10])}...")

    output = {
        "meta": {
            "source": "DepMap 24Q4 RNA-seq",
            "description": "Gene expression as log2(TPM+1). Higher values = more highly expressed.",
            "nhlLinesTotal": len(our_lines),
            "nhlLinesScreened": len(screened_lines),
            "url": "https://depmap.org/portal/"
        },
        "screenedLines": sorted(screened_lines),
        "entries": entries
    }

    output_path = OUTPUT_DIR / "expression.json"
    with open(output_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_kb = output_path.stat().st_size / 1024
    print(f"\n  Saved: {output_path}")
    print(f"  Size: {size_kb:.0f} KB")

    return output


def main():
    print("Building gene expression data for BCL Oncoprint\n")
    build_expression_data()
    print("\nDone!")


if __name__ == "__main__":
    main()
