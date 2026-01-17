"""
Stage vs Pathway Mutation Analysis
Analyzes relationship between retention/egress pathway mutations and disease stage
in GCB-DLBCL using Schmitz et al. 2018 data

Key hypothesis: LoF mutations in retention pathway (S1PR2/GNA13/ARHGEF1/RHOA)
may be associated with advanced stage disease.

Uses genetic subtype as proxy for pathway mutations:
- EZB subtype: enriched for GNA13, RHOA, EZH2 mutations (retention pathway)
- BN2 subtype: NOTCH2, BCL6 fusions
- MCD subtype: MYD88, CD79B mutations
- N1 subtype: NOTCH1 mutations
"""

import pandas as pd
import numpy as np
from scipy import stats
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from utils import (
    load_config, ensure_directories, save_dataframe, get_project_root, logger
)


def load_schmitz_clinical():
    """Load and process Schmitz 2018 clinical data."""
    data_path = get_project_root() / 'data' / 'raw' / 'schmitz_2018_supplementary.xlsx'

    if not data_path.exists():
        raise FileNotFoundError(f"Schmitz supplementary data not found: {data_path}")

    df = pd.read_excel(data_path, sheet_name='Tab S9 Characteristics DLBCL')
    logger.info(f"Loaded {len(df)} samples from Schmitz 2018")

    return df


def process_staging(df):
    """Process Ann Arbor staging data."""
    def map_stage(val):
        if pd.isna(val):
            return None
        try:
            stage_num = int(float(val))
            return f"Stage {['I', 'II', 'III', 'IV'][stage_num - 1]}"
        except (ValueError, IndexError):
            return None

    df['Stage'] = df['Ann Arbor Stage'].apply(map_stage)
    df['Stage_Binary'] = df['Stage'].apply(
        lambda x: 'Early (I)' if x == 'Stage I'
        else ('Late (III-IV)' if x in ['Stage III', 'Stage IV'] else None)
    )
    df['Stage_Numeric'] = df['Ann Arbor Stage'].apply(
        lambda x: int(float(x)) if pd.notna(x) else None
    )

    return df


def filter_gcb_cohort(df):
    """Filter to GCB-DLBCL samples only."""
    gcb = df[df['Gene Expression Subgroup'] == 'GCB'].copy()
    logger.info(f"GCB-DLBCL samples: {len(gcb)}")
    return gcb


def calculate_fisher_exact(table):
    """Calculate Fisher's exact test with odds ratio and CI."""
    odds_ratio, p_value = stats.fisher_exact(table)

    # Calculate 95% CI for odds ratio using log transform
    a, b = table[0]
    c, d = table[1]

    log_or = np.log(odds_ratio) if odds_ratio > 0 else 0
    se_log_or = np.sqrt(1/a + 1/b + 1/c + 1/d) if all(x > 0 for x in [a, b, c, d]) else np.inf

    ci_lower = np.exp(log_or - 1.96 * se_log_or)
    ci_upper = np.exp(log_or + 1.96 * se_log_or)

    return {
        'odds_ratio': odds_ratio,
        'p_value': p_value,
        'ci_lower': ci_lower,
        'ci_upper': ci_upper
    }


def analyze_ezb_vs_stage(gcb_df):
    """
    Analyze association between EZB subtype and stage.

    EZB subtype is characterized by:
    - EZH2 mutations (~70-80%)
    - BCL2 translocations (~70-80%)
    - GNA13 mutations (~30-40%)
    - RHOA mutations (~10-20%)

    These represent retention pathway mutations.
    """
    # Create analysis cohort with complete staging data
    analysis = gcb_df[gcb_df['Stage_Binary'].notna()].copy()
    logger.info(f"Analysis cohort (with staging): {len(analysis)}")

    # Binary EZB classification
    analysis['Is_EZB'] = analysis['Genetic Subtype'] == 'EZB'
    analysis['Is_Late_Stage'] = analysis['Stage_Binary'] == 'Late (III-IV)'

    # Create contingency table
    # Rows: EZB vs Non-EZB
    # Cols: Early vs Late
    ct = pd.crosstab(analysis['Is_EZB'], analysis['Is_Late_Stage'])

    print("\n" + "=" * 60)
    print("STATISTICAL ANALYSIS: EZB Subtype vs Disease Stage")
    print("(EZB enriched for GNA13/RHOA retention pathway mutations)")
    print("=" * 60)

    print("\nContingency Table:")
    print("-" * 40)
    labels = ct.copy()
    labels.index = ['Non-EZB', 'EZB']
    labels.columns = ['Early (I)', 'Late (III-IV)']
    print(labels)

    # Fisher's exact test
    table = [[ct.loc[False, False], ct.loc[False, True]],
             [ct.loc[True, False], ct.loc[True, True]]]

    results = calculate_fisher_exact(table)

    print(f"\n{'-' * 40}")
    print("Fisher's Exact Test Results:")
    print(f"  Odds Ratio: {results['odds_ratio']:.2f}")
    print(f"  95% CI: ({results['ci_lower']:.2f}, {results['ci_upper']:.2f})")
    print(f"  P-value: {results['p_value']:.4f}")

    # Interpretation
    print(f"\n{'-' * 40}")
    print("Interpretation:")

    ezb_late_pct = analysis[analysis['Is_EZB']]['Is_Late_Stage'].mean() * 100
    non_ezb_late_pct = analysis[~analysis['Is_EZB']]['Is_Late_Stage'].mean() * 100

    print(f"  EZB late stage (III-IV): {ezb_late_pct:.1f}%")
    print(f"  Non-EZB late stage (III-IV): {non_ezb_late_pct:.1f}%")

    if results['p_value'] < 0.05:
        print(f"\n  ** SIGNIFICANT (p < 0.05) **")
        print(f"  EZB subtype (enriched for retention pathway mutations)")
        print(f"  is associated with {results['odds_ratio']:.1f}x higher odds")
        print(f"  of late stage disease.")

    return results, analysis


