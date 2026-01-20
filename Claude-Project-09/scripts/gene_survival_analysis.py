"""
Gene Expression Survival Analysis - IPI-Independent Prognostic Profiles
Based on Wang et al. 2026 DLBCL bulk RNA-seq data

Identifies genes associated with OS/PFS independent of IPI:
1. Global analysis (all samples)
2. LymphGen subtype-stratified analysis
"""

import pandas as pd
import numpy as np
from lifelines import CoxPHFitter
from lifelines.statistics import multivariate_logrank_test
import warnings
import os
from scipy import stats

warnings.filterwarnings('ignore')

# Paths
DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GDC_DIR = os.path.join(DATA_DIR, "data", "GDC")
OUTPUT_DIR = os.path.join(DATA_DIR, "data", "processed")
RESULTS_DIR = os.path.join(DATA_DIR, "results")

os.makedirs(RESULTS_DIR, exist_ok=True)

print("=" * 70)
print("Gene Expression Survival Analysis - IPI-Independent Profiles")
print("=" * 70)

# 1. Load data
print("\n1. Loading data...")

# Clinical + survival data
clinical = pd.read_csv(os.path.join(OUTPUT_DIR, "rnaseq_themes_survival.csv"))
print(f"   Clinical data: {len(clinical)} samples with survival")

# RNA-seq expression
rnaseq = pd.read_csv(os.path.join(GDC_DIR, "RNAseq_gene_expression_562.txt"),
                     sep="\t", low_memory=False)
print(f"   RNA-seq: {rnaseq.shape[0]} genes x {rnaseq.shape[1]-3} samples")

# Prepare expression matrix
expr = rnaseq.set_index('Gene')
expr = expr.drop(['Accession', 'Gene_ID'], axis=1, errors='ignore')
expr = expr.apply(pd.to_numeric, errors='coerce')

# Filter to samples with survival data
survival_samples = clinical['Sample_ID'].tolist()
expr = expr[[c for c in expr.columns if c in survival_samples]]
print(f"   Expression matrix filtered: {expr.shape[0]} genes x {expr.shape[1]} samples")

# Z-score normalize genes
expr_z = expr.apply(lambda x: (x - x.mean()) / x.std() if x.std() > 0 else x * 0, axis=1)

# 2. Prepare clinical data for Cox models
print("\n2. Preparing clinical covariates...")

# Create IPI numeric score (0-4 based on risk groups)
ipi_map = {'Low': 0, 'Low-Intermediate': 1, 'High-Intermediate': 2, 'High': 3}
clinical['IPI_numeric'] = clinical['IPI Group'].map(ipi_map)

# Filter samples with complete data
analysis_df = clinical[
    clinical['OS_status'].notna() &
    clinical['OS_time_years'].notna() &
    clinical['IPI_numeric'].notna()
].copy()

print(f"   Samples with complete OS + IPI data: {len(analysis_df)}")
print(f"   Deaths: {int(analysis_df['OS_status'].sum())} ({100*analysis_df['OS_status'].mean():.1f}%)")

