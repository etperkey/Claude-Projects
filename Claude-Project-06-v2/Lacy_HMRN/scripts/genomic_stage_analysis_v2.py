"""
Genomic (Mutation) Analysis by Stage - Lacy/HMRN Dataset
Uses stage data from GEO series matrix with PID mapping
"""

import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import gzip
import os

print("=" * 70)
print("GENOMIC ANALYSIS: Mutations by Stage (Lacy/HMRN)")
print("=" * 70 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")
figures_dir = os.path.join(results_dir, "figures")

# =============================================================================
# 1. Extract Stage and PID from Series Matrix
# =============================================================================

print("Extracting stage data from GEO series matrix...")

series_file = os.path.join(lacy_dir, "GSE181063_series_matrix.txt.gz")

sample_ids = None
stages = None
pids = None
coo = None

with gzip.open(series_file, 'rt') as f:
    for line in f:
        if line.startswith("!Sample_geo_accession"):
            parts = line.strip().split('\t')[1:]
            sample_ids = [p.strip('"') for p in parts]
        elif line.startswith("!Sample_characteristics_ch1") and "Stage:" in line:
            parts = line.strip().split('\t')[1:]
            stages = []
            for p in parts:
                p = p.strip('"')
                if "Stage:" in p:
                    stage = p.split(":")[-1].strip()
                    stages.append(stage)
                else:
                    stages.append(None)
        elif line.startswith("!Sample_characteristics_ch1") and "pid_pmid_32187361:" in line:
            parts = line.strip().split('\t')[1:]
            pids = []
            for p in parts:
                p = p.strip('"')
                if "pid_pmid_32187361:" in p:
                    pid = p.split(":")[-1].strip()
                    pids.append(pid if pid else None)
                else:
                    pids.append(None)
        elif line.startswith("!Sample_characteristics_ch1") and "coo_class:" in line:
            parts = line.strip().split('\t')[1:]
            coo = []
            for p in parts:
                p = p.strip('"')
                if "coo_class:" in p:
                    c = p.split(":")[-1].strip()
                    coo.append(c)
                else:
                    coo.append(None)
        elif line.startswith("!series_matrix_table_begin"):
            break

print(f"Samples: {len(sample_ids) if sample_ids else 0}")
print(f"Stages extracted: {len([s for s in stages if s]) if stages else 0}")
print(f"PIDs extracted: {len([p for p in pids if p]) if pids else 0}")

# Create DataFrame
if sample_ids and stages and pids:
    clinical_df = pd.DataFrame({
        'sample_id': sample_ids,
        'Stage': stages,
        'PID': pids,
        'COO': coo if coo else [None] * len(sample_ids)
    })

    # Classify stage
    def classify_stage(stage):
        if pd.isna(stage) or stage in ['', 'NA', 'not done', 'raised', 'normal']:
            return None
        stage = str(stage).upper()
        if stage in ['I', 'II', 'IE', 'IIE', '1', '2']:
            return 'Limited'
        elif stage in ['III', 'IV', 'IIIE', 'IVE', '3', '4']:
            return 'Advanced'
        return None

    clinical_df['stage_group'] = clinical_df['Stage'].apply(classify_stage)

    print(f"\nStage distribution (all patients):")
    print(clinical_df['stage_group'].value_counts(dropna=False))

    # Filter to valid stage
    staged = clinical_df[clinical_df['stage_group'].notna()].copy()
    print(f"\nPatients with valid stage: {len(staged)}")

    # Check PID availability
    staged_with_pid = staged[staged['PID'].notna()]
    print(f"Patients with both stage and PID: {len(staged_with_pid)}")

# =============================================================================
# 2. Load Mutation Data and Merge
# =============================================================================

print("\n" + "-" * 50)
print("Loading mutation data...")

mutations = pd.read_csv(os.path.join(lacy_dir, "genomic_data.csv"))
print(f"Mutation data: {len(mutations)} patients")

# Merge with staged data
merged = staged_with_pid.merge(mutations, on='PID', how='inner')
print(f"Patients with stage AND mutation data: {len(merged)}")

if len(merged) < 20:
    print("\nWARNING: Limited overlap between expression (stage) and mutation data")
    print("The stage data comes from GEO expression samples")
    print("The mutation data is from targeted sequencing")
    print("These may be overlapping but not identical patient sets")

# =============================================================================
# 3. Mutation Analysis by Stage
# =============================================================================

print("\n" + "=" * 70)
print("MUTATION ANALYSIS BY STAGE")
print("=" * 70 + "\n")

if len(merged) >= 20:
    # Get mutation columns
    exclude_cols = ['sample_id', 'Stage', 'PID', 'COO', 'stage_group']
    mut_cols = [c for c in merged.columns if c not in exclude_cols
                and merged[c].dtype in ['int64', 'float64']
                and set(merged[c].dropna().unique()).issubset({0, 1, 0.0, 1.0})]

    print(f"Analyzing {len(mut_cols)} mutations...")

    limited = merged[merged['stage_group'] == 'Limited']
    advanced = merged[merged['stage_group'] == 'Advanced']

    print(f"Limited stage: n={len(limited)}")
    print(f"Advanced stage: n={len(advanced)}")

    # Fisher's exact test for each mutation
    results = []

    for gene in mut_cols:
        lim_mut = int(limited[gene].sum())
        lim_wt = len(limited) - lim_mut
        adv_mut = int(advanced[gene].sum())
        adv_wt = len(advanced) - adv_mut

        total_mut = lim_mut + adv_mut
        if total_mut >= 3:  # At least 3 mutations total
            table = [[lim_mut, lim_wt], [adv_mut, adv_wt]]
            odds_ratio, p_value = stats.fisher_exact(table)

            lim_pct = 100 * lim_mut / len(limited) if len(limited) > 0 else 0
            adv_pct = 100 * adv_mut / len(advanced) if len(advanced) > 0 else 0

            direction = 'Advanced' if adv_pct > lim_pct else 'Limited'

            results.append({
                'Gene': gene,
                'Limited_N': lim_mut,
                'Limited_Pct': round(lim_pct, 1),
                'Advanced_N': adv_mut,
                'Advanced_Pct': round(adv_pct, 1),
                'Total_Mut': total_mut,
                'OR': round(odds_ratio, 3) if odds_ratio < 1000 else 999,
                'P_value': p_value,
                'Direction': direction
            })

    if len(results) > 0:
        results_df = pd.DataFrame(results)
        results_df = results_df.sort_values('P_value')
        results_df['FDR'] = stats.false_discovery_control(results_df['P_value'])

        # Print results
        print("\n" + "-" * 70)
        print("TOP MUTATIONS BY STAGE ASSOCIATION")
        print("-" * 70)
        print(f"{'Gene':<12} {'Lim%':>8} {'Adv%':>8} {'OR':>8} {'P-value':>12} {'FDR':>10} {'Dir':<8}")
        print("-" * 70)

        for i, row in results_df.head(30).iterrows():
            sig = "***" if row['FDR'] < 0.1 else ("**" if row['P_value'] < 0.01 else ("*" if row['P_value'] < 0.05 else ""))
            print(f"{row['Gene']:<12} {row['Limited_Pct']:>7.1f}% {row['Advanced_Pct']:>7.1f}% "
                  f"{row['OR']:>8.2f} {row['P_value']:>12.4f} {row['FDR']:>10.4f} {row['Direction']:<8} {sig}")

        # Summary
        sig_mut = results_df[results_df['FDR'] < 0.1]
        nom_sig = results_df[results_df['P_value'] < 0.05]

        print(f"\n\nSignificant mutations (FDR < 0.1): {len(sig_mut)}")
        print(f"Nominally significant (p < 0.05): {len(nom_sig)}")

        # Save results
        results_df.to_csv(os.path.join(results_dir, "mutations_by_stage.csv"), index=False)
        print(f"\nSaved: mutations_by_stage.csv")

        # =============================================================================
        # 4. Pathway Genes
        # =============================================================================

        print("\n" + "-" * 70)
        print("EGRESS/RETENTION PATHWAY MUTATIONS BY STAGE")
        print("-" * 70)

        pathway_genes = ['GNA13', 'RHOA', 'P2RY8', 'CXCR4', 'SGK1', 'SGK1_S', 'S1PR2', 'GNAI2']
        pathway_results = results_df[results_df['Gene'].isin(pathway_genes)]

        if len(pathway_results) > 0:
            print(f"{'Gene':<12} {'Lim%':>8} {'Adv%':>8} {'OR':>8} {'P-value':>12} {'Dir':<10}")
            print("-" * 60)
            for i, row in pathway_results.iterrows():
                sig = "**" if row['P_value'] < 0.01 else ("*" if row['P_value'] < 0.05 else "")
                print(f"{row['Gene']:<12} {row['Limited_Pct']:>7.1f}% {row['Advanced_Pct']:>7.1f}% "
                      f"{row['OR']:>8.2f} {row['P_value']:>12.4f} {row['Direction']:<10} {sig}")
        else:
            print("No egress pathway genes with sufficient mutations")

        # =============================================================================
        # 5. Generate Figures
        # =============================================================================

        print("\n" + "-" * 70)
        print("GENERATING FIGURES")
        print("-" * 70)

        # Forest plot
        fig, ax = plt.subplots(figsize=(12, 10))

        top_mut = results_df.head(25).copy()
        top_mut = top_mut.iloc[::-1]

        y_pos = np.arange(len(top_mut))
        log_or = np.log2(top_mut['OR'].replace(0, 0.01).clip(upper=100))

        colors = ['#E74C3C' if d == 'Advanced' else '#3498DB' for d in top_mut['Direction']]
        bars = ax.barh(y_pos, log_or, color=colors, edgecolor='black', alpha=0.7)

        for i, (idx, row) in enumerate(top_mut.iterrows()):
            if row['FDR'] < 0.1:
                bars[i].set_edgecolor('gold')
                bars[i].set_linewidth(3)
            elif row['P_value'] < 0.05:
                bars[i].set_edgecolor('orange')
                bars[i].set_linewidth(2)

        ax.axvline(0, color='black', linewidth=1)
        ax.set_yticks(y_pos)
        ax.set_yticklabels(top_mut['Gene'], fontsize=10)
        ax.set_xlabel('Log2(Odds Ratio) - Advanced vs Limited', fontsize=12)
        ax.set_title(f'Mutations Associated with Stage (Lacy/HMRN)\n'
                    f'n={len(merged)} patients with stage + mutation data',
                    fontsize=14, fontweight='bold')

        for i, (idx, row) in enumerate(top_mut.iterrows()):
            sig = "***" if row['FDR'] < 0.1 else ("**" if row['P_value'] < 0.01 else ("*" if row['P_value'] < 0.05 else ""))
            x_pos = log_or.iloc[i] + 0.1 if log_or.iloc[i] > 0 else log_or.iloc[i] - 0.1
            ha = 'left' if log_or.iloc[i] > 0 else 'right'
            ax.text(x_pos, i, f"p={row['P_value']:.3f} {sig}", va='center', ha=ha, fontsize=8)

        legend_elements = [
            mpatches.Patch(color='#E74C3C', label='Higher in Advanced'),
            mpatches.Patch(color='#3498DB', label='Higher in Limited'),
            mpatches.Patch(facecolor='white', edgecolor='gold', linewidth=3, label='FDR < 0.1'),
            mpatches.Patch(facecolor='white', edgecolor='orange', linewidth=2, label='p < 0.05'),
        ]
        ax.legend(handles=legend_elements, loc='lower right', fontsize=9)

        plt.tight_layout()
        plt.savefig(os.path.join(figures_dir, "mutations_by_stage_forest.png"), dpi=150, bbox_inches='tight')
        plt.close()
        print("  Saved: mutations_by_stage_forest.png")

        # =============================================================================
        # 6. Summary
        # =============================================================================

        print("\n" + "=" * 70)
        print("GENOMIC STAGE ANALYSIS SUMMARY")
        print("=" * 70)

        print(f"\nDataset: Lacy/HMRN")
        print(f"Patients with stage + mutation data: {len(merged)}")
        print(f"  Limited (I-II): {len(limited)}")
        print(f"  Advanced (III-IV): {len(advanced)}")
        print(f"\nMutations analyzed: {len(results_df)}")
        print(f"Significant (FDR < 0.1): {len(sig_mut)}")
        print(f"Nominally significant (p < 0.05): {len(nom_sig)}")

        if len(nom_sig) > 0:
            print("\n--- TOP STAGE-ASSOCIATED MUTATIONS ---")
            print("\nHigher in ADVANCED stage:")
            adv_high = nom_sig[nom_sig['Direction'] == 'Advanced'].head(5)
            for i, row in adv_high.iterrows():
                print(f"  {row['Gene']}: {row['Advanced_Pct']:.1f}% vs {row['Limited_Pct']:.1f}% (p={row['P_value']:.4f})")

            print("\nHigher in LIMITED stage:")
            lim_high = nom_sig[nom_sig['Direction'] == 'Limited'].head(5)
            for i, row in lim_high.iterrows():
                print(f"  {row['Gene']}: {row['Limited_Pct']:.1f}% vs {row['Advanced_Pct']:.1f}% (p={row['P_value']:.4f})")
    else:
        print("No mutations passed filtering criteria")
else:
    print("\nInsufficient overlap for mutation analysis")
    print("Creating placeholder results...")

    # Create a note about the data structure
    note = """
    NOTE: Limited overlap between stage and mutation data

    The Lacy/HMRN dataset has:
    - Expression data (GSE181063): 1311 patients with stage annotation
    - Mutation data (genomic_data.csv): 928 patients with targeted sequencing

    These are partially overlapping cohorts. For GCB-specific analysis,
    the overlap was very small (near 0 patients).

    For a complete genomic analysis by stage, consider:
    1. Reddy/Duke dataset - has mutations + staging
    2. Chapuy/DFCI dataset - has mutations + staging
    """
    print(note)

print("\n" + "=" * 70)
print("ANALYSIS COMPLETE")
print("=" * 70)
