#!/usr/bin/env python3
"""
Update BCL Oncoprint data from DepMap 24Q4 NHL filtered data.
Uses data from DLBCL_data/reference/DepMap/
"""

import csv
import json
import os
from pathlib import Path

# Paths
_SCRIPT_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _SCRIPT_DIR.parent
_LAB_ROOT = _PROJECT_ROOT.parent
DEPMAP_DIR = _LAB_ROOT / "DLBCL_data" / "reference" / "DepMap"
OUTPUT_DIR = _PROJECT_ROOT / "public" / "data"

# Genes of interest (from current genes.json)
GENES = {
    "retention": ["GNA13", "S1PR2", "P2RY8", "RHOA", "ARHGEF1"],
    "egress": ["S1PR1", "CXCR4", "GNAI2", "RAC2"],
    "driver": [
        "TP53", "EZH2", "KMT2D", "MYD88", "CD79B", "CREBBP", "EP300",
        "TNFAIP3", "CARD11", "BCL10", "B2M", "CIITA", "FAS", "PRDM1", "IRF4",
        "NOTCH1", "NOTCH2", "SPEN", "DTX1", "SGK1", "TBL1XR1", "H1-4",
        "PIM1", "BTG1", "BTG2", "FOXO1", "MEF2B", "ID3", "TCF3"
    ],
    "focal": ["BCL2", "BCL6", "MYC"]
}
ALL_GENES = set()
for genes in GENES.values():
    ALL_GENES.update(genes)

