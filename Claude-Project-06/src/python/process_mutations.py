"""
Mutation Processing Pipeline
Filters, classifies, and merges mutation data with clinical staging
"""

import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Optional, Tuple, Any

from utils import (
    load_config,
    load_dataframe,
    save_dataframe,
    get_pathway_genes,
    get_all_genes,
    get_hotspots,
    get_expected_effect,
    classify_mutation_type,
    map_clinical_stage,
    is_gcb_subtype,
    ensure_directories,
    logger
)


def load_raw_data() -> Dict[str, pd.DataFrame]:
    """Load all raw data files."""
    data = {}

    try:
        data['mutations'] = load_dataframe('mutations_raw.csv', 'raw')
        logger.info(f"Loaded {len(data['mutations'])} mutations")
    except FileNotFoundError:
        logger.warning("No mutation data found")

    try:
        data['cna'] = load_dataframe('cna_raw.csv', 'raw')
        logger.info(f"Loaded {len(data['cna'])} CNA records")
    except FileNotFoundError:
        logger.warning("No CNA data found")

    try:
        data['clinical'] = load_dataframe('clinical_wide.csv', 'raw')
        logger.info(f"Loaded {len(data['clinical'])} clinical records")
    except FileNotFoundError:
        logger.warning("No clinical data found")

    try:
        data['samples'] = load_dataframe('samples.csv', 'raw')
        logger.info(f"Loaded {len(data['samples'])} samples")
    except FileNotFoundError:
        logger.warning("No sample data found")

    return data


def filter_genes(df: pd.DataFrame, genes: List[str],
                 gene_col: str = 'gene') -> pd.DataFrame:
    """
    Filter DataFrame to include only target genes.

    Args:
        df: Input DataFrame
        genes: List of gene symbols to keep
        gene_col: Column name containing gene symbols

    Returns:
        Filtered DataFrame
    """
    if gene_col not in df.columns:
        # Try alternative column names
        for alt_col in ['hugoGeneSymbol', 'Hugo_Symbol', 'Gene']:
            if alt_col in df.columns:
                gene_col = alt_col
                break
        else:
            logger.warning(f"Gene column not found. Available: {df.columns.tolist()}")
            return df

    genes_upper = [g.upper() for g in genes]
    mask = df[gene_col].str.upper().isin(genes_upper)
    filtered = df[mask].copy()

    logger.info(f"Filtered {len(df)} -> {len(filtered)} records (target genes)")
    return filtered


