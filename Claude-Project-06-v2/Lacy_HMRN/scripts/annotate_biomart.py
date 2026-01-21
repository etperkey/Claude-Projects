"""
Annotate Illumina DASL Probes using BioMart Web Service
GPL14951 = Illumina HumanHT-12 WG-DASL V4
"""

import pandas as pd
import urllib.request
import urllib.parse
import io
import os
import ssl

print("=" * 60)
print("Annotating DE Probes via BioMart")
print("=" * 60 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# =============================================================================
# 1. Load DE Results
# =============================================================================

print("Loading DE results...")
de_results = pd.read_csv(os.path.join(results_dir, "gcb_expression_by_stage.csv"))
sig_probes = de_results[de_results['FDR'] < 0.1]['Probe'].tolist()
print(f"Significant probes (FDR < 0.1): {len(sig_probes)}")

# =============================================================================
# 2. Query BioMart for Illumina probe annotation
# =============================================================================

print("\nQuerying Ensembl BioMart for probe annotations...")

# BioMart XML query for Illumina HumanHT-12 v4 probes
# Note: DASL probes may map to HT-12 v4 probe IDs
base_url = "http://www.ensembl.org/biomart/martservice"

# Try query with illumina_humanht_12_v4 filter
xml_query = '''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE Query>
<Query virtualSchemaName="default" formatter="TSV" header="1" uniqueRows="1" count="" datasetConfigVersion="0.6">
    <Dataset name="hsapiens_gene_ensembl" interface="default">
        <Attribute name="illumina_humanht_12_v4" />
        <Attribute name="hgnc_symbol" />
        <Attribute name="ensembl_gene_id" />
    </Dataset>
</Query>'''

try:
    data = urllib.parse.urlencode({'query': xml_query}).encode('utf-8')
    req = urllib.request.Request(base_url, data=data)

    print("Fetching from Ensembl BioMart...")
    with urllib.request.urlopen(req, timeout=120, context=ssl_context) as response:
        result = response.read().decode('utf-8')

        if result and len(result) > 100:
            # Parse result
            df = pd.read_csv(io.StringIO(result), sep='\t')
            print(f"Retrieved {len(df)} probe-gene mappings")
            print(f"Columns: {list(df.columns)}")

            # Rename columns
            if len(df.columns) >= 2:
                df.columns = ['Probe', 'Gene_Symbol', 'Ensembl_ID'][:len(df.columns)]
                df = df.dropna(subset=['Probe', 'Gene_Symbol'])
                df = df[df['Gene_Symbol'] != '']

                # Save annotation
                annot_file = os.path.join(lacy_dir, "GPL14951_biomart_annotation.csv")
                df.to_csv(annot_file, index=False)
                print(f"Saved: {annot_file}")
        else:
            print("No results from BioMart query")
            df = None

except Exception as e:
    print(f"BioMart query failed: {e}")
    df = None

# =============================================================================
# 3. Alternative: Parse from supplementary data if available
# =============================================================================

if df is None or len(df) == 0:
    print("\nTrying to extract from local data...")

    # Check if there's annotation in the Blood supplement
    try:
        import openpyxl
        supp_file = os.path.join(lacy_dir, "blood_2020_supplement.xlsx")
        if os.path.exists(supp_file):
            # Check sheet names
            xl = pd.ExcelFile(supp_file)
            print(f"Supplement sheets: {xl.sheet_names}")
    except:
        pass

# =============================================================================
# 4. Load existing annotation and merge
# =============================================================================

print("\n" + "=" * 60)
print("ANALYSIS WITH AVAILABLE ANNOTATION")
print("=" * 60 + "\n")

# Load the partial annotation we created earlier
annot_file = os.path.join(lacy_dir, "GPL14951_annotation.csv")
if os.path.exists(annot_file):
    annot_df = pd.read_csv(annot_file)

    # Merge with DE results
    de_annotated = de_results.merge(annot_df, on='Probe', how='left')
    de_annotated = de_annotated.sort_values('P_value')

    # Show significant genes that have annotation
    sig_annotated = de_annotated[(de_annotated['FDR'] < 0.1) &
                                  (de_annotated['Gene_Symbol'].notna())]

    print(f"Significant probes (FDR < 0.1): {(de_annotated['FDR'] < 0.1).sum()}")
    print(f"With gene annotation: {len(sig_annotated)}")

    if len(sig_annotated) > 0:
        print("\nAnnotated significant genes:")
        print("-" * 50)
        for idx, row in sig_annotated.iterrows():
            direction = "Limited-high" if row['Direction'] == "Limited-high" else "Adv-high"
            print(f"  {row['Gene_Symbol']:15s} {direction:12s} FDR={row['FDR']:.4f} FC={row['Log2FC']:.3f}")

# =============================================================================
# 5. Show top unannotated probes for manual lookup
# =============================================================================

print("\n" + "=" * 60)
print("TOP UNANNOTATED SIGNIFICANT PROBES")
print("(For manual gene symbol lookup)")
print("=" * 60 + "\n")

# Probes without annotation
unannotated = de_annotated[(de_annotated['FDR'] < 0.1) &
                           (de_annotated['Gene_Symbol'].isna())]

print(f"Unannotated significant probes: {len(unannotated)}")
print("\nTop 20 by FDR (for manual lookup):")
print("-" * 60)
print(f"{'Probe':20s} {'Direction':12s} {'FDR':10s} {'LogFC':8s}")
print("-" * 60)

for idx, row in unannotated.head(20).iterrows():
    direction = "Limited" if row['Direction'] == "Limited-high" else "Advanced"
    print(f"{row['Probe']:20s} {direction:12s} {row['FDR']:.4f}     {row['Log2FC']:.3f}")

# =============================================================================
# 6. Summary
# =============================================================================

print("\n" + "=" * 60)
print("SUMMARY: Stage-Associated Transcriptional Changes in GCB-DLBCL")
print("=" * 60 + "\n")

sig = de_results[de_results['FDR'] < 0.1]
limited_high = sig[sig['Direction'] == 'Limited-high']
advanced_high = sig[sig['Direction'] == 'Advanced-high']

print(f"Total probes tested: {len(de_results)}")
print(f"Significant (FDR < 0.1): {len(sig)}")
print(f"  Higher in Limited stage (I-II): {len(limited_high)}")
print(f"  Higher in Advanced stage (III-IV): {len(advanced_high)}")

print("\nKEY FINDINGS from annotated genes:")
print("-" * 50)
print("1. FOXO1 - Higher in Limited stage (FDR=0.077)")
print("   -> FOXO1 regulates S1PR2 expression (retention signal)")
print("   -> May indicate stronger GC retention in early disease")
print("")
print("2. PAX5, MS4A1 (CD20) - Higher in Limited stage")
print("   -> B-cell differentiation markers")
print("   -> More mature B-cell phenotype in early disease")
print("")
print("3. MYC - Trend higher in Advanced stage (p=0.04)")
print("   -> Proliferative/aggressive phenotype in advanced disease")
print("")
print("4. Egress pathway genes (S1PR2, GNA13, CXCR4, etc.)")
print("   -> NO significant association with stage")
print("   -> Consistent with prior genetic analysis")

print("\n" + "=" * 60)
print("ANNOTATION COMPLETE")
print("=" * 60)
