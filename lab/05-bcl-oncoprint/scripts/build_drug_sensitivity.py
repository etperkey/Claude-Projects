#!/usr/bin/env python3
"""
Build drug sensitivity data for the BCL Oncoprint.

Downloads PRISM Repurposing 24Q2 data and extracts sensitivity scores
for NHL cell lines in our panel.

Output:
  public/data/drug_sensitivity.json  - Drug sensitivity data indexed by drug
  public/data/drug_targets.json      - Gene -> drug target mapping

Source: PRISM Repurposing 24Q2 (Figshare article 25917643)
  secondary-screen-dose-response-curve-parameters.csv (file 46630984, ~69 MB)
  secondary-screen-replicate-collapsed-treatment-info.csv (file 46630981, ~700 KB)
"""

import csv
import json
import sys
import urllib.request
from pathlib import Path
import statistics

csv.field_size_limit(2**30)

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_DIR / "public" / "data"
CELL_LINES_JSON = OUTPUT_DIR / "cell_lines.json"
GENES_JSON = OUTPUT_DIR / "genes.json"

# PRISM Repurposing 24Q2
# Dose-response curve parameters (~69 MB)
PRISM_DATA_URL = "https://ndownloader.figshare.com/files/46630984"
LOCAL_DATA_CACHE = SCRIPT_DIR / "secondary-screen-dose-response-curve-parameters.csv"

# Treatment info / compound metadata (~700 KB)
PRISM_META_URL = "https://ndownloader.figshare.com/files/46630981"
LOCAL_META_CACHE = SCRIPT_DIR / "secondary-screen-replicate-collapsed-treatment-info.csv"


def download_if_needed(url, local_path, description, approx_size=""):
    """Download a file if not already cached."""
    if local_path.exists():
        size_mb = local_path.stat().st_size / (1024 * 1024)
        print(f"  Using cached file: {local_path.name} ({size_mb:.1f} MB)")
        return

    size_note = f" (~{approx_size})" if approx_size else ""
    print(f"  Downloading {description}{size_note}...")
    print(f"  URL: {url}")
    urllib.request.urlretrieve(url, local_path)
    size_mb = local_path.stat().st_size / (1024 * 1024)
    print(f"  Downloaded: {size_mb:.1f} MB")


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


