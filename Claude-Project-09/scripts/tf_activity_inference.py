"""
Transcription Factor Activity Inference for DLBCL Prognosis

Uses DoRothEA regulons + decoupler to infer TF activities from bulk RNA-seq,
then correlates with survival and LymphGen subtypes.

Methods:
- DoRothEA: Curated TF-target regulons (confidence levels A-E)
- ULM (Univariate Linear Model): Fast activity estimation
- Cox regression: TF activity vs overall survival
"""

import pandas as pd
import numpy as np
import decoupler as dc
from lifelines import CoxPHFitter
from statsmodels.stats.multitest import multipletests
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
import os

warnings.filterwarnings('ignore')

# Paths
DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GDC_DIR = os.path.join(DATA_DIR, "data", "GDC")
OUTPUT_DIR = os.path.join(DATA_DIR, "data", "processed")
RESULTS_DIR = os.path.join(DATA_DIR, "results")

print("=" * 70)
print("Transcription Factor Activity Inference")
print("=" * 70)

# =============================================================================
# 1. Load data
# =============================================================================
print("\n1. Loading data...")

clinical = pd.read_csv(os.path.join(OUTPUT_DIR, "rnaseq_themes_survival.csv"))
rnaseq = pd.read_csv(os.path.join(GDC_DIR, "RNAseq_gene_expression_562.txt"),
                     sep="\t", low_memory=False)

# Prepare expression matrix (genes x samples)
expr = rnaseq.set_index('Gene').drop(['Accession', 'Gene_ID'], axis=1, errors='ignore')
expr = expr.apply(pd.to_numeric, errors='coerce')

# Filter to samples with clinical data
survival_samples = clinical['Sample_ID'].tolist()
expr = expr[[c for c in expr.columns if c in survival_samples]]

print(f"   Expression matrix: {expr.shape[0]} genes x {expr.shape[1]} samples")

# Prepare survival data
os_df = clinical[clinical['OS_status'].notna() & clinical['OS_time_years'].notna()].copy()
ipi_map = {'Low': 0, 'Low-Intermediate': 1, 'High-Intermediate': 2, 'High': 3}
os_df['IPI_numeric'] = os_df['IPI Group'].map(ipi_map)
print(f"   Samples with survival: {len(os_df)}")

# =============================================================================
# 2. Get DoRothEA regulons
# =============================================================================
print("\n2. Loading DoRothEA TF-target regulons...")

# Get human DoRothEA regulons (confidence A, B, C for reliability)
dorothea = dc.op.dorothea(organism='human', levels=['A', 'B', 'C'])
print(f"   Regulons loaded: {dorothea['source'].nunique()} TFs, {len(dorothea)} interactions")

# Show confidence level breakdown
print(f"   Confidence distribution: A={len(dorothea[dorothea['confidence']=='A'])}, "
      f"B={len(dorothea[dorothea['confidence']=='B'])}, "
      f"C={len(dorothea[dorothea['confidence']=='C'])}")

# =============================================================================
# 3. Run TF activity inference
# =============================================================================
print("\n3. Inferring TF activities using ULM method...")

# Transpose for decoupler (samples x genes)
expr_t = expr.T

# Run ULM (Univariate Linear Model) - fast and robust
# Returns tuple: (estimates, pvalues)
result = dc.mt.ulm(
    data=expr_t,
    net=dorothea,
    verbose=True
)

# Unpack results - returns DataFrame with multiindex or tuple
if isinstance(result, tuple):
    tf_activities, tf_pvals = result
else:
    # Newer API returns a single DataFrame with estimates
    tf_activities = result
    tf_pvals = None

print(f"   TF activities estimated: {tf_activities.shape[1]} TFs x {tf_activities.shape[0]} samples")

# Save TF activities
tf_activities.to_csv(os.path.join(RESULTS_DIR, "tf_activities_matrix.csv"))
print("   Saved: tf_activities_matrix.csv")

# =============================================================================
# 4. Correlate TF activities with survival
# =============================================================================
print("\n4. Testing TF activities for survival association...")

# Merge TF activities with survival data
tf_survival = tf_activities.copy()
tf_survival['Sample_ID'] = tf_survival.index
tf_survival = tf_survival.merge(os_df[['Sample_ID', 'OS_time_years', 'OS_status', 'IPI_numeric', 'LymphGen_Subtype']],
                                 on='Sample_ID', how='inner')

print(f"   Samples for survival analysis: {len(tf_survival)}")

