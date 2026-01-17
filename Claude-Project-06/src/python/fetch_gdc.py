"""
GDC Data Acquisition Module
Fetches mutation and clinical data from NCI Genomic Data Commons

Primary dataset: NCICCR-DLBCL (Schmitz et al. NEJM 2018)
- 574 pre-treatment DLBCL biopsies
- WES + RNA-seq + Copy Number
- COO classification (ABC/GCB/Unclassified)
- Clinical staging available

Note: Some GDC data requires dbGaP authorization.
This module handles both open-access and provides instructions for controlled data.
"""

import requests
import pandas as pd
import time
import logging
import json
from typing import List, Dict, Optional, Any
from pathlib import Path
from io import StringIO

from utils import (
    load_config,
    get_all_genes,
    ensure_directories,
    save_dataframe,
    get_project_root,
    logger
)

# GDC API endpoints
GDC_API_BASE = "https://api.gdc.cancer.gov"
GDC_FILES_ENDPOINT = f"{GDC_API_BASE}/files"
GDC_CASES_ENDPOINT = f"{GDC_API_BASE}/cases"
GDC_PROJECTS_ENDPOINT = f"{GDC_API_BASE}/projects"

# Rate limiting
REQUEST_DELAY = 0.3
MAX_RETRIES = 3

# NCICCR-DLBCL project ID
NCICCR_PROJECT = "NCICCR-DLBCL"


