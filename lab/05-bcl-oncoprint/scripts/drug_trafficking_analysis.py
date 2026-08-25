#!/usr/bin/env python3
"""Analyze differential drug sensitivity in trafficking-mutant vs WT DLBCL lines."""

import json
import statistics
from collections import defaultdict
from math import sqrt, erfc
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "public" / "data"

with open(DATA_DIR / "cell_lines.json") as f:
    cls = json.load(f)
with open(DATA_DIR / "mutations.json") as f:
    muts = json.load(f)
with open(DATA_DIR / "drug_sensitivity.json") as f:
    drug_data = json.load(f)
with open(DATA_DIR / "genes.json") as f:
    genes = json.load(f)

id_to_cl = {cl["id"]: cl for cl in cls}
screened = set(drug_data["screenedLines"])
trafficking = genes["panels"]["gc_trafficking"]
retention_genes = set(trafficking["categories"]["retention"])
egress_genes = set(trafficking["categories"]["egress"])
all_trafficking = retention_genes | egress_genes

cl_trafficking_muts = defaultdict(set)
cl_retention_muts = defaultdict(set)
cl_egress_muts = defaultdict(set)
for m in muts:
    if m["gene"] in retention_genes:
        cl_retention_muts[m["cellLineId"]].add(m["gene"])
    if m["gene"] in egress_genes:
        cl_egress_muts[m["cellLineId"]].add(m["gene"])
    if m["gene"] in all_trafficking:
        cl_trafficking_muts[m["cellLineId"]].add(m["gene"])

# All DLBCL with drug data
dlbcl = [cl for cl in cls if cl["subtype"].startswith("DLBCL") and cl["id"] in screened]
dlbcl_mut = [cl["id"] for cl in dlbcl if cl_trafficking_muts.get(cl["id"])]
dlbcl_wt = [cl["id"] for cl in dlbcl if not cl_trafficking_muts.get(cl["id"])]

print(f"ALL DLBCL (GCB+ABC) with drug data: {len(dlbcl)}")
print(f"  Trafficking-mutant (n={len(dlbcl_mut)}):")
for cid in dlbcl_mut:
    cl = id_to_cl[cid]
    print(f"    {cl['name']:20s} {cl['subtype']:12s} {sorted(cl_trafficking_muts[cid])}")
print(f"  Wild-type (n={len(dlbcl_wt)}):")
for cid in dlbcl_wt:
    cl = id_to_cl[cid]
    print(f"    {cl['name']:20s} {cl['subtype']:12s}")

drug_list = drug_data["drugList"]
data = drug_data["data"]


def welch_t(mut_vals, wt_vals):
    """Welch's t-test returning diff, t-stat, approx p."""
    n1, n2 = len(mut_vals), len(wt_vals)
    m1, m2 = statistics.mean(mut_vals), statistics.mean(wt_vals)
    if n1 < 2 or n2 < 2:
        return m1 - m2, 0, 1.0, m1, m2
    v1 = statistics.variance(mut_vals)
    v2 = statistics.variance(wt_vals)
    se = sqrt(v1 / n1 + v2 / n2) if (v1 + v2) > 0 else 0.001
    t_stat = (m1 - m2) / se
    # Approx p (normal approx, conservative for small df)
    df_num = (v1 / n1 + v2 / n2) ** 2
    df_den = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1) if (v1 / n1 + v2 / n2) > 0 else 1
    df = df_num / df_den if df_den > 0 else 1
    z = abs(t_stat) * (1 - 1 / (4 * max(df, 1)))
    p = 2 * 0.5 * erfc(z / sqrt(2))
    return m1 - m2, t_stat, p, m1, m2


def compare_all_drugs(mut_ids, wt_ids):
    results = []
    for d in drug_list:
        idx_str = str(d["i"])
        mut_vals = [data[cid][idx_str] for cid in mut_ids if cid in data and idx_str in data[cid]]
        wt_vals = [data[cid][idx_str] for cid in wt_ids if cid in data and idx_str in data[cid]]
        if len(mut_vals) < 3 or len(wt_vals) < 3:
            continue
        diff, t_stat, p, mut_mean, wt_mean = welch_t(mut_vals, wt_vals)
        results.append({
            "drug": d,
            "diff": diff,
            "t": t_stat,
            "p": p,
            "mut_mean": mut_mean,
            "wt_mean": wt_mean,
            "n_mut": len(mut_vals),
            "n_wt": len(wt_vals),
        })

    # BH FDR
    results.sort(key=lambda x: x["p"])
    m = len(results)
    for i, r in enumerate(results):
        r["q"] = min(r["p"] * m / (i + 1), 1.0)
    for i in range(m - 2, -1, -1):
        results[i]["q"] = min(results[i]["q"], results[i + 1]["q"])

    return results


def print_table(results, title, n_mut, n_wt, direction="resistant", top_n=30):
    if direction == "resistant":
        sorted_r = sorted(results, key=lambda x: -x["diff"])
        header = f"MORE RESISTANT in mutant (n={n_mut} vs {n_wt})"
    else:
        sorted_r = sorted(results, key=lambda x: x["diff"])
        header = f"MORE SENSITIVE in mutant (n={n_mut} vs {n_wt})"

    print()
    print("=" * 120)
    print(f"{title}: {header}")
    hdr = f"{'Drug':30s} {'MOA':32s} {'MUT':>7s} {'WT':>7s} {'Diff':>7s} {'t':>6s} {'p':>8s} {'FDR':>8s}"
    print(hdr)
    print("-" * 120)
    for r in sorted_r[:top_n]:
        d = r["drug"]
        sig = "*" if r["p"] < 0.05 else " "
        fdr_sig = "*" if r["q"] < 0.20 else " "
        moa = (d.get("m") or "-")[:32]
        print(f"{d['n']:30s} {moa:32s} {r['mut_mean']:7.3f} {r['wt_mean']:7.3f} {r['diff']:7.3f} {r['t']:6.2f} {r['p']:8.4f}{sig} {r['q']:8.4f}{fdr_sig}")