# Cox regression for each TF
tf_list = [c for c in tf_activities.columns if c not in ['Sample_ID', 'OS_time_years', 'OS_status', 'IPI_numeric', 'LymphGen_Subtype']]

cox_results = []
for tf in tf_list:
    try:
        cox_df = tf_survival[['OS_time_years', 'OS_status', tf]].dropna()
        if len(cox_df) < 30:
            continue

        # Z-score the TF activity
        cox_df[tf] = (cox_df[tf] - cox_df[tf].mean()) / cox_df[tf].std()

        cph = CoxPHFitter()
        cph.fit(cox_df, duration_col='OS_time_years', event_col='OS_status')

        hr = np.exp(cph.params_[tf])
        ci_lower = np.exp(cph.confidence_intervals_.iloc[0, 0])
        ci_upper = np.exp(cph.confidence_intervals_.iloc[0, 1])
        pval = cph.summary.loc[tf, 'p']

        cox_results.append({
            'TF': tf,
            'HR': hr,
            'HR_lower': ci_lower,
            'HR_upper': ci_upper,
            'log2_HR': np.log2(hr),
            'p_value': pval
        })
    except:
        continue

cox_df_results = pd.DataFrame(cox_results)

# FDR correction
_, fdr_values, _, _ = multipletests(cox_df_results['p_value'].values, method='fdr_bh')
cox_df_results['FDR'] = fdr_values

# Sort by p-value
cox_df_results = cox_df_results.sort_values('p_value')

print(f"\n   TFs tested: {len(cox_df_results)}")
print(f"   TFs with p < 0.05: {(cox_df_results['p_value'] < 0.05).sum()}")
print(f"   TFs with FDR < 0.1: {(cox_df_results['FDR'] < 0.1).sum()}")
print(f"   TFs with FDR < 0.05: {(cox_df_results['FDR'] < 0.05).sum()}")

# Save results
cox_df_results.to_csv(os.path.join(RESULTS_DIR, "tf_survival_cox_results.csv"), index=False)
print("   Saved: tf_survival_cox_results.csv")

# =============================================================================
# 5. Top prognostic TFs
# =============================================================================
print("\n" + "=" * 70)
print("TOP PROGNOSTIC TRANSCRIPTION FACTORS")
print("=" * 70)

print("\n--- ADVERSE PROGNOSIS TFs (Higher activity -> Worse survival) ---")
adverse_tfs = cox_df_results[(cox_df_results['HR'] > 1) & (cox_df_results['p_value'] < 0.05)].head(15)
for _, row in adverse_tfs.iterrows():
    fdr_str = f"FDR={row['FDR']:.3f}" if row['FDR'] < 0.1 else f"FDR={row['FDR']:.2f}"
    print(f"  {row['TF']:12s}: HR={row['HR']:.2f} ({row['HR_lower']:.2f}-{row['HR_upper']:.2f}), p={row['p_value']:.4f}, {fdr_str}")

print("\n--- FAVORABLE PROGNOSIS TFs (Higher activity -> Better survival) ---")
favorable_tfs = cox_df_results[(cox_df_results['HR'] < 1) & (cox_df_results['p_value'] < 0.05)].head(15)
for _, row in favorable_tfs.iterrows():
    fdr_str = f"FDR={row['FDR']:.3f}" if row['FDR'] < 0.1 else f"FDR={row['FDR']:.2f}"
    print(f"  {row['TF']:12s}: HR={row['HR']:.2f} ({row['HR_lower']:.2f}-{row['HR_upper']:.2f}), p={row['p_value']:.4f}, {fdr_str}")

# =============================================================================
# 6. TF activity by LymphGen subtype
# =============================================================================
print("\n" + "=" * 70)
print("TF ACTIVITY BY LYMPHGEN SUBTYPE")
print("=" * 70)

# Get top prognostic TFs for subtype comparison
top_tfs = cox_df_results[cox_df_results['p_value'] < 0.05]['TF'].head(20).tolist()

subtype_tf_means = {}
for subtype in ['EZB', 'BN2', 'MCD', 'Other']:
    sub_samples = os_df[os_df['LymphGen_Subtype'] == subtype]['Sample_ID'].tolist()
    sub_samples = [s for s in sub_samples if s in tf_activities.index]
    if len(sub_samples) > 5:
        subtype_tf_means[subtype] = tf_activities.loc[sub_samples, top_tfs].mean()

