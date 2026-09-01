# setup-auth-env.ps1
# Appends the new server-side auth config (JWT_SECRET, CORS_ORIGIN, etc.) to .env.local.
# I can't write .env/.env.local directly from the cloud session (the device bridge blocks remote
# writes to dotenv files on purpose, since that's where secrets live) - this script does it
# locally instead, and is safe to run more than once (it won't duplicate the block).

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$envLocal = ".env.local"

Write-Host "== Checking $envLocal ==" -ForegroundColor Cyan
if (-not (Test-Path $envLocal)) {
    Write-Host "ERROR: $envLocal not found in this folder. This script must sit in your fintech repo folder." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$alreadyDone = Select-String -Path $envLocal -Pattern "^JWT_SECRET=" -Quiet
if ($alreadyDone) {
    Write-Host "$envLocal already has a JWT_SECRET line - nothing to do." -ForegroundColor Green
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host "== Generating a fresh JWT_SECRET for this machine ==" -ForegroundColor Cyan
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$jwtSecret = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""

$block = @"

# ⚠️ SECURITY: if VITE_SUPABASE_SERVICE_ROLE_KEY appears above with a VITE_ prefix, Vite bundles
# it into client-side JS shipped to every browser. A service_role key bypasses all Row Level
# Security and grants full database access - treat it as compromised if this app was ever built
# or run with it in place. Rotate it in Supabase -> Settings -> API, and never restore it with a
# VITE_ prefix.

# ── Server-side auth config (server/config/env.ts) — read by the Express API, NOT Vite/the browser ──
JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=12h
CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
COOKIE_DOMAIN=
"@

Add-Content -Path $envLocal -Value $block
Write-Host "Appended JWT_SECRET / CORS_ORIGIN / COOKIE_* to $envLocal." -ForegroundColor Green
Write-Host ""
Write-Host "Reminder: your $envLocal still has real Supabase credentials set, which routes logins" -ForegroundColor Yellow
Write-Host "through Supabase Auth instead of the local Express server - see the earlier chat message" -ForegroundColor Yellow
Write-Host "for what that means. Comment out VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in $envLocal" -ForegroundColor Yellow
Write-Host "if you want the demo accounts (john.doe@agency.com / demo, etc.) to work locally." -ForegroundColor Yellow
Read-Host "Press Enter to exit"