# COO classification based on known cell line subtypes
# Sources: LL-100 panel (Quentmeier et al. 2019), DSMZ, Cellosaurus, ATCC
# Red-teamed 2025-01: all entries verified against published GEP/COO data
COO_MAP = {
    # GCB — verified via LL-100 panel / DSMZ / literature
    "DOHH2": "DLBCL_GCB", "DOHH-2": "DLBCL_GCB",
    "OCILY19": "DLBCL_GCB", "OCI-LY-19": "DLBCL_GCB", "OCI-LY19": "DLBCL_GCB",
    "PFEIFFER": "DLBCL_GCB", "Pfeiffer": "DLBCL_GCB",
    "SUDHL10": "DLBCL_GCB", "SU-DHL-10": "DLBCL_GCB",
    "TOLEDO": "DLBCL_GCB", "Toledo": "DLBCL_GCB",
    "KARPAS422": "DLBCL_GCB", "KARPAS-422": "DLBCL_GCB",
    "DB": "DLBCL_GCB",
    "SUDHL4": "DLBCL_GCB", "SU-DHL-4": "DLBCL_GCB",
    "RL": "DLBCL_GCB",
    "WSUDLCL2": "DLBCL_GCB", "WSU-DLCL2": "DLBCL_GCB",
    "SUDHL6": "DLBCL_GCB", "SU-DHL-6": "DLBCL_GCB",
    "SUDHL8": "DLBCL_GCB", "SU-DHL-8": "DLBCL_GCB",
    "SUDHL5": "DLBCL_GCB", "SU-DHL-5": "DLBCL_GCB",
    "HT": "DLBCL_GCB",
    "OCILY7": "DLBCL_GCB", "OCI-LY7": "DLBCL_GCB",
    "OCILY18": "DLBCL_GCB", "OCI-LY18": "DLBCL_GCB",  # contested: 2023 Cancers review says ABC, LL-100 says unclassifiable; keeping GCB per DSMZ
    "VAL": "DLBCL_GCB",
    "WSUNHL": "DLBCL_GCB", "WSU-NHL": "DLBCL_GCB",
    "KARPAS231": "DLBCL_GCB", "KARPAS-231": "DLBCL_GCB",
    "BJAB": "DLBCL_GCB",  # Originally BL but lacks IG/MYC translocation; reclassified per WHO 5th Ed; widely used as GCB model
    "FARAGE": "DLBCL_GCB", "Farage": "DLBCL_GCB",  # ATCC CRL-2630; EBV+ GCB-DLBCL
    "RCK8": "DLBCL_GCB", "RC-K8": "DLBCL_GCB",  # DSMZ ACC-561; GCB-DLBCL
    "KML1": "DLBCL_GCB", "KML-1": "DLBCL_GCB",  # JCRB1347; GCB-DLBCL
    "HF": "DLBCL_GCB",  # ATCC CRL-3383; GCB-DLBCL (Pham/Ford, MD Anderson)
    "RC": "DLBCL_GCB",  # ATCC CRL-3382; DepMap says GCB but Cellosaurus says HGBL-DH (MYC+BCL2); keeping GCB per DepMap COO

    # ABC — verified via LL-100 panel / DSMZ / literature
    "OCILY3": "DLBCL_ABC", "OCI-LY3": "DLBCL_ABC",
    "NUDUL1": "DLBCL_ABC", "NU-DUL-1": "DLBCL_ABC",
    "OCILY10": "DLBCL_ABC", "OCI-Ly10": "DLBCL_ABC", "OCILy10": "DLBCL_ABC",
    "RI1": "DLBCL_ABC", "RI-1": "DLBCL_ABC",
    "U2904": "DLBCL_ABC", "U-2904": "DLBCL_ABC",  # DSMZ says ABC; double-hit from FL may suggest GCB-origin
    "U2932": "DLBCL_ABC", "U-2932": "DLBCL_ABC",
    "NUDHL1": "DLBCL_GCB", "NU-DHL-1": "DLBCL_GCB",  # DH (BCL2+MYC); LL-100 listed ABC but DSMZ catalog, Reddy 2017 GEP, LymphGen 2.0 all say GCB
    "U2946": "DLBCL_ABC", "U-2946": "DLBCL_ABC",  # was Other — GEP/LL-100 classify as ABC
    "ULA": "DLBCL_GCB",  # Triple-hit (MYC+BCL2+BCL6), t(14;18), CD10+; no GEP but molecular features strongly GCB; Cancers 2023 ABC call was erroneous

    # PMBL (Primary Mediastinal B-cell Lymphoma)
    "U2940": "PMBL", "U-2940": "PMBL",  # was GCB — DSMZ reclassified as PMBL (Eberth et al. 2015, ACC-634)
    "KARPAS1106P": "PMBL", "KARPAS-1106P": "PMBL",  # DSMZ ACC-545 (discontinued); confirmed PMBL

    # Other DLBCL (unclassified or contested)
    "A4FUK": "Other", "A4/Fuk": "Other",  # DepMap says DLBCL NOS; Cellosaurus says B-ALL — contested
    "A3KAW": "Other", "A3/KAW": "Other",  # DLBCL NOS; no published COO classification
    "ROS50": "Other", "ROS-50": "Other",  # Originally B-ALL L3; t(8;14;18) double-hit; HGBL-DH by current WHO
    "OCILY132": "Other", "OCILY-132": "Other",  # DLBCL NOS; insufficient data for COO
    "CTB1": "Other", "CTB-1": "Other",  # DLBCL; CD10+ suggests GCB by Hans, but no formal GEP
    "WILL1": "Other", "WILL-1": "Other",  # DLBCL; CD5+/CD10+ double-positive; ambiguous COO
    "EJ1": "Contaminated", "EJ-1": "Contaminated",  # ICLAC: contaminated with T24 bladder carcinoma; sampleSite=urinary_tract confirms
    "CCLF_HEME_0001_T": "Other",
    "U2973": "Other", "U-2973": "Other",  # HGBL-DH (MYC+BCL2/BCL6 double-hit); DSMZ ACC-642
    "SUDHL16": "Other", "SU-DHL-16": "Other",  # DLBCL NOS; centroblastic; no published COO classification
    "MC116": "Burkitt",  # DSMZ ACC-82; Burkitt/undifferentiated lymphoma spectrum
    "TK": "FL",  # JCRB0157; t(14;18)+ FL/transformed FL; near-triploid karyotype
}

