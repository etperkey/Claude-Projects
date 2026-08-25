#!/usr/bin/env python3
"""
Build fusions.json from DepMap RNA-seq fusion calls + curated literature data.

RNA-seq fusion callers (STAR-Fusion) miss many IG-partner translocations
because breakpoints are in non-coding regions (BCL2 MBR, MYC 3' region).
We supplement with curated translocations from DSMZ/Cellosaurus/ATCC.
"""

import csv
import json
from collections import defaultdict
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _SCRIPT_DIR.parent
_LAB_ROOT = _PROJECT_ROOT.parent
DEPMAP_DIR = _LAB_ROOT / "DLBCL_data" / "reference" / "DepMap"
OUTPUT_DIR = _PROJECT_ROOT / "public" / "data"

# ============================================================
# CELL LINE ACCESSIONS — for direct links to source databases
# DSMZ: https://www.dsmz.de/collection/catalogue/details/culture/{ACC}
# Cellosaurus: https://www.cellosaurus.org/{CVCL}
# ATCC: https://www.atcc.org/products/{catalog}
# ============================================================
CELL_LINE_ACCESSIONS = {
    # ── DLBCL / FL lines ──
    "DOHH-2":     {"dsmz": "ACC-47",  "cellosaurus": "CVCL_1179"},
    "SU-DHL-4":   {"dsmz": "ACC-495", "cellosaurus": "CVCL_0539"},
    "SU-DHL-6":   {"dsmz": "ACC-572", "cellosaurus": "CVCL_2206"},
    "SU-DHL-8":   {"dsmz": "ACC-573", "cellosaurus": "CVCL_2207"},
    "SU-DHL-10":  {"dsmz": "ACC-576", "cellosaurus": "CVCL_1889"},
    "OCI-LY7":    {"dsmz": "ACC-688", "cellosaurus": "CVCL_1881"},  # verified: t(8;14) MYC-IGH
    "OCI-LY-19":  {"dsmz": "ACC-528", "cellosaurus": "CVCL_1878"},
    "OCI-LY18":   {"dsmz": "ACC-699", "cellosaurus": "CVCL_1880"},  # was ACC-722 (OCI-LY1)
    "OCI-Ly10":   {"cellosaurus": "CVCL_8795"},
    "NU-DHL-1":   {"dsmz": "ACC-583", "cellosaurus": "CVCL_1611"},  # was ACC-581 (HCT-116)
    "KARPAS-422": {"dsmz": "ACC-32",  "cellosaurus": "CVCL_1325"},
    "DB":         {"dsmz": "ACC-539", "cellosaurus": "CVCL_1168"},
    "WSU-DLCL2":  {"dsmz": "ACC-575", "cellosaurus": "CVCL_1902"},
    "SC-1":       {"dsmz": "ACC-558", "cellosaurus": "CVCL_1875"},
    "Pfeiffer":   {"atcc": "CRL-2632", "cellosaurus": "CVCL_3326"},
    "VAL":        {"dsmz": "ACC-586", "cellosaurus": "CVCL_1819"},
    # ── Burkitt lines ──
    "Raji":       {"dsmz": "ACC-319", "cellosaurus": "CVCL_0511"},
    "Ramos":      {"dsmz": "ACC-603", "cellosaurus": "CVCL_0597"},
    "Daudi":      {"dsmz": "ACC-78",  "cellosaurus": "CVCL_0008"},
    "NAMALWA":    {"dsmz": "ACC-24",  "cellosaurus": "CVCL_0067"},  # was ACC-69 (NAMALWA.PNT subline)
    "BL-70":      {"dsmz": "ACC-233", "cellosaurus": "CVCL_1088"},  # was ACC-356 (SU-DHL-1)
    "EB-2":       {"atcc": "HTB-61",  "cellosaurus": "CVCL_1186"},  # not at DSMZ; was ACC-152
    "EB1":        {"dsmz": "ACC-80",  "cellosaurus": "CVCL_2027"},  # was CVCL_2023 (DoGKiT)
    "GA-10":      {"atcc": "CRL-2392","cellosaurus": "CVCL_1222"},  # not at DSMZ; was ACC-150
    "A3/KAW":     {"cellosaurus": "CVCL_1062"},                      # not at DSMZ (JCRB only)
    "A4/Fuk":     {"cellosaurus": "CVCL_1064"},                      # not at DSMZ (JCRB only)
    "BLUE-1":     {"dsmz": "ACC-594", "cellosaurus": "CVCL_1967"},
    # ── MCL lines ──
    "JVM-2":      {"dsmz": "ACC-12",  "cellosaurus": "CVCL_1319"},
    "Mino":       {"dsmz": "ACC-687", "cellosaurus": "CVCL_1872"},  # was CVCL_4936 (FC11.BM)
    "Z-138":      {"atcc": "CRL-3001","cellosaurus": "CVCL_B077"},  # not at DSMZ; was ACC-509
}

