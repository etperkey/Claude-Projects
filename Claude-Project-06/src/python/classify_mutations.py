#!/usr/bin/env python3
"""
Classify S1P pathway mutations as LoF (retention) or GoF (egress)
Based on mutation type and known functional annotations
"""

import pandas as pd
import numpy as np

# Mutation classification criteria
LOF_MUTATION_TYPES = [
    'Nonsense_Mutation',
    'Frame_Shift_Del',
    'Frame_Shift_Ins',
    'Splice_Site',
    'Splice_Region',
    'Translation_Start_Site'
]

# Known LoF positions/mutations for retention pathway genes
# GNA13: Most mutations are LoF in GCB-DLBCL
# RHOA: Mutations at G17, T19, Y42 are known LoF (dominant negative)
RHOA_LOF_POSITIONS = [5, 17, 19, 42]  # R5, G17, T19, Y42

# CXCR4 WHIM-like GoF mutations (C-terminal truncations)
# Typically at positions 308-352, especially R334, S338, S339
CXCR4_GOF_POSITIONS = list(range(308, 353))

# GNAI2 activating mutations
GNAI2_GOF_POSITIONS = [179, 182, 205]  # R179, T182, Q205


def classify_retention_mutation(row):
    """Classify retention pathway mutations (need LoF)"""
    gene = row['hugoGeneSymbol']
    mut_type = row['mutationType']
    protein_change = row['proteinChange']
    pos = row.get('proteinPosStart', 0)

    # Truncating mutations are always LoF
    if mut_type in LOF_MUTATION_TYPES:
        return 'LoF_truncating'

    # Gene-specific rules
    if gene == 'GNA13':
        # Most GNA13 mutations in GCB-DLBCL are functionally LoF
        if mut_type == 'Missense_Mutation':
            return 'LoF_likely'  # Most missense in GNA13 are damaging

    elif gene == 'RHOA':
        if pos in RHOA_LOF_POSITIONS:
            return 'LoF_hotspot'
        elif mut_type == 'Missense_Mutation':
            return 'LoF_likely'  # RHOA missense in DLBCL typically LoF

    elif gene in ['S1PR2', 'P2RY8', 'ARHGEF1']:
        if mut_type == 'Missense_Mutation':
            return 'LoF_possible'  # Need functional validation

    return 'Unknown'


def classify_egress_mutation(row):
    """Classify egress pathway mutations (need GoF)"""
    gene = row['hugoGeneSymbol']
    mut_type = row['mutationType']
    protein_change = row['proteinChange']
    pos = row.get('proteinPosStart', 0)

    if gene == 'CXCR4':
        # WHIM-like C-terminal truncations are GoF
        if pos in CXCR4_GOF_POSITIONS:
            if mut_type in LOF_MUTATION_TYPES:
                return 'GoF_WHIM'
            elif '*' in str(protein_change):
                return 'GoF_WHIM'
        # Other CXCR4 mutations are likely not GoF
        return 'Not_GoF'

    elif gene == 'GNAI2':
        if pos in GNAI2_GOF_POSITIONS:
            return 'GoF_activating'
        return 'Not_GoF'

    elif gene == 'S1PR1':
        # S1PR1 GoF would enhance egress - need specific knowledge
        if mut_type == 'Missense_Mutation':
            return 'GoF_possible'
        return 'Unknown'

    elif gene == 'RAC2':
        # RAC2 at position 12, 61 would be activating (like RAS)
        if pos in [12, 61]:
            return 'GoF_activating'
        return 'Unknown'

    return 'Unknown'


def main():
    # Load DFCI GCB mutations
    df = pd.read_csv('data/processed/dfci_gcb_pathway_mutations.csv')

    # Define pathway genes
    retention_genes = ['GNA13', 'RHOA', 'S1PR2', 'P2RY8', 'ARHGEF1']
    egress_genes = ['CXCR4', 'GNAI2', 'S1PR1', 'RAC2']

    print("=" * 70)
    print("DFCI GCB PATHWAY MUTATION CLASSIFICATION")
    print("=" * 70)

    # Classify retention pathway mutations
    print("\n### RETENTION PATHWAY (LoF mutations) ###\n")
    retention_df = df[df['hugoGeneSymbol'].isin(retention_genes)].copy()
    retention_df['functional_class'] = retention_df.apply(classify_retention_mutation, axis=1)

    for _, row in retention_df.iterrows():
        print(f"{row['sampleId']}: {row['hugoGeneSymbol']} {row['proteinChange']} "
              f"({row['mutationType']}) -> {row['functional_class']}")

    # Count LoF mutations
    lof_counts = retention_df['functional_class'].value_counts()
    print(f"\nLoF Classification Summary:")
    print(lof_counts)

    # Classify egress pathway mutations
    print("\n### EGRESS PATHWAY (GoF mutations) ###\n")
    egress_df = df[df['hugoGeneSymbol'].isin(egress_genes)].copy()

    if len(egress_df) > 0:
        egress_df['functional_class'] = egress_df.apply(classify_egress_mutation, axis=1)

        for _, row in egress_df.iterrows():
            print(f"{row['sampleId']}: {row['hugoGeneSymbol']} {row['proteinChange']} "
                  f"({row['mutationType']}) -> {row['functional_class']}")

        gof_counts = egress_df['functional_class'].value_counts()
        print(f"\nGoF Classification Summary:")
        print(gof_counts)
    else:
        print("No egress pathway mutations found in GCB samples")

    # Summary by sample
    print("\n" + "=" * 70)
    print("SAMPLE-LEVEL SUMMARY")
    print("=" * 70)

    # Get samples with true LoF retention mutations
    true_lof = retention_df[retention_df['functional_class'].isin([
        'LoF_truncating', 'LoF_hotspot', 'LoF_likely'
    ])]
    lof_samples = true_lof['sampleId'].unique()

    print(f"\nSamples with confident LoF retention mutations: {len(lof_samples)}")
    for s in lof_samples:
        genes = true_lof[true_lof['sampleId'] == s]['hugoGeneSymbol'].unique()
        print(f"  {s}: {', '.join(genes)}")

    # Get samples with true GoF egress mutations
    if len(egress_df) > 0:
        true_gof = egress_df[egress_df['functional_class'].isin([
            'GoF_WHIM', 'GoF_activating'
        ])]
        gof_samples = true_gof['sampleId'].unique()
        print(f"\nSamples with confident GoF egress mutations: {len(gof_samples)}")
        for s in gof_samples:
            genes = true_gof[true_gof['sampleId'] == s]['hugoGeneSymbol'].unique()
            print(f"  {s}: {', '.join(genes)}")

    # Save classified mutations
    retention_df.to_csv('data/processed/dfci_gcb_retention_classified.csv', index=False)
    if len(egress_df) > 0:
        egress_df.to_csv('data/processed/dfci_gcb_egress_classified.csv', index=False)

    print("\nSaved classified mutations to data/processed/")

    return retention_df, egress_df if len(egress_df) > 0 else None


if __name__ == '__main__':
    main()
