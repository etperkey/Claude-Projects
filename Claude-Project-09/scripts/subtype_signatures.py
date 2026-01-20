"""
Build LymphGen Subtype-Specific Prognostic Gene Signatures

Creates IPI-independent signatures for each major subtype:
- EZB (GCB-like)
- BN2 (NF-kB activated)
- Other/Unclassified

Filtering criteria:
- FDR (BH-adjusted p-value) < 0.05
- |log2(HR)| >= 1.0 (HR >= 2 or HR <= 0.5, ~2-fold effect)
- Expression >= 1 (log2 scale, ~CPM >= 1) in >= 25% of samples
"""

import pandas as pd
import numpy as np
from lifelines import CoxPHFitter, KaplanMeierFitter
from lifelines.statistics import logrank_test
from statsmodels.stats.multitest import multipletests
import matplotlib.pyplot as plt
import warnings
import os

warnings.filterwarnings('ignore')

# Filtering thresholds
FDR_THRESHOLD = 0.05
LOG2_HR_THRESHOLD = 1.0  # |log2(HR)| >= 1 means HR >= 2 or HR <= 0.5
MIN_EXPR_THRESHOLD = 1.0  # log2 scale (corresponds to CPM >= 1)
MIN_SAMPLE_FRACTION = 0.25  # Gene expressed in >= 25% of samples

# Paths
DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GDC_DIR = os.path.join(DATA_DIR, "data", "GDC")
OUTPUT_DIR = os.path.join(DATA_DIR, "data", "processed")
RESULTS_DIR = os.path.join(DATA_DIR, "results")

print("=" * 70)
print("LymphGen Subtype-Specific Prognostic Signatures")
print("=" * 70)
print(f"\nFiltering criteria:")
print(f"  - FDR < {FDR_THRESHOLD}")
print(f"  - |log2(HR)| >= {LOG2_HR_THRESHOLD} (HR >= 2 or HR <= 0.5)")
print(f"  - Expression >= {MIN_EXPR_THRESHOLD} in >= {MIN_SAMPLE_FRACTION*100:.0f}% of samples")

# Load data
print("\n1. Loading data...")
clinical = pd.read_csv(os.path.join(OUTPUT_DIR, "rnaseq_themes_survival.csv"))
rnaseq = pd.read_csv(os.path.join(GDC_DIR, "RNAseq_gene_expression_562.txt"),
                     sep="\t", low_memory=False)

expr = rnaseq.set_index('Gene').drop(['Accession', 'Gene_ID'], axis=1, errors='ignore')
expr = expr.apply(pd.to_numeric, errors='coerce')

survival_samples = clinical['Sample_ID'].tolist()
expr = expr[[c for c in expr.columns if c in survival_samples]]

# Keep raw expression for filtering, z-score for Cox regression
expr_raw = expr.copy()
expr_z = expr.apply(lambda x: (x - x.mean()) / x.std() if x.std() > 0 else x * 0, axis=1)

os_df = clinical[clinical['OS_status'].notna() & clinical['OS_time_years'].notna()].copy()
ipi_map = {'Low': 0, 'Low-Intermediate': 1, 'High-Intermediate': 2, 'High': 3}
os_df['IPI_numeric'] = os_df['IPI Group'].map(ipi_map)

print(f"   Total samples with OS: {len(os_df)}")