class GDCClient:
    """Client for interacting with GDC API."""

    def __init__(self, base_url: str = GDC_API_BASE):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })

    def _request(self, endpoint: str, method: str = 'GET',
                 params: Optional[Dict] = None,
                 json_data: Optional[Any] = None,
                 stream: bool = False) -> Any:
        """Make API request with retry logic."""
        url = f"{self.base_url}/{endpoint}" if not endpoint.startswith('http') else endpoint

        for attempt in range(MAX_RETRIES):
            try:
                if method == 'GET':
                    response = self.session.get(url, params=params, stream=stream)
                elif method == 'POST':
                    response = self.session.post(url, params=params, json=json_data, stream=stream)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")

                response.raise_for_status()
                time.sleep(REQUEST_DELAY)

                if stream:
                    return response
                return response.json()

            except requests.exceptions.RequestException as e:
                logger.warning(f"Request failed (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise

    def get_project_info(self, project_id: str) -> Dict:
        """Get project metadata."""
        return self._request(f"projects/{project_id}")

    def get_cases(self, project_id: str, fields: Optional[List[str]] = None) -> List[Dict]:
        """
        Get all cases for a project with clinical data.

        Args:
            project_id: GDC project ID (e.g., 'NCICCR-DLBCL')
            fields: Specific fields to retrieve

        Returns:
            List of case records with clinical data
        """
        default_fields = [
            "case_id",
            "submitter_id",
            "primary_site",
            "disease_type",
            "diagnoses.tumor_stage",
            "diagnoses.ajcc_clinical_stage",
            "diagnoses.ajcc_pathologic_stage",
            "diagnoses.ann_arbor_clinical_stage",
            "diagnoses.ann_arbor_pathologic_stage",
            "diagnoses.primary_diagnosis",
            "diagnoses.tissue_or_organ_of_origin",
            "diagnoses.age_at_diagnosis",
            "diagnoses.vital_status",
            "diagnoses.days_to_death",
            "diagnoses.days_to_last_follow_up",
            "demographic.gender",
            "demographic.race",
            "demographic.ethnicity",
            "samples.sample_id",
            "samples.sample_type",
            "samples.tissue_type"
        ]

        fields = fields or default_fields
        all_cases = []
        offset = 0
        size = 100

        while True:
            filters = {
                "op": "in",
                "content": {
                    "field": "project.project_id",
                    "value": [project_id]
                }
            }

            params = {
                "filters": json.dumps(filters),
                "fields": ",".join(fields),
                "size": size,
                "from": offset
            }

            response = self._request("cases", params=params)
            hits = response.get("data", {}).get("hits", [])

            if not hits:
                break

            all_cases.extend(hits)
            logger.info(f"  Retrieved {len(all_cases)} cases...")

            if len(hits) < size:
                break
            offset += size

        return all_cases

    def get_maf_files(self, project_id: str) -> List[Dict]:
        """
        Get MAF (mutation annotation format) files for a project.

        Args:
            project_id: GDC project ID

        Returns:
            List of MAF file metadata
        """
        filters = {
            "op": "and",
            "content": [
                {
                    "op": "in",
                    "content": {
                        "field": "cases.project.project_id",
                        "value": [project_id]
                    }
                },
                {
                    "op": "in",
                    "content": {
                        "field": "data_format",
                        "value": ["MAF"]
                    }
                }
            ]
        }

        fields = [
            "file_id",
            "file_name",
            "data_type",
            "data_format",
            "data_category",
            "access",
            "file_size",
            "cases.case_id",
            "cases.submitter_id"
        ]

        params = {
            "filters": json.dumps(filters),
            "fields": ",".join(fields),
            "size": 1000
        }

        response = self._request("files", params=params)
        return response.get("data", {}).get("hits", [])

    def download_file(self, file_id: str, output_path: Path) -> bool:
        """
        Download a file from GDC.

        Note: Controlled access files require authentication token.
        """
        try:
            response = self._request(
                f"data/{file_id}",
                stream=True
            )

            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            logger.info(f"  Downloaded: {output_path.name}")
            return True

        except Exception as e:
            logger.warning(f"  Failed to download {file_id}: {e}")
            return False


def fetch_nciccr_clinical_data(client: GDCClient) -> pd.DataFrame:
    """
    Fetch clinical data for NCICCR-DLBCL project.

    Returns:
        DataFrame with clinical data including staging and demographics
    """
    logger.info(f"Fetching clinical data for {NCICCR_PROJECT}")

    cases = client.get_cases(NCICCR_PROJECT)

    if not cases:
        logger.warning("No cases retrieved from GDC")
        return pd.DataFrame()

    # Flatten nested structure
    records = []
    for case in cases:
        record = {
            'case_id': case.get('case_id'),
            'submitter_id': case.get('submitter_id'),
            'primary_site': case.get('primary_site'),
            'disease_type': case.get('disease_type'),
            'study_id': NCICCR_PROJECT
        }

        # Extract diagnoses (may be a list)
        diagnoses = case.get('diagnoses', [])
        if diagnoses and isinstance(diagnoses, list):
            diag = diagnoses[0]  # Take first diagnosis
            record['tumor_stage'] = diag.get('tumor_stage')
            record['ajcc_clinical_stage'] = diag.get('ajcc_clinical_stage')
            record['ajcc_pathologic_stage'] = diag.get('ajcc_pathologic_stage')
            record['ann_arbor_clinical_stage'] = diag.get('ann_arbor_clinical_stage')
            record['ann_arbor_pathologic_stage'] = diag.get('ann_arbor_pathologic_stage')
            record['primary_diagnosis'] = diag.get('primary_diagnosis')
            record['age_at_diagnosis'] = diag.get('age_at_diagnosis')
            record['vital_status'] = diag.get('vital_status')
            record['days_to_death'] = diag.get('days_to_death')
            record['days_to_last_follow_up'] = diag.get('days_to_last_follow_up')

        # Extract demographics
        demographic = case.get('demographic', {})
        if demographic:
            record['gender'] = demographic.get('gender')
            record['race'] = demographic.get('race')
            record['ethnicity'] = demographic.get('ethnicity')

        # Extract sample info
        samples = case.get('samples', [])
        if samples:
            record['n_samples'] = len(samples)
            sample_types = [s.get('sample_type') for s in samples if s.get('sample_type')]
            record['sample_types'] = ';'.join(set(sample_types))

        records.append(record)

    df = pd.DataFrame(records)
    logger.info(f"  Retrieved {len(df)} cases with clinical data")

    return df


def fetch_publication_supplementary_data() -> Dict[str, pd.DataFrame]:
    """
    Fetch supplementary data from the Schmitz et al. 2018 publication.

    The publication supplements contain:
    - COO classification (ABC/GCB/Unclassified)
    - LymphGen genetic subtypes (MCD, BN2, N1, EZB)
    - Mutation calls for pathway genes

    Returns:
        Dictionary with supplementary DataFrames
    """
    logger.info("Fetching publication supplementary data...")

    # URLs for supplementary data from GDC publication page
    supp_base = "https://gdc.cancer.gov/files"

    # Note: These URLs need to be verified/updated
    # The actual supplement files are in the NEJM supplementary materials
    supplements = {}

    logger.info("""
    MANUAL DOWNLOAD REQUIRED:
    The Schmitz et al. 2018 supplementary data must be downloaded manually:

    1. Go to: https://gdc.cancer.gov/about-data/publications/DLBCL-2018
    2. Download 'Supplementary Appendix 2.xlsx' - contains:
       - Clinical annotations including COO
       - LymphGen genetic subtypes
       - Mutation data for all genes

    3. Save to: data/raw/schmitz_2018_supplementary.xlsx

    Alternatively, download MAF files from GDC Portal (requires dbGaP access):
    https://portal.gdc.cancer.gov/projects/NCICCR-DLBCL
    """)

    return supplements


def parse_schmitz_supplementary(filepath: Path) -> Dict[str, pd.DataFrame]:
    """
    Parse the Schmitz et al. 2018 supplementary Excel file.

    Args:
        filepath: Path to downloaded Supplementary Appendix 2.xlsx

    Returns:
        Dictionary with parsed DataFrames:
        - 'clinical': Clinical data with COO, staging, LymphGen
        - 'mutations': Mutation calls for all genes
    """
    if not filepath.exists():
        logger.warning(f"Supplementary file not found: {filepath}")
        return {}

    logger.info(f"Parsing supplementary data from {filepath}")

    try:
        # Read Excel file - sheet names may vary
        xl = pd.ExcelFile(filepath)
        logger.info(f"  Available sheets: {xl.sheet_names}")

        result = {}

        # Try to find clinical/sample annotation sheet
        for sheet in xl.sheet_names:
            sheet_lower = sheet.lower()
            if any(x in sheet_lower for x in ['clinical', 'sample', 'patient', 'annotation']):
                result['clinical'] = pd.read_excel(xl, sheet_name=sheet)
                logger.info(f"  Loaded clinical data from '{sheet}': {len(result['clinical'])} rows")

            elif any(x in sheet_lower for x in ['mutation', 'variant', 'snv']):
                result['mutations'] = pd.read_excel(xl, sheet_name=sheet)
                logger.info(f"  Loaded mutation data from '{sheet}': {len(result['mutations'])} rows")

        return result

    except Exception as e:
        logger.error(f"Failed to parse supplementary file: {e}")
        return {}


def extract_pathway_mutations(mutations_df: pd.DataFrame,
                               genes: List[str]) -> pd.DataFrame:
    """
    Extract mutations for pathway genes from mutation table.

    Args:
        mutations_df: Full mutation DataFrame
        genes: List of gene symbols to extract

    Returns:
        Filtered DataFrame with pathway gene mutations only
    """
    if mutations_df.empty:
        return mutations_df

    # Find the gene symbol column
    gene_col = None
    for col in ['Hugo_Symbol', 'gene', 'Gene', 'SYMBOL', 'gene_symbol']:
        if col in mutations_df.columns:
            gene_col = col
            break

    if not gene_col:
        logger.warning("Could not identify gene symbol column in mutations")
        return pd.DataFrame()

    # Filter to pathway genes
    filtered = mutations_df[mutations_df[gene_col].isin(genes)].copy()
    logger.info(f"  Extracted {len(filtered)} mutations in {len(genes)} pathway genes")

    return filtered


def main():
    """Main entry point for GDC data fetching."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Fetch DLBCL mutation data from GDC (NCICCR-DLBCL)"
    )
    parser.add_argument(
        '--clinical-only', action='store_true',
        help='Only fetch clinical data (no MAF files)'
    )
    parser.add_argument(
        '--parse-supplement', type=str,
        help='Parse downloaded supplementary Excel file'
    )
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("GDC DATA ACQUISITION: NCICCR-DLBCL (Schmitz 2018)")
    logger.info("=" * 60)
    logger.info("Dataset: 574 pre-treatment DLBCL biopsies")
    logger.info("COO: ABC (51.4%), GCB (28.6%), Unclassified (20.0%)")
    logger.info("Reference: Schmitz et al. NEJM 2018;378:1396-1407")
    logger.info("=" * 60)

    config = load_config()
    ensure_directories()
    genes = get_all_genes(config)

    # Parse supplementary file if provided
    if args.parse_supplement:
        supp_path = Path(args.parse_supplement)
        supp_data = parse_schmitz_supplementary(supp_path)

        if 'clinical' in supp_data:
            save_dataframe(supp_data['clinical'], 'nciccr_clinical_supplement.csv', 'raw')

        if 'mutations' in supp_data:
            # Extract pathway genes
            pathway_muts = extract_pathway_mutations(supp_data['mutations'], genes)
            save_dataframe(supp_data['mutations'], 'nciccr_mutations_all.csv', 'raw')
            save_dataframe(pathway_muts, 'nciccr_mutations_pathway.csv', 'raw')

        return

    # Fetch from GDC API
    client = GDCClient()

    # Get clinical data
    clinical_df = fetch_nciccr_clinical_data(client)
    if not clinical_df.empty:
        save_dataframe(clinical_df, 'nciccr_clinical_gdc.csv', 'raw')

    # Check for MAF files
    if not args.clinical_only:
        logger.info("\nChecking for MAF files...")
        maf_files = client.get_maf_files(NCICCR_PROJECT)

        if maf_files:
            logger.info(f"Found {len(maf_files)} MAF files")

            # Check access levels
            open_access = [f for f in maf_files if f.get('access') == 'open']
            controlled = [f for f in maf_files if f.get('access') == 'controlled']

            logger.info(f"  Open access: {len(open_access)}")
            logger.info(f"  Controlled access: {len(controlled)}")

            if controlled:
                logger.info("""
    NOTE: MAF files require dbGaP authorization (phs001444).
    To download:
    1. Apply for access at dbGaP: https://www.ncbi.nlm.nih.gov/gap/
    2. Use GDC Data Transfer Tool with authentication token
    3. Or download from GDC Portal after login

    Alternative: Download supplementary data from publication:
    https://gdc.cancer.gov/about-data/publications/DLBCL-2018
                """)

            # Save file metadata
            maf_meta = pd.DataFrame(maf_files)
            save_dataframe(maf_meta, 'nciccr_maf_files_metadata.csv', 'raw')
        else:
            logger.info("No MAF files found (may require authentication)")

    # Provide instructions for supplementary data
    fetch_publication_supplementary_data()

    # Summary
    print("\n" + "=" * 60)
    print("GDC DATA ACQUISITION SUMMARY")
    print("=" * 60)
    print(f"Project: {NCICCR_PROJECT}")
    print(f"Cases retrieved: {len(clinical_df)}")
    print("-" * 60)
    print("Clinical columns available:")
    if not clinical_df.empty:
        for col in clinical_df.columns:
            non_null = clinical_df[col].notna().sum()
            print(f"  {col}: {non_null}/{len(clinical_df)} non-null")
    print("=" * 60)
    print(f"Data saved to: {get_project_root() / 'data' / 'raw'}")
    print("\nNEXT STEPS:")
    print("1. Download Schmitz 2018 supplementary data (contains COO + mutations)")
    print("2. Run: python fetch_gdc.py --parse-supplement <path_to_xlsx>")
    print("3. Run: python process_mutations.py")


if __name__ == "__main__":
    main()
