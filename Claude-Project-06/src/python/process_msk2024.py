#!/usr/bin/env python3
"""
Process MSK 2024 DLBCL data for pathway mutation analysis
"""

import pandas as pd
import numpy as np
from scipy import stats
import os

# Paths
BASE_DIR = '/Users/ericperkey/Desktop/Claude-Projects/Claude-Project-06'
RAW_DIR = f'{BASE_DIR}/data/raw'
PROCESSED_DIR = f'{BASE_DIR}/data/processed'
RESULTS_DIR = f'{BASE_DIR}/results/tables'

# Pathway gene definitions
TUMOR_SUPPRESSOR = ['S1PR2', 'P2RY8', 'GNA13', 'ARHGEF1', 'RHOA']
PRO_MIGRATORY = ['S1PR1', 'CXCR4', 'GNAI2', 'RAC1', 'RAC2']
ALL_GENES = TUMOR_SUPPRESSOR + PRO_MIGRATORY

def main():
    print("=" * 60)
    print("MSK 2024 DLBCL Pathway Mutation Analysis")
    print("=" * 60)

    # Load data
    print("\n1. Loading data...")
    samples = pd.read_csv(f'{RAW_DIR}/msk2024_samples.csv')
    mutations = pd.read_csv(f'{RAW_DIR}/msk2024_mutations.csv')
    clinical = pd.read_csv(f'{RAW_DIR}/msk2024_clinical.csv')

    print(f"   Samples: {len(samples)}")
    print(f"   Mutations: {len(mutations)}")
    print(f"   Clinical records: {len(clinical)}")

    # Get unique patients (some have multiple samples)
    unique_patients = samples['patientId'].unique()
    print(f"   Unique patients: {len(unique_patients)}")

    # Extract staging from clinical data
    print("\n2. Extracting staging data...")
    staging = clinical[clinical['clinicalAttributeId'] == 'STAGE_HIGHEST_RECORDED'][['patientId', 'value']].copy()
    staging.columns = ['patientId', 'stage']
    staging = staging.drop_duplicates()
    print(f"   Patients with staging: {len(staging)}")
    print(f"   Stage distribution:")
    print(staging['stage'].value_counts().to_string())

    # Classify stages into early (1-3) vs disseminated (4)
    staging['stage_group'] = staging['stage'].map({
        'Stage 1-3': 'Early (I-III)',
        'Stage 4': 'Disseminated (IV)'
    })

    # Handle any missing or other values
    staging = staging.dropna(subset=['stage_group'])
    print(f"\n   After classification:")
    print(staging['stage_group'].value_counts().to_string())

    # Create patient-level mutation summary
    print("\n3. Creating mutation summary...")

    # Get one sample per patient (use first sample if multiple)
    patient_samples = samples.groupby('patientId')['sampleId'].first().reset_index()

    # Filter mutations to pathway genes
    pathway_mutations = mutations[mutations['gene_symbol'].isin(ALL_GENES)].copy()
    print(f"   Pathway mutations: {len(pathway_mutations)}")

    # Aggregate mutations to patient level (any sample)
    patient_mutations = pathway_mutations.groupby(['patientId', 'gene_symbol']).size().reset_index(name='n_mutations')
    patient_mutations['mutated'] = 1

    # Pivot to wide format
    mutation_matrix = patient_mutations.pivot_table(
        index='patientId',
        columns='gene_symbol',
        values='mutated',
        fill_value=0
    ).reset_index()

    # Add missing genes as 0
    for gene in ALL_GENES:
        if gene not in mutation_matrix.columns:
            mutation_matrix[gene] = 0

    print(f"   Patients with any pathway mutation: {(mutation_matrix[ALL_GENES].sum(axis=1) > 0).sum()}")

    # Create pathway-level indicators
    mutation_matrix['TS_pathway'] = (mutation_matrix[TUMOR_SUPPRESSOR].sum(axis=1) > 0).astype(int)
    mutation_matrix['PM_pathway'] = (mutation_matrix[PRO_MIGRATORY].sum(axis=1) > 0).astype(int)

    # Merge with staging - keep ALL patients with staging (left join)
    print("\n4. Merging with staging...")
    # Start with staging, then merge mutation data
    analysis_df = staging.merge(mutation_matrix, on='patientId', how='left')

    # Fill NaN with 0 for patients with no mutations
    for gene in ALL_GENES:
        if gene in analysis_df.columns:
            analysis_df[gene] = analysis_df[gene].fillna(0).astype(int)
        else:
            analysis_df[gene] = 0

    analysis_df['TS_pathway'] = analysis_df['TS_pathway'].fillna(0).astype(int)
    analysis_df['PM_pathway'] = analysis_df['PM_pathway'].fillna(0).astype(int)

    print(f"   Patients with staging data: {len(analysis_df)}")

    # Save processed data
    analysis_df.to_csv(f'{PROCESSED_DIR}/msk2024_analysis_ready.csv', index=False)
    print(f"   Saved to: msk2024_analysis_ready.csv")

    # Statistical Analysis
    print("\n" + "=" * 60)
    print("STATISTICAL ANALYSIS")
    print("=" * 60)

    # Create contingency tables
    print("\n5. Gene-level mutation frequencies by stage...")

    gene_results = []
    for gene in ALL_GENES:
        pathway = 'Tumor Suppressor' if gene in TUMOR_SUPPRESSOR else 'Pro-migratory'
        early = analysis_df[analysis_df['stage_group'] == 'Early (I-III)']
        dissem = analysis_df[analysis_df['stage_group'] == 'Disseminated (IV)']

        n_early = len(early)
        n_dissem = len(dissem)
        mut_early = early[gene].sum() if gene in early.columns else 0
        mut_dissem = dissem[gene].sum() if gene in dissem.columns else 0

        freq_early = mut_early / n_early * 100 if n_early > 0 else 0
        freq_dissem = mut_dissem / n_dissem * 100 if n_dissem > 0 else 0

        # Fisher's exact test
        contingency = [[mut_early, n_early - mut_early],
                      [mut_dissem, n_dissem - mut_dissem]]
        if min(mut_early, mut_dissem) >= 0:
            odds_ratio, p_value = stats.fisher_exact(contingency)
        else:
            odds_ratio, p_value = np.nan, np.nan

        gene_results.append({
            'Gene': gene,
            'Pathway': pathway,
            'Early_N': n_early,
            'Early_Mutated': mut_early,
            'Early_Freq': round(freq_early, 1),
            'Disseminated_N': n_dissem,
            'Disseminated_Mutated': mut_dissem,
            'Disseminated_Freq': round(freq_dissem, 1),
            'OR': round(odds_ratio, 2) if not np.isnan(odds_ratio) else 'NA',
            'p_value': round(p_value, 4) if not np.isnan(p_value) else 'NA'
        })

        if mut_early + mut_dissem > 0:
            print(f"   {gene:10} | Early: {mut_early}/{n_early} ({freq_early:.1f}%) | Dissem: {mut_dissem}/{n_dissem} ({freq_dissem:.1f}%) | OR={odds_ratio:.2f} | p={p_value:.4f}")

    gene_df = pd.DataFrame(gene_results)
    gene_df.to_csv(f'{RESULTS_DIR}/msk2024_gene_by_stage.csv', index=False)

    # Pathway-level analysis
    print("\n6. Pathway-level mutation frequencies by stage...")

    pathway_results = []
    for pathway_name, pathway_col in [('Tumor Suppressor', 'TS_pathway'), ('Pro-migratory', 'PM_pathway')]:
        early = analysis_df[analysis_df['stage_group'] == 'Early (I-III)']
        dissem = analysis_df[analysis_df['stage_group'] == 'Disseminated (IV)']

        n_early = len(early)
        n_dissem = len(dissem)
        mut_early = early[pathway_col].sum()
        mut_dissem = dissem[pathway_col].sum()

        freq_early = mut_early / n_early * 100 if n_early > 0 else 0
        freq_dissem = mut_dissem / n_dissem * 100 if n_dissem > 0 else 0

        # Fisher's exact test
        contingency = [[mut_early, n_early - mut_early],
                      [mut_dissem, n_dissem - mut_dissem]]
        odds_ratio, p_value = stats.fisher_exact(contingency)

        pathway_results.append({
            'Pathway': pathway_name,
            'Early_N': n_early,
            'Early_Mutated': mut_early,
            'Early_Freq': round(freq_early, 1),
            'Disseminated_N': n_dissem,
            'Disseminated_Mutated': mut_dissem,
            'Disseminated_Freq': round(freq_dissem, 1),
            'OR': round(odds_ratio, 2),
            'p_value': round(p_value, 4)
        })

        print(f"\n   {pathway_name}:")
        print(f"      Early (I-III):     {mut_early}/{n_early} ({freq_early:.1f}%)")
        print(f"      Disseminated (IV): {mut_dissem}/{n_dissem} ({freq_dissem:.1f}%)")
        print(f"      Odds Ratio: {odds_ratio:.2f} (95% CI calculation available in R)")
        print(f"      Fisher's p-value: {p_value:.4f}")

    pathway_df = pd.DataFrame(pathway_results)
    pathway_df.to_csv(f'{RESULTS_DIR}/msk2024_pathway_by_stage.csv', index=False)

    # Summary table
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    print(f"\nDataset: MSK-IMPACT DLBCL 2024")
    print(f"Total patients analyzed: {len(analysis_df)}")
    print(f"  - Early stage (I-III): {len(analysis_df[analysis_df['stage_group'] == 'Early (I-III)'])}")
    print(f"  - Disseminated (IV): {len(analysis_df[analysis_df['stage_group'] == 'Disseminated (IV)'])}")

    print("\nKey findings:")
    for _, row in pathway_df.iterrows():
        if row['p_value'] < 0.05:
            direction = "HIGHER in disseminated" if row['Disseminated_Freq'] > row['Early_Freq'] else "LOWER in disseminated"
            print(f"  * {row['Pathway']}: {direction} (p={row['p_value']:.4f})")
        else:
            print(f"  * {row['Pathway']}: No significant difference (p={row['p_value']:.4f})")

    print("\nResults saved to:")
    print(f"  - {RESULTS_DIR}/msk2024_gene_by_stage.csv")
    print(f"  - {RESULTS_DIR}/msk2024_pathway_by_stage.csv")
    print(f"  - {PROCESSED_DIR}/msk2024_analysis_ready.csv")

if __name__ == '__main__':
    main()
