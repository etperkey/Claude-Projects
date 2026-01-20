"""
Build IPI-Independent Prognostic Gene Signatures for DLBCL

Strategy:
1. Use larger sample set (all with OS data) for univariate screening
2. Build composite scores from top adverse/favorable genes
3. Test composite scores in multivariate models with IPI
4. Create subtype-specific signatures
"""

import pandas as pd
import numpy as np
from lifelines import CoxPHFitter, KaplanMeierFitter
from lifelines.statistics import logrank_test
import matplotlib.pyplot as plt
import warnings
import os

warnings.filterwarnings('ignore')

# Paths
DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GDC_DIR = os.path.join(DATA_DIR, "data", "GDC")
OUTPUT_DIR = os.path.join(DATA_DIR, "data", "processed")
RESULTS_DIR = os.path.join(DATA_DIR, "results")

os.makedirs(RESULTS_DIR, exist_ok=True)

print("=" * 70)
print("Building IPI-Independent Prognostic Gene Signatures")
print("=" * 70)

# 1. Load all data
print("\n1. Loading data...")

clinical = pd.read_csv(os.path.join(OUTPUT_DIR, "rnaseq_themes_survival.csv"))
rnaseq = pd.read_csv(os.path.join(GDC_DIR, "RNAseq_gene_expression_562.txt"),
                     sep="\t", low_memory=False)

# Prepare expression
expr = rnaseq.set_index('Gene').drop(['Accession', 'Gene_ID'], axis=1, errors='ignore')
expr = expr.apply(pd.to_numeric, errors='coerce')

# Filter to survival samples
survival_samples = clinical['Sample_ID'].tolist()
expr = expr[[c for c in expr.columns if c in survival_samples]]

# Z-score
expr_z = expr.apply(lambda x: (x - x.mean()) / x.std() if x.std() > 0 else x * 0, axis=1)

# Samples with OS data (no IPI requirement yet)
os_df = clinical[clinical['OS_status'].notna() & clinical['OS_time_years'].notna()].copy()
print(f"   Samples with OS data: {len(os_df)}")
print(f"   Deaths: {int(os_df['OS_status'].sum())} ({100*os_df['OS_status'].mean():.1f}%)")

# 2. Quick univariate screening on full OS cohort
print("\n2. Univariate gene screening (full OS cohort)...")

def quick_cox_screen(expr_data, clinical_data, top_n=100):
    """Fast univariate Cox screening"""
    results = []
    sample_ids = clinical_data['Sample_ID'].tolist()
    valid_samples = [s for s in sample_ids if s in expr_data.columns]

    for gene in expr_data.index:
        if expr_data.loc[gene].std() < 0.1:
            continue
        try:
            cox_df = pd.DataFrame({
                'time': clinical_data.set_index('Sample_ID').loc[valid_samples, 'OS_time_years'].values,
                'event': clinical_data.set_index('Sample_ID').loc[valid_samples, 'OS_status'].values,
                'gene': expr_data.loc[gene, valid_samples].values
            }).dropna()

            if len(cox_df) < 50:
                continue

            cph = CoxPHFitter()
            cph.fit(cox_df, duration_col='time', event_col='event')
            hr = np.exp(cph.params_['gene'])
            pval = cph.summary.loc['gene', 'p']

            results.append({'Gene': gene, 'HR': hr, 'p_value': pval})
        except:
            continue

    results_df = pd.DataFrame(results).sort_values('p_value')
    return results_df

screen_results = quick_cox_screen(expr_z, os_df)
print(f"   Screened {len(screen_results)} genes")

# Get top adverse and favorable genes
top_adverse = screen_results[(screen_results['HR'] > 1) & (screen_results['p_value'] < 0.01)].head(30)['Gene'].tolist()
top_favorable = screen_results[(screen_results['HR'] < 1) & (screen_results['p_value'] < 0.01)].head(30)['Gene'].tolist()

print(f"   Top adverse genes (p<0.01, HR>1): {len(top_adverse)}")
print(f"   Top favorable genes (p<0.01, HR<1): {len(top_favorable)}")

# 3. Build composite prognostic score
print("\n3. Building composite prognostic score...")

def calculate_signature_score(expr_data, adverse_genes, favorable_genes, samples):
    """Calculate prognostic score: mean(adverse) - mean(favorable)"""
    valid_adverse = [g for g in adverse_genes if g in expr_data.index]
    valid_favorable = [g for g in favorable_genes if g in expr_data.index]

    adverse_score = expr_data.loc[valid_adverse, samples].mean(axis=0)
    favorable_score = expr_data.loc[valid_favorable, samples].mean(axis=0)

    # Higher score = worse prognosis
    return adverse_score - favorable_score

# Calculate score for all samples
valid_samples = [s for s in os_df['Sample_ID'] if s in expr_z.columns]
prog_score = calculate_signature_score(expr_z, top_adverse, top_favorable, valid_samples)

