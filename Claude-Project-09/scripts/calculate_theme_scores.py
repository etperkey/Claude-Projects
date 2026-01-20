"""
Calculate Theme Scores from Bulk RNA-seq Data
Based on Wang et al. 2026 Cancer Cell methodology

This script:
1. Loads the theme composition weights and signature gene lists
2. Calculates signature scores from bulk RNA-seq (mean z-score of signature genes)
3. Applies weights to combine signatures into 6 theme scores
4. Merges with clinical/survival data
"""

import pandas as pd
import numpy as np
from scipy import stats
import os

# Paths
DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPP_DIR = os.path.join(DATA_DIR, "data", "supplementary")
GDC_DIR = os.path.join(DATA_DIR, "data", "GDC")
OUTPUT_DIR = os.path.join(DATA_DIR, "data", "processed")

print("=" * 60)
print("Theme Score Calculation from Bulk RNA-seq")
print("=" * 60)

# 1. Load theme composition weights
print("\n1. Loading theme composition weights...")
theme_weights = pd.read_excel(
    os.path.join(SUPP_DIR, "Table_S7_ThemeComposition.xlsx"),
    sheet_name="theme component weight",
    header=1
)
print(f"   Loaded {len(theme_weights)} signature-theme mappings")
print(f"   Themes: {theme_weights['Theme'].unique().tolist()}")

# 2. Load signature gene lists
print("\n2. Loading signature gene lists...")
sig_genes = pd.read_excel(
    os.path.join(SUPP_DIR, "Table_S7_ThemeComposition.xlsx"),
    sheet_name="theme component genes",
    header=1
)
print(f"   Loaded {len(sig_genes)} gene-signature mappings")

# Get unique signatures we need
needed_sigs = theme_weights['Signature.short.name'].unique()
print(f"   Need {len(needed_sigs)} signatures for theme calculation")

# Create signature -> genes dictionary
sig_to_genes = {}
for sig in needed_sigs:
    genes = sig_genes[sig_genes['Signature.short.name'] == sig]['Gene.symbol'].tolist()
    if genes:
        sig_to_genes[sig] = genes
print(f"   Found gene lists for {len(sig_to_genes)} signatures")

# 3. Load bulk RNA-seq data
print("\n3. Loading bulk RNA-seq data...")
rnaseq = pd.read_csv(
    os.path.join(GDC_DIR, "RNAseq_gene_expression_562.txt"),
    sep="\t"
)
print(f"   Shape: {rnaseq.shape[0]} genes x {rnaseq.shape[1]-3} samples")

# Set gene symbol as index
rnaseq_expr = rnaseq.set_index('Gene')
sample_cols = rnaseq_expr.columns[2:]  # Skip Accession and Gene_ID
rnaseq_expr = rnaseq_expr[sample_cols]

# Check gene overlap
all_sig_genes = set()
for genes in sig_to_genes.values():
    all_sig_genes.update(genes)
overlap = all_sig_genes.intersection(set(rnaseq_expr.index))
print(f"   Gene overlap: {len(overlap)}/{len(all_sig_genes)} signature genes found")

# 4. Z-score normalize expression (across samples for each gene)
print("\n4. Z-score normalizing expression...")
# Convert to numeric and transpose for z-scoring
rnaseq_numeric = rnaseq_expr.apply(pd.to_numeric, errors='coerce')
# Z-score each gene across samples (axis=1)
rnaseq_zscore = rnaseq_numeric.apply(lambda x: (x - x.mean()) / x.std() if x.std() > 0 else x * 0, axis=1)
rnaseq_zscore = rnaseq_zscore.dropna(how='all')
print(f"   Z-scored matrix: {rnaseq_zscore.shape}")

# 5. Calculate signature scores (mean z-score of component genes)
print("\n5. Calculating signature scores...")
sig_scores = {}
for sig, genes in sig_to_genes.items():
    valid_genes = [g for g in genes if g in rnaseq_zscore.index]
    if len(valid_genes) >= 3:  # Require at least 3 genes
        sig_scores[sig] = rnaseq_zscore.loc[valid_genes].mean(axis=0)
    else:
        print(f"   Warning: {sig} has only {len(valid_genes)} genes, skipping")

sig_scores_df = pd.DataFrame(sig_scores)
print(f"   Calculated scores for {sig_scores_df.shape[1]} signatures")

# 6. Calculate theme scores (weighted combination)
print("\n6. Calculating theme scores...")
theme_scores = {}

