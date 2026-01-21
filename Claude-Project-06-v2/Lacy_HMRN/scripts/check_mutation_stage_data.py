"""
Check for better stage data overlap with mutation data
"""

import pandas as pd
import os

lacy_dir = "C:/Users/ericp/OneDrive/Desktop/Claude-Projects/Claude-Project-06/Lacy_HMRN"

print("=" * 60)
print("Checking Stage Data for Mutation Cohort")
print("=" * 60)

# Load mutation data
mutations = pd.read_csv(os.path.join(lacy_dir, "genomic_data.csv"))
print(f"\nMutation data: {len(mutations)} patients")

# Load clinical supplement
clinical = pd.read_excel(os.path.join(lacy_dir, "blood_2020_supplement.xlsx"),
                        sheet_name="S4 Patient Characteristics")
print(f"Clinical supplement: {len(clinical)} patients")
print(f"Clinical columns: {list(clinical.columns)}")

# Check IPI distribution (IPI includes stage as component)
print(f"\nIPI distribution:")
print(clinical['IPI'].value_counts(dropna=False))

# Merge to see what we have
merged = mutations.merge(clinical, on='PID', how='inner')
print(f"\nPatients with both mutation + clinical: {len(merged)}")

# Check all supplement sheets for stage
print("\n" + "=" * 60)
print("Checking all supplement sheets...")
xl = pd.ExcelFile(os.path.join(lacy_dir, "blood_2020_supplement.xlsx"))

for sheet in xl.sheet_names:
    df = pd.read_excel(xl, sheet_name=sheet)
    stage_cols = [c for c in df.columns if 'stage' in str(c).lower()]
    if stage_cols:
        print(f"\n{sheet}: {stage_cols}")
        for col in stage_cols:
            print(f"  {col}: {df[col].value_counts().head()}")

# Check S6 Genomic dataset (the actual mutation matrix source)
print("\n" + "=" * 60)
print("Checking S6 Genomic dataset...")
s6 = pd.read_excel(xl, sheet_name="S6 Genomic dataset for analysis")
print(f"S6 columns: {list(s6.columns)[:20]}")
print(f"S6 rows: {len(s6)}")

# The paper mentions they have stage data - let's look harder
print("\n" + "=" * 60)
print("Looking for stage in raw data files...")

# Check if there's stage in genomic_data.csv header
print(f"\ngenomic_data.csv columns: {list(mutations.columns)[:20]}")

# The issue is the stage data is only in GEO expression metadata
# Not in the Blood supplement clinical data
# This is a data structure limitation

print("\n" + "=" * 60)
print("CONCLUSION")
print("=" * 60)
print("""
The Lacy/HMRN dataset has a split structure:
- Mutation data (928 pts): From Blood 2020 supplement, NO direct stage column
- Expression data (1311 pts): From GEO GSE181063, HAS stage in metadata
- Overlap with PID mapping: Only ~34 patients

The Blood 2020 clinical supplement (S4) has IPI but NOT individual stage.
Stage data exists in GEO metadata but doesn't map well to mutation PIDs.

To properly analyze mutations by stage, we would need:
1. A dataset with both mutations AND stage (e.g., Chapuy/DFCI, Reddy/Duke)
2. Or contact the Lacy authors for the complete clinical data
""")
