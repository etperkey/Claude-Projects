"""
Annotate Differentially Expressed Probes
Using direct GEO download with proper handling
"""

import pandas as pd
import urllib.request
import gzip
import io
import os
import ssl

print("=" * 60)
print("Annotating DE Probes with Gene Symbols")
print("=" * 60 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")

# Disable SSL verification
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# =============================================================================
# 1. Load DE Results
# =============================================================================

print("Loading DE results...")
de_results = pd.read_csv(os.path.join(results_dir, "gcb_expression_by_stage.csv"))
print(f"Total probes: {len(de_results)}")
print(f"FDR < 0.1: {(de_results['FDR'] < 0.1).sum()}")

# =============================================================================
# 2. Try to download annotation
# =============================================================================

print("\nDownloading GPL14951 annotation (SOFT format)...")

# Try the simple SOFT format from GEO FTP
annot_url = "https://ftp.ncbi.nlm.nih.gov/geo/platforms/GPL14nnn/GPL14951/annot/GPL14951.annot.gz"

annot_df = None

try:
    print(f"Trying: {annot_url}")
    req = urllib.request.Request(annot_url)
    req.add_header('User-Agent', 'Mozilla/5.0')

    with urllib.request.urlopen(req, timeout=120, context=ssl_context) as response:
        data = gzip.decompress(response.read()).decode('utf-8', errors='ignore')

        # Find table start
        lines = data.split('\n')
        table_start = None
        for i, line in enumerate(lines):
            if line.startswith('#ID'):
                table_start = i
                break
            if line.startswith('ID\t'):
                table_start = i
                break

        if table_start:
            # Read from table start
            table_lines = '\n'.join(lines[table_start:])
            annot_df = pd.read_csv(io.StringIO(table_lines), sep='\t',
                                  low_memory=False, on_bad_lines='skip')
            print(f"Loaded annotation: {len(annot_df)} entries")
            print(f"Columns: {list(annot_df.columns)[:10]}")

except Exception as e:
    print(f"Download failed: {e}")

# =============================================================================
# 3. Alternative: Use probe ID pattern matching for known genes
# =============================================================================

if annot_df is None or len(annot_df) == 0:
    print("\nUsing manual annotation lookup...")

    # Create a manual mapping for key genes (known Illumina probe IDs)
    # These are common DASL probes for key genes
    manual_map = {
        # Egress/Retention pathway
        'ILMN_1812452': 'S1PR2',
        'ILMN_1758906': 'GNA13',
        'ILMN_1772370': 'ARHGEF1',
        'ILMN_1781290': 'RHOA',
        'ILMN_1768284': 'P2RY8',
        'ILMN_1658853': 'ARHGAP25',
        'ILMN_2246410': 'CXCR4',
        'ILMN_1775762': 'GNAI2',
        'ILMN_1709795': 'RAC2',
        'ILMN_3229324': 'SGK1',
        'ILMN_1717967': 'FOXO1',
        # B-cell markers
        'ILMN_1682628': 'BCL2',
        'ILMN_1680913': 'BCL6',
        'ILMN_1756204': 'MYC',
        'ILMN_1737063': 'CD19',
        'ILMN_1695549': 'MS4A1',
        'ILMN_1676470': 'PAX5',
        'ILMN_1793839': 'IRF4',
        'ILMN_1780321': 'PRDM1',
        # Cell cycle
        'ILMN_1737733': 'MKI67',
        'ILMN_1656287': 'PCNA',
    }

    annot_df = pd.DataFrame([
        {'Probe': k, 'Gene_Symbol': v} for k, v in manual_map.items()
    ])
    print(f"Manual annotation: {len(annot_df)} probes")

# =============================================================================
# 4. Process annotation and merge
# =============================================================================

if annot_df is not None and len(annot_df) > 0:
    # Find columns
    id_col = None
    symbol_col = None

    for col in annot_df.columns:
        col_upper = col.upper()
        if col_upper == 'ID' or col_upper == 'PROBE':
            id_col = col
        if 'SYMBOL' in col_upper or col_upper == 'GENE_SYMBOL':
            symbol_col = col

    if id_col and symbol_col:
        print(f"\nUsing columns: ID={id_col}, Symbol={symbol_col}")

        # Create clean mapping
        annot_clean = annot_df[[id_col, symbol_col]].copy()
        annot_clean.columns = ['Probe', 'Gene_Symbol']
        annot_clean = annot_clean.dropna()
        annot_clean = annot_clean[annot_clean['Gene_Symbol'] != '']
        annot_clean = annot_clean.drop_duplicates(subset=['Probe'])

        print(f"Valid annotations: {len(annot_clean)}")

        # Save for future use
        annot_file = os.path.join(lacy_dir, "GPL14951_annotation.csv")
        annot_clean.to_csv(annot_file, index=False)
        print(f"Saved: {annot_file}")

        # Merge with DE results
        de_annotated = de_results.merge(annot_clean, on='Probe', how='left')
        de_annotated = de_annotated.sort_values('P_value')

        annotated_count = de_annotated['Gene_Symbol'].notna().sum()
        print(f"\nAnnotated probes: {annotated_count} / {len(de_annotated)}")

        # =============================================================
        # Show Results
        # =============================================================

        print("\n" + "=" * 60)
        print("TOP GENES BY STAGE ASSOCIATION (GCB-DLBCL)")
        print("=" * 60 + "\n")

        annotated = de_annotated[de_annotated['Gene_Symbol'].notna()].copy()

        print("Top 30 Differentially Expressed Genes:")
        print("-" * 60)
        for idx, row in annotated.head(30).iterrows():
            direction = "^ Adv" if row['Direction'] == "Advanced-high" else "v Adv"
            fdr_str = f"FDR={row['FDR']:.4f}" if row['FDR'] < 0.1 else f"p={row['P_value']:.2e}"
            print(f"  {row['Gene_Symbol']:15s} {direction:8s} {fdr_str:20s} FC={row['Log2FC']:.3f}")

        # Significant genes
        sig = annotated[annotated['FDR'] < 0.1]
        print(f"\n\nSIGNIFICANT GENES (FDR < 0.1): {len(sig)}")

        limited_high = sig[sig['Direction'] == 'Limited-high']
        advanced_high = sig[sig['Direction'] == 'Advanced-high']

        print(f"  Limited-high (I-II): {len(limited_high)}")
        print(f"  Advanced-high (III-IV): {len(advanced_high)}")

        if len(limited_high) > 0:
            print("\nLimited-high genes:")
            for idx, row in limited_high.head(15).iterrows():
                print(f"    {row['Gene_Symbol']:15s} FDR={row['FDR']:.4f}")

        if len(advanced_high) > 0:
            print("\nAdvanced-high genes:")
            for idx, row in advanced_high.head(15).iterrows():
                print(f"    {row['Gene_Symbol']:15s} FDR={row['FDR']:.4f}")

        # Save results
        output_file = os.path.join(results_dir, "gcb_de_genes_by_stage_annotated.csv")
        de_annotated.to_csv(output_file, index=False)
        print(f"\nSaved: {output_file}")

    elif 'Probe' in annot_df.columns and 'Gene_Symbol' in annot_df.columns:
        # Already in right format (manual)
        print("\nUsing manual annotation mapping...")

        de_annotated = de_results.merge(annot_df, on='Probe', how='left')
        de_annotated = de_annotated.sort_values('P_value')

        # Check pathway genes
        print("\n" + "=" * 60)
        print("PATHWAY GENE ANALYSIS")
        print("=" * 60 + "\n")

        annotated = de_annotated[de_annotated['Gene_Symbol'].notna()]
        print(f"Probes with gene annotation: {len(annotated)}")

        for idx, row in annotated.iterrows():
            sig_str = "***" if row['FDR'] < 0.1 else ("*" if row['P_value'] < 0.05 else "")
            print(f"  {row['Gene_Symbol']:15s} p={row['P_value']:.4f} FDR={row['FDR']:.4f} FC={row['Log2FC']:.3f} {sig_str}")

else:
    print("No annotation available")

# =============================================================================
# 5. Summary Statistics regardless of annotation
# =============================================================================

print("\n" + "=" * 60)
print("DE SUMMARY (regardless of annotation)")
print("=" * 60 + "\n")

sig_probes = de_results[de_results['FDR'] < 0.1]
print(f"Total probes tested: {len(de_results)}")
print(f"Significant (FDR < 0.1): {len(sig_probes)}")
print(f"  Limited-high: {(sig_probes['Direction'] == 'Limited-high').sum()}")
print(f"  Advanced-high: {(sig_probes['Direction'] == 'Advanced-high').sum()}")

print(f"\nNominal significant (p < 0.01): {(de_results['P_value'] < 0.01).sum()}")
print(f"Nominal significant (p < 0.05): {(de_results['P_value'] < 0.05).sum()}")

print("\n" + "=" * 60)
print("COMPLETE")
print("=" * 60)