# Function to build subtype signature
def build_subtype_signature(subtype_df, expr_z, expr_raw, subtype_name, top_n=15):
    """Build prognostic signature for a specific subtype with rigorous filtering"""
    print(f"\n{'='*60}")
    print(f"Building signature for: {subtype_name}")
    print(f"{'='*60}")

    n_samples = len(subtype_df)
    n_events = int(subtype_df['OS_status'].sum())
    print(f"Samples: {n_samples}, Deaths: {n_events} ({100*n_events/n_samples:.1f}%)")

    if n_events < 5:
        print("Insufficient events for analysis")
        return None

    # Screen genes with rigorous filtering
    results = []
    valid_samples = [s for s in subtype_df['Sample_ID'] if s in expr_z.columns]
    n_valid = len(valid_samples)

    genes_tested = 0
    genes_expr_filtered = 0
    total_genes = len(expr_z.index)

    for i, gene in enumerate(expr_z.index):
        if i % 5000 == 0:
            print(f"  Progress: {i}/{total_genes} genes...", flush=True)
        if expr_z.loc[gene].std() < 0.1:
            continue

        try:
            # Get raw expression for minimum expression filter
            raw_expr = expr_raw.loc[gene, valid_samples].values

            # Filter: expression >= MIN_EXPR_THRESHOLD in >= MIN_SAMPLE_FRACTION of samples
            expressed_frac = np.sum(raw_expr >= MIN_EXPR_THRESHOLD) / n_valid
            if expressed_frac < MIN_SAMPLE_FRACTION:
                genes_expr_filtered += 1
                continue

            gene_expr_z = expr_z.loc[gene, valid_samples].values

            cox_df = pd.DataFrame({
                'time': subtype_df.set_index('Sample_ID').loc[valid_samples, 'OS_time_years'].values,
                'event': subtype_df.set_index('Sample_ID').loc[valid_samples, 'OS_status'].values,
                'gene': gene_expr_z
            }).dropna()

            if len(cox_df) < 15:
                continue

            cph = CoxPHFitter()
            cph.fit(cox_df, duration_col='time', event_col='event')
            hr = np.exp(cph.params_['gene'])
            pval = cph.summary.loc['gene', 'p']
            log2_hr = np.log2(hr)

            genes_tested += 1
            results.append({'Gene': gene, 'HR': hr, 'log2_HR': log2_hr, 'p_value': pval})
        except:
            continue

    print(f"Genes filtered by expression: {genes_expr_filtered}")
    print(f"Genes tested: {genes_tested}")

    if len(results) == 0:
        print("No genes passed screening")
        return None

    results_df = pd.DataFrame(results)

    # Apply FDR correction (Benjamini-Hochberg)
    _, fdr_values, _, _ = multipletests(results_df['p_value'].values, method='fdr_bh')
    results_df['FDR'] = fdr_values

    # Apply filtering: FDR < threshold AND |log2(HR)| >= threshold
    sig_results = results_df[
        (results_df['FDR'] < FDR_THRESHOLD) &
        (np.abs(results_df['log2_HR']) >= LOG2_HR_THRESHOLD)
    ].copy()

    print(f"Genes with FDR < {FDR_THRESHOLD}: {(results_df['FDR'] < FDR_THRESHOLD).sum()}")
    print(f"Genes with |log2(HR)| >= {LOG2_HR_THRESHOLD}: {(np.abs(results_df['log2_HR']) >= LOG2_HR_THRESHOLD).sum()}")
    print(f"Genes passing both filters: {len(sig_results)}")

    # Get adverse (HR >= 2) and favorable (HR <= 0.5) genes
    adverse_df = sig_results[sig_results['HR'] >= 2].sort_values('FDR').head(top_n)
    favorable_df = sig_results[sig_results['HR'] <= 0.5].sort_values('FDR').head(top_n)

    adverse = adverse_df['Gene'].tolist()
    favorable = favorable_df['Gene'].tolist()

    print(f"Adverse genes (HR >= 2, FDR < {FDR_THRESHOLD}): {len(adverse)}")
    print(f"Favorable genes (HR <= 0.5, FDR < {FDR_THRESHOLD}): {len(favorable)}")

    if len(adverse) < 2 and len(favorable) < 2:
        print("Insufficient significant genes meeting criteria")
        # Fall back to top genes by p-value if strict criteria yield too few
        if len(adverse) < 2:
            adverse_df = results_df[results_df['HR'] > 1].sort_values('p_value').head(top_n)
            adverse = adverse_df['Gene'].tolist()
            print(f"  Fallback: using top {len(adverse)} adverse genes by p-value")
        if len(favorable) < 2:
            favorable_df = results_df[results_df['HR'] < 1].sort_values('p_value').head(top_n)
            favorable = favorable_df['Gene'].tolist()
            print(f"  Fallback: using top {len(favorable)} favorable genes by p-value")

    # Calculate composite score
    valid_adverse = [g for g in adverse if g in expr_z.index]
    valid_favorable = [g for g in favorable if g in expr_z.index]

    if len(valid_adverse) > 0:
        adverse_score = expr_z.loc[valid_adverse, valid_samples].mean(axis=0)
    else:
        adverse_score = pd.Series(0, index=valid_samples)

    if len(valid_favorable) > 0:
        favorable_score = expr_z.loc[valid_favorable, valid_samples].mean(axis=0)
    else:
        favorable_score = pd.Series(0, index=valid_samples)

    prog_score = adverse_score - favorable_score

    # Add to dataframe
    subtype_df = subtype_df[subtype_df['Sample_ID'].isin(valid_samples)].copy()
    subtype_df['Prog_Score'] = subtype_df['Sample_ID'].map(prog_score.to_dict())

    # Test univariate
    cox_uni = subtype_df[['OS_time_years', 'OS_status', 'Prog_Score']].dropna()
    cph_uni = CoxPHFitter()
    cph_uni.fit(cox_uni, duration_col='OS_time_years', event_col='OS_status')

    hr_uni = np.exp(cph_uni.params_['Prog_Score'])
    p_uni = cph_uni.summary.loc['Prog_Score', 'p']

    print(f"\nUnivariate: HR={hr_uni:.2f}, p={p_uni:.4f}")

    # Test with IPI if available
    ipi_sub = subtype_df[subtype_df['IPI_numeric'].notna()]
    if len(ipi_sub) >= 15 and ipi_sub['OS_status'].sum() >= 5:
        cox_multi = ipi_sub[['OS_time_years', 'OS_status', 'Prog_Score', 'IPI_numeric']].dropna()
        try:
            cph_multi = CoxPHFitter()
            cph_multi.fit(cox_multi, duration_col='OS_time_years', event_col='OS_status')
            hr_multi = np.exp(cph_multi.params_['Prog_Score'])
            p_multi = cph_multi.summary.loc['Prog_Score', 'p']
            print(f"Multivariate (+ IPI): HR={hr_multi:.2f}, p={p_multi:.4f}")
        except:
            hr_multi, p_multi = None, None
    else:
        hr_multi, p_multi = None, None

    # Top genes
    print(f"\nTop adverse genes (HR >= 2):")
    for g in adverse[:5]:
        row = results_df[results_df['Gene'] == g].iloc[0]
        print(f"  {g}: HR={row['HR']:.2f}, log2(HR)={row['log2_HR']:.2f}, FDR={row['FDR']:.4f}")

    print(f"\nTop favorable genes (HR <= 0.5):")
    for g in favorable[:5]:
        row = results_df[results_df['Gene'] == g].iloc[0]
        print(f"  {g}: HR={row['HR']:.2f}, log2(HR)={row['log2_HR']:.2f}, FDR={row['FDR']:.4f}")

    return {
        'subtype': subtype_name,
        'n_samples': n_samples,
        'n_events': n_events,
        'adverse_genes': adverse,
        'favorable_genes': favorable,
        'hr_univariate': hr_uni,
        'p_univariate': p_uni,
        'hr_multivariate': hr_multi,
        'p_multivariate': p_multi,
        'all_results': results_df
    }


