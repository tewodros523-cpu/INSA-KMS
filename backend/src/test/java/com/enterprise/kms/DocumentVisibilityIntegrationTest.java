package com.enterprise.kms;

import com.enterprise.kms.controller.DocumentController;
import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.*;
import com.enterprise.kms.service.DocumentService;
import com.enterprise.kms.service.PermissionService;
import com.enterprise.kms.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class DocumentVisibilityIntegrationTest {

    private DocumentRepository documentRepository;
    private FolderRepository folderRepository;
    private DocumentPermissionRepository documentPermissionRepository;
    private FolderPermissionRepository folderPermissionRepository;
    private UserRepository userRepository;
    private PermissionService permissionService;

    private Department financeDept;
    private Department itDept;
    private Department hrDept;

    private User financeViewer;
    private User financeContentOwner;
    private User itViewer;
    private User hrViewer;
    private User adminUser;

    private Document financePublicDoc;
    private Document financeInternalDoc;
    private Document financeConfidentialDoc;
    private Document financeRestrictedDoc;

    @BeforeEach
    void setUp() {
        documentRepository = mock(DocumentRepository.class);
        folderRepository = mock(FolderRepository.class);
        documentPermissionRepository = mock(DocumentPermissionRepository.class);
        folderPermissionRepository = mock(FolderPermissionRepository.class);
        userRepository = mock(UserRepository.class);

        permissionService = new PermissionService(
                documentRepository, folderRepository,
                documentPermissionRepository, folderPermissionRepository,
                userRepository, null
        );

        // Departments
        financeDept = new Department();
        financeDept.setId(UUID.randomUUID());
        financeDept.setName("Finance Department");
        financeDept.setCode("FIN");

        itDept = new Department();
        itDept.setId(UUID.randomUUID());
        itDept.setName("IT Department");
        itDept.setCode("IT");

        hrDept = new Department();
        hrDept.setId(UUID.randomUUID());
        hrDept.setName("HR Department");
        hrDept.setCode("HR");

        // Users
        financeViewer = new User();
        financeViewer.setId(UUID.randomUUID());
        financeViewer.setUsername("finance.viewer");
        financeViewer.setDepartment(financeDept);
        financeViewer.setRoleName("ROLE_VIEWER");

        financeContentOwner = new User();
        financeContentOwner.setId(UUID.randomUUID());
        financeContentOwner.setUsername("finance.owner");
        financeContentOwner.setDepartment(financeDept);
        financeContentOwner.setRoleName("ROLE_CONTENT_OWNER");

        itViewer = new User();
        itViewer.setId(UUID.randomUUID());
        itViewer.setUsername("it.viewer");
        itViewer.setDepartment(itDept);
        itViewer.setRoleName("ROLE_VIEWER");

        hrViewer = new User();
        hrViewer.setId(UUID.randomUUID());
        hrViewer.setUsername("hr.viewer");
        hrViewer.setDepartment(hrDept);
        hrViewer.setRoleName("ROLE_VIEWER");

        adminUser = new User();
        adminUser.setId(UUID.randomUUID());
        adminUser.setUsername("admin");
        adminUser.setDepartment(itDept);
        adminUser.setRoleName("ROLE_ADMIN");

        // Documents
        financePublicDoc = new Document();
        financePublicDoc.setId(UUID.randomUUID());
        financePublicDoc.setTitle("Finance Annual Report (Public)");
        financePublicDoc.setOwnerDepartment(financeDept);
        financePublicDoc.setConfidentialityLevel("PUBLIC");

        financeInternalDoc = new Document();
        financeInternalDoc.setId(UUID.randomUUID());
        financeInternalDoc.setTitle("Finance Internal Guidelines");
        financeInternalDoc.setOwnerDepartment(financeDept);
        financeInternalDoc.setConfidentialityLevel("INTERNAL");

        financeConfidentialDoc = new Document();
        financeConfidentialDoc.setId(UUID.randomUUID());
        financeConfidentialDoc.setTitle("Finance Q3 Budget Allocation");
        financeConfidentialDoc.setOwnerDepartment(financeDept);
        financeConfidentialDoc.setConfidentialityLevel("CONFIDENTIAL");

        financeRestrictedDoc = new Document();
        financeRestrictedDoc.setId(UUID.randomUUID());
        financeRestrictedDoc.setTitle("Executive Compensation & Mergers");
        financeRestrictedDoc.setOwnerDepartment(financeDept);
        financeRestrictedDoc.setConfidentialityLevel("RESTRICTED");

        // Default empty permissions
        when(documentPermissionRepository.findEffectiveLevels(any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(folderPermissionRepository.findEffectiveLevels(any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());
    }

    private PermissionService.Caller createCaller(User user, String role, boolean isAdmin, boolean isOversight) {
        PermissionService.Caller caller = new PermissionService.Caller();
        caller.user = user;
        caller.userId = user.getId();
        caller.departmentId = user.getDepartment() != null ? user.getDepartment().getId().toString() : null;
        caller.roles = new ArrayList<>(List.of(role));
        caller.isAdmin = isAdmin;
        caller.isOversight = isOversight;
        return caller;
    }

    @Test
    @DisplayName("PUBLIC: visible to same department and different department users")
    void testPublicVisibility() {
        PermissionService.Caller finCaller = createCaller(financeViewer, "ROLE_VIEWER", false, false);
        PermissionService.Caller itCaller = createCaller(itViewer, "ROLE_VIEWER", false, false);
        PermissionService.Caller hrCaller = createCaller(hrViewer, "ROLE_VIEWER", false, false);

        assertTrue(permissionService.canAccessDocument(financePublicDoc, PermissionService.VIEW, finCaller));
        assertTrue(permissionService.canAccessDocument(financePublicDoc, PermissionService.VIEW, itCaller));
        assertTrue(permissionService.canAccessDocument(financePublicDoc, PermissionService.VIEW, hrCaller));
    }

    @Test
    @DisplayName("INTERNAL: visible only to users belonging to the same department")
    void testInternalVisibility() {
        PermissionService.Caller finCaller = createCaller(financeViewer, "ROLE_VIEWER", false, false);
        PermissionService.Caller itCaller = createCaller(itViewer, "ROLE_VIEWER", false, false);
        PermissionService.Caller hrCaller = createCaller(hrViewer, "ROLE_VIEWER", false, false);

        // Same department: Allowed
        assertTrue(permissionService.canAccessDocument(financeInternalDoc, PermissionService.VIEW, finCaller));

        // Different departments: Denied
        assertFalse(permissionService.canAccessDocument(financeInternalDoc, PermissionService.VIEW, itCaller));
        assertFalse(permissionService.canAccessDocument(financeInternalDoc, PermissionService.VIEW, hrCaller));
    }

    @Test
    @DisplayName("INTERNAL: different department user with explicit grant CAN access")
    void testInternalWithExplicitGrant() {
        PermissionService.Caller itCaller = createCaller(itViewer, "ROLE_VIEWER", false, false);

        // Explicit VIEW grant for itViewer
        when(documentPermissionRepository.findEffectiveLevels(
                eq(financeInternalDoc.getId()), eq(itViewer.getId().toString()), any(), any()))
                .thenReturn(List.of("VIEW"));

        assertTrue(permissionService.canAccessDocument(financeInternalDoc, PermissionService.VIEW, itCaller));
    }

    @Test
    @DisplayName("CONFIDENTIAL: same department regular viewer denied; authorized role allowed")
    void testConfidentialSameDepartment() {
        PermissionService.Caller finViewerCaller = createCaller(financeViewer, "ROLE_VIEWER", false, false);
        PermissionService.Caller finOwnerCaller = createCaller(financeContentOwner, "ROLE_CONTENT_OWNER", false, false);

        // Regular viewer in same department: DENIED
        assertFalse(permissionService.canAccessDocument(financeConfidentialDoc, PermissionService.VIEW, finViewerCaller));

        // Content owner in same department: ALLOWED
        assertTrue(permissionService.canAccessDocument(financeConfidentialDoc, PermissionService.VIEW, finOwnerCaller));
    }

    @Test
    @DisplayName("CONFIDENTIAL: different department denied unless explicitly authorized")
    void testConfidentialDifferentDepartment() {
        PermissionService.Caller itCaller = createCaller(itViewer, "ROLE_VIEWER", false, false);
        PermissionService.Caller itOwnerCaller = createCaller(itViewer, "ROLE_CONTENT_OWNER", false, false);

        // IT user even with Content Owner role is in a different department: DENIED
        assertFalse(permissionService.canAccessDocument(financeConfidentialDoc, PermissionService.VIEW, itCaller));
        assertFalse(permissionService.canAccessDocument(financeConfidentialDoc, PermissionService.VIEW, itOwnerCaller));

        // Explicit grant to IT user: ALLOWED
        when(documentPermissionRepository.findEffectiveLevels(
                eq(financeConfidentialDoc.getId()), eq(itViewer.getId().toString()), any(), any()))
                .thenReturn(List.of("VIEW"));

        assertTrue(permissionService.canAccessDocument(financeConfidentialDoc, PermissionService.VIEW, itCaller));
    }

    @Test
    @DisplayName("RESTRICTED: department membership alone denied; explicit grant or author required")
    void testRestrictedVisibility() {
        PermissionService.Caller finViewerCaller = createCaller(financeViewer, "ROLE_VIEWER", false, false);
        PermissionService.Caller finOwnerCaller = createCaller(financeContentOwner, "ROLE_CONTENT_OWNER", false, false);
        PermissionService.Caller itCaller = createCaller(itViewer, "ROLE_VIEWER", false, false);

        // Same department: DENIED
        assertFalse(permissionService.canAccessDocument(financeRestrictedDoc, PermissionService.VIEW, finViewerCaller));
        assertFalse(permissionService.canAccessDocument(financeRestrictedDoc, PermissionService.VIEW, finOwnerCaller));

        // Different department: DENIED
        assertFalse(permissionService.canAccessDocument(financeRestrictedDoc, PermissionService.VIEW, itCaller));

        // Explicit grant: ALLOWED
        when(documentPermissionRepository.findEffectiveLevels(
                eq(financeRestrictedDoc.getId()), eq(financeViewer.getId().toString()), any(), any()))
                .thenReturn(List.of("VIEW"));

        assertTrue(permissionService.canAccessDocument(financeRestrictedDoc, PermissionService.VIEW, finViewerCaller));

        // Author: ALLOWED
        financeRestrictedDoc.setAuthor(financeViewer);
        assertTrue(permissionService.canAccessDocument(financeRestrictedDoc, PermissionService.VIEW, finViewerCaller));
    }

    @Test
    @DisplayName("ADMIN: has full access to all documents regardless of department or confidentiality")
    void testAdminFullAccess() {
        PermissionService.Caller adminCaller = createCaller(adminUser, "ROLE_ADMIN", true, false);

        assertTrue(permissionService.canAccessDocument(financePublicDoc, PermissionService.VIEW, adminCaller));
        assertTrue(permissionService.canAccessDocument(financeInternalDoc, PermissionService.VIEW, adminCaller));
        assertTrue(permissionService.canAccessDocument(financeConfidentialDoc, PermissionService.VIEW, adminCaller));
        assertTrue(permissionService.canAccessDocument(financeRestrictedDoc, PermissionService.VIEW, adminCaller));
    }

    @Test
    @DisplayName("Direct API: requireDocumentAccess throws FORBIDDEN on unauthorized document")
    void testRequireDocumentAccessForbidden() {
        when(documentRepository.findById(financeInternalDoc.getId()))
                .thenReturn(Optional.of(financeInternalDoc));
        when(userRepository.findByUsername("it.viewer"))
                .thenReturn(Optional.of(itViewer));

        // Setup security context for itViewer
        org.springframework.security.core.context.SecurityContext context =
                org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                "it.viewer", "credentials", List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_VIEWER"))
        ));
        org.springframework.security.core.context.SecurityContextHolder.setContext(context);

        assertThrows(ResponseStatusException.class, () ->
                permissionService.requireDocumentAccess(financeInternalDoc.getId(), PermissionService.VIEW)
        );
    }
}
