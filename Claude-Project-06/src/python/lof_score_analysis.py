#!/usr/bin/env python3
"""
LoF Score Analysis: Does accumulation of LoF mutations correlate with stage?
"""

import pandas as pd
import numpy as np
from scipy.stats import spearmanr, fisher_exact, chi2_contingency
import matplotlib.pyplot as plt

# Load Duke classified mutations
retention_muts = pd.read_csv('data/processed/duke_retention_classified.csv')
staging = pd.read_csv('data/processed/duke_classified_staging.csv')

print("=" * 70)
print("LoF SCORE ANALYSIS: DUKE 2017")
print("=" * 70)

# Define confident LoF categories
confident_lof = ['LoF_truncating', 'LoF_hotspot', 'LoF_likely']

# Filter to confident LoF mutations
lof_muts = retention_muts[retention_muts['functional_class'].isin(confident_lof)].copy()

print(f"\nTotal confident LoF mutations: {len(lof_muts)}")
print(f"Unique samples with LoF mutations: {lof_muts['sampleId'].nunique()}")

# Calculate LoF score per sample (number of LoF mutations)
lof_scores = lof_muts.groupby('sampleId').agg(
    LoF_count=('sampleId', 'count'),
    genes_affected=('hugoGeneSymbol', lambda x: ','.join(sorted(set(x)))),
    n_genes=('hugoGeneSymbol', 'nunique')
).reset_index()

print(f"\nLoF Score Distribution:")
print(lof_scores['LoF_count'].value_counts().sort_index())

# Merge with staging
staging['LoF_count'] = staging['sampleId'].map(
    dict(zip(lof_scores['sampleId'], lof_scores['LoF_count']))
).fillna(0).astype(int)

staging['LoF_genes'] = staging['sampleId'].map(
    dict(zip(lof_scores['sampleId'], lof_scores['n_genes']))
).fillna(0).astype(int)

# Create LoF score categories
def categorize_lof(count):
    if count == 0:
        return '0 (None)'
    elif count == 1:
        return '1'
    elif count == 2:
        return '2'
    else:
        return '3+'

staging['LoF_category'] = staging['LoF_count'].apply(categorize_lof)

print("\n" + "=" * 70)
print("STAGE BY LoF SCORE")
print("=" * 70)

# Analyze by LoF count
categories = ['0 (None)', '1', '2', '3+']
results = []

for cat in categories:
    subset = staging[staging['LoF_category'] == cat]
    n = len(subset)
    if n > 0:
        advanced = subset['Stage_Advanced'].sum()
        rate = subset['Stage_Advanced'].mean()
        results.append({
            'LoF_Score': cat,
            'N': n,
            'Advanced': advanced,
            'Limited': n - advanced,
            'Rate': rate
        })
        print(f"\nLoF Score = {cat}:")
        print(f"  N = {n}")
        print(f"  Advanced: {advanced}/{n} ({rate*100:.1f}%)")

results_df = pd.DataFrame(results)

# Test for trend (Spearman correlation)
# Convert LoF category to numeric for correlation
staging['LoF_numeric'] = staging['LoF_count'].clip(upper=3)  # Cap at 3 for correlation

# Only include samples with staging
staged = staging[staging['Stage_Advanced'].notna()]

corr, p_corr = spearmanr(staged['LoF_numeric'], staged['Stage_Advanced'])
print(f"\n" + "=" * 70)
print("CORRELATION ANALYSIS")
print("=" * 70)
print(f"\nSpearman correlation (LoF count vs Stage):")
print(f"  rho = {corr:.3f}, p = {p_corr:.4f}")

# Chi-square test for trend
contingency = pd.crosstab(staging['LoF_category'], staging['Stage_Advanced'])
print(f"\nContingency Table:")
print(contingency)

chi2, p_chi2, dof, expected = chi2_contingency(contingency)
print(f"\nChi-square test: chi2 = {chi2:.2f}, p = {p_chi2:.4f}")

# Compare 0 vs 1+ LoF mutations
print(f"\n" + "=" * 70)
print("BINARY COMPARISON: Any LoF vs None")
print("=" * 70)

has_lof = staging[staging['LoF_count'] > 0]
no_lof = staging[staging['LoF_count'] == 0]

a = int(has_lof['Stage_Advanced'].sum())
b = len(has_lof) - a
c = int(no_lof['Stage_Advanced'].sum())
d = len(no_lof) - c

print(f"\nWith LoF (1+): {a}/{a+b} ({a/(a+b)*100:.1f}%) advanced")
print(f"Without LoF: {c}/{c+d} ({c/(c+d)*100:.1f}%) advanced")

if min(a, b, c, d) > 0:
    odds = (a * d) / (b * c)
    _, p = fisher_exact([[a, b], [c, d]])
    print(f"OR = {odds:.2f}, p = {p:.4f}")

# Compare high LoF (2+) vs low/none
print(f"\n" + "=" * 70)
print("BINARY COMPARISON: High LoF (2+) vs Low/None (0-1)")
print("=" * 70)

high_lof = staging[staging['LoF_count'] >= 2]
low_lof = staging[staging['LoF_count'] < 2]

a2 = int(high_lof['Stage_Advanced'].sum())
b2 = len(high_lof) - a2
c2 = int(low_lof['Stage_Advanced'].sum())
d2 = len(low_lof) - c2

print(f"\nHigh LoF (2+): {a2}/{a2+b2} ({a2/(a2+b2)*100:.1f}%) advanced")
print(f"Low/None (0-1): {c2}/{c2+d2} ({c2/(c2+d2)*100:.1f}%) advanced")

if min(a2, b2, c2, d2) > 0:
    odds2 = (a2 * d2) / (b2 * c2)
    _, p2 = fisher_exact([[a2, b2], [c2, d2]])
    print(f"OR = {odds2:.2f}, p = {p2:.4f}")

# Look at samples with multiple affected genes
print(f"\n" + "=" * 70)
print("ANALYSIS BY NUMBER OF GENES AFFECTED")
print("=" * 70)

for n_genes in [0, 1, 2]:
    if n_genes == 2:
        subset = staging[staging['LoF_genes'] >= 2]
        label = "2+"
    else:
        subset = staging[staging['LoF_genes'] == n_genes]
        label = str(n_genes)

    n = len(subset)
    if n > 0:
        rate = subset['Stage_Advanced'].mean()
        print(f"{label} genes affected: {subset['Stage_Advanced'].sum()}/{n} ({rate*100:.1f}%) advanced")

# Save results
staging.to_csv('data/processed/duke_lof_scores.csv', index=False)
results_df.to_csv('data/processed/duke_lof_score_summary.csv', index=False)

print(f"\n" + "=" * 70)
print("SAMPLE DETAILS: High LoF Score (3+)")
print("=" * 70)

high_lof_details = staging[staging['LoF_count'] >= 3][['sampleId', 'LoF_count', 'Stage_Advanced']]
if len(high_lof_details) > 0:
    # Get gene details
    for _, row in high_lof_details.iterrows():
        sample = row['sampleId']
        genes = lof_scores[lof_scores['sampleId'] == sample]['genes_affected'].values
        genes_str = genes[0] if len(genes) > 0 else 'Unknown'
        stage = "Advanced" if row['Stage_Advanced'] else "Limited"
        print(f"  {sample}: {row['LoF_count']} mutations ({genes_str}) -> {stage}")

print("\nSaved: data/processed/duke_lof_scores.csv")
