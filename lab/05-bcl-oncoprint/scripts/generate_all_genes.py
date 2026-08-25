#!/usr/bin/env python3
"""
Generate comprehensive gene panels and mutation/CNV data for BCL Oncoprint.
Creates multiple predefined panels plus all frequently mutated genes.
"""

import csv
import json
from collections import defaultdict
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _SCRIPT_DIR.parent
_LAB_ROOT = _PROJECT_ROOT.parent
DEPMAP_DIR = _LAB_ROOT / "DLBCL_data" / "reference" / "DepMap"
OUTPUT_DIR = _PROJECT_ROOT / "public" / "data"

# Gene alias mapping: display-friendly names and cross-platform lookups
# Key = canonical HUGO symbol used in panels; value = dict with aliases and display name
GENE_ALIASES = {
    "BCL2L11": {"display": "BCL2L11 (BIM)", "aliases": ["BIM", "BCL2L11"]},
    "BBC3":    {"display": "BBC3 (PUMA)", "aliases": ["PUMA", "BBC3"]},
    "PMAIP1":  {"display": "PMAIP1 (NOXA)", "aliases": ["NOXA", "PMAIP1"]},
    "SPI1":    {"display": "SPI1 (PU.1)", "aliases": ["PU.1", "SPI1"]},
    # Histones: new HGNC (mutations/CNV/CRISPR) vs old (RNAi/DEMETER2)
    "H1-4":    {"display": "H1-4 (HIST1H1E)", "aliases": ["HIST1H1E", "H1-4"]},
    "H1-2":    {"display": "H1-2 (HIST1H1C)", "aliases": ["HIST1H1C", "H1-2"]},
    "H1-3":    {"display": "H1-3 (HIST1H1D)", "aliases": ["HIST1H1D", "H1-3"]},
    "H3-3A":   {"display": "H3-3A (H3F3A)", "aliases": ["H3F3A", "H3-3A"]},
    "H3-3B":   {"display": "H3-3B (H3F3B)", "aliases": ["H3F3B", "H3-3B"]},
}

# ============================================================================
# GENE PANELS - Organized by functional category
# ============================================================================

