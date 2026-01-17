"""
Utility functions for GC B-cell Lymphoma Pathway Mutation Analysis
"""

import os
import yaml
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).parent.parent.parent


def load_config(config_name: str = "genes.yaml") -> Dict[str, Any]:
    """
    Load configuration from YAML file.

    Args:
        config_name: Name of the config file in the config/ directory

    Returns:
        Dictionary containing configuration
    """
    config_path = get_project_root() / "config" / config_name

    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)

    logger.info(f"Loaded configuration from {config_path}")
    return config


def get_pathway_genes(config: Dict[str, Any]) -> Dict[str, List[str]]:
    """
    Extract gene lists for each pathway from configuration.

    Args:
        config: Loaded configuration dictionary

    Returns:
        Dictionary mapping pathway names to gene symbol lists
    """
    pathway_genes = {}

    for pathway_key, pathway_data in config.get('pathways', {}).items():
        genes = [gene['symbol'] for gene in pathway_data.get('genes', [])]
        pathway_genes[pathway_key] = genes

    return pathway_genes


def get_all_genes(config: Dict[str, Any]) -> List[str]:
    """
    Get flat list of all genes from all pathways.

    Args:
        config: Loaded configuration dictionary

    Returns:
        List of all gene symbols
    """
    all_genes = []
    pathway_genes = get_pathway_genes(config)

    for genes in pathway_genes.values():
        all_genes.extend(genes)

    return list(set(all_genes))


def get_hotspots(config: Dict[str, Any]) -> Dict[str, List[str]]:
    """
    Extract hotspot mutations for each gene.

    Args:
        config: Loaded configuration dictionary

    Returns:
        Dictionary mapping gene symbols to hotspot mutation lists
    """
    hotspots = {}

    for pathway_data in config.get('pathways', {}).values():
        for gene in pathway_data.get('genes', []):
            if 'hotspots' in gene and gene['hotspots']:
                hotspots[gene['symbol']] = gene['hotspots']

    return hotspots


def get_study_ids(config: Dict[str, Any],
                  include_validation: bool = False,
                  include_supplementary: bool = False) -> List[str]:
    """
    Get list of cBioPortal study IDs from configuration.

    Args:
        config: Loaded configuration dictionary
        include_validation: Whether to include validation studies
        include_supplementary: Whether to include supplementary studies

    Returns:
        List of study IDs (excludes GDC-only studies)
    """
    studies = config.get('studies', {})
    study_ids = []

    # Primary studies
    for s in studies.get('primary', []):
        # Skip GDC-only studies
        if s.get('source') != 'GDC':
            study_ids.append(s['study_id'])

    # Validation studies
    if include_validation:
        for s in studies.get('validation', []):
            if s.get('source') != 'GDC':
                study_ids.append(s['study_id'])

    # Supplementary studies
    if include_supplementary:
        for s in studies.get('supplementary', []):
            if s.get('source') != 'GDC':
                study_ids.append(s['study_id'])

    return study_ids


