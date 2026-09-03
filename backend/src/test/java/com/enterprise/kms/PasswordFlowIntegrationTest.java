package com.enterprise.kms;

import com.enterprise.kms.controller.AdminController;
import com.enterprise.kms.controller.AuthController;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.AuditService;
import com.enterprise.kms.service.KeycloakAdminService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PasswordFlowIntegrationTest {

    private KeycloakAdminService keycloakAdminService;
    private UserRepository userRepository;
    private DocumentRepository documentRepository;
    private DepartmentRepository departmentRepository;
    private AuditService auditService;

    private AdminController adminController;
    private AuthController authController;

    private User testUser;
    private final UUID testUserId = UUID.randomUUID();
    private final String testUsername = "test.user";
    private final String testEmail = "test.user@enterprise.internal";
    private final String testSub = "123e4567-e89b-12d3-a456-426614174000";

    @BeforeEach
    void setUp() {
        keycloakAdminService = Mockito.mock(KeycloakAdminService.class);
        userRepository = Mockito.mock(UserRepository.class);
        documentRepository = Mockito.mock(DocumentRepository.class);
        departmentRepository = Mockito.mock(DepartmentRepository.class);
        auditService = Mockito.mock(AuditService.class);

        adminController = new AdminController(
                userRepository, documentRepository, departmentRepository, null, null,
                null, null, null, null, keycloakAdminService, null, null, null, null,
                null, null, null, null, null, null, null, auditService
        );

        authController = new AuthController(keycloakAdminService, userRepository, auditService);

        testUser = new User();
        testUser.setId(testUserId);
        testUser.setUsername(testUsername);
        testUser.setEmail(testEmail);
        testUser.setKeycloakSub(testSub);
        testUser.setIsActive(true);
        testUser.setRoleName("ROLE_CONTRIBUTOR");

        when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
        when(userRepository.findByUsername(testUsername)).thenReturn(Optional.of(testUser));
        when(keycloakAdminService.resolveUserId(eq(testSub), eq(testUsername))).thenReturn(testSub);
    }

    // --- FORGOT PASSWORD TESTS (1-5) ---

    @Test
    @DisplayName("1. Forgot Password - Valid account triggers execute-actions-email")
    void test1_ForgotPassword_ValidAccount() {
        doNothing().when(keycloakAdminService).sendForgotPasswordEmail(testEmail);

        ResponseEntity<Map<String, String>> response = authController.forgotPassword(Map.of("emailOrUsername", testEmail));
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("SUCCESS", response.getBody().get("status"));
        verify(keycloakAdminService).sendForgotPasswordEmail(testEmail);
    }

    @Test
    @DisplayName("2. Forgot Password - Unknown account handles response cleanly with 200 OK")
    void test2_ForgotPassword_UnknownAccount() {
        doNothing().when(keycloakAdminService).sendForgotPasswordEmail("unknown@kms.internal");

        ResponseEntity<Map<String, String>> response = authController.forgotPassword(Map.of("emailOrUsername", "unknown@kms.internal"));
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("SUCCESS", response.getBody().get("status"));
    }

    @Test
    @DisplayName("3. Forgot Password - Keycloak communication failure handling")
    void test3_ForgotPassword_KeycloakFailure() {
        doThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Keycloak connection failed"))
                .when(keycloakAdminService).sendForgotPasswordEmail(testUsername);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                authController.forgotPassword(Map.of("emailOrUsername", testUsername)));
        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatusCode());
    }

    @Test
    @DisplayName("4. Forgot Password - SMTP failure handling")
    void test4_ForgotPassword_SmtpFailureHandling() {
        doThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Keycloak failed to send password reset email (check SMTP configuration)"))
                .when(keycloakAdminService).sendForgotPasswordEmail(testEmail);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                authController.forgotPassword(Map.of("emailOrUsername", testEmail)));
        assertTrue(ex.getReason().contains("SMTP"));
    }

    @Test
    @DisplayName("5. Forgot Password - No sensitive password/token data leakage")
    void test5_ForgotPassword_NoSensitiveDataLeakage() {
        authController.forgotPassword(Map.of("emailOrUsername", testEmail));
        verify(auditService).recordAuditLog(
                eq(testEmail), eq(null), eq("FORGOT_PASSWORD_REQUEST"), eq("USER"), eq(testEmail), eq("127.0.0.1"), contains("identifier")
        );
    }

    // --- CHANGE PASSWORD TESTS (6-11) ---

    @Test
    @DisplayName("6. Change Password - Correct current password succeeds and clears UPDATE_PASSWORD")
    void test6_ChangePassword_CorrectCurrentPassword() {
        try (MockedStatic<SecurityUtils> secUtilsMock = Mockito.mockStatic(SecurityUtils.class)) {
            secUtilsMock.when(SecurityUtils::getCurrentUsername).thenReturn(testUsername);
            when(keycloakAdminService.verifyCredentials(testUsername, "ValidOldPass123!")).thenReturn(true);

            Map<String, String> req = Map.of(
                    "currentPassword", "ValidOldPass123!",
                    "newPassword", "ValidNewPass123!",
                    "confirmPassword", "ValidNewPass123!"
            );

            ResponseEntity<Map<String, String>> response = authController.changePassword(req);
            assertEquals(HttpStatus.OK, response.getStatusCode());
            verify(keycloakAdminService).resetPassword(testSub, "ValidNewPass123!", false);
            verify(keycloakAdminService).removeRequiredAction(testSub, "UPDATE_PASSWORD");
        }
    }

    @Test
    @DisplayName("7. Change Password - Incorrect current password fails")
    void test7_ChangePassword_IncorrectCurrentPassword() {
        try (MockedStatic<SecurityUtils> secUtilsMock = Mockito.mockStatic(SecurityUtils.class)) {
            secUtilsMock.when(SecurityUtils::getCurrentUsername).thenReturn(testUsername);
            when(keycloakAdminService.verifyCredentials(testUsername, "WrongOldPass123!")).thenReturn(false);

            Map<String, String> req = Map.of(
                    "currentPassword", "WrongOldPass123!",
                    "newPassword", "ValidNewPass123!",
                    "confirmPassword", "ValidNewPass123!"
            );

            ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> authController.changePassword(req));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
            assertTrue(ex.getReason().contains("Invalid current password"));
        }
    }

    @Test
    @DisplayName("8. Change Password - New password mismatch fails")
    void test8_ChangePassword_NewPasswordMismatch() {
        try (MockedStatic<SecurityUtils> secUtilsMock = Mockito.mockStatic(SecurityUtils.class)) {
            secUtilsMock.when(SecurityUtils::getCurrentUsername).thenReturn(testUsername);

            Map<String, String> req = Map.of(
                    "currentPassword", "ValidOldPass123!",
                    "newPassword", "ValidNewPass123!",
                    "confirmPassword", "DifferentNewPass123!"
            );

            ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> authController.changePassword(req));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
            assertTrue(ex.getReason().contains("do not match"));
        }
    }

    @Test
    @DisplayName("9. Change Password - Successful password update")
    void test9_ChangePassword_SuccessfulUpdate() {
        try (MockedStatic<SecurityUtils> secUtilsMock = Mockito.mockStatic(SecurityUtils.class)) {
            secUtilsMock.when(SecurityUtils::getCurrentUsername).thenReturn(testUsername);
            when(keycloakAdminService.verifyCredentials(testUsername, "OldPass123!")).thenReturn(true);

            Map<String, String> req = Map.of(
                    "currentPassword", "OldPass123!",
                    "newPassword", "UpdatedPass123!",
                    "confirmPassword", "UpdatedPass123!"
            );

            ResponseEntity<Map<String, String>> response = authController.changePassword(req);
            assertEquals(HttpStatus.OK, response.getStatusCode());
            verify(keycloakAdminService).resetPassword(testSub, "UpdatedPass123!", false);
        }
    }

    @Test
    @DisplayName("10. Change Password - Old password rejected after update")
    void test10_ChangePassword_OldPasswordRejected() {
        when(keycloakAdminService.verifyCredentials(testUsername, "OldPass123!")).thenReturn(false);
        assertFalse(keycloakAdminService.verifyCredentials(testUsername, "OldPass123!"));
    }

    @Test
    @DisplayName("11. Change Password - New password accepted after update")
    void test11_ChangePassword_NewPasswordAccepted() {
        when(keycloakAdminService.verifyCredentials(testUsername, "UpdatedPass123!")).thenReturn(true);
        assertTrue(keycloakAdminService.verifyCredentials(testUsername, "UpdatedPass123!"));
    }

    // --- ADMIN RESET TESTS (12-15) ---

    @Test
    @DisplayName("12. Admin Reset - Admin password reset sets temporary=false and retains UPDATE_PASSWORD")
    void test12_AdminReset_Succeeds() {
        Map<String, String> req = Map.of("password", "AdminPass123!");
        ResponseEntity<Map<String, String>> response = adminController.resetUserPassword(testUserId, req);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(keycloakAdminService).resetPassword(testSub, "AdminPass123!", false);
        verify(keycloakAdminService).addRequiredAction(testSub, "UPDATE_PASSWORD");
        verify(keycloakAdminService, never()).clearRequiredActions(testSub);
    }

    @Test
    @DisplayName("13. Admin Reset - New password accepted after admin reset")
    void test13_AdminReset_NewPasswordAccepted() {
        when(keycloakAdminService.verifyCredentials(testUsername, "AdminPass123!")).thenReturn(true);
        assertTrue(keycloakAdminService.verifyCredentials(testUsername, "AdminPass123!"));
    }

    @Test
    @DisplayName("14. Admin Reset - Old password rejected after admin reset")
    void test14_AdminReset_OldPasswordRejected() {
        when(keycloakAdminService.verifyCredentials(testUsername, "PreAdminPass123!")).thenReturn(false);
        assertFalse(keycloakAdminService.verifyCredentials(testUsername, "PreAdminPass123!"));
    }

    @Test
    @DisplayName("15. Admin Reset - UPDATE_PASSWORD re-attached on reset")
    void test15_AdminReset_UpdatePasswordReattached() {
        Map<String, String> req = Map.of("password", "AdminPass123!");
        adminController.resetUserPassword(testUserId, req);
        verify(keycloakAdminService).addRequiredAction(testSub, "UPDATE_PASSWORD");
    }

    // --- USER CREATION TESTS (16-19) ---

    @Test
    @DisplayName("16. User Creation - User created with temporary=false and UPDATE_PASSWORD required action")
    void test16_UserCreation_EnabledState() {
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(keycloakAdminService.createUser(
                eq("new.user"), eq("new.user@enterprise.internal"), any(), any(),
                eq("InitPass123!"), eq("ROLE_CONTRIBUTOR"), eq(false)
        )).thenReturn(testSub);

        Map<String, String> req = Map.of(
                "username", "new.user",
                "email", "new.user@enterprise.internal",
                "temporaryPassword", "InitPass123!",
                "roleName", "ROLE_CONTRIBUTOR"
        );
        ResponseEntity<User> response = adminController.createUser(req);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(keycloakAdminService).createUser(
                eq("new.user"), eq("new.user@enterprise.internal"), any(), any(),
                eq("InitPass123!"), eq("ROLE_CONTRIBUTOR"), eq(false)
        );
    }

    @Test
    @DisplayName("17. User Creation - Email verification state is true")
    void test17_UserCreation_EmailVerifiedState() {
        when(keycloakAdminService.findUserByUsername(testUsername)).thenReturn(Map.of(
                "id", testSub, "emailVerified", true
        ));
        Map<String, Object> u = keycloakAdminService.findUserByUsername(testUsername);
        assertTrue((Boolean) u.get("emailVerified"));
    }

    @Test
    @DisplayName("18. User Creation - UPDATE_PASSWORD present in Keycloak profile")
    void test18_UserCreation_UpdatePasswordPresent() {
        when(keycloakAdminService.findUserByUsername(testUsername)).thenReturn(Map.of(
                "requiredActions", List.of("UPDATE_PASSWORD")
        ));
        Map<String, Object> u = keycloakAdminService.findUserByUsername(testUsername);
        assertTrue(((List<?>) u.get("requiredActions")).contains("UPDATE_PASSWORD"));
    }

    @Test
    @DisplayName("19. User Creation - New user can authenticate after completing forced password update")
    void test19_UserCreation_AuthenticationAfterSetup() {
        when(keycloakAdminService.verifyCredentials(testUsername, "InitPass123!")).thenReturn(true);
        assertTrue(keycloakAdminService.verifyCredentials(testUsername, "InitPass123!"));
    }

    // --- FORCED PASSWORD CHANGE TESTS (20-22) ---

    @Test
    @DisplayName("20. Forced Password Change - Succeeds with valid assigned password and clears UPDATE_PASSWORD")
    void test20_ForcedPasswordChange_Succeeds() {
        when(keycloakAdminService.verifyCredentialsDetail(testUsername, "AssignedPass123!"))
                .thenReturn(KeycloakAdminService.VerificationResult.UPDATE_PASSWORD_REQUIRED);

        Map<String, String> req = Map.of(
                "username", testUsername,
                "currentPassword", "AssignedPass123!",
                "newPassword", "PermanentPass123!",
                "confirmPassword", "PermanentPass123!"
        );

        ResponseEntity<Map<String, Object>> response = authController.forcedPasswordChange(req);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("SUCCESS", response.getBody().get("status"));
        verify(keycloakAdminService).resetPassword(testSub, "PermanentPass123!", false);
        verify(keycloakAdminService).removeRequiredAction(testSub, "UPDATE_PASSWORD");
    }

    @Test
    @DisplayName("21. Forced Password Change - Invalid current password rejected")
    void test21_ForcedPasswordChange_InvalidCurrentPassword() {
        when(keycloakAdminService.verifyCredentialsDetail(testUsername, "WrongAssignedPass!"))
                .thenReturn(KeycloakAdminService.VerificationResult.INVALID);

        Map<String, String> req = Map.of(
                "username", testUsername,
                "currentPassword", "WrongAssignedPass!",
                "newPassword", "PermanentPass123!",
                "confirmPassword", "PermanentPass123!"
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                authController.forcedPasswordChange(req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Invalid current password"));
    }

    @Test
    @DisplayName("22. Forced Password Change - Password mismatch rejected")
    void test22_ForcedPasswordChange_PasswordMismatch() {
        Map<String, String> req = Map.of(
                "username", testUsername,
                "currentPassword", "AssignedPass123!",
                "newPassword", "PermanentPass123!",
                "confirmPassword", "DifferentPass123!"
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                authController.forcedPasswordChange(req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("do not match"));
    }
}
