"""
Annotate Differentially Expressed Probes with Gene Symbols
Uses GPL14951 (Illumina DASL) platform annotation
"""

import pandas as pd
import urllib.request
import gzip
import io
import os

print("=" * 60)
print("Annotating DE Probes with Gene Symbols")
print("=" * 60 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")

# =============================================================================
# 1. Load DE Results
# =============================================================================

print("Loading DE results...")
de_results = pd.read_csv(os.path.join(results_dir, "gcb_expression_by_stage.csv"))
print(f"Total probes: {len(de_results)}")
print(f"FDR < 0.1: {(de_results['FDR'] < 0.1).sum()}")
print(f"P < 0.01: {(de_results['P_value'] < 0.01).sum()}\n")

# =============================================================================
# 2. Download GPL14951 Annotation
# =============================================================================

print("Downloading GPL14951 annotation...")

# Use the SOFT format which is more parseable
gpl_url = "https://ftp.ncbi.nlm.nih.gov/geo/platforms/GPL14nnn/GPL14951/soft/GPL14951_family.soft.gz"

try:
    with urllib.request.urlopen(gpl_url, timeout=120) as response:
        print("Downloaded GPL annotation file")

        # Decompress and parse
        content = gzip.decompress(response.read()).decode('utf-8', errors='ignore')
        lines = content.split('\n')

        # Find the table section
        table_start = None
        table_end = None
        for i, line in enumerate(lines):
            if line.startswith("!platform_table_begin"):
                table_start = i + 1
            elif line.startswith("!platform_table_end"):
                table_end = i
                break

        if table_start and table_end:
            print(f"Found annotation table: lines {table_start} to {table_end}")

            # Parse table
            table_content = '\n'.join(lines[table_start:table_end])
            annot_df = pd.read_csv(io.StringIO(table_content), sep='\t',
                                   low_memory=False, on_bad_lines='skip')

            print(f"Annotation columns: {list(annot_df.columns)}")
            print(f"Annotation entries: {len(annot_df)}")

            # Find ID and Symbol columns
            id_cols = [c for c in annot_df.columns if c.upper() in ['ID', 'PROBE_ID', 'ID_REF']]
            symbol_cols = [c for c in annot_df.columns if 'SYMBOL' in c.upper() or 'GENE' in c.upper()]

            print(f"\nID columns found: {id_cols}")
            print(f"Symbol columns found: {symbol_cols}")

except Exception as e:
    print(f"Download failed: {e}")
    annot_df = None

# =============================================================================
# 3. Alternative: Check if annotation already exists locally
# =============================================================================

if annot_df is None or len(annot_df) == 0:
    print("\nChecking for local annotation...")

    # Try to see if there's already an annotation file
    local_annot = os.path.join(lacy_dir, "GPL14951_annotation.csv")
    if os.path.exists(local_annot):
        annot_df = pd.read_csv(local_annot)
        print(f"Loaded local annotation: {len(annot_df)} entries")

# =============================================================================
# 4. Merge Annotation with DE Results
# =============================================================================

print("\n" + "=" * 60)
print("Merging Annotation with DE Results")
print("=" * 60 + "\n")

if annot_df is not None and len(annot_df) > 0:
    # Find the right columns
    id_col = None
    symbol_col = None

    for col in annot_df.columns:
        if col.upper() == 'ID':
            id_col = col
        if 'SYMBOL' in col.upper():
            symbol_col = col

    if id_col and symbol_col:
        # Create mapping
        annot_map = annot_df[[id_col, symbol_col]].copy()
        annot_map.columns = ['Probe', 'Gene_Symbol']
        annot_map = annot_map.dropna(subset=['Gene_Symbol'])
        annot_map = annot_map[annot_map['Gene_Symbol'] != '']

        print(f"Probes with gene symbols: {len(annot_map)}")

        # Merge with DE results
        de_annotated = de_results.merge(annot_map, on='Probe', how='left')

        # Sort by p-value
        de_annotated = de_annotated.sort_values('P_value')

        annotated_count = de_annotated['Gene_Symbol'].notna().sum()
        print(f"DE probes annotated: {annotated_count} / {len(de_annotated)}")

        # =============================================================
        # Show Results
        # =============================================================

        print("\n" + "=" * 60)
        print("TOP GENES BY STAGE ASSOCIATION (GCB-DLBCL)")
        print("=" * 60 + "\n")

        # Filter to annotated probes
        annotated = de_annotated[de_annotated['Gene_Symbol'].notna()].copy()

        # Top 30 overall
        print("Top 30 Differentially Expressed Genes:")
        print("-" * 50)
        top30 = annotated.head(30)
        for i, row in top30.iterrows():
            direction = "↑" if row['Direction'] == "Advanced-high" else "↓"
            fdr_str = f"FDR={row['FDR']:.4f}" if row['FDR'] < 0.1 else f"p={row['P_value']:.2e}"
            print(f"  {row['Gene_Symbol']:15s} {direction} Adv  {fdr_str:20s} FC={row['Log2FC']:.3f}")

        # Significant genes by direction
        sig = annotated[annotated['FDR'] < 0.1]

        print(f"\n\nSignificant Genes (FDR < 0.1): {len(sig)}")
        print("-" * 50)

        limited_high = sig[sig['Direction'] == 'Limited-high'].sort_values('P_value')
        advanced_high = sig[sig['Direction'] == 'Advanced-high'].sort_values('P_value')

        print(f"\nHIGHER in Limited Stage (I-II): {len(limited_high)} genes")
        if len(limited_high) > 0:
            print("-" * 40)
            for i, row in limited_high.head(20).iterrows():
                print(f"  {row['Gene_Symbol']:15s} FDR={row['FDR']:.4f}  FC={row['Log2FC']:.3f}")

        print(f"\nHIGHER in Advanced Stage (III-IV): {len(advanced_high)} genes")
        if len(advanced_high) > 0:
            print("-" * 40)
            for i, row in advanced_high.head(20).iterrows():
                print(f"  {row['Gene_Symbol']:15s} FDR={row['FDR']:.4f}  FC={row['Log2FC']:.3f}")

        # Look for pathway-related genes
        print("\n" + "=" * 60)
        print("PATHWAY ANALYSIS")
        print("=" * 60 + "\n")

        # Egress/Retention pathway
        egress_genes = ['S1PR1', 'S1PR2', 'GNA13', 'RHOA', 'P2RY8', 'CXCR4', 'SGK1',
                       'GNAI2', 'RAC2', 'ARHGEF1', 'ARHGAP25', 'S1PR1', 'FOXO1']

        pathway_hits = annotated[annotated['Gene_Symbol'].isin(egress_genes)]
        print(f"Egress/Retention Pathway Genes in DE results: {len(pathway_hits)}")
        if len(pathway_hits) > 0:
            for i, row in pathway_hits.iterrows():
                sig_str = "*" if row['FDR'] < 0.1 else ""
                print(f"  {row['Gene_Symbol']:15s} p={row['P_value']:.4f} FC={row['Log2FC']:.3f} {sig_str}")

        # B-cell/lymphoma related
        bcell_genes = ['BCL2', 'BCL6', 'MYC', 'CD19', 'CD20', 'MS4A1', 'PAX5',
                      'IRF4', 'PRDM1', 'XBP1', 'CD38', 'CD27', 'AICDA']

        bcell_hits = annotated[annotated['Gene_Symbol'].isin(bcell_genes)]
        print(f"\nB-cell/Lymphoma Markers in DE results: {len(bcell_hits)}")
        if len(bcell_hits) > 0:
            for i, row in bcell_hits.iterrows():
                sig_str = "*" if row['FDR'] < 0.1 else ""
                print(f"  {row['Gene_Symbol']:15s} p={row['P_value']:.4f} FC={row['Log2FC']:.3f} {sig_str}")

        # Cell adhesion/migration
        migration_genes = ['ITGB1', 'ITGB2', 'ITGA4', 'ICAM1', 'VCAM1', 'CCR7',
                          'CXCR5', 'CCL19', 'CCL21', 'SELL', 'CD62L', 'VLA4']

        migration_hits = annotated[annotated['Gene_Symbol'].isin(migration_genes)]
        print(f"\nMigration/Adhesion Genes in DE results: {len(migration_hits)}")
        if len(migration_hits) > 0:
            for i, row in migration_hits.iterrows():
                sig_str = "*" if row['FDR'] < 0.1 else ""
                print(f"  {row['Gene_Symbol']:15s} p={row['P_value']:.4f} FC={row['Log2FC']:.3f} {sig_str}")

        # Save annotated results
        output_file = os.path.join(results_dir, "gcb_de_genes_by_stage_annotated.csv")
        de_annotated.to_csv(output_file, index=False)
        print(f"\n\nSaved: {output_file}")

        # Create summary table of significant genes
        if len(sig) > 0:
            sig_summary = sig[['Gene_Symbol', 'Log2FC', 'P_value', 'FDR', 'Direction']].copy()
            sig_summary.to_csv(os.path.join(results_dir, "gcb_de_significant_genes.csv"),
                              index=False)
            print(f"Saved: gcb_de_significant_genes.csv ({len(sig)} genes)")
    else:
        print(f"Could not find ID or Symbol columns. Available: {list(annot_df.columns)}")
else:
    print("No annotation available - showing probe IDs only")

    print("\nTop 30 DE Probes (FDR < 0.1 or top by p-value):")
    top = de_results.head(30)
    for i, row in top.iterrows():
        direction = "↑" if row['Direction'] == "Advanced-high" else "↓"
        print(f"  {row['Probe']:20s} {direction} Adv  FDR={row['FDR']:.4f}  FC={row['Log2FC']:.3f}")

print("\n" + "=" * 60)
print("ANNOTATION COMPLETE")
print("=" * 60)
