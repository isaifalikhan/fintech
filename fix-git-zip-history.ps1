# fix-git-zip-history.ps1
# Removes copy-1.zip from ALL git history in this repo so GitHub's 100MB push limit is no
# longer tripped by it. Safe to run before your first "Publish branch" (no remote to coordinate
# with yet) - this script warns you if a remote is already configured, just in case.

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "== Checking repo ==" -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
    Write-Host "ERROR: no .git folder found here. This script must sit in your fintech repo folder." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$remotes = git remote
if ($remotes) {
    Write-Host "WARNING: this repo has a remote configured ($remotes)." -ForegroundColor Yellow
    Write-Host "This script rewrites history. If this branch was ALREADY pushed anywhere, rewriting" -ForegroundColor Yellow
    Write-Host "it will require a force-push later and can break anyone else's clone of it." -ForegroundColor Yellow
} else {
    Write-Host "No remote configured yet - safe to rewrite local history before your first publish." -ForegroundColor Green
}

$hits = git log --all --oneline -- "copy-1.zip"
if (-not $hits) {
    Write-Host "copy-1.zip was not found in git history - nothing to do." -ForegroundColor Green
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host ""
Write-Host "Found copy-1.zip in these commits:" -ForegroundColor Cyan
Write-Host $hits
Write-Host ""
$confirm = Read-Host "Type YES to permanently remove copy-1.zip from ALL history"
if ($confirm -ne "YES") {
    Write-Host "Aborted - no changes made." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host "== Checking for git-filter-repo ==" -ForegroundColor Cyan
$hasFilterRepo = $true
try { git filter-repo --version | Out-Null } catch { $hasFilterRepo = $false }
if (-not $hasFilterRepo) {
    Write-Host "git-filter-repo not found. Attempting: pip install git-filter-repo" -ForegroundColor Yellow
    try {
        pip install git-filter-repo
    } catch {
        Write-Host "pip install failed (is Python installed and on PATH?)." -ForegroundColor Red
    }
    try { git filter-repo --version | Out-Null } catch {
        Write-Host "ERROR: git-filter-repo still not available." -ForegroundColor Red
        Write-Host "Install Python from https://python.org (check 'Add to PATH' during install), then re-run this script." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "== Removing copy-1.zip from history ==" -ForegroundColor Cyan
git filter-repo --path "copy-1.zip" --invert-paths --force

Write-Host "== Adding *.zip to .gitignore ==" -ForegroundColor Cyan
$gitignore = ".gitignore"
$zipLine = "*.zip"
$alreadyIgnored = $false
if (Test-Path $gitignore) {
    $alreadyIgnored = Select-String -Path $gitignore -Pattern ([regex]::Escape($zipLine)) -Quiet
}
if (-not $alreadyIgnored) {
    Add-Content -Path $gitignore -Value $zipLine
    Write-Host "Added '*.zip' to .gitignore" -ForegroundColor Green
}

Write-Host ""
Write-Host "== Verifying ==" -ForegroundColor Cyan
$stillThere = git log --all --oneline -- "copy-1.zip"
if ($stillThere) {
    Write-Host "WARNING: copy-1.zip still appears in history. Something went wrong - do not push yet." -ForegroundColor Red
} else {
    Write-Host "copy-1.zip is gone from history. You can now click 'Publish branch' in GitHub Desktop." -ForegroundColor Green
    if ($remotes) {
        Write-Host "NOTE: git filter-repo removes the 'origin' remote as a safety precaution - re-add it with:" -ForegroundColor Yellow
        Write-Host "  git remote add origin <your-repo-url>" -ForegroundColor Yellow
    }
}
Read-Host "Press Enter to exit"