# 3. Define Cox regression function
def run_cox_analysis(expr_data, clinical_data, gene_list=None, min_events=10,
                     adjust_ipi=True, group_name="Global"):
    """
    Run Cox regression for each gene, optionally adjusting for IPI.
    Returns DataFrame with hazard ratios and p-values.
    """
    results = []

    if gene_list is None:
        gene_list = expr_data.index.tolist()

    # Filter genes with variance
    gene_list = [g for g in gene_list if g in expr_data.index and expr_data.loc[g].std() > 0.1]

    n_events = clinical_data['OS_status'].sum()
    if n_events < min_events:
        print(f"   {group_name}: Insufficient events ({n_events}), skipping")
        return pd.DataFrame()

    sample_ids = clinical_data['Sample_ID'].tolist()
    valid_samples = [s for s in sample_ids if s in expr_data.columns]

    if len(valid_samples) < 20:
        print(f"   {group_name}: Insufficient samples ({len(valid_samples)}), skipping")
        return pd.DataFrame()

    print(f"   {group_name}: Analyzing {len(gene_list)} genes, {len(valid_samples)} samples, {int(n_events)} events")

    for i, gene in enumerate(gene_list):
        if (i + 1) % 2000 == 0:
            print(f"      Progress: {i+1}/{len(gene_list)} genes...")

        try:
            # Build analysis dataframe
            cox_df = clinical_data[clinical_data['Sample_ID'].isin(valid_samples)].copy()
            gene_expr = expr_data.loc[gene, cox_df['Sample_ID'].tolist()].values
            cox_df['gene_expr'] = gene_expr

            # Skip if no variance
            if cox_df['gene_expr'].std() < 0.01:
                continue

            cox_df = cox_df[['OS_time_years', 'OS_status', 'gene_expr', 'IPI_numeric']].dropna()

            if len(cox_df) < 20:
                continue

            cph = CoxPHFitter()

            if adjust_ipi:
                # Multivariate model: gene + IPI
                cph.fit(cox_df, duration_col='OS_time_years', event_col='OS_status')

                hr = np.exp(cph.params_['gene_expr'])
                pval = cph.summary.loc['gene_expr', 'p']
                hr_lower = np.exp(cph.confidence_intervals_.loc['gene_expr', '95% lower-bound'])
                hr_upper = np.exp(cph.confidence_intervals_.loc['gene_expr', '95% upper-bound'])
            else:
                # Univariate model: gene only
                cox_df_uni = cox_df[['OS_time_years', 'OS_status', 'gene_expr']]
                cph.fit(cox_df_uni, duration_col='OS_time_years', event_col='OS_status')

                hr = np.exp(cph.params_['gene_expr'])
                pval = cph.summary.loc['gene_expr', 'p']
                hr_lower = np.exp(cph.confidence_intervals_.loc['gene_expr', '95% lower-bound'])
                hr_upper = np.exp(cph.confidence_intervals_.loc['gene_expr', '95% upper-bound'])

            results.append({
                'Gene': gene,
                'Group': group_name,
                'HR': hr,
                'HR_lower': hr_lower,
                'HR_upper': hr_upper,
                'p_value': pval,
                'n_samples': len(cox_df),
                'n_events': int(cox_df['OS_status'].sum()),
                'IPI_adjusted': adjust_ipi
            })

        except Exception as e:
            continue

    results_df = pd.DataFrame(results)

    if len(results_df) > 0:
        # Multiple testing correction (Benjamini-Hochberg)
        from statsmodels.stats.multitest import multipletests
        _, results_df['q_value'], _, _ = multipletests(results_df['p_value'], method='fdr_bh')

    return results_df


# 4. Run Global Analysis
print("\n3. Running GLOBAL Cox regression (IPI-adjusted)...")
global_results = run_cox_analysis(
    expr_z, analysis_df,
    adjust_ipi=True,
    group_name="Global"
)

# 5. Run LymphGen-stratified Analysis
print("\n4. Running LymphGen-STRATIFIED Cox regression...")
subtype_results = []

for subtype in analysis_df['LymphGen_Subtype'].unique():
    if pd.isna(subtype):
        continue

    subtype_df = analysis_df[analysis_df['LymphGen_Subtype'] == subtype]

    if len(subtype_df) >= 20 and subtype_df['OS_status'].sum() >= 5:
        result = run_cox_analysis(
            expr_z, subtype_df,
            adjust_ipi=True,
            group_name=subtype,
            min_events=5
        )
        if len(result) > 0:
            subtype_results.append(result)

if subtype_results:
    subtype_results_df = pd.concat(subtype_results, ignore_index=True)
else:
    subtype_results_df = pd.DataFrame()

# 6. Combine and summarize results
print("\n5. Summarizing results...")

all_results = pd.concat([global_results, subtype_results_df], ignore_index=True)

# Save all results
all_results.to_csv(os.path.join(RESULTS_DIR, "gene_survival_cox_results.csv"), index=False)
print(f"   Saved all results: {len(all_results)} gene-group combinations")

# 7. Extract significant IPI-independent genes
print("\n6. Identifying IPI-independent prognostic genes...")

sig_threshold = 0.05  # q-value threshold

# Global significant genes
global_sig = global_results[global_results['q_value'] < sig_threshold].copy()
global_sig = global_sig.sort_values('p_value')

