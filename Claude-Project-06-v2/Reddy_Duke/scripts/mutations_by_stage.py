"""
Genomic (Mutation) Analysis by Stage - Reddy/Duke Dataset
Proper analysis with good stage/mutation overlap
"""

import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import os

print("=" * 70)
print("GENOMIC ANALYSIS: Mutations by Stage (Reddy/Duke)")
print("=" * 70 + "\n")

duke_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Reddy_Duke"
data_dir = os.path.join(duke_dir, "data", "raw")
results_dir = os.path.join(duke_dir, "results")
figures_dir = os.path.join(results_dir, "figures")

for d in [results_dir, figures_dir]:
    if not os.path.exists(d):
        os.makedirs(d)

# =============================================================================
# 1. Load Data
# =============================================================================

print("Loading data...")

# Clinical data with stage
clinical = pd.read_csv(os.path.join(data_dir, "data_clinical_patient.csv"))
print(f"Clinical data: {len(clinical)} patients")

# Stage from IPI component (0 = Stage I-II, 1 = Stage III-IV)
clinical['stage_group'] = clinical['IPI_ANNARBOR_STAGE'].map({0: 'Limited', 1: 'Advanced'})
print(f"\nStage distribution:")
print(clinical['stage_group'].value_counts(dropna=False))

# Load mutations (MAF format)
mutations = pd.read_csv(os.path.join(data_dir, "data_mutations.csv"))
print(f"\nMutation data: {len(mutations)} variants")
print(f"Unique patients: {mutations['Tumor_Sample_Barcode'].nunique()}")
print(f"Unique genes: {mutations['Hugo_Symbol'].nunique()}")

# =============================================================================
# 2. Create Binary Mutation Matrix
# =============================================================================

print("\n" + "-" * 50)
print("Creating binary mutation matrix...")

# Get unique patients and genes
patients = mutations['Tumor_Sample_Barcode'].unique()
genes = mutations['Hugo_Symbol'].unique()

# Create binary matrix
mut_matrix = pd.DataFrame(0, index=patients, columns=genes)

for idx, row in mutations.iterrows():
    patient = row['Tumor_Sample_Barcode']
    gene = row['Hugo_Symbol']
    mut_matrix.loc[patient, gene] = 1

mut_matrix = mut_matrix.reset_index()
mut_matrix = mut_matrix.rename(columns={'index': 'PATIENT_ID'})

print(f"Mutation matrix: {len(mut_matrix)} patients x {len(genes)} genes")

# Merge with clinical
merged = mut_matrix.merge(clinical[['PATIENT_ID', 'stage_group', 'IPI']], on='PATIENT_ID', how='inner')
print(f"Patients with both mutation + stage data: {len(merged)}")

# Filter to valid stage
staged = merged[merged['stage_group'].notna()].copy()
print(f"Patients with valid stage: {len(staged)}")

# =============================================================================
# 3. Mutation Analysis by Stage
# =============================================================================

print("\n" + "=" * 70)
print("MUTATION ANALYSIS BY STAGE")
print("=" * 70 + "\n")

limited = staged[staged['stage_group'] == 'Limited']
advanced = staged[staged['stage_group'] == 'Advanced']

print(f"Limited stage (I-II): n={len(limited)}")
print(f"Advanced stage (III-IV): n={len(advanced)}")

# Test each gene
results = []

for gene in genes:
    lim_mut = int(limited[gene].sum())
    lim_wt = len(limited) - lim_mut
    adv_mut = int(advanced[gene].sum())
    adv_wt = len(advanced) - adv_mut

    total_mut = lim_mut + adv_mut
    if total_mut >= 5:  # At least 5 mutations
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

# Convert to DataFrame
results_df = pd.DataFrame(results)
results_df = results_df.sort_values('P_value')

# FDR correction
results_df['FDR'] = stats.false_discovery_control(results_df['P_value'])

# Print results
print("\n" + "-" * 80)
print("TOP MUTATIONS BY STAGE ASSOCIATION")
print("-" * 80)
print(f"{'Gene':<15} {'Lim(n)':>8} {'Lim%':>8} {'Adv(n)':>8} {'Adv%':>8} {'OR':>8} {'P-val':>10} {'FDR':>10} {'Dir':<8}")
print("-" * 80)

