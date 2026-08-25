#!/usr/bin/env python3
"""
Generate properly formatted input files for the LymphGen v2.0 web tool.
https://llmpp.ccr.cancer.gov/lymphgen/

Reads our existing mutation/CNV/fusion data and outputs 5 tab-delimited
files matching the tool's exact specification.

Output directory: scripts/lymphgen_input/
"""

import json
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "public" / "data"
OUTPUT_DIR = SCRIPT_DIR / "lymphgen_input"

# Well-known Entrez IDs for genes that may not appear in our mutation data
# (e.g., MYD88 has zero mutations in DepMap WES)
ENTREZ_FALLBACK = {
    "MYD88": "4615",
    "ETS1": "2113",
    "HIST1H1E": "3008",
    "TMEM30A": "55754",
    "CD70": "970",
    "OSBPL10": "114884",
    "TBL1XR1": "79718",
    "TOX": "9760",
    "FOXO1": "2308",
    "NFKBIE": "4794",
    "NFKBIA": "4792",
    "MYC": "4609",
    "CCND3": "896",
    "TCF3": "6929",
    "ID3": "3399",
    "RHOA": "387",
    "CD79A": "973",
    "TNFAIP3": "7128",
    "BIRC3": "330",
    "BCL10": "8915",
    "MALT1": "10892",
    "IKBKB": "3551",
    "TRAF3": "7187",
}


def load_data():
    with open(DATA_DIR / "cell_lines.json", encoding="utf-8") as f:
        cell_lines = json.load(f)
    with open(DATA_DIR / "mutations.json", encoding="utf-8") as f:
        mutations = json.load(f)
    with open(DATA_DIR / "cnv.json", encoding="utf-8") as f:
        cnv = json.load(f)
    with open(DATA_DIR / "fusions.json", encoding="utf-8") as f:
        fusions = json.load(f)
    return cell_lines, mutations, cnv, fusions


def get_entrez_map(mutations):
    """Build gene -> entrez ID mapping from mutation data."""
    gene_entrez = {}
    for m in mutations:
        eid = m.get("entrezGeneId", "")
        if eid:
            gene_entrez[m["gene"]] = str(eid)
    # Add fallbacks
    for gene, eid in ENTREZ_FALLBACK.items():
        if gene not in gene_entrez:
            gene_entrez[gene] = eid
    return gene_entrez


def classify_mutation_type(mut):
    """Map our mutation data to LymphGen Type values: TRUNC, MUTATION, Synon, L265P."""
    gene = mut.get("gene", "")
    pc = mut.get("proteinChange", "")
    impact = mut.get("impact", "")
    consequence = mut.get("consequence", "")

    # Special case: MYD88 L265P
    if gene == "MYD88" and "L265P" in pc:
        return "L265P"

    # HIGH impact = truncating
    if impact == "HIGH":
        return "TRUNC"

    # LOW impact = synonymous (LymphGen uses these for SHM detection near BCL2/BCL6)
    if impact == "LOW":
        return "Synon"

    # MODERATE = missense / in-frame indel
    if impact == "MODERATE":
        return "MUTATION"

    # Default to MUTATION
    return "MUTATION"


def get_cnv_type(status):
    """Map our CNV status to LymphGen Copy Number Type."""
    mapping = {
        "amp": "AMP",
        "gain": "GAIN",
        "het_loss": "HETLOSS",
        "hom_del": "HOMDEL",
    }
    return mapping.get(status)


def has_bcl2_transloc(fusions):
    """Check for BCL2-IGH translocation."""
    for fu in fusions:
        left = (fu.get("leftGene") or "").split()[0]
        right = (fu.get("rightGene") or "").split()[0]
        left_n = "IGH" if left.startswith("IGH") else left
        right_n = "IGH" if right.startswith("IGH") else right
        if (left == "BCL2" and right_n == "IGH") or (right == "BCL2" and left_n == "IGH"):
            return True
    return False


def has_bcl6_transloc(fusions):
    """Check for BCL6 rearrangement (any partner)."""
    for fu in fusions:
        left = (fu.get("leftGene") or "").split()[0]
        right = (fu.get("rightGene") or "").split()[0]
        if left == "BCL6" or right == "BCL6":
            return True
    return False


