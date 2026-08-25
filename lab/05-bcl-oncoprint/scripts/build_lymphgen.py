#!/usr/bin/env python3
"""
Build LymphGen genetic subtype classification for DLBCL cell lines.

Four-pass classification system:
  Pass 1: Literature curation (Wright 2020, Sherif 2024) — highest priority
  Pass 2: LymphGen v2.0 web tool results — confident calls (>0.5)
  Pass 3: Heuristic rules from mutation/CNV/fusion data — fills gaps
  Pass 4: tLymphGen expression classifier (Kline Lab) — supplementary

tLymphGen adds expression-based predictions (tl/tlp fields) for all lines
with RNA-seq data, and serves as primary classification for lines that
passes 1-3 leave unclassified.

Key caveat: MYD88 L265P has zero mutations in DepMap WES data, so the
LymphGen v2.0 tool gives MCD=0 for all lines. MCD detection relies on
heuristic CD79B mutation detection + literature curation.

Output: public/data/lymphgen.json

LymphGen subtypes (Schmitz 2018, Wright 2020):
  MCD  - MYD88/CD79B co-mutated, ABC subtype
  BN2  - BCL6/NOTCH2, often ABC
  EZB  - EZH2/BCL2, GCB subtype
  ST2  - SGK1/TET2, GCB subtype
  N1   - NOTCH1 PEST truncation
  A53  - TP53/CDKN2A biallelic loss (modifier, can co-occur)
"""

import json
import re
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "public" / "data"

CELL_LINES_JSON = DATA_DIR / "cell_lines.json"
MUTATIONS_JSON = DATA_DIR / "mutations.json"
CNV_JSON = DATA_DIR / "cnv.json"
FUSIONS_JSON = DATA_DIR / "fusions.json"
OUTPUT_JSON = DATA_DIR / "lymphgen.json"
LYMPHGEN_INPUT_DIR = SCRIPT_DIR / "lymphgen_input"
LYMPHGEN_RESULT_FILE = LYMPHGEN_INPUT_DIR / "results" / "BCL_Oncoprint" / "BCL_Oncoprint_Result.txt"
TLYMPHGEN_RESULT_FILE = SCRIPT_DIR / "tlymphgen_results.tsv"

# Minimum confidence threshold for LymphGen v2.0 calls
LG2_CONFIDENCE_THRESHOLD = 0.5


def load_data():
    """Load all required data files."""
    with open(CELL_LINES_JSON, encoding="utf-8") as f:
        cell_lines = json.load(f)

    with open(MUTATIONS_JSON, encoding="utf-8") as f:
        mutations_list = json.load(f)

    with open(CNV_JSON, encoding="utf-8") as f:
        cnv_list = json.load(f)

    with open(FUSIONS_JSON, encoding="utf-8") as f:
        fusions_dict = json.load(f)

    return cell_lines, mutations_list, cnv_list, fusions_dict


def build_mutation_map(mutations_list):
    """Build lookup: {cellLineId: {gene: [mutation objects]}}"""
    mut_map = {}
    for m in mutations_list:
        cl = m["cellLineId"]
        gene = m["gene"]
        if cl not in mut_map:
            mut_map[cl] = {}
        if gene not in mut_map[cl]:
            mut_map[cl][gene] = []
        mut_map[cl][gene].append(m)
    return mut_map


def build_cnv_map(cnv_list):
    """Build lookup: {cellLineId: {gene: {copyRatio, status}}}"""
    cnv_map = {}
    for c in cnv_list:
        cl = c["cellLineId"]
        gene = c["gene"]
        if cl not in cnv_map:
            cnv_map[cl] = {}
        cnv_map[cl][gene] = {
            "copyRatio": c.get("copyRatio", c.get("log2")),
            "status": c["status"],
        }
    return cnv_map


