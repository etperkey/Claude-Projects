#!/usr/bin/env python3
"""
Build RNAi dependency data for the BCL Oncoprint.

Downloads DEMETER2 Combined RNAi gene_effect.csv and gene_dependency.csv
and extracts data for NHL cell lines in our panel.

Output: public/data/rnai_dependency.json

Source: DEMETER2 Combined RNAi (Figshare article 9170975)
  Combined results from Broad Achilles, Novartis DRIVE, and Marcotte datasets.
  712 unique cancer cell lines total.

  gene_effect.csv: Estimated effect of gene knockdown (DEMETER2 scores).
    Rescaled so median of essential genes = -1 per cell line.
    Negative = essential (knockdown kills), Positive = loss may help growth.

  gene_dependency.csv: Probability of true depletion phenotype (0-1).

Format: rows = cell lines (DepMap ACH- IDs), columns = genes ("HUGO (EntrezID)")
  Same orientation as CRISPR data.
"""

import csv
import json
import urllib.request
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_DIR / "public" / "data"
CELL_LINES_JSON = OUTPUT_DIR / "cell_lines.json"
GENES_JSON = OUTPUT_DIR / "genes.json"

# DEMETER2 Combined RNAi (Figshare article 9170975)
EFFECT_URL = "https://ndownloader.figshare.com/files/16718888"    # gene_effect.csv (~169 MB)
DEP_URL = "https://ndownloader.figshare.com/files/16718885"       # gene_dependency.csv (~176 MB)

EFFECT_CACHE = SCRIPT_DIR / "D2_gene_effect.csv"
DEP_CACHE = SCRIPT_DIR / "D2_gene_dependency.csv"


def download_if_needed(url, local_path, label):
    """Download file if not already cached."""
    if local_path.exists():
        size_mb = local_path.stat().st_size / (1024 * 1024)
        print(f"  Using cached file: {local_path.name} ({size_mb:.0f} MB)")
        return

    print(f"  Downloading {label}...")
    print(f"  URL: {url}")
    urllib.request.urlretrieve(url, local_path)
    size_mb = local_path.stat().st_size / (1024 * 1024)
    print(f"  Downloaded: {size_mb:.0f} MB")


def load_our_cell_lines():
    with open(CELL_LINES_JSON, "r") as f:
        cell_lines = json.load(f)
    return {cl["id"]: cl["name"] for cl in cell_lines}


def load_panel_genes():
    with open(GENES_JSON, "r") as f:
        genes_data = json.load(f)
    all_genes = set()
    for panel_id, panel in genes_data.get("panels", {}).items():
        if panel.get("allGenes"):
            all_genes.update(panel["allGenes"])
    return all_genes


def parse_demeter2_csv(filepath, our_line_ids, panel_genes):
    """
    Parse a DEMETER2 CSV: rows=cell lines, columns=genes.
    Header: [empty], GENE1 (entrez), GENE2 (entrez), ...
    Rows: ACH-XXXXXX, val1, val2, ...

    DEMETER2 uses old histone names (HIST1H1E) while our panels use new HGNC (H1-4).
    Alias mapping resolves these differences.
    """
    # Gene alias mapping: DEMETER2 name -> panel canonical name
    # DEMETER2 uses old histone names; panels use new HGNC symbols
    ALIAS_TO_CANONICAL = {
        "HIST1H1E": "H1-4",
        "HIST1H1C": "H1-2",
        "HIST1H1D": "H1-3",
        "H3F3A": "H3-3A",
        "H3F3B": "H3-3B",
    }

    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)

    # Build gene column map: gene_name -> col_index
    # Also build alias-resolved map: canonical_panel_name -> col_index
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

    print(f"  Panel genes in data: {len(resolved)}/{len(panel_genes)}")
    missing = panel_genes - set(resolved.keys())
    if missing:
        print(f"  Missing panel genes: {sorted(missing)}")

    # Read rows for our cell lines
    screened_lines = []
    data = {}

    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # skip header

        for row in reader:
            model_id = row[0].strip()
            if model_id not in our_line_ids:
                continue

            screened_lines.append(model_id)

            for gene, col_idx in resolved.items():
                try:
                    val = float(row[col_idx])
                except (ValueError, IndexError):
                    continue
                # Output uses canonical panel name (e.g., H1-4, not HIST1H1E)
                data[f"{model_id}|{gene}"] = val

    print(f"  Our lines found: {len(screened_lines)}/{len(our_line_ids)}")
    return sorted(screened_lines), data


def build_rnai_data():
    our_lines = load_our_cell_lines()
    panel_genes = load_panel_genes()

    print(f"  Our cell lines: {len(our_lines)}")
    print(f"  Panel genes: {len(panel_genes)}")

    download_if_needed(EFFECT_URL, EFFECT_CACHE, "DEMETER2 gene_effect.csv")
    download_if_needed(DEP_URL, DEP_CACHE, "DEMETER2 gene_dependency.csv")

    # Parse gene effect scores
    print("\n  Parsing RNAi gene effect data...")
    effect_screened, effect_data = parse_demeter2_csv(EFFECT_CACHE, our_lines, panel_genes)

    # Parse dependency probabilities
    print("\n  Parsing RNAi dependency probability data...")
    dep_screened, dep_data = parse_demeter2_csv(DEP_CACHE, our_lines, panel_genes)

    screened_lines = sorted(set(effect_screened) | set(dep_screened))
    print(f"\n  Total screened NHL lines: {len(screened_lines)}/{len(our_lines)}")

    # Build compact output
    all_keys = set(effect_data.keys()) | set(dep_data.keys())
    entries = []
    positive_effect_count = 0

    for key in sorted(all_keys):
        cl_id, gene = key.split("|", 1)
        entry = {"c": cl_id, "g": gene}

        if key in effect_data:
            entry["e"] = round(effect_data[key], 4)
            if effect_data[key] > 0:
                positive_effect_count += 1

        if key in dep_data:
            entry["p"] = round(dep_data[key], 3)

        entries.append(entry)

    print(f"  Total entries: {len(entries)}")
    print(f"  Entries with positive effect (loss may help growth): {positive_effect_count}")

    effects = [e["e"] for e in entries if "e" in e]
    if effects:
        print(f"  Effect range: [{min(effects):.3f}, {max(effects):.3f}]")
        print(f"  Effect mean: {sum(effects)/len(effects):.3f}")

    screened_names = [our_lines.get(mid, mid) for mid in screened_lines[:10]]
    print(f"  Screened: {', '.join(screened_names)}...")

    output = {
        "meta": {
            "source": "DEMETER2 Combined RNAi",
            "description": "RNAi gene knockdown effect (DEMETER2). Negative=essential, Positive=loss may promote growth. Dep. prob. 0-1.",
            "nhlLinesTotal": len(our_lines),
            "nhlLinesScreened": len(screened_lines),
            "datasets": "Broad Achilles + Novartis DRIVE + Marcotte",
            "url": "https://depmap.org/portal/"
        },
        "screenedLines": screened_lines,
        "entries": entries
    }

    output_path = OUTPUT_DIR / "rnai_dependency.json"
    with open(output_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_kb = output_path.stat().st_size / 1024
    print(f"\n  Saved: {output_path}")
    print(f"  Size: {size_kb:.0f} KB")

    return output


def main():
    print("Building RNAi dependency data for BCL Oncoprint\n")
    build_rnai_data()
    print("\nDone!")


if __name__ == "__main__":
    main()