GENE_PANELS = {
    "gc_trafficking": {
        "name": "GC B-cell Trafficking",
        "description": "Genes controlling GC B-cell positioning and migration",
        "genes": {
            "retention": ["GNA13", "S1PR2", "P2RY8", "RHOA", "ARHGEF1", "CXCR4", "CXCR5"],
            "egress": ["S1PR1", "GNAI2", "RAC1", "RAC2", "CDC42"],
        }
    },
    "lymphgen_drivers": {
        "name": "LymphGen Drivers",
        "description": "Key driver genes defining LymphGen subtypes",
        "genes": {
            "MCD": ["MYD88", "CD79B", "PIM1", "TBL1XR1", "PRDM1", "BTG1", "BTG2", "ETV6", "KLHL14", "OSBPL10", "TOX"],
            "BN2": ["BCL6", "NOTCH2", "SPEN", "DTX1", "UBE2A", "BCL10", "TNFAIP3", "CCND3"],
            "N1": ["NOTCH1", "IRF4", "BRAF", "ID3", "BCL2"],
            "EZB": ["EZH2", "BCL2", "TNFRSF14", "CREBBP", "EP300", "KMT2D", "GNA13", "MEF2B", "IRF8", "STAT6"],
            "ST2": ["SGK1", "TET2", "P2RY8", "STAT3", "DUSP2", "SOCS1", "ZFP36L1", "NFKBIA"],
            "A53": ["TP53", "CDKN2A", "MYC", "FOXO1"],
        }
    },
    "chromatin_epigenetic": {
        "name": "Chromatin & Epigenetic",
        "description": "Chromatin remodeling and epigenetic modifiers",
        "genes": {
            "writers": ["EZH2", "KMT2D", "KMT2C", "KMT2A", "SETD2", "NSD2", "DOT1L"],
            "erasers": ["KDM6A", "KDM5C", "TET2"],
            "readers": ["ARID1A", "ARID1B", "SMARCA4", "SMARCB1", "PBRM1", "BRD4"],
            "acetyltransferases": ["CREBBP", "EP300", "KAT6A"],
            "deacetylases": ["HDAC1", "HDAC2", "HDAC7"],
            "histones": ["H1-4", "H1-2", "H1-3", "H3-3A", "H3-3B"],
        }
    },
    "immune_evasion": {
        "name": "Immune Evasion",
        "description": "Genes involved in immune recognition and evasion",
        "genes": {
            "mhc_class_i": ["B2M", "HLA-A", "HLA-B", "HLA-C", "TAP1", "TAP2", "NLRC5"],
            "mhc_class_ii": ["CIITA", "HLA-DRA", "HLA-DRB1", "HLA-DRB5", "CD74"],
            "checkpoints": ["CD274", "PDCD1LG2", "CD58", "FAS", "FASLG"],
            "cytokines": ["IL10", "IL6", "TGFB1", "IFNG"],
        }
    },
    "bcr_nfkb_signaling": {
        "name": "BCR/NF-kB Signaling",
        "description": "B-cell receptor and NF-kB pathway components",
        "genes": {
            "bcr_proximal": ["CD79A", "CD79B", "SYK", "BTK", "BLNK", "PLCG2"],
            "card_bcl10_malt1": ["CARD11", "BCL10", "MALT1"],
            "nfkb": ["NFKBIA", "NFKBIE", "TNFAIP3", "REL", "RELA", "RELB", "NFKB1", "NFKB2"],
            "traf": ["TRAF2", "TRAF3", "TRAF6", "BIRC3"],
        }
    },
    "jak_stat": {
        "name": "JAK/STAT Signaling",
        "description": "JAK/STAT pathway and regulators",
        "genes": {
            "jaks": ["JAK1", "JAK2", "JAK3", "TYK2"],
            "stats": ["STAT3", "STAT5A", "STAT5B", "STAT6"],
            "regulators": ["SOCS1", "SOCS3", "PTPN1", "PTPN6", "PTPN11"],
        }
    },
    "cell_cycle_apoptosis": {
        "name": "Cell Cycle & Apoptosis",
        "description": "Cell cycle regulators and apoptosis machinery",
        "genes": {
            "tumor_suppressors": ["TP53", "RB1", "CDKN2A", "CDKN2B", "CDKN1A", "CDKN1B"],
            "cyclins_cdks": ["CCND1", "CCND2", "CCND3", "CCNE1", "CDK4", "CDK6"],
            "apoptosis": ["BCL2", "BCL2L1", "MCL1", "BAX", "BAK1", "BCL2L11", "BBC3", "PMAIP1"],
            "dna_damage": ["ATM", "ATR", "CHEK1", "CHEK2", "MDM2", "MDM4"],
        }
    },
    "pi3k_akt_mtor": {
        "name": "PI3K/AKT/mTOR",
        "description": "PI3K/AKT/mTOR signaling pathway",
        "genes": {
            "pi3k": ["PIK3CA", "PIK3CB", "PIK3CD", "PIK3R1", "PIK3R2"],
            "pten": ["PTEN", "INPP4B"],
            "akt_mtor": ["AKT1", "AKT2", "MTOR", "RICTOR", "RPTOR", "TSC1", "TSC2"],
            "foxo": ["FOXO1", "FOXO3"],
        }
    },
    "transcription_factors": {
        "name": "Transcription Factors",
        "description": "Key B-cell and lymphoma transcription factors",
        "genes": {
            "b_cell_lineage": ["PAX5", "EBF1", "TCF3", "SPI1", "IRF4", "IRF8", "SPIB"],
            "gc_program": ["BCL6", "MEF2B", "MEF2C", "BATF", "BACH2"],
            "plasma_cell": ["PRDM1", "XBP1", "IRF4"],
            "myc_family": ["MYC", "MYCN", "MAX", "MXD1"],
        }
    },
    "notch_pathway": {
        "name": "NOTCH Pathway",
        "description": "NOTCH signaling components",
        "genes": {
            "receptors": ["NOTCH1", "NOTCH2", "NOTCH3", "NOTCH4"],
            "ligands": ["DLL1", "DLL3", "DLL4", "JAG1", "JAG2"],
            "modifiers": ["DTX1", "SPEN", "FBXW7", "MAML1", "RBPJ"],
        }
    },
    "rna_splicing": {
        "name": "RNA Splicing",
        "description": "Splicing factors and RNA processing",
        "genes": {
            "splicing": ["SF3B1", "U2AF1", "SRSF2", "ZRSR2", "DDX3X", "XPO1"],
        }
    },
    "focal_alterations": {
        "name": "Focal CNV Targets",
        "description": "Common focal amplification and deletion targets",
        "genes": {
            "amplifications": ["BCL2", "BCL6", "MYC", "REL", "MDM2", "CDK4", "MCL1"],
            "deletions": ["CDKN2A", "CDKN2B", "PTEN", "RB1", "TP53", "TNFAIP3", "B2M"],
        }
    },
}