def build_fusion_map(fusions_dict):
    """Build lookup: {cellLineId: [fusion objects]}"""
    # fusions.json is already keyed by cellLineId
    return fusions_dict


def has_bcl2_igh_fusion(fusions):
    """Check if cell line has BCL2-IGH fusion."""
    for fu in fusions:
        left = (fu.get("leftGene") or "").split()[0]
        right = (fu.get("rightGene") or "").split()[0]
        left_norm = "IGH" if left.startswith("IGH") else left
        right_norm = "IGH" if right.startswith("IGH") else right
        if (left == "BCL2" and right_norm == "IGH") or (right == "BCL2" and left_norm == "IGH"):
            return True
    return False


def has_bcl6_rearrangement(fusions):
    """Check if cell line has BCL6 rearrangement (any partner)."""
    for fu in fusions:
        left = (fu.get("leftGene") or "").split()[0]
        right = (fu.get("rightGene") or "").split()[0]
        if left == "BCL6" or right == "BCL6":
            return True
    return False


def get_ezh2_hotspot(mutations):
    """Check for EZH2 Y646/Y666 hotspot mutations. Returns description or None."""
    ezh2_muts = mutations.get("EZH2", [])
    for m in ezh2_muts:
        pc = m.get("proteinChange", "")
        # Y646 is the canonical SET domain hotspot (Y641 in older numbering)
        # Y666 is also a known hotspot in lymphoma
        if "Y646" in pc or "Y641" in pc or "Y666" in pc:
            return f"EZH2 {pc.replace('p.', '')}"
        # Also check if it's a known hotspot
        if m.get("hotspot") and m.get("impact") in ("MODERATE", "HIGH"):
            return f"EZH2 {pc.replace('p.', '')}"
    return None


def get_cd79b_itam_mutation(mutations):
    """Check for CD79B ITAM domain mutation (HIGH impact or known hotspot in ITAM)."""
    cd79b_muts = mutations.get("CD79B", [])
    for m in cd79b_muts:
        pc = m.get("proteinChange", "")
        desc = pc.replace("p.", "") if pc else m.get("dnaChange", "").split(":")[-1] or "mut"
        # Y196 is the canonical ITAM tyrosine
        if "Y196" in pc:
            return f"CD79B {desc}"
        # Other HIGH impact CD79B mutations
        if m.get("impact") == "HIGH":
            return f"CD79B {desc}"
        # Known hotspot
        if m.get("hotspot"):
            return f"CD79B {desc}"
    return None


def get_notch2_pest_truncation(mutations):
    """Check for NOTCH2 PEST domain truncation (position >2000)."""
    notch2_muts = mutations.get("NOTCH2", [])
    for m in notch2_muts:
        if m.get("impact") != "HIGH":
            continue
        pc = m.get("proteinChange", "")
        pos_match = re.search(r"[A-Z](\d+)", pc)
        if pos_match:
            pos = int(pos_match.group(1))
            if pos > 2000:  # PEST domain is C-terminal
                return f"NOTCH2 {pc.replace('p.', '')}"
    return None


def get_notch1_pest_truncation(mutations):
    """Check for NOTCH1 PEST domain truncation (HIGH impact)."""
    notch1_muts = mutations.get("NOTCH1", [])
    for m in notch1_muts:
        if m.get("impact") == "HIGH":
            pc = m.get("proteinChange", "")
            return f"NOTCH1 {pc.replace('p.', '')}"
    return None


def has_gene_mutation(mutations, gene):
    """Check if cell line has any mutation in the given gene."""
    return len(mutations.get(gene, [])) > 0


def has_hom_del(cnv, gene):
    """Check for homozygous deletion."""
    gene_cnv = cnv.get(gene)
    return gene_cnv is not None and gene_cnv["status"] == "hom_del"