# Build signatures for each subtype
subtype_signatures = {}

# EZB (largest GCB subtype)
ezb_df = os_df[os_df['LymphGen_Subtype'] == 'EZB']
if len(ezb_df) >= 20:
    result = build_subtype_signature(ezb_df, expr_z, expr_raw, 'EZB', top_n=20)
    if result:
        subtype_signatures['EZB'] = result

# BN2 (NF-kB/BCL6)
bn2_df = os_df[os_df['LymphGen_Subtype'] == 'BN2']
if len(bn2_df) >= 20:
    result = build_subtype_signature(bn2_df, expr_z, expr_raw, 'BN2', top_n=20)
    if result:
        subtype_signatures['BN2'] = result

# Other/Unclassified
other_df = os_df[os_df['LymphGen_Subtype'] == 'Other']
if len(other_df) >= 20:
    result = build_subtype_signature(other_df, expr_z, expr_raw, 'Other', top_n=20)
    if result:
        subtype_signatures['Other'] = result

# MCD (may be too small)
mcd_df = os_df[os_df['LymphGen_Subtype'] == 'MCD']
if len(mcd_df) >= 15:
    result = build_subtype_signature(mcd_df, expr_z, expr_raw, 'MCD', top_n=10)
    if result:
        subtype_signatures['MCD'] = result

