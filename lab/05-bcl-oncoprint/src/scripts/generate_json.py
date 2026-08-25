#!/usr/bin/env python3
"""
Generate JSON data files from DepMap CSVs for the BCL Cell Line Oncoprint tool.

Usage:
    python generate_json.py

Reads from:
    - DLBCL_data/human/BCL_lines/mutations/depmap_mutations.csv
    - DLBCL_data/human/BCL_lines/cnv/depmap_cnv_log2.csv
    - DLBCL_data/human/BCL_lines/metadata/bcl_cell_lines.csv

Outputs to:
    - public/data/cell_lines.json
    - public/data/mutations.json
    - public/data/cnv.json
    - public/data/genes.json
"""

import json
import os
import pandas as pd
import re
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "DLBCL_data" / "human" / "BCL_lines"
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "public" / "data"

# Gene sets
GENE_CATEGORIES = {
    "retention": ["GNA13", "S1PR2", "P2RY8", "RHOA", "ARHGEF1"],
    "egress": ["S1PR1", "CXCR4", "GNAI2", "RAC2"],
    "driver": ["TP53", "EZH2", "KMT2D", "MYD88", "CD79B", "CREBBP", "EP300",
               "TNFAIP3", "CARD11", "BCL10", "B2M", "CIITA", "PRDM1", "IRF4",
               "NOTCH1", "NOTCH2", "SPEN", "DTX1", "SGK1", "TBL1XR1", "HIST1H1E",
               "PIM1", "BTG1", "BTG2", "FOXO1", "MEF2B", "ID3", "TCF3"],
    "focal": ["BCL2", "BCL6", "MYC"]
}

# CNV thresholds (log2 scale)
CNV_THRESHOLDS = {
    "hom_del": -1.0,      # < -1.0 = homozygous deletion
    "het_loss": -0.4,     # -1.0 to -0.4 = heterozygous loss
    "gain": 0.4,          # 0.4 to 1.0 = gain
    "amp": 1.0            # > 1.0 = amplification
}


def safe_str(val, default=""):
    """Convert value to string, handling NaN/None."""
    if pd.isna(val):
        return default
    return str(val)


def classify_cnv(log2_value):
    """Classify CNV status from log2 value."""
    if pd.isna(log2_value):
        return "no_data"
    if log2_value < CNV_THRESHOLDS["hom_del"]:
        return "hom_del"
    if log2_value < CNV_THRESHOLDS["het_loss"]:
        return "het_loss"
    if log2_value > CNV_THRESHOLDS["amp"]:
        return "amp"
    if log2_value > CNV_THRESHOLDS["gain"]:
        return "gain"
    return "neutral"


def extract_gene_from_column(col_name):
    """Extract gene symbol from CNV column like 'TSPAN6 (7105)'."""
    match = re.match(r'^([A-Za-z0-9\-]+)', col_name)
    return match.group(1) if match else col_name


def load_metadata():
    """Load cell line metadata."""
    print("Loading cell line metadata...")
    path = DATA_DIR / "metadata" / "bcl_cell_lines.csv"
    df = pd.read_csv(path)

    cell_lines = []
    for _, row in df.iterrows():
        cell_lines.append({
            "id": row["ModelID"],
            "name": row["CellLineName"],
            "strippedName": safe_str(row.get("StrippedCellLineName"), row["CellLineName"].replace("-", "").replace(" ", "")),
            "subtype": row["BCL_Subtype"],
            "disease": safe_str(row.get("OncotreePrimaryDisease")),
            "oncotreeSubtype": safe_str(row.get("OncotreeSubtype")),
            "sex": safe_str(row.get("Sex")),
            "age": safe_str(row.get("Age")),
            "primaryOrMetastasis": safe_str(row.get("PrimaryOrMetastasis")),
            "sampleSite": safe_str(row.get("SampleCollectionSite"))
        })

    print(f"  Loaded {len(cell_lines)} cell lines")
    return cell_lines