def get_source_url(cell_name, source):
    """Build a direct URL to the specific cell line page for a given source."""
    acc = CELL_LINE_ACCESSIONS.get(cell_name, {})
    if source == "DSMZ" and "dsmz" in acc:
        return f"https://www.dsmz.de/collection/catalogue/details/culture/{acc['dsmz']}"
    if source == "Cellosaurus" and "cellosaurus" in acc:
        return f"https://www.cellosaurus.org/{acc['cellosaurus']}"
    if source == "ATCC" and "atcc" in acc:
        return f"https://www.atcc.org/products/{acc['atcc'].lower()}"
    if source == "Pu2019":
        return "https://doi.org/10.1186/s13045-019-0761-2"
    # Fallback: return the Cellosaurus page if available (always has good data)
    if "cellosaurus" in acc:
        return f"https://www.cellosaurus.org/{acc['cellosaurus']}"
    return None

# ============================================================
# CURATED TRANSLOCATIONS — well-established from literature
# Sources: DSMZ cell line database, Cellosaurus, ATCC,
# Drexler HG (2001), Quentmeier H et al. (2019)
# ============================================================
CURATED_FUSIONS = [
    # ── BCL2 t(14;18) — EZB/FL hallmark ──
    {"names": ["DOHH-2"],    "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["SU-DHL-4"],  "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["SU-DHL-6"],  "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["SU-DHL-10"], "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    # OCI-LY7: NO BCL2 t(14;18) — DSMZ ACC-688 shows t(8;14) MYC only + del(18)(q21.1)
    {"names": ["OCI-LY-19"], "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["OCI-LY18"],  "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["OCI-Ly10"],  "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "Pu2019"},
    {"names": ["NU-DHL-1"],  "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["KARPAS-422"],"gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["DB"],        "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["WSU-DLCL2"], "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["SC-1"],      "gene": "BCL2",  "event": "t(8;14;18)(q24;q32;q21)", "partner": "IGH", "source": "DSMZ"},  # 3-way translocation
    {"names": ["Pfeiffer"],  "gene": "BCL2",  "event": "t(14;18)(q32;q21)", "partner": "IGH", "source": "ATCC"},  # ATCC CRL-2632 confirms
    # ── MYC t(8;14) — Burkitt / double-hit ──
    {"names": ["Raji"],      "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
    {"names": ["Ramos"],     "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
    {"names": ["Daudi"],     "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
    {"names": ["NAMALWA"],   "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
    {"names": ["BL-70"],     "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
    {"names": ["EB-2"],      "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "Cellosaurus"},  # not at DSMZ
    {"names": ["EB1"],       "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
    {"names": ["GA-10"],     "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "Cellosaurus"},  # not at DSMZ; ATCC CRL-2392 confirms
    {"names": ["A3/KAW"],    "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "Cellosaurus"},  # not at DSMZ (JCRB)
    {"names": ["A4/Fuk"],    "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "Cellosaurus"},  # not at DSMZ (JCRB)
    {"names": ["BLUE-1"],    "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "Cellosaurus"},
    {"names": ["OCI-LY7"],   "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},  # DSMZ ACC-688 confirms
    # Double-hit DLBCL lines — MYC translocations (Pu et al. 2019, DSMZ)
    {"names": ["OCI-LY18"],  "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
    {"names": ["SU-DHL-10"], "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "DSMZ"},
    {"names": ["DOHH-2"],    "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "Pu2019"},
    {"names": ["OCI-Ly10"],  "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "Pu2019"},
    # Pfeiffer: ATCC CRL-2632 does NOT mention MYC t(8;14) — removed (was wrong)
    {"names": ["VAL"],       "gene": "MYC",   "event": "t(8;14)(q24;q32)",  "partner": "IGH", "source": "Pu2019"},
    {"names": ["SC-1"],      "gene": "MYC",   "event": "t(8;14;18)(q24;q32;q21)", "partner": "IGH", "source": "DSMZ"},  # 3-way translocation
    # MYC variant translocations (light chain partners)
    {"names": ["SU-DHL-8"],  "gene": "MYC",   "event": "t(8;22)(q24;q11)",  "partner": "IGL", "source": "DSMZ"},
    # ── CCND1 t(11;14) — MCL hallmark ──
    {"names": ["JVM-2"],     "gene": "CCND1", "event": "t(11;14)(q13;q32)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["Mino"],      "gene": "CCND1", "event": "t(11;14)(q13;q32)", "partner": "IGH", "source": "DSMZ"},
    {"names": ["Z-138"],     "gene": "CCND1", "event": "t(11;14)(q13;q32)", "partner": "IGH", "source": "Cellosaurus"},  # not at DSMZ; ATCC CRL-3001 confirms
    # OCI-LY7: NO BCL6 t(3;14) — DSMZ ACC-688 karyotype shows no BCL6 rearrangement
]

# Key lymphoma fusion partner genes
KEY_GENES = {
    "BCL2","BCL6","MYC","CCND1","CIITA","NSD2","MALT1","TP53","PAX5","PRDM1",
    "FOXO1","REL","MCL1","BCL2L1","BCL11A","NOTCH1","NOTCH2","CD274","JAK2",
    "IRF4","PIM1","EZH2","KMT2D","MYD88","CARD11","CREBBP",
    "IGH@","IGH-@","IGH-@-ext","IGHG1","IGHG2","IGHG3","IGHGP","IGHM",
    "IGK@","IGK-@","IGL@","IGL-@"
}


def normalize_ig(gene):
    if gene.startswith("IGH"): return "IGH"
    if gene.startswith("IGK"): return "IGK"
    if gene.startswith("IGL"): return "IGL"
    return gene


def main():
    # Load cell line metadata
    with open(OUTPUT_DIR / "cell_lines.json") as f:
        cl_data = json.load(f)
    cl_ids = {cl["id"] for cl in cl_data}
    name_to_id = {cl["name"]: cl["id"] for cl in cl_data}
    id_to_name = {cl["id"]: cl["name"] for cl in cl_data}

    # ── RNA-seq fusions ──
    fusions_by_cl = defaultdict(list)

    fusion_file = DEPMAP_DIR / "OmicsFusionFiltered.csv"
    with open(fusion_file) as f:
        reader = csv.DictReader(f)
        for row in reader:
            model_id = row["ModelID"]
            if model_id not in cl_ids:
                continue
            left = row["LeftGene"].split(" ")[0]
            right = row["RightGene"].split(" ")[0]
            if left not in KEY_GENES and right not in KEY_GENES:
                continue

            left_norm = normalize_ig(left)
            right_norm = normalize_ig(right)

            if left_norm in ("IGH", "IGK", "IGL"):
                canonical = f"{right}--{left_norm}"
            elif right_norm in ("IGH", "IGK", "IGL"):
                canonical = f"{left}--{right_norm}"
            else:
                canonical = row["FusionName"]

            fusions_by_cl[model_id].append({
                "fusionName": canonical,
                "leftGene": left,
                "rightGene": right,
                "leftBreakpoint": row["LeftBreakpoint"],
                "rightBreakpoint": row["RightBreakpoint"],
                "junctionReadCount": int(row["JunctionReadCount"]),
                "spanningFragCount": int(row["SpanningFragCount"]),
                "ffpm": float(row["FFPM"]),
                "source": "RNA-seq"
            })

    # Deduplicate RNA-seq: keep highest-FFPM per canonical fusion per cell line
    output = {}
    for cl_id, fusions in fusions_by_cl.items():
        seen = {}
        for fu in fusions:
            key = fu["fusionName"]
            if key not in seen or fu["ffpm"] > seen[key]["ffpm"]:
                seen[key] = fu
        output[cl_id] = list(seen.values())

    # ── Merge curated fusions ──
    curated_added = 0
    for entry in CURATED_FUSIONS:
        for cell_name in entry["names"]:
            cl_id = name_to_id.get(cell_name)
            if not cl_id:
                continue

            gene = entry["gene"]
            partner = entry["partner"]

            # Check if already detected by RNA-seq (exact gene match, not substring)
            existing = output.get(cl_id, [])
            already_found = any(
                gene == f.get("leftGene") or gene == f.get("rightGene")
                for f in existing
            )
            if already_found:
                continue

            if cl_id not in output:
                output[cl_id] = []

            url = get_source_url(cell_name, entry["source"])
            fusion_entry = {
                "fusionName": f"{gene}--{partner}",
                "leftGene": gene,
                "rightGene": partner,
                "ffpm": 0,
                "source": "curated",
                "curatedSource": entry["source"],
                "curatedEvent": entry["event"]
            }
            if url:
                fusion_entry["curatedUrl"] = url
            # Always include Cellosaurus URL if available (useful for external links)
            acc = CELL_LINE_ACCESSIONS.get(cell_name, {})
            if "cellosaurus" in acc:
                fusion_entry["cellosaurusUrl"] = f"https://www.cellosaurus.org/{acc['cellosaurus']}"
            output[cl_id].append(fusion_entry)
            curated_added += 1

    # ── Summary ──
    total = sum(len(v) for v in output.values())
    rna_count = sum(1 for v in output.values() for f in v if f.get("source") == "RNA-seq")
    cur_count = sum(1 for v in output.values() for f in v if f.get("source") == "curated")

    print(f"Cell lines with fusions: {len(output)}")
    print(f"Total fusions: {total}")
    print(f"  RNA-seq detected: {rna_count}")
    print(f"  Curated (literature): {cur_count}")
    print()

    # Verify OCI-LY7
    oci_ly7_id = name_to_id.get("OCI-LY7")
    if oci_ly7_id:
        print("OCI-LY7 fusions:")
        for f in output.get(oci_ly7_id, []):
            src = f.get("curatedEvent", "") if f["source"] == "curated" else f"FFPM={f['ffpm']}"
            print(f"  {f['fusionName']:30s}  source={f['source']}  {src}")

    # Write
    with open(OUTPUT_DIR / "fusions.json", "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nWrote {OUTPUT_DIR / 'fusions.json'}")


if __name__ == "__main__":
    main()