print(f"\n   GLOBAL IPI-independent prognostic genes (q < {sig_threshold}):")
print(f"   Total significant: {len(global_sig)}")

if len(global_sig) > 0:
    adverse = global_sig[global_sig['HR'] > 1].head(20)
    favorable = global_sig[global_sig['HR'] < 1].head(20)

    print(f"\n   Top ADVERSE prognosis genes (HR > 1):")
    print(f"   {'Gene':<15} {'HR':>8} {'95% CI':>18} {'q-value':>10}")
    print("   " + "-" * 55)
    for _, row in adverse.iterrows():
        ci = f"({row['HR_lower']:.2f}-{row['HR_upper']:.2f})"
        print(f"   {row['Gene']:<15} {row['HR']:>8.2f} {ci:>18} {row['q_value']:>10.4f}")

    print(f"\n   Top FAVORABLE prognosis genes (HR < 1):")
    print(f"   {'Gene':<15} {'HR':>8} {'95% CI':>18} {'q-value':>10}")
    print("   " + "-" * 55)
    for _, row in favorable.iterrows():
        ci = f"({row['HR_lower']:.2f}-{row['HR_upper']:.2f})"
        print(f"   {row['Gene']:<15} {row['HR']:>8.2f} {ci:>18} {row['q_value']:>10.4f}")

# Save significant genes
global_sig.to_csv(os.path.join(RESULTS_DIR, "global_ipi_independent_genes.csv"), index=False)

# Subtype-specific significant genes
if len(subtype_results_df) > 0:
    print(f"\n   SUBTYPE-SPECIFIC IPI-independent prognostic genes:")

    for subtype in subtype_results_df['Group'].unique():
        sub_sig = subtype_results_df[
            (subtype_results_df['Group'] == subtype) &
            (subtype_results_df['q_value'] < sig_threshold)
        ]

        if len(sub_sig) > 0:
            print(f"\n   {subtype} ({len(sub_sig)} significant genes):")
            top_genes = sub_sig.nsmallest(5, 'p_value')
            for _, row in top_genes.iterrows():
                direction = "adverse" if row['HR'] > 1 else "favorable"
                print(f"      {row['Gene']}: HR={row['HR']:.2f}, q={row['q_value']:.4f} ({direction})")

    # Save subtype results
    subtype_sig = subtype_results_df[subtype_results_df['q_value'] < sig_threshold]
    subtype_sig.to_csv(os.path.join(RESULTS_DIR, "subtype_ipi_independent_genes.csv"), index=False)

# 8. Create gene signature summary
print("\n7. Creating prognostic signature summary...")

# Separate adverse and favorable genes globally
if len(global_sig) > 0:
    adverse_genes = global_sig[global_sig['HR'] > 1.2]['Gene'].tolist()
    favorable_genes = global_sig[global_sig['HR'] < 0.8]['Gene'].tolist()

    signature_summary = {
        'adverse_genes': adverse_genes[:50],  # Top 50
        'favorable_genes': favorable_genes[:50],
        'n_adverse': len(adverse_genes),
        'n_favorable': len(favorable_genes)
    }

    # Save as gene lists
    pd.DataFrame({'adverse_prognostic_genes': adverse_genes}).to_csv(
        os.path.join(RESULTS_DIR, "adverse_prognostic_genes.csv"), index=False)
    pd.DataFrame({'favorable_prognostic_genes': favorable_genes}).to_csv(
        os.path.join(RESULTS_DIR, "favorable_prognostic_genes.csv"), index=False)

    print(f"   Adverse prognosis genes (HR > 1.2): {len(adverse_genes)}")
    print(f"   Favorable prognosis genes (HR < 0.8): {len(favorable_genes)}")

print("\n" + "=" * 70)
print("Analysis complete!")
print("=" * 70)
print(f"\nOutput files in {RESULTS_DIR}:")
print("  - gene_survival_cox_results.csv (all gene-survival associations)")
print("  - global_ipi_independent_genes.csv (significant global genes)")
print("  - subtype_ipi_independent_genes.csv (subtype-specific genes)")
print("  - adverse_prognostic_genes.csv (gene list)")
print("  - favorable_prognostic_genes.csv (gene list)")
