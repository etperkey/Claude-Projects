#!/usr/bin/env python3
"""
Stricter GCB enrichment: Only exclude MYD88 L265P and CD79B mutants
Also look for co-occurrence with EZH2 mutations (GCB marker)
"""

import pandas as pd
import numpy as np
from scipy.stats import fisher_exact
import requests

BASE_URL = "https://www.cbioportal.org/api"
STUDY_ID = "dlbcl_duke_2017"

# Load existing data
lof_data = pd.read_csv('data/processed/duke_lof_scores.csv')
abc_muts = pd.read_csv('data/processed/duke_abc_mutations.csv')

print("=" * 70)
print("STRICT GCB ANALYSIS: MYD88 L265P/CD79B EXCLUSION + EZH2 ENRICHMENT")
print("=" * 70)

# Get MYD88 L265P samples specifically
myd88_l265p = abc_muts[
    (abc_muts['hugoGeneSymbol'] == 'MYD88') &
    (abc_muts['proteinChange'].str.contains('L265', na=False))
]['sampleId'].unique()
print(f"\nMYD88 L265P samples: {len(myd88_l265p)}")

# Get CD79B mutant samples
cd79b_muts = abc_muts[abc_muts['hugoGeneSymbol'] == 'CD79B']['sampleId'].unique()
print(f"CD79B mutant samples: {len(cd79b_muts)}")

# Combine MCD markers
mcd_samples = set(myd88_l265p) | set(cd79b_muts)
print(f"Combined MCD samples (MYD88 L265P or CD79B): {len(mcd_samples)}")

# Fetch EZH2 mutations (GCB marker)
print("\nFetching EZH2 mutations (GCB marker)...")
mutations_url = f"{BASE_URL}/molecular-profiles/{STUDY_ID}_mutations/mutations"
params = {"sampleListId": f"{STUDY_ID}_all", "projection": "DETAILED"}
mut_resp = requests.get(mutations_url, params=params)
all_muts = pd.DataFrame(mut_resp.json())
all_muts['hugoGeneSymbol'] = all_muts['gene'].apply(
    lambda x: x.get('hugoGeneSymbol', '') if isinstance(x, dict) else ''
)

ezh2_muts = all_muts[all_muts['hugoGeneSymbol'] == 'EZH2']
ezh2_samples = ezh2_muts['sampleId'].unique()
print(f"EZH2 mutant samples (GCB marker): {len(ezh2_samples)}")

# Also check for Y646 hotspot specifically
ezh2_y646 = ezh2_muts[ezh2_muts['proteinChange'].str.contains('Y646|Y641', na=False)]
ezh2_hotspot_samples = ezh2_y646['sampleId'].unique()
print(f"EZH2 Y646 hotspot samples: {len(ezh2_hotspot_samples)}")

# ============================================================
# Analysis 1: Exclude MCD only (strict)
# ============================================================
print("\n" + "=" * 70)
print("ANALYSIS 1: EXCLUDE MCD ONLY (MYD88 L265P + CD79B)")
print("=" * 70)

gcb_strict = lof_data[~lof_data['sampleId'].isin(mcd_samples)].copy()
print(f"GCB-strict cohort: {len(gcb_strict)} samples")

has_lof = gcb_strict[gcb_strict['LoF_count'] > 0]
no_lof = gcb_strict[gcb_strict['LoF_count'] == 0]

a, b = int(has_lof['Stage_Advanced'].sum()), len(has_lof) - int(has_lof['Stage_Advanced'].sum())
c, d = int(no_lof['Stage_Advanced'].sum()), len(no_lof) - int(no_lof['Stage_Advanced'].sum())

print(f"\nWith LoF: {a}/{a+b} ({a/(a+b)*100:.1f}%) advanced")
print(f"Without LoF: {c}/{c+d} ({c/(c+d)*100:.1f}%) advanced")

if min(a, b, c, d) > 0:
    odds = (a * d) / (b * c)
    _, p = fisher_exact([[a, b], [c, d]])
    print(f"OR = {odds:.2f}, p = {p:.4f}")

# ============================================================
# Analysis 2: EZH2-positive samples only (true GCB)
# ============================================================
print("\n" + "=" * 70)
print("ANALYSIS 2: EZH2-POSITIVE ONLY (TRUE GCB)")
print("=" * 70)

ezh2_pos = lof_data[lof_data['sampleId'].isin(ezh2_samples)].copy()
print(f"EZH2-positive cohort: {len(ezh2_pos)} samples")

has_lof_ezh2 = ezh2_pos[ezh2_pos['LoF_count'] > 0]
no_lof_ezh2 = ezh2_pos[ezh2_pos['LoF_count'] == 0]

if len(has_lof_ezh2) > 0 and len(no_lof_ezh2) > 0:
    a2 = int(has_lof_ezh2['Stage_Advanced'].sum())
    b2 = len(has_lof_ezh2) - a2
    c2 = int(no_lof_ezh2['Stage_Advanced'].sum())
    d2 = len(no_lof_ezh2) - c2

    print(f"\nWith LoF: {a2}/{a2+b2} ({a2/(a2+b2)*100:.1f}%) advanced")
    print(f"Without LoF: {c2}/{c2+d2} ({c2/(c2+d2)*100:.1f}%) advanced")

    if min(a2, b2, c2, d2) > 0:
        odds2 = (a2 * d2) / (b2 * c2)
        _, p2 = fisher_exact([[a2, b2], [c2, d2]])
        print(f"OR = {odds2:.2f}, p = {p2:.4f}")
