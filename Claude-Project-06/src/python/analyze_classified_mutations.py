#!/usr/bin/env python3
"""
Analyze classified mutations vs staging in DFCI GCB samples
Only include confident LoF retention mutations
"""

import pandas as pd
import numpy as np
from scipy.stats import fisher_exact

# Load data
staged = pd.read_csv('data/processed/dfci_gcb_staged.csv')
classified = pd.read_csv('data/processed/dfci_gcb_retention_classified.csv')

print("=" * 70)
print("DFCI GCB: CONFIDENT LoF RETENTION MUTATIONS vs STAGING")
print("=" * 70)

# Define confident LoF categories
confident_lof = ['LoF_truncating', 'LoF_hotspot', 'LoF_likely']

# Get samples with confident LoF mutations
lof_samples = classified[classified['functional_class'].isin(confident_lof)]['sampleId'].unique()

print(f"\nSamples with confident LoF retention mutations: {len(lof_samples)}")
print(f"Samples: {list(lof_samples)}")

# Check which have staging data
staged_samples = staged['sampleId'].values
lof_with_staging = [s for s in lof_samples if s in staged_samples]

print(f"\nOf these, {len(lof_with_staging)} have staging data:")
for s in lof_with_staging:
    stage_info = staged[staged['sampleId'] == s]['Stage_Advanced'].values[0]
    genes = classified[(classified['sampleId'] == s) &
                       (classified['functional_class'].isin(confident_lof))]['hugoGeneSymbol'].unique()
    stage_label = "Advanced" if stage_info else "Limited"
    print(f"  {s}: {', '.join(genes)} -> {stage_label}")

# Reclassify staged samples
staged['LoF_Retention'] = staged['sampleId'].isin(lof_samples)

print("\n" + "=" * 70)
print("STAGE DISTRIBUTION BY CONFIDENT LoF STATUS")
print("=" * 70)

# Create contingency table
lof_staged = staged[staged['LoF_Retention'] == True]
no_lof_staged = staged[staged['LoF_Retention'] == False]

print(f"\nWith LoF Retention Mutation (n={len(lof_staged)}):")
print(f"  Advanced: {lof_staged['Stage_Advanced'].sum()} ({lof_staged['Stage_Advanced'].mean()*100:.1f}%)")
print(f"  Limited: {(~lof_staged['Stage_Advanced']).sum()} ({(~lof_staged['Stage_Advanced']).mean()*100:.1f}%)")

print(f"\nWithout LoF Retention Mutation (n={len(no_lof_staged)}):")
print(f"  Advanced: {no_lof_staged['Stage_Advanced'].sum()} ({no_lof_staged['Stage_Advanced'].mean()*100:.1f}%)")
print(f"  Limited: {(~no_lof_staged['Stage_Advanced']).sum()} ({(~no_lof_staged['Stage_Advanced']).mean()*100:.1f}%)")

# Fisher's exact test
a = lof_staged['Stage_Advanced'].sum()
b = (~lof_staged['Stage_Advanced']).sum()
c = no_lof_staged['Stage_Advanced'].sum()
d = (~no_lof_staged['Stage_Advanced']).sum()

print(f"\nContingency table:")
print(f"                    Advanced    Limited")
print(f"  LoF Retention        {a}          {b}")
print(f"  No LoF Retention     {c}          {d}")

if min(a, b, c, d) > 0:
    odds_ratio = (a * d) / (b * c)
    _, p_value = fisher_exact([[a, b], [c, d]])
    print(f"\nOdds Ratio: {odds_ratio:.2f}")
    print(f"Fisher's exact p-value: {p_value:.4f}")
else:
    print("\nCannot compute OR (zero cell)")

# Compare to previous analysis (any mutation)
print("\n" + "=" * 70)
print("COMPARISON: ANY MUTATION vs CONFIDENT LoF ONLY")
print("=" * 70)

any_mut = staged[staged['Mutation_Category'] == 'Retention']
no_mut = staged[staged['Mutation_Category'] == 'None']

print(f"\nPrevious analysis (any retention mutation):")
print(f"  With mutation: {any_mut['Stage_Advanced'].sum()}/{len(any_mut)} ({any_mut['Stage_Advanced'].mean()*100:.1f}%) advanced")
print(f"  No mutation: {no_mut['Stage_Advanced'].sum()}/{len(no_mut)} ({no_mut['Stage_Advanced'].mean()*100:.1f}%) advanced")

print(f"\nNew analysis (confident LoF only):")
print(f"  With LoF mutation: {a}/{a+b} ({a/(a+b)*100:.1f}%) advanced")
print(f"  No LoF mutation: {c}/{c+d} ({c/(c+d)*100:.1f}%) advanced")

# Save updated classification
staged.to_csv('data/processed/dfci_gcb_staged_lof.csv', index=False)
print("\nSaved: data/processed/dfci_gcb_staged_lof.csv")
