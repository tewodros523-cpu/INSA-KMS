package com.enterprise.kms.controller;

import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.AuditService;
import com.enterprise.kms.service.KeycloakAdminService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final KeycloakAdminService keycloakAdminService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public AuthController(KeycloakAdminService keycloakAdminService,
                          UserRepository userRepository,
                          AuditService auditService) {
        this.keycloakAdminService = keycloakAdminService;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password are required");
        }

        Map<String, Object> authResult = keycloakAdminService.authenticateUser(username.trim(), password);
        return ResponseEntity.ok(authResult);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> body) {
        String identifier = body.getOrDefault("emailOrUsername",
                body.getOrDefault("identifier", body.get("email")));
        if (identifier == null || identifier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username or Email is required");
        }

        log.info("Received forgot password request for identifier: {}", identifier);
        try {
            keycloakAdminService.sendForgotPasswordEmail(identifier.trim());
        } catch (ResponseStatusException e) {
            // Rethrow so frontend receives proper status (e.g. 404 or 502 SMTP error)
            throw e;
        } catch (Exception e) {
            log.error("Error processing forgot password for identifier: {}", identifier, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to initiate password reset");
        }

        auditService.recordAuditLog(identifier, null, "FORGOT_PASSWORD_REQUEST", "USER", identifier, "127.0.0.1", "{\"identifier\":\"" + identifier + "\"}");

        return ResponseEntity.ok(Map.of(
                "message", "Password reset instructions sent to registered email address.",
                "status", "SUCCESS"
        ));
    }

    @PostMapping("/forced-password-change")
    public ResponseEntity<Map<String, Object>> forcedPasswordChange(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        String confirmPassword = body.get("confirmPassword");

        if (username == null || username.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is required");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 8 characters long");
        }
        if (confirmPassword != null && !newPassword.equals(confirmPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password and confirmation do not match");
        }
        if (newPassword.equals(currentPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different from current password");
        }

        // 1. Verify current password against Keycloak
        KeycloakAdminService.VerificationResult verResult = keycloakAdminService.verifyCredentialsDetail(username, currentPassword);
        if (verResult == KeycloakAdminService.VerificationResult.INVALID) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid current password");
        }

        // 2. Resolve Keycloak user ID
        User user = userRepository.findByUsername(username)
                .orElseGet(() -> userRepository.findByEmail(username)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")));
        String keycloakUserId = keycloakAdminService.resolveUserId(user.getKeycloakSub(), user.getUsername());
        if (keycloakUserId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Keycloak user ID could not be resolved");
        }

        // 3. Reset password in Keycloak (temporary = false), ensure non-blank name fields, and clear UPDATE_PASSWORD
        keycloakAdminService.resetPassword(keycloakUserId, newPassword, false);
        keycloakAdminService.ensureProfileComplete(keycloakUserId, user.getUsername());
        keycloakAdminService.removeRequiredAction(keycloakUserId, "UPDATE_PASSWORD");
        keycloakAdminService.clearRequiredActions(keycloakUserId);

        auditService.recordAuditLog(user.getId().toString(), user.getEmail(), "USER_FORCED_PASSWORD_CHANGE", "USER", user.getId().toString(), "127.0.0.1", "{\"username\":\"" + username + "\"}");

        // 4. Authenticate user immediately with the new password and return tokens
        Map<String, Object> authResult;
        try {
            authResult = keycloakAdminService.authenticateUser(username.trim(), newPassword);
        } catch (Exception e) {
            log.warn("Immediate authentication after forced password change failed: {}", e.getMessage());
            authResult = new LinkedHashMap<>();
        }

        Map<String, Object> res = new LinkedHashMap<>(authResult);
        res.put("message", "Password changed successfully. You may now sign in.");
        res.put("status", "SUCCESS");
        return ResponseEntity.ok(res);
    }

    @PostMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> changePassword(@RequestBody Map<String, String> body) {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null || username.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        String confirmPassword = body.get("confirmPassword");

        if (currentPassword == null || currentPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is required");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 8 characters long");
        }
        if (confirmPassword != null && !newPassword.equals(confirmPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password and confirmation do not match");
        }
        if (newPassword.equals(currentPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different from current password");
        }

        // 1. Verify current password against Keycloak
        boolean validCurrent = keycloakAdminService.verifyCredentials(username, currentPassword);
        if (!validCurrent) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid current password");
        }

        // 2. Resolve Keycloak user ID
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String keycloakUserId = keycloakAdminService.resolveUserId(user.getKeycloakSub(), user.getUsername());
        if (keycloakUserId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Keycloak user ID could not be resolved");
        }

        // 3. Reset password in Keycloak (temporary = false) and clear UPDATE_PASSWORD
        keycloakAdminService.resetPassword(keycloakUserId, newPassword, false);
        keycloakAdminService.removeRequiredAction(keycloakUserId, "UPDATE_PASSWORD");
        keycloakAdminService.clearRequiredActions(keycloakUserId);

        auditService.recordAuditLog(user.getId().toString(), user.getEmail(), "USER_PASSWORD_CHANGE", "USER", user.getId().toString(), "127.0.0.1", "{\"username\":\"" + username + "\"}");

        return ResponseEntity.ok(Map.of(
                "message", "Password changed successfully",
                "status", "SUCCESS"
        ));
    }
}
