#!/usr/bin/env python3
"""
Fetch ABC/MCD-associated mutations from Duke 2017 to exclude non-GCB samples
"""

import requests
import pandas as pd

BASE_URL = "https://www.cbioportal.org/api"
STUDY_ID = "dlbcl_duke_2017"

# ABC/MCD-associated genes to exclude
ABC_GENES = [
    'MYD88',   # MCD hallmark (L265P)
    'CD79B',   # MCD hallmark
    'CARD11',  # NF-kB pathway, ABC-associated
    'IRF4',    # ABC marker
    'PRDM1',   # ABC marker (BLIMP1)
]

# BN2/NOTCH2 cluster genes (also non-GCB)
BN2_GENES = [
    'NOTCH2',  # BN2 hallmark
    'BCL10',   # BN2 associated
]

ALL_EXCLUDE_GENES = ABC_GENES + BN2_GENES

print("=" * 70)
print("FETCHING ABC/MCD MARKER MUTATIONS FROM DUKE 2017")
print("=" * 70)

# Get all samples
samples_url = f"{BASE_URL}/studies/{STUDY_ID}/samples"
samples_resp = requests.get(samples_url)
samples = pd.DataFrame(samples_resp.json())
print(f"\nTotal samples: {len(samples)}")

# Fetch mutations for ABC/MCD genes
mutations_url = f"{BASE_URL}/molecular-profiles/{STUDY_ID}_mutations/mutations"
params = {
    "sampleListId": f"{STUDY_ID}_all",
    "projection": "DETAILED"
}

print(f"\nFetching all mutations...")
mut_resp = requests.get(mutations_url, params=params)
all_mutations = pd.DataFrame(mut_resp.json())
print(f"Total mutations fetched: {len(all_mutations)}")

# Filter to ABC/MCD genes
abc_mutations = all_mutations[all_mutations['gene'].apply(
    lambda x: x.get('hugoGeneSymbol', '') in ALL_EXCLUDE_GENES if isinstance(x, dict) else False
)].copy()

# Extract gene symbol
abc_mutations['hugoGeneSymbol'] = abc_mutations['gene'].apply(
    lambda x: x.get('hugoGeneSymbol', '') if isinstance(x, dict) else ''
)

print(f"\nABC/MCD marker mutations found: {len(abc_mutations)}")
print(f"\nMutation counts by gene:")
print(abc_mutations['hugoGeneSymbol'].value_counts())

# Get samples with ABC markers
abc_samples = abc_mutations['sampleId'].unique()
print(f"\nSamples with ABC/MCD markers: {len(abc_samples)}")

# Check for MYD88 L265P specifically
myd88_muts = abc_mutations[abc_mutations['hugoGeneSymbol'] == 'MYD88']
if len(myd88_muts) > 0:
    print(f"\nMYD88 mutations:")
    for _, row in myd88_muts.iterrows():
        print(f"  {row['sampleId']}: {row.get('proteinChange', 'Unknown')}")

    myd88_l265p = myd88_muts[myd88_muts['proteinChange'].str.contains('L265', na=False)]
    print(f"\nMYD88 L265P specifically: {len(myd88_l265p)} samples")

# Save ABC samples list
abc_df = pd.DataFrame({'sampleId': abc_samples})
abc_df['has_ABC_marker'] = True
abc_df.to_csv('data/processed/duke_abc_marker_samples.csv', index=False)

# Also save the actual mutations
abc_mutations.to_csv('data/processed/duke_abc_mutations.csv', index=False)

print(f"\nSaved: data/processed/duke_abc_marker_samples.csv")
print(f"Saved: data/processed/duke_abc_mutations.csv")