def has_tp53_mutation(mutations):
    """Check for TP53 mutation (any impact)."""
    tp53_muts = mutations.get("TP53", [])
    for m in tp53_muts:
        if m.get("impact") in ("HIGH", "MODERATE"):
            pc = m.get("proteinChange", "")
            return f"TP53 {pc.replace('p.', '')}"
    return None


def parse_lymphgen_results(cl_by_name):
    """Parse LymphGen v2.0 web tool results.

    Returns:
        classified: {cl_id: {s, c, p}} for lines with confident calls
        all_results: {cl_id: row_dict} for ALL lines (for heuristic validation)
    """
    if not LYMPHGEN_RESULT_FILE.exists():
        print("    (result file not found, skipping)")
        return {}, {}

    classified = {}
    all_results = {}

    with open(LYMPHGEN_RESULT_FILE, encoding="utf-8") as f:
        header = f.readline().strip().split("\t")
        for line in f:
            line = line.strip()
            if not line:
                continue
            fields = line.split("\t")
            row = dict(zip(header, fields))

            name = row["Sample.Name"]
            prediction = row["Subtype.Prediction"]

            cl = cl_by_name.get(name)
            if not cl:
                continue

            # Store full results for all lines (for validation)
            all_results[cl["id"]] = row

            if prediction == "Other":
                continue

            # Get confidence for the predicted subtype
            # Handle compound predictions like "N1/ST2", "EZB/N1", "MCD/A53"
            if "/" in prediction:
                primary = prediction.split("/")[0]
                conf_key = f"Confidence.{primary}"
            else:
                conf_key = f"Confidence.{prediction}"
            confidence = float(row.get(conf_key, 0))

            if confidence < LG2_CONFIDENCE_THRESHOLD:
                continue

            classified[cl["id"]] = {
                "s": prediction,
                "c": "lg2",
                "p": confidence,
            }

    return classified, all_results


def parse_tlymphgen_results():
    """Parse tLymphGen expression-based classification results.

    Returns: {depmap_id: {prediction, probability, probs: {BN2, EZB, MCD, ST2}}}
    """
    if not TLYMPHGEN_RESULT_FILE.exists():
        print("    (tLymphGen results not found, run run_tlymphgen.py first)")
        return {}

    results = {}
    with open(TLYMPHGEN_RESULT_FILE, encoding="utf-8") as f:
        header = f.readline().strip().split("\t")
        for line in f:
            line = line.strip()
            if not line:
                continue
            fields = line.split("\t")
            row = dict(zip(header, fields))
            depmap_id = row["depmap_id"]
            results[depmap_id] = {
                "prediction": row["tl_prediction"],
                "probability": float(row["tl_probability"]),
                "probs": {
                    "BN2": float(row.get("tl_prob_BN2", 0)),
                    "EZB": float(row.get("tl_prob_EZB", 0)),
                    "MCD": float(row.get("tl_prob_MCD", 0)),
                    "ST2": float(row.get("tl_prob_ST2", 0)),
                },
            }
    return results


