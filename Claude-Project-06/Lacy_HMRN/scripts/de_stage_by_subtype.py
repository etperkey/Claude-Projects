"""
Differential Expression Analysis: Stage I vs Stage III/IV
Separate analyses for GCB and MHG subtypes
Lacy/HMRN Dataset
"""

import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import gzip
import os

print("=" * 70)
print("DE ANALYSIS: Stage I vs Stage III/IV by Molecular Subtype")
print("GCB and MHG - Lacy/HMRN Dataset")
print("=" * 70 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")
figures_dir = os.path.join(results_dir, "figures")

# =============================================================================
# 1. Load Data
# =============================================================================

print("Loading data from series matrix...")

series_file = os.path.join(lacy_dir, "GSE181063_series_matrix.txt.gz")

sample_ids = None
stages = None
coo = None

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

expr_data = {}
probe_ids = []
if expr_start and expr_end:
    expr_lines = lines[expr_start:expr_end]
    header = expr_lines[0].strip().split('\t')
    header = [h.strip('"') for h in header]

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

print(f"\nCOO distribution:")
print(clinical['COO'].value_counts(dropna=False))

# Load annotation
annot_file = os.path.join(lacy_dir, "GPL14951_annotation.csv")
annot_df = None
if os.path.exists(annot_file):
    annot_df = pd.read_csv(annot_file)

# =============================================================================
# 2. Define Stage Classification
# =============================================================================

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

clinical['stage_extreme'] = clinical['Stage'].apply(classify_stage_extreme)

# =============================================================================
# 3. Run DE Analysis for Each Subtype
# =============================================================================

sample_to_idx = {s: i for i, s in enumerate(sample_ids)}

def run_de_analysis(subtype_name, subtype_df):
    """Run differential expression analysis for a subtype"""

    print(f"\n{'='*70}")
    print(f"DE ANALYSIS: {subtype_name}")
    print(f"{'='*70}")

    # Get samples
    stage1_samples = subtype_df[subtype_df['stage_extreme'] == 'Stage_I']['sample_id'].tolist()
    stage34_samples = subtype_df[subtype_df['stage_extreme'] == 'Stage_III_IV']['sample_id'].tolist()

    stage1_idx = [sample_to_idx[s] for s in stage1_samples if s in sample_to_idx]
    stage34_idx = [sample_to_idx[s] for s in stage34_samples if s in sample_to_idx]

    print(f"Stage I: n={len(stage1_idx)}")
    print(f"Stage III/IV: n={len(stage34_idx)}")

    if len(stage1_idx) < 5 or len(stage34_idx) < 5:
        print(f"WARNING: Insufficient samples for analysis")
        return None

    # Run t-tests
    results = []

    for probe_id in probe_ids:
        values = expr_data[probe_id]

        stage1_vals = [values[i] for i in stage1_idx if not np.isnan(values[i])]
        stage34_vals = [values[i] for i in stage34_idx if not np.isnan(values[i])]

        if len(stage1_vals) >= 5 and len(stage34_vals) >= 5:
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

    # Add gene annotation
    if annot_df is not None:
        results_df = results_df.merge(annot_df, on='Probe', how='left')

    # Summary stats
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
    print(f"\n{'-'*80}")
    print(f"TOP 25 DIFFERENTIALLY EXPRESSED PROBES")
    print(f"{'-'*80}")
    print(f"{'Probe':<18} {'Gene':<12} {'Log2FC':>10} {'P-value':>12} {'FDR':>10} {'Direction':<15}")
    print("-" * 80)

    for i, row in results_df.head(25).iterrows():
        gene = row.get('Gene_Symbol', '-')
        if pd.isna(gene):
            gene = '-'
        sig = "***" if row['FDR'] < 0.05 else ("**" if row['FDR'] < 0.1 else ("*" if row['P_value'] < 0.05 else ""))
        print(f"{row['Probe']:<18} {gene:<12} {row['Log2FC']:>10.4f} {row['P_value']:>12.2e} {row['FDR']:>10.4f} {row['Direction']:<15} {sig}")

    # Direction breakdown
    print(f"\n{'-'*50}")
    print("BREAKDOWN BY DIRECTION")
    print(f"{'-'*50}")

    stage1_high = nom_sig[nom_sig['Direction'] == 'Stage_I_high']
    stage34_high = nom_sig[nom_sig['Direction'] == 'Stage_III_IV_high']

    print(f"Higher in Stage I (p<0.05): {len(stage1_high)}")
    print(f"Higher in Stage III/IV (p<0.05): {len(stage34_high)}")

    if len(stage1_high) > 0:
        print("\nTop Stage I-high genes:")
        for i, row in stage1_high.head(10).iterrows():
            gene = row.get('Gene_Symbol', row['Probe'])
            if pd.isna(gene):
                gene = row['Probe'][:15]
            print(f"  {gene:<15} Log2FC={row['Log2FC']:.4f}  p={row['P_value']:.4f}")

    if len(stage34_high) > 0:
        print("\nTop Stage III/IV-high genes:")
        for i, row in stage34_high.head(10).iterrows():
            gene = row.get('Gene_Symbol', row['Probe'])
            if pd.isna(gene):
                gene = row['Probe'][:15]
            print(f"  {gene:<15} Log2FC={row['Log2FC']:.4f}  p={row['P_value']:.4f}")

    return {
        'results_df': results_df,
        'n_stage1': len(stage1_idx),
        'n_stage34': len(stage34_idx),
        'sig_fdr01': sig_fdr01,
        'sig_fdr05': sig_fdr05,
        'nom_sig': nom_sig
    }

# =============================================================================
# 4. Run Analysis for GCB
# =============================================================================

gcb = clinical[(clinical['COO'] == 'GCB') & (clinical['stage_extreme'].notna())].copy()
print(f"\nGCB samples with extreme stage: {len(gcb)}")
print(gcb['stage_extreme'].value_counts())

gcb_results = run_de_analysis("GCB", gcb)

# =============================================================================
# 5. Run Analysis for MHG
# =============================================================================

mhg = clinical[(clinical['COO'] == 'MHG') & (clinical['stage_extreme'].notna())].copy()
print(f"\nMHG samples with extreme stage: {len(mhg)}")
print(mhg['stage_extreme'].value_counts())

mhg_results = run_de_analysis("MHG", mhg)

# =============================================================================
# 5b. Run Analysis for ABC (since MHG has no Stage I)
# =============================================================================

abc = clinical[(clinical['COO'] == 'ABC') & (clinical['stage_extreme'].notna())].copy()
print(f"\nABC samples with extreme stage: {len(abc)}")
print(abc['stage_extreme'].value_counts())

abc_results = run_de_analysis("ABC", abc)

# =============================================================================
# 6. Generate Comparison Figure
# =============================================================================

print(f"\n{'='*70}")
print("GENERATING FIGURES")
print(f"{'='*70}")

# Use ABC instead of MHG since MHG has no Stage I samples
fig, axes = plt.subplots(1, 2, figsize=(16, 8))

for ax, (name, results) in zip(axes, [('GCB', gcb_results), ('ABC', abc_results)]):
    if results is None:
        ax.text(0.5, 0.5, f'{name}: Insufficient samples', ha='center', va='center', fontsize=14)
        ax.set_title(name)
        continue

    df = results['results_df']
    df['neg_log_p'] = -np.log10(df['P_value'])

    colors = []
    for idx, row in df.iterrows():
        if row['FDR'] < 0.1:
            if row['Direction'] == 'Stage_III_IV_high':
                colors.append('#E74C3C')
            else:
                colors.append('#3498DB')
        elif row['P_value'] < 0.05:
            colors.append('#95A5A6')
        else:
            colors.append('#D5D8DC')

    ax.scatter(df['Log2FC'], df['neg_log_p'], c=colors, alpha=0.6, s=12, edgecolors='none')

    # Significance lines
    ax.axhline(-np.log10(0.05), color='gray', linestyle='--', linewidth=0.8, alpha=0.7)
    ax.axvline(0, color='black', linewidth=0.5, alpha=0.5)

    # FDR line if applicable
    sig_fdr01 = results['sig_fdr01']
    if len(sig_fdr01) > 0:
        fdr_threshold = sig_fdr01['P_value'].max()
        ax.axhline(-np.log10(fdr_threshold), color='red', linestyle='--', linewidth=1, alpha=0.7)

    ax.set_xlabel('Log2 Fold Change (Stage III/IV vs Stage I)', fontsize=11)
    ax.set_ylabel('-Log10(P-value)', fontsize=11)
    ax.set_title(f'{name}: Stage I (n={results["n_stage1"]}) vs Stage III/IV (n={results["n_stage34"]})\n'
                f'FDR<0.1: {len(sig_fdr01)} | p<0.05: {len(results["nom_sig"])}',
                fontsize=12, fontweight='bold')

legend_elements = [
    mpatches.Patch(color='#E74C3C', label='Stage III/IV-high (FDR<0.1)'),
    mpatches.Patch(color='#3498DB', label='Stage I-high (FDR<0.1)'),
    mpatches.Patch(color='#95A5A6', label='Nominal (p<0.05)'),
]
fig.legend(handles=legend_elements, loc='lower center', ncol=3, fontsize=10, bbox_to_anchor=(0.5, -0.02))

plt.tight_layout()
plt.subplots_adjust(bottom=0.12)
plt.savefig(os.path.join(figures_dir, "volcano_stageI_vs_III_IV_by_subtype.png"), dpi=150, bbox_inches='tight')
plt.close()
print("  Saved: volcano_stageI_vs_III_IV_by_subtype.png")

# Save results
if gcb_results:
    gcb_results['results_df'].to_csv(os.path.join(results_dir, "de_stageI_vs_III_IV_GCB.csv"), index=False)
    print("  Saved: de_stageI_vs_III_IV_GCB.csv")

if abc_results:
    abc_results['results_df'].to_csv(os.path.join(results_dir, "de_stageI_vs_III_IV_ABC.csv"), index=False)
    print("  Saved: de_stageI_vs_III_IV_ABC.csv")

# =============================================================================
# 7. Summary Comparison
# =============================================================================

print(f"\n{'='*70}")
print("COMPARISON: GCB vs ABC (Stage I vs Stage III/IV)")
print("Note: MHG has NO Stage I patients (all 10 are Stage III/IV)")
print(f"{'='*70}")

print(f"\n{'Metric':<25} {'GCB':>20} {'ABC':>20}")
print("-" * 65)

if gcb_results and abc_results:
    print(f"{'Stage I (n)':<25} {gcb_results['n_stage1']:>20} {abc_results['n_stage1']:>20}")
    print(f"{'Stage III/IV (n)':<25} {gcb_results['n_stage34']:>20} {abc_results['n_stage34']:>20}")
    print(f"{'Probes tested':<25} {len(gcb_results['results_df']):>20} {len(abc_results['results_df']):>20}")
    print(f"{'FDR < 0.1':<25} {len(gcb_results['sig_fdr01']):>20} {len(abc_results['sig_fdr01']):>20}")
    print(f"{'FDR < 0.05':<25} {len(gcb_results['sig_fdr05']):>20} {len(abc_results['sig_fdr05']):>20}")
    print(f"{'p < 0.05':<25} {len(gcb_results['nom_sig']):>20} {len(abc_results['nom_sig']):>20}")
    print(f"{'Max |Log2FC|':<25} {gcb_results['results_df']['Log2FC'].abs().max():>20.4f} {abc_results['results_df']['Log2FC'].abs().max():>20.4f}")

print(f"\n{'='*70}")
print("ANALYSIS COMPLETE")
print(f"{'='*70}")