for i, row in results_df.head(40).iterrows():
    sig = "***" if row['FDR'] < 0.1 else ("**" if row['P_value'] < 0.01 else ("*" if row['P_value'] < 0.05 else ""))
    print(f"{row['Gene']:<15} {row['Limited_N']:>8} {row['Limited_Pct']:>7.1f}% {row['Advanced_N']:>8} "
          f"{row['Advanced_Pct']:>7.1f}% {row['OR']:>8.2f} {row['P_value']:>10.4f} {row['FDR']:>10.4f} {row['Direction']:<8} {sig}")

# Summary
sig_genes = results_df[results_df['FDR'] < 0.1]
nom_sig = results_df[results_df['P_value'] < 0.05]

print(f"\n\nGenes tested: {len(results_df)}")
print(f"Significant (FDR < 0.1): {len(sig_genes)}")
print(f"Nominally significant (p < 0.05): {len(nom_sig)}")

# Save results
results_df.to_csv(os.path.join(results_dir, "mutations_by_stage.csv"), index=False)
print(f"\nSaved: mutations_by_stage.csv")

# =============================================================================
# 4. Egress Pathway Genes
# =============================================================================

print("\n" + "-" * 70)
print("EGRESS/RETENTION PATHWAY MUTATIONS BY STAGE")
print("-" * 70)

pathway_genes = ['GNA13', 'RHOA', 'P2RY8', 'CXCR4', 'SGK1', 'S1PR2', 'GNAI2', 'FOXO1']
pathway_results = results_df[results_df['Gene'].isin(pathway_genes)]

if len(pathway_results) > 0:
    print(f"{'Gene':<12} {'Lim%':>8} {'Adv%':>8} {'OR':>8} {'P-value':>12} {'FDR':>10} {'Dir':<10}")
    print("-" * 70)
    for i, row in pathway_results.iterrows():
        sig = "***" if row['FDR'] < 0.1 else ("**" if row['P_value'] < 0.01 else ("*" if row['P_value'] < 0.05 else ""))
        print(f"{row['Gene']:<12} {row['Limited_Pct']:>7.1f}% {row['Advanced_Pct']:>7.1f}% "
              f"{row['OR']:>8.2f} {row['P_value']:>12.4f} {row['FDR']:>10.4f} {row['Direction']:<10} {sig}")
else:
    print("No egress pathway genes with sufficient mutations")

# =============================================================================
# 5. Generate Figures
# =============================================================================

print("\n" + "-" * 70)
print("GENERATING FIGURES")
print("-" * 70)

# Figure 1: Forest plot
fig, ax = plt.subplots(figsize=(14, 12))

top_mut = results_df.head(35).copy()
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
ax.set_title(f'Mutations Associated with Stage (Reddy/Duke)\n'
            f'n={len(staged)} patients (Limited={len(limited)}, Advanced={len(advanced)})',
            fontsize=14, fontweight='bold')

for i, (idx, row) in enumerate(top_mut.iterrows()):
    sig = "***" if row['FDR'] < 0.1 else ("**" if row['P_value'] < 0.01 else ("*" if row['P_value'] < 0.05 else ""))
    x_pos = log_or.iloc[i] + 0.1 if log_or.iloc[i] > 0 else log_or.iloc[i] - 0.1
    ha = 'left' if log_or.iloc[i] > 0 else 'right'
    ax.text(x_pos, i, f"p={row['P_value']:.3f} {sig}", va='center', ha=ha, fontsize=8)

legend_elements = [
    mpatches.Patch(color='#E74C3C', label='Higher in Advanced (III-IV)'),
    mpatches.Patch(color='#3498DB', label='Higher in Limited (I-II)'),
    mpatches.Patch(facecolor='white', edgecolor='gold', linewidth=3, label='FDR < 0.1'),
    mpatches.Patch(facecolor='white', edgecolor='orange', linewidth=2, label='p < 0.05'),
]
ax.legend(handles=legend_elements, loc='lower right', fontsize=10)

