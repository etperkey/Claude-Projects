#!/usr/bin/env python3
"""
Classify Duke 2017 S1P pathway mutations as LoF/GoF
"""

import pandas as pd
import numpy as np
from scipy.stats import fisher_exact

# Load data
mutations = pd.read_csv('data/raw/duke_pathway_mutations.csv')
processed = pd.read_csv('data/processed/duke_pathway_categories.csv')

# Define mutation types
LOF_MUTATION_TYPES = [
    'Nonsense_Mutation',
    'Frame_Shift_Del',
    'Frame_Shift_Ins',
    'Splice_Site',
    'Splice_Region'
]

# Known hotspots
RHOA_LOF_POSITIONS = [5, 17, 19, 42]  # Known dominant-negative positions
CXCR4_GOF_POSITIONS = list(range(308, 353))  # WHIM region
GNAI2_GOF_POSITIONS = [179, 182, 205]  # Activating positions

print("=" * 70)
print("DUKE 2017: PATHWAY MUTATION CLASSIFICATION")
print("=" * 70)

# Retention genes
retention_genes = ['GNA13', 'RHOA', 'S1PR2', 'P2RY8', 'ARHGEF1']
egress_genes = ['CXCR4', 'GNAI2']

retention_muts = mutations[mutations['hugoGeneSymbol'].isin(retention_genes)].copy()
egress_muts = mutations[mutations['hugoGeneSymbol'].isin(egress_genes)].copy()

def classify_retention(row):
    gene = row['hugoGeneSymbol']
    mut_type = row['mutationType']
    pos = row.get('proteinPosStart', 0)

    if mut_type in LOF_MUTATION_TYPES:
        return 'LoF_truncating'

    if gene == 'GNA13' and mut_type == 'Missense_Mutation':
        return 'LoF_likely'

    if gene == 'RHOA':
        if pos in RHOA_LOF_POSITIONS:
            return 'LoF_hotspot'
        return 'LoF_likely'

    if gene in ['S1PR2', 'P2RY8', 'ARHGEF1']:
        return 'LoF_possible'

    return 'Unknown'

def classify_egress(row):
    gene = row['hugoGeneSymbol']
    mut_type = row['mutationType']
    pos = row.get('proteinPosStart', 0)

    if gene == 'CXCR4':
        if pos in CXCR4_GOF_POSITIONS:
            return 'GoF_WHIM'
        return 'Not_WHIM'

    if gene == 'GNAI2':
        if pos in GNAI2_GOF_POSITIONS:
            return 'GoF_activating'
        return 'Not_activating'

    return 'Unknown'

# Classify
retention_muts['functional_class'] = retention_muts.apply(classify_retention, axis=1)
egress_muts['functional_class'] = egress_muts.apply(classify_egress, axis=1)

print("\n### RETENTION PATHWAY MUTATIONS ###\n")
ret_summary = retention_muts.groupby(['hugoGeneSymbol', 'functional_class']).size().reset_index(name='count')
print(ret_summary.to_string(index=False))

print("\n### EGRESS PATHWAY MUTATIONS ###\n")
egress_summary = egress_muts.groupby(['hugoGeneSymbol', 'functional_class']).size().reset_index(name='count')
print(egress_summary.to_string(index=False))

# Get samples with confident LoF
confident_lof = ['LoF_truncating', 'LoF_hotspot', 'LoF_likely']
lof_samples = retention_muts[retention_muts['functional_class'].isin(confident_lof)]['sampleId'].unique()
print(f"\nSamples with confident LoF retention mutations: {len(lof_samples)}")

# Get samples with confident GoF
gof_samples = egress_muts[egress_muts['functional_class'].isin(['GoF_WHIM', 'GoF_activating'])]['sampleId'].unique()
print(f"Samples with confident GoF egress mutations: {len(gof_samples)}")

# Use processed data which already has staging
# Map sampleId to patientId from mutations
sample_to_patient = mutations.drop_duplicates('sampleId')[['sampleId', 'patientId']].set_index('sampleId')['patientId'].to_dict()

# Get all samples from processed file
samples_staged = processed.copy()
samples_staged['sampleId'] = samples_staged['patientId']  # In Duke, sampleId == patientId

# Filter to samples with staging
samples_staged = samples_staged[samples_staged['Stage_Advanced'].notna()].copy()
print(f"\nSamples with staging data: {len(samples_staged)}")

# Add mutation categories
samples_staged['Has_LoF_Retention'] = samples_staged['sampleId'].isin(lof_samples)
samples_staged['Has_GoF_Egress'] = samples_staged['sampleId'].isin(gof_samples)

# Also add "any retention" and "any egress" for comparison
any_retention = retention_muts['sampleId'].unique()
any_egress = egress_muts['sampleId'].unique()
samples_staged['Has_Any_Retention'] = samples_staged['sampleId'].isin(any_retention)
samples_staged['Has_Any_Egress'] = samples_staged['sampleId'].isin(any_egress)

print("\n" + "=" * 70)
print("STAGING ANALYSIS")
print("=" * 70)

def analyze_group(df, col, name):
    pos = df[df[col] == True]
    neg = df[df[col] == False]

    if len(pos) == 0:
        print(f"\n{name}: No samples")
        return

    a = int(pos['Stage_Advanced'].sum())
    b = len(pos) - a
    c = int(neg['Stage_Advanced'].sum())
    d = len(neg) - c

    print(f"\n{name}:")
    print(f"  With mutation: {a}/{a+b} ({a/(a+b)*100:.1f}%) advanced")
    print(f"  Without: {c}/{c+d} ({c/(c+d)*100:.1f}%) advanced")

    if min(a, b, c, d) > 0:
        odds = (a * d) / (b * c)
        _, p = fisher_exact([[a, b], [c, d]])
        print(f"  OR = {odds:.2f}, p = {p:.4f}")
    else:
        print("  (Cannot compute OR - zero cell)")

analyze_group(samples_staged, 'Has_Any_Retention', "ANY Retention Mutation")
analyze_group(samples_staged, 'Has_LoF_Retention', "CONFIDENT LoF Retention")
analyze_group(samples_staged, 'Has_Any_Egress', "ANY Egress Mutation")
analyze_group(samples_staged, 'Has_GoF_Egress', "CONFIDENT GoF Egress (WHIM/activating)")

# Print CXCR4 mutations to check
print("\n" + "=" * 70)
print("CXCR4 MUTATION DETAILS (checking for WHIM)")
print("=" * 70)
cxcr4 = egress_muts[egress_muts['hugoGeneSymbol'] == 'CXCR4']
for _, row in cxcr4.iterrows():
    print(f"  {row['sampleId']}: {row['proteinChange']} at pos {row['proteinPosStart']} -> {row['functional_class']}")

print("\n" + "=" * 70)
print("GNAI2 MUTATION DETAILS (checking for activating)")
print("=" * 70)
gnai2 = egress_muts[egress_muts['hugoGeneSymbol'] == 'GNAI2']
for _, row in gnai2.iterrows():
    print(f"  {row['sampleId']}: {row['proteinChange']} at pos {row['proteinPosStart']} -> {row['functional_class']}")

# Save
samples_staged.to_csv('data/processed/duke_classified_staging.csv', index=False)
retention_muts.to_csv('data/processed/duke_retention_classified.csv', index=False)
egress_muts.to_csv('data/processed/duke_egress_classified.csv', index=False)

print("\nSaved classified data to data/processed/")
