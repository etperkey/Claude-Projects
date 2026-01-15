# Claude-Settings-ETP Install Script
# Deploys personalized Claude Code settings to the local machine

$ErrorActionPreference = "Stop"
$claudeDir = "$env:USERPROFILE\.claude"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Installing Claude-Settings-ETP..." -ForegroundColor Cyan

# Ensure .claude directory exists
if (!(Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir | Out-Null
    Write-Host "Created $claudeDir" -ForegroundColor Green
}

# Backup existing files
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$filesToBackup = @("CLAUDE.md", "settings.json", "settings.local.json")
foreach ($file in $filesToBackup) {
    $fullPath = "$claudeDir\$file"
    if (Test-Path $fullPath) {
        $backupPath = "$fullPath.backup.$timestamp"
        Copy-Item $fullPath $backupPath
        Write-Host "Backed up $file to $backupPath" -ForegroundColor Yellow
    }
}

# Install CLAUDE.md (global instructions & personas)
Copy-Item "$scriptDir\CLAUDE.md" "$claudeDir\CLAUDE.md" -Force
Write-Host "Installed CLAUDE.md (personas: Samur-AI, Claude Noir)" -ForegroundColor Green

# Install settings.json (hooks)
Copy-Item "$scriptDir\global-settings.json" "$claudeDir\settings.json" -Force
Write-Host "Installed settings.json (meditation hooks)" -ForegroundColor Green

# Install settings.local.json (permissions)
Copy-Item "$scriptDir\global-settings.local.json" "$claudeDir\settings.local.json" -Force
Write-Host "Installed settings.local.json (permissions)" -ForegroundColor Green

# Check if sounds symlink exists
$soundsPath = "$claudeDir\sounds"
$meditationHooksPath = "$scriptDir\..\Meditation-Hooks\sounds"
if (!(Test-Path $soundsPath)) {
    if (Test-Path $meditationHooksPath) {
        # Create symlink (requires admin or developer mode)
        try {
            New-Item -ItemType SymbolicLink -Path $soundsPath -Target (Resolve-Path $meditationHooksPath) | Out-Null
            Write-Host "Created sounds symlink" -ForegroundColor Green
        } catch {
            Write-Host "Could not create symlink. Copy sounds manually or run as admin." -ForegroundColor Yellow
            Write-Host "Or enable Developer Mode in Windows Settings." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "Sounds folder already exists" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Personas installed:" -ForegroundColor White
Write-Host "  - Samur-AI Claude (zen code warrior, pairs with meditation bells)" -ForegroundColor Magenta
Write-Host "  - Claude Noir (hard-boiled debugger)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Restart Claude Code to apply changes." -ForegroundColor Yellow
