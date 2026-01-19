"""
Find stage data in Lacy/HMRN dataset
"""

import pandas as pd
import os

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"

print("=" * 60)
print("Searching for Stage Data in Lacy/HMRN")
print("=" * 60)

# Check supplement sheets
print("\n1. Blood 2020 Supplement sheets:")
try:
    xl = pd.ExcelFile(os.path.join(lacy_dir, "blood_2020_supplement.xlsx"))
    for sheet in xl.sheet_names:
        print(f"\n  Sheet: {sheet}")
        df = pd.read_excel(xl, sheet_name=sheet, nrows=5)
        cols_with_stage = [c for c in df.columns if 'stage' in str(c).lower() or 'ann' in str(c).lower()]
        if cols_with_stage:
            print(f"    Stage columns found: {cols_with_stage}")
        print(f"    Columns: {list(df.columns)[:8]}...")
except Exception as e:
    print(f"  Error: {e}")

# Check series matrix for stage
print("\n2. Series matrix metadata:")
import gzip
series_file = os.path.join(lacy_dir, "GSE181063_series_matrix.txt.gz")
try:
    with gzip.open(series_file, 'rt') as f:
        for i, line in enumerate(f):
            if i > 200:
                break
            if 'stage' in line.lower() or 'ann_arbor' in line.lower():
                print(f"  Line {i}: {line[:100]}...")
except Exception as e:
    print(f"  Error: {e}")

# Check the staged data we already created
print("\n3. Previously created staged data:")
staged_file = os.path.join(lacy_dir, "results", "gcb_staged_tegress.csv")
if os.path.exists(staged_file):
    df = pd.read_csv(staged_file)
    print(f"  Found: {staged_file}")
    print(f"  Patients: {len(df)}")
    print(f"  Columns: {list(df.columns)}")
    if 'stage_group' in df.columns:
        print(f"  Stage distribution:")
        print(df['stage_group'].value_counts())
    if 'Stage' in df.columns:
        print(f"  Raw stage distribution:")
        print(df['Stage'].value_counts())
else:
    print(f"  Not found: {staged_file}")

# Check for PID mapping in staged data
print("\n4. Check PID availability:")
if os.path.exists(staged_file):
    df = pd.read_csv(staged_file)
    if 'PID' in df.columns:
        print(f"  PIDs in staged expression data: {df['PID'].notna().sum()}")

        # Load mutation data
        mutations = pd.read_csv(os.path.join(lacy_dir, "genomic_data.csv"))
        print(f"  PIDs in mutation data: {len(mutations)}")

        # Check overlap
        staged_pids = set(df['PID'].dropna().astype(str))
        mut_pids = set(mutations['PID'].astype(str))
        overlap = staged_pids.intersection(mut_pids)
        print(f"  Overlap: {len(overlap)} patients")

print("\n" + "=" * 60)