def load_mutations(cell_line_ids, genes_of_interest):
    """Load mutation data for specified cell lines and genes."""
    print("Loading mutations...")
    path = DATA_DIR / "mutations" / "depmap_mutations.csv"
    df = pd.read_csv(path, low_memory=False)

    # Filter to our cell lines and genes
    df = df[df["ModelID"].isin(cell_line_ids)]
    df = df[df["HugoSymbol"].isin(genes_of_interest)]

    mutations = []
    seen = set()
    for _, row in df.iterrows():
        # Deduplicate by cellLineId + gene + proteinChange
        key = (row["ModelID"], row["HugoSymbol"], safe_str(row.get("ProteinChange")))
        if key in seen:
            continue
        seen.add(key)

        mut = {
            "cellLineId": row["ModelID"],
            "gene": row["HugoSymbol"],
            "consequence": safe_str(row.get("MolecularConsequence")),
            "proteinChange": safe_str(row.get("ProteinChange")),
            "variantType": safe_str(row.get("VariantType")),
            "impact": safe_str(row.get("VepImpact")),
            "af": float(row.get("AF")) if pd.notna(row.get("AF")) else None,
            "siftPrediction": safe_str(row.get("SiftPrediction")),
            "polyphenPrediction": safe_str(row.get("PolyphenPrediction"))
        }
        mutations.append(mut)

    print(f"  Loaded {len(mutations)} mutations across {len(genes_of_interest)} genes")
    return mutations


def load_cnv(cell_line_ids, genes_of_interest):
    """Load CNV data for specified cell lines and genes."""
    print("Loading CNV data...")
    path = DATA_DIR / "cnv" / "depmap_cnv_log2.csv"
    df = pd.read_csv(path, index_col=0)

    # Map column names to gene symbols
    gene_columns = {}
    for col in df.columns:
        gene = extract_gene_from_column(col)
        if gene in genes_of_interest:
            gene_columns[col] = gene

    cnv_data = []
    for cell_id in cell_line_ids:
        if cell_id in df.index:
            for col, gene in gene_columns.items():
                log2_val = df.loc[cell_id, col]
                status = classify_cnv(log2_val)
                if status != "neutral":  # Only store non-neutral CNV (sparse)
                    cnv_data.append({
                        "cellLineId": cell_id,
                        "gene": gene,
                        "log2": round(log2_val, 3) if pd.notna(log2_val) else None,
                        "status": status
                    })

    print(f"  Loaded {len(cnv_data)} non-neutral CNV entries")
    return cnv_data


def create_genes_json():
    """Create genes.json with categories and colors."""
    return {
        "categories": GENE_CATEGORIES,
        "colors": {
            "retention": "#2E86AB",
            "egress": "#A23B72",
            "driver": "#F18F01",
            "focal": "#6B4984"
        },
        "subtypeColors": {
            "DLBCL_GCB": "#3498DB",
            "DLBCL_ABC": "#E74C3C",
            "Burkitt": "#9B59B6",
            "MCL": "#2ECC71",
            "CLL": "#F39C12",
            "PEL": "#1ABC9C",
            "Other": "#95A5A6"
        },
        "cnvColors": {
            "amp": "#E74C3C",
            "gain": "#F39C12",
            "het_loss": "#3498DB",
            "hom_del": "#1E3A5F",
            "no_data": "#F5F5F5"
        },
        "mutationColor": "#222222",
        "allGenes": sorted(set(
            gene for genes in GENE_CATEGORIES.values() for gene in genes
        ))
    }


def main():
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("BCL Cell Line Oncoprint Data Generator")
    print("=" * 50)

    # Get all genes of interest
    all_genes = set()
    for genes in GENE_CATEGORIES.values():
        all_genes.update(genes)

    # Load metadata
    cell_lines = load_metadata()
    cell_line_ids = [cl["id"] for cl in cell_lines]

    # Load mutations
    mutations = load_mutations(cell_line_ids, all_genes)

    # Load CNV
    cnv_data = load_cnv(cell_line_ids, all_genes)

    # Create genes config
    genes_config = create_genes_json()

    # Write JSON files
    print("\nWriting JSON files...")

    with open(OUTPUT_DIR / "cell_lines.json", "w") as f:
        json.dump(cell_lines, f, indent=2)
    print(f"  Wrote cell_lines.json ({len(cell_lines)} entries)")

    with open(OUTPUT_DIR / "mutations.json", "w") as f:
        json.dump(mutations, f, indent=2)
    print(f"  Wrote mutations.json ({len(mutations)} entries)")

    with open(OUTPUT_DIR / "cnv.json", "w") as f:
        json.dump(cnv_data, f, indent=2)
    print(f"  Wrote cnv.json ({len(cnv_data)} entries)")

    with open(OUTPUT_DIR / "genes.json", "w") as f:
        json.dump(genes_config, f, indent=2)
    print(f"  Wrote genes.json")

    print("\nDone!")


if __name__ == "__main__":
    main()