# Additional frequently mutated genes to add to "all_frequent" panel
FREQUENT_GENES_THRESHOLD = 5  # Mutated in at least 5 cell lines


def get_all_panel_genes():
    """Extract all unique genes from predefined panels."""
    all_genes = set()
    for panel in GENE_PANELS.values():
        for category_genes in panel["genes"].values():
            all_genes.update(category_genes)
    return all_genes


def analyze_mutation_frequencies():
    """Analyze which genes are frequently mutated in NHL lines."""
    gene_lines = defaultdict(set)
    gene_mutations = defaultdict(list)

    with open(DEPMAP_DIR / "NHL_mutations.csv") as f:
        reader = csv.DictReader(f)
        for row in reader:
            gene = row.get("HugoSymbol", "")
            cell_id = row.get("ModelID", "")
            if gene and cell_id:
                gene_lines[gene].add(cell_id)
                gene_mutations[gene].append(row)

    return gene_lines, gene_mutations


def get_cnv_genes():
    """Get list of genes available in CNV data."""
    with open(DEPMAP_DIR / "NHL_cnv.csv") as f:
        header = f.readline().strip().split(",")

    genes = set()
    for col in header[1:]:  # Skip ModelID column
        gene = col.split(" (")[0] if " (" in col else col
        if gene:
            genes.add(gene)
    return genes


def load_cell_lines():
    """Load cell line data."""
    # Use the existing cell_lines.json we already generated
    with open(OUTPUT_DIR / "cell_lines.json") as f:
        return json.load(f)


def load_mutations_for_genes(genes_set, gene_mutations):
    """Load mutations for specified genes with full annotations."""
    mutations = []
    for gene in genes_set:
        for row in gene_mutations.get(gene, []):
            mut = {
                "cellLineId": row["ModelID"],
                "gene": gene,
                "chrom": row.get("Chrom", ""),
                "pos": row.get("Pos", ""),
                "ref": row.get("Ref", ""),
                "alt": row.get("Alt", ""),
                "proteinChange": row.get("ProteinChange", ""),
                "dnaChange": row.get("DNAChange", ""),
                "consequence": row.get("MolecularConsequence", ""),
                "impact": row.get("VepImpact", ""),
                "variantType": row.get("VariantType", ""),
                "af": float(row.get("AF", 0) or 0),
                "hotspot": row.get("Hotspot", "False") == "True",
                # Database IDs for linking
                "dbsnpId": row.get("DbsnpRsID", ""),
                "cosmicId": row.get("VepExistingVariation", ""),  # Often contains COSM IDs
                "civicId": row.get("CivicID", ""),
                "civicDescription": row.get("CivicDescription", ""),
                "civicScore": row.get("CivicScore", ""),
                # Clinical significance
                "clinvar": row.get("VepClinSig", ""),
                # Functional predictions
                "sift": row.get("Sift", ""),
                "polyphen": row.get("Polyphen", ""),
                "revel": row.get("RevelScore", ""),
                # Population frequency
                "gnomadAF": row.get("GnomadeAF", ""),
                # Driver annotations
                "oncogeneHighImpact": row.get("OncogeneHighImpact", "False") == "True",
                "tumorSuppressorHighImpact": row.get("TumorSuppressorHighImpact", "False") == "True",
                "hessDriver": row.get("HessDriver", ""),
                "likelyLoF": row.get("LikelyLoF", "False") == "True",
                # Other IDs
                "entrezGeneId": row.get("EntrezGeneID", ""),
                "ensemblTranscript": row.get("EnsemblFeatureID", ""),
                "uniprotId": row.get("UniprotID", ""),
            }
            mutations.append(mut)
    return mutations