# Save results
print("\n" + "=" * 70)
print("Saving subtype-specific signatures...")
print("=" * 70)

all_sig_genes = []
for subtype, sig in subtype_signatures.items():
    for gene in sig['adverse_genes']:
        row = sig['all_results'][sig['all_results']['Gene'] == gene].iloc[0]
        all_sig_genes.append({
            'Subtype': subtype,
            'Gene': gene,
            'Direction': 'Adverse',
            'HR': row['HR'],
            'log2_HR': row['log2_HR'],
            'p_value': row['p_value'],
            'FDR': row['FDR']
        })
    for gene in sig['favorable_genes']:
        row = sig['all_results'][sig['all_results']['Gene'] == gene].iloc[0]
        all_sig_genes.append({
            'Subtype': subtype,
            'Gene': gene,
            'Direction': 'Favorable',
            'HR': row['HR'],
            'log2_HR': row['log2_HR'],
            'p_value': row['p_value'],
            'FDR': row['FDR']
        })

sig_genes_df = pd.DataFrame(all_sig_genes)
sig_genes_df.to_csv(os.path.join(RESULTS_DIR, "subtype_prognostic_signatures.csv"), index=False)
print(f"Saved: subtype_prognostic_signatures.csv ({len(sig_genes_df)} genes)")

# Summary table
summary_rows = []
for subtype, sig in subtype_signatures.items():
    summary_rows.append({
        'Subtype': subtype,
        'N_samples': sig['n_samples'],
        'N_events': sig['n_events'],
        'N_adverse_genes': len(sig['adverse_genes']),
        'N_favorable_genes': len(sig['favorable_genes']),
        'HR_univariate': sig['hr_univariate'],
        'p_univariate': sig['p_univariate'],
        'HR_multivariate_IPI': sig['hr_multivariate'],
        'p_multivariate_IPI': sig['p_multivariate']
    })

summary_df = pd.DataFrame(summary_rows)
summary_df.to_csv(os.path.join(RESULTS_DIR, "subtype_signature_summary.csv"), index=False)
print(f"Saved: subtype_signature_summary.csv")

# Final summary
print("\n" + "=" * 70)
print("SUBTYPE-SPECIFIC SIGNATURE SUMMARY")
print("=" * 70)

print(f"\n{'Subtype':<10} {'N':>6} {'Events':>8} {'Genes':>8} {'HR_uni':>8} {'p_uni':>10} {'HR_IPI':>8} {'p_IPI':>10}")
print("-" * 80)
for _, row in summary_df.iterrows():
    hr_ipi = f"{row['HR_multivariate_IPI']:.2f}" if pd.notna(row['HR_multivariate_IPI']) else "N/A"
    p_ipi = f"{row['p_multivariate_IPI']:.4f}" if pd.notna(row['p_multivariate_IPI']) else "N/A"
    print(f"{row['Subtype']:<10} {row['N_samples']:>6} {row['N_events']:>8} "
          f"{row['N_adverse_genes'] + row['N_favorable_genes']:>8} "
          f"{row['HR_univariate']:>8.2f} {row['p_univariate']:>10.4f} {hr_ipi:>8} {p_ipi:>10}")

print("\n" + "=" * 70)
