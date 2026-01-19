"""
Genomic (Mutation) Analysis by Stage - Lacy/HMRN Dataset
Analyzes mutation frequencies in Limited vs Advanced stage DLBCL
"""

import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import os

print("=" * 70)
print("GENOMIC ANALYSIS: Mutations by Stage (Lacy/HMRN)")
print("=" * 70 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")
figures_dir = os.path.join(results_dir, "figures")

# =============================================================================
# 1. Load Data
# =============================================================================

print("Loading data...")

# Load mutation data
mutations = pd.read_csv(os.path.join(lacy_dir, "genomic_data.csv"))
print(f"Mutation data: {len(mutations)} patients, {len(mutations.columns)-1} genes")

# Load clinical data from supplement
try:
    clinical = pd.read_excel(os.path.join(lacy_dir, "blood_2020_supplement.xlsx"),
                            sheet_name="S4 Patient Characteristics")
    print(f"Clinical data: {len(clinical)} patients")
except Exception as e:
    print(f"Error loading clinical data: {e}")
    clinical = None

if clinical is not None:
    # Check available columns
    print(f"\nClinical columns: {list(clinical.columns)[:15]}...")

    # Find stage column
    stage_cols = [c for c in clinical.columns if 'stage' in c.lower() or 'ann_arbor' in c.lower()]
    print(f"Stage-related columns: {stage_cols}")

# =============================================================================
# 2. Extract Stage Information
# =============================================================================

print("\n" + "-" * 50)
print("Extracting stage information...")

if clinical is not None:
    # Merge clinical with mutation data
    merged = mutations.merge(clinical, on='PID', how='inner')
    print(f"Patients with both mutation and clinical data: {len(merged)}")

    # Check for stage column
    stage_col = None
    for col in merged.columns:
        if 'stage' in col.lower() and 'group' not in col.lower():
            stage_col = col
            break

    if stage_col:
        print(f"\nUsing stage column: {stage_col}")
        print(f"Stage distribution:")
        print(merged[stage_col].value_counts())

        # Create stage group (Limited vs Advanced)
        def classify_stage(stage):
            if pd.isna(stage):
                return None
            stage_str = str(stage).upper()
            if stage_str in ['I', 'II', '1', '2', 'IE', 'IIE']:
                return 'Limited'
            elif stage_str in ['III', 'IV', '3', '4', 'IIIE', 'IVE']:
                return 'Advanced'
            else:
                return None

        merged['stage_group'] = merged[stage_col].apply(classify_stage)

        print(f"\nStage group distribution:")
        print(merged['stage_group'].value_counts(dropna=False))

        # Filter to Limited vs Advanced
        staged = merged[merged['stage_group'].isin(['Limited', 'Advanced'])].copy()
        print(f"\nPatients with Limited/Advanced classification: {len(staged)}")

# =============================================================================
# 3. Mutation Analysis by Stage
# =============================================================================

print("\n" + "=" * 70)
print("MUTATION ANALYSIS BY STAGE")
print("=" * 70 + "\n")

if len(staged) > 50:
    # Get mutation columns (binary 0/1)
    exclude_cols = ['PID', 'stage_group', stage_col] + list(clinical.columns)
    mut_cols = [c for c in staged.columns if c not in exclude_cols
                and staged[c].dtype in ['int64', 'float64']
                and set(staged[c].dropna().unique()).issubset({0, 1, 0.0, 1.0})]

    print(f"Analyzing {len(mut_cols)} mutations...")

    limited = staged[staged['stage_group'] == 'Limited']
    advanced = staged[staged['stage_group'] == 'Advanced']

    print(f"Limited stage: n={len(limited)}")
    print(f"Advanced stage: n={len(advanced)}")

    # Fisher's exact test for each mutation
    results = []

    for gene in mut_cols:
        lim_mut = limited[gene].sum()
        lim_wt = len(limited) - lim_mut
        adv_mut = advanced[gene].sum()
        adv_wt = len(advanced) - adv_mut

        # Only test if there are some mutations
        total_mut = lim_mut + adv_mut
        if total_mut >= 5:  # At least 5 mutations total
            # Fisher's exact test
            table = [[lim_mut, lim_wt], [adv_mut, adv_wt]]
            odds_ratio, p_value = stats.fisher_exact(table)

            lim_pct = 100 * lim_mut / len(limited)
            adv_pct = 100 * adv_mut / len(advanced)

            direction = 'Advanced' if adv_pct > lim_pct else 'Limited'

            results.append({
                'Gene': gene,
                'Limited_N': int(lim_mut),
                'Limited_Pct': round(lim_pct, 1),
                'Advanced_N': int(adv_mut),
                'Advanced_Pct': round(adv_pct, 1),
                'Total_Mut': int(total_mut),
                'OR': round(odds_ratio, 3),
                'P_value': p_value,
                'Direction': direction
            })

    # Convert to DataFrame and sort
    results_df = pd.DataFrame(results)
    results_df = results_df.sort_values('P_value')

    # Add FDR correction
    results_df['FDR'] = stats.false_discovery_control(results_df['P_value'])

    print("\n" + "-" * 70)
    print("TOP MUTATIONS BY STAGE ASSOCIATION")
    print("-" * 70)
    print(f"{'Gene':<12} {'Lim%':>8} {'Adv%':>8} {'OR':>8} {'P-value':>12} {'FDR':>10} {'Direction':<10}")
    print("-" * 70)

    for i, row in results_df.head(30).iterrows():
        sig = "***" if row['FDR'] < 0.1 else ("**" if row['P_value'] < 0.01 else ("*" if row['P_value'] < 0.05 else ""))
        print(f"{row['Gene']:<12} {row['Limited_Pct']:>7.1f}% {row['Advanced_Pct']:>7.1f}% "
              f"{row['OR']:>8.2f} {row['P_value']:>12.4f} {row['FDR']:>10.4f} {row['Direction']:<10} {sig}")

    # Significant mutations
    sig_mut = results_df[results_df['FDR'] < 0.1]
    print(f"\n\nSignificant mutations (FDR < 0.1): {len(sig_mut)}")

    nom_sig = results_df[results_df['P_value'] < 0.05]
    print(f"Nominally significant (p < 0.05): {len(nom_sig)}")

    # Save results
    results_df.to_csv(os.path.join(results_dir, "mutations_by_stage.csv"), index=False)
    print(f"\nSaved: mutations_by_stage.csv")

    # =============================================================================
    # 4. Check Egress Pathway Genes
    # =============================================================================

    print("\n" + "-" * 70)
    print("EGRESS/RETENTION PATHWAY MUTATIONS BY STAGE")
    print("-" * 70)

    pathway_genes = ['GNA13', 'RHOA', 'P2RY8', 'CXCR4', 'SGK1', 'SGK1_S', 'S1PR2']
    pathway_results = results_df[results_df['Gene'].isin(pathway_genes)]

    if len(pathway_results) > 0:
        print(f"{'Gene':<12} {'Lim%':>8} {'Adv%':>8} {'OR':>8} {'P-value':>12} {'Direction':<10}")
        print("-" * 60)
        for i, row in pathway_results.iterrows():
            sig = "**" if row['P_value'] < 0.01 else ("*" if row['P_value'] < 0.05 else "")
            print(f"{row['Gene']:<12} {row['Limited_Pct']:>7.1f}% {row['Advanced_Pct']:>7.1f}% "
                  f"{row['OR']:>8.2f} {row['P_value']:>12.4f} {row['Direction']:<10} {sig}")
    else:
        print("No egress pathway genes found in mutation data")

    # =============================================================================
    # 5. Generate Figures
    # =============================================================================

    print("\n" + "-" * 70)
    print("GENERATING FIGURES")
    print("-" * 70)

    # Figure 1: Top mutations by stage (Forest plot style)
    fig, ax = plt.subplots(figsize=(12, 10))

    # Top 25 mutations by p-value
    top_mut = results_df.head(25).copy()
    top_mut = top_mut.iloc[::-1]  # Reverse for plotting

    y_pos = np.arange(len(top_mut))

    # Plot odds ratios on log scale
    log_or = np.log2(top_mut['OR'].replace(0, 0.01).replace(np.inf, 100))

    colors = ['#E74C3C' if d == 'Advanced' else '#3498DB' for d in top_mut['Direction']]

    bars = ax.barh(y_pos, log_or, color=colors, edgecolor='black', alpha=0.7)

    # Highlight significant
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
    ax.set_title('Top Mutations Associated with Stage (Lacy/HMRN)\nAll DLBCL Patients',
                fontsize=14, fontweight='bold')

    # Add p-value annotations
    for i, (idx, row) in enumerate(top_mut.iterrows()):
        sig = "***" if row['FDR'] < 0.1 else ("**" if row['P_value'] < 0.01 else ("*" if row['P_value'] < 0.05 else ""))
        x_pos = log_or.iloc[i] + 0.1 if log_or.iloc[i] > 0 else log_or.iloc[i] - 0.1
        ha = 'left' if log_or.iloc[i] > 0 else 'right'
        ax.text(x_pos, i, f"p={row['P_value']:.3f} {sig}", va='center', ha=ha, fontsize=8)

    # Legend
    import matplotlib.patches as mpatches
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

    # Figure 2: Pathway genes comparison
    fig, ax = plt.subplots(figsize=(10, 6))

    pathway_data = results_df[results_df['Gene'].isin(['GNA13', 'RHOA', 'P2RY8', 'CXCR4', 'SGK1_S', 'BCL2',
                                                        'EZH2', 'MYD88', 'CD79B', 'CREBBP', 'KMT2D'])]

    if len(pathway_data) > 0:
        pathway_data = pathway_data.sort_values('P_value')

        x = np.arange(len(pathway_data))
        width = 0.35

        bars1 = ax.bar(x - width/2, pathway_data['Limited_Pct'], width, label='Limited (I-II)',
                      color='#3498DB', edgecolor='black')
        bars2 = ax.bar(x + width/2, pathway_data['Advanced_Pct'], width, label='Advanced (III-IV)',
                      color='#E74C3C', edgecolor='black')

        ax.set_ylabel('Mutation Frequency (%)', fontsize=12)
        ax.set_xlabel('Gene', fontsize=12)
        ax.set_title('Key Gene Mutations by Stage (Lacy/HMRN)',
                    fontsize=14, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels(pathway_data['Gene'], fontsize=10, rotation=45, ha='right')
        ax.legend()

        # Add p-value annotations
        for i, (idx, row) in enumerate(pathway_data.iterrows()):
            sig = "***" if row['FDR'] < 0.1 else ("**" if row['P_value'] < 0.01 else ("*" if row['P_value'] < 0.05 else ""))
            max_height = max(row['Limited_Pct'], row['Advanced_Pct'])
            ax.text(i, max_height + 1, sig, ha='center', fontsize=12, fontweight='bold')

        plt.tight_layout()
        plt.savefig(os.path.join(figures_dir, "pathway_mutations_by_stage.png"), dpi=150, bbox_inches='tight')
        plt.close()
        print("  Saved: pathway_mutations_by_stage.png")

    # =============================================================================
    # 6. Summary
    # =============================================================================

    print("\n" + "=" * 70)
    print("GENOMIC STAGE ANALYSIS SUMMARY")
    print("=" * 70)

    print(f"\nDataset: Lacy/HMRN (All DLBCL)")
    print(f"Patients with stage data: {len(staged)}")
    print(f"  Limited (I-II): {len(limited)}")
    print(f"  Advanced (III-IV): {len(advanced)}")
    print(f"\nMutations analyzed: {len(results_df)}")
    print(f"Significant (FDR < 0.1): {len(sig_mut)}")
    print(f"Nominally significant (p < 0.05): {len(nom_sig)}")

    # Top associations
    print("\n--- TOP STAGE-ASSOCIATED MUTATIONS ---")
    if len(nom_sig) > 0:
        print("\nHigher in ADVANCED stage:")
        adv_high = nom_sig[nom_sig['Direction'] == 'Advanced'].head(10)
        for i, row in adv_high.iterrows():
            print(f"  {row['Gene']}: {row['Advanced_Pct']:.1f}% vs {row['Limited_Pct']:.1f}% (p={row['P_value']:.4f})")

        print("\nHigher in LIMITED stage:")
        lim_high = nom_sig[nom_sig['Direction'] == 'Limited'].head(10)
        for i, row in lim_high.iterrows():
            print(f"  {row['Gene']}: {row['Limited_Pct']:.1f}% vs {row['Advanced_Pct']:.1f}% (p={row['P_value']:.4f})")

else:
    print("Insufficient patients with stage data for analysis")

print("\n" + "=" * 70)
print("ANALYSIS COMPLETE")
print("=" * 70)
