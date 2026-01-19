"""
GCB-DLBCL Stage Analysis - Comprehensive Figures
Generates visualizations for transcriptional and genomic stage associations
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.gridspec import GridSpec
import os

print("=" * 70)
print("GCB-DLBCL STAGE ANALYSIS - GENERATING FIGURES")
print("=" * 70 + "\n")

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"
results_dir = os.path.join(lacy_dir, "results")
figures_dir = os.path.join(results_dir, "figures")

if not os.path.exists(figures_dir):
    os.makedirs(figures_dir)

# =============================================================================
# 1. Load Data
# =============================================================================

print("Loading data...")

# Load DE results
de_results = pd.read_csv(os.path.join(results_dir, "gcb_expression_by_stage.csv"))
print(f"DE results: {len(de_results)} probes")

# Load annotation if available
annot_file = os.path.join(lacy_dir, "GPL14951_annotation.csv")
if os.path.exists(annot_file):
    annot_df = pd.read_csv(annot_file)
    de_results = de_results.merge(annot_df, on='Probe', how='left')

# Load staged data
staged_file = os.path.join(results_dir, "gcb_staged_tegress.csv")
if os.path.exists(staged_file):
    staged_data = pd.read_csv(staged_file)
    print(f"Staged GCB patients: {len(staged_data)}")

# =============================================================================
# 2. FIGURE 1: Volcano Plot
# =============================================================================

print("\nGenerating Figure 1: Volcano Plot...")

fig, ax = plt.subplots(figsize=(10, 8))

# Calculate -log10(p-value)
de_results['neg_log_p'] = -np.log10(de_results['P_value'])

# Color by significance and direction
colors = []
for idx, row in de_results.iterrows():
    if row['FDR'] < 0.1:
        if row['Direction'] == 'Advanced-high':
            colors.append('#E74C3C')  # Red for advanced
        else:
            colors.append('#3498DB')  # Blue for limited
    elif row['P_value'] < 0.05:
        colors.append('#95A5A6')  # Gray for nominal
    else:
        colors.append('#D5D8DC')  # Light gray for NS

ax.scatter(de_results['Log2FC'], de_results['neg_log_p'],
           c=colors, alpha=0.6, s=10, edgecolors='none')

# Add significance thresholds
ax.axhline(-np.log10(0.05), color='gray', linestyle='--', linewidth=0.8, alpha=0.7)
ax.axhline(-np.log10(de_results[de_results['FDR'] < 0.1]['P_value'].max()),
           color='red', linestyle='--', linewidth=1, alpha=0.7)

# Label top genes
top_genes = de_results[de_results['Gene_Symbol'].notna()].head(10)
for idx, row in top_genes.iterrows():
    if row['FDR'] < 0.1:
        ax.annotate(row['Gene_Symbol'],
                   (row['Log2FC'], row['neg_log_p']),
                   fontsize=9, fontweight='bold',
                   xytext=(5, 5), textcoords='offset points')

# Also label some key pathway genes
pathway_genes = ['FOXO1', 'PAX5', 'MS4A1', 'MYC', 'S1PR2', 'GNA13', 'CXCR4']
for gene in pathway_genes:
    gene_data = de_results[de_results['Gene_Symbol'] == gene]
    if len(gene_data) > 0:
        row = gene_data.iloc[0]
        color = '#E74C3C' if row['Direction'] == 'Advanced-high' else '#3498DB'
        ax.scatter(row['Log2FC'], row['neg_log_p'], c=color, s=80,
                  edgecolors='black', linewidths=1.5, zorder=5)
        ax.annotate(gene, (row['Log2FC'], row['neg_log_p']),
                   fontsize=10, fontweight='bold',
                   xytext=(8, 0), textcoords='offset points')

ax.set_xlabel('Log2 Fold Change (Advanced / Limited)', fontsize=12)
ax.set_ylabel('-Log10(P-value)', fontsize=12)
ax.set_title('Differential Gene Expression by Stage in GCB-DLBCL\n(Lacy/HMRN Dataset)',
             fontsize=14, fontweight='bold')

# Legend
legend_elements = [
    mpatches.Patch(color='#E74C3C', label='Advanced-high (FDR<0.1)'),
    mpatches.Patch(color='#3498DB', label='Limited-high (FDR<0.1)'),
    mpatches.Patch(color='#95A5A6', label='Nominal (p<0.05)'),
    mpatches.Patch(color='#D5D8DC', label='Not significant')
]
ax.legend(handles=legend_elements, loc='upper right', fontsize=10)

plt.tight_layout()
plt.savefig(os.path.join(figures_dir, "volcano_plot_stage.png"), dpi=150, bbox_inches='tight')
plt.close()
print("  Saved: volcano_plot_stage.png")

# =============================================================================
# 3. FIGURE 2: Top Genes Bar Plot
# =============================================================================

print("Generating Figure 2: Top Genes Bar Plot...")

fig, axes = plt.subplots(1, 2, figsize=(14, 8))

# Significant genes
sig_genes = de_results[de_results['FDR'] < 0.1].copy()

# Top Limited-high genes
limited_high = sig_genes[sig_genes['Direction'] == 'Limited-high'].sort_values('P_value').head(20)
# Top Advanced-high genes
advanced_high = sig_genes[sig_genes['Direction'] == 'Advanced-high'].sort_values('P_value').head(20)

# Left panel: Limited-high
ax1 = axes[0]
if len(limited_high) > 0:
    # Use probe ID if no gene symbol
    limited_high['Label'] = limited_high.apply(
        lambda x: x['Gene_Symbol'] if pd.notna(x['Gene_Symbol']) else x['Probe'][:15], axis=1)

    y_pos = np.arange(len(limited_high))
    bars = ax1.barh(y_pos, -limited_high['Log2FC'], color='#3498DB', edgecolor='#2980B9')
    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(limited_high['Label'], fontsize=9)
    ax1.set_xlabel('|Log2 Fold Change|', fontsize=11)
    ax1.set_title('Higher in Limited Stage (I-II)\n36 genes at FDR<0.1', fontsize=12, fontweight='bold')
    ax1.invert_yaxis()

    # Add FDR annotations
    for i, (idx, row) in enumerate(limited_high.iterrows()):
        ax1.text(-row['Log2FC'] + 0.002, i, f"FDR={row['FDR']:.3f}",
                va='center', fontsize=8, color='#2C3E50')

# Right panel: Advanced-high
ax2 = axes[1]
if len(advanced_high) > 0:
    advanced_high['Label'] = advanced_high.apply(
        lambda x: x['Gene_Symbol'] if pd.notna(x['Gene_Symbol']) else x['Probe'][:15], axis=1)

    y_pos = np.arange(len(advanced_high))
    bars = ax2.barh(y_pos, advanced_high['Log2FC'], color='#E74C3C', edgecolor='#C0392B')
    ax2.set_yticks(y_pos)
    ax2.set_yticklabels(advanced_high['Label'], fontsize=9)
    ax2.set_xlabel('Log2 Fold Change', fontsize=11)
    ax2.set_title('Higher in Advanced Stage (III-IV)\n60 genes at FDR<0.1', fontsize=12, fontweight='bold')
    ax2.invert_yaxis()

    # Add FDR annotations
    for i, (idx, row) in enumerate(advanced_high.iterrows()):
        ax2.text(row['Log2FC'] + 0.002, i, f"FDR={row['FDR']:.3f}",
                va='center', fontsize=8, color='#2C3E50')

plt.suptitle('Top Differentially Expressed Genes by Stage in GCB-DLBCL',
             fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig(os.path.join(figures_dir, "top_genes_by_stage.png"), dpi=150, bbox_inches='tight')
plt.close()
print("  Saved: top_genes_by_stage.png")

# =============================================================================
# 4. FIGURE 3: Pathway Genes Analysis
# =============================================================================

print("Generating Figure 3: Pathway Genes...")

# Define pathway genes with their roles
pathway_genes_info = {
    'FOXO1': ('Retention Regulator', '#9B59B6'),
    'S1PR2': ('Retention Receptor', '#3498DB'),
    'GNA13': ('Retention Signal', '#3498DB'),
    'RHOA': ('Retention Effector', '#3498DB'),
    'P2RY8': ('Retention Signal', '#3498DB'),
    'ARHGEF1': ('Retention Signal', '#3498DB'),
    'CXCR4': ('Egress Receptor', '#E74C3C'),
    'SGK1': ('Egress/FOXO1 Inhibitor', '#E74C3C'),
    'GNAI2': ('Egress Signal', '#E74C3C'),
    'RAC2': ('Migration', '#F39C12'),
    'PAX5': ('B-cell TF', '#27AE60'),
    'MS4A1': ('CD20', '#27AE60'),
    'MYC': ('Proliferation', '#E67E22'),
}

fig, ax = plt.subplots(figsize=(12, 8))

# Get data for pathway genes
pathway_data = []
for gene, (role, color) in pathway_genes_info.items():
    gene_df = de_results[de_results['Gene_Symbol'] == gene]
    if len(gene_df) > 0:
        row = gene_df.iloc[0]
        pathway_data.append({
            'Gene': gene,
            'Role': role,
            'Color': color,
            'Log2FC': row['Log2FC'],
            'P_value': row['P_value'],
            'FDR': row['FDR'],
            'Significant': row['FDR'] < 0.1
        })

if len(pathway_data) > 0:
    pathway_df = pd.DataFrame(pathway_data)
    pathway_df = pathway_df.sort_values('Log2FC')

    y_pos = np.arange(len(pathway_df))
    colors = pathway_df['Color'].tolist()

    # Create bars
    bars = ax.barh(y_pos, pathway_df['Log2FC'], color=colors, edgecolor='black', linewidth=0.5)

    # Highlight significant genes
    for i, (idx, row) in enumerate(pathway_df.iterrows()):
        if row['Significant']:
            bars[i].set_edgecolor('gold')
            bars[i].set_linewidth(3)

    ax.set_yticks(y_pos)
    ax.set_yticklabels([f"{row['Gene']} ({row['Role']})" for idx, row in pathway_df.iterrows()], fontsize=10)
    ax.axvline(0, color='black', linewidth=1)
    ax.set_xlabel('Log2 Fold Change (Advanced vs Limited)', fontsize=12)
    ax.set_title('Egress/Retention Pathway Gene Expression by Stage\nGCB-DLBCL (Lacy/HMRN)',
                 fontsize=14, fontweight='bold')

    # Add p-values
    for i, (idx, row) in enumerate(pathway_df.iterrows()):
        sig_marker = "***" if row['FDR'] < 0.1 else ("*" if row['P_value'] < 0.05 else "")
        x_offset = 0.005 if row['Log2FC'] >= 0 else -0.005
        ha = 'left' if row['Log2FC'] >= 0 else 'right'
        ax.text(row['Log2FC'] + x_offset, i, f"p={row['P_value']:.3f} {sig_marker}",
               va='center', ha=ha, fontsize=9)

    # Add direction labels
    ax.text(-0.12, len(pathway_df), 'Higher in\nLimited (I-II)', fontsize=10,
           ha='center', fontweight='bold', color='#3498DB')
    ax.text(0.12, len(pathway_df), 'Higher in\nAdvanced (III-IV)', fontsize=10,
           ha='center', fontweight='bold', color='#E74C3C')

    # Legend for colors
    legend_elements = [
        mpatches.Patch(color='#9B59B6', label='Retention Regulator'),
        mpatches.Patch(color='#3498DB', label='Retention Pathway'),
        mpatches.Patch(color='#E74C3C', label='Egress Pathway'),
        mpatches.Patch(color='#27AE60', label='B-cell Markers'),
        mpatches.Patch(color='#E67E22', label='Proliferation'),
    ]
    ax.legend(handles=legend_elements, loc='lower right', fontsize=9)

plt.tight_layout()
plt.savefig(os.path.join(figures_dir, "pathway_genes_stage.png"), dpi=150, bbox_inches='tight')
plt.close()
print("  Saved: pathway_genes_stage.png")

# =============================================================================
# 5. FIGURE 4: Summary Statistics
# =============================================================================

print("Generating Figure 4: Summary Statistics...")

fig = plt.figure(figsize=(14, 10))
gs = GridSpec(2, 3, figure=fig, hspace=0.3, wspace=0.3)

# Panel A: Stage distribution
ax1 = fig.add_subplot(gs[0, 0])
if 'staged_data' in dir():
    stage_counts = staged_data['stage_group'].value_counts()
    colors_pie = ['#3498DB', '#E74C3C']
    wedges, texts, autotexts = ax1.pie(stage_counts.values, labels=stage_counts.index,
                                        autopct='%1.1f%%', colors=colors_pie,
                                        explode=[0.02, 0.02])
    ax1.set_title('A. Stage Distribution\n(GCB-DLBCL, n=345)', fontsize=11, fontweight='bold')

# Panel B: DE genes summary
ax2 = fig.add_subplot(gs[0, 1])
sig_summary = de_results[de_results['FDR'] < 0.1]['Direction'].value_counts()
colors_bar = {'Limited-high': '#3498DB', 'Advanced-high': '#E74C3C'}
bars = ax2.bar(sig_summary.index, sig_summary.values,
               color=[colors_bar[x] for x in sig_summary.index], edgecolor='black')
ax2.set_ylabel('Number of Genes', fontsize=11)
ax2.set_title('B. Significant DE Genes\n(FDR < 0.1)', fontsize=11, fontweight='bold')
for bar, val in zip(bars, sig_summary.values):
    ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1, str(val),
            ha='center', fontsize=12, fontweight='bold')

# Panel C: P-value distribution
ax3 = fig.add_subplot(gs[0, 2])
ax3.hist(de_results['P_value'], bins=50, color='#95A5A6', edgecolor='black', alpha=0.7)
ax3.axvline(0.05, color='red', linestyle='--', linewidth=2, label='p=0.05')
ax3.set_xlabel('P-value', fontsize=11)
ax3.set_ylabel('Frequency', fontsize=11)
ax3.set_title('C. P-value Distribution\n(29,372 probes)', fontsize=11, fontweight='bold')
ax3.legend()

# Panel D: Key genes expression
ax4 = fig.add_subplot(gs[1, :2])
key_genes = ['FOXO1', 'PAX5', 'MS4A1', 'MYC', 'S1PR2', 'GNA13', 'CXCR4', 'SGK1']
key_data = []
for gene in key_genes:
    gene_df = de_results[de_results['Gene_Symbol'] == gene]
    if len(gene_df) > 0:
        row = gene_df.iloc[0]
        key_data.append({
            'Gene': gene,
            'Log2FC': row['Log2FC'],
            'FDR': row['FDR'],
            'Significant': row['FDR'] < 0.1
        })

if key_data:
    key_df = pd.DataFrame(key_data)
    x_pos = np.arange(len(key_df))
    colors = ['#E74C3C' if fc > 0 else '#3498DB' for fc in key_df['Log2FC']]
    bars = ax4.bar(x_pos, key_df['Log2FC'], color=colors, edgecolor='black')

    # Highlight significant
    for i, row in key_df.iterrows():
        if row['Significant']:
            bars[i].set_edgecolor('gold')
            bars[i].set_linewidth(3)

    ax4.set_xticks(x_pos)
    ax4.set_xticklabels(key_df['Gene'], fontsize=11, fontweight='bold')
    ax4.axhline(0, color='black', linewidth=1)
    ax4.set_ylabel('Log2 Fold Change', fontsize=11)
    ax4.set_title('D. Key Gene Expression Changes by Stage\n(Gold border = FDR < 0.1)',
                  fontsize=11, fontweight='bold')

    # Add significance stars
    for i, row in key_df.iterrows():
        marker = "***" if row['FDR'] < 0.1 else ("*" if row['FDR'] < 0.2 else "")
        y_pos_text = row['Log2FC'] + 0.01 if row['Log2FC'] > 0 else row['Log2FC'] - 0.01
        ax4.text(i, y_pos_text, marker, ha='center', fontsize=12, fontweight='bold')

# Panel E: Text summary
ax5 = fig.add_subplot(gs[1, 2])
ax5.axis('off')
summary_text = """
KEY FINDINGS