for theme in theme_weights['Theme'].unique():
    theme_data = theme_weights[theme_weights['Theme'] == theme]
    weighted_sum = pd.Series(0.0, index=sig_scores_df.index)
    total_weight = 0

    for _, row in theme_data.iterrows():
        sig = row['Signature.short.name']
        weight = row['Weight.for.bulkRNA']

        if sig in sig_scores_df.columns:
            weighted_sum += sig_scores_df[sig] * weight
            total_weight += weight

    if total_weight > 0:
        theme_scores[f'Theme_{theme}'] = weighted_sum / total_weight
        print(f"   {theme}: calculated from {int(total_weight)} signature weights")

theme_scores_df = pd.DataFrame(theme_scores)
theme_scores_df.index.name = 'Sample_ID'
theme_scores_df = theme_scores_df.reset_index()
print(f"\n   Final theme scores: {theme_scores_df.shape[0]} samples x {len(theme_scores)} themes")

# 7. Load clinical data
print("\n7. Loading clinical/survival data...")
clinical = pd.read_excel(
    os.path.join(GDC_DIR, "Supplementary_Appendix_2.xlsx"),
    sheet_name="Tab S9 Characteristics DLBCL"
)
print(f"   Loaded {len(clinical)} clinical records")

# Ensure Sample_ID is string for matching
theme_scores_df['Sample_ID'] = theme_scores_df['Sample_ID'].astype(str)

# 8. Merge datasets using exact sample ID matching
print("\n8. Merging theme scores with clinical data...")

merged = pd.merge(
    theme_scores_df,
    clinical,
    left_on='Sample_ID',
    right_on='dbGaP submitted subject ID',
    how='inner'
)
print(f"   Merged by exact ID match: {len(merged)} samples")

# 9. Clean up and save
print("\n9. Saving integrated dataset...")

# Select key columns
key_cols = ['Sample_ID'] + [c for c in merged.columns if c.startswith('Theme_')]
clinical_cols = ['dbGaP submitted subject ID', 'Gene Expression Subgroup',
                 'Genetic Subtype', 'Age', 'Gender', 'Ann Arbor Stage',
                 'IPI Group', 'ECOG Performance Status',
                 'Status at Follow_up_ 0 Alive_ 1 Dead',
                 'Follow_up Time _yrs',
                 'Progression_Free Survival _PFS_ Status_ 0 No Progressoin_ 1 Progression',
                 'Progression_Free Survival _PFS_ Time _yrs',
                 'Included in Survival Analysis']

# Keep only columns that exist
available_clinical = [c for c in clinical_cols if c in merged.columns]
final_cols = key_cols + available_clinical
final_df = merged[[c for c in final_cols if c in merged.columns]].copy()

# Save full merged dataset
output_path = os.path.join(OUTPUT_DIR, "rnaseq_themes_clinical.csv")
final_df.to_csv(output_path, index=False)
print(f"   Saved: {output_path}")
print(f"   Shape: {final_df.shape}")

# Rename columns for clarity
rename_map = {
    'Gene Expression Subgroup': 'COO',
    'Genetic Subtype': 'LymphGen_Subtype',
    'Status at Follow_up_ 0 Alive_ 1 Dead': 'OS_status',
    'Follow_up Time _yrs': 'OS_time_years',
    'Progression_Free Survival _PFS_ Status_ 0 No Progressoin_ 1 Progression': 'PFS_status',
    'Progression_Free Survival _PFS_ Time _yrs': 'PFS_time_years'
}
final_df = final_df.rename(columns=rename_map)

# Save filtered version with complete survival data
if 'OS_status' in final_df.columns and 'OS_time_years' in final_df.columns:
    survival_df = final_df[
        final_df['OS_status'].notna() &
        final_df['OS_time_years'].notna() &
        (final_df['Included in Survival Analysis'] == 'Yes')
    ].copy()

    output_filtered = os.path.join(OUTPUT_DIR, "rnaseq_themes_survival.csv")
    survival_df.to_csv(output_filtered, index=False)
    print(f"   Saved (with survival): {output_filtered}")
    print(f"   Shape: {survival_df.shape}")

print("\n" + "=" * 60)
print("Theme score calculation complete!")
print("=" * 60)

# Summary statistics
print("\nTheme Score Summary:")
for col in [c for c in final_df.columns if c.startswith('Theme_')]:
    print(f"  {col}: mean={final_df[col].mean():.3f}, std={final_df[col].std():.3f}")
