package com.enterprise.kms.service;

import com.enterprise.kms.entity.Document;
import com.enterprise.kms.entity.DocumentPermission;
import com.enterprise.kms.entity.Folder;
import com.enterprise.kms.entity.FolderPermission;
import com.enterprise.kms.entity.NotificationEventType;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DocumentPermissionRepository;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.FolderPermissionRepository;
import com.enterprise.kms.repository.FolderRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.security.SecurityUtils;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * FR-16 / FR-17 / FR-19 authorization engine.
 *
 * Effective access to a document is the highest of:
 *   - privileged role (ROLE_ADMIN full control; compliance / IT security read oversight)
 *   - authorship (own uploads)
 *   - explicit document ACL grant (USER / GROUP / ROLE)
 *   - inherited folder ACL grant (folder or any ancestor)
 *   - confidentiality label default (FR-19)
 */
@Service
public class PermissionService {

    public static final String VIEW = "VIEW";
    public static final String EDIT = "EDIT";
    public static final String DELETE = "DELETE";
    public static final String ADMIN = "ADMIN";

    private static final List<String> LEVELS = List.of(VIEW, EDIT, DELETE, ADMIN);
    private static final Set<String> SUBJECT_TYPES = Set.of("USER", "GROUP", "ROLE");

    private final DocumentRepository documentRepository;
    private final FolderRepository folderRepository;
    private final DocumentPermissionRepository documentPermissionRepository;
    private final FolderPermissionRepository folderPermissionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @PersistenceContext
    private EntityManager entityManager;