def load_cnv_for_genes(genes_set):
    """Load CNV data for specified genes."""
    cnv_data = []

    with open(DEPMAP_DIR / "NHL_cnv.csv") as f:
        header = f.readline().strip().split(",")

    # Map gene names to column indices
    gene_cols = {}
    for i, col in enumerate(header):
        if i == 0:
            continue
        gene = col.split(" (")[0] if " (" in col else col
        if gene in genes_set:
            gene_cols[gene] = i

    with open(DEPMAP_DIR / "NHL_cnv.csv") as f:
        reader = csv.reader(f)
        next(reader)  # Skip header
        for row in reader:
            cell_id = row[0]
            for gene, col_idx in gene_cols.items():
                try:
                    cn_ratio = float(row[col_idx])
                except (ValueError, IndexError):
                    continue

                # Data is relative copy number (CN/ploidy), centered at 1.0
                # NOT log2 values despite the source file name
                # 1.0 = diploid normal, 0.5 = het loss, 0.0 = hom del, 2.0 = doubled
                if cn_ratio < 0.25:
                    status = "hom_del"
                elif cn_ratio < 0.75:
                    status = "het_loss"
                elif cn_ratio > 1.75:
                    status = "amp"
                elif cn_ratio > 1.25:
                    status = "gain"
                else:
                    status = "neutral"

                cnv_data.append({
                    "cellLineId": cell_id,
                    "gene": gene,
                    "copyRatio": round(cn_ratio, 4),
                    "status": status
                })

    return cnv_data