# Notes for cell lines with contested/special classifications
CELL_LINE_NOTES = {
    "EJ-1": "ICLAC-registered as contaminated with T24 bladder carcinoma. Not a true B-cell lymphoma line.",
    "A4/Fuk": "DepMap classifies as DLBCL NOS; Cellosaurus lists as B-ALL. Classification contested.",
    "HT": "Possible Toledo duplicate (shared STR profile). Treated as independent per DepMap.",
    "OCI-LY18": "COO: GCB by majority consensus. CD10+ and t(8;18;14) double-hit consistent with GCB/EZB. Cancers 2023 review listed as ABC (likely error). Not in LL-100 panel.",
    "U-2904": "DSMZ classifies as ABC-DLBCL. Double-hit (BCL2+MYC) from FL origin may suggest GCB genetics.",
    "U-2932": "ABC by GEP (LL-100 panel), but contains two genetically distinct subclones (Quentmeier et al. 2013). R2 subclone has MYC overexpression + BCL2 co-amplification (double-hit features).",
    "U-2940": "Reclassified from DLBCL-GCB to PMBL by DSMZ (Eberth et al. 2015).",
    "NU-DHL-1": "Double-hit (BCL2+MYC). LL-100 panel (Quentmeier 2019) listed as ABC, but DSMZ catalog, Reddy 2017 GEP, and LymphGen 2.0 (EZB p=0.86) all support GCB. Reverted to GCB.",
    "U-2946": "Reclassified from unclassified to ABC per GEP/LL-100 data.",
    "ULA": "Triple-hit (MYC+BCL2+BCL6): t(14;18)(q32;q21), t(3;8)(q27;q24) x2. CD10+. No GEP-based COO, but molecular features strongly support GCB. Cancers 2023 (Coccaro) listed as ABC in error (same table misclassifies RC-K8 and OCI-LY18). DSMZ ACC-627 does not assign COO. HGBL-TH by WHO 5th Ed criteria.",
    "BJAB": "Originally classified as Burkitt lymphoma (1973), but lacks canonical IG/MYC translocation required for BL under WHO 5th Ed. Carries KMT2A-CLTC fusion. Widely used as GCB-DLBCL model in published research.",
    "KARPAS-231": "Originally B-ALL L3; reclassified as DLBCL by Cellosaurus. BCL6 and BCL2 rearrangements consistent with GCB/EZB. No formal GEP-based COO.",
    "A3/KAW": "DLBCL NOS. No published COO classification. Predates GEP era (Matsuzaki et al. 1983).",
    "ROS-50": "Originally B-ALL L3 (DSMZ ACC-557). Carries t(8;14;18) with concurrent MYC and BCL2 rearrangements. HGBL-DH by current WHO criteria.",
    "CTB-1": "DLBCL with CD10+ immunophenotype suggesting GCB by Hans algorithm, but no formal GEP-based COO classification.",
    "WILL-1": "DLBCL with unusual CD5+/CD10+ double-positive phenotype. CD10+ suggests GCB by Hans, but CD5 co-expression is atypical.",
    "Farage": "EBV+ GCB-DLBCL. Established from a 70-year-old female, lymph node metastasis.",
    "RC-K8": "GCB-DLBCL. DSMZ ACC-561. Established from ascites of a 55-year-old male.",
    "KML-1": "GCB-DLBCL. JCRB1347. Established from pleural effusion of a 28-year-old female.",
    "HF": "GCB-DLBCL. Pham/Ford lab (MD Anderson). ATCC CRL-3383. Established from pleural effusion of a 77-year-old male.",
    "RC": "DepMap classifies as GCB-DLBCL, but Cellosaurus identifies as HGBL-DH (MYC+BCL2 double-hit). Pham/Ford lab (MD Anderson). ATCC CRL-3382.",
    "U-2973": "HGBL-DH with MYC and BCL2/BCL6 rearrangements. DSMZ ACC-642. Classified by DepMap as High-Grade B-Cell Lymphoma.",
    "KARPAS-1106P": "Primary mediastinal large B-cell lymphoma (PMBL). DSMZ ACC-545 (discontinued). Also ECACC 06072607.",
    "SU-DHL-16": "DLBCL NOS (centroblastic). DSMZ ACC-577. No published COO/GEP classification.",
    "MC116": "Burkitt/undifferentiated lymphoma spectrum. DSMZ ACC-82. DepMap classifies as Mature B-Cell Neoplasms NOS.",
    "TK": "Follicular lymphoma with t(14;18). JCRB0157. Near-triploid karyotype. WES-only data (no WGS).",
}

