# ==============================================================================
# INSA-KMS: Start All Local Services
# Starts: Keycloak 26.7.2 --> imports realm --> prints instructions for
#         backend (Spring Boot) and frontend (Next.js)
# Usage: .\scripts\start-all-local.ps1
# ==============================================================================

$ScriptDir = $PSScriptRoot
$ProjectRoot = (Resolve-Path "$ScriptDir\..").Path
$KC_HOME = "C:\keycloak-26.7.2\keycloak-26.7.2"

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  INSA Knowledge Management System - Local Dev Launcher    " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Start Keycloak in a new PowerShell window ────────────────────────────
Write-Host "[1/3] Starting Keycloak 26.7.2..." -ForegroundColor Yellow
$kcScript = Join-Path $ScriptDir "start-keycloak.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-File", $kcScript -WindowStyle Normal

# ── 2. Wait for Keycloak to be healthy ──────────────────────────────────────
Write-Host "[2/3] Waiting for Keycloak to become ready (up to 120s)..." -ForegroundColor Yellow
$maxWait = 120
$elapsed = 0
$ready = $false
do {
    Start-Sleep -Seconds 4
    $elapsed += 4
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:8080/health/ready" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Write-Host "  Waiting... ($elapsed s)" -ForegroundColor Gray
} while ($elapsed -lt $maxWait)

if (-not $ready) {
    Write-Warning "Keycloak did not respond in time. The realm may already be configured."
    Write-Warning "Try running .\scripts\setup-keycloak-local.ps1 manually once Keycloak is up."
} else {
    Write-Host "Keycloak is ready!" -ForegroundColor Green

    # ── 3. Run realm setup script ─────────────────────────────────────────────
    Write-Host "[3/3] Configuring kms-realm (roles, clients, seed users)..." -ForegroundColor Yellow
    $setupScript = Join-Path $ScriptDir "setup-keycloak-local.ps1"
    & $setupScript
}

# ── Print service start instructions ────────────────────────────────────────
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Green
Write-Host "  Keycloak is running. Start the remaining services:       " -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  BACKEND  (new terminal):" -ForegroundColor White
Write-Host "    cd $ProjectRoot\backend" -ForegroundColor Gray
Write-Host "    mvn spring-boot:run" -ForegroundColor Gray
Write-Host ""
Write-Host "  FRONTEND (new terminal):" -ForegroundColor White
Write-Host "    cd $ProjectRoot\frontend" -ForegroundColor Gray
Write-Host "    npm install" -ForegroundColor Gray
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  SERVICE URLS:" -ForegroundColor White
Write-Host "    Frontend      : http://localhost:3000" -ForegroundColor Cyan
Write-Host "    Backend API   : http://localhost:8081/api/v1" -ForegroundColor Cyan
Write-Host "    Keycloak      : http://localhost:8080" -ForegroundColor Cyan
Write-Host "    Admin Console : http://localhost:8080/admin  (admin / admin)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  DEFAULT LOGINS:" -ForegroundColor White
Write-Host "    admin       / admin123       -> Admin Dashboard" -ForegroundColor Gray
Write-Host "    admin_ops   / adminops123    -> Admin Dashboard" -ForegroundColor Gray
Write-Host "    owner       / owner123       -> Library (Content Owner)" -ForegroundColor Gray
Write-Host "    contributor / user123        -> Library (Contributor)" -ForegroundColor Gray
Write-Host "    viewer      / viewer123      -> Library (Viewer)" -ForegroundColor Gray
Write-Host "    compliance  / compliance123  -> Library (Compliance Officer)" -ForegroundColor Gray
Write-Host "    security    / security123    -> Library (IT Security)" -ForegroundColor Gray
Write-Host ""
