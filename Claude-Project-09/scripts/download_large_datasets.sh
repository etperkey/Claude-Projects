#!/bin/bash
# Download script for large DLBCL datasets
# Run with: bash download_large_datasets.sh

DATA_DIR="../data"

echo "=== DLBCL Large Dataset Download Script ==="
echo ""

# GSE165860 - Tonsil scRNA-seq Reference (10.9 GB)
echo "Downloading GSE165860 (Tonsil scRNA-seq reference)..."
echo "Size: 10.9 GB - This may take a while..."
mkdir -p "$DATA_DIR/GEO/GSE165860"
curl -o "$DATA_DIR/GEO/GSE165860/GSE165860_RAW.tar" \
    "https://www.ncbi.nlm.nih.gov/geo/download/?acc=GSE165860&format=file"

# Extract if download successful
if [ -f "$DATA_DIR/GEO/GSE165860/GSE165860_RAW.tar" ]; then
    echo "Extracting GSE165860_RAW.tar..."
    tar -xvf "$DATA_DIR/GEO/GSE165860/GSE165860_RAW.tar" -C "$DATA_DIR/GEO/GSE165860/"
    echo "Done extracting GSE165860"
fi

echo ""
echo "=== Download Complete ==="
echo ""
echo "For controlled-access data (EGA, dbGaP), you need to:"
echo "1. Apply for data access through respective portals"
echo "2. Use specialized download clients after approval"
echo ""
echo "EGA Data (EGAS50000001227): https://ega-archive.org/"
echo "dbGaP Data (phs001444): https://dbgap.ncbi.nlm.nih.gov/"
