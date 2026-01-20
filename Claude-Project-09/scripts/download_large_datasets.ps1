# PowerShell Download script for large DLBCL datasets
# Run with: .\download_large_datasets.ps1

$DataDir = "..\data"

Write-Host "=== DLBCL Large Dataset Download Script ===" -ForegroundColor Green
Write-Host ""

# GSE165860 - Tonsil scRNA-seq Reference (10.9 GB)
Write-Host "Downloading GSE165860 (Tonsil scRNA-seq reference)..." -ForegroundColor Yellow
Write-Host "Size: 10.9 GB - This may take a while..."

$GSE165860Dir = "$DataDir\GEO\GSE165860"
if (!(Test-Path $GSE165860Dir)) {
    New-Item -ItemType Directory -Path $GSE165860Dir -Force | Out-Null
}

$url = "https://www.ncbi.nlm.nih.gov/geo/download/?acc=GSE165860&format=file"
$output = "$GSE165860Dir\GSE165860_RAW.tar"

try {
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    Write-Host "Download complete!" -ForegroundColor Green

    # Extract tar file
    Write-Host "Extracting GSE165860_RAW.tar..."
    tar -xvf $output -C $GSE165860Dir
    Write-Host "Extraction complete!" -ForegroundColor Green
}
catch {
    Write-Host "Error downloading file: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Download Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "For controlled-access data (EGA, dbGaP), you need to:" -ForegroundColor Cyan
Write-Host "1. Apply for data access through respective portals"
Write-Host "2. Use specialized download clients after approval"
Write-Host ""
Write-Host "EGA Data (EGAS50000001227): https://ega-archive.org/"
Write-Host "dbGaP Data (phs001444): https://dbgap.ncbi.nlm.nih.gov/"