def classify_heuristic(cl_id, subtype, mut_map, cnv_map, fusion_map):
    """
    Apply heuristic LymphGen rules. Returns list of (subtype, [evidence]) tuples.
    Only applies to DLBCL lines (GCB or ABC).

    NOTE: EZB requires EZH2 hotspot (BCL2-IGH alone is insufficient per
    LymphGen v2.0 validation — gives only 0.43 baseline confidence).
    """
    if subtype not in ("DLBCL_GCB", "DLBCL_ABC"):
        return []

    mutations = mut_map.get(cl_id, {})
    cnv = cnv_map.get(cl_id, {})
    fusions = fusion_map.get(cl_id, [])

    calls = []

    # MCD: CD79B ITAM mutation in ABC line
    # NOTE: MYD88 L265P has zero hits in DepMap WES, so we rely on CD79B alone
    if subtype == "DLBCL_ABC":
        cd79b_hit = get_cd79b_itam_mutation(mutations)
        if cd79b_hit:
            calls.append(("MCD", [cd79b_hit]))

    # EZB: EZH2 hotspot REQUIRED; BCL2-IGH is supplementary evidence
    # (BCL2-IGH alone gives only 0.43 EZB confidence in LymphGen v2.0)
    if subtype == "DLBCL_GCB":
        ezh2_hit = get_ezh2_hotspot(mutations)
        bcl2_igh = has_bcl2_igh_fusion(fusions)
        if ezh2_hit:
            evidence = [ezh2_hit]
            if bcl2_igh:
                evidence.append("BCL2-IGH")
            calls.append(("EZB", evidence))

    # BN2: NOTCH2 PEST truncation AND/OR BCL6 rearrangement
    notch2_hit = get_notch2_pest_truncation(mutations)
    bcl6_rear = has_bcl6_rearrangement(fusions)
    if notch2_hit or bcl6_rear:
        evidence = []
        if notch2_hit:
            evidence.append(notch2_hit)
        if bcl6_rear:
            evidence.append("BCL6 rearrangement")
        calls.append(("BN2", evidence))

    # ST2: SGK1 + TET2 (need both)
    if has_gene_mutation(mutations, "SGK1") and has_gene_mutation(mutations, "TET2"):
        calls.append(("ST2", ["SGK1 mut", "TET2 mut"]))

    # N1: NOTCH1 PEST truncation
    notch1_hit = get_notch1_pest_truncation(mutations)
    if notch1_hit:
        calls.append(("N1", [notch1_hit]))

    # A53: TP53 mutation + CDKN2A hom_del (modifier, not primary)
    tp53_hit = has_tp53_mutation(mutations)
    cdkn2a_del = has_hom_del(cnv, "CDKN2A")
    if tp53_hit and cdkn2a_del:
        calls.append(("A53", [tp53_hit, "CDKN2A hom_del"]))

    return calls


def build_lymphgen_tsv(cell_lines, mut_map, cnv_map, fusion_map):
    """Generate TSV files formatted for LymphGen v2 web tool input."""
    LYMPHGEN_INPUT_DIR.mkdir(exist_ok=True)

    # Only DLBCL lines
    dlbcl_lines = [cl for cl in cell_lines if cl["subtype"] in ("DLBCL_GCB", "DLBCL_ABC")]

    # 1. Mutation TSV
    mut_rows = []
    for cl in dlbcl_lines:
        muts = mut_map.get(cl["id"], {})
        for gene, mut_list in muts.items():
            for m in mut_list:
                mut_rows.append({
                    "Sample.ID": cl["name"],
                    "Hugo_Symbol": gene,
                    "Variant_Classification": _vep_to_maf_class(m),
                    "HGVSp_Short": m.get("proteinChange", ""),
                })

    with open(LYMPHGEN_INPUT_DIR / "mutations.tsv", "w", newline="") as f:
        if mut_rows:
            cols = ["Sample.ID", "Hugo_Symbol", "Variant_Classification", "HGVSp_Short"]
            f.write("\t".join(cols) + "\n")
            for row in mut_rows:
                f.write("\t".join(str(row.get(c, "")) for c in cols) + "\n")

    # 2. CNV TSV
    cnv_rows = []
    for cl in dlbcl_lines:
        cnv_data = cnv_map.get(cl["id"], {})
        for gene, c in cnv_data.items():
            if c["status"] != "neutral":
                cnv_rows.append({
                    "Sample.ID": cl["name"],
                    "Hugo_Symbol": gene,
                    "CN_status": c["status"],
                    "Copy_Ratio": c["copyRatio"],
                })

    with open(LYMPHGEN_INPUT_DIR / "cnv.tsv", "w", newline="") as f:
        if cnv_rows:
            cols = ["Sample.ID", "Hugo_Symbol", "CN_status", "Copy_Ratio"]
            f.write("\t".join(cols) + "\n")
            for row in cnv_rows:
                f.write("\t".join(str(row.get(c, "")) for c in cols) + "\n")

    # 3. Fusion TSV
    fusion_rows = []
    for cl in dlbcl_lines:
        fusions = fusion_map.get(cl["id"], [])
        for fu in fusions:
            fusion_rows.append({
                "Sample.ID": cl["name"],
                "Fusion_Name": fu.get("fusionName", ""),
                "Left_Gene": (fu.get("leftGene") or "").split()[0],
                "Right_Gene": (fu.get("rightGene") or "").split()[0],
            })

    with open(LYMPHGEN_INPUT_DIR / "fusions.tsv", "w", newline="") as f:
        if fusion_rows:
            cols = ["Sample.ID", "Fusion_Name", "Left_Gene", "Right_Gene"]
            f.write("\t".join(cols) + "\n")
            for row in fusion_rows:
                f.write("\t".join(str(row.get(c, "")) for c in cols) + "\n")

    # 4. COO TSV
    with open(LYMPHGEN_INPUT_DIR / "coo.tsv", "w", newline="") as f:
        f.write("Sample.ID\tCOO\n")
        for cl in dlbcl_lines:
            coo = "GCB" if cl["subtype"] == "DLBCL_GCB" else "ABC"
            f.write(f"{cl['name']}\t{coo}\n")

    # 5. Sample list
    with open(LYMPHGEN_INPUT_DIR / "samples.tsv", "w", newline="") as f:
        f.write("Sample.ID\tDepMap_ID\tSubtype\n")
        for cl in dlbcl_lines:
            f.write(f"{cl['name']}\t{cl['id']}\t{cl['subtype']}\n")

    print(f"  LymphGen input TSVs written to {LYMPHGEN_INPUT_DIR}/")
    print(f"    {len(dlbcl_lines)} DLBCL cell lines")