plt.tight_layout()
plt.savefig(os.path.join(figures_dir, "mutations_by_stage_forest.png"), dpi=150, bbox_inches='tight')
plt.close()
print("  Saved: mutations_by_stage_forest.png")

# Figure 2: Egress pathway genes
fig, ax = plt.subplots(figsize=(12, 6))

key_genes = ['GNA13', 'RHOA', 'P2RY8', 'SGK1', 'EZH2', 'CREBBP', 'KMT2D', 'BCL2',
             'MYD88', 'CD79B', 'TP53', 'MYC', 'FOXO1', 'TNFAIP3']
key_results = results_df[results_df['Gene'].isin(key_genes)].sort_values('P_value')

if len(key_results) > 0:
    x = np.arange(len(key_results))
    width = 0.35

    bars1 = ax.bar(x - width/2, key_results['Limited_Pct'], width, label='Limited (I-II)',
                  color='#3498DB', edgecolor='black')
    bars2 = ax.bar(x + width/2, key_results['Advanced_Pct'], width, label='Advanced (III-IV)',
                  color='#E74C3C', edgecolor='black')

    ax.set_ylabel('Mutation Frequency (%)', fontsize=12)
    ax.set_xlabel('Gene', fontsize=12)
    ax.set_title('Key Gene Mutations by Stage (Reddy/Duke DLBCL)',
                fontsize=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(key_results['Gene'], fontsize=10, rotation=45, ha='right')
    ax.legend()

    for i, (idx, row) in enumerate(key_results.iterrows()):
        sig = "***" if row['FDR'] < 0.1 else ("**" if row['P_value'] < 0.01 else ("*" if row['P_value'] < 0.05 else ""))
        max_height = max(row['Limited_Pct'], row['Advanced_Pct'])
        ax.text(i, max_height + 1, sig, ha='center', fontsize=11, fontweight='bold')

    plt.tight_layout()
    plt.savefig(os.path.join(figures_dir, "key_mutations_by_stage.png"), dpi=150, bbox_inches='tight')
    plt.close()
    print("  Saved: key_mutations_by_stage.png")

# =============================================================================
# 6. Summary
# =============================================================================

print("\n" + "=" * 70)
print("SUMMARY: Mutations Associated with Stage (Reddy/Duke)")
print("=" * 70)

print(f"\nDataset: Reddy/Duke DLBCL")
print(f"Total patients with stage + mutation data: {len(staged)}")
print(f"  Limited (Stage I-II): {len(limited)}")
print(f"  Advanced (Stage III-IV): {len(advanced)}")
print(f"\nGenes tested: {len(results_df)}")
print(f"Significant (FDR < 0.1): {len(sig_genes)}")
print(f"Nominally significant (p < 0.05): {len(nom_sig)}")

if len(sig_genes) > 0:
    print("\n--- SIGNIFICANT MUTATIONS (FDR < 0.1) ---")
    for i, row in sig_genes.iterrows():
        print(f"  {row['Gene']}: {row['Advanced_Pct']:.1f}% Adv vs {row['Limited_Pct']:.1f}% Lim "
              f"(OR={row['OR']:.2f}, FDR={row['FDR']:.4f}, {row['Direction']})")

if len(nom_sig) > 0:
    print("\n--- NOMINALLY SIGNIFICANT (p < 0.05) ---")
    print("\nHigher in ADVANCED stage:")
    adv_high = nom_sig[nom_sig['Direction'] == 'Advanced'].head(10)
    for i, row in adv_high.iterrows():
        print(f"  {row['Gene']}: {row['Advanced_Pct']:.1f}% vs {row['Limited_Pct']:.1f}% (p={row['P_value']:.4f})")

    print("\nHigher in LIMITED stage:")
    lim_high = nom_sig[nom_sig['Direction'] == 'Limited'].head(10)
    for i, row in lim_high.iterrows():
        print(f"  {row['Gene']}: {row['Limited_Pct']:.1f}% vs {row['Advanced_Pct']:.1f}% (p={row['P_value']:.4f})")

print("\n" + "=" * 70)
print("ANALYSIS COMPLETE")
print("=" * 70)
