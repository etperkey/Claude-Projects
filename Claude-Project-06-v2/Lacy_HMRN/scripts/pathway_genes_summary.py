"""
Extract FDR and LogFC for Egress/Retention Pathway Genes
From mortality signature analysis
"""

import pandas as pd
import os

print("=" * 80)
print("EGRESS/RETENTION PATHWAY GENES: FDR and LogFC by Cohort")
print("=" * 80)

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")

# Define pathway genes
EGRESS_GENES = ['CXCR4', 'GNAI2', 'RAC2', 'S1PR1']  # RAC2 is the available RAC gene
RETENTION_GENES = ['S1PR2', 'GNA13', 'P2RY8', 'RHOA', 'ARHGEF1']

ALL_GENES = EGRESS_GENES + RETENTION_GENES

print(f"\nEgress genes: {EGRESS_GENES}")
print(f"Retention genes: {RETENTION_GENES}")

# Load results for each cohort
cohorts = {
    'Global': 'mortality_signature_global.csv',
    'GCB': 'mortality_signature_gcb.csv',
    'ABC': 'mortality_signature_abc.csv',
    'MHG': 'mortality_signature_mhg.csv',
    'UNC': 'mortality_signature_unc.csv'
}

results = {}
for cohort, filename in cohorts.items():
    filepath = os.path.join(results_dir, filename)
    if os.path.exists(filepath):
        df = pd.read_csv(filepath)
        results[cohort] = df
        print(f"Loaded {cohort}: {len(df)} probes")

# =============================================================================
# Extract pathway gene results
# =============================================================================

print("\n" + "=" * 80)
print("EGRESS GENES (Higher expression expected to associate with POOR outcome)")
print("=" * 80)

for gene in EGRESS_GENES:
    print(f"\n--- {gene} ---")
    print(f"{'Cohort':<10} {'Log2FC':>10} {'P-value':>12} {'FDR':>12} {'Direction':<15} {'Sig':<5}")
    print("-" * 65)

    for cohort, df in results.items():
        if 'Gene_Symbol' in df.columns:
            gene_data = df[df['Gene_Symbol'] == gene]
        else:
            gene_data = pd.DataFrame()

        if len(gene_data) > 0:
            row = gene_data.iloc[0]
            sig = "***" if row['FDR'] < 0.05 else ("**" if row['FDR'] < 0.1 else ("*" if row['P_value'] < 0.05 else ""))
            direction = "POOR" if row['Direction'] == 'Dead_Up' else "GOOD"
            print(f"{cohort:<10} {row['Log2FC']:>10.4f} {row['P_value']:>12.4f} {row['FDR']:>12.4f} {direction:<15} {sig:<5}")
        else:
            print(f"{cohort:<10} {'NA':>10} {'NA':>12} {'NA':>12} {'NA':<15}")

print("\n" + "=" * 80)
print("RETENTION GENES (Higher expression expected to associate with GOOD outcome)")
print("=" * 80)

for gene in RETENTION_GENES:
    print(f"\n--- {gene} ---")
    print(f"{'Cohort':<10} {'Log2FC':>10} {'P-value':>12} {'FDR':>12} {'Direction':<15} {'Sig':<5}")
    print("-" * 65)

    for cohort, df in results.items():
        if 'Gene_Symbol' in df.columns:
            gene_data = df[df['Gene_Symbol'] == gene]
        else:
            gene_data = pd.DataFrame()

        if len(gene_data) > 0:
            row = gene_data.iloc[0]
            sig = "***" if row['FDR'] < 0.05 else ("**" if row['FDR'] < 0.1 else ("*" if row['P_value'] < 0.05 else ""))
            direction = "POOR" if row['Direction'] == 'Dead_Up' else "GOOD"
            print(f"{cohort:<10} {row['Log2FC']:>10.4f} {row['P_value']:>12.4f} {row['FDR']:>12.4f} {direction:<15} {sig:<5}")
        else:
            print(f"{cohort:<10} {'NA':>10} {'NA':>12} {'NA':>12} {'NA':<15}")

# =============================================================================
# Summary Table
# =============================================================================

print("\n" + "=" * 80)
print("SUMMARY TABLE: All Pathway Genes Across Cohorts")
print("=" * 80)

# Create summary dataframe
summary_data = []