# ── Analysis 1: All trafficking mutations (GNA13/GNAI2/S1PR2/etc) ──
results_all = compare_all_drugs(dlbcl_mut, dlbcl_wt)
print_table(results_all, "ALL TRAFFICKING MUTATIONS", len(dlbcl_mut), len(dlbcl_wt), "resistant")
print_table(results_all, "ALL TRAFFICKING MUTATIONS", len(dlbcl_mut), len(dlbcl_wt), "sensitive")

# ── S1P / trafficking drugs ──
print()
print("=" * 120)
print("S1P / TRAFFICKING-RELATED DRUGS (all DLBCL)")
hdr2 = f"{'Drug':30s} {'Target':22s} {'MOA':28s} {'MUT':>7s} {'WT':>7s} {'Diff':>7s} {'t':>6s} {'p':>7s}"
print(hdr2)
print("-" * 120)
s1p_kw = ["S1P", "SPHINGOSINE", "CXCR4", "CXCR5", "GNA13", "GNAI", "RHOA", "RAC", "CDC42",
           "BTK", "SYK", "PI3K", "MTOR", "WORTMANNIN"]
s1p_results = []
for r in results_all:
    d = r["drug"]
    text = (d.get("t", "") + " " + d.get("m", "") + " " + d.get("n", "")).upper()
    if any(kw in text for kw in s1p_kw):
        s1p_results.append(r)
s1p_results.sort(key=lambda x: x["diff"])
for r in s1p_results:
    d = r["drug"]
    sig = "*" if r["p"] < 0.05 else " "
    t_str = (d.get("t") or "-")[:22]
    m_str = (d.get("m") or "-")[:28]
    print(f"{d['n']:30s} {t_str:22s} {m_str:28s} {r['mut_mean']:7.3f} {r['wt_mean']:7.3f} {r['diff']:7.3f} {r['t']:6.2f} {r['p']:7.4f}{sig}")

# ── Analysis 2: Retention-only mutations ──
ret_mut = [cl["id"] for cl in dlbcl if cl_retention_muts.get(cl["id"])]
ret_wt = [cl["id"] for cl in dlbcl if not cl_retention_muts.get(cl["id"])]
print()
print()
print(f"RETENTION-ONLY MUTATIONS (GNA13/S1PR2/P2RY8/RHOA/ARHGEF1/CXCR4/CXCR5): n={len(ret_mut)} vs {len(ret_wt)}")
for cid in ret_mut:
    cl = id_to_cl[cid]
    print(f"    {cl['name']:20s} {cl['subtype']:12s} {sorted(cl_retention_muts[cid])}")

results_ret = compare_all_drugs(ret_mut, ret_wt)
print_table(results_ret, "RETENTION MUTATIONS ONLY", len(ret_mut), len(ret_wt), "resistant", 20)
print_table(results_ret, "RETENTION MUTATIONS ONLY", len(ret_mut), len(ret_wt), "sensitive", 20)

# ── Analysis 3: Egress-only mutations ──
egr_mut = [cl["id"] for cl in dlbcl if cl_egress_muts.get(cl["id"])]
egr_wt = [cl["id"] for cl in dlbcl if not cl_egress_muts.get(cl["id"])]
if len(egr_mut) >= 3 and len(egr_wt) >= 3:
    print()
    print()
    print(f"EGRESS-ONLY MUTATIONS (GNAI2/RAC1/RAC2/CDC42/S1PR1): n={len(egr_mut)} vs {len(egr_wt)}")
    for cid in egr_mut:
        cl = id_to_cl[cid]
        print(f"    {cl['name']:20s} {cl['subtype']:12s} {sorted(cl_egress_muts[cid])}")
    results_egr = compare_all_drugs(egr_mut, egr_wt)
    print_table(results_egr, "EGRESS MUTATIONS ONLY", len(egr_mut), len(egr_wt), "resistant", 15)
    print_table(results_egr, "EGRESS MUTATIONS ONLY", len(egr_mut), len(egr_wt), "sensitive", 15)
else:
    print(f"\nEGRESS-ONLY: insufficient n (mut={len(egr_mut)}, wt={len(egr_wt)})")

# ── Summary: drugs significant at p<0.05 ──
print()
print("=" * 120)
print("SUMMARY: Drugs with nominal p < 0.05 (all trafficking mutations, all DLBCL)")
print("-" * 120)
sig_drugs = [r for r in results_all if r["p"] < 0.05]
sig_drugs.sort(key=lambda x: x["p"])
for r in sig_drugs:
    d = r["drug"]
    direction = "RESISTANT" if r["diff"] > 0 else "SENSITIVE"
    fdr_note = f" (FDR={r['q']:.3f})" if r["q"] < 0.20 else ""
    moa = d.get("m") or "-"
    print(f"  p={r['p']:.4f}  {direction:9s}  diff={r['diff']:+.3f}  {d['n']:30s} {moa}{fdr_note}")

print(f"\nTotal drugs tested: {len(results_all)}")
print(f"Nominally significant (p<0.05): {len(sig_drugs)}")
print(f"FDR < 0.20: {sum(1 for r in results_all if r['q'] < 0.20)}")