def classify_mutations(df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
    """
    Classify mutations as LoF, activating, or uncertain.

    Args:
        df: Mutation DataFrame
        config: Configuration dictionary

    Returns:
        DataFrame with classification columns added
    """
    if df.empty:
        return df

    df = df.copy()
    hotspots = get_hotspots(config)

    # Find variant classification column
    var_class_col = None
    for col in ['variantType', 'mutationType', 'Variant_Classification', 'consequence']:
        if col in df.columns:
            var_class_col = col
            break

    if var_class_col is None:
        logger.warning("Variant classification column not found")
        df['mutation_class'] = 'uncertain'
        return df

    # Find gene column
    gene_col = None
    for col in ['gene', 'hugoGeneSymbol', 'Hugo_Symbol', 'Gene']:
        if col in df.columns:
            gene_col = col
            break

    # Find amino acid change column
    aa_col = None
    for col in ['proteinChange', 'aminoAcidChange', 'Amino_Acid_Change', 'HGVSp_Short']:
        if col in df.columns:
            aa_col = col
            break

    def classify_row(row):
        """Classify a single mutation row."""
        var_class = str(row.get(var_class_col, ''))
        base_class = classify_mutation_type(var_class, config)

        if base_class == 'lof':
            return 'lof'

        # Check if it's a hotspot for potentially activating mutations
        if base_class == 'activating' and gene_col and aa_col:
            gene = str(row.get(gene_col, ''))
            aa_change = str(row.get(aa_col, ''))

            gene_hotspots = hotspots.get(gene, [])
            if gene_hotspots:
                for hotspot in gene_hotspots:
                    if hotspot in aa_change:
                        return 'hotspot'

            # Special case: RHOA G17V is functionally LoF (dominant negative)
            if gene == 'RHOA' and 'G17' in aa_change:
                return 'lof'

        return base_class

    df['mutation_class'] = df.apply(classify_row, axis=1)

    # Log classification summary
    class_counts = df['mutation_class'].value_counts()
    logger.info(f"Mutation classification summary:\n{class_counts}")

    return df


def process_cna_data(df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
    """
    Process CNA data, focusing on homozygous deletions for tumor suppressors.

    Args:
        df: CNA DataFrame
        config: Configuration dictionary

    Returns:
        Processed CNA DataFrame
    """
    if df.empty:
        return df

    df = df.copy()

    # Find alteration value column
    alt_col = None
    for col in ['alteration', 'value', 'Alteration']:
        if col in df.columns:
            alt_col = col
            break

    if alt_col is None:
        logger.warning("CNA alteration column not found")
        return df

    # Filter to homozygous deletions (typically -2) and amplifications (typically 2)
    df['cna_type'] = 'neutral'
    df.loc[df[alt_col] == -2, 'cna_type'] = 'homdel'
    df.loc[df[alt_col] == 2, 'cna_type'] = 'amp'

    # Only keep non-neutral CNAs
    df = df[df['cna_type'] != 'neutral'].copy()

    # Find gene column
    gene_col = None
    for col in ['gene', 'hugoGeneSymbol', 'Hugo_Symbol', 'Gene']:
        if col in df.columns:
            gene_col = col
            break

    # Classify CNA effect based on gene's expected effect
    def classify_cna(row):
        gene = str(row.get(gene_col, ''))
        cna_type = row.get('cna_type', '')
        expected = get_expected_effect(gene, config)

        if expected == 'loss_of_function' and cna_type == 'homdel':
            return 'lof'
        elif expected == 'gain_of_function' and cna_type == 'amp':
            return 'activating'
        return 'uncertain'

    df['mutation_class'] = df.apply(classify_cna, axis=1)

    logger.info(f"Processed {len(df)} CNAs (non-neutral)")
    return df


def extract_staging(clinical_df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
    """
    Extract and standardize staging information from clinical data.

    Args:
        clinical_df: Clinical DataFrame (wide format)
        config: Configuration dictionary

    Returns:
        DataFrame with sample/patient IDs and standardized stage
    """
    if clinical_df.empty:
        return clinical_df

    df = clinical_df.copy()

    # Find staging column
    stage_cols = ['TUMOR_STAGE', 'STAGE', 'AJCC_STAGE', 'CLINICAL_STAGE',
                  'ANN_ARBOR_STAGE', 'LUGANO_STAGE', 'stage', 'tumor_stage']

    stage_col = None
    for col in stage_cols:
        if col in df.columns:
            stage_col = col
            break

    if stage_col is None:
        # Try case-insensitive search
        for col in df.columns:
            if 'stage' in col.lower():
                stage_col = col
                break

    if stage_col is None:
        logger.warning("No staging column found in clinical data")
        return df

    # Find sample/patient ID column
    id_col = None
    for col in ['sampleId', 'SAMPLE_ID', 'patientId', 'PATIENT_ID']:
        if col in df.columns:
            id_col = col
            break

    if id_col is None:
        id_col = df.columns[0]

    # Extract staging
    result = pd.DataFrame({
        'sample_id': df[id_col],
        'raw_stage': df[stage_col],
        'study_id': df.get('study_id', 'unknown')
    })

    # Map to standardized categories
    result['stage_category'] = result['raw_stage'].apply(
        lambda x: map_clinical_stage(str(x), config)
    )

    # Log staging summary
    stage_counts = result['stage_category'].value_counts(dropna=False)
    logger.info(f"Staging distribution:\n{stage_counts}")

    return result


def extract_subtype(clinical_df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
    """
    Extract subtype information (GCB vs ABC) from clinical data.

    Args:
        clinical_df: Clinical DataFrame
        config: Configuration dictionary

    Returns:
        DataFrame with sample/patient IDs and subtype classification
    """
    if clinical_df.empty:
        return clinical_df

    df = clinical_df.copy()

    # Find subtype column
    subtype_cols = ['SUBTYPE', 'CELL_OF_ORIGIN', 'COO', 'MOLECULAR_SUBTYPE',
                    'ABC_GCB', 'GCB_ABC', 'subtype', 'cell_of_origin']

    subtype_col = None
    for col in subtype_cols:
        if col in df.columns:
            subtype_col = col
            break

    if subtype_col is None:
        for col in df.columns:
            if 'subtype' in col.lower() or 'gcb' in col.lower() or 'abc' in col.lower():
                subtype_col = col
                break

    if subtype_col is None:
        logger.warning("No subtype column found - cannot filter by GCB")
        return df

    # Find ID column
    id_col = None
    for col in ['sampleId', 'SAMPLE_ID', 'patientId', 'PATIENT_ID']:
        if col in df.columns:
            id_col = col
            break

    result = pd.DataFrame({
        'sample_id': df[id_col],
        'raw_subtype': df[subtype_col],
        'study_id': df.get('study_id', 'unknown')
    })

    # Classify as GCB or not
    result['is_gcb'] = result['raw_subtype'].apply(
        lambda x: is_gcb_subtype(str(x), config)
    )

    logger.info(f"Subtype classification: {result['is_gcb'].value_counts().to_dict()}")

    return result


def merge_data(mutations_df: pd.DataFrame,
               cna_df: Optional[pd.DataFrame],
               staging_df: pd.DataFrame,
               subtype_df: Optional[pd.DataFrame]) -> pd.DataFrame:
    """
    Merge mutation/CNA data with clinical staging.

    Args:
        mutations_df: Processed mutation DataFrame
        cna_df: Processed CNA DataFrame (optional)
        staging_df: Staging DataFrame
        subtype_df: Subtype DataFrame (optional)

    Returns:
        Merged DataFrame
    """
    # Combine mutations and CNAs
    alterations = [mutations_df]
    if cna_df is not None and not cna_df.empty:
        # Standardize CNA columns to match mutations
        cna_df = cna_df.rename(columns={
            'hugoGeneSymbol': 'gene',
            'Hugo_Symbol': 'gene',
            'Gene': 'gene'
        })
        cna_df['alteration_type'] = 'cna'
        alterations.append(cna_df)

    if mutations_df is not None and not mutations_df.empty:
        mutations_df['alteration_type'] = 'mutation'

    combined = pd.concat(alterations, ignore_index=True)

    # Standardize sample ID column
    for col in ['sampleId', 'Tumor_Sample_Barcode', 'Sample_ID']:
        if col in combined.columns:
            combined['sample_id'] = combined[col]
            break

    # Merge with staging
    if 'sample_id' in combined.columns and 'sample_id' in staging_df.columns:
        combined = combined.merge(
            staging_df[['sample_id', 'stage_category']],
            on='sample_id',
            how='left'
        )

    # Merge with subtype if available
    if subtype_df is not None and 'sample_id' in combined.columns:
        combined = combined.merge(
            subtype_df[['sample_id', 'is_gcb']],
            on='sample_id',
            how='left'
        )

    logger.info(f"Merged dataset: {len(combined)} alterations")
    return combined


def assign_pathway(df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
    """
    Assign pathway membership to each alteration.

    Args:
        df: Alteration DataFrame with gene column
        config: Configuration dictionary

    Returns:
        DataFrame with pathway column added
    """
    if df.empty:
        return df

    df = df.copy()
    pathway_genes = get_pathway_genes(config)

    # Find gene column
    gene_col = None
    for col in ['gene', 'hugoGeneSymbol', 'Hugo_Symbol', 'Gene']:
        if col in df.columns:
            gene_col = col
            break

    def get_pathway(gene):
        gene_upper = str(gene).upper()
        for pathway, genes in pathway_genes.items():
            if gene_upper in [g.upper() for g in genes]:
                return pathway
        return 'other'

    df['pathway'] = df[gene_col].apply(get_pathway)

    logger.info(f"Pathway assignment:\n{df['pathway'].value_counts()}")
    return df


def create_sample_summary(df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
    """
    Create sample-level summary with pathway mutation status.

    Args:
        df: Merged alteration DataFrame
        config: Configuration dictionary

    Returns:
        Sample-level summary DataFrame
    """
    if df.empty:
        return df

    pathway_genes = get_pathway_genes(config)

    # Get unique samples
    sample_col = 'sample_id' if 'sample_id' in df.columns else df.columns[0]
    samples = df[[sample_col, 'study_id', 'stage_category']].drop_duplicates()

    if 'is_gcb' in df.columns:
        samples = df[[sample_col, 'study_id', 'stage_category', 'is_gcb']].drop_duplicates()

    # Count mutations per sample per pathway
    for pathway in pathway_genes.keys():
        pathway_df = df[df['pathway'] == pathway]

        # Any mutation in pathway
        mut_samples = pathway_df.groupby(sample_col).size().reset_index(name=f'{pathway}_count')
        samples = samples.merge(mut_samples, on=sample_col, how='left')
        samples[f'{pathway}_count'] = samples[f'{pathway}_count'].fillna(0).astype(int)
        samples[f'{pathway}_mutated'] = samples[f'{pathway}_count'] > 0

        # LoF mutations only
        lof_df = pathway_df[pathway_df['mutation_class'] == 'lof']
        lof_samples = lof_df.groupby(sample_col).size().reset_index(name=f'{pathway}_lof_count')
        samples = samples.merge(lof_samples, on=sample_col, how='left')
        samples[f'{pathway}_lof_count'] = samples[f'{pathway}_lof_count'].fillna(0).astype(int)

    # Gene-level mutation status
    gene_col = 'gene' if 'gene' in df.columns else 'hugoGeneSymbol'
    all_genes = get_all_genes(config)

    for gene in all_genes:
        gene_df = df[df[gene_col].str.upper() == gene.upper()]
        gene_samples = gene_df.groupby(sample_col).size().reset_index(name=f'{gene}_mut')
        samples = samples.merge(gene_samples, on=sample_col, how='left')
        samples[f'{gene}_mut'] = samples[f'{gene}_mut'].fillna(0).astype(int) > 0

    logger.info(f"Created sample summary: {len(samples)} samples")
    return samples


def main():
    """Main processing pipeline."""
    logger.info("Starting mutation processing pipeline")

    # Load configuration and raw data
    config = load_config()
    ensure_directories()
    data = load_raw_data()

    if 'mutations' not in data or data['mutations'].empty:
        logger.error("No mutation data available")
        return

    # Get target genes
    genes = get_all_genes(config)

    # Process mutations
    mutations = filter_genes(data['mutations'], genes)
    mutations = classify_mutations(mutations, config)

    # Process CNAs if available
    cna = None
    if 'cna' in data and not data['cna'].empty:
        cna = filter_genes(data['cna'], genes)
        cna = process_cna_data(cna, config)

    # Extract staging and subtype
    staging = pd.DataFrame()
    subtype = None

    if 'clinical' in data and not data['clinical'].empty:
        staging = extract_staging(data['clinical'], config)
        subtype = extract_subtype(data['clinical'], config)

    # Merge data
    merged = merge_data(mutations, cna, staging, subtype)
    merged = assign_pathway(merged, config)

    # Create sample summary
    sample_summary = create_sample_summary(merged, config)

    # Filter to GCB samples if subtype available
    if 'is_gcb' in sample_summary.columns:
        gcb_only = sample_summary[sample_summary['is_gcb'] == True].copy()
        if len(gcb_only) > 0:
            logger.info(f"Filtered to GCB samples: {len(gcb_only)}")
            save_dataframe(gcb_only, 'sample_summary_gcb.csv', 'processed')

    # Save processed data
    save_dataframe(merged, 'alterations_merged.csv', 'processed')
    save_dataframe(sample_summary, 'sample_summary.csv', 'processed')
    save_dataframe(mutations, 'mutations_classified.csv', 'processed')

    if cna is not None and not cna.empty:
        save_dataframe(cna, 'cna_classified.csv', 'processed')

    if not staging.empty:
        save_dataframe(staging, 'staging.csv', 'processed')

    logger.info("Processing pipeline complete")

    # Print summary
    print("\n" + "=" * 50)
    print("PROCESSING SUMMARY")
    print("=" * 50)
    print(f"Total alterations: {len(merged)}")
    print(f"Total samples: {len(sample_summary)}")

    if 'stage_category' in sample_summary.columns:
        print("\nSamples by stage:")
        print(sample_summary['stage_category'].value_counts(dropna=False))

    if 'tumor_suppressor_mutated' in sample_summary.columns:
        print(f"\nTumor suppressor pathway mutated: {sample_summary['tumor_suppressor_mutated'].sum()}")

    if 'pro_migratory_mutated' in sample_summary.columns:
        print(f"Pro-migratory pathway mutated: {sample_summary['pro_migratory_mutated'].sum()}")

    print("=" * 50)


if __name__ == "__main__":
    main()