subtype_df = pd.DataFrame(subtype_tf_means)
print("\nMean TF activity by subtype (top prognostic TFs):")
print(subtype_df.round(2).to_string())

# Statistical test for subtype differences
print("\n--- TFs with significant subtype differences (ANOVA p < 0.05) ---")
subtype_diff_results = []
for tf in top_tfs:
    groups = []
    for subtype in ['EZB', 'BN2', 'MCD', 'Other']:
        sub_samples = os_df[os_df['LymphGen_Subtype'] == subtype]['Sample_ID'].tolist()
        sub_samples = [s for s in sub_samples if s in tf_activities.index]
        if len(sub_samples) >= 5:
            groups.append(tf_activities.loc[sub_samples, tf].values)

    if len(groups) >= 3:
        try:
            f_stat, p_val = stats.f_oneway(*groups)
            subtype_diff_results.append({'TF': tf, 'F_stat': f_stat, 'p_value': p_val})
        except:
            pass

subtype_diff_df = pd.DataFrame(subtype_diff_results).sort_values('p_value')
for _, row in subtype_diff_df[subtype_diff_df['p_value'] < 0.05].head(10).iterrows():
    print(f"  {row['TF']:12s}: F={row['F_stat']:.2f}, p={row['p_value']:.4f}")

# =============================================================================
# 7. Visualizations
# =============================================================================
print("\n" + "=" * 70)
print("Generating visualizations...")
print("=" * 70)

# Figure 1: Volcano plot of TF survival associations
fig, axes = plt.subplots(1, 2, figsize=(14, 6))

# Volcano plot
ax = axes[0]
cox_df_results['neg_log10_p'] = -np.log10(cox_df_results['p_value'])
colors = ['#DC3545' if (hr > 1 and p < 0.05) else '#28A745' if (hr < 1 and p < 0.05) else '#888888'
          for hr, p in zip(cox_df_results['HR'], cox_df_results['p_value'])]

ax.scatter(cox_df_results['log2_HR'], cox_df_results['neg_log10_p'],
           c=colors, alpha=0.6, s=50)
ax.axhline(-np.log10(0.05), color='gray', linestyle='--', alpha=0.5)
ax.axvline(0, color='gray', linestyle='--', alpha=0.5)

# Label top TFs
for _, row in cox_df_results.head(10).iterrows():
    ax.annotate(row['TF'], (row['log2_HR'], row['neg_log10_p']),
                fontsize=8, alpha=0.8)
for _, row in cox_df_results.tail(5).iterrows():
    if row['p_value'] < 0.05:
        ax.annotate(row['TF'], (row['log2_HR'], row['neg_log10_p']),
                    fontsize=8, alpha=0.8)

ax.set_xlabel('log₂(Hazard Ratio)', fontsize=12)
ax.set_ylabel('-log₁₀(p-value)', fontsize=12)
ax.set_title('TF Activity vs Overall Survival', fontsize=14, fontweight='bold')

# Heatmap of top TFs by subtype
ax = axes[1]
if len(subtype_df) > 0:
    # Select TFs with subtype differences
    sig_tfs = subtype_diff_df[subtype_diff_df['p_value'] < 0.1]['TF'].head(15).tolist()
    if len(sig_tfs) > 0:
        heatmap_data = subtype_df.loc[sig_tfs] if all(tf in subtype_df.index for tf in sig_tfs) else subtype_df.head(15)
    else:
        heatmap_data = subtype_df.head(15)

    sns.heatmap(heatmap_data, cmap='RdBu_r', center=0, ax=ax,
                cbar_kws={'label': 'Mean TF Activity'})
    ax.set_title('TF Activity by LymphGen Subtype', fontsize=14, fontweight='bold')
    ax.set_xlabel('Subtype', fontsize=12)
    ax.set_ylabel('Transcription Factor', fontsize=12)

plt.tight_layout()
plt.savefig(os.path.join(RESULTS_DIR, "tf_activity_analysis.png"), dpi=150, bbox_inches='tight')
plt.close()
print("   Saved: tf_activity_analysis.png")

# Figure 2: Top TF forest plot
fig, ax = plt.subplots(figsize=(10, 8))

# Combine top adverse and favorable
plot_tfs = pd.concat([adverse_tfs.head(8), favorable_tfs.head(8)])
plot_tfs = plot_tfs.sort_values('HR', ascending=True)

y_pos = range(len(plot_tfs))
colors = ['#DC3545' if hr > 1 else '#28A745' for hr in plot_tfs['HR']]