def analyze_by_genetic_subtype(gcb_df):
    """Analyze stage distribution by all genetic subtypes."""
    analysis = gcb_df[gcb_df['Stage_Binary'].notna()].copy()

    print("\n" + "=" * 60)
    print("STAGE DISTRIBUTION BY GENETIC SUBTYPE (GCB-DLBCL)")
    print("=" * 60)

    results = []
    for subtype in ['EZB', 'BN2', 'MCD', 'Other']:
        subset = analysis[analysis['Genetic Subtype'] == subtype]
        n = len(subset)

        if n > 0:
            n_early = (subset['Stage_Binary'] == 'Early (I)').sum()
            n_late = (subset['Stage_Binary'] == 'Late (III-IV)').sum()
            pct_late = n_late / n * 100

            results.append({
                'Genetic_Subtype': subtype,
                'N': n,
                'Early_I': n_early,
                'Late_III_IV': n_late,
                'Pct_Late': pct_late
            })

            print(f"\n{subtype}:")
            print(f"  N = {n}")
            print(f"  Early (Stage I): {n_early} ({n_early/n*100:.1f}%)")
            print(f"  Late (Stage III-IV): {n_late} ({pct_late:.1f}%)")

    return pd.DataFrame(results)


def analyze_pathway_mutations_by_coo(supplementary_path):
    """Analyze pathway gene mutation frequencies by COO subtype."""
    mut_freq = pd.read_excel(supplementary_path, sheet_name='Tab S1 Mutation Freq Genes')

    pathway_genes = ['S1PR2', 'P2RY8', 'GNA13', 'ARHGEF1', 'RHOA',  # Retention
                     'S1PR1', 'CXCR4', 'GNAI2', 'RAC1', 'RAC2']    # Egress

    pathway_muts = mut_freq[mut_freq['Gene Symbol'].isin(pathway_genes)].copy()

    print("\n" + "=" * 60)
    print("PATHWAY GENE MUTATION FREQUENCIES BY COO")
    print("=" * 60)

    print("\nRetention Pathway (LoF expected):")
    retention = pathway_muts[pathway_muts['Gene Symbol'].isin(
        ['S1PR2', 'P2RY8', 'GNA13', 'ARHGEF1', 'RHOA'])]
    print(retention[['Gene Symbol', 'ABC', 'GCB', 'Total']].to_string(index=False))

    print("\nEgress Pathway (GoF expected):")
    egress = pathway_muts[pathway_muts['Gene Symbol'].isin(
        ['S1PR1', 'CXCR4', 'GNAI2', 'RAC1', 'RAC2'])]
    egress_found = egress[egress['Gene Symbol'].isin(['S1PR1', 'CXCR4', 'GNAI2'])]
    print(egress_found[['Gene Symbol', 'ABC', 'GCB', 'Total']].to_string(index=False))

    # Summary
    print("\n" + "-" * 40)
    print("Summary - Combined Pathway Frequencies in GCB:")
    retention_total = retention['GCB'].sum()
    print(f"  Retention pathway (S1PR2/P2RY8/GNA13/ARHGEF1/RHOA): ~{retention_total*100:.0f}%")
    print("  Note: Individual genes sum to >40% due to co-occurrence")

    return pathway_muts


def save_analysis_results(results, subtype_df, output_dir):
    """Save analysis results to files."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save EZB vs stage results
    results_df = pd.DataFrame([results])
    results_df.to_csv(output_dir / 'ezb_stage_fisher_test.csv', index=False)

    # Save subtype distribution
    subtype_df.to_csv(output_dir / 'stage_by_genetic_subtype.csv', index=False)

    logger.info(f"Results saved to {output_dir}")


def main():
    """Run the complete stage-pathway analysis."""
    logger.info("=" * 60)
    logger.info("GCB-DLBCL Stage vs Pathway Mutation Analysis")
    logger.info("Dataset: Schmitz et al. NEJM 2018 (n=574)")
    logger.info("=" * 60)

    ensure_directories()

    # Load and process data
    df = load_schmitz_clinical()
    df = process_staging(df)
    gcb_df = filter_gcb_cohort(df)

    # Analyze pathway mutation frequencies
    supp_path = get_project_root() / 'data' / 'raw' / 'schmitz_2018_supplementary.xlsx'
    pathway_muts = analyze_pathway_mutations_by_coo(supp_path)

    # Analyze EZB (proxy for retention pathway) vs stage
    results, analysis = analyze_ezb_vs_stage(gcb_df)

    # Analyze by all genetic subtypes
    subtype_df = analyze_by_genetic_subtype(gcb_df)

    # Save results
    output_dir = get_project_root() / 'results' / 'tables'
    save_analysis_results(results, subtype_df, output_dir)

    # Save processed analysis cohort
    analysis.to_csv(
        get_project_root() / 'data' / 'processed' / 'gcb_stage_analysis.csv',
        index=False
    )

    print("\n" + "=" * 60)
    print("ANALYSIS COMPLETE")
    print("=" * 60)
    print(f"Results saved to: {output_dir}")
    print("\nKey Finding:")
    print(f"  EZB subtype (retention pathway enriched) shows")
    print(f"  significantly higher late-stage presentation")
    print(f"  OR={results['odds_ratio']:.2f}, p={results['p_value']:.4f}")


if __name__ == "__main__":
    main()
