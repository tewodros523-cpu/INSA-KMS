# ==============================================================================
# INSA-KMS: Keycloak Realm Setup Script (Keycloak 26.x compatible)
# Run AFTER Keycloak is started and healthy at http://localhost:8080
# Usage: .\scripts\setup-keycloak-local.ps1
# ==============================================================================

$KC_URL = "http://localhost:8080"
$REALM  = "kms-realm"

# ── Wait for Keycloak to be ready ───────────────────────────────────────────
Write-Host "Waiting for Keycloak to be ready..." -ForegroundColor Cyan
$maxWait = 120  # seconds
$elapsed = 0
do {
    Start-Sleep -Seconds 3
    $elapsed += 3
    try {
        $resp = Invoke-WebRequest -Uri "$KC_URL/health/ready" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { break }
    } catch { }
    Write-Host "  Still waiting... ($elapsed s / $maxWait s)" -ForegroundColor Gray
} while ($elapsed -lt $maxWait)

if ($elapsed -ge $maxWait) {
    Write-Error "Keycloak did not become ready within $maxWait seconds."
    exit 1
}
Write-Host "Keycloak is ready!" -ForegroundColor Green

# ── Get admin token ──────────────────────────────────────────────────────────
Write-Host "Obtaining admin access token..." -ForegroundColor Cyan
try {
    $tokenResp = Invoke-RestMethod -Uri "$KC_URL/realms/master/protocol/openid-connect/token" `
        -Method Post `
        -ContentType "application/x-www-form-urlencoded" `
        -Body "username=admin&password=admin&grant_type=password&client_id=admin-cli" `
        -ErrorAction Stop
    $token = $tokenResp.access_token
    Write-Host "Admin token obtained." -ForegroundColor Green
} catch {
    Write-Error "Failed to get admin token: $_"
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

# ── Helper: check if realm already exists ───────────────────────────────────
function Realm-Exists {
    try {
        $r = Invoke-RestMethod -Uri "$KC_URL/admin/realms/$REALM" -Headers $headers -ErrorAction Stop
        return $true
    } catch { return $false }
}

if (Realm-Exists) {
    Write-Host "Realm '$REALM' already exists - skipping realm creation." -ForegroundColor Yellow
} else {
    # ── Create realm ─────────────────────────────────────────────────────────
    Write-Host "Creating realm: $REALM ..." -ForegroundColor Cyan
    $realmPayload = @{
        realm                  = $REALM
        enabled                = $true
        displayName            = "KMS Enterprise Realm"
        sslRequired            = "external"
        registrationAllowed    = $false
        loginWithEmailAllowed  = $true
        duplicateEmailsAllowed = $false
        resetPasswordAllowed   = $true
        editUsernameAllowed    = $false
        bruteForceProtected    = $true
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$KC_URL/admin/realms" -Method Post -Headers $headers -Body $realmPayload | Out-Null
        Write-Host "Realm '$REALM' created." -ForegroundColor Green
    } catch {
        Write-Warning "Realm creation: $($_.Exception.Message)"
    }
}

# ── Create kms-frontend-client ───────────────────────────────────────────────
Write-Host "Configuring client: kms-frontend-client ..." -ForegroundColor Cyan
$clientPayload = @{
    clientId                  = "kms-frontend-client"
    name                      = "KMS Frontend Client"
    description               = "Client for KMS Web Application"
    enabled                   = $true
    publicClient              = $true
    directAccessGrantsEnabled = $true
    standardFlowEnabled       = $true
    implicitFlowEnabled       = $false
    redirectUris              = @("http://localhost:3000/*", "http://127.0.0.1:3000/*", "https://*")
    webOrigins                = @("*")
    fullScopeAllowed          = $true
} | ConvertTo-Json -Depth 5

try {
    Invoke-RestMethod -Uri "$KC_URL/admin/realms/$REALM/clients" -Method Post -Headers $headers -Body $clientPayload | Out-Null
    Write-Host "Client created." -ForegroundColor Green
} catch {
    Write-Host "Client notice: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ── Create realm roles ───────────────────────────────────────────────────────
Write-Host "Creating realm roles..." -ForegroundColor Cyan
$roles = @(
    "ROLE_SUPER_ADMIN", "SUPER_ADMIN",
    "ROLE_ADMIN", "ROLE_SYSTEM_ADMINISTRATOR", "SYSTEM_ADMINISTRATOR",
    "ROLE_CONTENT_OWNER", "CONTENT_OWNER",
    "ROLE_CONTRIBUTOR", "CONTRIBUTOR",
    "ROLE_VIEWER", "VIEWER",
    "ROLE_COMPLIANCE_OFFICER", "COMPLIANCE_OFFICER",
    "ROLE_IT_SECURITY", "IT_SECURITY"
)
foreach ($role in $roles) {
    $rolePayload = @{ name = $role } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$KC_URL/admin/realms/$REALM/roles" -Method Post -Headers $headers -Body $rolePayload | Out-Null
        Write-Host "  Role '$role' created." -ForegroundColor Green
    } catch {
        Write-Host "  Role '$role' already exists." -ForegroundColor Gray
    }
}

# ── Helper: create user + assign roles ──────────────────────────────────────
function Create-KmsUser {
    param (
        [string]$Username,
        [string]$Email,
        [string]$FirstName,
        [string]$LastName,
        [string]$Password,
        [string[]]$RealmRoles
    )
    Write-Host "Creating user: $Username ..." -ForegroundColor Cyan
    $userPayload = @{
        username        = $Username
        email           = $Email
        firstName       = $FirstName
        lastName        = $LastName
        enabled         = $true
        emailVerified   = $true
        credentials     = @(@{ type = "password"; value = $Password; temporary = $false })
    } | ConvertTo-Json -Depth 5
    try {
        Invoke-RestMethod -Uri "$KC_URL/admin/realms/$REALM/users" -Method Post -Headers $headers -Body $userPayload | Out-Null
        Write-Host "  User '$Username' created." -ForegroundColor Green
    } catch {
        Write-Host "  User '$Username' already exists." -ForegroundColor Gray
    }

    # Get user id
    $users = Invoke-RestMethod -Uri "$KC_URL/admin/realms/$REALM/users?username=$Username&exact=true" -Headers $headers
    if ($users.Count -eq 0) { Write-Warning "Could not find user $Username after creation."; return }
    $userId = $users[0].id

    # Clear required actions
    try {
        $update = @{ requiredActions = @() } | ConvertTo-Json
        Invoke-RestMethod -Uri "$KC_URL/admin/realms/$REALM/users/$userId" -Method Put -Headers $headers -Body $update | Out-Null
    } catch { }

    # Assign roles
    foreach ($roleName in $RealmRoles) {
        try {
            $roleRep = Invoke-RestMethod -Uri "$KC_URL/admin/realms/$REALM/roles/$roleName" -Headers $headers
            $roleJson = "[" + ($roleRep | ConvertTo-Json -Depth 5) + "]"
            Invoke-RestMethod -Uri "$KC_URL/admin/realms/$REALM/users/$userId/role-mappings/realm" -Method Post -Headers $headers -Body $roleJson | Out-Null
            Write-Host "    Assigned role '$roleName' to '$Username'." -ForegroundColor Green
        } catch {
            Write-Host "    Role assignment '$roleName' for '$Username': $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

# ── Seed users ───────────────────────────────────────────────────────────────
Create-KmsUser -Username "admin"       -Email "admin@kms.internal"      -FirstName "Super"       -LastName "Administrator" -Password "admin123"      -RealmRoles @("ROLE_SUPER_ADMIN","SUPER_ADMIN","ROLE_ADMIN","ROLE_SYSTEM_ADMINISTRATOR","SYSTEM_ADMINISTRATOR")
Create-KmsUser -Username "admin_ops"   -Email "admin.ops@kms.internal"   -FirstName "Operations"  -LastName "Admin"         -Password "adminops123"   -RealmRoles @("ROLE_ADMIN","ROLE_SYSTEM_ADMINISTRATOR","SYSTEM_ADMINISTRATOR")
Create-KmsUser -Username "owner"       -Email "owner@kms.internal"       -FirstName "Content"     -LastName "Owner"         -Password "owner123"      -RealmRoles @("ROLE_CONTENT_OWNER","CONTENT_OWNER")
Create-KmsUser -Username "contributor" -Email "user@kms.internal"        -FirstName "Contributor" -LastName "User"          -Password "user123"       -RealmRoles @("ROLE_CONTRIBUTOR","CONTRIBUTOR")
Create-KmsUser -Username "viewer"      -Email "viewer@kms.internal"      -FirstName "John"        -LastName "Viewer"        -Password "viewer123"     -RealmRoles @("ROLE_VIEWER","VIEWER")
Create-KmsUser -Username "compliance"  -Email "compliance@kms.internal"  -FirstName "Alice"       -LastName "Compliance"    -Password "compliance123" -RealmRoles @("ROLE_COMPLIANCE_OFFICER","COMPLIANCE_OFFICER")
Create-KmsUser -Username "security"    -Email "security@kms.internal"    -FirstName "Bob"         -LastName "Security"      -Password "security123"   -RealmRoles @("ROLE_IT_SECURITY","IT_SECURITY")

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Keycloak realm setup complete!                          " -ForegroundColor Green
Write-Host "  Admin Console: http://localhost:8080/admin              " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