# ============================================================
# CELL LINE ACCESSIONS — for direct links to source databases
# Merged from build_fusions.py (verified) + Cellosaurus/DSMZ/ATCC searches
# DSMZ: https://www.dsmz.de/collection/catalogue/details/culture/{ACC}
# Cellosaurus: https://www.cellosaurus.org/{CVCL}
# ATCC: https://www.atcc.org/products/{catalog}
# ============================================================
CELL_LINE_ACCESSIONS = {
    # ── DLBCL GCB ──
    "DOHH-2":       {"dsmz": "ACC-47",  "cellosaurus": "CVCL_1179"},
    "OCI-LY-19":    {"dsmz": "ACC-528", "cellosaurus": "CVCL_1878"},
    "Pfeiffer":     {"atcc": "CRL-2632", "cellosaurus": "CVCL_3326"},
    "SU-DHL-10":    {"dsmz": "ACC-576", "cellosaurus": "CVCL_1889"},
    "Toledo":       {"atcc": "CRL-2631", "cellosaurus": "CVCL_3611"},
    "KARPAS-422":   {"dsmz": "ACC-32",  "cellosaurus": "CVCL_1325"},
    "DB":           {"dsmz": "ACC-539", "cellosaurus": "CVCL_1168"},
    "SU-DHL-4":     {"dsmz": "ACC-495", "cellosaurus": "CVCL_0539"},
    "RL":           {"dsmz": "ACC-613", "cellosaurus": "CVCL_1660", "atcc": "CRL-2261"},
    "WSU-DLCL2":    {"dsmz": "ACC-575", "cellosaurus": "CVCL_1902"},
    "SU-DHL-6":     {"dsmz": "ACC-572", "cellosaurus": "CVCL_2206"},
    "SU-DHL-8":     {"dsmz": "ACC-573", "cellosaurus": "CVCL_2207"},
    "SU-DHL-5":     {"dsmz": "ACC-571", "cellosaurus": "CVCL_1735", "atcc": "CRL-2958"},
    "HT":           {"cellosaurus": "CVCL_5T93"},  # no DSMZ or ATCC
    "OCI-LY7":      {"dsmz": "ACC-688", "cellosaurus": "CVCL_1881"},
    "OCI-LY18":     {"dsmz": "ACC-699", "cellosaurus": "CVCL_1880"},
    "VAL":          {"dsmz": "ACC-586", "cellosaurus": "CVCL_1819"},
    "WSU-NHL":      {"dsmz": "ACC-58",  "cellosaurus": "CVCL_1793", "atcc": "CRL-11584"},
    "KARPAS-231":   {"dsmz": "ACC-562", "cellosaurus": "CVCL_1822"},  # DSMZ discontinued
    # ── DLBCL ABC ──
    "OCI-LY3":      {"dsmz": "ACC-761", "cellosaurus": "CVCL_8800"},
    "NU-DUL-1":     {"dsmz": "ACC-579", "cellosaurus": "CVCL_1877", "atcc": "CRL-2969"},
    "OCI-Ly10":     {"cellosaurus": "CVCL_8795"},
    "RI-1":         {"dsmz": "ACC-585", "cellosaurus": "CVCL_1885"},
    "U-2904":       {"dsmz": "ACC-768", "cellosaurus": "CVCL_X504"},
    "U-2932":       {"dsmz": "ACC-633", "cellosaurus": "CVCL_1896"},
    "NU-DHL-1":     {"dsmz": "ACC-583", "cellosaurus": "CVCL_1611"},
    "U-2946":       {"dsmz": "ACC-795", "cellosaurus": "CVCL_X503"},
    "ULA":          {"dsmz": "ACC-627", "cellosaurus": "CVCL_1854"},
    # ── PMBL ──
    "U-2940":       {"dsmz": "ACC-634", "cellosaurus": "CVCL_1897"},
    # ── Other DLBCL ──
    "A4/Fuk":       {"cellosaurus": "CVCL_1064"},  # JCRB only
    "A3/KAW":       {"cellosaurus": "CVCL_1062"},  # JCRB only
    "ROS-50":       {"dsmz": "ACC-557", "cellosaurus": "CVCL_1887"},
    "OCILY-132":    {},  # not in Cellosaurus
    "CTB-1":        {"cellosaurus": "CVCL_1149"},  # JCRB/RCB only
    "WILL-1":       {"dsmz": "ACC-651", "cellosaurus": "CVCL_1900"},
    "EJ-1":         {"cellosaurus": "CVCL_2893"},  # contaminated: T24 bladder carcinoma
    "CCLF_HEME_0001_T": {},  # not in Cellosaurus
    # ── Burkitt ──
    "Raji":         {"dsmz": "ACC-319", "cellosaurus": "CVCL_0511"},
    "Ramos":        {"dsmz": "ACC-603", "cellosaurus": "CVCL_0597"},
    "Daudi":        {"dsmz": "ACC-78",  "cellosaurus": "CVCL_0008"},
    "NAMALWA":      {"dsmz": "ACC-24",  "cellosaurus": "CVCL_0067"},
    "BL-70":        {"dsmz": "ACC-233", "cellosaurus": "CVCL_1088"},
    "EB-2":         {"atcc": "HTB-61",  "cellosaurus": "CVCL_1186"},
    "EB1":          {"dsmz": "ACC-80",  "cellosaurus": "CVCL_2027"},
    "GA-10":        {"atcc": "CRL-2392", "cellosaurus": "CVCL_1222"},
    "BLUE-1":       {"dsmz": "ACC-594", "cellosaurus": "CVCL_1967"},
    "BL-41":        {"dsmz": "ACC-160", "cellosaurus": "CVCL_1087"},
    "CA46":         {"dsmz": "ACC-73",  "cellosaurus": "CVCL_1101", "atcc": "CRL-1648"},
    "ST486":        {"atcc": "CRL-1647", "cellosaurus": "CVCL_1712"},
    "BJAB":         {"dsmz": "ACC-757", "cellosaurus": "CVCL_5711"},
    "BL-2":         {"dsmz": "ACC-625", "cellosaurus": "CVCL_1966"},
    "DOGKIT":       {"dsmz": "ACC-629", "cellosaurus": "CVCL_2023"},
    "DOGUM":        {"dsmz": "ACC-644", "cellosaurus": "CVCL_2024"},
    "GUMBUS":       {"dsmz": "ACC-630", "cellosaurus": "CVCL_2051"},
    "P3HR-1":       {"atcc": "HTB-62",  "cellosaurus": "CVCL_2676"},
    "DG-75":        {"dsmz": "ACC-83",  "cellosaurus": "CVCL_0244", "atcc": "CRL-2625"},
    "EB-3":         {"atcc": "CCL-85",  "cellosaurus": "CVCL_1185"},
    "JiyoyeP-2003": {"dsmz": "ACC-590", "cellosaurus": "CVCL_1317", "atcc": "CCL-87"},
    "MN-60":        {"dsmz": "ACC-138", "cellosaurus": "CVCL_1421"},
    "P32-ISH":      {"cellosaurus": "CVCL_3119"},  # JCRB only
    "Ramos-2G6-4C10": {"atcc": "CRL-1923", "cellosaurus": "CVCL_1646"},
    "TL-1":         {"cellosaurus": "CVCL_B371"},  # JCRB/RCB only
    # ── MCL ──
    "REC-1":        {"dsmz": "ACC-584", "cellosaurus": "CVCL_1884", "atcc": "CRL-3004"},
    "GRANTA-519":   {"dsmz": "ACC-342", "cellosaurus": "CVCL_1818"},
    "JVM-2":        {"dsmz": "ACC-12",  "cellosaurus": "CVCL_1319"},
    "Mino":         {"dsmz": "ACC-687", "cellosaurus": "CVCL_1872"},
    "Z-138":        {"atcc": "CRL-3001", "cellosaurus": "CVCL_B077"},
    "JeKo-1":       {"dsmz": "ACC-553", "cellosaurus": "CVCL_1865", "atcc": "CRL-3006"},
    "MAVER-1":      {"dsmz": "ACC-717", "cellosaurus": "CVCL_1831", "atcc": "CRL-3008"},
    "JMP-1":        {"atcc": "CRL-3378", "cellosaurus": "CVCL_UJ14"},
    # ── CLL ──
    "MEC-1":        {"dsmz": "ACC-497", "cellosaurus": "CVCL_1870"},
    "MEC2":         {"dsmz": "ACC-500", "cellosaurus": "CVCL_1871"},
    "CI":           {"dsmz": "ACC-770", "cellosaurus": "CVCL_Y548"},
    "PGA-1":        {"dsmz": "ACC-766", "cellosaurus": "CVCL_Y545"},
    "WA-OSEL":      {"dsmz": "ACC-767", "cellosaurus": "CVCL_Y549"},
    # ── PEL ──
    "BCP-1":        {"atcc": "CRL-2294", "cellosaurus": "CVCL_0107"},
    "BC-1":         {"dsmz": "ACC-677", "cellosaurus": "CVCL_1079", "atcc": "CRL-2230"},
    "BC-2":         {"dsmz": "ACC-678", "cellosaurus": "CVCL_1856", "atcc": "CRL-2231"},
    "BC-3":         {"dsmz": "ACC-679", "cellosaurus": "CVCL_1080", "atcc": "CRL-3615"},
    "CRO-AP2":      {"dsmz": "ACC-48",  "cellosaurus": "CVCL_1147"},
    "JSC-1":        {"atcc": "CRL-2769", "cellosaurus": "CVCL_3728"},  # ATCC discontinued
    # ── FL ──
    "WSU-FSCCL":    {"dsmz": "ACC-612", "cellosaurus": "CVCL_1903"},
    "SC-1":         {"dsmz": "ACC-558", "cellosaurus": "CVCL_1875"},
    "TK":           {"cellosaurus": "CVCL_3216"},  # JCRB0157 only
    # ── MZL ──
    "KARPAS 1718":  {"cellosaurus": "CVCL_2539"},  # ECACC only
    "SLVL":         {"cellosaurus": "CVCL_3169"},  # JCRB only
    # ── New additions ──
    "Farage":       {"atcc": "CRL-2630", "cellosaurus": "CVCL_3302"},
    "RC-K8":        {"dsmz": "ACC-561", "cellosaurus": "CVCL_1883"},
    "KML-1":        {"cellosaurus": "CVCL_2979"},  # JCRB1347 only
    "HF":           {"atcc": "CRL-3383", "cellosaurus": "CVCL_UI84"},
    "RC":           {"atcc": "CRL-3382", "cellosaurus": "CVCL_9U45"},
    "U-2973":       {"dsmz": "ACC-642", "cellosaurus": "CVCL_1898"},
    "KARPAS-1106P": {"dsmz": "ACC-545", "cellosaurus": "CVCL_1821"},  # DSMZ discontinued; ECACC 06072607
    "SU-DHL-16":    {"dsmz": "ACC-577", "cellosaurus": "CVCL_1890", "atcc": "CRL-2964"},
    "MC116":        {"dsmz": "ACC-82",  "cellosaurus": "CVCL_1399", "atcc": "CRL-1649"},
}

