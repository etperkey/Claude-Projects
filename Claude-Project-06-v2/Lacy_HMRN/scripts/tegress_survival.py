"""
tEgress Score Survival Analysis
Calculate egress/retention transcriptional score and analyze OS by quartiles
"""

import pandas as pd
import numpy as np
from scipy import stats
from lifelines import KaplanMeierFitter
from lifelines.statistics import logrank_test, multivariate_logrank_test
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import gzip
import os
import warnings
warnings.filterwarnings('ignore')

print("=" * 70)
print("tEGRESS SCORE SURVIVAL ANALYSIS")
print("Retention vs Egress Pathway Gene Expression")
print("=" * 70 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")
figures_dir = os.path.join(results_dir, "figures")

# =============================================================================
# 1. Define Pathway Genes
# =============================================================================

# Retention genes - keep B-cells in GC (higher = more retention = expected better outcome)
RETENTION_GENES = ['S1PR2', 'P2RY8', 'GNA13', 'RHOA', 'SGK1', 'GNAI2', 'FOXO1']

# Egress genes - promote B-cell exit from GC (higher = more egress = expected worse outcome)
EGRESS_GENES = ['CXCR4']

# Additional B-cell/GC identity genes for context
IDENTITY_GENES = ['PAX5', 'MS4A1', 'BCL6']

print("Retention genes:", RETENTION_GENES)
print("Egress genes:", EGRESS_GENES)

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
        coo = []
        for p in parts:
            p = p.strip('"')
            if "pred_combine:" in p:
                coo.append(p.split(":")[-1].strip())
            else:
                coo.append(None)
    elif line.startswith("!Sample_characteristics_ch1") and "os_status:" in line:
        parts = line.strip().split('\t')[1:]
        os_status = []
        for p in parts:
            p = p.strip('"')
            if "os_status:" in p:
                try:
                    os_status.append(int(p.split(":")[-1].strip()))
                except:
                    os_status.append(None)
            else:
                os_status.append(None)
    elif line.startswith("!Sample_characteristics_ch1") and "os_followup_y:" in line:
        parts = line.strip().split('\t')[1:]
        os_followup = []
        for p in parts:
            p = p.strip('"')
            if "os_followup_y:" in p:
                try:
                    os_followup.append(float(p.split(":")[-1].strip()))
                except:
                    os_followup.append(None)
            else:
                os_followup.append(None)

# Parse expression matrix
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
    for line in expr_lines[1:]:
        parts = line.strip().split('\t')
        probe_id = parts[0].strip('"')
        probe_ids.append(probe_id)
        values = [float(v) if v != 'null' and v != '' else np.nan for v in parts[1:]]
        expr_data[probe_id] = values

print(f"Samples: {len(sample_ids)}")
print(f"Probes: {len(probe_ids)}")

# Load annotation to map probes to genes
annot_file = os.path.join(lacy_dir, "GPL14951_annotation.csv")
probe_to_gene = {}
if os.path.exists(annot_file):
    annot_df = pd.read_csv(annot_file)
    for _, row in annot_df.iterrows():
        probe_to_gene[row['Probe']] = row['Gene_Symbol']

# Create gene to probe mapping (use first probe for each gene)
gene_to_probe = {}
for probe, gene in probe_to_gene.items():
    if gene not in gene_to_probe:
        gene_to_probe[gene] = probe

print(f"\nGenes with probes: {list(gene_to_probe.keys())}")

# =============================================================================
# 3. Calculate tEgress Score
# =============================================================================

print("\n" + "=" * 70)
print("CALCULATING tEGRESS SCORE")
print("=" * 70)

# Get expression values for pathway genes
def get_gene_expression(gene_name):
    """Get expression values for a gene across all samples"""
    if gene_name in gene_to_probe:
        probe = gene_to_probe[gene_name]
        if probe in expr_data:
            return np.array(expr_data[probe])
    return None

# Collect expression for retention and egress genes
retention_expr = {}
egress_expr = {}

print("\nRetention genes found:")
for gene in RETENTION_GENES:
    expr = get_gene_expression(gene)
    if expr is not None:
        retention_expr[gene] = expr
        print(f"  {gene}: mean={np.nanmean(expr):.3f}, std={np.nanstd(expr):.3f}")

print("\nEgress genes found:")
for gene in EGRESS_GENES:
    expr = get_gene_expression(gene)
    if expr is not None:
        egress_expr[gene] = expr
        print(f"  {gene}: mean={np.nanmean(expr):.3f}, std={np.nanstd(expr):.3f}")

# Calculate tEgress score
# Method: z-score each gene, then: tEgress = mean(egress z-scores) - mean(retention z-scores)
# Higher tEgress = more egress phenotype

n_samples = len(sample_ids)

# Z-score normalize each gene
retention_z = {}
for gene, expr in retention_expr.items():
    z = (expr - np.nanmean(expr)) / np.nanstd(expr)
    retention_z[gene] = z

egress_z = {}
for gene, expr in egress_expr.items():
    z = (expr - np.nanmean(expr)) / np.nanstd(expr)
    egress_z[gene] = z

# Calculate composite scores
retention_score = np.zeros(n_samples)
n_retention = 0
for gene, z in retention_z.items():
    retention_score += np.nan_to_num(z, 0)
    n_retention += 1

if n_retention > 0:
    retention_score /= n_retention

egress_score = np.zeros(n_samples)
n_egress = 0
for gene, z in egress_z.items():
    egress_score += np.nan_to_num(z, 0)
    n_egress += 1

if n_egress > 0:
    egress_score /= n_egress

# tEgress = egress - retention (higher = more egress phenotype)
tEgress = egress_score - retention_score

print(f"\ntEgress score calculated:")
print(f"  Retention genes used: {n_retention}")
print(f"  Egress genes used: {n_egress}")
print(f"  tEgress range: [{tEgress.min():.3f}, {tEgress.max():.3f}]")
print(f"  tEgress mean: {tEgress.mean():.3f}, std: {tEgress.std():.3f}")

# =============================================================================
# 4. Create Analysis DataFrame
# =============================================================================

clinical = pd.DataFrame({
    'sample_id': sample_ids,
    'COO': coo,
    'OS_status': os_status,
    'OS_time': os_followup,
    'tEgress': tEgress,
    'Retention_score': retention_score,
    'Egress_score': egress_score
})

# Add individual gene z-scores
for gene, z in retention_z.items():
    clinical[f'{gene}_z'] = z
for gene, z in egress_z.items():
    clinical[f'{gene}_z'] = z

# Filter to samples with survival data
surv_data = clinical[clinical['OS_status'].notna() & clinical['OS_time'].notna()].copy()
print(f"\nSamples with survival data: {len(surv_data)}")

# Create quartiles
surv_data['tEgress_quartile'] = pd.qcut(surv_data['tEgress'], q=4, labels=['Q1 (Low)', 'Q2', 'Q3', 'Q4 (High)'])

print("\ntEgress quartile distribution:")
print(surv_data['tEgress_quartile'].value_counts().sort_index())

# =============================================================================
# 5. Survival Analysis Function
# =============================================================================

def run_survival_analysis(data, group_name, ax=None):
    """Run KM survival analysis by tEgress quartiles"""

    print(f"\n{'-'*60}")
    print(f"SURVIVAL ANALYSIS: {group_name}")
    print(f"{'-'*60}")

    if len(data) < 20:
        print(f"  Insufficient samples (n={len(data)})")
        return None

    # Quartile distribution
    print(f"\nSamples: {len(data)}")
    print("Quartile distribution:")
    for q in ['Q1 (Low)', 'Q2', 'Q3', 'Q4 (High)']:
        n = len(data[data['tEgress_quartile'] == q])
        events = data[data['tEgress_quartile'] == q]['OS_status'].sum()
        print(f"  {q}: n={n}, events={int(events)}")

    # Kaplan-Meier by quartile
    kmf = KaplanMeierFitter()

    colors = {'Q1 (Low)': '#2ECC71', 'Q2': '#3498DB', 'Q3': '#F39C12', 'Q4 (High)': '#E74C3C'}

    results = {}

    if ax is not None:
        for quartile in ['Q1 (Low)', 'Q2', 'Q3', 'Q4 (High)']:
            subset = data[data['tEgress_quartile'] == quartile]
            if len(subset) >= 5:
                kmf.fit(subset['OS_time'], subset['OS_status'], label=quartile)
                kmf.plot_survival_function(ax=ax, color=colors[quartile], linewidth=2)

                # Store median survival
                median_surv = kmf.median_survival_time_
                results[quartile] = {
                    'n': len(subset),
                    'events': int(subset['OS_status'].sum()),
                    'median_OS': median_surv if not np.isinf(median_surv) else 'NR'
                }

    # Log-rank test (Q1 vs Q4)
    q1 = data[data['tEgress_quartile'] == 'Q1 (Low)']
    q4 = data[data['tEgress_quartile'] == 'Q4 (High)']

    if len(q1) >= 5 and len(q4) >= 5:
        lr = logrank_test(q1['OS_time'], q4['OS_time'], q1['OS_status'], q4['OS_status'])
        print(f"\nLog-rank test (Q1 vs Q4): p = {lr.p_value:.4f}")
        results['logrank_q1_vs_q4'] = lr.p_value

    # Overall log-rank (all quartiles)
    try:
        multi_lr = multivariate_logrank_test(data['OS_time'], data['tEgress_quartile'], data['OS_status'])
        print(f"Log-rank test (all quartiles): p = {multi_lr.p_value:.4f}")
        results['logrank_overall'] = multi_lr.p_value
    except:
        pass

    # Median OS by quartile
    print("\nMedian OS by quartile:")
    for q, r in results.items():
        if isinstance(r, dict):
            median = r['median_OS']
            if median == 'NR':
                print(f"  {q}: median OS = Not Reached (n={r['n']}, events={r['events']})")
            else:
                print(f"  {q}: median OS = {median:.1f} years (n={r['n']}, events={r['events']})")

    return results

# =============================================================================
# 6. Run Analysis: Overall and by Subtype
# =============================================================================

print("\n" + "=" * 70)
print("SURVIVAL ANALYSIS BY tEGRESS QUARTILES")
print("=" * 70)

# Create figure
fig, axes = plt.subplots(2, 3, figsize=(18, 12))
axes = axes.flatten()

# Overall analysis
all_results = run_survival_analysis(surv_data, "OVERALL", axes[0])
if all_results:
    axes[0].set_title(f'Overall (n={len(surv_data)})\np={all_results.get("logrank_q1_vs_q4", "NA"):.4f}',
                      fontsize=12, fontweight='bold')
    axes[0].set_xlabel('Time (years)')
    axes[0].set_ylabel('Overall Survival')
    axes[0].set_ylim(0, 1.05)
    axes[0].legend(loc='lower left')

# By subtype
subtype_results = {}

for idx, subtype in enumerate(['GCB', 'ABC', 'MHG', 'UNC'], start=1):
    subset = surv_data[surv_data['COO'] == subtype].copy()

    if len(subset) >= 20:
        # Recalculate quartiles within subtype
        subset['tEgress_quartile'] = pd.qcut(subset['tEgress'], q=4, labels=['Q1 (Low)', 'Q2', 'Q3', 'Q4 (High)'])

        subtype_results[subtype] = run_survival_analysis(subset, subtype, axes[idx])

        if subtype_results[subtype]:
            p_val = subtype_results[subtype].get('logrank_q1_vs_q4', float('nan'))
            axes[idx].set_title(f'{subtype} (n={len(subset)})\np={p_val:.4f}' if not np.isnan(p_val) else f'{subtype} (n={len(subset)})',
                               fontsize=12, fontweight='bold')
            axes[idx].set_xlabel('Time (years)')
            axes[idx].set_ylabel('Overall Survival')
            axes[idx].set_ylim(0, 1.05)
            axes[idx].legend(loc='lower left')
    else:
        axes[idx].text(0.5, 0.5, f'{subtype}\nn={len(subset)} (insufficient)',
                      ha='center', va='center', fontsize=12)
        axes[idx].set_title(subtype)

# Hide unused subplot
axes[5].axis('off')

# Add legend explanation
legend_text = "tEgress Score = Egress(CXCR4) - Retention(S1PR2, P2RY8, GNA13, RHOA, SGK1, GNAI2, FOXO1)\nQ1 = Low tEgress (retention phenotype), Q4 = High tEgress (egress phenotype)"
fig.text(0.5, 0.02, legend_text, ha='center', fontsize=10, style='italic')

plt.suptitle('Overall Survival by tEgress Score Quartiles\nLacy/HMRN DLBCL Dataset',
             fontsize=14, fontweight='bold', y=0.98)
plt.tight_layout()
plt.subplots_adjust(bottom=0.08)
plt.savefig(os.path.join(figures_dir, "tegress_survival_quartiles.png"), dpi=150, bbox_inches='tight')
plt.close()
print(f"\nSaved: tegress_survival_quartiles.png")

# =============================================================================
# 7. Additional Analysis: High vs Low (Median Split)
# =============================================================================

print("\n" + "=" * 70)
print("ADDITIONAL: HIGH vs LOW tEGRESS (Median Split)")
print("=" * 70)

surv_data['tEgress_group'] = pd.cut(surv_data['tEgress'], bins=2, labels=['Low', 'High'])

fig, axes = plt.subplots(2, 3, figsize=(18, 12))
axes = axes.flatten()

def run_binary_survival(data, group_name, ax):
    """Run KM for high vs low tEgress"""

    if len(data) < 20:
        return None

    kmf = KaplanMeierFitter()

    for group, color in [('Low', '#2ECC71'), ('High', '#E74C3C')]:
        subset = data[data['tEgress_group'] == group]
        if len(subset) >= 5:
            kmf.fit(subset['OS_time'], subset['OS_status'], label=f'{group} tEgress')
            kmf.plot_survival_function(ax=ax, color=color, linewidth=2.5)

    # Log-rank
    low = data[data['tEgress_group'] == 'Low']
    high = data[data['tEgress_group'] == 'High']

    if len(low) >= 5 and len(high) >= 5:
        lr = logrank_test(low['OS_time'], high['OS_time'], low['OS_status'], high['OS_status'])
        return lr.p_value
    return None

# Overall
p_overall = run_binary_survival(surv_data, "Overall", axes[0])
axes[0].set_title(f'Overall (n={len(surv_data)})\np={p_overall:.4f}' if p_overall else 'Overall',
                  fontsize=12, fontweight='bold')
axes[0].set_xlabel('Time (years)')
axes[0].set_ylabel('Overall Survival')
axes[0].legend(loc='lower left')

# By subtype
for idx, subtype in enumerate(['GCB', 'ABC', 'MHG', 'UNC'], start=1):
    subset = surv_data[surv_data['COO'] == subtype].copy()
    if len(subset) >= 20:
        subset['tEgress_group'] = pd.cut(subset['tEgress'], bins=2, labels=['Low', 'High'])
        p_val = run_binary_survival(subset, subtype, axes[idx])
        axes[idx].set_title(f'{subtype} (n={len(subset)})\np={p_val:.4f}' if p_val else f'{subtype} (n={len(subset)})',
                           fontsize=12, fontweight='bold')
    else:
        axes[idx].text(0.5, 0.5, f'{subtype}\nn={len(subset)}', ha='center', va='center')
    axes[idx].set_xlabel('Time (years)')
    axes[idx].set_ylabel('Overall Survival')
    axes[idx].legend(loc='lower left')

axes[5].axis('off')

plt.suptitle('Overall Survival: High vs Low tEgress Score\nLacy/HMRN DLBCL Dataset',
             fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig(os.path.join(figures_dir, "tegress_survival_binary.png"), dpi=150, bbox_inches='tight')
plt.close()
print(f"Saved: tegress_survival_binary.png")

# =============================================================================
# 8. Summary Statistics
# =============================================================================

print("\n" + "=" * 70)
print("SUMMARY: tEGRESS SCORE AND SURVIVAL")
print("=" * 70)

print(f"""
tEgress Score Definition:
  Egress genes: {EGRESS_GENES}
  Retention genes: {list(retention_expr.keys())}
  Score = mean(z-scored egress) - mean(z-scored retention)
  Higher score = more egress phenotype

Key Results:
""")

# Print summary table
print(f"{'Cohort':<12} {'N':>8} {'Events':>8} {'Q1vsQ4 p':>12} {'Interpretation':<30}")
print("-" * 70)

cohorts = [('Overall', surv_data)]
for subtype in ['GCB', 'ABC', 'MHG', 'UNC']:
    cohorts.append((subtype, surv_data[surv_data['COO'] == subtype]))

for name, data in cohorts:
    n = len(data)
    events = int(data['OS_status'].sum())

    if name == 'Overall':
        p = all_results.get('logrank_q1_vs_q4', np.nan) if all_results else np.nan
    else:
        p = subtype_results.get(name, {}).get('logrank_q1_vs_q4', np.nan) if name in subtype_results else np.nan

    if not np.isnan(p):
        if p < 0.001:
            interp = "*** Highly significant"
        elif p < 0.01:
            interp = "** Very significant"
        elif p < 0.05:
            interp = "* Significant"
        elif p < 0.1:
            interp = "Trend"
        else:
            interp = "Not significant"
        print(f"{name:<12} {n:>8} {events:>8} {p:>12.4f} {interp:<30}")
    else:
        print(f"{name:<12} {n:>8} {events:>8} {'NA':>12} {'Insufficient data':<30}")

# Save tEgress scores
surv_data.to_csv(os.path.join(results_dir, "tegress_scores.csv"), index=False)
print(f"\nSaved: tegress_scores.csv")

print("\n" + "=" * 70)
print("ANALYSIS COMPLETE")
print("=" * 70)