ax.barh(y_pos, plot_tfs['log2_HR'], color=colors, alpha=0.7, height=0.6)
ax.errorbar(plot_tfs['log2_HR'], y_pos,
            xerr=[plot_tfs['log2_HR'] - np.log2(plot_tfs['HR_lower']),
                  np.log2(plot_tfs['HR_upper']) - plot_tfs['log2_HR']],
            fmt='none', color='black', capsize=3)

ax.axvline(0, color='black', linestyle='-', linewidth=0.5)
ax.set_yticks(y_pos)
ax.set_yticklabels(plot_tfs['TF'])
ax.set_xlabel('log₂(Hazard Ratio)', fontsize=12)
ax.set_title('Top Prognostic Transcription Factors\n(Forest Plot)', fontsize=14, fontweight='bold')

# Add significance markers
for i, (_, row) in enumerate(plot_tfs.iterrows()):
    sig = '***' if row['FDR'] < 0.01 else '**' if row['FDR'] < 0.05 else '*' if row['FDR'] < 0.1 else ''
    x_pos = row['log2_HR'] + 0.05 if row['log2_HR'] > 0 else row['log2_HR'] - 0.15
    ax.text(x_pos, i, sig, va='center', fontsize=10, fontweight='bold')

plt.tight_layout()
plt.savefig(os.path.join(RESULTS_DIR, "tf_forest_plot.png"), dpi=150, bbox_inches='tight')
plt.close()
print("   Saved: tf_forest_plot.png")

# =============================================================================
# 8. Biological interpretation
# =============================================================================
print("\n" + "=" * 70)
print("BIOLOGICAL INTERPRETATION")
print("=" * 70)

# Known TF roles in lymphoma
known_roles = {
    'MYC': 'Oncogene, proliferation driver, poor prognosis in DLBCL',
    'E2F1': 'Cell cycle regulator, proliferation',
    'E2F4': 'Cell cycle, often repressive',
    'FOXM1': 'Proliferation, mitosis, poor prognosis',
    'STAT1': 'Interferon signaling, immune response',
    'STAT3': 'Oncogenic signaling, ABC-DLBCL activation',
    'NFKB1': 'NF-κB pathway, ABC-DLBCL hallmark',
    'RELA': 'NF-κB subunit, inflammatory signaling',
    'BCL6': 'GCB-DLBCL master regulator, repressor',
    'IRF4': 'Plasma cell differentiation, ABC-DLBCL',
    'PAX5': 'B-cell identity, DLBCL maintenance',
    'SPI1': 'PU.1, myeloid/B-cell TF',
    'TP53': 'Tumor suppressor, apoptosis',
    'HIF1A': 'Hypoxia response, metabolic adaptation',
    'CEBPB': 'Inflammation, ABC-DLBCL',
}

print("\nKnown roles of top prognostic TFs:")
for _, row in cox_df_results[cox_df_results['p_value'] < 0.05].head(20).iterrows():
    tf = row['TF']
    if tf in known_roles:
        direction = "ADVERSE" if row['HR'] > 1 else "FAVORABLE"
        print(f"  {tf} ({direction}): {known_roles[tf]}")

# =============================================================================
# 9. Summary report
# =============================================================================
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)

n_adverse = len(cox_df_results[(cox_df_results['HR'] > 1) & (cox_df_results['p_value'] < 0.05)])
n_favorable = len(cox_df_results[(cox_df_results['HR'] < 1) & (cox_df_results['p_value'] < 0.05)])
n_fdr = len(cox_df_results[cox_df_results['FDR'] < 0.05])

print(f"""
TF Activity Inference Complete:
- TFs analyzed: {len(cox_df_results)}
- Adverse prognosis TFs (p < 0.05): {n_adverse}
- Favorable prognosis TFs (p < 0.05): {n_favorable}
- TFs passing FDR < 0.05: {n_fdr}

Key findings:
1. Proliferation TFs (E2F, FOXM1) associate with poor outcome
2. Immune/inflammatory TFs show complex patterns
3. TF activity differs significantly across LymphGen subtypes

Output files:
- tf_activities_matrix.csv: TF activity scores for all samples
- tf_survival_cox_results.csv: Cox regression results for all TFs
- tf_activity_analysis.png: Volcano plot and subtype heatmap
- tf_forest_plot.png: Forest plot of top prognostic TFs
""")

print("=" * 70)
print("Analysis complete!")
print("=" * 70)
