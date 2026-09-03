# ==============================================================================
# INSA-KMS: Start Keycloak 26.7.2 Local Development Server
# Usage: .\scripts\start-keycloak.ps1  (from project root)
#        or double-click in Explorer
# ==============================================================================

$KC_HOME    = "C:\keycloak-26.7.2\keycloak-26.7.2"
$KC_BIN     = "$KC_HOME\bin\kc.bat"
$IMPORT_DIR = "$KC_HOME\data\import"
$REALM_SRC  = Join-Path $PSScriptRoot "..\keycloak\kms-realm.json"

# ── Pre-flight checks ───────────────────────────────────────────────────────
if (-not (Test-Path $KC_BIN)) {
    Write-Error "Keycloak not found at $KC_HOME. Verify the installation path."
    exit 1
}

# ── Copy realm import file ──────────────────────────────────────────────────
if (Test-Path $REALM_SRC) {
    New-Item -ItemType Directory -Force -Path $IMPORT_DIR | Out-Null
    Copy-Item -Path $REALM_SRC -Destination "$IMPORT_DIR\kms-realm.json" -Force
    Write-Host "Realm file copied -> $IMPORT_DIR\kms-realm.json" -ForegroundColor Cyan
} else {
    Write-Warning "Realm file not found at $REALM_SRC - Keycloak will start without realm auto-import."
}

# ── Admin credentials (picked up by Keycloak at start-dev) ─────────────────
$env:KEYCLOAK_ADMIN          = "admin"
$env:KEYCLOAK_ADMIN_PASSWORD = "admin"

# ── Launch ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "  Keycloak 26.7.2  -  Development Mode (H2 embedded DB)  " -ForegroundColor Yellow
Write-Host "  URL          : http://localhost:8080                    " -ForegroundColor Yellow
Write-Host "  Admin Console: http://localhost:8080/admin              " -ForegroundColor Yellow
Write-Host "  Credentials  : admin / admin                            " -ForegroundColor Yellow
Write-Host "  Realm        : kms-realm  (auto-imported)              " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host ""

# start-dev = H2 embedded, no SSL needed, realm imported from data/import/
& $KC_BIN start-dev --import-realm
