"""
cBioPortal Data Acquisition Module
Fetches mutation and clinical data for FL/DLBCL pathway analysis

Primary dataset: BCGSC NHL 2013 (Morin et al.) - FL + DLBCL combined
Validation: DFCI 2018, TCGA DLBCL
"""

import requests
import pandas as pd
import time
import logging
from typing import List, Dict, Optional, Any
from pathlib import Path

from utils import (
    load_config,
    get_all_genes,
    ensure_directories,
    save_dataframe,
    get_project_root,
    logger
)

# cBioPortal API base URL
CBIOPORTAL_API_BASE = "https://www.cbioportal.org/api"

# Rate limiting settings
REQUEST_DELAY = 0.5  # seconds between requests
MAX_RETRIES = 3


def get_study_ids_from_config(config: Dict[str, Any],
                               include_validation: bool = False,
                               include_supplementary: bool = False) -> List[str]:
    """
    Extract study IDs from configuration, handling new structure.

    Args:
        config: Configuration dictionary
        include_validation: Include validation datasets
        include_supplementary: Include supplementary datasets

    Returns:
        List of cBioPortal study IDs
    """
    studies = config.get('studies', {})
    study_ids = []

    # Primary studies (always included)
    for study in studies.get('primary', []):
        if study.get('source', 'cBioPortal') == 'cBioPortal' or 'source' not in study:
            study_ids.append(study['study_id'])

    # Validation studies
    if include_validation:
        for study in studies.get('validation', []):
            # Skip GDC-only studies for cBioPortal fetcher
            if study.get('source') == 'GDC':
                logger.info(f"Skipping GDC study {study['study_id']} - use GDC fetcher")
                continue
            study_ids.append(study['study_id'])

    # Supplementary studies
    if include_supplementary:
        for study in studies.get('supplementary', []):
            study_ids.append(study['study_id'])

    return study_ids


