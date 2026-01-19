"""
Transcriptional Signatures Associated with Poor Outcome
Using OS_status from GEO Series Matrix
Lacy/HMRN Dataset
"""

import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import gzip
import os
import warnings
warnings.filterwarnings('ignore')

print("=" * 70)
print("SURVIVAL SIGNATURE ANALYSIS")
print("Using OS Status (Dead vs Alive)")
print("Lacy/HMRN Dataset")
print("=" * 70 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")
figures_dir = os.path.join(results_dir, "figures")

# =============================================================================
# 1. Load Data and Extract All Characteristics
# =============================================================================

print("Loading data from series matrix...")

series_file = os.path.join(lacy_dir, "GSE181063_series_matrix.txt.gz")

with gzip.open(series_file, 'rt') as f:
    lines = f.readlines()

sample_ids = None
coo = None
os_status = None
os_followup = None

# Parse all characteristics
for line in lines:
    if line.startswith("!Sample_geo_accession"):
        parts = line.strip().split('\t')[1:]
        sample_ids = [p.strip('"') for p in parts]
    elif line.startswith("!Sample_characteristics_ch1") and "pred_combine:" in line:
        parts = line.strip().split('\t')[1:]
        coo = []
        for p in parts:
            p = p.strip('"')
            if "pred_combine:" in p:
                c = p.split(":")[-1].strip()
                coo.append(c)
            else:
                coo.append(None)
    elif line.startswith("!Sample_characteristics_ch1") and "os_status:" in line:
        parts = line.strip().split('\t')[1:]
        os_status = []
        for p in parts:
            p = p.strip('"')
            if "os_status:" in p:
                val = p.split(":")[-1].strip()
                try:
                    os_status.append(int(val))
                except:
                    os_status.append(None)
            else:
                os_status.append(None)
    elif line.startswith("!Sample_characteristics_ch1") and "os_followup_y:" in line:
        parts = line.strip().split('\t')[1:]
        os_followup = []
        for p in parts:
            p = p.strip('"')
            if "os_followup_y:" in p:
                val = p.split(":")[-1].strip()
                try:
                    os_followup.append(float(val))
                except:
                    os_followup.append(None)
            else:
                os_followup.append(None)

print(f"Samples: {len(sample_ids)}")
print(f"COO data: {len(coo) if coo else 0}")
print(f"OS status: {len([x for x in os_status if x is not None]) if os_status else 0} with data")
print(f"OS followup: {len([x for x in os_followup if x is not None]) if os_followup else 0} with data")

if os_status:
    os_counts = pd.Series([x for x in os_status if x is not None]).value_counts()
    print(f"\nOS status distribution (0=alive, 1=dead):")
    print(os_counts)

# Parse expression matrix
print("\nLoading expression data...")
expr_start = None
expr_end = None
for i, line in enumerate(lines):
    if line.startswith("!series_matrix_table_begin"):
        expr_start = i + 1
    elif line.startswith("!series_matrix_table_end"):
        expr_end = i
        break

expr_data = {}
probe_ids = []
if expr_start and expr_end:
    expr_lines = lines[expr_start:expr_end]
    for line in expr_lines[1:]:
        parts = line.strip().split('\t')
        probe_id = parts[0].strip('"')
        probe_ids.append(probe_id)
        values = [float(v) if v != 'null' and v != '' else np.nan for v in parts[1:]]
        expr_data[probe_id] = values

print(f"Probes loaded: {len(probe_ids)}")

# Create clinical DataFrame
clinical = pd.DataFrame({
    'sample_id': sample_ids,
    'COO': coo,
    'OS_status': os_status if os_status else [None] * len(sample_ids),
    'OS_followup': os_followup if os_followup else [None] * len(sample_ids)
})

# Define outcome groups
# OS_status: 0 = alive (good outcome), 1 = dead (poor outcome)
clinical['Outcome'] = clinical['OS_status'].map({0: 'Alive', 1: 'Dead'})

print(f"\nOutcome distribution:")
print(clinical['Outcome'].value_counts(dropna=False))

print(f"\nOutcome by COO:")
print(pd.crosstab(clinical['COO'], clinical['Outcome'], margins=True))

# Load annotation
annot_file = os.path.join(lacy_dir, "GPL14951_annotation.csv")
annot_df = None
if os.path.exists(annot_file):
    annot_df = pd.read_csv(annot_file)

# =============================================================================
# 2. Differential Expression: Dead vs Alive
# =============================================================================

sample_to_idx = {s: i for i, s in enumerate(sample_ids)}

def run_outcome_de(subtype_name, subtype_df):
    """Run DE analysis comparing Dead vs Alive"""

    print(f"\n{'='*70}")
    print(f"POOR OUTCOME SIGNATURE: {subtype_name}")
    print(f"{'='*70}")

    # Get samples
    alive = subtype_df[subtype_df['Outcome'] == 'Alive']['sample_id'].tolist()
    dead = subtype_df[subtype_df['Outcome'] == 'Dead']['sample_id'].tolist()

    alive_idx = [sample_to_idx[s] for s in alive if s in sample_to_idx]
    dead_idx = [sample_to_idx[s] for s in dead if s in sample_to_idx]

    print(f"Alive (good outcome): n={len(alive_idx)}")
    print(f"Dead (poor outcome): n={len(dead_idx)}")

    # Median follow-up
    alive_followup = subtype_df[subtype_df['Outcome'] == 'Alive']['OS_followup'].dropna()
    dead_followup = subtype_df[subtype_df['Outcome'] == 'Dead']['OS_followup'].dropna()
    if len(alive_followup) > 0:
        print(f"Median follow-up (alive): {alive_followup.median():.1f} years")
    if len(dead_followup) > 0:
        print(f"Median time to death: {dead_followup.median():.1f} years")

    if len(alive_idx) < 10 or len(dead_idx) < 10:
        print(f"WARNING: Insufficient samples")
        if len(alive_idx) < 5 or len(dead_idx) < 5:
            return None

    # Run t-tests
    results = []

    for probe_id in probe_ids:
        values = expr_data[probe_id]

        alive_vals = [values[i] for i in alive_idx if not np.isnan(values[i])]
        dead_vals = [values[i] for i in dead_idx if not np.isnan(values[i])]

        if len(alive_vals) >= 5 and len(dead_vals) >= 5:
            if np.std(alive_vals) > 0 and np.std(dead_vals) > 0:
                t_stat, p_value = stats.ttest_ind(alive_vals, dead_vals)

                mean_alive = np.mean(alive_vals)
                mean_dead = np.mean(dead_vals)
                log2fc = np.log2((mean_dead + 0.01) / (mean_alive + 0.01))

                # Effect size
                pooled_std = np.sqrt((np.std(alive_vals)**2 + np.std(dead_vals)**2) / 2)
                cohens_d = (mean_dead - mean_alive) / pooled_std if pooled_std > 0 else 0

                direction = 'Dead_Up' if log2fc > 0 else 'Alive_Up'

                results.append({
                    'Probe': probe_id,
                    'Mean_Alive': mean_alive,
                    'Mean_Dead': mean_dead,
                    'Log2FC': log2fc,
                    'Cohens_d': cohens_d,
                    'T_stat': t_stat,
                    'P_value': p_value,
                    'Direction': direction
                })

    results_df = pd.DataFrame(results)
    results_df = results_df.sort_values('P_value')
    results_df['FDR'] = stats.false_discovery_control(results_df['P_value'])

    if annot_df is not None:
        results_df = results_df.merge(annot_df, on='Probe', how='left')

    # Summary
    sig_fdr01 = results_df[results_df['FDR'] < 0.1]
    sig_fdr05 = results_df[results_df['FDR'] < 0.05]
    nom_sig = results_df[results_df['P_value'] < 0.05]
    nom_sig_01 = results_df[results_df['P_value'] < 0.01]

    print(f"\nProbes tested: {len(results_df)}")
    print(f"Significant (FDR < 0.05): {len(sig_fdr05)}")
    print(f"Significant (FDR < 0.1): {len(sig_fdr01)}")
    print(f"Nominal (p < 0.01): {len(nom_sig_01)}")
    print(f"Nominal (p < 0.05): {len(nom_sig)}")
    print(f"Max |Log2FC|: {results_df['Log2FC'].abs().max():.4f}")

    # Top results
    print(f"\n{'-'*90}")
    print(f"TOP 30 PROBES ASSOCIATED WITH MORTALITY")
    print(f"{'-'*90}")
    print(f"{'Probe':<18} {'Gene':<12} {'Log2FC':>8} {'Cohen_d':>8} {'P-value':>12} {'FDR':>10} {'Dir':<10}")
    print("-" * 90)

    for i, row in results_df.head(30).iterrows():
        gene = row.get('Gene_Symbol', '-')
        if pd.isna(gene):
            gene = '-'
        sig = "***" if row['FDR'] < 0.05 else ("**" if row['FDR'] < 0.1 else ("*" if row['P_value'] < 0.05 else ""))
        print(f"{row['Probe']:<18} {gene:<12} {row['Log2FC']:>8.4f} {row['Cohens_d']:>8.3f} "
              f"{row['P_value']:>12.2e} {row['FDR']:>10.4f} {row['Direction']:<10} {sig}")

    # Breakdown
    dead_up = nom_sig[nom_sig['Direction'] == 'Dead_Up']
    alive_up = nom_sig[nom_sig['Direction'] == 'Alive_Up']

    print(f"\n{'-'*50}")
    print(f"BREAKDOWN BY DIRECTION (p<0.05)")
    print(f"{'-'*50}")
    print(f"Upregulated in Dead (poor outcome): {len(dead_up)}")
    print(f"Upregulated in Alive (good outcome): {len(alive_up)}")

    if len(dead_up) > 0:
        print(f"\nTop genes UP in DEAD (poor outcome signature):")
        for i, row in dead_up.head(15).iterrows():
            gene = row.get('Gene_Symbol', row['Probe'])
            if pd.isna(gene):
                gene = row['Probe'][:15]
            print(f"  {gene:<18} Log2FC={row['Log2FC']:>7.4f}  p={row['P_value']:.2e}")

    if len(alive_up) > 0:
        print(f"\nTop genes UP in ALIVE (good outcome signature):")
        for i, row in alive_up.head(15).iterrows():
            gene = row.get('Gene_Symbol', row['Probe'])
            if pd.isna(gene):
                gene = row['Probe'][:15]
            print(f"  {gene:<18} Log2FC={row['Log2FC']:>7.4f}  p={row['P_value']:.2e}")

    return {
        'results_df': results_df,
        'n_alive': len(alive_idx),
        'n_dead': len(dead_idx),
        'sig_fdr01': sig_fdr01,
        'sig_fdr05': sig_fdr05,
        'nom_sig': nom_sig,
        'nom_sig_01': nom_sig_01,
        'subtype': subtype_name
    }

# =============================================================================
# 3. Run Analysis: Global and by Subtype
# =============================================================================

# Global
all_samples = clinical[clinical['Outcome'].notna()].copy()
print(f"\nSamples with outcome data: {len(all_samples)}")

global_results = run_outcome_de("GLOBAL (All Subtypes)", all_samples)

# GCB
gcb = clinical[(clinical['COO'] == 'GCB') & (clinical['Outcome'].notna())].copy()
gcb_results = run_outcome_de("GCB", gcb)

# ABC
abc = clinical[(clinical['COO'] == 'ABC') & (clinical['Outcome'].notna())].copy()
abc_results = run_outcome_de("ABC", abc)

# MHG
mhg = clinical[(clinical['COO'] == 'MHG') & (clinical['Outcome'].notna())].copy()
mhg_results = run_outcome_de("MHG", mhg)

# UNC
unc = clinical[(clinical['COO'] == 'UNC') & (clinical['Outcome'].notna())].copy()
unc_results = run_outcome_de("UNC", unc)

# =============================================================================
# 4. Generate Figures
# =============================================================================

print(f"\n{'='*70}")
print("GENERATING FIGURES")
print(f"{'='*70}")

all_results = [
    ('Global', global_results),
    ('GCB', gcb_results),
    ('ABC', abc_results),
    ('MHG', mhg_results),
    ('UNC', unc_results)
]

valid_results = [(name, res) for name, res in all_results if res is not None]

# Multi-panel volcano
fig, axes = plt.subplots(2, 3, figsize=(18, 12))
axes = axes.flatten()

for idx, (name, results) in enumerate(valid_results):
    ax = axes[idx]
    df = results['results_df']
    df['neg_log_p'] = -np.log10(df['P_value'])

    colors = []
    for _, row in df.iterrows():
        if row['FDR'] < 0.1:
            colors.append('#E74C3C' if row['Direction'] == 'Dead_Up' else '#27AE60')
        elif row['P_value'] < 0.05:
            colors.append('#F39C12' if row['Direction'] == 'Dead_Up' else '#3498DB')
        else:
            colors.append('#D5D8DC')

    ax.scatter(df['Log2FC'], df['neg_log_p'], c=colors, alpha=0.5, s=8, edgecolors='none')
    ax.axhline(-np.log10(0.05), color='gray', linestyle='--', linewidth=0.8)
    ax.axvline(0, color='black', linewidth=0.5)

    if len(results['sig_fdr01']) > 0:
        fdr_thresh = results['sig_fdr01']['P_value'].max()
        ax.axhline(-np.log10(fdr_thresh), color='red', linestyle='--', linewidth=1)

    ax.set_xlabel('Log2FC (Dead vs Alive)', fontsize=10)
    ax.set_ylabel('-Log10(P-value)', fontsize=10)
    ax.set_title(f'{name}\nAlive={results["n_alive"]}, Dead={results["n_dead"]} | FDR<0.1: {len(results["sig_fdr01"])}',
                fontsize=11, fontweight='bold')

for idx in range(len(valid_results), 6):
    axes[idx].axis('off')

legend_elements = [
    mpatches.Patch(color='#E74C3C', label='Up in Dead (FDR<0.1)'),
    mpatches.Patch(color='#27AE60', label='Up in Alive (FDR<0.1)'),
    mpatches.Patch(color='#F39C12', label='Up in Dead (p<0.05)'),
    mpatches.Patch(color='#3498DB', label='Up in Alive (p<0.05)'),
]
fig.legend(handles=legend_elements, loc='lower center', ncol=4, fontsize=10, bbox_to_anchor=(0.5, -0.02))

plt.suptitle('Transcriptional Signatures of Poor Outcome (Mortality)\nGlobal and Subtype-Specific',
             fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.subplots_adjust(bottom=0.08)
plt.savefig(os.path.join(figures_dir, "mortality_signatures.png"), dpi=150, bbox_inches='tight')
plt.close()
print("  Saved: mortality_signatures.png")

# Save results
for name, results in valid_results:
    filename = f"mortality_signature_{name.lower().replace(' ', '_').replace('(', '').replace(')', '')}.csv"
    results['results_df'].to_csv(os.path.join(results_dir, filename), index=False)
    print(f"  Saved: {filename}")

# =============================================================================
# 5. Summary Table
# =============================================================================

print(f"\n{'='*70}")
print("SUMMARY: Mortality Signatures by Subtype")
print(f"{'='*70}")

print(f"\n{'Subtype':<15} {'Alive':>8} {'Dead':>8} {'FDR<0.1':>10} {'FDR<0.05':>10} {'p<0.01':>10} {'p<0.05':>10} {'Max|FC|':>10}")
print("-" * 90)

for name, results in valid_results:
    print(f"{name:<15} {results['n_alive']:>8} {results['n_dead']:>8} "
          f"{len(results['sig_fdr01']):>10} {len(results['sig_fdr05']):>10} "
          f"{len(results['nom_sig_01']):>10} {len(results['nom_sig']):>10} "
          f"{results['results_df']['Log2FC'].abs().max():>10.3f}")

# =============================================================================
# 6. Pathway Gene Check
# =============================================================================

print(f"\n{'='*70}")
print("EGRESS/RETENTION PATHWAY GENES vs OUTCOME")
print(f"{'='*70}")

pathway_genes = ['FOXO1', 'S1PR2', 'GNA13', 'RHOA', 'P2RY8', 'CXCR4', 'SGK1', 'GNAI2',
                 'PAX5', 'MS4A1', 'MYC', 'BCL2', 'BCL6']

if global_results and 'Gene_Symbol' in global_results['results_df'].columns:
    pathway_df = global_results['results_df'][global_results['results_df']['Gene_Symbol'].isin(pathway_genes)]
    if len(pathway_df) > 0:
        print(f"\n{'Gene':<12} {'Log2FC':>10} {'P-value':>12} {'FDR':>10} {'Direction':<12}")
        print("-" * 60)
        for i, row in pathway_df.iterrows():
            sig = "***" if row['FDR'] < 0.05 else ("**" if row['FDR'] < 0.1 else ("*" if row['P_value'] < 0.05 else ""))
            print(f"{row['Gene_Symbol']:<12} {row['Log2FC']:>10.4f} {row['P_value']:>12.4f} "
                  f"{row['FDR']:>10.4f} {row['Direction']:<12} {sig}")

print(f"\n{'='*70}")
print("ANALYSIS COMPLETE")
print(f"{'='*70}")