def _vep_to_maf_class(mut):
    """Convert VEP consequence/impact to MAF-style classification."""
    impact = mut.get("impact", "")
    consequence = mut.get("consequence", "")
    vtype = mut.get("variantType", "")

    if impact == "HIGH":
        if "frameshift" in consequence or "frameshift" in vtype:
            return "Frame_Shift_Del" if "del" in vtype else "Frame_Shift_Ins"
        if "stop_gained" in consequence or "nonsense" in consequence:
            return "Nonsense_Mutation"
        if "splice" in consequence:
            return "Splice_Site"
        return "Nonsense_Mutation"  # fallback for HIGH
    if impact == "MODERATE":
        if "missense" in consequence:
            return "Missense_Mutation"
        if "inframe" in consequence:
            return "In_Frame_Del" if "del" in consequence else "In_Frame_Ins"
        return "Missense_Mutation"  # fallback
    return "Silent"


def main():
    print("Building LymphGen classification for BCL Oncoprint...")
    print()

    # Load data
    print("  Loading data files...")
    cell_lines, mutations_list, cnv_list, fusions_dict = load_data()
    print(f"    {len(cell_lines)} cell lines")
    print(f"    {len(mutations_list)} mutations")
    print(f"    {len(cnv_list)} CNV entries")
    print(f"    {len(fusions_dict)} cell lines with fusions")

    mut_map = build_mutation_map(mutations_list)
    cnv_map = build_cnv_map(cnv_list)
    fusion_map = build_fusion_map(fusions_dict)

    # Build cell line lookups
    cl_by_id = {cl["id"]: cl for cl in cell_lines}
    cl_by_name = {cl["name"]: cl for cl in cell_lines}

    dlbcl_lines = [cl for cl in cell_lines if cl["subtype"] in ("DLBCL_GCB", "DLBCL_ABC")]
    result = {}

    # ── Pass 1: Literature curation (highest priority) ──
    print()
    print("  Pass 1: Literature curation")

    LITERATURE = [
        ("KLINE-003", "MCD", "Wright 2020"),    # HBL-1
        ("ACH-001146", "MCD", "Wright 2020"),    # OCI-Ly10
        ("ACH-000398", "BN2", "Wright 2020"),    # RI-1
        ("ACH-000365", "EZB", "Wright 2020"),    # SU-DHL-4
        ("ACH-000534", "EZB", "Wright 2020"),    # WSU-DLCL2
        ("ACH-000611", "EZB", "Sherif 2024"),    # SU-DHL-6
        ("ACH-000124", "EZB", "Wright 2020"),    # OCI-LY-19 (as OCI-Ly1)
    ]

    for cl_id, subtype, source in LITERATURE:
        cl = cl_by_id.get(cl_id)
        name = cl["name"] if cl else cl_id
        result[cl_id] = {"s": subtype, "c": "lit", "src": source}
        print(f"    {name:20s} -> {subtype:4s}  ({source})")

    # ── Pass 2: LymphGen v2.0 web tool results ──
    print()
    print("  Pass 2: LymphGen v2.0 web tool results")

    lg2_results, lg2_all = parse_lymphgen_results(cl_by_name)
    lg2_count = 0

    for cl_id, data in lg2_results.items():
        cl = cl_by_id.get(cl_id)
        name = cl["name"] if cl else cl_id

        if cl_id in result:
            # Literature takes precedence; note LymphGen confirms
            lit_sub = result[cl_id]["s"]
            lg2_sub = data["s"]
            match = "confirms" if lg2_sub == lit_sub else f"says {lg2_sub}"
            print(f"    {name:20s} -> {data['s']:4s} (p={data['p']:.2f})  [lit {match}]")
            continue

        result[cl_id] = data
        lg2_count += 1
        print(f"    {name:20s} -> {data['s']:4s} (p={data['p']:.2f})")

    # ── Pass 3: Heuristic classification ──
    # Fills gaps: MCD (LymphGen blind to MYD88), EZH2-based EZB, other rules
    # For lines already classified by lg2, only add MCD as compound
    # NOTE: Current tool results used hg38 positions (wrong), causing EZH2 to not
    # be counted. Once re-run with fixed input (no Location column), many heuristic
    # EZB calls should be validated by the tool.
    print()
    print("  Pass 3: Heuristic classification")

    heur_count = 0

    for cl in dlbcl_lines:
        calls = classify_heuristic(cl["id"], cl["subtype"], mut_map, cnv_map, fusion_map)
        if not calls:
            continue

        mcd_calls = [c for c in calls if c[0] == "MCD"]
        non_mcd_calls = [c for c in calls if c[0] != "MCD"]

        if cl["id"] in result:
            # Already classified by literature or lg2
            existing = result[cl["id"]]

            # Only add MCD as compound (LymphGen can't detect MCD without MYD88)
            if mcd_calls and "MCD" not in existing["s"]:
                mcd_evidence = mcd_calls[0][1]
                existing["s"] = f"MCD/{existing['s']}"
                existing["d"] = mcd_evidence
                print(f"    {cl['name']:20s} -> +MCD compound  [{', '.join(mcd_evidence)}]")
                heur_count += 1
            continue

        # Not yet classified — apply full heuristic
        if len(calls) == 1:
            subtype, evidence = calls[0]
        else:
            subtypes = [c[0] for c in calls]
            evidence = []
            for c in calls:
                evidence.extend(c[1])
            subtype = "/".join(subtypes)

        entry = {"s": subtype, "c": "heur", "d": evidence}

        # Annotate with tool validation if available
        tool_row = lg2_all.get(cl["id"])
        if tool_row:
            # Get the tool's confidence for this heuristic subtype
            primary_sub = subtype.split("/")[0]
            conf_key = f"Confidence.{primary_sub}"
            tool_conf = float(tool_row.get(conf_key, 0))
            feat_key = f"{primary_sub}.Feature.Count"
            tool_feat = tool_row.get(feat_key, "?")
            entry["tp"] = tool_conf  # tool probability for display
            validation = f"tool: p={tool_conf:.2f}, {tool_feat}feat"
        else:
            validation = "no tool data"

        result[cl["id"]] = entry
        heur_count += 1
        print(f"    {cl['name']:20s} -> {subtype:8s}  [{', '.join(evidence)}]  ({validation})")

    # ── Pass 4: tLymphGen (expression-based, supplementary) ──
    # Adds tl/tlp fields to ALL classified entries, and promotes to primary
    # for any lines still unclassified by passes 1-3.
    print()
    print("  Pass 4: tLymphGen expression classifier (supplementary)")

    tlg_results = parse_tlymphgen_results()
    tlg_added = 0

    if tlg_results:
        for cl in dlbcl_lines:
            tlg = tlg_results.get(cl["id"])
            if not tlg:
                continue

            if cl["id"] in result:
                # Add tLymphGen as supplementary data
                result[cl["id"]]["tl"] = tlg["prediction"]
                result[cl["id"]]["tlp"] = tlg["probability"]
                genetic = result[cl["id"]]["s"].split("/")[0]
                match = "agrees" if genetic == tlg["prediction"] else f"says {tlg['prediction']}"
                print(f"    {cl['name']:20s}  tLG={tlg['prediction']} "
                      f"(p={tlg['probability']:.3f})  [genetic {genetic} {match}]")
            else:
                # Unclassified — promote tLymphGen to primary
                result[cl["id"]] = {
                    "s": tlg["prediction"],
                    "c": "tlg",
                    "tl": tlg["prediction"],
                    "tlp": tlg["probability"],
                }
                tlg_added += 1
                print(f"    {cl['name']:20s} -> {tlg['prediction']:4s} "
                      f"(p={tlg['probability']:.3f})  [NEW from tLG]")

        print(f"    tLymphGen annotated: {len(tlg_results)} lines, "
              f"{tlg_added} newly classified")
    else:
        print("    (no tLymphGen data)")

    # ── Summary ──
    print()
    lit_count = sum(1 for v in result.values() if v["c"] == "lit")
    lg2_total = sum(1 for v in result.values() if v["c"] == "lg2")
    heur_total = sum(1 for v in result.values() if v["c"] == "heur")
    tlg_total = sum(1 for v in result.values() if v["c"] == "tlg")
    compound_count = sum(1 for v in result.values() if "/" in v["s"])
    print(f"  Total classified: {len(result)}")
    print(f"    Literature:   {lit_count}")
    print(f"    LymphGen 2.0: {lg2_total} (+ {compound_count} compounds with heuristic MCD)")
    print(f"    Heuristic:    {heur_total}")
    print(f"    tLymphGen:    {tlg_total}")

    # Count by subtype (primary)
    subtype_counts = {}
    for v in result.values():
        st = v["s"].split("/")[0]  # Primary subtype
        subtype_counts[st] = subtype_counts.get(st, 0) + 1
    for st in sorted(subtype_counts):
        print(f"    {st:8s}: {subtype_counts[st]}")

    # Unclassified DLBCL
    unclassified = [cl for cl in dlbcl_lines if cl["id"] not in result]
    if unclassified:
        print()
        print(f"  Unclassified DLBCL lines ({len(unclassified)}):")
        for cl in unclassified:
            print(f"    {cl['name']:20s} ({cl['subtype']})")

    # ── Write output ──
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, separators=(",", ":"))
    print()
    print(f"  Output: {OUTPUT_JSON}")
    print(f"  Size: {OUTPUT_JSON.stat().st_size:,} bytes")

    # ── Generate LymphGen web tool input TSVs ──
    print()
    build_lymphgen_tsv(cell_lines, mut_map, cnv_map, fusion_map)

    print()
    print("Done.")


if __name__ == "__main__":
    main()
