package com.enterprise.kms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * FR-18 / FR-27: keeps the identity provider authoritative.
 *
 * Authorisation is derived from the JWT's realm_access.roles, so creating a user or
 * changing a role in the KMS database alone has no effect on what a person can do.
 * This service mirrors those admin actions into the Keycloak realm.
 */
@Service
public class KeycloakAdminService {
    private static final Logger log = LoggerFactory.getLogger(KeycloakAdminService.class);

    /** Realm roles granted alongside the primary role, mirroring setup-keycloak-realm.ps1. */
    private static final Map<String, List<String>> ROLE_BUNDLES = Map.of(
            "ROLE_ADMIN", List.of("ROLE_ADMIN", "ROLE_SYSTEM_ADMINISTRATOR", "SYSTEM_ADMINISTRATOR"),
            "ROLE_CONTENT_OWNER", List.of("ROLE_CONTENT_OWNER", "CONTENT_OWNER"),
            "ROLE_CONTRIBUTOR", List.of("ROLE_CONTRIBUTOR", "CONTRIBUTOR"),
            "ROLE_VIEWER", List.of("ROLE_VIEWER", "VIEWER"),
            "ROLE_COMPLIANCE_OFFICER", List.of("ROLE_COMPLIANCE_OFFICER", "COMPLIANCE_OFFICER"),
            "ROLE_IT_SECURITY", List.of("ROLE_IT_SECURITY", "IT_SECURITY")
    );

    @Value("${kms.keycloak.enabled:true}")
    private boolean enabled;

    @Value("${kms.keycloak.base-url:${KEYCLOAK_URL:http://localhost:8080}}")
    private String baseUrl;

    @Value("${kms.keycloak.realm:kms-realm}")
    private String realm;

    @Value("${kms.keycloak.admin-username:${KEYCLOAK_ADMIN_USER:admin}}")
    private String adminUsername;

    @Value("${kms.keycloak.admin-password:${KEYCLOAK_ADMIN_PASSWORD:admin}}")
    private String adminPassword;

    @Value("${kms.keycloak.admin-client-id:admin-cli}")
    private String adminClientId;

    private final RestClient restClient = RestClient.builder().build();

    public boolean isEnabled() {
        return enabled;
    }

    // ---------------- token ----------------

    @SuppressWarnings("unchecked")
    private String adminToken() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("username", adminUsername);
        form.add("password", adminPassword);
        form.add("grant_type", "password");
        form.add("client_id", adminClientId);

