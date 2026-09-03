# Keycloak Realm Initialization Script
# Path: C:\Users\PC\Downloads\KMS\scripts\setup-keycloak-realm.ps1

$kcUrl = "http://localhost:8080"

Write-Host "Getting Admin Access Token..." -ForegroundColor Cyan
$tokenResponse = Invoke-RestMethod -Uri "$kcUrl/realms/master/protocol/openid-connect/token" `
    -Method Post `
    -ContentType "application/x-www-form-urlencoded" `
    -Body "username=admin&password=admin&grant_type=password&client_id=admin-cli"

$token = $tokenResponse.access_token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

Write-Host "Creating Realm: kms-realm..." -ForegroundColor Cyan
$realmPayload = @{
    realm   = "kms-realm"
    enabled = $true
    displayName = "KMS Enterprise Realm"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$kcUrl/admin/realms" -Method Post -Headers $headers -Body $realmPayload
    Write-Host "Realm kms-realm created successfully." -ForegroundColor Green
} catch {
    Write-Host "Realm creation notice: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "Creating Client: kms-frontend-client..." -ForegroundColor Cyan
$clientPayload = @{
    clientId                  = "kms-frontend-client"
    enabled                   = $true
    publicClient              = $true
    directAccessGrantsEnabled = $true
    standardFlowEnabled       = $true
    redirectUris              = @("http://localhost:3000/*", "http://localhost:8081/*", "http://127.0.0.1:3000/*")
    webOrigins                = @("*")
} | ConvertTo-Json -Depth 5

try {
    Invoke-RestMethod -Uri "$kcUrl/admin/realms/kms-realm/clients" -Method Post -Headers $headers -Body $clientPayload
    Write-Host "Client kms-frontend-client created successfully." -ForegroundColor Green
} catch {
    Write-Host "Client creation notice: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "Creating Realm Roles..." -ForegroundColor Cyan
$roles = @(
    "SYSTEM_ADMINISTRATOR",
    "ROLE_ADMIN",
    "ROLE_SYSTEM_ADMINISTRATOR",
    "CONTENT_OWNER",
    "ROLE_CONTENT_OWNER",
    "CONTRIBUTOR",
    "ROLE_CONTRIBUTOR",
    "VIEWER",
    "ROLE_VIEWER",
    "COMPLIANCE_OFFICER",
    "ROLE_COMPLIANCE_OFFICER",
    "IT_SECURITY",
    "ROLE_IT_SECURITY"
)
foreach ($role in $roles) {
    $rolePayload = @{ name = $role } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$kcUrl/admin/realms/kms-realm/roles" -Method Post -Headers $headers -Body $rolePayload
        Write-Host "Role $role created." -ForegroundColor Green
    } catch {
        Write-Host "Role $role notice: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

function Create-User {
    param ($username, $email, $firstName, $lastName, $password, $requiredActions = @())
    
    Write-Host "Creating User: $username..." -ForegroundColor Cyan
    $userPayload = @{
        username        = $username
        email           = $email
        firstName       = $firstName
        lastName        = $lastName
        enabled         = $true
        requiredActions = $requiredActions
        credentials     = @(
            @{
                type      = "password"
                value     = $password
                temporary = $false
            }
        )
    } | ConvertTo-Json -Depth 5

    try {
        Invoke-RestMethod -Uri "$kcUrl/admin/realms/kms-realm/users" -Method Post -Headers $headers -Body $userPayload
        Write-Host "User $username created." -ForegroundColor Green
    } catch {
        Write-Host "User $username notice: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Create-User "admin" "admin@kms.internal" "System" "Administrator" "admin123" @("CONFIGURE_TOTP")
Create-User "owner" "owner@kms.internal" "Content" "Owner" "owner123"
Create-User "contributor" "user@kms.internal" "Contributor" "" "user123"
Create-User "viewer" "viewer@kms.internal" "John" "Viewer" "viewer123"
Create-User "compliance" "compliance@kms.internal" "Alice" "Compliance" "compliance123"
Create-User "security" "security@kms.internal" "Bob" "Security" "security123"

function Assign-Role {
    param ($username, $roleName)
    $users = Invoke-RestMethod -Uri "$kcUrl/admin/realms/kms-realm/users?username=$username" -Method Get -Headers $headers
    if ($users.Count -eq 0) { return }
    $userId = $users[0].id

    $roleRep = Invoke-RestMethod -Uri "$kcUrl/admin/realms/kms-realm/roles/$roleName" -Method Get -Headers $headers
    $roleJson = "[" + ($roleRep | ConvertTo-Json -Depth 5) + "]"

    try {
        Invoke-RestMethod -Uri "$kcUrl/admin/realms/kms-realm/users/$userId/role-mappings/realm" -Method Post -Headers $headers -Body $roleJson
        Write-Host "Successfully assigned $roleName to $username." -ForegroundColor Green
    } catch {
        $errMsg = $_.Exception.Message
        Write-Host "Failed to assign $roleName to ${username}: ${errMsg}" -ForegroundColor Red
    }
}

Assign-Role "admin" "ROLE_ADMIN"
Assign-Role "admin" "ROLE_SYSTEM_ADMINISTRATOR"
Assign-Role "admin" "SYSTEM_ADMINISTRATOR"
Assign-Role "owner" "ROLE_CONTENT_OWNER"
Assign-Role "owner" "CONTENT_OWNER"
Assign-Role "contributor" "ROLE_CONTRIBUTOR"
Assign-Role "contributor" "CONTRIBUTOR"
Assign-Role "viewer" "ROLE_VIEWER"
Assign-Role "viewer" "VIEWER"
Assign-Role "compliance" "ROLE_COMPLIANCE_OFFICER"
Assign-Role "compliance" "COMPLIANCE_OFFICER"
Assign-Role "security" "ROLE_IT_SECURITY"
Assign-Role "security" "IT_SECURITY"

Write-Host "Keycloak Setup Complete!" -ForegroundColor Green
