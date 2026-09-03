package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Department;
import com.enterprise.kms.entity.DocumentType;
import com.enterprise.kms.entity.Tag;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.AuditLogRepository;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.StorageObjectRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.AdminCatalogService;
import com.enterprise.kms.service.ApprovalService;
import com.enterprise.kms.service.EmailService;
import com.enterprise.kms.service.KeycloakAdminService;
import com.enterprise.kms.service.RecycleBinPurgeJob;
import com.enterprise.kms.service.TextExtractionService;
import com.enterprise.kms.service.ReportsService;
import com.enterprise.kms.service.RetentionDispositionJob;
import com.enterprise.kms.service.SystemSettingService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AdminController.class);

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DepartmentRepository departmentRepository;
    private final StorageObjectRepository storageObjectRepository;
    private final AuditLogRepository auditLogRepository;
    private final AdminCatalogService adminCatalogService;
    private final SystemSettingService systemSettingService;
    private final ReportsService reportsService;
    private final RetentionDispositionJob retentionDispositionJob;
    private final KeycloakAdminService keycloakAdminService;
    private final ApprovalService approvalService;
    private final EmailService emailService;
    private final TextExtractionService textExtractionService;
    private final RecycleBinPurgeJob recycleBinPurgeJob;
    private final com.enterprise.kms.service.SiemForwardService siemForwardService;
    private final org.springframework.context.ApplicationContext applicationContext;
    private final com.enterprise.kms.service.HrisSyncService hrisSyncService;
    private final com.enterprise.kms.service.BackupService backupService;
    private final com.enterprise.kms.repository.ShareLinkRepository shareLinkRepository;
    private final com.enterprise.kms.service.MicrosoftGraphService microsoftGraphService;
    private final com.enterprise.kms.service.ChatIntegrationService chatIntegrationService;
    private final com.enterprise.kms.service.AuditService auditService;
    private final com.enterprise.kms.service.NotificationService notificationService;

    @org.springframework.beans.factory.annotation.Autowired
    public AdminController(UserRepository userRepository,
                           DocumentRepository documentRepository,
                           DepartmentRepository departmentRepository,
                           StorageObjectRepository storageObjectRepository,
                           AuditLogRepository auditLogRepository,
                           AdminCatalogService adminCatalogService,
                           SystemSettingService systemSettingService,
                           ReportsService reportsService,
                           RetentionDispositionJob retentionDispositionJob,
                           KeycloakAdminService keycloakAdminService,
                           ApprovalService approvalService,
                           EmailService emailService,
                           TextExtractionService textExtractionService,
                           RecycleBinPurgeJob recycleBinPurgeJob,
                           com.enterprise.kms.service.SiemForwardService siemForwardService,
                           org.springframework.context.ApplicationContext applicationContext,
                           com.enterprise.kms.service.HrisSyncService hrisSyncService,
                           com.enterprise.kms.service.BackupService backupService,
                           com.enterprise.kms.repository.ShareLinkRepository shareLinkRepository,
                           com.enterprise.kms.service.MicrosoftGraphService microsoftGraphService,
                           com.enterprise.kms.service.ChatIntegrationService chatIntegrationService,
                           com.enterprise.kms.service.AuditService auditService,
                           com.enterprise.kms.service.NotificationService notificationService) {
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.departmentRepository = departmentRepository;
        this.storageObjectRepository = storageObjectRepository;
        this.auditLogRepository = auditLogRepository;
        this.adminCatalogService = adminCatalogService;
        this.systemSettingService = systemSettingService;
        this.reportsService = reportsService;
        this.retentionDispositionJob = retentionDispositionJob;
        this.keycloakAdminService = keycloakAdminService;
        this.approvalService = approvalService;
        this.emailService = emailService;
        this.textExtractionService = textExtractionService;
        this.recycleBinPurgeJob = recycleBinPurgeJob;
        this.siemForwardService = siemForwardService;
        this.applicationContext = applicationContext;
        this.hrisSyncService = hrisSyncService;
        this.backupService = backupService;
        this.shareLinkRepository = shareLinkRepository;
        this.microsoftGraphService = microsoftGraphService;
        this.chatIntegrationService = chatIntegrationService;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    public AdminController(UserRepository userRepository,
                           DocumentRepository documentRepository,
                           DepartmentRepository departmentRepository,
                           StorageObjectRepository storageObjectRepository,
                           AuditLogRepository auditLogRepository,
                           AdminCatalogService adminCatalogService,
                           SystemSettingService systemSettingService,
                           ReportsService reportsService,
                           RetentionDispositionJob retentionDispositionJob,
                           KeycloakAdminService keycloakAdminService,
                           ApprovalService approvalService,
                           EmailService emailService,
                           TextExtractionService textExtractionService,
                           RecycleBinPurgeJob recycleBinPurgeJob,
                           com.enterprise.kms.service.SiemForwardService siemForwardService,
                           org.springframework.context.ApplicationContext applicationContext,
                           com.enterprise.kms.service.HrisSyncService hrisSyncService,
                           com.enterprise.kms.service.BackupService backupService,
                           com.enterprise.kms.repository.ShareLinkRepository shareLinkRepository,
                           com.enterprise.kms.service.MicrosoftGraphService microsoftGraphService,
                           com.enterprise.kms.service.ChatIntegrationService chatIntegrationService,
                           com.enterprise.kms.service.AuditService auditService) {
        this(userRepository, documentRepository, departmentRepository, storageObjectRepository,
             auditLogRepository, adminCatalogService, systemSettingService, reportsService,
             retentionDispositionJob, keycloakAdminService, approvalService, emailService,
             textExtractionService, recycleBinPurgeJob, siemForwardService, applicationContext,
             hrisSyncService, backupService, shareLinkRepository, microsoftGraphService,
             chatIntegrationService, auditService, null);
    }

    // ================= Dashboard Summary =================

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "ADMIN_SUMMARY_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getAdminSummary() {
        long totalUsers = userRepository.count();
        long totalDocuments = documentRepository.count();
        long totalDepartments = departmentRepository.count();
        long totalStorageBytes = storageObjectRepository.sumTotalBytes();

        return ResponseEntity.ok(Map.of(
                "totalUsers", totalUsers,
                "totalDocuments", totalDocuments,
                "totalDepartments", totalDepartments,
                "storageQuotaUsedBytes", totalStorageBytes,
                "storageQuotaTotalBytes", 107374182400L,
                "pendingOcrJobs", textExtractionService.countPendingOcrJobs()
        ));
    }

    // ================= Users (existing, unchanged) =================

    @GetMapping("/users")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "ADMIN_USERS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<User>> getAdminUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_VIEW", resourceType = "USER")
    public ResponseEntity<User> getUserById(@PathVariable("id") UUID id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return ResponseEntity.ok(u);
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_CREATED", resourceType = "USER")
    public ResponseEntity<User> createUser(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String email = body.get("email");
        String roleName = body.getOrDefault("roleName", "ROLE_VIEWER");
        String temporaryPassword = body.get("temporaryPassword");

        if (username == null || username.isBlank() || email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and email are required");
        }
        if (userRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A user with this username already exists");
        }

        // FR-18/FR-27: provision in Keycloak first â€” a user that only exists in the KMS
        // database cannot authenticate, and its role would carry no authority.
        String keycloakSub = keycloakAdminService.createUser(
                username, email, body.get("firstName"), body.get("lastName"),
                temporaryPassword, roleName, false);
        if (keycloakSub == null) {
            keycloakSub = body.getOrDefault("keycloakSub", "sub-" + UUID.randomUUID());
        }

        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setRoleName(roleName);
        u.setKeycloakSub(keycloakSub);
        u.setIsActive(true);
        if (body.containsKey("departmentId") && body.get("departmentId") != null && !body.get("departmentId").isBlank()) {
            Department dept = departmentRepository.findById(UUID.fromString(body.get("departmentId")))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
            u.setDepartment(dept);
        }

        User saved = userRepository.save(u);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_UPDATED", resourceType = "USER")
    public ResponseEntity<User> updateUser(@PathVariable("id") UUID id, @RequestBody Map<String, String> body) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (body.containsKey("username") && !body.get("username").isBlank()) {
            u.setUsername(body.get("username"));
        }
        if (body.containsKey("email") && !body.get("email").isBlank()) {
            u.setEmail(body.get("email"));
            if (keycloakAdminService != null) {
                try {
                    String kcId = keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername());
                    if (kcId != null) {
                        keycloakAdminService.updateProfile(kcId, body.get("email"));
                    }
                } catch (Exception e) {
                    log.warn("Could not sync email to Keycloak for user {}: {}", u.getUsername(), e.getMessage());
                }
            }
        }
        if (body.containsKey("roleName") && !body.get("roleName").isBlank()) {
            u.setRoleName(body.get("roleName"));
            if (keycloakAdminService != null) {
                try {
                    String kcId = keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername());
                    if (kcId != null) {
                        keycloakAdminService.assignRealmRoles(kcId, body.get("roleName"));
                    }
                } catch (Exception e) {
                    log.warn("Could not sync role to Keycloak for user {}: {}", u.getUsername(), e.getMessage());
                }
            }
        }
        if (body.containsKey("departmentId")) {
            String deptId = body.get("departmentId");
            if (deptId == null || deptId.isBlank()) {
                u.setDepartment(null);
            } else {
                Department dept = departmentRepository.findById(UUID.fromString(deptId.trim()))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
                u.setDepartment(dept);
            }
        }

        User saved = userRepository.save(u);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/users/{id}/activate")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_ACTIVATED", resourceType = "USER")
    public ResponseEntity<User> activateUser(@PathVariable("id") UUID id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        u.setIsActive(true);
        keycloakAdminService.setEnabled(
                keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername()), true);
        User saved = userRepository.save(u);
        if (notificationService != null) {
            notificationService.sendNotificationToUser(saved, "Account Activated",
                    "Your INSA KMS account has been activated.",
                    com.enterprise.kms.entity.NotificationEventType.USER_ACTIVATED, "USER", saved.getId(), "/profile");
        }
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/users/{id}/deactivate")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_DEACTIVATED", resourceType = "USER")
    public ResponseEntity<User> deactivateUser(@PathVariable("id") UUID id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        u.setIsActive(false);
        // FR-27 offboarding: disabling in the IdP is what actually revokes access
        keycloakAdminService.setEnabled(
                keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername()), false);
        User saved = userRepository.save(u);
        if (notificationService != null) {
            notificationService.sendNotificationToUser(saved, "Account Deactivated",
                    "Your INSA KMS account has been deactivated.",
                    com.enterprise.kms.entity.NotificationEventType.USER_DEACTIVATED, "USER", saved.getId(), "/profile");
        }
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/users/{id}/roles")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_ROLE_CHANGED", resourceType = "USER")
    public ResponseEntity<User> changeUserRole(@PathVariable("id") UUID id, @RequestBody Map<String, String> body) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String newRole = body.get("roleName");
        if (newRole == null || newRole.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "roleName is required");
        }
        // Realm role mapping is the source of truth for authorisation (FR-18)
        keycloakAdminService.assignRealmRoles(
                keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername()), newRole);
        u.setRoleName(newRole);
        User saved = userRepository.save(u);
        if (notificationService != null) {
            notificationService.sendNotificationToUser(saved, "Role Updated",
                    "Your system role has been changed to " + newRole + ".",
                    com.enterprise.kms.entity.NotificationEventType.USER_ROLE_CHANGED, "USER", saved.getId(), "/profile");
        }
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/users/{id}/reset-password")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_PASSWORD_RESET", resourceType = "USER")
    public ResponseEntity<Map<String, String>> resetUserPassword(@PathVariable("id") UUID id,
                                                                 @RequestBody Map<String, String> body) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String password = body.get("password");
        if (password == null || password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password must be at least 8 characters");
        }
        String keycloakUserId = keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername());
        keycloakAdminService.resetPassword(keycloakUserId, password, false);
        keycloakAdminService.addRequiredAction(keycloakUserId, "UPDATE_PASSWORD");
        return ResponseEntity.ok(Map.of("message", "Password reset in Keycloak", "username", u.getUsername()));
    }

    @GetMapping("/identity-provider/health")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "IDP_HEALTH_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getIdentityProviderHealth() {
        return ResponseEntity.ok(keycloakAdminService.health());
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_DELETED", resourceType = "USER")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable("id") UUID id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Soft delete & identity decoupling to preserve document version history and audit logs
        u.setIsActive(false);
        keycloakAdminService.setEnabled(
                keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername()), false);
        userRepository.save(u);
        return ResponseEntity.ok(Map.of("message", "User deactivated in KMS and disabled in Keycloak", "id", id.toString()));
    }

    @GetMapping("/users/search")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_SEARCH", resourceType = "USER")
    public ResponseEntity<List<User>> searchUsers(@RequestParam(name = "q", defaultValue = "") String q) {
        if (q.isBlank()) {
            return ResponseEntity.ok(userRepository.findAll());
        }
        return ResponseEntity.ok(userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q));
    }

    // ================= Roles & Permissions Matrix (Section 8) =================

    @GetMapping("/roles")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "ADMIN_ROLES_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getAdminRoles() {
        List<Map<String, Object>> roles = List.of(
                roleEntry("ROLE_ADMIN", "System Administrator"),
                roleEntry("ROLE_CONTENT_OWNER", "Content Owner / Manager"),
                roleEntry("ROLE_CONTRIBUTOR", "Document Contributor"),
                roleEntry("ROLE_VIEWER", "Read-only Viewer"),
                roleEntry("ROLE_COMPLIANCE_OFFICER", "Compliance / Records Officer"),
                roleEntry("ROLE_IT_SECURITY", "IT Security Administrator")
        );
        return ResponseEntity.ok(roles);
    }

    private Map<String, Object> roleEntry(String name, String description) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("name", name);
        entry.put("description", description);
        entry.put("userCount", userRepository.countByRoleName(name));
        return entry;
    }

    // ================= Departments & Quotas (FR-27) =================

    @GetMapping("/departments")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "DEPARTMENT_LIST_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getDepartments() {
        return ResponseEntity.ok(adminCatalogService.getDepartmentsWithUsage());
    }

    @GetMapping("/departments/search")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "DEPARTMENT_SEARCH", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> searchDepartments(@RequestParam(name = "q", defaultValue = "") String q) {
        return ResponseEntity.ok(adminCatalogService.searchDepartments(q));
    }

    @PostMapping("/departments")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SYSTEM_ADMINISTRATOR')")
    @AuditLog(action = "DEPARTMENT_CREATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> createDepartment(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String code = (String) body.get("code");
        Long quotaBytes = body.get("storageQuotaBytes") != null
                ? Long.valueOf(body.get("storageQuotaBytes").toString()) : null;
        Department saved = adminCatalogService.createDepartment(name, code, quotaBytes);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", saved.getId());
        m.put("name", saved.getName());
        m.put("code", saved.getCode());
        m.put("storageQuotaBytes", saved.getStorageQuotaBytes());
        m.put("isActive", saved.getIsActive());
        m.put("createdAt", saved.getCreatedAt());
        return ResponseEntity.status(HttpStatus.CREATED).body(m);
    }

    @PutMapping("/departments/{id}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SYSTEM_ADMINISTRATOR')")
    @AuditLog(action = "DEPARTMENT_UPDATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> updateDepartment(@PathVariable("id") UUID id,
                                                       @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String code = (String) body.get("code");
        Long quotaBytes = body.get("storageQuotaBytes") != null
                ? Long.valueOf(body.get("storageQuotaBytes").toString()) : null;
        Boolean isActive = body.get("isActive") != null
                ? Boolean.valueOf(body.get("isActive").toString()) : null;
        Department saved = adminCatalogService.updateDepartment(id, name, code, quotaBytes, isActive);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", saved.getId());
        m.put("name", saved.getName());
        m.put("code", saved.getCode());
        m.put("storageQuotaBytes", saved.getStorageQuotaBytes());
        m.put("isActive", saved.getIsActive());
        m.put("createdAt", saved.getCreatedAt());
        return ResponseEntity.ok(m);
    }

    @PutMapping("/departments/{id}/activate")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SYSTEM_ADMINISTRATOR')")
    @AuditLog(action = "DEPARTMENT_ACTIVATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> activateDepartment(@PathVariable("id") UUID id) {
        Department saved = adminCatalogService.activateDepartment(id);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", saved.getId());
        m.put("name", saved.getName());
        m.put("code", saved.getCode());
        m.put("storageQuotaBytes", saved.getStorageQuotaBytes());
        m.put("isActive", saved.getIsActive());
        m.put("createdAt", saved.getCreatedAt());
        return ResponseEntity.ok(m);
    }

    @PutMapping("/departments/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SYSTEM_ADMINISTRATOR')")
    @AuditLog(action = "DEPARTMENT_DEACTIVATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> deactivateDepartment(@PathVariable("id") UUID id) {
        Department saved = adminCatalogService.deactivateDepartment(id);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", saved.getId());
        m.put("name", saved.getName());
        m.put("code", saved.getCode());
        m.put("storageQuotaBytes", saved.getStorageQuotaBytes());
        m.put("isActive", saved.getIsActive());
        m.put("createdAt", saved.getCreatedAt());
        return ResponseEntity.ok(m);
    }

    @DeleteMapping("/departments/{id}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SYSTEM_ADMINISTRATOR')")
    @AuditLog(action = "DEPARTMENT_DELETED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, String>> deleteDepartment(@PathVariable("id") UUID id) {
        adminCatalogService.deleteDepartment(id);
        return ResponseEntity.ok(Map.of("message", "Department deleted successfully", "id", id.toString()));
    }

    // ================= Document Types & Categories (FR-06 / Section 9) =================

    @GetMapping("/document-types")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SYSTEM_ADMINISTRATOR', 'ROLE_COMPLIANCE_OFFICER')")
    @AuditLog(action = "DOCUMENT_TYPE_LIST_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getDocumentTypes() {
        return ResponseEntity.ok(adminCatalogService.getDocumentTypesWithUsage());
    }

    @GetMapping("/document-types/search")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SYSTEM_ADMINISTRATOR', 'ROLE_COMPLIANCE_OFFICER')")
    @AuditLog(action = "DOCUMENT_TYPE_SEARCH", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> searchDocumentTypes(@RequestParam(name = "q", defaultValue = "") String q) {
        return ResponseEntity.ok(adminCatalogService.searchDocumentTypes(q));
    }

    @PostMapping("/document-types")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SYSTEM_ADMINISTRATOR')")
    @AuditLog(action = "DOCUMENT_TYPE_CREATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> createDocumentType(@RequestBody Map<String, String> body) {
        DocumentType saved = adminCatalogService.createDocumentType(body.get("name"), body.get("description"));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", saved.getId());
        m.put("name", saved.getName());
        m.put("description", saved.getDescription());
        m.put("isActive", saved.getIsActive());
        m.put("createdAt", saved.getCreatedAt());
        return ResponseEntity.status(HttpStatus.CREATED).body(m);
    }

    @PutMapping("/document-types/{id}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SYSTEM_ADMINISTRATOR')")
    @AuditLog(action = "DOCUMENT_TYPE_UPDATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> updateDocumentType(@PathVariable("id") UUID id,
                                                           @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        Boolean isActive = body.get("isActive") != null
                ? Boolean.valueOf(body.get("isActive").toString()) : null;
        DocumentType saved = adminCatalogService.updateDocumentType(id, name, description, isActive);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", saved.getId());
        m.put("name", saved.getName());
        m.put("description", saved.getDescription());
        m.put("isActive", saved.getIsActive());
        m.put("createdAt", saved.getCreatedAt());
        return ResponseEntity.ok(m);
    }

    @PutMapping("/document-types/{id}/activate")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SYSTEM_ADMINISTRATOR')")
    @AuditLog(action = "DOCUMENT_TYPE_ACTIVATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> activateDocumentType(@PathVariable("id") UUID id) {
        DocumentType saved = adminCatalogService.activateDocumentType(id);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", saved.getId());
        m.put("name", saved.getName());
        m.put("description", saved.getDescription());
        m.put("isActive", saved.getIsActive());
        m.put("createdAt", saved.getCreatedAt());
        return ResponseEntity.ok(m);
    }

    @PutMapping("/document-types/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SYSTEM_ADMINISTRATOR')")
    @AuditLog(action = "DOCUMENT_TYPE_DEACTIVATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> deactivateDocumentType(@PathVariable("id") UUID id) {
        DocumentType saved = adminCatalogService.deactivateDocumentType(id);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", saved.getId());
        m.put("name", saved.getName());
        m.put("description", saved.getDescription());
        m.put("isActive", saved.getIsActive());
        m.put("createdAt", saved.getCreatedAt());
        return ResponseEntity.ok(m);
    }

    @DeleteMapping("/document-types/{id}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SYSTEM_ADMINISTRATOR')")
    @AuditLog(action = "DOCUMENT_TYPE_DELETED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, String>> deleteDocumentType(@PathVariable("id") UUID id) {
        adminCatalogService.deleteDocumentType(id);
        return ResponseEntity.ok(Map.of("message", "Document type deleted successfully", "id", id.toString()));
    }

    // ================= Taxonomy / Tags (FR-03, FR-06) =================

    @GetMapping("/taxonomy/tags")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER')")
    @AuditLog(action = "TAG_LIST_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getTags() {
        return ResponseEntity.ok(adminCatalogService.getTagsWithUsage());
    }

    @PostMapping("/taxonomy/tags")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "TAG_CREATED", resourceType = "SYSTEM")
    public ResponseEntity<Tag> createTag(@RequestBody Map<String, String> body) {
        Tag saved = adminCatalogService.createTag(body.get("name"), body.get("category"));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/taxonomy/tags/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "TAG_UPDATED", resourceType = "SYSTEM")
    public ResponseEntity<Tag> updateTag(@PathVariable("id") UUID id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminCatalogService.updateTag(id, body.get("name"), body.get("category")));
    }

    @DeleteMapping("/taxonomy/tags/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "TAG_DELETED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, String>> deleteTag(@PathVariable("id") UUID id) {
        adminCatalogService.deleteTag(id);
        return ResponseEntity.ok(Map.of("message", "Tag deleted successfully", "id", id.toString()));
    }

    // ================= Groups (FR-27 user groups) =================

    @GetMapping("/groups")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "GROUPS_LIST_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getGroups() {
        return ResponseEntity.ok(adminCatalogService.getGroupsWithMembership());
    }

    // ================= System Configuration (FR-27) =================

    @GetMapping("/settings")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "SETTINGS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getSettings() {
        List<Map<String, Object>> rows = systemSettingService.getAllSettings().stream()
                .map(s -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("settingKey", s.getSettingKey());
                    row.put("settingValue", s.getSettingValue());
                    row.put("description", s.getDescription());
                    row.put("updatedAt", s.getUpdatedAt());
                    return row;
                })
                .toList();
        return ResponseEntity.ok(rows);
    }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "SETTINGS_UPDATED", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> updateSettings(@RequestBody Map<String, String> body) {
        systemSettingService.updateSettings(body);
        return getSettings();
    }

    @GetMapping("/settings/storage-config")
    public ResponseEntity<Map<String, String>> getStorageConfig() {
        return ResponseEntity.ok(Map.of(
                "imageUrl", systemSettingService.getSettingValue("storage.url.image", "/images"),
                "videoUrl", systemSettingService.getSettingValue("storage.url.video", "/videos"),
                "documentUrl", systemSettingService.getSettingValue("storage.url.document", "/api/v1/documents")
        ));
    }

    // ================= Share Links Management (FR-20) =================

    @GetMapping("/share-links")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_IT_SECURITY')")
    @AuditLog(action = "SHARE_LINKS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> listShareLinks(
            @RequestParam(name = "includeExpired", defaultValue = "false") boolean includeExpired) {
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
        List<com.enterprise.kms.entity.ShareLink> links = includeExpired
                ? shareLinkRepository.findAll()
                : shareLinkRepository.findByExpiresAtAfterOrderByCreatedAtDesc(now);

        List<Map<String, Object>> rows = new java.util.ArrayList<>();
        for (com.enterprise.kms.entity.ShareLink link : links) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", link.getId());
            row.put("documentId", link.getDocument() != null ? link.getDocument().getId() : null);
            row.put("documentTitle", link.getDocument() != null ? link.getDocument().getTitle() : null);
            row.put("permissionLevel", link.getPermissionLevel());
            row.put("hasPassword", link.getPasswordHash() != null && !link.getPasswordHash().isBlank());
            row.put("expiresAt", link.getExpiresAt());
            row.put("createdAt", link.getCreatedAt());
            row.put("isExpired", link.getExpiresAt().isBefore(now));
            rows.add(row);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalLinks", links.size());
        result.put("activeLinks", shareLinkRepository.countByExpiresAtAfter(now));
        result.put("links", rows);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/share-links/{id}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER')")
    @AuditLog(action = "SHARE_LINK_REVOKED", resourceType = "SHARE_LINK")
    public ResponseEntity<Map<String, String>> revokeShareLink(@PathVariable("id") UUID id) {
        com.enterprise.kms.entity.ShareLink link = shareLinkRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share link not found"));
        shareLinkRepository.delete(link);
        auditService.recordAuditLog(com.enterprise.kms.security.SecurityUtils.getCurrentUsername(), null,
                "SHARE_LINK_REVOKED", "SHARE_LINK", id.toString(), null,
                "{\"documentId\":\"" + (link.getDocument() != null ? link.getDocument().getId() : "") + "\"}");
        return ResponseEntity.ok(Map.of("message", "Share link revoked", "id", id.toString()));
    }

    // ================= Storage Integrity (FR-21 / NFR-06 support) =================

    @GetMapping("/storage/encryption")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_IT_SECURITY')")
    @AuditLog(action = "STORAGE_ENCRYPTION_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getEncryptionStatus() {
        return ResponseEntity.ok(adminCatalogService.getEncryptionStatus());
    }

    @GetMapping("/storage/stats")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "STORAGE_STATS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getStorageStats() {
        long totalObjects = storageObjectRepository.count();
        long totalBytes = storageObjectRepository.sumTotalBytes();
        long orphanedObjects = storageObjectRepository.countOrphanedObjects();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalObjects", totalObjects);
        stats.put("totalBytes", totalBytes);
        stats.put("orphanedObjects", orphanedObjects);
        stats.put("duplicateChecksums", storageObjectRepository.findDuplicateChecksums(10).stream()
                .map(r -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("checksumSha256", r[0]);
                    row.put("copies", AdminCatalogService.toLong(r[1]));
                    row.put("wastedBytes", AdminCatalogService.toLong(r[2]));
                    return row;
                })
                .toList());
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/storage/objects")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "STORAGE_OBJECTS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getStorageObjects(
            @RequestParam(name = "limit", defaultValue = "50") int limit) {

        List<Map<String, Object>> rows = storageObjectRepository.findRecentObjectsWithUsage(Math.min(Math.max(limit, 1), 200))
                .stream()
                .map(r -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", r[0].toString());
                    row.put("storagePath", r[1]);
                    row.put("fileSizeBytes", AdminCatalogService.toLong(r[2]));
                    row.put("checksumSha256", r[3]);
                    row.put("createdAt", r[4]);
                    row.put("versionReferences", AdminCatalogService.toLong(r[5]));
                    row.put("isOrphaned", (Boolean) r[6]);
                    return row;
                })
                .toList();
        return ResponseEntity.ok(rows);
    }

    // ================= IT Security Monitoring (FR-22 / Section 3) =================

    @GetMapping("/security/events")
    @PreAuthorize("hasAnyRole('ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "SECURITY_EVENTS_VIEW", resourceType = "AUDIT")
    public ResponseEntity<Page<com.enterprise.kms.entity.AuditLogEntity>> getSecurityEvents(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "25") int size,
            @RequestParam(name = "action", required = false) String action,
            @RequestParam(name = "user", required = false) String user,
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
            @RequestParam(name = "from", required = false) java.time.OffsetDateTime from,
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
            @RequestParam(name = "to", required = false) java.time.OffsetDateTime to) {
        PageRequest request = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        boolean filtered = (action != null && !action.isBlank()) || (user != null && !user.isBlank())
                || from != null || to != null;
        Page<com.enterprise.kms.entity.AuditLogEntity> events = filtered
                ? auditLogRepository.findFiltered(
                        (action != null && !action.isBlank()) ? action : null,
                        (user != null && !user.isBlank()) ? user : null, from, to, request)
                : auditLogRepository.findAll(
                        PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                                Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(events);
    }

    // ================= Usage & Stale Content Reports (FR-30, FR-31) =================

    @GetMapping("/reports/storage-growth")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "REPORT_STORAGE_GROWTH", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getStorageGrowthReport(
            @RequestParam(name = "months", defaultValue = "12") int months) {
        return ResponseEntity.ok(Map.of(
                "generatedAt", OffsetDateTime.now().toString(),
                "months", months,
                "data", reportsService.getStorageGrowth(months)
        ));
    }

    @GetMapping("/reports/active-users")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "REPORT_ACTIVE_USERS", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getActiveUsersReport(
            @RequestParam(name = "days", defaultValue = "30") int days,
            @RequestParam(name = "limit", defaultValue = "15") int limit) {
        return ResponseEntity.ok(Map.of(
                "generatedAt", OffsetDateTime.now().toString(),
                "days", days,
                "data", reportsService.getActiveUsers(days, limit)
        ));
    }

    @GetMapping("/reports/top-searches")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "REPORT_TOP_SEARCHES", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getTopSearchesReport(
            @RequestParam(name = "days", defaultValue = "30") int days,
            @RequestParam(name = "limit", defaultValue = "10") int limit) {
        return ResponseEntity.ok(Map.of(
                "generatedAt", OffsetDateTime.now().toString(),
                "days", days,
                "data", reportsService.getTopSearches(days, limit)
        ));
    }

    @GetMapping("/reports/stale-content")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_COMPLIANCE_OFFICER')")
    @AuditLog(action = "REPORT_STALE_CONTENT", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getStaleContentReport(
            @RequestParam(name = "days", defaultValue = "365") int days,
            @RequestParam(name = "limit", defaultValue = "100") int limit) {
        return ResponseEntity.ok(Map.of(
                "generatedAt", OffsetDateTime.now().toString(),
                "staleThresholdDays", days,
                "data", reportsService.getStaleOrOrphanedContent(days, limit)
        ));
    }

    // ================= Manual Retention Run (FR-28) =================

    @PostMapping("/retention/run")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_COMPLIANCE_OFFICER')")
    @AuditLog(action = "RETENTION_RUN_TRIGGERED", resourceType = "GOVERNANCE")
    public ResponseEntity<Map<String, Long>> runRetentionDispositions() {
        return ResponseEntity.ok(retentionDispositionJob.runDispositions());
    }

    // ================= Groups management CRUD (FR-27) =================

    @PostMapping("/groups")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "GROUP_CREATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> createGroup(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        UUID departmentId = body.get("departmentId") != null && !body.get("departmentId").toString().isBlank()
                ? UUID.fromString(body.get("departmentId").toString()) : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(adminCatalogService.createGroup(name, departmentId));
    }

    @PutMapping("/groups/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "GROUP_UPDATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> updateGroup(@PathVariable("id") UUID id,
                                                           @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        UUID departmentId = body.get("departmentId") != null && !body.get("departmentId").toString().isBlank()
                ? UUID.fromString(body.get("departmentId").toString()) : null;
        return ResponseEntity.ok(adminCatalogService.updateGroup(id, name, departmentId));
    }

    @DeleteMapping("/groups/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "GROUP_DELETED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, String>> deleteGroup(@PathVariable("id") UUID id) {
        adminCatalogService.deleteGroup(id);
        return ResponseEntity.ok(Map.of("message", "Group deleted", "id", id.toString()));
    }

    @GetMapping("/groups/{id}/members")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "GROUP_MEMBERS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> listGroupMembers(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(adminCatalogService.listMembers(id));
    }

    @PostMapping("/groups/{id}/members")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "GROUP_MEMBER_ADDED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, String>> addGroupMember(@PathVariable("id") UUID id,
                                                              @RequestBody Map<String, String> body) {
        if (body.get("userId") == null || body.get("userId").isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId is required");
        }
        adminCatalogService.addMember(id, UUID.fromString(body.get("userId")));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Member added"));
    }

    @DeleteMapping("/groups/{id}/members/{userId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "GROUP_MEMBER_REMOVED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, String>> removeGroupMember(@PathVariable("id") UUID id,
                                                                 @PathVariable("userId") UUID userId) {
        adminCatalogService.removeMember(id, userId);
        return ResponseEntity.ok(Map.of("message", "Member removed"));
    }

    // ================= Custom metadata field definitions (FR-06) =================

    @GetMapping("/document-types/{id}/fields")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_COMPLIANCE_OFFICER')")
    @AuditLog(action = "DOC_TYPE_FIELDS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> listTypeFields(@PathVariable("id") UUID id) {
        List<Map<String, Object>> rows = new java.util.ArrayList<>();
        for (com.enterprise.kms.entity.DocumentTypeField field : adminCatalogService.listTypeFields(id)) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", field.getId());
            row.put("fieldKey", field.getFieldKey());
            row.put("label", field.getLabel());
            row.put("dataType", field.getDataType());
            row.put("required", field.getIsRequired());
            rows.add(row);
        }
        return ResponseEntity.ok(rows);
    }

    @PostMapping("/document-types/{id}/fields")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "DOC_TYPE_FIELD_CREATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> createTypeField(@PathVariable("id") UUID id,
                                                               @RequestBody Map<String, Object> body) {
        String fieldKey = (String) body.get("fieldKey");
        String label = (String) body.getOrDefault("label", fieldKey);
        String dataType = (String) body.getOrDefault("dataType", "TEXT");
        boolean required = Boolean.parseBoolean(String.valueOf(body.getOrDefault("required", "false")));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminCatalogService.createTypeField(id, fieldKey, label, dataType, required));
    }

    @DeleteMapping("/document-types/{id}/fields/{fieldId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "DOC_TYPE_FIELD_DELETED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, String>> deleteTypeField(@PathVariable("id") UUID id,
                                                                @PathVariable("fieldId") UUID fieldId) {
        adminCatalogService.deleteTypeField(fieldId);
        return ResponseEntity.ok(Map.of("message", "Field deleted"));
    }

    @PutMapping("/document-types/{id}/fields/{fieldId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "DOC_TYPE_FIELD_UPDATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> updateTypeField(@PathVariable("id") UUID id,
                                                                @PathVariable("fieldId") UUID fieldId,
                                                                @RequestBody Map<String, Object> body) {
        String label = (String) body.get("label");
        String dataType = (String) body.get("dataType");
        Boolean required = body.get("required") != null ? Boolean.parseBoolean(String.valueOf(body.get("required"))) : null;
        return ResponseEntity.ok(adminCatalogService.updateTypeField(fieldId, label, dataType, required));
    }

    // ================= Recycle Bin purge (FR-08) =================

    @PostMapping("/recycle-bin/purge")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER')")
    @AuditLog(action = "RECYCLE_BIN_PURGE_TRIGGERED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> purgeRecycleBin(
            @RequestParam(name = "days", required = false) Integer days) {
        return ResponseEntity.ok(recycleBinPurgeJob.purgeExpired(days));
    }

    // ================= SIEM forwarding trigger (Section 7) =================

    @PostMapping("/security/siem/forward")
    @PreAuthorize("hasAnyRole('ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "SIEM_FORWARD_TRIGGERED", resourceType = "AUDIT")
    public ResponseEntity<Map<String, Object>> forwardToSiem() {
        return ResponseEntity.ok(siemForwardService.forwardPending());
    }

    // ================= Email diagnostics (Section 7) =================

    @PostMapping("/mail/test")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "MAIL_TEST_SENT", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> sendTestEmail(@RequestBody Map<String, String> body) {
        String to = body.get("to");
        if (to == null || to.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "'to' is required");
        }
        return ResponseEntity.ok(emailService.send(to, "KMS SMTP Test",
                "This is a test message from the KMS administration console."));
    }

    // ================= Microsoft 365 Integration (Section 7) =================

    @GetMapping("/integrations/microsoft365")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "MS365_STATUS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getMicrosoft365Status() {
        return ResponseEntity.ok(microsoftGraphService.getGraphHealthStatus());
    }

    @PostMapping("/integrations/microsoft365/test")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "MS365_CONNECTION_TEST", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> testMicrosoft365Connection() {
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            String token = microsoftGraphService.acquireGraphAccessToken();
            result.put("status", microsoftGraphService.isConfigured() ? "SUCCESS" : "MOCK_TOKEN_RETURNED");
            result.put("configured", microsoftGraphService.isConfigured());
            result.put("tokenEndpoint", token);
        } catch (IllegalStateException e) {
            result.put("status", "DISABLED");
            result.put("error", e.getMessage());
        }
        return ResponseEntity.ok(result);
    }

    @PutMapping("/integrations/microsoft365/toggle")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "MS365_TOGGLE", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> toggleMicrosoft365(@RequestBody Map<String, Object> body) {
        String enabled = body.get("enabled") != null ? body.get("enabled").toString() : "true";
        systemSettingService.updateSettings(Map.of("ms.graph.enabled", enabled));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ms.graph.enabled", Boolean.parseBoolean(enabled));
        result.put("message", "Microsoft 365 integration " + (Boolean.parseBoolean(enabled) ? "enabled" : "disabled"));
        return ResponseEntity.ok(result);
    }

    // ================= Chat/Collaboration Integration (Section 7) =================

    @GetMapping("/integrations/chat")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "CHAT_INTEGRATION_STATUS", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getChatIntegrationStatus() {
        return ResponseEntity.ok(chatIntegrationService.getStatus());
    }

    @PostMapping("/integrations/chat/test")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "CHAT_INTEGRATION_TEST", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> testChatIntegration(@RequestBody Map<String, String> body) {
        String message = body.getOrDefault("message", "KMS integration test message");
        return ResponseEntity.ok(chatIntegrationService.sendTestMessage(message));
    }

    // ================= Backup status (NFR-06) =================

    @GetMapping("/backup/status")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "BACKUP_STATUS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getBackupStatus() {
        return ResponseEntity.ok(adminCatalogService.getBackupStatus(systemSettingService));
    }

    @PostMapping("/backup/run")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "BACKUP_TRIGGERED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> runBackup() {
        return ResponseEntity.ok(backupService.executeBackup());
    }

    @PostMapping("/backup/restore")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "BACKUP_RESTORE_TRIGGERED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> restoreBackup(@RequestBody Map<String, String> body) {
        String fileName = body.get("fileName");
        if (fileName == null || fileName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fileName is required");
        }
        return ResponseEntity.ok(backupService.restoreBackup(fileName));
    }

    @GetMapping("/backup/files")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "BACKUP_FILES_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<java.util.List<Map<String, Object>>> listBackupFiles() {
        return ResponseEntity.ok(backupService.listBackupFiles());
    }

    @GetMapping("/backup/durability")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_IT_SECURITY')")
    @AuditLog(action = "BACKUP_DURABILITY_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getDurabilityStatus() {
        return ResponseEntity.ok(backupService.getDurabilityStatus());
    }

    // ================= HRIS Sync (Section 7) =================

    @GetMapping("/hris/status")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "HRIS_STATUS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getHrisSyncStatus() {
        return ResponseEntity.ok(hrisSyncService.getSyncStatus());
    }

    @PostMapping("/hris/sync")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "HRIS_SYNC_TRIGGERED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> triggerHrisSync(
            @RequestBody(required = false) java.util.List<java.util.Map<String, String>> users) {
        if (users != null && !users.isEmpty()) {
            return ResponseEntity.ok(hrisSyncService.syncFromExternalList(users));
        }
        return ResponseEntity.ok(hrisSyncService.syncFromFeed());
    }

    // ================= OCR queue (FR-10) =================

    @GetMapping("/ocr/jobs")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "OCR_JOBS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> listOcrJobs(@RequestParam(name = "limit", defaultValue = "50") int limit) {
        List<Map<String, Object>> jobs = new java.util.ArrayList<>();
        for (com.enterprise.kms.entity.OcrJob job : textExtractionService.recentJobs(limit)) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", job.getId());
            row.put("status", job.getStatus());
            row.put("errorMessage", job.getErrorMessage());
            row.put("createdAt", job.getCreatedAt());
            row.put("processedAt", job.getProcessedAt());
            com.enterprise.kms.entity.DocumentVersion v = job.getVersion();
            row.put("fileName", v != null ? v.getFileName() : null);
            jobs.add(row);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("pendingCount", textExtractionService.countPendingOcrJobs());
        result.put("jobs", jobs);
        return ResponseEntity.ok(result);
    }

    // ================= Approval workflow templates (FR-25) =================

    @GetMapping("/approval-templates")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER', 'ROLE_CONTRIBUTOR')")
    @AuditLog(action = "APPROVAL_TEMPLATES_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> listApprovalTemplates() {
        return ResponseEntity.ok(approvalService.listTemplates());
    }

    @PostMapping("/approval-templates")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "APPROVAL_TEMPLATE_CREATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> createApprovalTemplate(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(approvalService.createTemplate(
                (String) body.get("name"),
                (String) body.get("description"),
                body.get("documentTypeId") != null && !body.get("documentTypeId").toString().isBlank()
                        ? UUID.fromString(body.get("documentTypeId").toString()) : null,
                body.get("isActive") != null ? Boolean.valueOf(body.get("isActive").toString()) : null,
                parseUuidList(body.get("approverIds"))));
    }

    @PutMapping("/approval-templates/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "APPROVAL_TEMPLATE_UPDATED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> updateApprovalTemplate(@PathVariable("id") UUID id,
                                                                       @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(approvalService.updateTemplate(id,
                (String) body.get("name"),
                (String) body.get("description"),
                body.get("documentTypeId") != null && !body.get("documentTypeId").toString().isBlank()
                        ? UUID.fromString(body.get("documentTypeId").toString()) : null,
                body.get("isActive") != null ? Boolean.valueOf(body.get("isActive").toString()) : null,
                parseUuidList(body.get("approverIds"))));
    }

    @DeleteMapping("/approval-templates/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "APPROVAL_TEMPLATE_DELETED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, String>> deleteApprovalTemplate(@PathVariable("id") UUID id) {
        approvalService.deleteTemplate(id);
        return ResponseEntity.ok(Map.of("message", "Template deleted"));
    }

    // ================= Approval Execution (FR-25) =================

    @PostMapping("/approvals/submit")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "APPROVAL_SUBMITTED", resourceType = "APPROVAL_WORKFLOW")
    public ResponseEntity<Map<String, Object>> submitForApproval(@RequestBody Map<String, String> body) {
        UUID documentId = UUID.fromString(body.get("documentId"));
        UUID templateId = UUID.fromString(body.get("templateId"));
        String username = com.enterprise.kms.security.SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(approvalService.submitForApproval(documentId, templateId, username));
    }

    @PostMapping("/approvals/{workflowId}/steps/{stepId}/decide")
    @PreAuthorize("hasAnyRole('ROLE_CONTENT_OWNER', 'ROLE_ADMIN', 'ROLE_COMPLIANCE_OFFICER')")
    @AuditLog(action = "APPROVAL_STEP_DECIDED", resourceType = "APPROVAL_WORKFLOW")
    public ResponseEntity<Map<String, Object>> decideApprovalStep(
            @PathVariable("workflowId") UUID workflowId,
            @PathVariable("stepId") UUID stepId,
            @RequestBody Map<String, String> body) {
        String decision = body.get("decision");
        String comments = body.get("comments");
        String username = com.enterprise.kms.security.SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(approvalService.decideStep(workflowId, stepId, decision, username, comments));
    }

    @GetMapping("/approvals/pending")
    @PreAuthorize("hasAnyRole('ROLE_CONTENT_OWNER', 'ROLE_ADMIN', 'ROLE_COMPLIANCE_OFFICER')")
    @AuditLog(action = "APPROVALS_PENDING_VIEW", resourceType = "APPROVAL_WORKFLOW")
    public ResponseEntity<List<Map<String, Object>>> listPendingApprovals() {
        String username = com.enterprise.kms.security.SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(approvalService.listPendingApprovals(username));
    }

    @GetMapping("/approvals")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER')")
    @AuditLog(action = "APPROVALS_VIEW", resourceType = "APPROVAL_WORKFLOW")
    public ResponseEntity<List<Map<String, Object>>> listAllWorkflows(
            @RequestParam(name = "status", required = false) String status) {
        return ResponseEntity.ok(approvalService.listAllWorkflows(status));
    }

    @GetMapping("/approvals/{workflowId}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER')")
    @AuditLog(action = "APPROVAL_WORKFLOW_VIEW", resourceType = "APPROVAL_WORKFLOW")
    public ResponseEntity<Map<String, Object>> describeWorkflow(@PathVariable("workflowId") UUID workflowId) {
        return ResponseEntity.ok(approvalService.describeWorkflowById(workflowId));
    }

    private List<UUID> parseUuidList(Object raw) {
        List<UUID> ids = new java.util.ArrayList<>();
        if (raw instanceof List<?> list) {
            for (Object item : list) ids.add(UUID.fromString(item.toString()));
        } else if (raw instanceof String s && !s.isBlank()) {
            for (String part : s.split(",")) { if (!part.isBlank()) ids.add(UUID.fromString(part.trim())); }
        }
        return ids;
    }
}
