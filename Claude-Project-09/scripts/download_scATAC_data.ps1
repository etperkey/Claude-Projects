# PowerShell script to download publicly available scATAC-seq data
# Run with: .\download_scATAC_data.ps1

$DataDir = "..\data\scATAC"

Write-Host "=== scATAC-seq Data Download Script ===" -ForegroundColor Green
Write-Host ""

# Create directory
if (!(Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

Write-Host "Available datasets:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. GSE237987 - ARID1A Lymphomagenesis Multiome (Mouse B cells)"
Write-Host "   - Size: ~7.7 GB raw, 6.7 GB processed Seurat object"
Write-Host "   - Contains: scATAC-seq + scRNA-seq multiome data"
Write-Host "   - Paper: Cancer Cell 2024 (Melnick Lab)"
Write-Host ""

$choice = Read-Host "Download GSE237987 processed data? (y/n)"

if ($choice -eq "y") {
    Write-Host ""
    Write-Host "Downloading GSE237987 processed Seurat multiome object (6.7 GB)..." -ForegroundColor Yellow
    Write-Host "This will take a while..."

    $url = "https://ftp.ncbi.nlm.nih.gov/geo/series/GSE237nnn/GSE237987/suppl/GSE237987_final.arid1a.msobj.pseudotime.rds.gz"
    $output = "$DataDir\GSE237987_multiome_seurat.rds.gz"

    try {
        Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
        Write-Host "Download complete: $output" -ForegroundColor Green
    }
    catch {
        Write-Host "Error downloading: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== NOTE: Wang et al. 2026 scATAC-seq Data ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "The primary DLBCL scATAC-seq data (102 samples) from Wang et al."
Write-Host "is in EGA (controlled access): EGAS50000001227"
Write-Host ""
Write-Host "To access:"
Write-Host "1. Register at https://ega-archive.org/"
Write-Host "2. Submit data access request to DAC"
Write-Host "3. Contact: Louis Staudt (lstaudt@mail.nih.gov)"
Write-Host ""
Write-Host "After approval, use pyEGA3 client to download."