        try {
            Map<String, Object> response = restClient.post()
                    .uri(baseUrl + "/realms/master/protocol/openid-connect/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            if (response == null || response.get("access_token") == null) {
                throw new IllegalStateException("no access_token in response");
            }
            return response.get("access_token").toString();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Cannot authenticate against Keycloak admin API: " + e.getMessage());
        }
    }

    // ---------------- users ----------------

    @SuppressWarnings("unchecked")
    public Map<String, Object> findUserByUsername(String username) {
        String token = adminToken();
        List<Map<String, Object>> found = restClient.get()
                .uri(baseUrl + "/admin/realms/" + realm + "/users?exact=true&username="
                        + java.net.URLEncoder.encode(username, java.nio.charset.StandardCharsets.UTF_8))
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(List.class);
        return (found == null || found.isEmpty()) ? null : found.get(0);
    }

    /**
     * Creates the realm user (or links an existing one) and applies the role bundle.
     * @return the Keycloak user id, used as the local keycloak_sub.
     */
    public String createUser(String username, String email, String firstName, String lastName,
                             String password, String roleName, boolean temporaryPassword) {
        if (!enabled) {
            log.warn("Keycloak sync disabled — user {} exists only in the KMS database", username);
            return null;
        }
        String token = adminToken();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("username", username);
        payload.put("email", email);
        payload.put("firstName", (firstName != null && !firstName.isBlank()) ? firstName : username);
        payload.put("lastName", (lastName != null && !lastName.isBlank()) ? lastName : "User");
        payload.put("enabled", true);
        payload.put("emailVerified", true);
        if (password != null && !password.isBlank()) {
            Map<String, Object> credential = new LinkedHashMap<>();
            credential.put("type", "password");
            credential.put("value", password);
            credential.put("temporary", false);
            payload.put("credentials", List.of(credential));
            payload.put("requiredActions", List.of("UPDATE_PASSWORD"));
        }

        String userId;
        try {
            URI location = restClient.post()
                    .uri(baseUrl + "/admin/realms/" + realm + "/users")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity()
                    .getHeaders()
                    .getLocation();
            userId = location != null ? location.getPath().substring(location.getPath().lastIndexOf('/') + 1) : null;
        } catch (Exception e) {
            // 409 -> the realm user already exists, link to it instead of failing
            Map<String, Object> existing = findUserByUsername(username);
            if (existing == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Keycloak user creation failed: " + e.getMessage());
            }
            userId = existing.get("id").toString();
            log.info("Keycloak user {} already existed — linking to {}", username, userId);
        }

        if (userId != null && roleName != null) {
            assignRealmRoles(userId, roleName);
        }
        return userId;
    }

    /** Replaces the KMS-managed realm roles of a user with the bundle for roleName. */
    @SuppressWarnings("unchecked")
    public void assignRealmRoles(String keycloakUserId, String roleName) {
        if (!enabled || keycloakUserId == null) {
            return;
        }
        String token = adminToken();
        List<String> desired = ROLE_BUNDLES.getOrDefault(roleName, List.of(roleName));

        List<Map<String, Object>> realmRoles = restClient.get()
                .uri(baseUrl + "/admin/realms/" + realm + "/roles")
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(List.class);
        if (realmRoles == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cannot read Keycloak realm roles");
        }

        List<String> managed = new ArrayList<>();
        ROLE_BUNDLES.values().forEach(managed::addAll);

        List<Map<String, Object>> toAdd = new ArrayList<>();
        for (Map<String, Object> role : realmRoles) {
            String name = String.valueOf(role.get("name"));
            if (desired.contains(name)) {
                toAdd.add(Map.of("id", role.get("id"), "name", name));
            }
        }

        List<Map<String, Object>> current = restClient.get()
                .uri(baseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId + "/role-mappings/realm")
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(List.class);

        List<Map<String, Object>> toRemove = new ArrayList<>();
        if (current != null) {
            for (Map<String, Object> role : current) {
                String name = String.valueOf(role.get("name"));
                if (managed.contains(name) && !desired.contains(name)) {
                    toRemove.add(Map.of("id", role.get("id"), "name", name));
                }
            }
        }

        try {
            if (!toRemove.isEmpty()) {
                restClient.method(org.springframework.http.HttpMethod.DELETE)
                        .uri(baseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId + "/role-mappings/realm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(toRemove)
                        .retrieve()
                        .toBodilessEntity();
            }
            if (!toAdd.isEmpty()) {
                restClient.post()
                        .uri(baseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId + "/role-mappings/realm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(toAdd)
                        .retrieve()
                        .toBodilessEntity();
            }
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Keycloak role mapping update failed: " + e.getMessage());
        }
    }

    public void setEnabled(String keycloakUserId, boolean userEnabled) {
        if (!enabled || keycloakUserId == null) {
            return;
        }
        String token = adminToken();
        try {
            restClient.put()
                    .uri(baseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("enabled", userEnabled))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Keycloak enable/disable failed: " + e.getMessage());
        }
    }

    public void updateProfile(String keycloakUserId, String email) {
        if (!enabled || keycloakUserId == null || email == null || email.isBlank()) {
            return;
        }
        String token = adminToken();
        try {
            restClient.put()
                    .uri(baseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("email", email))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Keycloak profile update failed: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> findUserByEmail(String email) {
        if (!enabled || email == null || email.isBlank()) {
            return null;
        }
        String token = adminToken();
        List<Map<String, Object>> found = restClient.get()
                .uri(baseUrl + "/admin/realms/" + realm + "/users?exact=true&email="
                        + java.net.URLEncoder.encode(email, java.nio.charset.StandardCharsets.UTF_8))
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(List.class);
        return (found == null || found.isEmpty()) ? null : found.get(0);
    }

    public Map<String, Object> findUserByUsernameOrEmail(String identifier) {
        if (identifier == null || identifier.isBlank()) return null;
        Map<String, Object> user = findUserByUsername(identifier);
        if (user == null && identifier.contains("@")) {
            user = findUserByEmail(identifier);
        }
        return user;
    }

    public void sendForgotPasswordEmail(String usernameOrEmail) {
        if (!enabled) {
            log.warn("Keycloak sync disabled — forgot password email skipped");
            return;
        }
        Map<String, Object> user = findUserByUsernameOrEmail(usernameOrEmail);
        if (user == null) {
            log.warn("User {} not found in Keycloak for password reset request", usernameOrEmail);
            return;
        }
        String userId = user.get("id").toString();
        String token = adminToken();
        try {
            restClient.put()
                    .uri(baseUrl + "/admin/realms/" + realm + "/users/" + userId + "/execute-actions-email")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(List.of("UPDATE_PASSWORD"))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Sent UPDATE_PASSWORD execute-actions-email to user {}", userId);
        } catch (Exception e) {
            log.error("Failed to send execute-actions-email via Keycloak/SMTP", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Keycloak failed to send password reset email (check SMTP configuration): " + e.getMessage());
        }
    }

    public enum VerificationResult {
        VALID,
        UPDATE_PASSWORD_REQUIRED,
        INVALID
    }

    public VerificationResult verifyCredentialsDetail(String username, String password) {
        if (!enabled) {
            return VerificationResult.VALID;
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("username", username);
        form.add("password", password);
        form.add("grant_type", "password");
        form.add("client_id", "kms-frontend-client");

        try {
            Map<?, ?> response = restClient.post()
                    .uri(baseUrl + "/realms/" + realm + "/protocol/openid-connect/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            if (response != null && response.get("access_token") != null) {
                return VerificationResult.VALID;
            }
            return VerificationResult.INVALID;
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            boolean isInvalidCreds = msg.contains("invalid user credentials") || msg.contains("invalid credentials");
            if (!isInvalidCreds && (msg.contains("account") || msg.contains("update_password") || msg.contains("action"))) {
                return VerificationResult.UPDATE_PASSWORD_REQUIRED;
            }
            log.warn("Credential verification failed for user {}: {}", username, e.getMessage());
            return VerificationResult.INVALID;
        }
    }

    public boolean verifyCredentials(String username, String password) {
        VerificationResult res = verifyCredentialsDetail(username, password);
        return res == VerificationResult.VALID || res == VerificationResult.UPDATE_PASSWORD_REQUIRED;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> authenticateUser(String username, String password) {
        if (!enabled) {
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("status", "SUCCESS");
            res.put("access_token", "dummy-token-disabled");
            return res;
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("username", username);
        form.add("password", password);
        form.add("grant_type", "password");
        form.add("client_id", "kms-frontend-client");

        try {
            Map<String, Object> response = restClient.post()
                    .uri(baseUrl + "/realms/" + realm + "/protocol/openid-connect/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            if (response != null && response.get("access_token") != null) {
                Map<String, Object> res = new LinkedHashMap<>();
                res.put("status", "SUCCESS");
                res.put("access_token", response.get("access_token"));
                if (response.containsKey("refresh_token")) {
                    res.put("refresh_token", response.get("refresh_token"));
                }
                return res;
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            boolean isInvalidCreds = msg.contains("invalid user credentials") || msg.contains("invalid credentials");
            if (!isInvalidCreds && (msg.contains("account") || msg.contains("update_password") || msg.contains("action"))) {
                Map<String, Object> res = new LinkedHashMap<>();
                res.put("status", "UPDATE_PASSWORD_REQUIRED");
                res.put("username", username);
                return res;
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
    }

    @SuppressWarnings("unchecked")
    public void ensureProfileComplete(String keycloakUserId, String fallbackUsername) {
        if (!enabled || keycloakUserId == null) return;
        String token = adminToken();
        try {
            Map<String, Object> user = restClient.get()
                    .uri(baseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .body(Map.class);
            if (user != null) {
                Map<String, Object> updates = new LinkedHashMap<>();
                boolean needUpdate = false;
                String firstName = (String) user.get("firstName");
                String lastName = (String) user.get("lastName");
                if (firstName == null || firstName.isBlank()) {
                    updates.put("firstName", fallbackUsername != null && !fallbackUsername.isBlank() ? fallbackUsername : "User");
                    needUpdate = true;
                }
                if (lastName == null || lastName.isBlank()) {
                    updates.put("lastName", "User");
                    needUpdate = true;
                }
                updates.put("requiredActions", List.of());
                updates.put("emailVerified", true);
                restClient.put()
                        .uri(baseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(updates)
                        .retrieve()
                        .toBodilessEntity();
            }
        } catch (Exception e) {
            log.warn("Failed to ensure profile complete for user {}: {}", keycloakUserId, e.getMessage());
        }
    }

    public void clearRequiredActions(String keycloakUserId) {
        if (!enabled || keycloakUserId == null) return;
        ensureProfileComplete(keycloakUserId, "User");
    }

    @SuppressWarnings("unchecked")
    public void addRequiredAction(String keycloakUserId, String action) {
        if (!enabled || keycloakUserId == null || action == null) return;
        String token = adminToken();
        try {
            Map<String, Object> user = restClient.get()
                    .uri(baseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .body(Map.class);
            List<String> actions = new ArrayList<>();
            if (user != null && user.get("requiredActions") instanceof List) {
                actions.addAll((List<String>) user.get("requiredActions"));
            }
            if (!actions.contains(action)) {
                actions.add(action);
            }
            restClient.put()
                    .uri(baseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("requiredActions", actions))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Failed to add requiredAction {} for user {}: {}", action, keycloakUserId, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public void removeRequiredAction(String keycloakUserId, String action) {
        if (!enabled || keycloakUserId == null || action == null) return;
        String token = adminToken();
        try {
            Map<String, Object> user = restClient.get()
                    .uri(baseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .body(Map.class);
            List<String> actions = new ArrayList<>();
            if (user != null && user.get("requiredActions") instanceof List) {
                actions.addAll((List<String>) user.get("requiredActions"));
            }
            if (actions.remove(action)) {
                restClient.put()
                        .uri(baseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("requiredActions", actions))
                        .retrieve()
                        .toBodilessEntity();
            }
        } catch (Exception e) {
            log.warn("Failed to remove requiredAction {} for user {}: {}", action, keycloakUserId, e.getMessage());
        }
    }

    public void resetPassword(String keycloakUserId, String password, boolean temporary) {
        if (!enabled || keycloakUserId == null) {
            return;
        }
        String token = adminToken();
        try {
            restClient.put()
                    .uri(baseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId + "/reset-password")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("type", "password", "value", password, "temporary", false))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Keycloak password reset failed: " + e.getMessage());
        }
    }

    /** Resolves the realm user id for a local user, by stored sub or by username. */
    public String resolveUserId(String storedKeycloakSub, String username) {
        if (storedKeycloakSub != null && storedKeycloakSub.matches("[0-9a-fA-F-]{36}")) {
            return storedKeycloakSub;
        }
        Map<String, Object> found = findUserByUsername(username);
        return found != null ? found.get("id").toString() : null;
    }

    public Map<String, Object> health() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("enabled", enabled);
        status.put("baseUrl", baseUrl);
        status.put("realm", realm);
        if (!enabled) {
            status.put("status", "DISABLED");
            return status;
        }
        try {
            adminToken();
            status.put("status", "CONNECTED");
        } catch (Exception e) {
            status.put("status", "UNREACHABLE");
            status.put("error", e.getMessage());
        }
        return status;
    }
}

