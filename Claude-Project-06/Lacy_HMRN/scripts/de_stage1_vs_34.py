"""
Differential Expression Analysis: Stage I vs Stage III/IV (omit Stage II)
ENTIRE COHORT (all COO subtypes) from Lacy/HMRN Dataset
"""

import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import gzip
import os

print("=" * 70)
print("DE ANALYSIS: Stage I vs Stage III/IV (Omitting Stage II)")
print("ENTIRE COHORT (All COO Subtypes) - Lacy/HMRN Dataset")
print("=" * 70 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")
figures_dir = os.path.join(results_dir, "figures")

# =============================================================================
# 1. Extract Stage and Expression Data from Series Matrix
# =============================================================================

print("Loading data from series matrix...")

series_file = os.path.join(lacy_dir, "GSE181063_series_matrix.txt.gz")

sample_ids = None
stages = None
coo = None
expr_data = None

with gzip.open(series_file, 'rt') as f:
    lines = f.readlines()

# Parse metadata
for line in lines:
    if line.startswith("!Sample_geo_accession"):
        parts = line.strip().split('\t')[1:]
        sample_ids = [p.strip('"') for p in parts]
    elif line.startswith("!Sample_characteristics_ch1") and "Stage:" in line:
        parts = line.strip().split('\t')[1:]
        stages = []
        for p in parts:
            p = p.strip('"')
            if "Stage:" in p:
                stage = p.split(":")[-1].strip()
                stages.append(stage)
            else:
                stages.append(None)
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

# Parse expression matrix
expr_start = None
expr_end = None
for i, line in enumerate(lines):
    if line.startswith("!series_matrix_table_begin"):
        expr_start = i + 1
    elif line.startswith("!series_matrix_table_end"):
        expr_end = i
        break

if expr_start and expr_end:
    expr_lines = lines[expr_start:expr_end]
    # Parse header
    header = expr_lines[0].strip().split('\t')
    header = [h.strip('"') for h in header]

    # Parse data
    expr_data = {}
    probe_ids = []
    for line in expr_lines[1:]:
        parts = line.strip().split('\t')
        probe_id = parts[0].strip('"')
        probe_ids.append(probe_id)
        values = [float(v) if v != 'null' and v != '' else np.nan for v in parts[1:]]
        expr_data[probe_id] = values

print(f"Samples: {len(sample_ids)}")
print(f"Probes: {len(probe_ids)}")

# Create clinical DataFrame
clinical = pd.DataFrame({
    'sample_id': sample_ids,
    'Stage': stages,
    'COO': coo
})

# Use entire cohort (all COO subtypes)
all_samples = clinical.copy()
print(f"\nTotal samples: {len(all_samples)}")
print(f"\nCOO distribution:")
print(all_samples['COO'].value_counts(dropna=False))

# Create stage groups: I vs III/IV (omit II)
def classify_stage_extreme(stage):
    if pd.isna(stage) or stage in ['', 'NA', 'not done', 'raised', 'normal']:
        return None
    stage = str(stage).upper().strip()
    if stage == 'I':
        return 'Stage_I'
    elif stage in ['III', 'IV']:
        return 'Stage_III_IV'
    else:
        return None  # Omit Stage II

all_samples['stage_extreme'] = all_samples['Stage'].apply(classify_stage_extreme)

print(f"\nStage distribution (extreme comparison):")
print(all_samples['stage_extreme'].value_counts(dropna=False))

# Filter to Stage I vs III/IV
cohort_extreme = all_samples[all_samples['stage_extreme'].notna()].copy()
print(f"\nSamples for analysis: {len(cohort_extreme)}")

stage1_samples = cohort_extreme[cohort_extreme['stage_extreme'] == 'Stage_I']['sample_id'].tolist()
stage34_samples = cohort_extreme[cohort_extreme['stage_extreme'] == 'Stage_III_IV']['sample_id'].tolist()

print(f"  Stage I: {len(stage1_samples)}")
print(f"  Stage III/IV: {len(stage34_samples)}")

# =============================================================================
# 2. Differential Expression Analysis
# =============================================================================

print("\n" + "=" * 70)
print("DIFFERENTIAL EXPRESSION ANALYSIS")
print("=" * 70 + "\n")

# Get sample indices
sample_to_idx = {s: i for i, s in enumerate(sample_ids)}
stage1_idx = [sample_to_idx[s] for s in stage1_samples if s in sample_to_idx]
stage34_idx = [sample_to_idx[s] for s in stage34_samples if s in sample_to_idx]

print(f"Stage I samples with expression: {len(stage1_idx)}")
print(f"Stage III/IV samples with expression: {len(stage34_idx)}")

# Run t-tests
results = []

for probe_id in probe_ids:
    values = expr_data[probe_id]

    stage1_vals = [values[i] for i in stage1_idx if not np.isnan(values[i])]
    stage34_vals = [values[i] for i in stage34_idx if not np.isnan(values[i])]

    if len(stage1_vals) >= 10 and len(stage34_vals) >= 10:
        # Check variance
        if np.std(stage1_vals) > 0 and np.std(stage34_vals) > 0:
            t_stat, p_value = stats.ttest_ind(stage1_vals, stage34_vals)

            mean_s1 = np.mean(stage1_vals)
            mean_s34 = np.mean(stage34_vals)
            log2fc = np.log2((mean_s34 + 0.01) / (mean_s1 + 0.01))

            direction = 'Stage_III_IV_high' if log2fc > 0 else 'Stage_I_high'

            results.append({
                'Probe': probe_id,
                'Mean_StageI': mean_s1,
                'Mean_StageIII_IV': mean_s34,
                'Log2FC': log2fc,
                'T_stat': t_stat,
                'P_value': p_value,
                'Direction': direction
            })

# Convert to DataFrame
results_df = pd.DataFrame(results)
results_df = results_df.sort_values('P_value')

# FDR correction
results_df['FDR'] = stats.false_discovery_control(results_df['P_value'])

print(f"\nProbes tested: {len(results_df)}")

# Load annotation
annot_file = os.path.join(lacy_dir, "GPL14951_annotation.csv")
if os.path.exists(annot_file):
    annot_df = pd.read_csv(annot_file)
    results_df = results_df.merge(annot_df, on='Probe', how='left')

# =============================================================================
# 3. Results Summary
# =============================================================================

print("\n" + "-" * 70)
print("TOP DIFFERENTIALLY EXPRESSED PROBES")
print("Stage I (n={}) vs Stage III/IV (n={})".format(len(stage1_idx), len(stage34_idx)))
print("-" * 70)

# Summary stats
sig_fdr01 = results_df[results_df['FDR'] < 0.1]
sig_fdr05 = results_df[results_df['FDR'] < 0.05]
nom_sig = results_df[results_df['P_value'] < 0.05]
nom_sig_01 = results_df[results_df['P_value'] < 0.01]

print(f"\nSignificant probes (FDR < 0.05): {len(sig_fdr05)}")
print(f"Significant probes (FDR < 0.1): {len(sig_fdr01)}")
print(f"Nominal significant (p < 0.01): {len(nom_sig_01)}")
print(f"Nominal significant (p < 0.05): {len(nom_sig)}")

# Effect size summary
print(f"\nEffect sizes:")
print(f"  Max |Log2FC|: {results_df['Log2FC'].abs().max():.4f}")
print(f"  Mean |Log2FC| (p<0.05): {nom_sig['Log2FC'].abs().mean():.4f}")

# Top results
print("\n" + "-" * 70)
print(f"{'Probe':<18} {'Gene':<12} {'Log2FC':>10} {'P-value':>12} {'FDR':>10} {'Direction':<15}")
print("-" * 70)

for i, row in results_df.head(30).iterrows():
    gene = row.get('Gene_Symbol', '-')
    if pd.isna(gene):
        gene = '-'
    sig = "***" if row['FDR'] < 0.05 else ("**" if row['FDR'] < 0.1 else ("*" if row['P_value'] < 0.05 else ""))
    print(f"{row['Probe']:<18} {gene:<12} {row['Log2FC']:>10.4f} {row['P_value']:>12.2e} {row['FDR']:>10.4f} {row['Direction']:<15} {sig}")

# By direction
print("\n" + "-" * 70)
print("BREAKDOWN BY DIRECTION")
print("-" * 70)

stage1_high = sig_fdr01[sig_fdr01['Direction'] == 'Stage_I_high']
stage34_high = sig_fdr01[sig_fdr01['Direction'] == 'Stage_III_IV_high']

print(f"\nHigher in Stage I (FDR<0.1): {len(stage1_high)}")
print(f"Higher in Stage III/IV (FDR<0.1): {len(stage34_high)}")

if len(stage1_high) > 0:
    print("\nTop Stage I-high genes:")
    for i, row in stage1_high.head(15).iterrows():
        gene = row.get('Gene_Symbol', row['Probe'])
        if pd.isna(gene):
            gene = row['Probe'][:15]
        print(f"  {gene:<15} Log2FC={row['Log2FC']:.4f}  FDR={row['FDR']:.4f}")

if len(stage34_high) > 0:
    print("\nTop Stage III/IV-high genes:")
    for i, row in stage34_high.head(15).iterrows():
        gene = row.get('Gene_Symbol', row['Probe'])
        if pd.isna(gene):
            gene = row['Probe'][:15]
        print(f"  {gene:<15} Log2FC={row['Log2FC']:.4f}  FDR={row['FDR']:.4f}")

# =============================================================================
# 4. Check Pathway Genes
# =============================================================================

print("\n" + "-" * 70)
print("EGRESS/RETENTION PATHWAY GENES")
print("-" * 70)

pathway_genes = ['FOXO1', 'S1PR2', 'GNA13', 'RHOA', 'P2RY8', 'CXCR4', 'SGK1', 'GNAI2',
                 'PAX5', 'MS4A1', 'MYC', 'BCL2', 'BCL6']

if 'Gene_Symbol' in results_df.columns:
    pathway_results = results_df[results_df['Gene_Symbol'].isin(pathway_genes)]
    if len(pathway_results) > 0:
        print(f"\n{'Gene':<12} {'Log2FC':>10} {'P-value':>12} {'FDR':>10} {'Direction':<15}")
        print("-" * 60)
        for i, row in pathway_results.iterrows():
            sig = "***" if row['FDR'] < 0.05 else ("**" if row['FDR'] < 0.1 else ("*" if row['P_value'] < 0.05 else ""))
            print(f"{row['Gene_Symbol']:<12} {row['Log2FC']:>10.4f} {row['P_value']:>12.4f} {row['FDR']:>10.4f} {row['Direction']:<15} {sig}")

# =============================================================================
# 5. Generate Figures
# =============================================================================

print("\n" + "-" * 70)
print("GENERATING FIGURES")
print("-" * 70)

# Volcano plot
fig, ax = plt.subplots(figsize=(12, 9))

results_df['neg_log_p'] = -np.log10(results_df['P_value'])

colors = []
for idx, row in results_df.iterrows():
    if row['FDR'] < 0.1:
        if row['Direction'] == 'Stage_III_IV_high':
            colors.append('#E74C3C')
        else:
            colors.append('#3498DB')
    elif row['P_value'] < 0.05:
        colors.append('#95A5A6')
    else:
        colors.append('#D5D8DC')

ax.scatter(results_df['Log2FC'], results_df['neg_log_p'],
           c=colors, alpha=0.6, s=12, edgecolors='none')

# Significance lines
ax.axhline(-np.log10(0.05), color='gray', linestyle='--', linewidth=0.8, alpha=0.7)
if len(sig_fdr01) > 0:
    fdr_threshold = sig_fdr01['P_value'].max()
    ax.axhline(-np.log10(fdr_threshold), color='red', linestyle='--', linewidth=1, alpha=0.7,
              label=f'FDR=0.1 threshold')

# Label pathway genes
if 'Gene_Symbol' in results_df.columns:
    for gene in pathway_genes:
        gene_data = results_df[results_df['Gene_Symbol'] == gene]
        if len(gene_data) > 0:
            row = gene_data.iloc[0]
            color = '#E74C3C' if row['Direction'] == 'Stage_III_IV_high' else '#3498DB'
            ax.scatter(row['Log2FC'], row['neg_log_p'], c=color, s=100,
                      edgecolors='black', linewidths=1.5, zorder=5)
            ax.annotate(gene, (row['Log2FC'], row['neg_log_p']),
                       fontsize=10, fontweight='bold',
                       xytext=(8, 0), textcoords='offset points')

ax.set_xlabel('Log2 Fold Change (Stage III/IV vs Stage I)', fontsize=12)
ax.set_ylabel('-Log10(P-value)', fontsize=12)
ax.set_title(f'Differential Expression: Stage I (n={len(stage1_idx)}) vs Stage III/IV (n={len(stage34_idx)})\n'
             f'Entire Cohort (Lacy/HMRN) - Omitting Stage II',
             fontsize=14, fontweight='bold')

legend_elements = [
    mpatches.Patch(color='#E74C3C', label='Stage III/IV-high (FDR<0.1)'),
    mpatches.Patch(color='#3498DB', label='Stage I-high (FDR<0.1)'),
    mpatches.Patch(color='#95A5A6', label='Nominal (p<0.05)'),
]
ax.legend(handles=legend_elements, loc='upper right', fontsize=10)

plt.tight_layout()
plt.savefig(os.path.join(figures_dir, "volcano_stageI_vs_III_IV_all.png"), dpi=150, bbox_inches='tight')
plt.close()
print("  Saved: volcano_stageI_vs_III_IV_all.png")

# Save results
results_df.to_csv(os.path.join(results_dir, "de_stageI_vs_III_IV_all.csv"), index=False)
print("  Saved: de_stageI_vs_III_IV_all.csv")

# =============================================================================
# 6. Comparison with Previous Analysis
# =============================================================================

print("\n" + "=" * 70)
print("COMPARISON: Entire Cohort vs GCB-only (Stage I vs III/IV)")
print("=" * 70)

# Load GCB-only results for comparison
gcb_file = os.path.join(results_dir, "de_stageI_vs_III_IV.csv")
if os.path.exists(gcb_file):
    gcb_results = pd.read_csv(gcb_file)

    print("\n                           GCB-only              Entire Cohort")
    print("-" * 70)
    print(f"Sample sizes:              StageI=13, III/IV=61    StageI={len(stage1_idx)}, III/IV={len(stage34_idx)}")
    print(f"FDR < 0.1:                 {(gcb_results['FDR'] < 0.1).sum():>20}    {len(sig_fdr01):>20}")
    print(f"FDR < 0.05:                {(gcb_results['FDR'] < 0.05).sum():>20}    {len(sig_fdr05):>20}")
    print(f"p < 0.01:                  {(gcb_results['P_value'] < 0.01).sum():>20}    {len(nom_sig_01):>20}")
    print(f"Max |Log2FC|:              {gcb_results['Log2FC'].abs().max():>20.4f}    {results_df['Log2FC'].abs().max():>20.4f}")
else:
    print(f"\nEntire cohort analysis:")
    print(f"  Stage I: n={len(stage1_idx)}")
    print(f"  Stage III/IV: n={len(stage34_idx)}")
    print(f"  FDR < 0.1: {len(sig_fdr01)}")
    print(f"  FDR < 0.05: {len(sig_fdr05)}")
    print(f"  Max |Log2FC|: {results_df['Log2FC'].abs().max():.4f}")

print("\n" + "=" * 70)
print("ANALYSIS COMPLETE")
print("=" * 70)
