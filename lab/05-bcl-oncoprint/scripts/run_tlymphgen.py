#!/usr/bin/env python3
"""
Run tLymphGen (transcriptional LymphGen) classifier on DLBCL cell lines.

Uses the Kline Lab's unpublished tLymphGen model to classify DLBCL cell lines
by gene expression patterns into 4 LymphGen subtypes: EZB, MCD, BN2, ST2.

The model is a Nearest Centroid classifier trained on NCI+BCC cohorts using
450 differentially expressed genes (Alan Cooper, Kline Lab, unpublished).

Input: DepMap 24Q4 RNA-seq log2(TPM+1) expression data
Model: ncibcc_4class_nc_dge_n450_f1.pkl
Features: 450 DGE-selected genes (tlymphgen_450_features.csv)

CAVEAT: The model was trained on DESeq2 VSDs, not log2(TPM+1). The
StandardScaler in the pipeline handles normalization differences, but
predictions may differ slightly from properly processed bulk RNA-seq.
Cell lines tend to have strong signals which helps.

Output: scripts/tlymphgen_results.tsv
"""
import csv
import json
import joblib
import numpy as np
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "public" / "data"
CELL_LINES_JSON = DATA_DIR / "cell_lines.json"

# DepMap expression file (cached from build_expression.py download)
EXPRESSION_CSV = SCRIPT_DIR / "OmicsExpressionProteinCodingGenesTPMLogp1.csv"

# tLymphGen model and features (Kline Lab, DLBCL_data repo)
DLBCL_DATA_DIR = Path(r"C:\Users\ericp\onedrive\desktop\claude-projects\lab\DLBCL_data")
MODEL_DIR = DLBCL_DATA_DIR / "processed" / "tlymph" / "models"
MODEL_FILE = MODEL_DIR / "ncibcc_4class_nc_dge_n450_f1.pkl"
FEATURES_CSV = MODEL_DIR / "tlymphgen_450_features.csv"
FEATURES_PKL = MODEL_DIR / "ncibcc_4class_nc_dge_n450_f1_features.pkl"

OUTPUT_TSV = SCRIPT_DIR / "tlymphgen_results.tsv"


def load_features():
    """Load the 450 tLymphGen feature genes in correct order."""
    # Try pkl first (preserves training order)
    if FEATURES_PKL.exists():
        features = joblib.load(FEATURES_PKL)
        if isinstance(features, (list, np.ndarray)):
            features = list(features)
            print(f"    Loaded {len(features)} features from pkl")
            return features

    # Fall back to CSV (alphabetical order)
    with open(FEATURES_CSV, "r") as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        features = [row[0] for row in reader if row]
    print(f"    Loaded {len(features)} features from CSV")
    return features


def load_cell_lines():
    """Load DLBCL cell lines."""
    with open(CELL_LINES_JSON, "r") as f:
        all_lines = json.load(f)
    dlbcl = [cl for cl in all_lines if cl["subtype"] in ("DLBCL_GCB", "DLBCL_ABC")]
    return {cl["id"]: cl for cl in dlbcl}