def main():
    print("Generating LymphGen v2.0 web tool input files...")
    print()

    cell_lines, mutations, cnv_list, fusions_dict = load_data()
    entrez_map = get_entrez_map(mutations)

    # Only DLBCL lines
    dlbcl = [cl for cl in cell_lines if cl["subtype"] in ("DLBCL_GCB", "DLBCL_ABC")]
    dlbcl_ids = {cl["id"] for cl in dlbcl}

    print(f"  {len(dlbcl)} DLBCL cell lines")

    # Build mutation map by cell line
    mut_by_cl = {}
    for m in mutations:
        if m["cellLineId"] not in dlbcl_ids:
            continue
        cl = m["cellLineId"]
        if cl not in mut_by_cl:
            mut_by_cl[cl] = []
        mut_by_cl[cl].append(m)

    # Build CNV map by cell line
    cnv_by_cl = {}
    for c in cnv_list:
        if c["cellLineId"] not in dlbcl_ids:
            continue
        cl = c["cellLineId"]
        if cl not in cnv_by_cl:
            cnv_by_cl[cl] = []
        cnv_by_cl[cl].append(c)

    cl_name_map = {cl["id"]: cl["name"] for cl in dlbcl}

    OUTPUT_DIR.mkdir(exist_ok=True)

    # ── 1. Sample Annotation ──
    samp_path = OUTPUT_DIR / "sample_annotation.txt"
    with open(samp_path, "w", newline="") as f:
        f.write("Sample.ID\tCopy.Number\tBCL2.transloc\tBCL6.transloc\n")
        for cl in dlbcl:
            name = cl["name"]
            fus = fusions_dict.get(cl["id"], [])
            # KLINE lines have no DepMap data (no CNV)
            has_cn = 0 if cl["id"].startswith("KLINE-") else 1
            bcl2_t = 1 if has_bcl2_transloc(fus) else 0
            bcl6_t = 1 if has_bcl6_transloc(fus) else 0
            f.write(f"{name}\t{has_cn}\t{bcl2_t}\t{bcl6_t}\n")
    print(f"  Written: {samp_path.name}")

    # ── 2. Mutation Flat File ──
    # NOTE: Location column intentionally OMITTED. LymphGen uses hg19 positions
    # for gene-specific filtering (EZH2 SET domain, NOTCH1/2 PEST, CD79B ITAM).
    # Our DepMap data uses hg38, which is ~303kb offset on chr7 — causing the
    # tool to silently discard EZH2 hotspot mutations. Without Location, the
    # tool includes all mutations and relies on gene+type only.
    mut_path = OUTPUT_DIR / "mutation_flat.txt"
    all_mut_entrez = set()
    mut_rows = 0
    with open(mut_path, "w", newline="") as f:
        f.write("Sample\tENTREZ.ID\tType\n")
        for cl in dlbcl:
            cl_muts = mut_by_cl.get(cl["id"], [])
            for m in cl_muts:
                eid = entrez_map.get(m["gene"])
                if not eid:
                    continue
                mtype = classify_mutation_type(m)
                f.write(f"{cl['name']}\t{eid}\t{mtype}\n")
                all_mut_entrez.add(eid)
                mut_rows += 1
    print(f"  Written: {mut_path.name} ({mut_rows} rows, no Location column - hg38/hg19 fix)")

    # ── 3. Mutation Gene List ──
    # Must include ALL genes that were analyzed (not just mutated)
    # Use all genes from our panel + all genes with mutations
    all_genes_with_entrez = set()
    for m in mutations:
        eid = entrez_map.get(m["gene"])
        if eid:
            all_genes_with_entrez.add(eid)
    # Also add key LymphGen genes even if no mutations
    for gene, eid in ENTREZ_FALLBACK.items():
        all_genes_with_entrez.add(eid)
    for gene, eid in entrez_map.items():
        all_genes_with_entrez.add(eid)

    mut_genelist_path = OUTPUT_DIR / "mutation_genelist.txt"
    with open(mut_genelist_path, "w", newline="") as f:
        f.write("ENTREZ.ID\n")
        for eid in sorted(all_genes_with_entrez, key=int):
            f.write(f"{eid}\n")
    print(f"  Written: {mut_genelist_path.name} ({len(all_genes_with_entrez)} genes)")

    # ── 4. Copy Number Flat File ──
    cnv_path = OUTPUT_DIR / "cnv_flat.txt"
    all_cnv_entrez = set()
    cnv_rows = 0
    with open(cnv_path, "w", newline="") as f:
        f.write("Sample.ID\tENTREZ.ID\tType\n")
        for cl in dlbcl:
            if cl["id"].startswith("KLINE-"):
                continue  # No CNV data for KLINE lines
            cl_cnv = cnv_by_cl.get(cl["id"], [])
            for c in cl_cnv:
                if c["status"] == "neutral":
                    continue
                eid = entrez_map.get(c["gene"])
                if not eid:
                    continue
                ctype = get_cnv_type(c["status"])
                if not ctype:
                    continue
                f.write(f"{cl['name']}\t{eid}\t{ctype}\n")
                all_cnv_entrez.add(eid)
                cnv_rows += 1
    print(f"  Written: {cnv_path.name} ({cnv_rows} rows)")

    # ── 5. Copy Number Gene List ──
    # Include all genes in our CNV data
    all_cnv_genes = set()
    for c in cnv_list:
        eid = entrez_map.get(c["gene"])
        if eid:
            all_cnv_genes.add(eid)

    cnv_genelist_path = OUTPUT_DIR / "cnv_genelist.txt"
    with open(cnv_genelist_path, "w", newline="") as f:
        f.write("ENTREZ.ID\n")
        for eid in sorted(all_cnv_genes, key=int):
            f.write(f"{eid}\n")
    print(f"  Written: {cnv_genelist_path.name} ({len(all_cnv_genes)} genes)")

    # ── Summary ──
    print()
    print("  Upload these files to: https://llmpp.ccr.cancer.gov/lymphgen/")
    print("  Select LymphGen 2.0, Full Copy Number, check all subtypes.")
    print()
    print("  Sample annotation preview:")
    for cl in dlbcl[:5]:
        fus = fusions_dict.get(cl["id"], [])
        has_cn = 0 if cl["id"].startswith("KLINE-") else 1
        bcl2 = 1 if has_bcl2_transloc(fus) else 0
        bcl6 = 1 if has_bcl6_transloc(fus) else 0
        print(f"    {cl['name']:20s}  CN={has_cn}  BCL2.t={bcl2}  BCL6.t={bcl6}")
    print(f"    ... ({len(dlbcl)} total)")


if __name__ == "__main__":
    main()
