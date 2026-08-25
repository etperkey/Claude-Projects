#!/usr/bin/env python3
"""
Build proteomics data for the BCL Oncoprint.

Downloads ProCan-DepMapSanger proteomics data and extracts z-scores
for NHL cell lines in our panel.

Output: public/data/proteomics.json

Source: ProCan-DepMapSanger (Figshare article 19345397)
  protein_matrix.csv: Protein expression z-scores.
  Rows = proteins, Columns = Sanger SIDM IDs

Mapping: SIDM IDs -> ACH IDs via DepMap Model.csv
"""

import csv
import json
import sys
import urllib.request
from pathlib import Path
import statistics
import io

csv.field_size_limit(2**30)

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_DIR / "public" / "data"
CELL_LINES_JSON = OUTPUT_DIR / "cell_lines.json"
GENES_JSON = OUTPUT_DIR / "genes.json"

# ProCan-DepMapSanger protein matrix (~94 MB)
# File ID 34411172 from Figshare article 19345397
PROTEIN_URL = "https://ndownloader.figshare.com/files/34411172"
LOCAL_PROTEIN_CACHE = SCRIPT_DIR / "protein_matrix.csv"

# DepMap 24Q4 Model.csv for SIDM -> ACH mapping
# File ID 51065297 from Figshare article 27993248 (DepMap 24Q4 Public)
MODEL_URL = "https://ndownloader.figshare.com/files/51065297"
LOCAL_MODEL_CACHE = SCRIPT_DIR / "Model.csv"


def download_if_needed(url, local_path, description, approx_size=""):
    """Download a file if not already cached."""
    if local_path.exists():
        size_mb = local_path.stat().st_size / (1024 * 1024)
        print(f"  Using cached file: {local_path.name} ({size_mb:.0f} MB)")
        return

    size_note = f" (~{approx_size})" if approx_size else ""
    print(f"  Downloading {description}{size_note}...")
    print(f"  URL: {url}")
    urllib.request.urlretrieve(url, local_path)
    size_mb = local_path.stat().st_size / (1024 * 1024)
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


