#!/usr/bin/env python3
"""
Analyze LoF retention mutations in GCB-enriched Duke cohort
(excluding samples with ABC/MCD markers)
"""

import pandas as pd
import numpy as np
from scipy.stats import fisher_exact, spearmanr

# Load data
lof_data = pd.read_csv('data/processed/duke_lof_scores.csv')
abc_samples = pd.read_csv('data/processed/duke_abc_marker_samples.csv')
retention_muts = pd.read_csv('data/processed/duke_retention_classified.csv')

print("=" * 70)
print("GCB-ENRICHED ANALYSIS: EXCLUDING ABC/MCD MARKERS")
print("=" * 70)

# ABC samples to exclude
abc_list = abc_samples['sampleId'].tolist()
print(f"\nSamples with ABC/MCD markers (to exclude): {len(abc_list)}")

# Filter to GCB-enriched cohort
gcb_enriched = lof_data[~lof_data['sampleId'].isin(abc_list)].copy()
print(f"GCB-enriched cohort: {len(gcb_enriched)} samples")

# Also filter retention mutations
gcb_retention = retention_muts[~retention_muts['sampleId'].isin(abc_list)]
print(f"Retention mutations in GCB-enriched: {len(gcb_retention)}")

# Recalculate LoF scores for GCB-enriched
confident_lof = ['LoF_truncating', 'LoF_hotspot', 'LoF_likely']
gcb_lof = gcb_retention[gcb_retention['functional_class'].isin(confident_lof)]

lof_scores = gcb_lof.groupby('sampleId').size().reset_index(name='LoF_count')
gcb_enriched['LoF_count'] = gcb_enriched['sampleId'].map(
    dict(zip(lof_scores['sampleId'], lof_scores['LoF_count']))
).fillna(0).astype(int)

def categorize_lof(count):
    if count == 0:
        return '0 (None)'
    elif count == 1:
        return '1'
    elif count == 2:
        return '2'
    else:
        return '3+'

gcb_enriched['LoF_category'] = gcb_enriched['LoF_count'].apply(categorize_lof)

print("\n" + "=" * 70)
print("STAGE BY LoF SCORE (GCB-ENRICHED)")
print("=" * 70)

categories = ['0 (None)', '1', '2', '3+']
for cat in categories:
    subset = gcb_enriched[gcb_enriched['LoF_category'] == cat]
    n = len(subset)
    if n > 0:
        advanced = subset['Stage_Advanced'].sum()
        rate = subset['Stage_Advanced'].mean()
        print(f"\nLoF Score = {cat}:")
        print(f"  N = {n}")
        print(f"  Advanced: {advanced}/{n} ({rate*100:.1f}%)")

# Spearman correlation
gcb_enriched['LoF_numeric'] = gcb_enriched['LoF_count'].clip(upper=3)
corr, p_corr = spearmanr(gcb_enriched['LoF_numeric'], gcb_enriched['Stage_Advanced'])
print(f"\n" + "=" * 70)
print("CORRELATION ANALYSIS (GCB-ENRICHED)")
print("=" * 70)
print(f"\nSpearman correlation (LoF count vs Stage):")
print(f"  rho = {corr:.3f}, p = {p_corr:.4f}")

# Binary comparison: Any LoF vs None
print(f"\n" + "=" * 70)
print("BINARY: Any LoF vs None (GCB-ENRICHED)")
print("=" * 70)

has_lof = gcb_enriched[gcb_enriched['LoF_count'] > 0]
no_lof = gcb_enriched[gcb_enriched['LoF_count'] == 0]

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

# Compare with pan-DLBCL
print(f"\n" + "=" * 70)
print("COMPARISON: GCB-ENRICHED vs PAN-DLBCL")
print("=" * 70)

# Pan-DLBCL results (from earlier)
pan_has_lof = lof_data[lof_data['LoF_count'] > 0]
pan_no_lof = lof_data[lof_data['LoF_count'] == 0]

pa = int(pan_has_lof['Stage_Advanced'].sum())
pb = len(pan_has_lof) - pa
pc = int(pan_no_lof['Stage_Advanced'].sum())
pd_val = len(pan_no_lof) - pc

pan_or = (pa * pd_val) / (pb * pc)
_, pan_p = fisher_exact([[pa, pb], [pc, pd_val]])

print(f"\nPan-DLBCL (n={len(lof_data)}):")
print(f"  LoF+: {pa}/{pa+pb} ({pa/(pa+pb)*100:.1f}%) | LoF-: {pc}/{pc+pd_val} ({pc/(pc+pd_val)*100:.1f}%)")
print(f"  OR = {pan_or:.2f}, p = {pan_p:.4f}")

print(f"\nGCB-enriched (n={len(gcb_enriched)}):")
print(f"  LoF+: {a}/{a+b} ({a/(a+b)*100:.1f}%) | LoF-: {c}/{c+d} ({c/(c+d)*100:.1f}%)")
print(f"  OR = {odds:.2f}, p = {p:.4f}")

# High LoF (2+) analysis in GCB-enriched
print(f"\n" + "=" * 70)
print("HIGH LoF (2+) vs LOW (0-1) in GCB-ENRICHED")
print("=" * 70)

high_lof = gcb_enriched[gcb_enriched['LoF_count'] >= 2]
low_lof = gcb_enriched[gcb_enriched['LoF_count'] < 2]

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

# Gene-specific analysis in GCB-enriched
print(f"\n" + "=" * 70)
print("GENE-SPECIFIC ANALYSIS (GCB-ENRICHED)")
print("=" * 70)

for gene in ['GNA13', 'RHOA', 'S1PR2']:
    gene_muts = gcb_lof[gcb_lof['hugoGeneSymbol'] == gene]
    gene_samples = gene_muts['sampleId'].unique()

    has_gene = gcb_enriched[gcb_enriched['sampleId'].isin(gene_samples)]
    no_gene = gcb_enriched[~gcb_enriched['sampleId'].isin(gene_samples)]

    if len(has_gene) > 0 and len(no_gene) > 0:
        ga = int(has_gene['Stage_Advanced'].sum())
        gb = len(has_gene) - ga
        gc = int(no_gene['Stage_Advanced'].sum())
        gd = len(no_gene) - gc

        if min(ga, gb, gc, gd) > 0:
            g_or = (ga * gd) / (gb * gc)
            _, g_p = fisher_exact([[ga, gb], [gc, gd]])
            print(f"\n{gene} LoF (n={len(has_gene)}):")
            print(f"  Mutant: {ga}/{ga+gb} ({ga/(ga+gb)*100:.1f}%) | WT: {gc}/{gc+gd} ({gc/(gc+gd)*100:.1f}%)")
            print(f"  OR = {g_or:.2f}, p = {g_p:.4f}")

# Save
gcb_enriched.to_csv('data/processed/duke_gcb_enriched_lof.csv', index=False)
print(f"\nSaved: data/processed/duke_gcb_enriched_lof.csv")