SIGNIFICANT (FDR < 0.1):
- FOXO1: Higher in Limited
  (Regulates S1PR2 retention)
- PAX5: Higher in Limited
  (B-cell master TF)
- MS4A1/CD20: Higher in Limited
  (B-cell marker)

TRENDING (p < 0.05):
- MYC: Higher in Advanced
  (Proliferation marker)

NOT SIGNIFICANT:
- Egress/retention genes
  (S1PR2, GNA13, CXCR4, etc.)
  show no stage association

INTERPRETATION:
FOXO1 (retention regulator)
differs by stage, but the
downstream pathway genes
do not - suggesting mutations
rather than expression drive
the retention phenotype.
"""
ax5.text(0.05, 0.95, summary_text, transform=ax5.transAxes, fontsize=10,
        verticalalignment='top', fontfamily='monospace',
        bbox=dict(boxstyle='round', facecolor='#F8F9FA', edgecolor='#BDC3C7'))

plt.suptitle('GCB-DLBCL: Transcriptional Determinants of Stage (Lacy/HMRN)',
             fontsize=14, fontweight='bold', y=0.98)
plt.savefig(os.path.join(figures_dir, "stage_analysis_summary.png"), dpi=150, bbox_inches='tight')
plt.close()
print("  Saved: stage_analysis_summary.png")

# =============================================================================
# 6. Create Gene Signature Tables
# =============================================================================

print("\n" + "=" * 70)
print("TOP GENE SIGNATURES BY STAGE")
print("=" * 70)

# Limited-high signature (top 20)
print("\n--- LIMITED STAGE (I-II) SIGNATURE ---")
print("Genes with higher expression in Limited vs Advanced stage")
print("-" * 60)
limited_sig = de_results[de_results['Direction'] == 'Limited-high'].sort_values('P_value').head(20)
print(f"{'Rank':<5} {'Probe':<18} {'Gene':<12} {'Log2FC':<10} {'P-value':<12} {'FDR':<10}")
print("-" * 60)
for i, (idx, row) in enumerate(limited_sig.iterrows(), 1):
    gene = row['Gene_Symbol'] if pd.notna(row.get('Gene_Symbol')) else '-'
    print(f"{i:<5} {row['Probe']:<18} {gene:<12} {row['Log2FC']:<10.4f} {row['P_value']:<12.2e} {row['FDR']:<10.4f}")

# Advanced-high signature (top 20)
print("\n--- ADVANCED STAGE (III-IV) SIGNATURE ---")
print("Genes with higher expression in Advanced vs Limited stage")
print("-" * 60)
advanced_sig = de_results[de_results['Direction'] == 'Advanced-high'].sort_values('P_value').head(20)
print(f"{'Rank':<5} {'Probe':<18} {'Gene':<12} {'Log2FC':<10} {'P-value':<12} {'FDR':<10}")
print("-" * 60)
for i, (idx, row) in enumerate(advanced_sig.iterrows(), 1):
    gene = row['Gene_Symbol'] if pd.notna(row.get('Gene_Symbol')) else '-'
    print(f"{i:<5} {row['Probe']:<18} {gene:<12} {row['Log2FC']:<10.4f} {row['P_value']:<12.2e} {row['FDR']:<10.4f}")

# Save signatures to CSV
print("\nSaving gene signatures...")
limited_sig.to_csv(os.path.join(results_dir, "limited_stage_signature.csv"), index=False)
advanced_sig.to_csv(os.path.join(results_dir, "advanced_stage_signature.csv"), index=False)
print("  Saved: limited_stage_signature.csv")
print("  Saved: advanced_stage_signature.csv")

# =============================================================================
# 7. All Significant Genes Summary
# =============================================================================

print("\n" + "=" * 70)
print("ALL SIGNIFICANT GENES (FDR < 0.1)")
print("=" * 70)

all_sig = de_results[de_results['FDR'] < 0.1].sort_values('FDR')
print(f"\nTotal: {len(all_sig)} genes")
print(f"  Limited-high: {(all_sig['Direction'] == 'Limited-high').sum()}")
print(f"  Advanced-high: {(all_sig['Direction'] == 'Advanced-high').sum()}")

# Save all significant
all_sig.to_csv(os.path.join(results_dir, "all_significant_genes_stage.csv"), index=False)
print("\nSaved: all_significant_genes_stage.csv")

print("\n" + "=" * 70)
print("FIGURE GENERATION COMPLETE")
print("=" * 70)
print(f"\nFigures saved to: {figures_dir}")
print("\nFiles created:")
print("  - volcano_plot_stage.png")
print("  - top_genes_by_stage.png")
print("  - pathway_genes_stage.png")
print("  - stage_analysis_summary.png")
print("  - limited_stage_signature.csv")
print("  - advanced_stage_signature.csv")
print("  - all_significant_genes_stage.csv")