def build_sidm_to_ach_mapping():
    """Build Sanger SIDM -> DepMap ACH mapping from Model.csv."""
    download_if_needed(MODEL_URL, LOCAL_MODEL_CACHE, "DepMap 24Q4 Model.csv", "3 MB")

    mapping = {}  # SIDM -> ACH
    with open(LOCAL_MODEL_CACHE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ach_id = row.get("ModelID", "").strip()
            sidm_id = row.get("SangerModelID", "").strip()
            if ach_id.startswith("ACH-") and sidm_id.startswith("SIDM"):
                mapping[sidm_id] = ach_id

    print(f"  SIDM -> ACH mappings loaded: {len(mapping)}")
    return mapping


def build_proteomics_data():
    """Extract proteomics z-score data for our NHL cell lines."""

    our_lines = load_our_cell_lines()
    panel_genes = load_panel_genes()

    print(f"  Our cell lines: {len(our_lines)}")
    print(f"  Panel genes: {len(panel_genes)}")

    # Build SIDM -> ACH mapping
    sidm_to_ach = build_sidm_to_ach_mapping()

    # Download proteomics data
    download_if_needed(PROTEIN_URL, LOCAL_PROTEIN_CACHE, "ProCan protein matrix", "94 MB")

    print("  Parsing proteomics data...")

    # File is TSV. Rows = cell lines (SIDM IDs), Columns = proteins.
    # Header col 0 = "Project_Identifier", rest = "UniProtAcc;GENE_HUMAN"
    # Data col 0 = "SIDM00018;K052", rest = z-score values

    with open(LOCAL_PROTEIN_CACHE, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        header = next(reader)

    print(f"  Protein columns: {len(header) - 1}")

    # Parse protein column headers to extract gene names
    # Format: "Q9Y651;SOX21_HUMAN" -> "SOX21"
    col_to_gene = {}  # col_index -> gene_name
    for i, col in enumerate(header):
        if i == 0:
            continue
        # Extract gene from "UniProtAcc;GENE_HUMAN"
        parts = col.split(";")
        if len(parts) >= 2:
            gene_human = parts[1].strip()  # e.g. "SOX21_HUMAN"
            gene = gene_human.replace("_HUMAN", "").strip()
        else:
            gene = parts[0].strip()

        if gene in panel_genes:
            col_to_gene[i] = gene

    print(f"  Panel genes found in protein columns: {len(col_to_gene)}/{len(panel_genes)}")

    # Read data rows: each row is a cell line
    screened_lines = set()
    entries = []
    genes_found = set()

    with open(LOCAL_PROTEIN_CACHE, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        next(reader)  # skip header

        for row in reader:
            if not row:
                continue
            # Col 0: "SIDM00018;K052" - extract SIDM ID
            raw_id = row[0].strip()
            sidm = raw_id.split(";")[0].strip()

            ach = sidm_to_ach.get(sidm)
            if not ach or ach not in our_lines:
                continue

            screened_lines.add(ach)

            for col_idx, gene in col_to_gene.items():
                try:
                    value = float(row[col_idx])
                except (ValueError, IndexError):
                    continue
                genes_found.add(gene)
                entries.append({
                    "c": ach,
                    "g": gene,
                    "v": round(value, 3)
                })

    print(f"  Panel genes found in proteomics: {len(genes_found)}/{len(panel_genes)}")
    print(f"  Screened NHL lines: {len(screened_lines)}/{len(our_lines)}")
    print(f"  Total proteomics entries (raw): {len(entries)}")

    # Z-score normalize per gene across our cell lines
    # Group values by gene
    gene_values = {}  # gene -> [value, ...]
    for e in entries:
        gene_values.setdefault(e["g"], []).append(e["v"])

    print(f"\n  Z-score normalizing per gene across {len(screened_lines)} cell lines...")
    gene_stats = {}
    for gene, vals in gene_values.items():
        if len(vals) >= 2:
            mean = statistics.mean(vals)
            stdev = statistics.stdev(vals)
            gene_stats[gene] = (mean, stdev)

    # Replace raw values with z-scores
    z_entries = []
    for e in entries:
        gene = e["g"]
        if gene in gene_stats:
            mean, stdev = gene_stats[gene]
            if stdev > 0:
                z = (e["v"] - mean) / stdev
                z_entries.append({
                    "c": e["c"],
                    "g": gene,
                    "v": round(z, 3)
                })
    entries = z_entries
    print(f"  Total proteomics entries (z-scored): {len(entries)}")

    # Report distribution stats
    if entries:
        vals = [e["v"] for e in entries]
        vals_sorted = sorted(vals)
        n = len(vals_sorted)
        print(f"\n  Z-score distribution:")
        print(f"    Min:  {vals_sorted[0]:.3f}")
        print(f"    p5:   {vals_sorted[int(n*0.05)]:.3f}")
        print(f"    p25:  {vals_sorted[int(n*0.25)]:.3f}")
        print(f"    p50:  {statistics.median(vals):.3f}")
        print(f"    p75:  {vals_sorted[int(n*0.75)]:.3f}")
        print(f"    p95:  {vals_sorted[int(n*0.95)]:.3f}")
        print(f"    Max:  {vals_sorted[-1]:.3f}")
        print(f"    Mean: {statistics.mean(vals):.3f}")

    screened_names = [our_lines[ach] for ach in sorted(screened_lines) if ach in our_lines]
    print(f"\n  Screened: {', '.join(screened_names[:10])}...")

    output = {
        "meta": {
            "source": "ProCan-DepMapSanger",
            "description": "Protein expression z-scores. Positive = above average, negative = below average.",
            "nhlLinesTotal": len(our_lines),
            "nhlLinesScreened": len(screened_lines),
            "url": "https://depmap.org/portal/"
        },
        "screenedLines": sorted(screened_lines),
        "entries": entries
    }

    output_path = OUTPUT_DIR / "proteomics.json"
    with open(output_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_kb = output_path.stat().st_size / 1024
    print(f"\n  Saved: {output_path}")
    print(f"  Size: {size_kb:.0f} KB")

    return output


def main():
    print("Building proteomics data for BCL Oncoprint\n")
    build_proteomics_data()
    print("\nDone!")


if __name__ == "__main__":
    main()
