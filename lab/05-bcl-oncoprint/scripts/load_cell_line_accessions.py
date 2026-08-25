#!/usr/bin/env python3
"""
Load cell line accessions from the comprehensive accession table.
Generated from systematic Cellosaurus queries on 2026-02-03.
"""

import pandas as pd
import sys
from pathlib import Path

def load_accessions():
    """Load complete cell line accessions table."""
    csv_path = Path(__file__).parent.parent / "cell_line_accessions_complete.csv"
    
    if not csv_path.exists():
        print(f"ERROR: Accessions file not found at {csv_path}")
        sys.exit(1)
    
    df = pd.read_csv(csv_path)
    return df

def get_accession(cell_line, df=None):
    """
    Get accession info for a specific cell line.
    
    Parameters
    ----------
    cell_line : str
        Cell line name
    df : pd.DataFrame, optional
        Accessions dataframe (loaded if not provided)
    
    Returns
    -------
    dict or None
        Dictionary with DSMZ_ACC, ATCC_Catalog, and other identifiers, or None if not found
    """
    if df is None:
        df = load_accessions()
    
    match = df[df['Cell_Line'] == cell_line]
    if match.empty:
        return None
    
    row = match.iloc[0]
    return {
        'cell_line': row['Cell_Line'],
        'cell_type': row['Cell_Type'],
        'cvcl': row['Cellosaurus_CVCL'],
        'dsmz': row['DSMZ_ACC'] if pd.notna(row['DSMZ_ACC']) else None,
        'atcc': row['ATCC_Catalog'] if pd.notna(row['ATCC_Catalog']) else None,
        'jcrb': row['Source_JCRB'] if pd.notna(row['Source_JCRB']) else None,
        'rcb': row['Source_RCB'] if pd.notna(row['Source_RCB']) else None,
        'ecacc': row['Source_ECACC'] if pd.notna(row['Source_ECACC']) else None,
        'notes': row['Notes'] if pd.notna(row['Notes']) else None,
    }

def print_accessions_table(df, status_filter=None):
    """
    Print formatted table of accessions.
    
    Parameters
    ----------
    df : pd.DataFrame
        Accessions dataframe
    status_filter : str, optional
        Filter by status: 'complete' (both DSMZ+ATCC), 'dsmz_only', 'atcc_only', etc.
    """
    if status_filter == 'complete':
        mask = df['DSMZ_ACC'].notna() & df['ATCC_Catalog'].notna()
        print(f"Cell lines with BOTH DSMZ and ATCC ({mask.sum()} lines):")
    elif status_filter == 'dsmz_only':
        mask = df['DSMZ_ACC'].notna() & df['ATCC_Catalog'].isna()
        print(f"Cell lines with DSMZ only ({mask.sum()} lines):")
    elif status_filter == 'atcc_only':
        mask = df['DSMZ_ACC'].isna() & df['ATCC_Catalog'].notna()
        print(f"Cell lines with ATCC only ({mask.sum()} lines):")
    elif status_filter == 'none':
        mask = df['DSMZ_ACC'].isna() & df['ATCC_Catalog'].isna()
        print(f"Cell lines with neither DSMZ nor ATCC ({mask.sum()} lines):")
    else:
        mask = pd.Series([True] * len(df))
        print(f"All {len(df)} cell lines:")
    
    filtered = df[mask]
    print(filtered[['Cell_Line', 'Cell_Type', 'DSMZ_ACC', 'ATCC_Catalog', 'Notes']].to_string(index=False))
    print()

if __name__ == '__main__':
    df = load_accessions()
    
    print("=" * 80)
    print("CELL LINE ACCESSIONS SUMMARY")
    print("=" * 80)
    print()
    
    # Summary stats
    complete = (df['DSMZ_ACC'].notna() & df['ATCC_Catalog'].notna()).sum()
    dsmz_only = (df['DSMZ_ACC'].notna() & df['ATCC_Catalog'].isna()).sum()
    atcc_only = (df['DSMZ_ACC'].isna() & df['ATCC_Catalog'].notna()).sum()
    none = (df['DSMZ_ACC'].isna() & df['ATCC_Catalog'].isna()).sum()
    
    print(f"Total cell lines: {len(df)}")
    print(f"  - Both DSMZ and ATCC: {complete}")
    print(f"  - DSMZ only: {dsmz_only}")
    print(f"  - ATCC only: {atcc_only}")
    print(f"  - Neither DSMZ nor ATCC: {none}")
    print()
    
    # Show each category
    print_accessions_table(df, 'complete')
    print_accessions_table(df, 'dsmz_only')
    print_accessions_table(df, 'atcc_only')
    print_accessions_table(df, 'none')