def get_expected_frequencies(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get expected mutation frequencies from literature for validation.

    Args:
        config: Loaded configuration dictionary

    Returns:
        Dictionary with expected frequencies
    """
    return config.get('expected_frequencies', {})


def classify_mutation_type(variant_classification: str, config: Dict[str, Any]) -> str:
    """
    Classify a mutation as loss-of-function, potentially activating, or uncertain.

    Args:
        variant_classification: The variant classification string (e.g., 'Missense_Mutation')
        config: Loaded configuration dictionary

    Returns:
        Classification string: 'lof', 'activating', or 'uncertain'
    """
    classification_rules = config.get('mutation_classification', {})

    # Normalize the variant classification
    variant_lower = variant_classification.lower().replace(' ', '_')

    # Check loss-of-function
    lof_types = [t.lower() for t in classification_rules.get('loss_of_function', [])]
    if variant_lower in lof_types or any(lof in variant_lower for lof in lof_types):
        return 'lof'

    # Check potentially activating
    activating_types = [t.lower() for t in classification_rules.get('potentially_activating', [])]
    if variant_lower in activating_types or any(act in variant_lower for act in activating_types):
        return 'activating'

    return 'uncertain'


def map_clinical_stage(stage_string: str, config: Dict[str, Any],
                       use_binary: bool = True) -> Optional[str]:
    """
    Map raw clinical stage to standardized category.

    Primary analysis uses binary staging:
    - 'early': Stage I only
    - 'late': Stage III-IV

    Args:
        stage_string: Raw stage annotation (e.g., 'Stage IVA', 'III', '1')
        config: Loaded configuration dictionary
        use_binary: If True, return 'early'/'late'/'intermediate'. If False, return detailed.

    Returns:
        Standardized stage category or None if unmappable
    """
    if not stage_string:
        return None

    # Handle various null representations
    stage_str = str(stage_string).strip()
    if stage_str.lower() in ['unknown', 'na', 'nan', 'none', '', 'not reported']:
        return None

    staging_config = config.get('staging', {})

    # Normalize: remove 'stage' prefix, standardize
    stage_normalized = stage_str.upper().replace('STAGE ', '').replace('STAGE', '').strip()

    # Extract just the Roman numeral or number
    # Handle formats: "IVA", "IV", "4", "Stage IV", "III-IV", etc.
    stage_core = stage_normalized.split()[0] if stage_normalized else ''

    # Remove any suffix letters (A, B, E, S)
    for suffix in ['A', 'B', 'E', 'S']:
        stage_core = stage_core.rstrip(suffix)

    if use_binary:
        # Binary classification: early (I) vs late (III-IV) vs intermediate (II)
        early_stages = staging_config.get('early', {}).get('stages', [])
        late_stages = staging_config.get('late', {}).get('stages', [])
        intermediate_stages = staging_config.get('intermediate', {}).get('stages', [])

        # Normalize config stages for comparison
        early_normalized = [s.upper().replace('STAGE ', '') for s in early_stages]
        late_normalized = [s.upper().replace('STAGE ', '') for s in late_stages]
        intermediate_normalized = [s.upper().replace('STAGE ', '') for s in intermediate_stages]

        # Check matches
        if stage_core in early_normalized or stage_normalized in early_normalized:
            return 'early'
        if stage_core in late_normalized or stage_normalized in late_normalized:
            return 'late'
        if stage_core in intermediate_normalized or stage_normalized in intermediate_normalized:
            return 'intermediate'

        # Fallback pattern matching
        if stage_core in ['I', '1'] or stage_normalized.startswith('I') and 'II' not in stage_normalized:
            return 'early'
        elif stage_core in ['III', 'IV', '3', '4'] or any(x in stage_normalized for x in ['III', 'IV', '3', '4']):
            return 'late'
        elif stage_core in ['II', '2'] or stage_normalized.startswith('II'):
            return 'intermediate'

    else:
        # Detailed staging
        detailed = staging_config.get('detailed', {})
        for stage_name, stage_config in detailed.items():
            stage_values = [s.upper() for s in stage_config.get('stages', [])]
            if stage_core in stage_values or stage_normalized in stage_values:
                return stage_name

    return None


def map_stage_to_numeric(stage_category: str) -> Optional[int]:
    """
    Convert stage category to numeric for trend analysis.

    Args:
        stage_category: Stage category ('early', 'intermediate', 'late' or 'stage_I', etc.)

    Returns:
        Numeric stage value (1-4) or None
    """
    mapping = {
        'early': 1,
        'stage_I': 1,
        'intermediate': 2,
        'stage_II': 2,
        'late': 3,  # Combined III-IV
        'stage_III': 3,
        'stage_IV': 4
    }
    return mapping.get(stage_category)


def ensure_directories():
    """Create all necessary output directories if they don't exist."""
    project_root = get_project_root()

    directories = [
        project_root / "data" / "raw",
        project_root / "data" / "processed",
        project_root / "results" / "tables",
        project_root / "results" / "figures",
    ]

    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        logger.debug(f"Ensured directory exists: {directory}")


def get_expected_effect(gene_symbol: str, config: Dict[str, Any]) -> Optional[str]:
    """
    Get the expected mutation effect for a gene.

    Args:
        gene_symbol: Gene symbol
        config: Loaded configuration dictionary

    Returns:
        Expected effect ('loss_of_function' or 'gain_of_function') or None
    """
    for pathway_data in config.get('pathways', {}).values():
        for gene in pathway_data.get('genes', []):
            if gene['symbol'] == gene_symbol:
                return gene.get('expected_effect')
    return None


def is_gcb_subtype(subtype_string: str, config: Dict[str, Any]) -> bool:
    """
    Check if a COO annotation indicates GCB-DLBCL.

    IMPORTANT: S1PR2/GNA13 pathway mutations are GCB-restricted.
    Analysis must filter to GCB-COO only.

    Args:
        subtype_string: COO/subtype annotation string
        config: Loaded configuration dictionary

    Returns:
        True if COO is GCB (should be included in analysis)
    """
    if not subtype_string:
        return False

    # Handle null representations
    subtype_str = str(subtype_string).strip()
    if subtype_str.lower() in ['unknown', 'na', 'nan', 'none', '', 'not reported', 'unclassified']:
        return False

    # Get COO filter config (new structure)
    filters = config.get('filters', {})
    coo_config = filters.get('coo_subtype', filters.get('subtypes', {}))

    include_patterns = [p.lower() for p in coo_config.get('include', [])]
    exclude_patterns = [p.lower() for p in coo_config.get('exclude', [])]

    subtype_lower = subtype_str.lower().replace('-', '_').replace(' ', '_')

    # Check exclusions first (ABC, Non-GCB, etc.)
    for pattern in exclude_patterns:
        pattern_normalized = pattern.lower().replace('-', '_').replace(' ', '_')
        if pattern_normalized in subtype_lower or subtype_lower in pattern_normalized:
            return False

    # Check inclusions (GCB)
    for pattern in include_patterns:
        pattern_normalized = pattern.lower().replace('-', '_').replace(' ', '_')
        if pattern_normalized in subtype_lower or subtype_lower in pattern_normalized:
            return True

    # Additional pattern matching for common COO annotations
    gcb_patterns = ['gcb', 'germinal', 'gc_b', 'gc-b']
    abc_patterns = ['abc', 'activated', 'non_gcb', 'non-gcb', 'nongcb']

    for pattern in abc_patterns:
        if pattern in subtype_lower:
            return False

    for pattern in gcb_patterns:
        if pattern in subtype_lower:
            return True

    return False


def get_coo_column(df, config: Dict[str, Any]) -> Optional[str]:
    """
    Find the COO (cell of origin) column in a DataFrame.

    Args:
        df: pandas DataFrame with clinical data
        config: Loaded configuration dictionary

    Returns:
        Column name containing COO data, or None if not found
    """
    # Get configured COO attribute names
    coo_attrs = config.get('filters', {}).get('coo_attributes', [])

    # Add common variations
    common_attrs = [
        'COO', 'coo', 'CELL_OF_ORIGIN', 'cell_of_origin',
        'COO_WRIGHT', 'coo_wright', 'COO_HANS', 'coo_hans',
        'molecular_subtype', 'MOLECULAR_SUBTYPE',
        'lymph2cx_call', 'LYMPH2CX_CALL',
        'coo_class', 'COO_CLASS', 'subtype', 'SUBTYPE'
    ]

    all_attrs = list(set(coo_attrs + common_attrs))

    for attr in all_attrs:
        if attr in df.columns:
            return attr

    # Try partial matching
    for col in df.columns:
        col_lower = col.lower()
        if 'coo' in col_lower or 'cell_of_origin' in col_lower or 'subtype' in col_lower:
            return col

    return None


def get_stage_column(df, config: Dict[str, Any]) -> Optional[str]:
    """
    Find the stage column in a DataFrame.

    Args:
        df: pandas DataFrame with clinical data
        config: Loaded configuration dictionary

    Returns:
        Column name containing stage data, or None if not found
    """
    # Get configured stage attribute names
    stage_attrs = config.get('stage_attributes', [])

    # Add common variations
    common_attrs = [
        'STAGE', 'stage', 'ANN_ARBOR_STAGE', 'ann_arbor_stage',
        'CLINICAL_STAGE', 'clinical_stage', 'tumor_stage', 'TUMOR_STAGE',
        'ajcc_pathologic_stage', 'AJCC_PATHOLOGIC_STAGE',
        'ann_arbor_clinical_stage', 'ANN_ARBOR_CLINICAL_STAGE',
        'ann_arbor_pathologic_stage', 'ANN_ARBOR_PATHOLOGIC_STAGE'
    ]

    all_attrs = list(set(stage_attrs + common_attrs))

    for attr in all_attrs:
        if attr in df.columns:
            return attr

    # Try partial matching
    for col in df.columns:
        col_lower = col.lower()
        if 'stage' in col_lower and 'substage' not in col_lower:
            return col

    return None


def save_dataframe(df, filename: str, subdir: str = "processed"):
    """
    Save a pandas DataFrame to the appropriate data directory.

    Args:
        df: pandas DataFrame to save
        filename: Output filename (with extension)
        subdir: Subdirectory under data/ ('raw' or 'processed')
    """
    import pandas as pd

    output_path = get_project_root() / "data" / subdir / filename

    if filename.endswith('.csv'):
        df.to_csv(output_path, index=False)
    elif filename.endswith('.tsv'):
        df.to_csv(output_path, sep='\t', index=False)
    elif filename.endswith('.parquet'):
        df.to_parquet(output_path, index=False)
    else:
        df.to_csv(output_path, index=False)

    logger.info(f"Saved {len(df)} rows to {output_path}")


def load_dataframe(filename: str, subdir: str = "processed"):
    """
    Load a pandas DataFrame from the data directory.

    Args:
        filename: Input filename (with extension)
        subdir: Subdirectory under data/ ('raw' or 'processed')

    Returns:
        pandas DataFrame
    """
    import pandas as pd

    input_path = get_project_root() / "data" / subdir / filename

    if not input_path.exists():
        raise FileNotFoundError(f"Data file not found: {input_path}")

    if filename.endswith('.csv'):
        return pd.read_csv(input_path)
    elif filename.endswith('.tsv'):
        return pd.read_csv(input_path, sep='\t')
    elif filename.endswith('.parquet'):
        return pd.read_parquet(input_path)
    else:
        return pd.read_csv(input_path)
