"""
Annotate Differentially Expressed Probes with Gene Symbols
Using Gemma REST API (University of British Columbia)
"""

import pandas as pd
import urllib.request
import json
import os
import time
import ssl

# Disable SSL verification (for Gemma API)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

print("=" * 60)
print("Annotating DE Probes with Gene Symbols (Gemma API)")
print("=" * 60 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")

# =============================================================================
# 1. Load DE Results
# =============================================================================

print("Loading DE results...")
de_results = pd.read_csv(os.path.join(results_dir, "gcb_expression_by_stage.csv"))
print(f"Total probes: {len(de_results)}")

# Get unique probes to annotate
probes_to_annotate = set(de_results['Probe'].tolist())
print(f"Unique probes to annotate: {len(probes_to_annotate)}")

# Filter to significant/top probes for efficiency
top_probes = de_results[de_results['P_value'] < 0.05]['Probe'].tolist()
print(f"Probes with p < 0.05: {len(top_probes)}\n")

# =============================================================================
# 2. Fetch Annotations from Gemma API
# =============================================================================

print("Fetching annotations from Gemma API...")
print("(This may take a minute - fetching in batches)\n")

base_url = "https://gemma.msl.ubc.ca/rest/v2/platforms/GPL14951/elements"
all_annotations = []

# Fetch in batches (Gemma API supports pagination)
offset = 0
limit = 5000  # Max per request
total_fetched = 0

while True:
    url = f"{base_url}?offset={offset}&limit={limit}"

    try:
        req = urllib.request.Request(url)
        req.add_header('Accept', 'application/json')

        with urllib.request.urlopen(req, timeout=60, context=ssl_context) as response:
            data = json.loads(response.read().decode('utf-8'))

            if 'data' in data:
                elements = data['data']
            else:
                elements = data

            if not elements or len(elements) == 0:
                break

            for elem in elements:
                probe_id = elem.get('name', '')
                gene_symbol = elem.get('description', '').strip()

                if probe_id and gene_symbol:
                    all_annotations.append({
                        'Probe': probe_id,
                        'Gene_Symbol': gene_symbol
                    })

            total_fetched += len(elements)
            print(f"  Fetched {total_fetched} probes...", end='\r')

            # Check if we got fewer than limit (end of data)
            if len(elements) < limit:
                break

            offset += limit
            time.sleep(0.5)  # Be nice to the API

    except Exception as e:
        print(f"\nError fetching offset {offset}: {e}")
        break

print(f"\nTotal annotations fetched: {len(all_annotations)}")

# =============================================================================
# 3. Create Annotation DataFrame
# =============================================================================

if len(all_annotations) > 0:
    annot_df = pd.DataFrame(all_annotations)
    annot_df = annot_df.drop_duplicates(subset=['Probe'])

    print(f"Unique probe annotations: {len(annot_df)}")

    # Save annotation for future use
    annot_file = os.path.join(lacy_dir, "GPL14951_annotation.csv")
    annot_df.to_csv(annot_file, index=False)
    print(f"Saved annotation: {annot_file}\n")

    # =============================================================================
    # 4. Merge Annotation with DE Results
    # =============================================================================

    print("=" * 60)
    print("Merging Annotation with DE Results")
    print("=" * 60 + "\n")

    de_annotated = de_results.merge(annot_df, on='Probe', how='left')
    de_annotated = de_annotated.sort_values('P_value')

    annotated_count = de_annotated['Gene_Symbol'].notna().sum()
    print(f"DE probes annotated: {annotated_count} / {len(de_annotated)}")

    # =============================================================================
    # 5. Display Results
    # =============================================================================

    print("\n" + "=" * 60)
    print("TOP GENES BY STAGE ASSOCIATION (GCB-DLBCL)")
    print("=" * 60 + "\n")

    # Filter to annotated probes
    annotated = de_annotated[de_annotated['Gene_Symbol'].notna()].copy()

    # Top 30 overall
    print("Top 30 Differentially Expressed Genes:")
    print("-" * 60)
    top30 = annotated.head(30)
    for idx, row in top30.iterrows():
        direction = "^ Adv" if row['Direction'] == "Advanced-high" else "v Adv"
        fdr_str = f"FDR={row['FDR']:.4f}" if row['FDR'] < 0.1 else f"p={row['P_value']:.2e}"
        print(f"  {row['Gene_Symbol']:15s} {direction:8s} {fdr_str:20s} FC={row['Log2FC']:.3f}")

    # Significant genes by direction
    sig = annotated[annotated['FDR'] < 0.1]

    print(f"\n\nSIGNIFICANT GENES (FDR < 0.1): {len(sig)}")
    print("=" * 60)

    limited_high = sig[sig['Direction'] == 'Limited-high'].sort_values('P_value')
    advanced_high = sig[sig['Direction'] == 'Advanced-high'].sort_values('P_value')

    print(f"\nHIGHER in Limited Stage (I-II): {len(limited_high)} genes")
    if len(limited_high) > 0:
        print("-" * 50)
        for idx, row in limited_high.head(25).iterrows():
            print(f"  {row['Gene_Symbol']:15s} FDR={row['FDR']:.4f}  FC={row['Log2FC']:.3f}")

    print(f"\nHIGHER in Advanced Stage (III-IV): {len(advanced_high)} genes")
    if len(advanced_high) > 0:
        print("-" * 50)
        for idx, row in advanced_high.head(25).iterrows():
            print(f"  {row['Gene_Symbol']:15s} FDR={row['FDR']:.4f}  FC={row['Log2FC']:.3f}")

    # =============================================================================
    # 6. Pathway Analysis
    # =============================================================================

    print("\n" + "=" * 60)
    print("PATHWAY ANALYSIS")
    print("=" * 60 + "\n")

    # Egress/Retention pathway genes
    egress_genes = ['S1PR1', 'S1PR2', 'GNA13', 'RHOA', 'P2RY8', 'CXCR4', 'SGK1',
                   'GNAI2', 'RAC2', 'ARHGEF1', 'ARHGAP25', 'FOXO1']

    pathway_hits = annotated[annotated['Gene_Symbol'].str.upper().isin([g.upper() for g in egress_genes])]
    print(f"Egress/Retention Pathway Genes in DE results:")
    print("-" * 50)
    if len(pathway_hits) > 0:
        for idx, row in pathway_hits.iterrows():
            sig_str = "***" if row['FDR'] < 0.1 else ""
            print(f"  {row['Gene_Symbol']:15s} p={row['P_value']:.4f} FC={row['Log2FC']:.3f} {sig_str}")
    else:
        print("  None found")

    # Cell migration/adhesion genes
    migration_genes = ['CCR7', 'CXCR5', 'SELL', 'ITGB1', 'ITGB2', 'ITGA4',
                      'ICAM1', 'VCAM1', 'CCL19', 'CCL21', 'CD62L']

    print(f"\nMigration/Homing Genes:")
    print("-" * 50)
    migration_hits = annotated[annotated['Gene_Symbol'].str.upper().isin([g.upper() for g in migration_genes])]
    if len(migration_hits) > 0:
        for idx, row in migration_hits.iterrows():
            sig_str = "***" if row['FDR'] < 0.1 else ""
            print(f"  {row['Gene_Symbol']:15s} p={row['P_value']:.4f} FC={row['Log2FC']:.3f} {sig_str}")
    else:
        print("  None found")

    # B-cell/lymphoma markers
    bcell_genes = ['BCL2', 'BCL6', 'MYC', 'CD19', 'MS4A1', 'PAX5', 'IRF4',
                  'PRDM1', 'XBP1', 'CD38', 'AICDA', 'EZH2', 'CREBBP']

    print(f"\nB-cell/Lymphoma Markers:")
    print("-" * 50)
    bcell_hits = annotated[annotated['Gene_Symbol'].str.upper().isin([g.upper() for g in bcell_genes])]
    if len(bcell_hits) > 0:
        for idx, row in bcell_hits.iterrows():
            sig_str = "***" if row['FDR'] < 0.1 else ""
            print(f"  {row['Gene_Symbol']:15s} p={row['P_value']:.4f} FC={row['Log2FC']:.3f} {sig_str}")
    else:
        print("  None found")

    # Cell cycle genes
    cell_cycle = ['CCND1', 'CCND2', 'CCNE1', 'CDK4', 'CDK6', 'MKI67',
                 'PCNA', 'E2F1', 'RB1', 'TP53', 'CDKN1A', 'CDKN2A']

    print(f"\nCell Cycle/Proliferation Genes:")
    print("-" * 50)
    cycle_hits = annotated[annotated['Gene_Symbol'].str.upper().isin([g.upper() for g in cell_cycle])]
    if len(cycle_hits) > 0:
        for idx, row in cycle_hits.iterrows():
            sig_str = "***" if row['FDR'] < 0.1 else ""
            print(f"  {row['Gene_Symbol']:15s} p={row['P_value']:.4f} FC={row['Log2FC']:.3f} {sig_str}")
    else:
        print("  None found")

    # =============================================================================
    # 7. Save Results
    # =============================================================================

    print("\n" + "=" * 60)
    print("SAVING RESULTS")
    print("=" * 60 + "\n")

    # Save full annotated results
    output_file = os.path.join(results_dir, "gcb_de_genes_by_stage_annotated.csv")
    de_annotated.to_csv(output_file, index=False)
    print(f"Saved: {output_file}")

    # Save significant genes only
    if len(sig) > 0:
        sig_file = os.path.join(results_dir, "gcb_de_significant_genes.csv")
        sig_output = sig[['Gene_Symbol', 'Probe', 'Log2FC', 'P_value', 'FDR', 'Direction']]
        sig_output.to_csv(sig_file, index=False)
        print(f"Saved: {sig_file} ({len(sig)} genes)")

    # Summary statistics
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"\nTotal probes tested: {len(de_results)}")
    print(f"Probes with gene annotation: {annotated_count}")
    print(f"Significant genes (FDR < 0.1): {len(sig)}")
    print(f"  - Limited-high: {len(limited_high)}")
    print(f"  - Advanced-high: {len(advanced_high)}")

else:
    print("Failed to fetch annotations - showing probe IDs only")
    print("\nTop 30 DE Probes:")
    for idx, row in de_results.head(30).iterrows():
        direction = "^" if row['Direction'] == "Advanced-high" else "v"
        print(f"  {row['Probe']:20s} {direction} Adv  FDR={row['FDR']:.4f}")

print("\n" + "=" * 60)
print("ANNOTATION COMPLETE")
print("=" * 60)