def extract_expression(cell_lines, feature_genes):
    """Extract expression for feature genes from DepMap CSV."""
    print("    Reading DepMap expression header...")
    with open(EXPRESSION_CSV, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)

    # Map gene names to column indices
    # Header: col 0 = ModelID, rest = "GENE (entrez_id)"
    gene_to_col = {}
    for i, col in enumerate(header):
        if i == 0:
            continue
        gene_name = col.split(" (")[0].strip() if " (" in col else col.strip()
        gene_to_col[gene_name] = i

    found = [g for g in feature_genes if g in gene_to_col]
    missing = [g for g in feature_genes if g not in gene_to_col]
    print(f"    Feature genes in DepMap: {len(found)}/{len(feature_genes)}")
    if missing:
        print(f"    Missing ({len(missing)}): {', '.join(sorted(missing)[:15])}")

    # Read expression for our cell lines
    cl_ids = set(cell_lines.keys())
    expression = {}

    print("    Scanning expression matrix...")
    with open(EXPRESSION_CSV, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            model_id = row[0]
            if model_id not in cl_ids:
                continue
            expr = {}
            for gene in feature_genes:
                col_idx = gene_to_col.get(gene)
                if col_idx is not None:
                    try:
                        expr[gene] = float(row[col_idx])
                    except (ValueError, IndexError):
                        expr[gene] = 0.0
                else:
                    expr[gene] = 0.0
            expression[model_id] = expr

    return expression, missing


def distance_to_proba(X_scaled, centroids):
    """Convert NearestCentroid distances to pseudo-probabilities.

    Uses negative squared distance with softmax normalization,
    similar to how the Rmd code handles it.
    """
    from sklearn.metrics import pairwise_distances
    distances = pairwise_distances(X_scaled, centroids, metric="euclidean")
    # Softmax on negative distances (closer = higher probability)
    neg_dist = -distances
    # Stabilize softmax
    neg_dist -= neg_dist.max(axis=1, keepdims=True)
    exp_dist = np.exp(neg_dist)
    probs = exp_dist / exp_dist.sum(axis=1, keepdims=True)
    return probs


def main():
    print("Running tLymphGen classifier on DLBCL cell lines")
    print()

    # Load features
    print("  Loading tLymphGen features...")
    feature_genes = load_features()

    # Load model
    print("  Loading model...")
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        pipeline = joblib.load(MODEL_FILE)
    print(f"    Model: {MODEL_FILE.name}")

    # Inspect pipeline structure
    if hasattr(pipeline, "named_steps"):
        print(f"    Pipeline steps: {list(pipeline.named_steps.keys())}")

    # Fix sklearn version mismatch: model trained with sklearn 1.4.2,
    # but NearestCentroid.predict() in 1.7+ expects class_prior_ attribute.
    # Set to uniform priors (same as original training behavior).
    for name, step in (pipeline.named_steps.items()
                       if hasattr(pipeline, "named_steps") else []):
        if hasattr(step, "centroids_") and not hasattr(step, "class_prior_"):
            n_classes = len(step.classes_)
            step.class_prior_ = np.full(n_classes, 1.0 / n_classes)
            print(f"    Patched {name}.class_prior_ for sklearn compat")

    if hasattr(pipeline, "classes_"):
        classes = [str(c) for c in pipeline.classes_]
        print(f"    Classes: {classes}")
    else:
        if hasattr(pipeline, "steps"):
            final = pipeline.steps[-1][1]
            if hasattr(final, "classes_"):
                classes = [str(c) for c in final.classes_]
                print(f"    Classes (from estimator): {classes}")
            else:
                classes = ["BN2", "EZB", "MCD", "ST2"]
                print(f"    Classes (assumed): {classes}")
        else:
            classes = ["BN2", "EZB", "MCD", "ST2"]
            print(f"    Classes (assumed): {classes}")

    # Load cell lines
    print("  Loading DLBCL cell lines...")
    cell_lines = load_cell_lines()
    print(f"    {len(cell_lines)} DLBCL lines")

    # Extract expression
    print("  Extracting expression data...")
    expression, missing_genes = extract_expression(cell_lines, feature_genes)
    print(f"    Lines with expression: {len(expression)}/{len(cell_lines)}")

    missing_lines = [cl["name"] for cl_id, cl in cell_lines.items()
                     if cl_id not in expression]
    if missing_lines:
        print(f"    No expression: {', '.join(missing_lines)}")

    # Build feature matrix (samples x genes, same order as feature_genes)
    sample_ids = sorted(expression.keys())
    X = np.array([[expression[sid][gene] for gene in feature_genes]
                  for sid in sample_ids])
    print(f"    Feature matrix: {X.shape}")

    # Run model
    print()
    print("  Running classifier...")
    predictions = pipeline.predict(X)

    # Get probabilities
    has_proba = hasattr(pipeline, "predict_proba")
    if has_proba:
        try:
            probabilities = pipeline.predict_proba(X)
            print("    Using predict_proba()")
        except Exception:
            has_proba = False

    if not has_proba:
        # Compute pseudo-probabilities from centroid distances
        print("    Computing probabilities from centroid distances...")
        if hasattr(pipeline, "named_steps"):
            # Apply scaler manually, then compute distances
            scaler_name = None
            nc_name = None
            for name, step in pipeline.named_steps.items():
                if hasattr(step, "transform") and hasattr(step, "mean_"):
                    scaler_name = name
                if hasattr(step, "centroids_"):
                    nc_name = name
            if scaler_name and nc_name:
                X_scaled = pipeline.named_steps[scaler_name].transform(X)
                centroids = pipeline.named_steps[nc_name].centroids_
                probabilities = distance_to_proba(X_scaled, centroids)
            else:
                # Try applying all transform steps except predict
                X_t = X
                for name, step in pipeline.named_steps.items():
                    if hasattr(step, "centroids_"):
                        centroids = step.centroids_
                        break
                    if hasattr(step, "transform"):
                        X_t = step.transform(X_t)
                probabilities = distance_to_proba(X_t, centroids)
        else:
            # Single estimator
            centroids = pipeline.centroids_
            probabilities = distance_to_proba(X, centroids)

    # Build results
    results = []
    for i, sid in enumerate(sample_ids):
        cl = cell_lines[sid]
        pred = predictions[i]
        probs = {cls: round(float(probabilities[i][j]), 3)
                 for j, cls in enumerate(classes)}
        max_prob = max(probs.values())

        results.append({
            "depmap_id": sid,
            "name": cl["name"],
            "coo": "GCB" if "GCB" in cl["subtype"] else "ABC",
            "prediction": pred,
            "probability": max_prob,
            "probs": probs,
        })

    # Sort by prediction, then probability
    results.sort(key=lambda r: (r["prediction"], -r["probability"]))

    # Print results
    print()
    cls_header = "  ".join(f"{c:>5}" for c in classes)
    print(f"  {'Cell Line':<22} {'COO':<5} {'tLG':<6} {'Prob':>5}  {cls_header}")
    print("  " + "-" * 75)

    for r in results:
        prob_str = "  ".join(f"{r['probs'][c]:>5.3f}" for c in classes)
        print(f"  {r['name']:<22} {r['coo']:<5} {r['prediction']:<6} "
              f"{r['probability']:>5.3f}  {prob_str}")

    # Summary
    pred_counts = {}
    for r in results:
        pred_counts[r["prediction"]] = pred_counts.get(r["prediction"], 0) + 1
    print()
    print("  Summary:")
    for sub in sorted(pred_counts):
        print(f"    {sub}: {pred_counts[sub]}")
    print(f"    Total: {len(results)}")

    if missing_genes:
        print(f"\n  Note: {len(missing_genes)}/{len(feature_genes)} features missing "
              f"from DepMap (filled with 0)")

    # Write TSV
    with open(OUTPUT_TSV, "w", newline="") as f:
        cols = ["depmap_id", "name", "coo", "tl_prediction", "tl_probability"]
        cols += [f"tl_prob_{c}" for c in classes]
        f.write("\t".join(cols) + "\n")
        for r in results:
            row = [r["depmap_id"], r["name"], r["coo"],
                   r["prediction"], f"{r['probability']:.3f}"]
            row += [f"{r['probs'][c]:.3f}" for c in classes]
            f.write("\t".join(row) + "\n")

    print(f"\n  Output: {OUTPUT_TSV}")
    print("\nDone.")


if __name__ == "__main__":
    main()