class CBioPortalClient:
    """Client for interacting with cBioPortal API."""

    def __init__(self, base_url: str = CBIOPORTAL_API_BASE):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })

    def _request(self, endpoint: str, method: str = 'GET',
                 params: Optional[Dict] = None,
                 json_data: Optional[Any] = None) -> Any:
        """
        Make an API request with retry logic.

        Args:
            endpoint: API endpoint (without base URL)
            method: HTTP method
            params: Query parameters
            json_data: JSON body for POST requests

        Returns:
            JSON response data
        """
        url = f"{self.base_url}/{endpoint}"

        for attempt in range(MAX_RETRIES):
            try:
                if method == 'GET':
                    response = self.session.get(url, params=params)
                elif method == 'POST':
                    response = self.session.post(url, params=params, json=json_data)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")

                response.raise_for_status()
                time.sleep(REQUEST_DELAY)
                return response.json()

            except requests.exceptions.RequestException as e:
                logger.warning(f"Request failed (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise

    def get_studies(self) -> List[Dict]:
        """Get list of all available studies."""
        return self._request("studies")

    def get_study(self, study_id: str) -> Dict:
        """Get details for a specific study."""
        return self._request(f"studies/{study_id}")

    def get_samples(self, study_id: str) -> List[Dict]:
        """Get all samples for a study."""
        return self._request(f"studies/{study_id}/samples")

    def get_clinical_data(self, study_id: str) -> List[Dict]:
        """Get clinical data for all samples in a study."""
        return self._request(
            f"studies/{study_id}/clinical-data",
            params={'clinicalDataType': 'SAMPLE'}
        )

    def get_patient_clinical_data(self, study_id: str) -> List[Dict]:
        """Get patient-level clinical data for a study."""
        return self._request(
            f"studies/{study_id}/clinical-data",
            params={'clinicalDataType': 'PATIENT'}
        )

    def get_mutations_by_genes(self, study_id: str, molecular_profile_id: str,
                               gene_symbols: List[str]) -> List[Dict]:
        """
        Get mutations for specific genes in a study.

        Args:
            study_id: cBioPortal study ID
            molecular_profile_id: Molecular profile ID (usually study_id + '_mutations')
            gene_symbols: List of gene symbols to query

        Returns:
            List of mutation records
        """
        # First get entrez gene IDs
        gene_ids = self._get_gene_ids(gene_symbols)

        if not gene_ids:
            logger.warning(f"No gene IDs found for symbols: {gene_symbols}")
            return []

        # Query mutations
        payload = {
            "sampleListId": f"{study_id}_all",
            "entrezGeneIds": gene_ids
        }

        return self._request(
            f"molecular-profiles/{molecular_profile_id}/mutations/fetch",
            method='POST',
            json_data=payload
        )

    def _get_gene_ids(self, gene_symbols: List[str]) -> List[int]:
        """Convert gene symbols to Entrez gene IDs."""
        genes = self._request("genes/fetch", method='POST', json_data=gene_symbols)
        return [g['entrezGeneId'] for g in genes if 'entrezGeneId' in g]

    def get_molecular_profiles(self, study_id: str) -> List[Dict]:
        """Get available molecular profiles for a study."""
        return self._request(f"studies/{study_id}/molecular-profiles")

    def get_cna_by_genes(self, study_id: str, molecular_profile_id: str,
                         gene_symbols: List[str]) -> List[Dict]:
        """
        Get copy number alterations for specific genes.

        Args:
            study_id: cBioPortal study ID
            molecular_profile_id: CNA profile ID
            gene_symbols: List of gene symbols

        Returns:
            List of CNA records
        """
        gene_ids = self._get_gene_ids(gene_symbols)

        if not gene_ids:
            return []

        payload = {
            "sampleListId": f"{study_id}_all",
            "entrezGeneIds": gene_ids
        }

        try:
            return self._request(
                f"molecular-profiles/{molecular_profile_id}/discrete-copy-number/fetch",
                method='POST',
                json_data=payload
            )
        except requests.exceptions.HTTPError as e:
            logger.warning(f"CNA data not available for {study_id}: {e}")
            return []


def fetch_study_data(client: CBioPortalClient, study_id: str,
                     genes: List[str]) -> Dict[str, pd.DataFrame]:
    """
    Fetch all relevant data for a single study.

    Args:
        client: CBioPortalClient instance
        study_id: Study ID to fetch
        genes: List of gene symbols

    Returns:
        Dictionary with 'mutations', 'cna', 'clinical', 'samples' DataFrames
    """
    logger.info(f"Fetching data for study: {study_id}")
    result = {}

    # Get molecular profiles
    try:
        profiles = client.get_molecular_profiles(study_id)
        mutation_profile = None
        cna_profile = None

        for p in profiles:
            if p['molecularAlterationType'] == 'MUTATION_EXTENDED':
                mutation_profile = p['molecularProfileId']
            elif p['molecularAlterationType'] == 'COPY_NUMBER_ALTERATION':
                if 'gistic' not in p['molecularProfileId'].lower():
                    cna_profile = p['molecularProfileId']

        logger.info(f"  Mutation profile: {mutation_profile}")
        logger.info(f"  CNA profile: {cna_profile}")
    except Exception as e:
        logger.error(f"Failed to get profiles for {study_id}: {e}")
        return result

    # Fetch mutations
    if mutation_profile:
        try:
            mutations = client.get_mutations_by_genes(study_id, mutation_profile, genes)
            if mutations:
                result['mutations'] = pd.DataFrame(mutations)
                result['mutations']['study_id'] = study_id
                logger.info(f"  Retrieved {len(mutations)} mutations")
            else:
                logger.info(f"  No mutations found for target genes")
        except Exception as e:
            logger.error(f"Failed to fetch mutations: {e}")

    # Fetch CNAs
    if cna_profile:
        try:
            cnas = client.get_cna_by_genes(study_id, cna_profile, genes)
            if cnas:
                result['cna'] = pd.DataFrame(cnas)
                result['cna']['study_id'] = study_id
                logger.info(f"  Retrieved {len(cnas)} CNA records")
        except Exception as e:
            logger.warning(f"Failed to fetch CNA data: {e}")

    # Fetch clinical data (both sample and patient level)
    try:
        sample_clinical = client.get_clinical_data(study_id)
        patient_clinical = client.get_patient_clinical_data(study_id)

        clinical_records = sample_clinical + patient_clinical
        if clinical_records:
            result['clinical'] = pd.DataFrame(clinical_records)
            result['clinical']['study_id'] = study_id
            logger.info(f"  Retrieved {len(clinical_records)} clinical records")
    except Exception as e:
        logger.error(f"Failed to fetch clinical data: {e}")

    # Fetch sample list
    try:
        samples = client.get_samples(study_id)
        if samples:
            result['samples'] = pd.DataFrame(samples)
            result['samples']['study_id'] = study_id
            logger.info(f"  Retrieved {len(samples)} samples")
    except Exception as e:
        logger.error(f"Failed to fetch samples: {e}")

    return result


def pivot_clinical_data(clinical_df: pd.DataFrame) -> pd.DataFrame:
    """
    Pivot clinical data from long to wide format.

    Args:
        clinical_df: Clinical data in long format (one row per attribute)

    Returns:
        Wide format DataFrame with one row per sample/patient
    """
    if clinical_df.empty:
        return clinical_df

    # Handle sample-level data
    sample_data = clinical_df[clinical_df['clinicalAttributeId'].notna()].copy()

    if sample_data.empty:
        return clinical_df

    # Pivot to wide format
    try:
        # Use sampleId if available, otherwise patientId
        id_col = 'sampleId' if 'sampleId' in sample_data.columns else 'patientId'

        pivoted = sample_data.pivot_table(
            index=['study_id', id_col],
            columns='clinicalAttributeId',
            values='value',
            aggfunc='first'
        ).reset_index()

        return pivoted
    except Exception as e:
        logger.warning(f"Failed to pivot clinical data: {e}")
        return clinical_df


def fetch_all_studies(config: Dict[str, Any],
                      include_validation: bool = False,
                      include_supplementary: bool = False) -> Dict[str, pd.DataFrame]:
    """
    Fetch data from all configured cBioPortal studies.

    Args:
        config: Configuration dictionary
        include_validation: Whether to include validation studies
        include_supplementary: Whether to include supplementary studies

    Returns:
        Dictionary with combined DataFrames for all data types
    """
    client = CBioPortalClient()
    genes = get_all_genes(config)
    study_ids = get_study_ids_from_config(config, include_validation, include_supplementary)

    logger.info(f"Fetching data for {len(study_ids)} studies")
    logger.info(f"Target genes: {genes}")

    all_mutations = []
    all_cna = []
    all_clinical = []
    all_samples = []

    for study_id in study_ids:
        try:
            study_data = fetch_study_data(client, study_id, genes)

            if 'mutations' in study_data:
                all_mutations.append(study_data['mutations'])
            if 'cna' in study_data:
                all_cna.append(study_data['cna'])
            if 'clinical' in study_data:
                all_clinical.append(study_data['clinical'])
            if 'samples' in study_data:
                all_samples.append(study_data['samples'])

        except Exception as e:
            logger.error(f"Failed to fetch study {study_id}: {e}")
            continue

    result = {}

    if all_mutations:
        result['mutations'] = pd.concat(all_mutations, ignore_index=True)
        logger.info(f"Total mutations: {len(result['mutations'])}")

    if all_cna:
        result['cna'] = pd.concat(all_cna, ignore_index=True)
        logger.info(f"Total CNA records: {len(result['cna'])}")

    if all_clinical:
        combined_clinical = pd.concat(all_clinical, ignore_index=True)
        result['clinical_long'] = combined_clinical
        result['clinical'] = pivot_clinical_data(combined_clinical)
        logger.info(f"Total clinical records: {len(result['clinical'])}")

    if all_samples:
        result['samples'] = pd.concat(all_samples, ignore_index=True)
        logger.info(f"Total samples: {len(result['samples'])}")

    return result


def main():
    """Main entry point for data fetching."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Fetch FL/DLBCL mutation data from cBioPortal"
    )
    parser.add_argument(
        '--validation', action='store_true',
        help='Include validation datasets (DFCI 2018, etc.)'
    )
    parser.add_argument(
        '--supplementary', action='store_true',
        help='Include supplementary datasets (TCGA, etc.)'
    )
    parser.add_argument(
        '--all', action='store_true',
        help='Fetch all configured datasets'
    )
    args = parser.parse_args()

    logger.info("Starting cBioPortal data acquisition")
    logger.info("=" * 50)
    logger.info("PRIMARY DATASET: BCGSC NHL 2013 (Morin et al.)")
    logger.info("  - Combined FL + DLBCL cohort")
    logger.info("  - Foundational S1PR2/GNA13 pathway study")
    logger.info("=" * 50)

    # Load configuration
    config = load_config()
    ensure_directories()

    # Determine which studies to fetch
    include_validation = args.validation or args.all
    include_supplementary = args.supplementary or args.all

    # Show expected frequencies for validation
    expected = config.get('expected_frequencies', {})
    if expected:
        logger.info("Expected mutation frequencies (from literature):")
        ts_freq = expected.get('tumor_suppressor_pathway', {})
        logger.info(f"  Tumor suppressor pathway: {ts_freq.get('combined', 'N/A')}")
        logger.info(f"  GNA13: {ts_freq.get('GNA13', 'N/A')}")

    # Fetch all data
    data = fetch_all_studies(
        config,
        include_validation=include_validation,
        include_supplementary=include_supplementary
    )

    # Save raw data
    if 'mutations' in data:
        save_dataframe(data['mutations'], 'mutations_raw.csv', 'raw')

    if 'cna' in data:
        save_dataframe(data['cna'], 'cna_raw.csv', 'raw')

    if 'clinical' in data:
        save_dataframe(data['clinical'], 'clinical_wide.csv', 'raw')

    if 'clinical_long' in data:
        save_dataframe(data['clinical_long'], 'clinical_long.csv', 'raw')

    if 'samples' in data:
        save_dataframe(data['samples'], 'samples.csv', 'raw')

    logger.info("Data acquisition complete")

    # Print summary
    print("\n" + "=" * 60)
    print("DATA ACQUISITION SUMMARY")
    print("=" * 60)
    print("Primary: BCGSC NHL 2013 (Morin et al.) - FL + DLBCL")
    print("-" * 60)

    if 'mutations' in data:
        print(f"Mutations: {len(data['mutations'])} records")
        gene_col = None
        for col in ['gene', 'hugoGeneSymbol', 'Hugo_Symbol']:
            if col in data['mutations'].columns:
                gene_col = col
                break
        if gene_col:
            print(f"  Genes: {data['mutations'][gene_col].nunique()} unique")
            print(f"  Gene counts:")
            for gene, count in data['mutations'][gene_col].value_counts().head(10).items():
                print(f"    {gene}: {count}")
        if 'study_id' in data['mutations'].columns:
            print(f"  Studies: {data['mutations']['study_id'].nunique()}")
            for study, count in data['mutations']['study_id'].value_counts().items():
                print(f"    {study}: {count} mutations")

    if 'cna' in data:
        print(f"\nCNAs: {len(data['cna'])} records")

    if 'clinical' in data:
        print(f"\nClinical: {len(data['clinical'])} samples/patients")

    print("=" * 60)
    print(f"Raw data saved to: {get_project_root() / 'data' / 'raw'}")
    print("\nNext step: python process_mutations.py")


if __name__ == "__main__":
    main()