# Add to clinical data
os_df = os_df[os_df['Sample_ID'].isin(valid_samples)].copy()
os_df['Prognostic_Score'] = os_df['Sample_ID'].map(prog_score.to_dict())

print(f"   Score range: {os_df['Prognostic_Score'].min():.2f} to {os_df['Prognostic_Score'].max():.2f}")

# 4. Test signature in multivariate model with IPI
print("\n4. Testing signature independence from IPI...")

# Prepare IPI
ipi_map = {'Low': 0, 'Low-Intermediate': 1, 'High-Intermediate': 2, 'High': 3}
os_df['IPI_numeric'] = os_df['IPI Group'].map(ipi_map)

# Subset with complete IPI
ipi_df = os_df[os_df['IPI_numeric'].notna()].copy()
print(f"   Samples with IPI: {len(ipi_df)}, Deaths: {int(ipi_df['OS_status'].sum())}")

# Model 1: Signature only
cox1_df = ipi_df[['OS_time_years', 'OS_status', 'Prognostic_Score']].dropna()
cph1 = CoxPHFitter()
cph1.fit(cox1_df, duration_col='OS_time_years', event_col='OS_status')
print("\n   Model 1: Signature only")
print(f"      HR = {np.exp(cph1.params_['Prognostic_Score']):.2f}")
print(f"      95% CI: ({np.exp(cph1.confidence_intervals_.iloc[0,0]):.2f} - {np.exp(cph1.confidence_intervals_.iloc[0,1]):.2f})")
print(f"      p-value = {cph1.summary.loc['Prognostic_Score', 'p']:.4f}")

# Model 2: IPI only
cox2_df = ipi_df[['OS_time_years', 'OS_status', 'IPI_numeric']].dropna()
cph2 = CoxPHFitter()
cph2.fit(cox2_df, duration_col='OS_time_years', event_col='OS_status')
print("\n   Model 2: IPI only")
print(f"      HR = {np.exp(cph2.params_['IPI_numeric']):.2f}")
print(f"      95% CI: ({np.exp(cph2.confidence_intervals_.iloc[0,0]):.2f} - {np.exp(cph2.confidence_intervals_.iloc[0,1]):.2f})")
print(f"      p-value = {cph2.summary.loc['IPI_numeric', 'p']:.4f}")

# Model 3: Signature + IPI (test independence)
cox3_df = ipi_df[['OS_time_years', 'OS_status', 'Prognostic_Score', 'IPI_numeric']].dropna()
cph3 = CoxPHFitter()
cph3.fit(cox3_df, duration_col='OS_time_years', event_col='OS_status')
print("\n   Model 3: Signature + IPI (MULTIVARIATE)")
for var in ['Prognostic_Score', 'IPI_numeric']:
    hr = np.exp(cph3.params_[var])
    ci_low = np.exp(cph3.confidence_intervals_.loc[var, '95% lower-bound'])
    ci_high = np.exp(cph3.confidence_intervals_.loc[var, '95% upper-bound'])
    pval = cph3.summary.loc[var, 'p']
    sig = "***" if pval < 0.001 else "**" if pval < 0.01 else "*" if pval < 0.05 else ""
    print(f"      {var}: HR={hr:.2f} ({ci_low:.2f}-{ci_high:.2f}), p={pval:.4f} {sig}")

# 5. Stratify by risk groups
print("\n5. Creating risk groups...")

# Tertiles
os_df['Risk_Group'] = pd.qcut(os_df['Prognostic_Score'], q=3, labels=['Low', 'Medium', 'High'])

print("   Risk group distribution:")
for group in ['Low', 'Medium', 'High']:
    sub = os_df[os_df['Risk_Group'] == group]
    deaths = int(sub['OS_status'].sum())
    pct = 100 * sub['OS_status'].mean()
    print(f"      {group}: n={len(sub)}, deaths={deaths} ({pct:.1f}%)")

# Log-rank test
low = os_df[os_df['Risk_Group'] == 'Low']
high = os_df[os_df['Risk_Group'] == 'High']
lr = logrank_test(low['OS_time_years'], high['OS_time_years'],
                  event_observed_A=low['OS_status'], event_observed_B=high['OS_status'])
print(f"\n   Log-rank test (Low vs High): p = {lr.p_value:.2e}")

# 6. Subtype-specific analysis
print("\n6. Subtype-specific signature performance...")