for gene in ALL_GENES:
    pathway = "Egress" if gene in EGRESS_GENES else "Retention"

    for cohort, df in results.items():
        if 'Gene_Symbol' in df.columns:
            gene_data = df[df['Gene_Symbol'] == gene]
        else:
            gene_data = pd.DataFrame()

        if len(gene_data) > 0:
            row = gene_data.iloc[0]
            summary_data.append({
                'Gene': gene,
                'Pathway': pathway,
                'Cohort': cohort,
                'Log2FC': row['Log2FC'],
                'P_value': row['P_value'],
                'FDR': row['FDR'],
                'Direction': 'POOR' if row['Direction'] == 'Dead_Up' else 'GOOD'
            })

summary_df = pd.DataFrame(summary_data)

# Pivot for display
print("\nLog2FC (Dead vs Alive) - Positive = higher in Dead (poor outcome)")
print("-" * 80)

pivot_fc = summary_df.pivot(index='Gene', columns='Cohort', values='Log2FC')
pivot_fc = pivot_fc[['Global', 'GCB', 'ABC', 'MHG', 'UNC']]
print(pivot_fc.round(4).to_string())

print("\n\nFDR values")
print("-" * 80)

pivot_fdr = summary_df.pivot(index='Gene', columns='Cohort', values='FDR')
pivot_fdr = pivot_fdr[['Global', 'GCB', 'ABC', 'MHG', 'UNC']]
print(pivot_fdr.round(4).to_string())

print("\n\nDirection (GOOD = higher in survivors, POOR = higher in deceased)")
print("-" * 80)

pivot_dir = summary_df.pivot(index='Gene', columns='Cohort', values='Direction')
pivot_dir = pivot_dir[['Global', 'GCB', 'ABC', 'MHG', 'UNC']]
print(pivot_dir.to_string())

# =============================================================================
# Significance Summary
# =============================================================================

print("\n" + "=" * 80)
print("SIGNIFICANCE SUMMARY (FDR < 0.1)")
print("=" * 80)

sig_results = summary_df[summary_df['FDR'] < 0.1].copy()
sig_results = sig_results.sort_values(['Pathway', 'Gene', 'Cohort'])

if len(sig_results) > 0:
    print(f"\n{'Gene':<12} {'Pathway':<10} {'Cohort':<10} {'Log2FC':>10} {'FDR':>12} {'Direction':<10}")
    print("-" * 70)
    for _, row in sig_results.iterrows():
        print(f"{row['Gene']:<12} {row['Pathway']:<10} {row['Cohort']:<10} {row['Log2FC']:>10.4f} {row['FDR']:>12.4f} {row['Direction']:<10}")
else:
    print("No genes with FDR < 0.1")

# Nominally significant
print("\n" + "=" * 80)
print("NOMINALLY SIGNIFICANT (p < 0.05)")
print("=" * 80)

nom_sig = summary_df[summary_df['P_value'] < 0.05].copy()
nom_sig = nom_sig.sort_values(['Pathway', 'Gene', 'Cohort'])

if len(nom_sig) > 0:
    print(f"\n{'Gene':<12} {'Pathway':<10} {'Cohort':<10} {'Log2FC':>10} {'P-value':>12} {'Direction':<10}")
    print("-" * 70)
    for _, row in nom_sig.iterrows():
        print(f"{row['Gene']:<12} {row['Pathway']:<10} {row['Cohort']:<10} {row['Log2FC']:>10.4f} {row['P_value']:>12.4f} {row['Direction']:<10}")

# Save summary
summary_df.to_csv(os.path.join(results_dir, "pathway_genes_mortality.csv"), index=False)
print(f"\nSaved: pathway_genes_mortality.csv")

print("\n" + "=" * 80)
print("BIOLOGICAL INTERPRETATION")
print("=" * 80)
print("""
Expected patterns if hypothesis is correct:
- EGRESS genes (CXCR4, GNAI2, RAC2, S1PR1): Higher -> POOR outcome (positive Log2FC)
- RETENTION genes (S1PR2, GNA13, P2RY8, RHOA, ARHGEF1): Higher -> GOOD outcome (negative Log2FC)

Note: S1PR1 is not in our annotation - it may not be well expressed in DLBCL
      RAC2 is used instead of RAC (RAC1/RAC2/RAC3)
""")
