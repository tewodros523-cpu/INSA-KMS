# INSA Knowledge Management System (KMS)

Enterprise Knowledge Management System with Keycloak 26.7.2 authentication.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Java | 21+ | Required by Keycloak 26.x and Spring Boot |
| Node.js | 18+ | For Next.js frontend |
| Maven | 3.8+ | For Spring Boot backend |
| Keycloak | 26.7.2 | Installed at `C:\keycloak-26.7.2\keycloak-26.7.2` |

---

## Architecture

```
Browser (Next.js :3000)
    │
    │  1. Login → redirect to Keycloak authorization endpoint
    ▼
Keycloak 26.7.2 (:8080)   ←── kms-realm (roles, clients, users)
    │                              H2 embedded DB (local dev)
    │  2. Authorization code → /auth/callback
    ▼
Next.js (:3000)
    │  3. Exchange code for JWT access token
    │  4. Store token in sessionStorage + cookie
    │  5. API requests with Authorization: Bearer <token>
    ▼
Spring Boot (:8081)   ←── validates JWT signature via Keycloak JWKS
    │
    ▼
PostgreSQL (Render cloud)
```

---

## Quick Start (Local Development)

### Option A – All-in-one launcher

```powershell
# From the project root — starts Keycloak, imports realm, prints instructions
.\scripts\start-all-local.ps1
```

Then in two separate terminals:

**Terminal 1 – Backend:**
```powershell
cd backend
mvn spring-boot:run
```

**Terminal 2 – Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

---

### Option B – Manual step-by-step

#### 1. Start Keycloak 26.7.2

```powershell
.\scripts\start-keycloak.ps1
```

Wait until you see `Keycloak 26.7.2 on JVM` in the console (≈ 20-30 seconds).

#### 2. Configure the Keycloak realm (first time only)

```powershell
# Only needed on the first run — the realm is also auto-imported on startup
.\scripts\setup-keycloak-local.ps1
```

#### 3. Start the Spring Boot backend

```powershell
cd backend
mvn spring-boot:run
```

Backend starts on **http://localhost:8081**
- Swagger UI: http://localhost:8081/swagger-ui.html
- Health: http://localhost:8081/api/v1/health

#### 4. Start the Next.js frontend

```powershell
cd frontend
npm install   # first time only
npm run dev
```

Frontend starts on **http://localhost:3000**

---

## Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8081/api/v1 |
| Keycloak | http://localhost:8080 |
| Keycloak Admin Console | http://localhost:8080/admin |
| Swagger UI | http://localhost:8081/swagger-ui.html |

---

## Default Logins

| Username | Password | Role | Landing Page |
|----------|----------|------|--------------|
| admin | admin123 | Super Admin | /admin |
| admin_ops | adminops123 | System Administrator | /admin |
| owner | owner123 | Content Owner | /library |
| contributor | user123 | Contributor | /library |
| viewer | viewer123 | Viewer | /library |
| compliance | compliance123 | Compliance Officer | /library |
| security | security123 | IT Security | /library |

---

## Environment Variables

All environment variables are in `.env` at the project root.

Key variables for Keycloak integration:

| Variable | Default | Purpose |
|----------|---------|---------|
| `KEYCLOAK_URL` | `http://localhost:8080` | Keycloak base URL (backend) |
| `KEYCLOAK_REALM` | `kms-realm` | Realm name (backend) |
| `NEXT_PUBLIC_KEYCLOAK_URL` | `http://localhost:8080` | Keycloak URL (frontend) |
| `NEXT_PUBLIC_KEYCLOAK_REALM` | `kms-realm` | Realm name (frontend) |
| `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` | `kms-frontend-client` | Public OIDC client |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8081/api/v1` | Backend API URL (frontend) |
| `KMS_KEYCLOAK_ENABLED` | `true` | Enable Keycloak admin sync (backend) |

---

## Authentication Flow

1. User visits any protected page → redirected to `/login`
2. Login page redirects to Keycloak: `http://localhost:8080/realms/kms-realm/protocol/openid-connect/auth`
3. Keycloak authenticates the user → redirects to `/auth/callback?code=...`
4. Callback page exchanges the code for a JWT access token (direct Keycloak call)
5. JWT stored in `sessionStorage` + `kms_auth_present` cookie set
6. All backend API calls include `Authorization: Bearer <access_token>`
7. Spring Boot validates the JWT against Keycloak's JWKS endpoint
8. User roles extracted from `realm_access.roles` in the JWT

---

## Keycloak Realm Configuration

The realm config is at [`keycloak/kms-realm.json`](keycloak/kms-realm.json).

**Realm:** `kms-realm`
**Client:** `kms-frontend-client` (public OIDC client)
**Roles:** `ROLE_SUPER_ADMIN`, `ROLE_ADMIN`, `ROLE_CONTENT_OWNER`, `ROLE_CONTRIBUTOR`, `ROLE_VIEWER`, `ROLE_COMPLIANCE_OFFICER`, `ROLE_IT_SECURITY`

To re-import the realm manually:
```powershell
.\scripts\setup-keycloak-local.ps1
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/start-keycloak.ps1` | Start Keycloak 26.7.2 locally |
| `scripts/setup-keycloak-local.ps1` | Create realm, roles, clients, seed users |
| `scripts/start-all-local.ps1` | Start everything (Keycloak + realm setup) |
| `scripts/setup-keycloak-realm.ps1` | Legacy realm setup script |

---

## Troubleshooting

### "JWKS endpoint not reachable" / JWT validation fails
Ensure Keycloak is running at `http://localhost:8080` before starting the backend.

### "Realm not found" in login
Run `.\scripts\setup-keycloak-local.ps1` to re-create the realm.

### Token exchange fails in /auth/callback
Check that the `kms-frontend-client` has `http://localhost:3000/*` in its redirect URIs (Admin Console → Clients → kms-frontend-client → Settings).

### Backend logs "Keycloak sync failed"
Set `KMS_KEYCLOAK_ENABLED=false` in `.env` if you want to run without Keycloak admin sync.