    @org.springframework.beans.factory.annotation.Autowired
    public PermissionService(DocumentRepository documentRepository,
                             FolderRepository folderRepository,
                             DocumentPermissionRepository documentPermissionRepository,
                             FolderPermissionRepository folderPermissionRepository,
                             UserRepository userRepository,
                             NotificationService notificationService) {
        this.documentRepository = documentRepository;
        this.folderRepository = folderRepository;
        this.documentPermissionRepository = documentPermissionRepository;
        this.folderPermissionRepository = folderPermissionRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public PermissionService(DocumentRepository documentRepository,
                             FolderRepository folderRepository,
                             DocumentPermissionRepository documentPermissionRepository,
                             FolderPermissionRepository folderPermissionRepository,
                             UserRepository userRepository) {
        this(documentRepository, folderRepository, documentPermissionRepository,
             folderPermissionRepository, userRepository, null);
    }

    // ---------------- caller context ----------------

    public static class Caller {
        public User user;
        public UUID userId;
        public String departmentId;
        public List<String> roles = new ArrayList<>();
        public List<String> groupIds = new ArrayList<>();
        public boolean isAdmin;
        public boolean isOversight; // compliance / IT security: read-only oversight

        public String rolesCsv() { return String.join(",", roles); }
        public String groupsCsv() { return groupIds.isEmpty() ? "" : String.join(",", groupIds); }
        public String userIdText() { return userId != null ? userId.toString() : "00000000-0000-0000-0000-000000000000"; }
        public String departmentIdText() { return departmentId != null ? departmentId : "00000000-0000-0000-0000-000000000000"; }
        /** Privileged for read purposes (used by the search/browse SQL predicate). */
        public boolean privilegedRead() { return isAdmin || isOversight; }
    }

    @Transactional
    public Caller currentCaller() {
        Caller caller = new Caller();

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            for (GrantedAuthority ga : auth.getAuthorities()) {
                String authority = ga.getAuthority();
                if (authority != null && authority.startsWith("ROLE_")) {
                    caller.roles.add(authority);
                }
            }
        }
        caller.isAdmin = caller.roles.contains("ROLE_ADMIN") || caller.roles.contains("ROLE_SYSTEM_ADMINISTRATOR");
        caller.isOversight = caller.roles.contains("ROLE_COMPLIANCE_OFFICER") || caller.roles.contains("ROLE_IT_SECURITY");

        String username = SecurityUtils.getCurrentUsername();
        User user = userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(username);
                    u.setEmail(username.contains("@") ? username : username + "@enterprise.internal");
                    u.setKeycloakSub("sub-" + username);
                    return userRepository.save(u);
                });
        caller.user = user;
        caller.userId = user.getId();
        if (user.getDepartment() != null) {
            caller.departmentId = user.getDepartment().getId().toString();
        }

        if (user.getId() != null && entityManager != null) {
            @SuppressWarnings("unchecked")
            List<Object> groups = entityManager
                    .createNativeQuery("SELECT ug.group_id FROM user_groups ug WHERE ug.user_id = :userId")
                    .setParameter("userId", user.getId())
                    .getResultList();
            for (Object g : groups) {
                caller.groupIds.add(g.toString());
            }
        }
        return caller;
    }

    // ---------------- effective level resolution ----------------

    private static int rank(String level) {
        int idx = LEVELS.indexOf(level == null ? "" : level.toUpperCase());
        return idx;
    }

    private static boolean satisfies(String held, String required) {
        return rank(held) >= rank(required) && rank(held) >= 0;
    }

    /** Highest level the caller effectively holds on the document, or null when no access. */
    @Transactional
    public String effectiveDocumentLevel(Document doc, Caller caller) {
        if (caller.isAdmin) {
            return ADMIN;
        }
        if (doc.getAuthor() != null && doc.getAuthor().getId() != null
                && doc.getAuthor().getId().equals(caller.userId)) {
            return ADMIN;
        }

        String best = null;
        for (String level : documentPermissionRepository.findEffectiveLevels(
                doc.getId(), caller.userIdText(), caller.rolesCsv(), caller.groupsCsv())) {
            if (rank(level) > rank(best)) best = level;
        }
        if (doc.getFolder() != null) {
            for (String level : folderPermissionRepository.findEffectiveLevels(
                    doc.getFolder().getId(), caller.userIdText(), caller.rolesCsv(), caller.groupsCsv())) {
                if (rank(level) > rank(best)) best = level;
            }
        }
        if (best != null) {
            return best;
        }

        // FR-19: confidentiality label defaults when no explicit grant exists
        String label = doc.getConfidentialityLevel() != null ? doc.getConfidentialityLevel().toUpperCase() : "INTERNAL";
        boolean sameDepartment = doc.getOwnerDepartment() != null && caller.departmentId != null
                && !caller.departmentId.equals("00000000-0000-0000-0000-000000000000")
                && doc.getOwnerDepartment().getId().toString().equals(caller.departmentId);

        boolean isConfidentialAuthorized = sameDepartment && (
                caller.roles.contains("ROLE_CONTENT_OWNER")
                || caller.roles.contains("CONTENT_OWNER")
                || caller.roles.contains("ROLE_MANAGER")
                || caller.roles.contains("ROLE_CONFIDENTIAL_VIEWER")
                || (caller.user != null && ("ROLE_CONTENT_OWNER".equals(caller.user.getRoleName())
                                         || "CONTENT_OWNER".equals(caller.user.getRoleName())
                                         || "ROLE_MANAGER".equals(caller.user.getRoleName())
                                         || "ROLE_CONFIDENTIAL_VIEWER".equals(caller.user.getRoleName())))
        );

        return switch (label) {
            case "PUBLIC" -> VIEW;
            case "INTERNAL" -> sameDepartment ? VIEW : null;
            case "CONFIDENTIAL" -> (isConfidentialAuthorized || caller.isOversight) ? VIEW : null;
            case "RESTRICTED" -> caller.isOversight ? VIEW : null;
            default -> null;
        };
    }

    @Transactional
    public boolean canAccessDocument(Document doc, String requiredLevel, Caller caller) {
        String held = effectiveDocumentLevel(doc, caller);
        if (held == null) {
            return false;
        }
        // Oversight roles get read visibility only; write actions still need a real grant.
        if (!caller.isAdmin && caller.isOversight && !VIEW.equals(requiredLevel)
                && !hasExplicitOrOwnership(doc, caller)) {
            return VIEW.equals(requiredLevel);
        }
        return satisfies(held, requiredLevel);
    }

    private boolean hasExplicitOrOwnership(Document doc, Caller caller) {
        if (doc.getAuthor() != null && doc.getAuthor().getId() != null
                && doc.getAuthor().getId().equals(caller.userId)) {
            return true;
        }
        if (!documentPermissionRepository.findEffectiveLevels(
                doc.getId(), caller.userIdText(), caller.rolesCsv(), caller.groupsCsv()).isEmpty()) {
            return true;
        }
        return doc.getFolder() != null && !folderPermissionRepository.findEffectiveLevels(
                doc.getFolder().getId(), caller.userIdText(), caller.rolesCsv(), caller.groupsCsv()).isEmpty();
    }

    /** Throws 403/404 when the caller may not act on the document at the required level. */
    @Transactional
    public Document requireDocumentAccess(UUID documentId, String requiredLevel) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        Caller caller = currentCaller();
        if (!canAccessDocument(doc, requiredLevel, caller)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You do not have " + requiredLevel + " permission on this document"
                    + ("RESTRICTED".equalsIgnoreCase(doc.getConfidentialityLevel())
                        ? " (classified RESTRICTED)" : ""));
        }
        return doc;
    }

    @Transactional
    public Folder requireFolderAccess(UUID folderId, String requiredLevel) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));
        Caller caller = currentCaller();
        if (caller.isAdmin) {
            return folder;
        }
        if (folder.getOwner() != null && folder.getOwner().getId() != null
                && folder.getOwner().getId().equals(caller.userId)) {
            return folder;
        }

        String best = null;
        for (String level : folderPermissionRepository.findEffectiveLevels(
                folderId, caller.userIdText(), caller.rolesCsv(), caller.groupsCsv())) {
            if (rank(level) > rank(best)) best = level;
        }
        if (best == null) {
            String label = folder.getConfidentialityLevel() != null
                    ? folder.getConfidentialityLevel().toUpperCase() : "INTERNAL";
            boolean sameDepartment = folder.getDepartment() != null && caller.departmentId != null
                    && !caller.departmentId.equals("00000000-0000-0000-0000-000000000000")
                    && folder.getDepartment().getId().toString().equals(caller.departmentId);

            boolean isConfidentialAuthorized = sameDepartment && (
                    caller.roles.contains("ROLE_CONTENT_OWNER")
                    || caller.roles.contains("CONTENT_OWNER")
                    || caller.roles.contains("ROLE_MANAGER")
                    || caller.roles.contains("ROLE_CONFIDENTIAL_VIEWER")
                    || (caller.user != null && ("ROLE_CONTENT_OWNER".equals(caller.user.getRoleName())
                                             || "CONTENT_OWNER".equals(caller.user.getRoleName())
                                             || "ROLE_MANAGER".equals(caller.user.getRoleName())
                                             || "ROLE_CONFIDENTIAL_VIEWER".equals(caller.user.getRoleName())))
            );

            boolean labelAllowsView = switch (label) {
                case "PUBLIC" -> true;
                case "INTERNAL" -> sameDepartment;
                case "CONFIDENTIAL" -> isConfidentialAuthorized || caller.isOversight;
                case "RESTRICTED" -> caller.isOversight;
                default -> false;
            };
            if (labelAllowsView && VIEW.equals(requiredLevel)) {
                return folder;
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You do not have " + requiredLevel + " permission on this folder");
        }
        if (!satisfies(best, requiredLevel)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You do not have " + requiredLevel + " permission on this folder");
        }
        return folder;
    }

    // ---------------- grant management (Section 8 "Manage Permissions") ----------------

    private void validateGrant(String subjectType, String subjectId, String permissionLevel) {
        if (subjectType == null || !SUBJECT_TYPES.contains(subjectType.toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "subjectType must be USER, GROUP or ROLE");
        }
        if (subjectId == null || subjectId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "subjectId is required");
        }
        if (permissionLevel == null || rank(permissionLevel) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "permissionLevel must be VIEW, EDIT, DELETE or ADMIN");
        }
        String type = subjectType.toUpperCase();
        if ("USER".equals(type)) {
            UUID id = parseUuid(subjectId, "subjectId must be a user UUID when subjectType is USER");
            if (!userRepository.existsById(id)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + subjectId);
            }
        } else if ("GROUP".equals(type)) {
            UUID id = parseUuid(subjectId, "subjectId must be a group UUID when subjectType is GROUP");
            Number count = (Number) entityManager
                    .createNativeQuery("SELECT COUNT(*) FROM groups WHERE id = :id")
                    .setParameter("id", id)
                    .getSingleResult();
            if (count.longValue() == 0) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found: " + subjectId);
            }
        } else if (!subjectId.startsWith("ROLE_")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "subjectId must be a realm role name such as ROLE_VIEWER when subjectType is ROLE");
        }
    }

    private UUID parseUuid(String value, String message) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    @Transactional
    public List<Map<String, Object>> listFolderPermissions(UUID folderId) {
        requireFolderAccess(folderId, VIEW);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (FolderPermission fp : folderPermissionRepository.findByFolderId(folderId)) {
            rows.add(describe(fp.getId(), fp.getSubjectType(), fp.getSubjectId(), fp.getPermissionLevel(), null));
        }
        return rows;
    }

    @Transactional
    public Map<String, Object> grantFolderPermission(UUID folderId, String subjectType, String subjectId, String level) {
        Folder folder = requireFolderAccess(folderId, ADMIN);
        validateGrant(subjectType, subjectId, level);

        FolderPermission entry = folderPermissionRepository
                .findByFolderIdAndSubjectTypeAndSubjectId(folderId, subjectType.toUpperCase(), subjectId)
                .orElseGet(FolderPermission::new);
        entry.setFolder(folder);
        entry.setSubjectType(subjectType.toUpperCase());
        entry.setSubjectId(subjectId);
        entry.setPermissionLevel(level.toUpperCase());
        FolderPermission saved = folderPermissionRepository.save(entry);

        if (notificationService != null) {
            if ("USER".equalsIgnoreCase(subjectType)) {
                try {
                    userRepository.findById(UUID.fromString(subjectId)).ifPresent(u ->
                            notificationService.sendNotificationToUser(u, "Folder Access Granted",
                                    "You were granted " + level + " access to folder '" + folder.getName() + "'.",
                                    NotificationEventType.DOCUMENT_PERMISSION_GRANTED, "FOLDER", folder.getId(), "/library"));
                } catch (Exception ignored) {}
            } else if ("ROLE".equalsIgnoreCase(subjectType)) {
                notificationService.sendNotificationToRole(subjectId, "Folder Access Granted",
                        "Your role " + subjectId + " was granted " + level + " access to folder '" + folder.getName() + "'.",
                        NotificationEventType.DOCUMENT_PERMISSION_GRANTED, "FOLDER", folder.getId(), "/library");
            }
        }

        return describe(saved.getId(), saved.getSubjectType(), saved.getSubjectId(), saved.getPermissionLevel(), null);
    }

    @Transactional
    public void revokeFolderPermission(UUID folderId, UUID permissionId) {
        requireFolderAccess(folderId, ADMIN);
        FolderPermission entry = folderPermissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission entry not found"));
        if (entry.getFolder() == null || !folderId.equals(entry.getFolder().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Permission entry does not belong to this folder");
        }
        folderPermissionRepository.delete(entry);
    }

    @Transactional
    public List<Map<String, Object>> listDocumentPermissions(UUID documentId) {
        requireDocumentAccess(documentId, VIEW);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (DocumentPermission dp : documentPermissionRepository.findByDocumentId(documentId)) {
            rows.add(describe(dp.getId(), dp.getSubjectType(), dp.getSubjectId(), dp.getPermissionLevel(), dp.getCreatedAt().toString()));
        }
        return rows;
    }

    @Transactional
    public Map<String, Object> grantDocumentPermission(UUID documentId, String subjectType, String subjectId, String level) {
        Document doc = requireDocumentAccess(documentId, ADMIN);
        validateGrant(subjectType, subjectId, level);

        DocumentPermission entry = documentPermissionRepository
                .findByDocumentIdAndSubjectTypeAndSubjectId(documentId, subjectType.toUpperCase(), subjectId)
                .orElseGet(DocumentPermission::new);
        entry.setDocument(doc);
        entry.setSubjectType(subjectType.toUpperCase());
        entry.setSubjectId(subjectId);
        entry.setPermissionLevel(level.toUpperCase());
        DocumentPermission saved = documentPermissionRepository.save(entry);

        if (notificationService != null) {
            String docUrl = "/preview/" + doc.getId();
            if ("USER".equalsIgnoreCase(subjectType)) {
                try {
                    userRepository.findById(UUID.fromString(subjectId)).ifPresent(u ->
                            notificationService.sendNotificationToUser(u, "Document Access Granted",
                                    "You were granted " + level + " access to document '" + doc.getTitle() + "'.",
                                    NotificationEventType.DOCUMENT_PERMISSION_GRANTED, "DOCUMENT", doc.getId(), docUrl));
                } catch (Exception ignored) {}
            } else if ("ROLE".equalsIgnoreCase(subjectType)) {
                notificationService.sendNotificationToRole(subjectId, "Document Access Granted",
                        "Your role " + subjectId + " was granted " + level + " access to document '" + doc.getTitle() + "'.",
                        NotificationEventType.DOCUMENT_PERMISSION_GRANTED, "DOCUMENT", doc.getId(), docUrl);
            }
        }

        return describe(saved.getId(), saved.getSubjectType(), saved.getSubjectId(), saved.getPermissionLevel(),
                saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : null);
    }

    @Transactional
    public void revokeDocumentPermission(UUID documentId, UUID permissionId) {
        requireDocumentAccess(documentId, ADMIN);
        DocumentPermission entry = documentPermissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission entry not found"));
        if (entry.getDocument() == null || !documentId.equals(entry.getDocument().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Permission entry does not belong to this document");
        }
        documentPermissionRepository.delete(entry);
    }

    /** Resolves a subject to a human-readable label for the admin UI. */
    private Map<String, Object> describe(UUID id, String subjectType, String subjectId, String level, String createdAt) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("subjectType", subjectType);
        row.put("subjectId", subjectId);
        row.put("permissionLevel", level);
        row.put("subjectLabel", resolveSubjectLabel(subjectType, subjectId));
        if (createdAt != null) {
            row.put("createdAt", createdAt);
        }
        return row;
    }

    private String resolveSubjectLabel(String subjectType, String subjectId) {
        try {
            if ("USER".equalsIgnoreCase(subjectType)) {
                return userRepository.findById(UUID.fromString(subjectId))
                        .map(u -> u.getUsername() + " (" + u.getEmail() + ")")
                        .orElse(subjectId);
            }
            if ("GROUP".equalsIgnoreCase(subjectType)) {
                List<?> names = entityManager
                        .createNativeQuery("SELECT name FROM groups WHERE id = :id")
                        .setParameter("id", UUID.fromString(subjectId))
                        .getResultList();
                return names.isEmpty() ? subjectId : names.get(0).toString();
            }
        } catch (Exception ignored) {
            return subjectId;
        }
        return subjectId;
    }

    /** Distinct subjects that can be granted access, for the admin picker. */
    @Transactional
    public Map<String, Object> availableSubjects() {
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> users = new ArrayList<>();
        userRepository.findAll().forEach(u -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", u.getId());
            row.put("label", u.getUsername() + " (" + u.getEmail() + ")");
            row.put("active", u.getIsActive());
            users.add(row);
        });
        result.put("users", users);

        List<Map<String, Object>> groups = new ArrayList<>();
        @SuppressWarnings("unchecked")
        List<Object[]> groupRows = entityManager
                .createNativeQuery("SELECT id, name FROM groups ORDER BY name")
                .getResultList();
        for (Object[] g : groupRows) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", g[0].toString());
            row.put("label", g[1]);
            groups.add(row);
        }
        result.put("groups", groups);

        result.put("roles", new LinkedHashSet<>(List.of(
                "ROLE_ADMIN", "ROLE_CONTENT_OWNER", "ROLE_CONTRIBUTOR",
                "ROLE_VIEWER", "ROLE_COMPLIANCE_OFFICER", "ROLE_IT_SECURITY")));
        result.put("permissionLevels", LEVELS);
        return result;
    }
}