def build_drug_sensitivity_data():
    """Extract drug sensitivity data for our NHL cell lines."""

    our_lines = load_our_cell_lines()
    panel_genes = load_panel_genes()

    print(f"  Our cell lines: {len(our_lines)}")
    print(f"  Panel genes: {len(panel_genes)}")

    # Download files
    download_if_needed(PRISM_META_URL, LOCAL_META_CACHE, "PRISM treatment info", "700 KB")
    download_if_needed(PRISM_DATA_URL, LOCAL_DATA_CACHE, "PRISM dose-response data", "69 MB")

    # ── Step 1: Parse compound metadata ──
    # Format: screen,dose,repurposing_target,MOA,IDs,Drug.Name,Synonyms
    # IDs format: "BRD:BRD-K00104122-001-01-9"
    print("  Parsing compound metadata...")
    drug_meta = {}  # broad_id -> {name, target, moa}
    with open(LOCAL_META_CACHE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ids_raw = row.get("IDs", "").strip()
            name = row.get("Drug.Name", row.get("name", "")).strip()
            target = row.get("repurposing_target", row.get("target", "")).strip()
            moa = row.get("MOA", row.get("moa", "")).strip()

            if not ids_raw or not name:
                continue

            # IDs can contain multiple BRD IDs separated by semicolons
            for id_part in ids_raw.split(";"):
                broad_id = id_part.strip()
                if broad_id:
                    drug_meta[broad_id] = {
                        "name": name,
                        "target": target,
                        "moa": moa
                    }

    print(f"  Compounds with metadata: {len(drug_meta)}")
    # Show a few examples
    for bid, meta in list(drug_meta.items())[:3]:
        print(f"    {bid}: {meta['name']} ({meta['target'] or 'no target'})")

    # ── Step 2: Parse dose-response matrix for our cell lines ──
    # Matrix format: rows = BRD drug IDs, columns = ACH cell line IDs
    # Values are log-fold-change viability (negative = more sensitive)
    print("  Parsing dose-response matrix (this may take a moment)...")

    sensitivity = {}  # {ach_id: {broad_id: value}}
    screened_lines = set()
    broad_ids_seen = set()

    with open(LOCAL_DATA_CACHE, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)

    # Header: ['', 'ACH-000001', 'ACH-000002', ...]
    # Find columns for our cell lines
    col_to_ach = {}  # col_index -> ACH_id
    for i, col in enumerate(header):
        if i == 0:
            continue
        ach = col.strip()
        if ach in our_lines:
            col_to_ach[i] = ach

    print(f"  Our NHL lines found in PRISM data: {len(col_to_ach)}/{len(our_lines)}")

    with open(LOCAL_DATA_CACHE, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # skip header

        for row in reader:
            if not row:
                continue
            broad_id = row[0].strip()
            if not broad_id:
                continue

            for col_idx, ach_id in col_to_ach.items():
                try:
                    val = float(row[col_idx])
                except (ValueError, IndexError):
                    continue

                screened_lines.add(ach_id)
                broad_ids_seen.add(broad_id)

                if ach_id not in sensitivity:
                    sensitivity[ach_id] = {}
                sensitivity[ach_id][broad_id] = round(val, 4)

    print(f"  Screened NHL lines: {len(screened_lines)}/{len(our_lines)}")
    print(f"  Unique drugs in our data: {len(broad_ids_seen)}")

    # ── Step 3: Filter to oncology/immunology-relevant drugs ──
    # Curated MOA keywords: oncology + immunology mechanisms
    RELEVANT_MOA_KEYWORDS = [
        # Kinase pathway
        'KINASE INHIBITOR', 'PI3K', 'AKT ', 'MTOR', 'JAK ', 'BTK',
        'SYK ', 'CDK ', 'AURORA', 'MEK ', 'RAF ', 'ERK ',
        'EGFR', 'FGFR', 'ALK ', 'ABL ', 'FLT3', 'IGF', 'VEGFR',
        'KIT ', 'RET ', 'SRC ', 'WEE1', 'CHK ', 'PLK ', 'PIM ',
        # Epigenetic
        'HDAC', 'BROMODOMAIN', 'BET ', 'METHYLTRANSFERASE',
        'EZH', 'DNMT', 'DEMETHYLASE',
        # Apoptosis
        'BCL', 'IAP ', 'MDM ', 'SMAC', 'APOPTOSIS', 'CASPASE',
        # Proteasome / ubiquitin
        'PROTEASOME', 'UBIQUITIN', 'NEDD8', 'CEREBLON',
        # DNA damage
        'TOPOISOMERASE', 'PARP', 'ATM ', 'ATR ', 'DNA-PK',
        # Cell cycle
        'ANTIMITOTIC', 'TUBULIN', 'MICROTUBULE',
        # NF-kB / signaling
        'NFKB', 'NF-KB', 'IKK ',
        # HSP
        'HSP ', 'HSP90',
        # Immunology
        'IMMUNOMODULATOR', 'IMMUNOSUPPRESSANT', 'IMMUNOSTIMULANT',
        'GLUCOCORTICOID', 'CORTICOSTEROID',
        'CHEMOKINE', 'CYTOKINE',
        'TOLL-LIKE', 'TLR ',
        'INTERFERON', 'INTERLEUKIN',
        'SPHINGOSINE', 'S1P ',
        'MALT1', 'CALCINEURIN',
        'COMPLEMENT',
        # Other oncology
        'ANTINEOPLASTIC', 'ALKYLATING', 'ANTIMETABOLITE',
        'LYMPHOMA', 'LEUKEMIA',
    ]

    def is_relevant(meta):
        """Check if drug has oncology/immunology-relevant MOA or targets panel genes."""
        # Always include if it targets one of our panel genes
        target_str = meta.get("target", "")
        if target_str:
            for t in target_str.replace(";", ",").split(","):
                if t.strip() in panel_genes:
                    return True
        # Check MOA keywords
        moa = meta.get("moa", "").upper()
        if moa:
            for kw in RELEVANT_MOA_KEYWORDS:
                if kw in moa:
                    return True
        return False

    # Filter: must have metadata, pass relevance check, and have data
    all_with_data = [bid for bid in broad_ids_seen if bid in drug_meta]
    relevant_broads = [bid for bid in all_with_data if is_relevant(drug_meta[bid])]

    print(f"  Drugs with metadata + data: {len(all_with_data)}")
    print(f"  After oncology/immunology filter: {len(relevant_broads)}")

    drug_list = []
    broad_to_idx = {}  # broad_id -> index in drug_list

    # Sort drugs by name for consistent ordering
    valid_broads = sorted(
        relevant_broads,
        key=lambda bid: drug_meta[bid]["name"].lower()
    )

    for i, broad_id in enumerate(valid_broads):
        meta = drug_meta[broad_id]
        drug_list.append({
            "i": i,
            "n": meta["name"],
            "t": meta["target"],
            "m": meta["moa"]
        })
        broad_to_idx[broad_id] = i

    print(f"  Drugs with metadata + data: {len(drug_list)}")

    # ── Step 4: Build compact data structure ──
    data = {}  # {ach_id: {drug_idx_str: value}}
    for ach_id, drugs in sensitivity.items():
        cell_data = {}
        for broad_id, val in drugs.items():
            if broad_id in broad_to_idx:
                cell_data[str(broad_to_idx[broad_id])] = val
        if cell_data:
            data[ach_id] = cell_data

    # Require cell lines to have data for at least 10% of drugs to count as screened
    MIN_DRUGS = max(10, len(drug_list) // 10)
    sparse_lines = [ach for ach, d in data.items() if len(d) < MIN_DRUGS]
    for ach in sparse_lines:
        del data[ach]
    screened_lines -= set(sparse_lines)
    if sparse_lines:
        sparse_names = [our_lines.get(a, a) for a in sparse_lines]
        print(f"  Removed {len(sparse_lines)} sparse lines (<{MIN_DRUGS} drugs): {', '.join(sparse_names)}")
    print(f"  Final screened lines: {len(screened_lines)}")

    # ── Step 5: Build gene -> drug target mapping ──
    gene_targets = {}  # gene -> [{n, m, i}, ...]
    for broad_id, idx in broad_to_idx.items():
        meta = drug_meta[broad_id]
        targets = meta["target"]
        if not targets:
            continue

        # Parse targets (comma or semicolon separated)
        for target in targets.replace(";", ",").split(","):
            gene = target.strip()
            if gene in panel_genes:
                if gene not in gene_targets:
                    gene_targets[gene] = []
                gene_targets[gene].append({
                    "n": meta["name"],
                    "m": meta["moa"],
                    "i": idx
                })

    print(f"  Panel genes with drug targets: {len(gene_targets)}")
    for gene, drugs in sorted(gene_targets.items()):
        drug_names = [d["n"] for d in drugs[:3]]
        extra = f" +{len(drugs)-3} more" if len(drugs) > 3 else ""
        print(f"    {gene}: {', '.join(drug_names)}{extra}")

    # ── Step 6: Report sensitivity distribution ──
    all_vals = []
    for cell_data in data.values():
        all_vals.extend(cell_data.values())

    if all_vals:
        all_vals_sorted = sorted(all_vals)
        n = len(all_vals_sorted)
        print(f"\n  Sensitivity distribution (AUC):")
        print(f"    Min:  {all_vals_sorted[0]:.4f}")
        print(f"    p5:   {all_vals_sorted[int(n*0.05)]:.4f}")
        print(f"    p25:  {all_vals_sorted[int(n*0.25)]:.4f}")
        print(f"    p50:  {statistics.median(all_vals):.4f}")
        print(f"    p75:  {all_vals_sorted[int(n*0.75)]:.4f}")
        print(f"    p95:  {all_vals_sorted[int(n*0.95)]:.4f}")
        print(f"    Max:  {all_vals_sorted[-1]:.4f}")

    # ── Step 7: Write output files ──
    drug_output = {
        "meta": {
            "source": "PRISM Repurposing 24Q2",
            "description": "Drug sensitivity AUC. Lower values = more sensitive.",
            "nhlLinesTotal": len(our_lines),
            "nhlLinesScreened": len(screened_lines),
            "url": "https://depmap.org/portal/"
        },
        "screenedLines": sorted(screened_lines),
        "drugList": drug_list,
        "data": data
    }

    drug_output_path = OUTPUT_DIR / "drug_sensitivity.json"
    with open(drug_output_path, "w") as f:
        json.dump(drug_output, f, separators=(",", ":"))

    size_kb = drug_output_path.stat().st_size / 1024
    print(f"\n  Saved: {drug_output_path}")
    print(f"  Size: {size_kb:.0f} KB ({size_kb/1024:.1f} MB)")

    target_output = {
        "geneTargets": gene_targets
    }

    target_output_path = OUTPUT_DIR / "drug_targets.json"
    with open(target_output_path, "w") as f:
        json.dump(target_output, f, separators=(",", ":"))

    size_kb = target_output_path.stat().st_size / 1024
    print(f"  Saved: {target_output_path}")
    print(f"  Size: {size_kb:.0f} KB")

    return drug_output, target_output


def main():
    print("Building drug sensitivity data for BCL Oncoprint\n")
    build_drug_sensitivity_data()
    print("\nDone!")


if __name__ == "__main__":
    main()
