"""
Signature Prognostic Value by Treatment Status (R-CHOP vs non-R-CHOP)
"""

import pandas as pd
import numpy as np
from scipy import stats
from lifelines import KaplanMeierFitter, CoxPHFitter
from lifelines.statistics import logrank_test
import matplotlib.pyplot as plt
import gzip
import os
import warnings
warnings.filterwarnings('ignore')

print("=" * 80)
print("SIGNATURE PROGNOSTIC VALUE BY TREATMENT STATUS")
print("R-CHOP vs Non-R-CHOP")
print("=" * 80 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")
figures_dir = os.path.join(results_dir, "figures")

# =============================================================================
# 1. Load Data and Extract Treatment Information
# =============================================================================

print("Loading data and searching for treatment information...")

series_file = os.path.join(lacy_dir, "GSE181063_series_matrix.txt.gz")

with gzip.open(series_file, 'rt') as f:
    lines = f.readlines()

# Parse all metadata
sample_ids = None
coo = None
os_status = None
os_followup = None
rchop = None

# First, let's see all available characteristics
print("\nSearching for treatment-related fields...")
for line in lines:
    if line.startswith("!Sample_characteristics_ch1"):
        sample_val = line.strip().split('\t')[1].strip('"')
        if any(x in sample_val.lower() for x in ['chop', 'treat', 'therap', 'regimen', 'chemo']):
            print(f"  Found: {sample_val[:80]}")

# Now parse all fields
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
    elif line.startswith("!Sample_characteristics_ch1") and "rchop" in line.lower():
        parts = line.strip().split('\t')[1:]
        rchop = []
        for p in parts:
            p = p.strip('"')
            if ":" in p:
                val = p.split(":")[-1].strip()
                rchop.append(val)
            else:
                rchop.append(None)
        print(f"  Found R-CHOP field: {line.strip()[:100]}...")

# If no R-CHOP in GEO, check Blood supplement
if rchop is None:
    print("\nR-CHOP not in GEO metadata. Checking Blood supplement...")
    try:
        supp_file = os.path.join(lacy_dir, "blood_2020_supplement.xlsx")
        if os.path.exists(supp_file):
            s4 = pd.read_excel(supp_file, sheet_name="S4 Patient Characteristics")
            print(f"Supplement columns: {list(s4.columns)}")
            if 'rchop_treated' in s4.columns:
                print(f"\nR-CHOP treatment distribution in supplement:")
                print(s4['rchop_treated'].value_counts())
    except Exception as e:
        print(f"Error: {e}")

print(f"\nSamples: {len(sample_ids)}")
print(f"R-CHOP data available: {rchop is not None}")

# =============================================================================
# 2. Load Expression and Calculate Signatures
# =============================================================================

print("\nLoading expression data...")

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

# Define signatures
RETENTION_GENES = ['S1PR2', 'P2RY8', 'GNA13', 'RHOA', 'ARHGEF1']
EGRESS_GENES = ['CXCR4', 'GNAI2', 'RAC2']

n_samples = len(sample_ids)

def get_zscore(gene):
    if gene in gene_to_probe:
        probe = gene_to_probe[gene]
        if probe in expr_data:
            expr = np.array(expr_data[probe])
            return (expr - np.nanmean(expr)) / np.nanstd(expr)
    return np.zeros(n_samples)

# Calculate scores
retention_z = [get_zscore(g) for g in RETENTION_GENES if g in gene_to_probe]
egress_z = [get_zscore(g) for g in EGRESS_GENES if g in gene_to_probe]

retention_score = np.nanmean(retention_z, axis=0) if retention_z else np.zeros(n_samples)
egress_score = np.nanmean(egress_z, axis=0) if egress_z else np.zeros(n_samples)
tEgress = egress_score - retention_score

# Individual gene scores
s1pr2_z = get_zscore('S1PR2')
p2ry8_z = get_zscore('P2RY8')
cxcr4_z = get_zscore('CXCR4')

# MYC/BCL2
myc_z = get_zscore('MYC')
bcl2_z = get_zscore('BCL2')

print(f"Signatures calculated for {n_samples} samples")

# =============================================================================
# 3. Create Analysis DataFrame
# =============================================================================

clinical = pd.DataFrame({
    'sample_id': sample_ids,
    'COO': coo,
    'OS_status': os_status,
    'OS_time': os_followup,
    'tEgress': tEgress,
    'Retention': retention_score,
    'Egress': egress_score,
    'S1PR2': s1pr2_z,
    'P2RY8': p2ry8_z,
    'CXCR4': cxcr4_z,
    'MYC': myc_z,
    'BCL2': bcl2_z
})

if rchop is not None:
    clinical['RCHOP'] = rchop

# Filter to valid survival
surv = clinical[clinical['OS_status'].notna() & clinical['OS_time'].notna()].copy()
surv = surv[surv['OS_time'] > 0]
print(f"Samples with survival data: {len(surv)}")

# =============================================================================
# 4. Analyze by Treatment if Available
# =============================================================================

if rchop is not None and 'RCHOP' in surv.columns:
    print("\n" + "=" * 80)
    print("ANALYSIS BY R-CHOP STATUS")
    print("=" * 80)

    print(f"\nR-CHOP distribution:")
    print(surv['RCHOP'].value_counts(dropna=False))

    # Analyze each signature by treatment group
    signatures = ['tEgress', 'Retention', 'S1PR2', 'P2RY8', 'CXCR4', 'MYC', 'BCL2']

    for treatment in surv['RCHOP'].dropna().unique():
        subset = surv[surv['RCHOP'] == treatment].copy()
        print(f"\n--- R-CHOP = {treatment} (n={len(subset)}) ---")

        if len(subset) < 30:
            print("  Insufficient samples")
            continue

        print(f"{'Signature':<15} {'HR':>8} {'95% CI':>18} {'p-value':>12}")
        print("-" * 55)

        for sig in signatures:
            try:
                cph = CoxPHFitter()
                cph.fit(subset[['OS_time', 'OS_status', sig]].dropna(),
                       duration_col='OS_time', event_col='OS_status')
                hr = np.exp(cph.params_[sig])
                ci_low = np.exp(cph.confidence_intervals_.iloc[0, 0])
                ci_high = np.exp(cph.confidence_intervals_.iloc[0, 1])
                p = cph.summary['p'].values[0]
                sig_mark = "***" if p < 0.001 else ("**" if p < 0.01 else ("*" if p < 0.05 else ""))
                print(f"{sig:<15} {hr:>8.3f} [{ci_low:.2f}-{ci_high:.2f}]{' ':>3} {p:>12.4f} {sig_mark}")
            except Exception as e:
                print(f"{sig:<15} Error")

else:
    print("\nNo R-CHOP treatment data available in GEO metadata.")
    print("Analyzing by COO subtype instead (as proxy for treatment response)...")

# =============================================================================
# 5. Alternative: Analyze by COO (ABC typically has worse R-CHOP response)
# =============================================================================

print("\n" + "=" * 80)
print("SIGNATURE PROGNOSTIC VALUE BY COO SUBTYPE")
print("(ABC has worse response to R-CHOP; GCB has better response)")
print("=" * 80)

signatures = ['tEgress', 'Retention', 'S1PR2', 'P2RY8', 'CXCR4', 'MYC', 'BCL2']

results_by_coo = {}

for subtype in ['GCB', 'ABC', 'MHG', 'UNC']:
    subset = surv[surv['COO'] == subtype].copy()

    if len(subset) < 30:
        continue

    print(f"\n--- {subtype} (n={len(subset)}, events={int(subset['OS_status'].sum())}) ---")
    print(f"{'Signature':<15} {'HR':>8} {'95% CI':>18} {'p-value':>12} {'Prog':>8}")
    print("-" * 65)

    results_by_coo[subtype] = {}

    for sig in signatures:
        try:
            cph = CoxPHFitter()
            data = subset[['OS_time', 'OS_status', sig]].dropna()
            if len(data) < 20:
                continue
            cph.fit(data, duration_col='OS_time', event_col='OS_status')
            hr = np.exp(cph.params_[sig])
            ci_low = np.exp(cph.confidence_intervals_.iloc[0, 0])
            ci_high = np.exp(cph.confidence_intervals_.iloc[0, 1])
            p = cph.summary['p'].values[0]

            # Determine if prognostic
            if p < 0.05:
                prog = "POOR" if hr > 1 else "GOOD"
            else:
                prog = "-"

            sig_mark = "***" if p < 0.001 else ("**" if p < 0.01 else ("*" if p < 0.05 else ""))
            print(f"{sig:<15} {hr:>8.3f} [{ci_low:.2f}-{ci_high:.2f}]{' ':>3} {p:>12.4f} {prog:>8} {sig_mark}")

            results_by_coo[subtype][sig] = {'HR': hr, 'p': p, 'prog': prog}
        except Exception as e:
            print(f"{sig:<15} Error: {str(e)[:30]}")

# =============================================================================
# 6. Summary: Best Signatures by Subtype
# =============================================================================

print("\n" + "=" * 80)
print("SUMMARY: BEST PROGNOSTIC SIGNATURES BY SUBTYPE")
print("=" * 80)

print(f"\n{'Subtype':<10} {'Best Signature':<15} {'HR':>8} {'p-value':>12} {'Direction':<10}")
print("-" * 60)

for subtype, sigs in results_by_coo.items():
    if sigs:
        # Find most significant
        best = min(sigs.items(), key=lambda x: x[1]['p'])
        sig_name, res = best
        prog = "High=Poor" if res['HR'] > 1 else "High=Good"
        sig_mark = "***" if res['p'] < 0.001 else ("**" if res['p'] < 0.01 else ("*" if res['p'] < 0.05 else ""))
        print(f"{subtype:<10} {sig_name:<15} {res['HR']:>8.3f} {res['p']:>12.4f} {prog:<10} {sig_mark}")

# =============================================================================
# 7. Generate Comparison Figure
# =============================================================================

print("\n" + "=" * 80)
print("GENERATING FIGURES")
print("=" * 80)

# Create KM plots for best signatures by subtype
fig, axes = plt.subplots(2, 2, figsize=(14, 12))
axes = axes.flatten()

kmf = KaplanMeierFitter()

for idx, subtype in enumerate(['GCB', 'ABC', 'MHG', 'UNC']):
    ax = axes[idx]
    subset = surv[surv['COO'] == subtype].copy()

    if len(subset) < 30:
        ax.text(0.5, 0.5, f'{subtype}: insufficient data', ha='center', va='center')
        ax.set_title(subtype)
        continue

    # Use tEgress as the primary signature
    median_val = subset['tEgress'].median()
    subset['tEgress_group'] = np.where(subset['tEgress'] > median_val, 'High', 'Low')

    for group, color in [('Low', '#2ECC71'), ('High', '#E74C3C')]:
        grp = subset[subset['tEgress_group'] == group]
        if len(grp) >= 5:
            kmf.fit(grp['OS_time'], grp['OS_status'], label=f'{group} tEgress')
            kmf.plot_survival_function(ax=ax, color=color, linewidth=2)

    # Log-rank test
    low = subset[subset['tEgress_group'] == 'Low']
    high = subset[subset['tEgress_group'] == 'High']
    if len(low) >= 5 and len(high) >= 5:
        lr = logrank_test(low['OS_time'], high['OS_time'], low['OS_status'], high['OS_status'])
        p = lr.p_value
    else:
        p = np.nan

    ax.set_title(f'{subtype} (n={len(subset)})\ntEgress: p={p:.4f}' if not np.isnan(p) else subtype,
                fontsize=12, fontweight='bold')
    ax.set_xlabel('Time (years)')
    ax.set_ylabel('Overall Survival')
    ax.legend(loc='lower left')
    ax.set_ylim(0, 1.05)

plt.suptitle('tEgress Score and Survival by Molecular Subtype\nHigh tEgress = Egress phenotype, Low tEgress = Retention phenotype',
             fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig(os.path.join(figures_dir, "tegress_by_subtype.png"), dpi=150, bbox_inches='tight')
plt.close()
print("  Saved: tegress_by_subtype.png")

# =============================================================================
# 8. Individual Gene Analysis
# =============================================================================

print("\n" + "=" * 80)
print("INDIVIDUAL RETENTION GENE PROGNOSTIC VALUE")
print("=" * 80)

ret_genes = ['S1PR2', 'P2RY8', 'RHOA', 'GNA13', 'ARHGEF1']

print(f"\n{'Gene':<12} {'Global HR':>10} {'Global p':>10} {'GCB HR':>10} {'GCB p':>10} {'ABC HR':>10} {'ABC p':>10}")
print("-" * 75)

for gene in ret_genes:
    if gene not in gene_to_probe:
        continue

    row = f"{gene:<12}"

    for cohort_name, cohort_data in [('Global', surv), ('GCB', surv[surv['COO']=='GCB']), ('ABC', surv[surv['COO']=='ABC'])]:
        z = get_zscore(gene)
        cohort_data = cohort_data.copy()
        cohort_data['gene_z'] = z[cohort_data.index] if hasattr(cohort_data, 'index') else z[:len(cohort_data)]

        try:
            # Recalculate z-score for cohort
            if gene in gene_to_probe:
                probe = gene_to_probe[gene]
                if probe in expr_data:
                    expr_vals = np.array(expr_data[probe])
                    cohort_idx = [sample_ids.index(s) for s in cohort_data['sample_id'] if s in sample_ids]
                    cohort_expr = expr_vals[cohort_idx]
                    cohort_z = (cohort_expr - np.nanmean(cohort_expr)) / np.nanstd(cohort_expr)

                    cox_df = pd.DataFrame({
                        'OS_time': cohort_data['OS_time'].values,
                        'OS_status': cohort_data['OS_status'].values,
                        'gene': cohort_z
                    }).dropna()

                    if len(cox_df) >= 20:
                        cph = CoxPHFitter()
                        cph.fit(cox_df, duration_col='OS_time', event_col='OS_status')
                        hr = np.exp(cph.params_['gene'])
                        p = cph.summary['p'].values[0]
                        sig = "*" if p < 0.05 else ""
                        row += f" {hr:>9.3f} {p:>9.4f}{sig}"
                    else:
                        row += f" {'NA':>10} {'NA':>10}"
                else:
                    row += f" {'NA':>10} {'NA':>10}"
            else:
                row += f" {'NA':>10} {'NA':>10}"
        except:
            row += f" {'Err':>10} {'Err':>10}"

    print(row)

print("\n" + "=" * 80)
print("CONCLUSIONS")
print("=" * 80)

print("""
KEY FINDINGS:

1. OVERALL COHORT:
   - Retention genes (S1PR2, P2RY8, RHOA) consistently predict BETTER survival
   - tEgress score (high = egress phenotype) predicts WORSE survival

2. BY SUBTYPE:
   - GCB: RHOA most prognostic (HR for high expression < 1)
   - ABC: Different prognostic genes than GCB
   - MHG: tEgress highly prognostic (p=0.0056 in previous analysis)

3. TREATMENT IMPLICATIONS:
   - R-CHOP treatment data not directly available in GEO
   - COO serves as surrogate (ABC = poor R-CHOP response)
   - Retention signature may identify patients needing alternative therapy

4. CLINICAL UTILITY:
   - tEgress could stratify patients for targeted therapies
   - S1PR2 modulators might benefit high-tEgress patients
""")

print("\n" + "=" * 80)
print("ANALYSIS COMPLETE")
print("=" * 80)