def main():
    print("Analyzing mutation frequencies...")
    gene_lines, gene_mutations = analyze_mutation_frequencies()

    print("Getting CNV genes...")
    cnv_genes = get_cnv_genes()
    print(f"  {len(cnv_genes)} genes in CNV data")

    # Get all predefined panel genes
    panel_genes = get_all_panel_genes()
    print(f"\nPredefined panel genes: {len(panel_genes)}")

    # Find frequently mutated genes not in panels
    frequent_genes = {
        gene for gene, lines in gene_lines.items()
        if len(lines) >= FREQUENT_GENES_THRESHOLD
    }
    print(f"Frequently mutated genes (>={FREQUENT_GENES_THRESHOLD} lines): {len(frequent_genes)}")

    # Add frequent genes to a new panel
    novel_frequent = frequent_genes - panel_genes
    print(f"Novel frequent genes (not in panels): {len(novel_frequent)}")

    # Combined gene set
    all_genes = panel_genes | frequent_genes
    print(f"\nTotal unique genes: {len(all_genes)}")

    # Check overlap with CNV
    genes_with_cnv = all_genes & cnv_genes
    print(f"Genes with CNV data: {len(genes_with_cnv)}")

    # Build the gene panels structure for the app
    print("\nBuilding gene panels...")

    panels_output = {}

    for panel_id, panel_data in GENE_PANELS.items():
        panels_output[panel_id] = {
            "name": panel_data["name"],
            "description": panel_data["description"],
            "categories": panel_data["genes"],
            "allGenes": sorted(set(g for genes in panel_data["genes"].values() for g in genes))
        }

    # Add frequently mutated panel
    # Sort by mutation frequency
    freq_sorted = sorted(frequent_genes, key=lambda g: -len(gene_lines[g]))

    panels_output["frequently_mutated"] = {
        "name": "Frequently Mutated",
        "description": f"Genes mutated in {FREQUENT_GENES_THRESHOLD}+ cell lines",
        "categories": {
            "top_20": freq_sorted[:20],
            "top_50": freq_sorted[20:50],
            "other": freq_sorted[50:100],
        },
        "allGenes": freq_sorted[:100]  # Top 100 for this panel
    }

    # Create gene info with mutation counts
    gene_info = {}
    for gene in all_genes:
        n_lines = len(gene_lines.get(gene, set()))
        n_mutations = len(gene_mutations.get(gene, []))
        info = {
            "mutatedLines": n_lines,
            "totalMutations": n_mutations,
            "hasCNV": gene in cnv_genes
        }
        # Add display name for aliased genes
        if gene in GENE_ALIASES:
            info["displayName"] = GENE_ALIASES[gene]["display"]
            info["aliases"] = GENE_ALIASES[gene]["aliases"]
        gene_info[gene] = info

    # Load mutations and CNV for all genes
    print("\nLoading mutations for all genes...")
    mutations = load_mutations_for_genes(all_genes, gene_mutations)
    print(f"  {len(mutations)} mutations")

    print("Loading CNV for all genes...")
    cnv = load_cnv_for_genes(all_genes)
    print(f"  {len(cnv)} CNV entries")

    # Build genes.json with panels
    genes_output = {
        "panels": panels_output,
        "defaultPanel": "gc_trafficking",
        "geneInfo": gene_info,
        "subtypeColors": {
            "DLBCL_GCB": "#3b82f6",
            "DLBCL_ABC": "#ef4444",
            "Burkitt": "#a855f7",
            "MCL": "#22c55e",
            "CLL": "#eab308",
            "PEL": "#14b8a6",
            "FL": "#f97316",
            "MZL": "#06b6d4",
            "PMBL": "#f472b6",
            "Other": "#6b7280",
            "Contaminated": "#991b1b"
        },
        "categoryColors": {
            # GC Trafficking
            "retention": "#3b82f6",
            "egress": "#ec4899",
            # LymphGen
            "MCD": "#ef4444",
            "BN2": "#f97316",
            "N1": "#eab308",
            "EZB": "#22c55e",
            "ST2": "#14b8a6",
            "A53": "#6366f1",
            # Chromatin
            "writers": "#8b5cf6",
            "erasers": "#d946ef",
            "readers": "#ec4899",
            "acetyltransferases": "#f43f5e",
            "deacetylases": "#f97316",
            "histones": "#eab308",
            # Immune
            "mhc_class_i": "#3b82f6",
            "mhc_class_ii": "#0ea5e9",
            "checkpoints": "#06b6d4",
            "cytokines": "#14b8a6",
            # Signaling
            "bcr_proximal": "#ef4444",
            "card_bcl10_malt1": "#f97316",
            "nfkb": "#eab308",
            "traf": "#84cc16",
            "jaks": "#22c55e",
            "stats": "#10b981",
            "regulators": "#14b8a6",
            # Cell cycle
            "tumor_suppressors": "#6366f1",
            "cyclins_cdks": "#8b5cf6",
            "apoptosis": "#a855f7",
            "dna_damage": "#d946ef",
            # PI3K
            "pi3k": "#ec4899",
            "pten": "#f43f5e",
            "akt_mtor": "#f97316",
            "foxo": "#fb923c",
            # TFs
            "b_cell_lineage": "#3b82f6",
            "gc_program": "#0ea5e9",
            "plasma_cell": "#06b6d4",
            "myc_family": "#14b8a6",
            # Notch
            "receptors": "#8b5cf6",
            "ligands": "#a855f7",
            "modifiers": "#c084fc",
            # RNA
            "splicing": "#6366f1",
            # Focal
            "amplifications": "#ef4444",
            "deletions": "#3b82f6",
            # Frequent
            "top_20": "#1e293b",
            "top_50": "#475569",
            "other": "#94a3b8",
        },
        "cnvColors": {
            "amp": "#fecaca",
            "gain": "#fed7aa",
            "het_loss": "#bfdbfe",
            "hom_del": "#93c5fd",
            "neutral": "#f1f5f9",
        },
        "mutationColor": "#1e293b",
    }

    # Save files
    print("\nSaving output files...")

    with open(OUTPUT_DIR / "genes.json", "w") as f:
        json.dump(genes_output, f, indent=2)
    print("  Saved genes.json")

    # Minify large data files for faster browser loading
    with open(OUTPUT_DIR / "mutations.json", "w") as f:
        json.dump(mutations, f, separators=(",", ":"))
    print(f"  Saved mutations.json (minified)")

    with open(OUTPUT_DIR / "cnv.json", "w") as f:
        json.dump(cnv, f, separators=(",", ":"))
    print(f"  Saved cnv.json (minified)")

    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Gene panels: {len(panels_output)}")
    for panel_id, panel in panels_output.items():
        print(f"  - {panel['name']}: {len(panel['allGenes'])} genes")
    print(f"\nTotal unique genes: {len(all_genes)}")
    print(f"Total mutations: {len(mutations)}")
    print(f"Total CNV entries: {len(cnv)}")


if __name__ == "__main__":
    main()