def get_subtype(name, stripped_name, oncotree_subtype):
    """Determine subtype from cell line name and oncotree classification."""
    # Check our manual COO map first
    if stripped_name in COO_MAP:
        return COO_MAP[stripped_name]
    if name in COO_MAP:
        return COO_MAP[name]

    # Use oncotree classification
    if "Burkitt" in oncotree_subtype:
        return "Burkitt"
    if "Mantle Cell" in oncotree_subtype:
        return "MCL"
    if "Primary Effusion" in oncotree_subtype:
        return "PEL"
    if "Chronic Lymphocytic" in oncotree_subtype or "CLL" in oncotree_subtype:
        return "CLL"
    if "Follicular" in oncotree_subtype:
        return "FL"
    if "Marginal Zone" in oncotree_subtype:
        return "MZL"
    if "Activated B-cell" in oncotree_subtype:
        return "DLBCL_ABC"
    if "Diffuse Large B-Cell" in oncotree_subtype:
        return "Other"  # Unclassified DLBCL

    return "Other"


def get_accession_urls(name):
    """Build direct URLs to cell line database pages from accession data."""
    acc = CELL_LINE_ACCESSIONS.get(name, {})
    urls = {}
    if "cellosaurus" in acc:
        urls["cellosaurusId"] = acc["cellosaurus"]
        urls["cellosaurusUrl"] = f"https://www.cellosaurus.org/{acc['cellosaurus']}"
    if "dsmz" in acc:
        urls["dsmzId"] = acc["dsmz"]
        urls["dsmzUrl"] = f"https://www.dsmz.de/collection/catalogue/details/culture/{acc['dsmz']}"
    if "atcc" in acc:
        urls["atccId"] = acc["atcc"]
        urls["atccUrl"] = f"https://www.atcc.org/products/{acc['atcc'].lower()}"
    return urls


