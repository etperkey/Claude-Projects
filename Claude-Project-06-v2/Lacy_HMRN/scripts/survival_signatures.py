"""
Transcriptional Signatures Associated with Poor Outcome
Global and Subtype-Specific Analysis
Lacy/HMRN Dataset
"""

import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import gzip
import os
import warnings
warnings.filterwarnings('ignore')

print("=" * 70)
print("SURVIVAL SIGNATURE ANALYSIS")
print("Global and Subtype-Specific Poor Outcome Signatures")
print("Lacy/HMRN Dataset")
print("=" * 70 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")
figures_dir = os.path.join(results_dir, "figures")

# =============================================================================
# 1. Load Data and Extract Survival Information
# =============================================================================

print("Loading data from series matrix...")

series_file = os.path.join(lacy_dir, "GSE181063_series_matrix.txt.gz")

sample_ids = None
coo = None
os_status = None
os_time = None
pfs_status = None
pfs_time = None

with gzip.open(series_file, 'rt') as f:
    lines = f.readlines()

# Parse metadata - need to find survival columns
for line in lines:
    if line.startswith("!Sample_geo_accession"):
        parts = line.strip().split('\t')[1:]
        sample_ids = [p.strip('"') for p in parts]
    elif line.startswith("!Sample_characteristics_ch1") and "pred_combine:" in line:
        parts = line.strip().split('\t')[1:]
        coo = []
        for p in parts:
            p = p.strip('"')
            if "pred_combine:" in p:
                c = p.split(":")[-1].strip()
                coo.append(c)
            else:
                coo.append(None)
    elif line.startswith("!Sample_characteristics_ch1") and "os_stat:" in line.lower():
        parts = line.strip().split('\t')[1:]
        os_status = []
        for p in parts:
            p = p.strip('"')
            if "os_stat:" in p.lower():
                val = p.split(":")[-1].strip()
                os_status.append(val)
            else:
                os_status.append(None)
    elif line.startswith("!Sample_characteristics_ch1") and "os_time:" in line.lower():
        parts = line.strip().split('\t')[1:]
        os_time = []
        for p in parts:
            p = p.strip('"')
            if "os_time:" in p.lower():
                val = p.split(":")[-1].strip()
                try:
                    os_time.append(float(val))
                except:
                    os_time.append(None)
            else:
                os_time.append(None)
    elif line.startswith("!Sample_characteristics_ch1") and "pfs_stat:" in line.lower():
        parts = line.strip().split('\t')[1:]
        pfs_status = []
        for p in parts:
            p = p.strip('"')
            if "pfs_stat:" in p.lower():
                val = p.split(":")[-1].strip()
                pfs_status.append(val)
            else:
                pfs_status.append(None)
    elif line.startswith("!Sample_characteristics_ch1") and "pfs_time:" in line.lower():
        parts = line.strip().split('\t')[1:]
        pfs_time = []
        for p in parts:
            p = p.strip('"')
            if "pfs_time:" in p.lower():
                val = p.split(":")[-1].strip()
                try:
                    pfs_time.append(float(val))
                except:
                    pfs_time.append(None)
            else:
                pfs_time.append(None)

# Check what survival data we have
print(f"Sample IDs: {len(sample_ids) if sample_ids else 0}")
print(f"COO data: {len(coo) if coo else 0}")
print(f"OS status: {len(os_status) if os_status else 0}")
print(f"OS time: {len(os_time) if os_time else 0}")
print(f"PFS status: {len(pfs_status) if pfs_status else 0}")
print(f"PFS time: {len(pfs_time) if pfs_time else 0}")

# If survival not in series matrix, check all characteristics
if os_status is None:
    print("\nSearching for survival data in all characteristics...")
    for line in lines:
        if line.startswith("!Sample_characteristics_ch1"):
            # Print first few unique values to understand the data
            parts = line.strip().split('\t')[1:3]
            sample_val = parts[0].strip('"') if parts else ""
            if any(x in sample_val.lower() for x in ['surv', 'death', 'alive', 'status', 'event', 'time', 'follow']):
                print(f"  Found: {sample_val[:80]}...")

# Parse expression matrix
print("\nLoading expression data...")
expr_start = None
expr_end = None
for i, line in enumerate(lines):
    if line.startswith("!series_matrix_table_begin"):
        expr_start = i + 1
    elif line.startswith("!series_matrix_table_end"):
        expr_end = i
        break

expr_data = {}
probe_ids = []
if expr_start and expr_end:
    expr_lines = lines[expr_start:expr_end]
    header = expr_lines[0].strip().split('\t')
    header = [h.strip('"') for h in header]

    for line in expr_lines[1:]:
        parts = line.strip().split('\t')
        probe_id = parts[0].strip('"')
        probe_ids.append(probe_id)
        values = [float(v) if v != 'null' and v != '' else np.nan for v in parts[1:]]
        expr_data[probe_id] = values

print(f"Probes loaded: {len(probe_ids)}")

# =============================================================================
# 2. Try Loading Survival from Blood Supplement
# =============================================================================

print("\n" + "=" * 70)
print("Loading survival data from Blood 2020 supplement...")
print("=" * 70)

try:
    # Load clinical data from supplement
    supp_file = os.path.join(lacy_dir, "blood_2020_supplement.xlsx")
    if os.path.exists(supp_file):
        xl = pd.ExcelFile(supp_file)
        print(f"Available sheets: {xl.sheet_names}")

        # Try S4 Patient Characteristics
        s4 = pd.read_excel(xl, sheet_name="S4 Patient Characteristics")
        print(f"\nS4 columns: {list(s4.columns)}")
        print(f"S4 rows: {len(s4)}")

        # Check for survival columns
        surv_cols = [c for c in s4.columns if any(x in str(c).lower() for x in ['surv', 'death', 'alive', 'status', 'event', 'time', 'os', 'pfs', 'efs'])]
        print(f"Potential survival columns: {surv_cols}")

        for col in surv_cols:
            print(f"  {col}: {s4[col].value_counts().head()}")
except Exception as e:
    print(f"Error loading supplement: {e}")

# =============================================================================
# 3. Alternative: Use IPI as Outcome Proxy
# =============================================================================

print("\n" + "=" * 70)
print("Using IPI as Outcome Proxy (High IPI = Poor Prognosis)")
print("=" * 70)

# Extract IPI from series matrix
ipi = None
for line in lines:
    if line.startswith("!Sample_characteristics_ch1") and "ipi:" in line.lower():
        parts = line.strip().split('\t')[1:]
        ipi = []
        for p in parts:
            p = p.strip('"')
            if "ipi:" in p.lower():
                val = p.split(":")[-1].strip()
                try:
                    ipi.append(int(val))
                except:
                    ipi.append(None)
            else:
                ipi.append(None)
        break

if ipi:
    print(f"IPI data available: {sum(1 for x in ipi if x is not None)} samples")
    ipi_counts = pd.Series([x for x in ipi if x is not None]).value_counts().sort_index()
    print(f"IPI distribution:\n{ipi_counts}")

# Create clinical DataFrame
clinical = pd.DataFrame({
    'sample_id': sample_ids,
    'COO': coo,
    'IPI': ipi if ipi else [None] * len(sample_ids)
})

# Define high vs low risk based on IPI
# IPI 0-2 = Low risk, IPI 3-5 = High risk
def classify_risk(ipi_val):
    if pd.isna(ipi_val) or ipi_val is None:
        return None
    if ipi_val <= 2:
        return 'Low_Risk'
    else:
        return 'High_Risk'

clinical['Risk'] = clinical['IPI'].apply(classify_risk)
print(f"\nRisk classification:")
print(clinical['Risk'].value_counts(dropna=False))

# =============================================================================
# 4. Load Gene Annotation
# =============================================================================

annot_file = os.path.join(lacy_dir, "GPL14951_annotation.csv")
annot_df = None
if os.path.exists(annot_file):
    annot_df = pd.read_csv(annot_file)
    print(f"\nAnnotation loaded: {len(annot_df)} probes")

# =============================================================================
# 5. Differential Expression: High Risk vs Low Risk (IPI-based)
# =============================================================================

sample_to_idx = {s: i for i, s in enumerate(sample_ids)}

def run_risk_de(subtype_name, subtype_df):
    """Run DE analysis comparing High vs Low IPI risk"""

    print(f"\n{'='*70}")
    print(f"POOR OUTCOME SIGNATURE: {subtype_name}")
    print(f"{'='*70}")

    # Get samples
    low_risk = subtype_df[subtype_df['Risk'] == 'Low_Risk']['sample_id'].tolist()
    high_risk = subtype_df[subtype_df['Risk'] == 'High_Risk']['sample_id'].tolist()

    low_idx = [sample_to_idx[s] for s in low_risk if s in sample_to_idx]
    high_idx = [sample_to_idx[s] for s in high_risk if s in sample_to_idx]

    print(f"Low Risk (IPI 0-2): n={len(low_idx)}")
    print(f"High Risk (IPI 3-5): n={len(high_idx)}")

    if len(low_idx) < 10 or len(high_idx) < 10:
        print(f"WARNING: Insufficient samples for robust analysis")
        if len(low_idx) < 5 or len(high_idx) < 5:
            return None

    # Run t-tests
    results = []

    for probe_id in probe_ids:
        values = expr_data[probe_id]

        low_vals = [values[i] for i in low_idx if not np.isnan(values[i])]
        high_vals = [values[i] for i in high_idx if not np.isnan(values[i])]

        if len(low_vals) >= 5 and len(high_vals) >= 5:
            if np.std(low_vals) > 0 and np.std(high_vals) > 0:
                t_stat, p_value = stats.ttest_ind(low_vals, high_vals)

                mean_low = np.mean(low_vals)
                mean_high = np.mean(high_vals)
                log2fc = np.log2((mean_high + 0.01) / (mean_low + 0.01))

                # Effect size (Cohen's d)
                pooled_std = np.sqrt((np.std(low_vals)**2 + np.std(high_vals)**2) / 2)
                cohens_d = (mean_high - mean_low) / pooled_std if pooled_std > 0 else 0

                direction = 'High_Risk_Up' if log2fc > 0 else 'Low_Risk_Up'

                results.append({
                    'Probe': probe_id,
                    'Mean_LowRisk': mean_low,
                    'Mean_HighRisk': mean_high,
                    'Log2FC': log2fc,
                    'Cohens_d': cohens_d,
                    'T_stat': t_stat,
                    'P_value': p_value,
                    'Direction': direction
                })

    # Convert to DataFrame
    results_df = pd.DataFrame(results)
    results_df = results_df.sort_values('P_value')

    # FDR correction
    results_df['FDR'] = stats.false_discovery_control(results_df['P_value'])

    # Add gene annotation
    if annot_df is not None:
        results_df = results_df.merge(annot_df, on='Probe', how='left')

    # Summary
    sig_fdr01 = results_df[results_df['FDR'] < 0.1]
    sig_fdr05 = results_df[results_df['FDR'] < 0.05]
    nom_sig = results_df[results_df['P_value'] < 0.05]

    print(f"\nProbes tested: {len(results_df)}")
    print(f"Significant (FDR < 0.05): {len(sig_fdr05)}")
    print(f"Significant (FDR < 0.1): {len(sig_fdr01)}")
    print(f"Nominal (p < 0.05): {len(nom_sig)}")
    print(f"Max |Log2FC|: {results_df['Log2FC'].abs().max():.4f}")
    print(f"Max |Cohen's d|: {results_df['Cohens_d'].abs().max():.4f}")

    # Top results
    print(f"\n{'-'*90}")
    print(f"TOP 30 GENES ASSOCIATED WITH POOR OUTCOME (High IPI)")
    print(f"{'-'*90}")
    print(f"{'Probe':<18} {'Gene':<12} {'Log2FC':>8} {'Cohen_d':>8} {'P-value':>12} {'FDR':>10} {'Direction':<12}")
    print("-" * 90)

    for i, row in results_df.head(30).iterrows():
        gene = row.get('Gene_Symbol', '-')
        if pd.isna(gene):
            gene = '-'
        sig = "***" if row['FDR'] < 0.05 else ("**" if row['FDR'] < 0.1 else ("*" if row['P_value'] < 0.05 else ""))
        print(f"{row['Probe']:<18} {gene:<12} {row['Log2FC']:>8.4f} {row['Cohens_d']:>8.3f} {row['P_value']:>12.2e} {row['FDR']:>10.4f} {row['Direction']:<12} {sig}")

    # Breakdown by direction
    high_up = sig_fdr01[sig_fdr01['Direction'] == 'High_Risk_Up'] if len(sig_fdr01) > 0 else nom_sig[nom_sig['Direction'] == 'High_Risk_Up']
    low_up = sig_fdr01[sig_fdr01['Direction'] == 'Low_Risk_Up'] if len(sig_fdr01) > 0 else nom_sig[nom_sig['Direction'] == 'Low_Risk_Up']

    threshold = "FDR<0.1" if len(sig_fdr01) > 0 else "p<0.05"

    print(f"\n{'-'*50}")
    print(f"BREAKDOWN BY DIRECTION ({threshold})")
    print(f"{'-'*50}")
    print(f"Upregulated in High Risk (poor prognosis): {len(high_up)}")
    print(f"Upregulated in Low Risk (good prognosis): {len(low_up)}")

    if len(high_up) > 0:
        print(f"\nTop genes UP in High Risk (poor outcome signature):")
        for i, row in high_up.head(15).iterrows():
            gene = row.get('Gene_Symbol', row['Probe'])
            if pd.isna(gene):
                gene = row['Probe'][:15]
            print(f"  {gene:<15} Log2FC={row['Log2FC']:>7.4f}  d={row['Cohens_d']:>6.3f}  p={row['P_value']:.4f}")

    if len(low_up) > 0:
        print(f"\nTop genes UP in Low Risk (good outcome signature):")
        for i, row in low_up.head(15).iterrows():
            gene = row.get('Gene_Symbol', row['Probe'])
            if pd.isna(gene):
                gene = row['Probe'][:15]
            print(f"  {gene:<15} Log2FC={row['Log2FC']:>7.4f}  d={row['Cohens_d']:>6.3f}  p={row['P_value']:.4f}")

    return {
        'results_df': results_df,
        'n_low': len(low_idx),
        'n_high': len(high_idx),
        'sig_fdr01': sig_fdr01,
        'sig_fdr05': sig_fdr05,
        'nom_sig': nom_sig,
        'subtype': subtype_name
    }

# =============================================================================
# 6. Run Analysis: Global and by Subtype
# =============================================================================

# Global analysis
all_samples = clinical[clinical['Risk'].notna()].copy()
print(f"\nSamples with IPI data: {len(all_samples)}")

global_results = run_risk_de("GLOBAL (All Subtypes)", all_samples)

# GCB
gcb = clinical[(clinical['COO'] == 'GCB') & (clinical['Risk'].notna())].copy()
gcb_results = run_risk_de("GCB", gcb)

# ABC
abc = clinical[(clinical['COO'] == 'ABC') & (clinical['Risk'].notna())].copy()
abc_results = run_risk_de("ABC", abc)

# MHG
mhg = clinical[(clinical['COO'] == 'MHG') & (clinical['Risk'].notna())].copy()
mhg_results = run_risk_de("MHG", mhg)

# UNC
unc = clinical[(clinical['COO'] == 'UNC') & (clinical['Risk'].notna())].copy()
unc_results = run_risk_de("UNC", unc)

# =============================================================================
# 7. Generate Summary Figure
# =============================================================================

print(f"\n{'='*70}")
print("GENERATING FIGURES")
print(f"{'='*70}")

all_results = [
    ('Global', global_results),
    ('GCB', gcb_results),
    ('ABC', abc_results),
    ('MHG', mhg_results),
    ('UNC', unc_results)
]

# Filter to valid results
valid_results = [(name, res) for name, res in all_results if res is not None]

# Create multi-panel volcano plot
n_panels = len(valid_results)
fig, axes = plt.subplots(2, 3, figsize=(18, 12))
axes = axes.flatten()

for idx, (name, results) in enumerate(valid_results):
    ax = axes[idx]
    df = results['results_df']
    df['neg_log_p'] = -np.log10(df['P_value'])

    colors = []
    for _, row in df.iterrows():
        if row['FDR'] < 0.1:
            if row['Direction'] == 'High_Risk_Up':
                colors.append('#E74C3C')  # Red for poor outcome
            else:
                colors.append('#27AE60')  # Green for good outcome
        elif row['P_value'] < 0.05:
            colors.append('#95A5A6')
        else:
            colors.append('#D5D8DC')

    ax.scatter(df['Log2FC'], df['neg_log_p'], c=colors, alpha=0.5, s=8, edgecolors='none')

    ax.axhline(-np.log10(0.05), color='gray', linestyle='--', linewidth=0.8, alpha=0.7)
    ax.axvline(0, color='black', linewidth=0.5, alpha=0.5)

    # FDR line
    sig_fdr01 = results['sig_fdr01']
    if len(sig_fdr01) > 0:
        fdr_threshold = sig_fdr01['P_value'].max()
        ax.axhline(-np.log10(fdr_threshold), color='red', linestyle='--', linewidth=1, alpha=0.7)

    ax.set_xlabel('Log2FC (High Risk vs Low Risk)', fontsize=10)
    ax.set_ylabel('-Log10(P-value)', fontsize=10)
    ax.set_title(f'{name}\nLow={results["n_low"]}, High={results["n_high"]} | FDR<0.1: {len(sig_fdr01)}',
                fontsize=11, fontweight='bold')

# Hide empty subplot
if n_panels < 6:
    for idx in range(n_panels, 6):
        axes[idx].axis('off')

# Legend
legend_elements = [
    mpatches.Patch(color='#E74C3C', label='Up in High Risk (poor outcome) FDR<0.1'),
    mpatches.Patch(color='#27AE60', label='Up in Low Risk (good outcome) FDR<0.1'),
    mpatches.Patch(color='#95A5A6', label='Nominal (p<0.05)'),
]
fig.legend(handles=legend_elements, loc='lower center', ncol=3, fontsize=10, bbox_to_anchor=(0.5, -0.02))

plt.suptitle('Transcriptional Signatures of Poor Outcome (High IPI)\nGlobal and Subtype-Specific',
             fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.subplots_adjust(bottom=0.08)
plt.savefig(os.path.join(figures_dir, "poor_outcome_signatures.png"), dpi=150, bbox_inches='tight')
plt.close()
print("  Saved: poor_outcome_signatures.png")

# =============================================================================
# 8. Save Results
# =============================================================================

for name, results in valid_results:
    if results:
        filename = f"outcome_signature_{name.lower().replace(' ', '_').replace('(', '').replace(')', '')}.csv"
        results['results_df'].to_csv(os.path.join(results_dir, filename), index=False)
        print(f"  Saved: {filename}")

# =============================================================================
# 9. Summary Comparison Table
# =============================================================================

print(f"\n{'='*70}")
print("SUMMARY: Poor Outcome Signatures by Subtype")
print(f"{'='*70}")

print(f"\n{'Subtype':<15} {'Low_Risk':>10} {'High_Risk':>10} {'FDR<0.1':>10} {'FDR<0.05':>10} {'p<0.05':>10} {'Max|FC|':>10}")
print("-" * 75)

for name, results in valid_results:
    if results:
        print(f"{name:<15} {results['n_low']:>10} {results['n_high']:>10} "
              f"{len(results['sig_fdr01']):>10} {len(results['sig_fdr05']):>10} "
              f"{len(results['nom_sig']):>10} {results['results_df']['Log2FC'].abs().max():>10.3f}")

# =============================================================================
# 10. Extract Top Signature Genes
# =============================================================================

print(f"\n{'='*70}")
print("TOP POOR OUTCOME SIGNATURE GENES (Global)")
print(f"{'='*70}")

if global_results:
    df = global_results['results_df']

    # Top genes up in high risk
    high_risk_genes = df[df['Direction'] == 'High_Risk_Up'].head(50)
    print(f"\nTop 20 genes UPREGULATED in poor outcome (High IPI):")
    for i, row in high_risk_genes.head(20).iterrows():
        gene = row.get('Gene_Symbol', row['Probe'])
        if pd.isna(gene):
            gene = row['Probe']
        sig = "***" if row['FDR'] < 0.05 else ("**" if row['FDR'] < 0.1 else "*")
        print(f"  {gene:<18} FC={2**row['Log2FC']:.2f}x  p={row['P_value']:.2e}  {sig}")

    # Top genes up in low risk (protective)
    low_risk_genes = df[df['Direction'] == 'Low_Risk_Up'].head(50)
    print(f"\nTop 20 genes UPREGULATED in good outcome (Low IPI):")
    for i, row in low_risk_genes.head(20).iterrows():
        gene = row.get('Gene_Symbol', row['Probe'])
        if pd.isna(gene):
            gene = row['Probe']
        sig = "***" if row['FDR'] < 0.05 else ("**" if row['FDR'] < 0.1 else "*")
        print(f"  {gene:<18} FC={2**abs(row['Log2FC']):.2f}x  p={row['P_value']:.2e}  {sig}")

print(f"\n{'='*70}")
print("ANALYSIS COMPLETE")
print(f"{'='*70}")