for subtype in ['EZB', 'BN2', 'MCD', 'Other']:
    sub_df = os_df[os_df['LymphGen_Subtype'] == subtype]

    if len(sub_df) >= 20 and sub_df['OS_status'].sum() >= 5:
        sub_low = sub_df[sub_df['Risk_Group'] == 'Low']
        sub_high = sub_df[sub_df['Risk_Group'] == 'High']

        if len(sub_low) >= 3 and len(sub_high) >= 3:
            try:
                cox_sub = sub_df[['OS_time_years', 'OS_status', 'Prognostic_Score']].dropna()
                cph_sub = CoxPHFitter()
                cph_sub.fit(cox_sub, duration_col='OS_time_years', event_col='OS_status')
                hr = np.exp(cph_sub.params_['Prognostic_Score'])
                pval = cph_sub.summary.loc['Prognostic_Score', 'p']
                sig = "*" if pval < 0.05 else ""
                print(f"   {subtype}: n={len(sub_df)}, HR={hr:.2f}, p={pval:.4f} {sig}")
            except:
                print(f"   {subtype}: n={len(sub_df)}, model failed")
        else:
            print(f"   {subtype}: n={len(sub_df)}, insufficient in risk groups")
    else:
        print(f"   {subtype}: n={len(sub_df)}, insufficient for analysis")

# 7. Save signature genes and results
print("\n7. Saving results...")

# Signature genes
signature_df = pd.DataFrame({
    'Gene': top_adverse + top_favorable,
    'Direction': ['Adverse'] * len(top_adverse) + ['Favorable'] * len(top_favorable),
    'HR': [screen_results[screen_results['Gene'] == g]['HR'].values[0]
           for g in top_adverse + top_favorable],
    'p_value': [screen_results[screen_results['Gene'] == g]['p_value'].values[0]
                for g in top_adverse + top_favorable]
})
signature_df.to_csv(os.path.join(RESULTS_DIR, "prognostic_signature_genes.csv"), index=False)

# Patient scores
patient_scores = os_df[['Sample_ID', 'Prognostic_Score', 'Risk_Group', 'LymphGen_Subtype',
                        'COO', 'OS_status', 'OS_time_years', 'IPI Group']].copy()
patient_scores.to_csv(os.path.join(RESULTS_DIR, "patient_prognostic_scores.csv"), index=False)

print(f"   Saved: prognostic_signature_genes.csv ({len(signature_df)} genes)")
print(f"   Saved: patient_prognostic_scores.csv ({len(patient_scores)} patients)")

# 8. Generate Kaplan-Meier plot
print("\n8. Generating Kaplan-Meier survival plot...")

fig, ax = plt.subplots(figsize=(10, 7))

kmf = KaplanMeierFitter()
colors = {'Low': 'green', 'Medium': 'orange', 'High': 'red'}

for group in ['Low', 'Medium', 'High']:
    sub = os_df[os_df['Risk_Group'] == group]
    kmf.fit(sub['OS_time_years'], event_observed=sub['OS_status'], label=f'{group} Risk (n={len(sub)})')
    kmf.plot_survival_function(ax=ax, color=colors[group], ci_show=True)

ax.set_xlabel('Time (years)', fontsize=12)
ax.set_ylabel('Overall Survival Probability', fontsize=12)
ax.set_title('IPI-Independent Prognostic Signature\nKaplan-Meier Survival by Risk Group', fontsize=14)
ax.legend(loc='lower left', fontsize=10)
ax.set_xlim(0, 10)
ax.set_ylim(0, 1)

# Add log-rank p-value
ax.text(0.95, 0.95, f'Log-rank p = {lr.p_value:.2e}', transform=ax.transAxes,
        fontsize=11, verticalalignment='top', horizontalalignment='right',
        bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))

plt.tight_layout()
plt.savefig(os.path.join(RESULTS_DIR, "prognostic_signature_km_plot.png"), dpi=150)
plt.close()

print(f"   Saved: prognostic_signature_km_plot.png")

# 9. Summary
print("\n" + "=" * 70)
print("SUMMARY: IPI-Independent Prognostic Signature")
print("=" * 70)
print(f"\nSignature composition:")
print(f"  - {len(top_adverse)} adverse prognosis genes")
print(f"  - {len(top_favorable)} favorable prognosis genes")
print(f"\nKey genes (top 5 adverse):")
for g in top_adverse[:5]:
    hr = screen_results[screen_results['Gene'] == g]['HR'].values[0]
    print(f"  {g}: HR={hr:.2f}")
print(f"\nKey genes (top 5 favorable):")
for g in top_favorable[:5]:
    hr = screen_results[screen_results['Gene'] == g]['HR'].values[0]
    print(f"  {g}: HR={hr:.2f}")
print(f"\nMultivariate model (Signature + IPI):")
print(f"  Signature: HR={np.exp(cph3.params_['Prognostic_Score']):.2f}, p={cph3.summary.loc['Prognostic_Score', 'p']:.4f}")
print(f"  IPI:       HR={np.exp(cph3.params_['IPI_numeric']):.2f}, p={cph3.summary.loc['IPI_numeric', 'p']:.4f}")
print(f"\n*** Signature remains significant after adjusting for IPI ***" if cph3.summary.loc['Prognostic_Score', 'p'] < 0.05 else "\nSignature not independently significant")