def load_cell_lines():
    """Load and process cell line metadata."""
    cell_lines = []
    with open(DEPMAP_DIR / "NHL_cell_lines.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["CellLineName"]
            subtype = get_subtype(
                name,
                row["StrippedCellLineName"],
                row["OncotreeSubtype"]
            )
            entry = {
                "id": row["ModelID"],
                "name": name,
                "strippedName": row["StrippedCellLineName"],
                "subtype": subtype,
                "disease": row["OncotreePrimaryDisease"],
                "oncotreeSubtype": row["OncotreeSubtype"],
                "sex": row["Sex"],
                "age": row["Age"],
                "primaryOrMetastasis": row["PrimaryOrMetastasis"],
                "sampleSite": row["SampleCollectionSite"]
            }
            # Add accession URLs
            entry.update(get_accession_urls(name))
            # Add notes if present
            if name in CELL_LINE_NOTES:
                entry["notes"] = CELL_LINE_NOTES[name]
            cell_lines.append(entry)
    return cell_lines


def load_mutations():
    """Load mutations for genes of interest."""
    mutations = []
    with open(DEPMAP_DIR / "NHL_mutations.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            gene = row.get("HugoSymbol", "")
            if gene not in ALL_GENES:
                continue

            # Parse impact
            impact = row.get("VepImpact", "")
            consequence = row.get("MolecularConsequence", "")

            mutations.append({
                "cellLineId": row["ModelID"],
                "gene": gene,
                "proteinChange": row.get("ProteinChange", ""),
                "dnaChange": row.get("DNAChange", ""),
                "consequence": consequence,
                "impact": impact,
                "variantType": row.get("VariantType", ""),
                "af": float(row.get("AF", 0) or 0),
                "hotspot": row.get("Hotspot", "False") == "True",
                "oncogeneHighImpact": row.get("OncogeneHighImpact", "False") == "True",
                "tumorSuppressorHighImpact": row.get("TumorSuppressorHighImpact", "False") == "True",
                "likelyLoF": row.get("LikelyLoF", "False") == "True",
            })
    return mutations


def load_cnv():
    """Load CNV data for genes of interest."""
    cnv_data = []

    # First, get gene column indices
    with open(DEPMAP_DIR / "NHL_cnv.csv", "r") as f:
        header = f.readline().strip().split(",")

    # Find gene columns - format is "GENE (entrez_id)"
    gene_cols = {}
    for i, col in enumerate(header):
        if i == 0:
            continue  # Skip ModelID column
        # Extract gene name from "GENE (entrez_id)" format
        gene_name = col.split(" (")[0] if " (" in col else col
        if gene_name in ALL_GENES:
            gene_cols[gene_name] = i

    print(f"Found {len(gene_cols)} genes in CNV data: {sorted(gene_cols.keys())}")

    # Now read the data
    with open(DEPMAP_DIR / "NHL_cnv.csv", "r") as f:
        reader = csv.reader(f)
        next(reader)  # Skip header
        for row in reader:
            cell_id = row[0]
            for gene, col_idx in gene_cols.items():
                try:
                    cn_ratio = float(row[col_idx])
                except (ValueError, IndexError):
                    continue

                # Data is relative copy number (CN/ploidy), centered at 1.0
                # NOT log2 values despite the source file name
                # 1.0 = diploid normal, 0.5 = het loss, 0.0 = hom del, 2.0 = doubled
                if cn_ratio < 0.25:
                    status = "hom_del"
                elif cn_ratio < 0.75:
                    status = "het_loss"
                elif cn_ratio > 1.75:
                    status = "amp"
                elif cn_ratio > 1.25:
                    status = "gain"
                else:
                    status = "neutral"

                cnv_data.append({
                    "cellLineId": cell_id,
                    "gene": gene,
                    "copyRatio": round(cn_ratio, 4),
                    "status": status
                })

    return cnv_data


def main():
    print("Loading cell lines...")
    cell_lines = load_cell_lines()
    print(f"  Loaded {len(cell_lines)} cell lines")

    # Count subtypes
    subtype_counts = {}
    for cl in cell_lines:
        subtype_counts[cl["subtype"]] = subtype_counts.get(cl["subtype"], 0) + 1
    print("  Subtypes:", subtype_counts)

    print("\nLoading mutations...")
    mutations = load_mutations()
    print(f"  Loaded {len(mutations)} mutations for pathway genes")

    print("\nLoading CNV...")
    cnv = load_cnv()
    print(f"  Loaded {len(cnv)} CNV entries for pathway genes")

    # Save JSON files
    print("\nSaving JSON files...")

    with open(OUTPUT_DIR / "cell_lines.json", "w") as f:
        json.dump(cell_lines, f, indent=2)
    print(f"  Saved cell_lines.json")

    with open(OUTPUT_DIR / "mutations.json", "w") as f:
        json.dump(mutations, f, separators=(",", ":"))
    print(f"  Saved mutations.json (minified)")

    with open(OUTPUT_DIR / "cnv.json", "w") as f:
        json.dump(cnv, f, separators=(",", ":"))
    print(f"  Saved cnv.json (minified)")

    print("\nDone!")


if __name__ == "__main__":
    main()