else:
    print("Insufficient samples for analysis")

# ============================================================
# Analysis 3: GNA13/RHOA with EZH2 co-mutation (EZB-like)
# ============================================================
print("\n" + "=" * 70)
print("ANALYSIS 3: EZB-LIKE (GNA13/RHOA + EZH2 co-mutation)")
print("=" * 70)

# Get GNA13/RHOA mutant samples
retention_muts = pd.read_csv('data/processed/duke_retention_classified.csv')
confident_lof = ['LoF_truncating', 'LoF_hotspot', 'LoF_likely']
gna13_rhoa = retention_muts[
    (retention_muts['hugoGeneSymbol'].isin(['GNA13', 'RHOA'])) &
    (retention_muts['functional_class'].isin(confident_lof))
]['sampleId'].unique()

# Find co-mutations
ezb_like = set(gna13_rhoa) & set(ezh2_samples)
gna13_rhoa_only = set(gna13_rhoa) - set(ezh2_samples)

print(f"GNA13/RHOA LoF samples: {len(gna13_rhoa)}")
print(f"With EZH2 co-mutation (EZB-like): {len(ezb_like)}")
print(f"Without EZH2: {len(gna13_rhoa_only)}")

# Analyze EZB-like vs wild-type
if len(ezb_like) > 0:
    ezb_like_df = lof_data[lof_data['sampleId'].isin(ezb_like)]
    wt_df = lof_data[~lof_data['sampleId'].isin(gna13_rhoa)]

    a3 = int(ezb_like_df['Stage_Advanced'].sum())
    b3 = len(ezb_like_df) - a3
    c3 = int(wt_df['Stage_Advanced'].sum())
    d3 = len(wt_df) - c3

    print(f"\nEZB-like: {a3}/{a3+b3} ({a3/(a3+b3)*100:.1f}%) advanced")
    print(f"Wild-type: {c3}/{c3+d3} ({c3/(c3+d3)*100:.1f}%) advanced")

    if min(a3, b3, c3, d3) > 0:
        odds3 = (a3 * d3) / (b3 * c3)
        _, p3 = fisher_exact([[a3, b3], [c3, d3]])
        print(f"OR = {odds3:.2f}, p = {p3:.4f}")

# ============================================================
# Analysis 4: GNA13/RHOA only (no EZH2)
# ============================================================
print("\n" + "=" * 70)
print("ANALYSIS 4: GNA13/RHOA WITHOUT EZH2")
print("=" * 70)

if len(gna13_rhoa_only) > 0:
    gna13_only_df = lof_data[lof_data['sampleId'].isin(gna13_rhoa_only)]

    a4 = int(gna13_only_df['Stage_Advanced'].sum())
    b4 = len(gna13_only_df) - a4

    print(f"GNA13/RHOA without EZH2: {a4}/{a4+b4} ({a4/(a4+b4)*100:.1f}%) advanced")

# ============================================================
# Summary comparison
# ============================================================
print("\n" + "=" * 70)
print("SUMMARY COMPARISON")
print("=" * 70)

results = []

# Pan-DLBCL
has = lof_data[lof_data['LoF_count'] > 0]
no = lof_data[lof_data['LoF_count'] == 0]
pa, pb = int(has['Stage_Advanced'].sum()), len(has) - int(has['Stage_Advanced'].sum())
pc, pd_val = int(no['Stage_Advanced'].sum()), len(no) - int(no['Stage_Advanced'].sum())
results.append(('Pan-DLBCL', len(lof_data), f"{pa/(pa+pb)*100:.1f}", f"{pc/(pc+pd_val)*100:.1f}",
                (pa*pd_val)/(pb*pc), fisher_exact([[pa,pb],[pc,pd_val]])[1]))

# GCB-strict
results.append(('GCB-strict (excl MCD)', len(gcb_strict), f"{a/(a+b)*100:.1f}", f"{c/(c+d)*100:.1f}",
                odds, p))

# EZH2+
if len(has_lof_ezh2) > 0 and len(no_lof_ezh2) > 0 and min(a2,b2,c2,d2) > 0:
    results.append(('EZH2-positive', len(ezh2_pos), f"{a2/(a2+b2)*100:.1f}", f"{c2/(c2+d2)*100:.1f}",
                    odds2, p2))

print(f"\n{'Cohort':<25} {'N':<8} {'LoF+ Adv':<10} {'LoF- Adv':<10} {'OR':<8} {'p-value':<8}")
print("-" * 70)
for name, n, lof_adv, no_lof_adv, or_val, pval in results:
    print(f"{name:<25} {n:<8} {lof_adv+'%':<10} {no_lof_adv+'%':<10} {or_val:.2f}     {pval:.4f}")
