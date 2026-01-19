"""
Compare tEgress Score to DZ/LZ Signatures
Dark Zone vs Light Zone transcriptional programs
"""

import pandas as pd
import numpy as np
from scipy import stats
from lifelines import KaplanMeierFitter, CoxPHFitter
from lifelines.statistics import logrank_test
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import gzip
import os
import warnings
warnings.filterwarnings('ignore')

print("=" * 70)
print("SIGNATURE COMPARISON: tEgress vs DZ/LZ Signatures")
print("=" * 70 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")
figures_dir = os.path.join(results_dir, "figures")

# =============================================================================
# 1. Define Signature Gene Sets
# =============================================================================

# Dark Zone (DZ) signature genes - proliferating centroblasts
# Based on Victora et al., Caron et al., and other GC studies
DZ_GENES = [
    'CXCR4',      # DZ homing receptor (also egress gene!)
    'FOXO1',      # DZ transcription factor
    'MKI67',      # Proliferation marker
    'PCNA',       # Proliferation
    'AICDA',      # AID - somatic hypermutation
    'BCL6',       # GC master regulator, high in DZ
    'BACH2',      # DZ TF
    'RAD51',      # DNA repair (SHM)
]

# Light Zone (LZ) signature genes - centrocytes undergoing selection
LZ_GENES = [
    'CD83',       # LZ marker
    'FAS',        # Selection/apoptosis
    'BCL2A1',     # Anti-apoptotic, LZ
    'CD40',       # T-cell help receptor
    'ICAM1',      # Cell adhesion
    'IRF4',       # Plasma cell differentiation
    'PRDM1',      # BLIMP1 - terminal differentiation
    'XBP1',       # Plasma cell TF
]

# Retention/Egress (tEgress) - as before
RETENTION_GENES = ['S1PR2', 'P2RY8', 'GNA13', 'RHOA', 'SGK1', 'GNAI2', 'FOXO1']
EGRESS_GENES = ['CXCR4']

# MYC signature - proliferation/metabolic
MYC_TARGETS = ['MYC', 'MKI67', 'PCNA', 'CDK4', 'CCND1', 'NCL']

# BCL2 signature - anti-apoptotic
BCL2_SIG = ['BCL2', 'MCL1', 'BCL2L1']

print("Signature definitions:")
print(f"  DZ genes: {DZ_GENES}")
print(f"  LZ genes: {LZ_GENES}")
print(f"  Retention genes: {RETENTION_GENES}")
print(f"  Egress genes: {EGRESS_GENES}")

# =============================================================================
# 2. Load Data
# =============================================================================

print("\nLoading data...")

series_file = os.path.join(lacy_dir, "GSE181063_series_matrix.txt.gz")

with gzip.open(series_file, 'rt') as f:
    lines = f.readlines()

# Parse metadata
sample_ids = None
coo = None
os_status = None
os_followup = None

for line in lines:
    if line.startswith("!Sample_geo_accession"):
        parts = line.strip().split('\t')[1:]
        sample_ids = [p.strip('"') for p in parts]
    elif line.startswith("!Sample_characteristics_ch1") and "pred_combine:" in line:
        parts = line.strip().split('\t')[1:]
        coo = [p.strip('"').split(":")[-1].strip() if "pred_combine:" in p else None for p in parts]
    elif line.startswith("!Sample_characteristics_ch1") and "os_status:" in line:
        parts = line.strip().split('\t')[1:]
        os_status = []
        for p in parts:
            try:
                os_status.append(int(p.strip('"').split(":")[-1].strip()))
            except:
                os_status.append(None)
    elif line.startswith("!Sample_characteristics_ch1") and "os_followup_y:" in line:
        parts = line.strip().split('\t')[1:]
        os_followup = []
        for p in parts:
            try:
                os_followup.append(float(p.strip('"').split(":")[-1].strip()))
            except:
                os_followup.append(None)

# Parse expression
expr_start = None
expr_end = None
for i, line in enumerate(lines):
    if line.startswith("!series_matrix_table_begin"):
        expr_start = i + 1
    elif line.startswith("!series_matrix_table_end"):
        expr_end = i
        break

expr_data = {}
if expr_start and expr_end:
    expr_lines = lines[expr_start:expr_end]
    for line in expr_lines[1:]:
        parts = line.strip().split('\t')
        probe_id = parts[0].strip('"')
        values = [float(v) if v != 'null' and v != '' else np.nan for v in parts[1:]]
        expr_data[probe_id] = values

# Load annotation
annot_file = os.path.join(lacy_dir, "GPL14951_annotation.csv")
gene_to_probe = {}
if os.path.exists(annot_file):
    annot_df = pd.read_csv(annot_file)
    for _, row in annot_df.iterrows():
        if row['Gene_Symbol'] not in gene_to_probe:
            gene_to_probe[row['Gene_Symbol']] = row['Probe']

print(f"Available annotated genes: {list(gene_to_probe.keys())}")

# =============================================================================
# 3. Calculate Signature Scores
# =============================================================================

print("\n" + "=" * 70)
print("CALCULATING SIGNATURE SCORES")
print("=" * 70)

n_samples = len(sample_ids)

def calculate_signature_score(gene_list, name):
    """Calculate z-score based signature"""
    z_scores = []
    genes_found = []

    for gene in gene_list:
        if gene in gene_to_probe:
            probe = gene_to_probe[gene]
            if probe in expr_data:
                expr = np.array(expr_data[probe])
                z = (expr - np.nanmean(expr)) / np.nanstd(expr)
                z_scores.append(z)
                genes_found.append(gene)

    if len(z_scores) > 0:
        score = np.nanmean(z_scores, axis=0)
        print(f"  {name}: {len(genes_found)}/{len(gene_list)} genes found: {genes_found}")
        return score, genes_found
    else:
        print(f"  {name}: No genes found")
        return np.zeros(n_samples), []

# Calculate each signature
dz_score, dz_found = calculate_signature_score(DZ_GENES, "DZ signature")
lz_score, lz_found = calculate_signature_score(LZ_GENES, "LZ signature")
retention_score, ret_found = calculate_signature_score(RETENTION_GENES, "Retention")
egress_score, egr_found = calculate_signature_score(EGRESS_GENES, "Egress")
myc_score, myc_found = calculate_signature_score(MYC_TARGETS, "MYC targets")
bcl2_score, bcl2_found = calculate_signature_score(BCL2_SIG, "BCL2 signature")

# Composite scores
dz_lz_ratio = dz_score - lz_score  # DZ phenotype (positive = more DZ-like)
tEgress = egress_score - retention_score  # Egress phenotype (positive = more egress)

print(f"\nDZ/LZ ratio: mean={dz_lz_ratio.mean():.3f}, std={dz_lz_ratio.std():.3f}")
print(f"tEgress: mean={tEgress.mean():.3f}, std={tEgress.std():.3f}")

# =============================================================================
# 4. Create Analysis DataFrame
# =============================================================================

clinical = pd.DataFrame({
    'sample_id': sample_ids,
    'COO': coo,
    'OS_status': os_status,
    'OS_time': os_followup,
    'DZ_score': dz_score,
    'LZ_score': lz_score,
    'DZ_LZ_ratio': dz_lz_ratio,
    'Retention_score': retention_score,
    'Egress_score': egress_score,
    'tEgress': tEgress,
    'MYC_score': myc_score,
    'BCL2_score': bcl2_score
})

# Filter to valid survival data
surv = clinical[clinical['OS_status'].notna() & clinical['OS_time'].notna()].copy()
print(f"\nSamples with survival: {len(surv)}")

# Create quartiles for each signature (only if variance exists)
for sig in ['DZ_LZ_ratio', 'tEgress', 'MYC_score', 'BCL2_score', 'DZ_score']:
    if surv[sig].std() > 0.01:  # Only if there's meaningful variance
        try:
            surv[f'{sig}_Q'] = pd.qcut(surv[sig], q=4, labels=['Q1', 'Q2', 'Q3', 'Q4'], duplicates='drop')
        except:
            surv[f'{sig}_Q'] = None
    else:
        surv[f'{sig}_Q'] = None

# =============================================================================
# 5. Correlation Analysis
# =============================================================================

print("\n" + "=" * 70)
print("SIGNATURE CORRELATIONS")
print("=" * 70)

signatures = ['DZ_score', 'LZ_score', 'DZ_LZ_ratio', 'Retention_score', 'Egress_score', 'tEgress', 'MYC_score', 'BCL2_score']

corr_matrix = surv[signatures].corr()

print("\nCorrelation matrix:")
print(corr_matrix.round(3).to_string())

# Key correlations
print("\nKey correlations:")
print(f"  tEgress vs DZ/LZ ratio: r = {corr_matrix.loc['tEgress', 'DZ_LZ_ratio']:.3f}")
print(f"  tEgress vs DZ score: r = {corr_matrix.loc['tEgress', 'DZ_score']:.3f}")
print(f"  tEgress vs MYC score: r = {corr_matrix.loc['tEgress', 'MYC_score']:.3f}")
print(f"  DZ/LZ ratio vs MYC: r = {corr_matrix.loc['DZ_LZ_ratio', 'MYC_score']:.3f}")

# =============================================================================
# 6. Survival Analysis: Compare Signatures
# =============================================================================

print("\n" + "=" * 70)
print("SURVIVAL ANALYSIS: SIGNATURE COMPARISON")
print("=" * 70)

def analyze_signature_survival(data, sig_name, quartile_col):
    """Analyze survival by signature quartiles"""

    q1 = data[data[quartile_col] == 'Q1']
    q4 = data[data[quartile_col] == 'Q4']

    if len(q1) < 10 or len(q4) < 10:
        return None, None, None

    # Log-rank Q1 vs Q4
    lr = logrank_test(q1['OS_time'], q4['OS_time'], q1['OS_status'], q4['OS_status'])

    # Median OS
    kmf = KaplanMeierFitter()
    kmf.fit(q1['OS_time'], q1['OS_status'])
    med_q1 = kmf.median_survival_time_

    kmf.fit(q4['OS_time'], q4['OS_status'])
    med_q4 = kmf.median_survival_time_

    return lr.p_value, med_q1, med_q4

# Overall comparison
print("\n--- OVERALL COHORT ---")
print(f"{'Signature':<20} {'Q1vsQ4 p':>12} {'Median Q1':>12} {'Median Q4':>12} {'Difference':>12}")
print("-" * 70)

sig_results = {}
for sig in ['DZ_score', 'tEgress', 'MYC_score']:
    if surv[f'{sig}_Q'] is None or surv[f'{sig}_Q'].isna().all():
        continue
    p, m1, m4 = analyze_signature_survival(surv, sig, f'{sig}_Q')
    if p is not None:
        m1_str = f"{m1:.1f} yrs" if not np.isinf(m1) else "NR"
        m4_str = f"{m4:.1f} yrs" if not np.isinf(m4) else "NR"
        diff = m1 - m4 if not (np.isinf(m1) or np.isinf(m4)) else float('nan')
        diff_str = f"{diff:+.1f} yrs" if not np.isnan(diff) else "NA"
        sig_star = "***" if p < 0.001 else ("**" if p < 0.01 else ("*" if p < 0.05 else ""))
        print(f"{sig:<20} {p:>12.4f} {m1_str:>12} {m4_str:>12} {diff_str:>12} {sig_star}")
        sig_results[sig] = {'p': p, 'med_q1': m1, 'med_q4': m4}

# By subtype
for subtype in ['GCB', 'ABC', 'MHG', 'UNC']:
    subset = surv[surv['COO'] == subtype].copy()
    if len(subset) >= 40:
        # Recalculate quartiles within subtype
        for sig in ['DZ_score', 'tEgress', 'MYC_score']:
            if subset[sig].std() > 0.01:
                try:
                    subset[f'{sig}_Q'] = pd.qcut(subset[sig], q=4, labels=['Q1', 'Q2', 'Q3', 'Q4'], duplicates='drop')
                except:
                    subset[f'{sig}_Q'] = None
            else:
                subset[f'{sig}_Q'] = None

        print(f"\n--- {subtype} (n={len(subset)}) ---")
        print(f"{'Signature':<20} {'Q1vsQ4 p':>12} {'Median Q1':>12} {'Median Q4':>12}")
        print("-" * 60)

        for sig in ['DZ_score', 'tEgress', 'MYC_score']:
            if subset[f'{sig}_Q'] is None or subset[f'{sig}_Q'].isna().all():
                continue
            p, m1, m4 = analyze_signature_survival(subset, sig, f'{sig}_Q')
            if p is not None:
                m1_str = f"{m1:.1f}" if not np.isinf(m1) else "NR"
                m4_str = f"{m4:.1f}" if not np.isinf(m4) else "NR"
                sig_star = "***" if p < 0.001 else ("**" if p < 0.01 else ("*" if p < 0.05 else ""))
                print(f"{sig:<20} {p:>12.4f} {m1_str:>12} {m4_str:>12} {sig_star}")

# =============================================================================
# 7. Multivariate Analysis
# =============================================================================

print("\n" + "=" * 70)
print("MULTIVARIATE COX REGRESSION")
print("=" * 70)

# Prepare data for Cox regression
cox_data = surv[['OS_time', 'OS_status', 'tEgress', 'DZ_score', 'MYC_score', 'COO']].dropna()
cox_data = cox_data[cox_data['OS_time'] > 0]

# Add COO as dummy variables
cox_data = pd.get_dummies(cox_data, columns=['COO'], drop_first=True)

print(f"\nSamples for Cox regression: {len(cox_data)}")

# Univariate models
print("\n--- UNIVARIATE COX MODELS ---")
print(f"{'Variable':<20} {'HR':>10} {'95% CI':>20} {'p-value':>12}")
print("-" * 65)

for var in ['tEgress', 'DZ_score', 'MYC_score']:
    try:
        cph = CoxPHFitter()
        cph.fit(cox_data[['OS_time', 'OS_status', var]], duration_col='OS_time', event_col='OS_status')
        hr = np.exp(cph.params_[var])
        ci_low = np.exp(cph.confidence_intervals_.iloc[0, 0])
        ci_high = np.exp(cph.confidence_intervals_.iloc[0, 1])
        p = cph.summary['p'].values[0]
        sig = "***" if p < 0.001 else ("**" if p < 0.01 else ("*" if p < 0.05 else ""))
        print(f"{var:<20} {hr:>10.3f} [{ci_low:.2f}-{ci_high:.2f}]{' ':>5} {p:>12.4f} {sig}")
    except Exception as e:
        print(f"{var:<20} Error: {e}")

# Multivariate model
print("\n--- MULTIVARIATE COX MODEL (tEgress + DZ + COO) ---")
try:
    mv_vars = ['OS_time', 'OS_status', 'tEgress', 'DZ_score']
    # Add COO dummies
    coo_cols = [c for c in cox_data.columns if c.startswith('COO_')]
    mv_vars.extend(coo_cols)

    cph_mv = CoxPHFitter()
    cph_mv.fit(cox_data[mv_vars], duration_col='OS_time', event_col='OS_status')

    print(f"\n{'Variable':<20} {'HR':>10} {'95% CI':>20} {'p-value':>12}")
    print("-" * 65)

    for var in ['tEgress', 'DZ_score'] + coo_cols:
        hr = np.exp(cph_mv.params_[var])
        ci_low = np.exp(cph_mv.confidence_intervals_.loc[var].iloc[0])
        ci_high = np.exp(cph_mv.confidence_intervals_.loc[var].iloc[1])
        p = cph_mv.summary.loc[var, 'p']
        sig = "***" if p < 0.001 else ("**" if p < 0.01 else ("*" if p < 0.05 else ""))
        print(f"{var:<20} {hr:>10.3f} [{ci_low:.2f}-{ci_high:.2f}]{' ':>5} {p:>12.4f} {sig}")

except Exception as e:
    print(f"Error in multivariate model: {e}")

# =============================================================================
# 8. Generate Comparison Figure
# =============================================================================

print("\n" + "=" * 70)
print("GENERATING FIGURES")
print("=" * 70)

fig, axes = plt.subplots(2, 3, figsize=(18, 12))

# KM curves for each signature
signatures_to_plot = [
    ('tEgress', 'tEgress (Egress - Retention)'),
    ('DZ_LZ_ratio', 'DZ/LZ Ratio'),
    ('MYC_score', 'MYC Signature'),
    ('BCL2_score', 'BCL2 Signature')
]

colors = {'Q1': '#2ECC71', 'Q2': '#3498DB', 'Q3': '#F39C12', 'Q4': '#E74C3C'}
kmf = KaplanMeierFitter()

for idx, (sig, title) in enumerate(signatures_to_plot):
    ax = axes.flatten()[idx]

    for q in ['Q1', 'Q2', 'Q3', 'Q4']:
        subset = surv[surv[f'{sig}_Q'] == q]
        if len(subset) >= 5:
            kmf.fit(subset['OS_time'], subset['OS_status'], label=q)
            kmf.plot_survival_function(ax=ax, color=colors[q], linewidth=2)

    p = sig_results.get(sig, {}).get('p', np.nan)
    p_str = f"p={p:.4f}" if not np.isnan(p) else ""
    ax.set_title(f'{title}\n{p_str}', fontsize=12, fontweight='bold')
    ax.set_xlabel('Time (years)')
    ax.set_ylabel('Overall Survival')
    ax.legend(loc='lower left')
    ax.set_ylim(0, 1.05)

# Scatter plot: tEgress vs DZ/LZ ratio
ax = axes.flatten()[4]
scatter = ax.scatter(surv['DZ_LZ_ratio'], surv['tEgress'],
                     c=surv['OS_status'], cmap='RdYlGn_r', alpha=0.5, s=20)
ax.set_xlabel('DZ/LZ Ratio (+ = DZ-like)')
ax.set_ylabel('tEgress (+ = Egress phenotype)')
ax.set_title(f'tEgress vs DZ/LZ Ratio\nr = {corr_matrix.loc["tEgress", "DZ_LZ_ratio"]:.3f}',
             fontsize=12, fontweight='bold')
ax.axhline(0, color='gray', linestyle='--', alpha=0.5)
ax.axvline(0, color='gray', linestyle='--', alpha=0.5)
cbar = plt.colorbar(scatter, ax=ax)
cbar.set_label('Death (1=Dead)')

# Summary bar chart
ax = axes.flatten()[5]
sigs = ['tEgress', 'DZ_LZ_ratio', 'MYC_score', 'BCL2_score']
p_values = [sig_results.get(s, {}).get('p', 1.0) for s in sigs]
neg_log_p = [-np.log10(p) if p > 0 else 10 for p in p_values]

bars = ax.bar(range(len(sigs)), neg_log_p, color=['#3498DB', '#E74C3C', '#F39C12', '#27AE60'])
ax.axhline(-np.log10(0.05), color='red', linestyle='--', label='p=0.05')
ax.axhline(-np.log10(0.001), color='darkred', linestyle='--', label='p=0.001')
ax.set_xticks(range(len(sigs)))
ax.set_xticklabels(['tEgress', 'DZ/LZ', 'MYC', 'BCL2'], rotation=45, ha='right')
ax.set_ylabel('-Log10(p-value)')
ax.set_title('Signature Prognostic Significance\n(Q1 vs Q4)', fontsize=12, fontweight='bold')
ax.legend(loc='upper right')

plt.suptitle('Comparison of Transcriptional Signatures for Survival Prediction\nLacy/HMRN DLBCL (n=1310)',
             fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig(os.path.join(figures_dir, "signature_comparison.png"), dpi=150, bbox_inches='tight')
plt.close()
print("  Saved: signature_comparison.png")

# =============================================================================
# 9. Summary
# =============================================================================

print("\n" + "=" * 70)
print("SUMMARY: SIGNATURE COMPARISON")
print("=" * 70)

print("""
KEY FINDINGS:

1. SIGNATURE CORRELATIONS:
   - tEgress and DZ/LZ ratio share CXCR4 and FOXO1
   - Moderate correlation expected due to shared genes
   - tEgress focuses on GC retention/exit, DZ/LZ on zone phenotype

2. PROGNOSTIC VALUE (Overall Cohort):
""")

# Print ranked by significance
ranked = sorted(sig_results.items(), key=lambda x: x[1]['p'])
for sig, res in ranked:
    p = res['p']
    m1 = res['med_q1']
    m4 = res['med_q4']
    m1_str = f"{m1:.1f}" if not np.isinf(m1) else "NR"
    m4_str = f"{m4:.1f}" if not np.isinf(m4) else "NR"
    print(f"   {sig:<15}: p={p:.4f}  (Q1={m1_str} vs Q4={m4_str} years)")

print("""
3. BIOLOGICAL INTERPRETATION:
   - tEgress captures retention/egress axis specifically
   - DZ/LZ captures proliferation vs selection phenotype
   - CXCR4 contributes to both (DZ marker AND egress gene)
   - Both may provide complementary prognostic information

4. OVERLAP EXPLANATION:
   - CXCR4: High in DZ (homing) AND promotes egress from GC
   - FOXO1: DZ transcription factor AND retention pathway
   - The overlap reflects that DZ cells are poised for egress
""")

# Save results
surv.to_csv(os.path.join(results_dir, "all_signatures.csv"), index=False)
corr_matrix.to_csv(os.path.join(results_dir, "signature_correlations.csv"))
print("\nSaved: all_signatures.csv, signature_correlations.csv")

print("\n" + "=" * 70)
print("ANALYSIS COMPLETE")
print("=" * 70)
