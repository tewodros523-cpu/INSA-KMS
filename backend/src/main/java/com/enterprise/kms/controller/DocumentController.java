package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Document;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.DocumentService;
import com.enterprise.kms.service.PermissionService;
import com.enterprise.kms.service.ShareLinkService;
import com.enterprise.kms.repository.DocumentCommentRepository;
import com.enterprise.kms.repository.DocumentFavoriteRepository;
import com.enterprise.kms.repository.DocumentLockRepository;
import com.enterprise.kms.entity.DocumentShare;
import com.enterprise.kms.entity.Subscription;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.DocumentShareRepository;
import com.enterprise.kms.repository.SubscriptionRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.enterprise.kms.entity.NotificationEventType;
import com.enterprise.kms.service.NotificationService;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {
    private final DocumentService documentService;
    private final PermissionService permissionService;
    private final com.enterprise.kms.service.SystemSettingService systemSettingService;
    private final ShareLinkService shareLinkService;
    private final DocumentCommentRepository documentCommentRepository;
    private final DocumentLockRepository documentLockRepository;
    private final UserRepository userRepository;
    private final DocumentFavoriteRepository documentFavoriteRepository;
    private final DocumentShareRepository documentShareRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final DocumentRepository documentRepository;
    private final com.enterprise.kms.service.StorageService storageService;
    private final com.enterprise.kms.repository.StorageObjectRepository storageObjectRepository;
    private final com.enterprise.kms.service.SearchService searchService;
    private final NotificationService notificationService;

    @org.springframework.beans.factory.annotation.Autowired
    public DocumentController(DocumentService documentService, PermissionService permissionService,
                              com.enterprise.kms.service.SystemSettingService systemSettingService,
                              ShareLinkService shareLinkService,
                              DocumentCommentRepository documentCommentRepository,
                              DocumentLockRepository documentLockRepository,
                              UserRepository userRepository,
                              DocumentFavoriteRepository documentFavoriteRepository,
                              DocumentShareRepository documentShareRepository,
                              SubscriptionRepository subscriptionRepository,
                              DocumentRepository documentRepository,
                              com.enterprise.kms.service.StorageService storageService,
                              com.enterprise.kms.repository.StorageObjectRepository storageObjectRepository,
                              com.enterprise.kms.service.SearchService searchService,
                              NotificationService notificationService) {
        this.documentService = documentService;
        this.permissionService = permissionService;
        this.systemSettingService = systemSettingService;
        this.shareLinkService = shareLinkService;
        this.documentCommentRepository = documentCommentRepository;
        this.documentLockRepository = documentLockRepository;
        this.userRepository = userRepository;
        this.documentFavoriteRepository = documentFavoriteRepository;
        this.documentShareRepository = documentShareRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.storageObjectRepository = storageObjectRepository;
        this.searchService = searchService;
        this.notificationService = notificationService;
    }

    public DocumentController(DocumentService documentService, PermissionService permissionService,
                              com.enterprise.kms.service.SystemSettingService systemSettingService,
                              ShareLinkService shareLinkService,
                              DocumentCommentRepository documentCommentRepository,
                              DocumentLockRepository documentLockRepository,
                              UserRepository userRepository,
                              DocumentFavoriteRepository documentFavoriteRepository,
                              DocumentShareRepository documentShareRepository,
                              SubscriptionRepository subscriptionRepository,
                              DocumentRepository documentRepository,
                              com.enterprise.kms.service.StorageService storageService,
                              com.enterprise.kms.repository.StorageObjectRepository storageObjectRepository,
                              com.enterprise.kms.service.SearchService searchService) {
        this(documentService, permissionService, systemSettingService, shareLinkService,
             documentCommentRepository, documentLockRepository, userRepository,
             documentFavoriteRepository, documentShareRepository, subscriptionRepository,
             documentRepository, storageService, storageObjectRepository, searchService, null);
    }

    @GetMapping("/{id}/metadata")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> getDocumentMetadata(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        return ResponseEntity.ok(documentService.getDocumentMetadata(id));
    }

    @PutMapping("/{id}/metadata")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_METADATA_UPDATE", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> putDocumentMetadata(@PathVariable UUID id,
            @RequestBody java.util.Map<String, String> values) {
        permissionService.requireDocumentAccess(id, PermissionService.EDIT);
        return ResponseEntity.ok(documentService.putDocumentMetadata(id, values));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<Page<java.util.Map<String, Object>>> getAllDocuments(
            @RequestParam(name = "departmentId", required = false) String departmentId,
            @RequestParam(name = "deptId", required = false) String deptId,
            @RequestParam(name = "docTypeId", required = false) String docTypeId,
            @RequestParam(name = "documentTypeId", required = false) String documentTypeId,
            @RequestParam(name = "confidentiality", required = false) String confidentiality,
            @RequestParam(name = "classification", required = false) String classification,
            Pageable pageable) {
        String rawDept = (departmentId != null && !departmentId.isBlank()) ? departmentId : deptId;
        String rawDocType = (docTypeId != null && !docTypeId.isBlank()) ? docTypeId : documentTypeId;
        String rawConf = (confidentiality != null && !confidentiality.isBlank()) ? confidentiality : classification;

        String effectiveDeptId = (rawDept != null && !rawDept.isBlank() && !"ALL".equalsIgnoreCase(rawDept.trim())) ? rawDept.trim() : null;
        String effectiveDocTypeId = (rawDocType != null && !rawDocType.isBlank() && !"ALL".equalsIgnoreCase(rawDocType.trim())) ? rawDocType.trim() : null;
        String effectiveConf = (rawConf != null && !rawConf.isBlank() && !"ALL".equalsIgnoreCase(rawConf.trim())) ? rawConf.trim() : null;

        boolean hasFilter = effectiveDeptId != null || effectiveDocTypeId != null || effectiveConf != null;
        if (hasFilter) {
            return ResponseEntity.ok(searchService.searchDocuments(
                    null,
                    effectiveDocTypeId,
                    effectiveDeptId,
                    effectiveConf,
                    null, null, null, pageable
            ).map(documentService::toResponse));
        }
        return ResponseEntity.ok(documentService.getAllActiveDocumentResponses(pageable));
    }

    /** My Documents — authored by the caller. */
    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<Page<java.util.Map<String, Object>>> getMyDocuments(Pageable pageable) {
        return ResponseEntity.ok(documentService.getMyDocuments(pageable));
    }

    /** Recently opened by the caller (FR-30 recency signal, from the audit trail). */
    @GetMapping("/recent")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getRecentDocuments(
            @RequestParam(name = "limit", defaultValue = "20") int limit) {
        return ResponseEntity.ok(documentService.getRecentDocuments(limit));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_VIEW", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> getDocumentById(@PathVariable UUID id) {
        Document doc = permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        return ResponseEntity.ok(documentService.toResponse(doc));
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_UPLOAD", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> uploadDocument(@RequestParam("file") MultipartFile file,
                                                  @RequestParam(value = "title", required = false) String title,
                                                  @RequestParam(value = "departmentCode", defaultValue = "ITSEC") String departmentCode,
                                                  @RequestParam(value = "documentTypeName", defaultValue = "Policy") String documentTypeName,
                                                  @RequestParam(value = "confidentialityLevel", defaultValue = "INTERNAL") String confidentialityLevel) {
        String username = SecurityUtils.getCurrentUsername();
        Document doc = documentService.createDocument(file, title, departmentCode, documentTypeName, confidentialityLevel, username);
        if (notificationService != null) {
            notificationService.sendNotification(username, "Document Uploaded",
                    "Document '" + doc.getTitle() + "' was uploaded successfully.",
                    NotificationEventType.DOCUMENT_UPLOADED, "DOCUMENT", doc.getId(), "/preview/" + doc.getId());
        }
        return ResponseEntity.ok(documentService.toResponse(doc));
    }

    @PostMapping(value = "/bulk-upload", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_BULK_UPLOAD", resourceType = "DOCUMENT")
    public ResponseEntity<com.enterprise.kms.dto.BulkUploadResult> bulkUpload(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "titles", required = false) List<String> titles,
            @RequestParam(value = "departmentCode", defaultValue = "ITSEC") String departmentCode,
            @RequestParam(value = "documentTypeName", defaultValue = "Policy") String documentTypeName,
            @RequestParam(value = "confidentialityLevel", defaultValue = "INTERNAL") String confidentialityLevel,
            @RequestParam(value = "tags", required = false) List<String> tags,
            @RequestParam Map<String, String> allParams) {
        String username = SecurityUtils.getCurrentUsername();

        Map<String, String> customMetadata = new java.util.LinkedHashMap<>();
        allParams.forEach((k, v) -> {
            if (k.startsWith("metadata.") && k.length() > 9) {
                customMetadata.put(k.substring(9), v);
            }
        });

        com.enterprise.kms.dto.BulkUploadResult result = documentService.bulkUploadDocuments(
                files, titles, departmentCode, documentTypeName, confidentialityLevel, customMetadata, tags, notificationService, username
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/articles")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "ARTICLE_CREATE", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> createArticle(@RequestBody java.util.Map<String, Object> body) {
        String username = SecurityUtils.getCurrentUsername();
        Document doc = documentService.createArticle(body, username);
        if (notificationService != null) {
            notificationService.sendNotification(username, "Knowledge Article Created",
                    "Article '" + doc.getTitle() + "' was created successfully.",
                    NotificationEventType.DOCUMENT_UPLOADED, "DOCUMENT", doc.getId(), "/preview/" + doc.getId());
        }
        return ResponseEntity.ok(documentService.toResponse(doc));
    }

    @PostMapping("/media-upload")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, String>> uploadArticleMedia(@RequestParam("file") MultipartFile file) {
        java.util.Map<String, String> res = storageService.storePublicMedia(file);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/media/{idOrPath:.+}")
    @org.springframework.web.bind.annotation.CrossOrigin(origins = "*")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> streamMedia(@PathVariable("idOrPath") String idOrPath) {
        try {
            String targetPath = idOrPath;
            try {
                UUID id = UUID.fromString(idOrPath);
                com.enterprise.kms.entity.StorageObject obj = storageObjectRepository.findById(id).orElse(null);
                if (obj != null) {
                    targetPath = obj.getStoragePath();
                }
            } catch (Exception ignored) {}

            if (!storageService.exists(targetPath)) {
                java.nio.file.Path dir = storageService.getStorageLocation();
                if (java.nio.file.Files.exists(dir)) {
                    try (java.util.stream.Stream<java.nio.file.Path> stream = java.nio.file.Files.list(dir)) {
                        java.util.Optional<java.nio.file.Path> match = stream
                                .filter(p -> p.getFileName().toString().contains(idOrPath) || idOrPath.contains(p.getFileName().toString()))
                                .findFirst();
                        if (match.isPresent()) {
                            targetPath = match.get().getFileName().toString();
                        }
                    }
                }
            }

            java.io.InputStream is = storageService.retrieve(targetPath);

            String contentType = "application/octet-stream";
            String lower = targetPath.toLowerCase();
            if (lower.endsWith(".png")) contentType = "image/png";
            else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (lower.endsWith(".webp")) contentType = "image/webp";
            else if (lower.endsWith(".gif")) contentType = "image/gif";
            else if (lower.endsWith(".mp4")) contentType = "video/mp4";
            else if (lower.endsWith(".webm")) contentType = "video/webm";

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, contentType)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline")
                    .body(new org.springframework.core.io.InputStreamResource(is));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_DELETE", resourceType = "DOCUMENT")
    public ResponseEntity<Void> deleteDocument(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.DELETE);
        Document doc = documentService.getDocumentById(id);
        String username = SecurityUtils.getCurrentUsername();
        documentService.softDeleteDocument(id);
        if (notificationService != null && doc != null && doc.getAuthor() != null && !doc.getAuthor().getUsername().equals(username)) {
            notificationService.sendNotificationToUser(doc.getAuthor(), "Document Moved to Recycle Bin",
                    "Your document '" + doc.getTitle() + "' was moved to the recycle bin by " + username + ".",
                    NotificationEventType.DOCUMENT_DELETED, "DOCUMENT", doc.getId(), "/recycle-bin");
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_RESTORE", resourceType = "DOCUMENT")
    public ResponseEntity<Void> restoreDocument(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.DELETE);
        documentService.restoreDocument(id);
        return ResponseEntity.ok().build();
    }

    /**
     * FR-01 retrieval / FR-09 in-browser preview.
     * disposition=inline streams for the viewer, attachment forces a download.
     */
    /** FR-08: recycle bin - soft-deleted documents still inside the recovery window. */
    @GetMapping("/recycle-bin")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getRecycleBin(Pageable pageable) {
        int retentionDays = Integer.parseInt(systemSettingService.getSettingValue("recycle-bin.retention-days", "30"));
        java.util.List<java.util.Map<String, Object>> rows = new java.util.ArrayList<>();
        for (java.util.Map<String, Object> row : documentService.getRecycleBinResponses(pageable)) {
            long daysLeft = 0;
            Object deletedAtRaw = row.get("deletedAt");
            if (deletedAtRaw != null) {
                try {
                    java.time.OffsetDateTime deletedAt = java.time.OffsetDateTime.parse(deletedAtRaw.toString());
                    daysLeft = Math.max(0, retentionDays
                            - java.time.Duration.between(deletedAt, java.time.OffsetDateTime.now()).toDays());
                } catch (Exception ignored) { }
            }
            row.put("daysRemaining", daysLeft);
            row.put("retentionDays", retentionDays);
            rows.add(row);
        }
        return ResponseEntity.ok(rows);
    }
    @GetMapping("/{id}/download")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_DOWNLOAD", resourceType = "DOCUMENT")
    public ResponseEntity<org.springframework.core.io.Resource> downloadDocument(
            @PathVariable UUID id,
            @RequestParam(name = "disposition", defaultValue = "attachment") String disposition) {

        java.util.Map<String, Object> payload = documentService.prepareDownload(id);
        java.nio.file.Path path = (java.nio.file.Path) payload.get("path");
        String fileName = String.valueOf(payload.get("fileName"));
        String mimeType = String.valueOf(payload.get("mimeType"));

        org.springframework.core.io.Resource resource = new org.springframework.core.io.FileSystemResource(path);
        String dispositionType = "inline".equalsIgnoreCase(disposition) ? "inline" : "attachment";
        String encodedName = java.net.URLEncoder.encode(fileName, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .header("Content-Disposition", dispositionType + "; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedName)
                .header("Content-Type", mimeType)
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getDocumentVersions(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        return ResponseEntity.ok(documentService.getVersionHistory(id));
    }

    @PostMapping("/{id}/versions/{versionId}/rollback")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_VERSION_ROLLBACK", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> rollbackToVersion(
            @PathVariable UUID id, @PathVariable UUID versionId) {
        String username = SecurityUtils.getCurrentUsername();
        Document doc = documentService.rollbackToVersion(id, versionId, username);
        return ResponseEntity.ok(documentService.toResponse(doc));
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getDocumentComments(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        java.util.List<java.util.Map<String, Object>> comments = new java.util.ArrayList<>();
        for (com.enterprise.kms.entity.DocumentComment c : documentCommentRepository.findByDocumentIdOrderByCreatedAtAsc(id)) {
            java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("id", c.getId());
            row.put("content", c.getContent());
            row.put("author", c.getUser() != null ? c.getUser().getUsername() : null);
            row.put("parentCommentId", c.getParentComment() != null ? c.getParentComment().getId() : null);
            row.put("createdAt", c.getCreatedAt());
            comments.add(row);
        }
        return ResponseEntity.ok(comments);
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_COMMENT_ADD", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> addDocumentComment(
            @PathVariable UUID id,
            @RequestBody java.util.Map<String, String> payload) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        Document doc = documentService.getDocumentById(id);
        String username = SecurityUtils.getCurrentUsername();

        com.enterprise.kms.entity.User author = userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        com.enterprise.kms.entity.DocumentComment comment = new com.enterprise.kms.entity.DocumentComment();
        comment.setDocument(doc);
        comment.setContent(payload.getOrDefault("content", ""));
        comment.setUser(author);

        String parentId = payload.get("parentCommentId");
        com.enterprise.kms.entity.DocumentComment parent = null;
        if (parentId != null && !parentId.isBlank()) {
            UUID parentUuid = UUID.fromString(parentId);
            parent = documentCommentRepository.findById(parentUuid).orElse(null);
            comment.setParentComment(parent);
        }
        comment = documentCommentRepository.save(comment);

        // Notifications
        if (notificationService != null) {
            String docUrl = "/preview/" + doc.getId();
            // Notify doc author if not commenter
            if (doc.getAuthor() != null && !doc.getAuthor().getId().equals(author.getId())) {
                notificationService.sendNotificationToUser(doc.getAuthor(), "New Comment on Document",
                        username + " commented on '" + doc.getTitle() + "'.",
                        NotificationEventType.DOCUMENT_COMMENT_ADDED, "DOCUMENT", doc.getId(), docUrl);
            }
            // Notify parent comment author if reply and not commenter
            if (parent != null && parent.getUser() != null && !parent.getUser().getId().equals(author.getId())) {
                notificationService.sendNotificationToUser(parent.getUser(), "Reply to Your Comment",
                        username + " replied to your comment on '" + doc.getTitle() + "'.",
                        NotificationEventType.DOCUMENT_COMMENT_ADDED, "DOCUMENT", doc.getId(), docUrl);
            }
            // Notify document subscribers
            notificationService.notifySubscribers("DOCUMENT", doc.getId(),
                    NotificationEventType.DOCUMENT_COMMENT_ADDED,
                    "New Comment: " + doc.getTitle(),
                    username + " commented on '" + doc.getTitle() + "'.",
                    docUrl);
        }

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", comment.getId());
        result.put("content", comment.getContent());
        result.put("author", username);
        result.put("parentCommentId", comment.getParentComment() != null ? comment.getParentComment().getId() : null);
        result.put("createdAt", comment.getCreatedAt());
        return ResponseEntity.ok(result);
    }

    /** FR-05: checkout lock status for a document. */
    @GetMapping("/{id}/lock-status")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> getLockStatus(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        return ResponseEntity.ok(documentService.getLockStatus(id));
    }

    /** FR-05: checkout — lock a document for exclusive editing. */
    @PostMapping("/{id}/checkout")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_CHECKOUT", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> checkoutDocument(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.EDIT);
        String username = SecurityUtils.getCurrentUsername();
        java.util.Map<String, Object> res = documentService.checkoutDocument(id, username);
        if (notificationService != null) {
            Document doc = documentService.getDocumentById(id);
            if (doc != null && doc.getAuthor() != null && !doc.getAuthor().getUsername().equals(username)) {
                notificationService.sendNotificationToUser(doc.getAuthor(), "Document Checked Out",
                        "Document '" + doc.getTitle() + "' was checked out for editing by " + username + ".",
                        NotificationEventType.DOCUMENT_CHECKED_OUT, "DOCUMENT", doc.getId(), "/preview/" + doc.getId());
            }
        }
        return ResponseEntity.ok(res);
    }

    /** FR-05: checkin — unlock a document and create a new version. */
    @PostMapping("/{id}/checkin")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_CHECKIN", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> checkinDocument(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "changeSummary", required = false) String changeSummary) {
        permissionService.requireDocumentAccess(id, PermissionService.EDIT);
        String username = SecurityUtils.getCurrentUsername();
        Document doc = documentService.checkinDocument(id, file, changeSummary, username);
        if (notificationService != null) {
            notificationService.notifySubscribers("DOCUMENT", doc.getId(),
                    NotificationEventType.DOCUMENT_VERSION_CREATED,
                    "New Document Version: " + doc.getTitle(),
                    "A new version of '" + doc.getTitle() + "' was checked in by " + username + ".",
                    "/preview/" + doc.getId());
        }
        return ResponseEntity.ok(documentService.toResponse(doc));
    }

    /** FR-05: unlock — release a checkout lock without uploading a new version. */
    @PostMapping("/{id}/unlock")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_UNLOCK", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> unlockDocument(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.EDIT);
        String username = SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(documentService.unlockDocument(id, username));
    }

    /** FR-09: dedicated preview endpoint — streams inline with format-appropriate headers. */
    @GetMapping("/{id}/preview")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_PREVIEW", resourceType = "DOCUMENT")
    public ResponseEntity<org.springframework.core.io.Resource> previewDocument(@PathVariable UUID id) {
        java.util.Map<String, Object> payload = documentService.prepareDownload(id);
        java.nio.file.Path path = (java.nio.file.Path) payload.get("path");
        String fileName = String.valueOf(payload.get("fileName"));
        String mimeType = String.valueOf(payload.get("mimeType"));

        org.springframework.core.io.Resource resource = new org.springframework.core.io.FileSystemResource(path);
        String encodedName = java.net.URLEncoder.encode(fileName, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .header("Content-Disposition", "inline; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedName)
                .header("Content-Type", mimeType)
                .header("X-Frame-Options", "SAMEORIGIN")
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    /** In-page document text extraction for DOCX, TXT, MD, CSV files. */
    @GetMapping("/{id}/text")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getDocumentTextContent(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        Map<String, Object> payload = documentService.prepareDownload(id);
        java.nio.file.Path path = (java.nio.file.Path) payload.get("path");
        String fileName = String.valueOf(payload.get("fileName"));

        List<String> paragraphs = new java.util.ArrayList<>();
        try {
            if (fileName.toLowerCase().endsWith(".docx")) {
                try (java.util.zip.ZipFile zipFile = new java.util.zip.ZipFile(path.toFile())) {
                    var entry = zipFile.getEntry("word/document.xml");
                    if (entry != null) {
                        try (java.io.InputStream is = zipFile.getInputStream(entry)) {
                            javax.xml.parsers.DocumentBuilderFactory dbf = javax.xml.parsers.DocumentBuilderFactory.newInstance();
                            dbf.setNamespaceAware(true);
                            org.w3c.dom.Document xmlDoc = dbf.newDocumentBuilder().parse(is);
                            org.w3c.dom.NodeList nodeList = xmlDoc.getElementsByTagNameNS("*", "p");
                            for (int i = 0; i < nodeList.getLength(); i++) {
                                String text = nodeList.item(i).getTextContent();
                                if (text != null && !text.isBlank()) {
                                    paragraphs.add(text.trim());
                                }
                            }
                        }
                    }
                }
            } else if (fileName.toLowerCase().endsWith(".txt") || fileName.toLowerCase().endsWith(".md") || fileName.toLowerCase().endsWith(".csv") || fileName.toLowerCase().endsWith(".json")) {
                paragraphs = java.nio.file.Files.readAllLines(path);
            }
        } catch (Exception e) {
            // fallback gracefully
        }

        return ResponseEntity.ok(Map.of(
                "fileName", fileName,
                "paragraphs", paragraphs
        ));
    }

    /** FR-20: create a secure share link with configurable expiry and optional password. */
    @PostMapping("/{id}/share-link")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_SHARE_LINK_CREATE", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> createShareLink(
            @PathVariable UUID id,
            @RequestBody java.util.Map<String, Object> body) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        Document doc = documentService.getDocumentById(id);
        String username = SecurityUtils.getCurrentUsername();
        int expiryHours = body.containsKey("expiryHours")
                ? Integer.parseInt(body.get("expiryHours").toString()) : 72;
        String password = body.get("password") != null ? body.get("password").toString() : null;
        java.util.Map<String, Object> res = shareLinkService.createShareLink(id, username, expiryHours, password);
        if (notificationService != null && doc != null) {
            notificationService.notifySubscribers("DOCUMENT", id,
                    NotificationEventType.DOCUMENT_SHARED,
                    "Document Shared: " + doc.getTitle(),
                    "A share link was created for '" + doc.getTitle() + "' by " + username + ".",
                    "/preview/" + id);
        }
        return ResponseEntity.ok(res);
    }

    // ===== Favorites (user bookmarking) =====

    @GetMapping("/{id}/favorite/status")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> getFavoriteStatus(@PathVariable UUID id) {
        String username = SecurityUtils.getCurrentUsername();
        com.enterprise.kms.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED, "User not found"));
        boolean isFavorited = documentFavoriteRepository.existsByUserIdAndDocumentId(user.getId(), id);
        return ResponseEntity.ok(java.util.Map.of("favorited", isFavorited));
    }

    @PostMapping("/{id}/favorite/toggle")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> toggleFavorite(@PathVariable UUID id) {
        String username = SecurityUtils.getCurrentUsername();
        com.enterprise.kms.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED, "User not found"));
        Document doc = documentService.getDocumentById(id);
        var existing = documentFavoriteRepository.findByUserIdAndDocumentId(user.getId(), id);
        if (existing.isPresent()) {
            documentFavoriteRepository.delete(existing.get());
            return ResponseEntity.ok(java.util.Map.of("favorited", false));
        } else {
            com.enterprise.kms.entity.DocumentFavorite fav = new com.enterprise.kms.entity.DocumentFavorite();
            fav.setUser(user);
            fav.setDocument(doc);
            documentFavoriteRepository.save(fav);
            return ResponseEntity.ok(java.util.Map.of("favorited", true));
        }
    }

    @GetMapping("/favorites")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getMyFavorites() {
        String username = SecurityUtils.getCurrentUsername();
        com.enterprise.kms.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED, "User not found"));
        java.util.List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        for (com.enterprise.kms.entity.DocumentFavorite fav : documentFavoriteRepository.findByUserIdOrderByCreatedAtDesc(user.getId())) {
            com.enterprise.kms.entity.Document d = fav.getDocument();
            if (d == null || Boolean.TRUE.equals(d.getIsDeleted()) || !"PUBLISHED".equals(d.getStatus())) {
                continue;
            }
            result.add(documentService.toResponse(d));
        }
        return ResponseEntity.ok(result);
    }

    // ===== Shared With Me =====

    @GetMapping("/shared-with-me")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getSharedWithMe() {
        String username = SecurityUtils.getCurrentUsername();
        String email = SecurityUtils.getCurrentUserEmail();
        User user = userRepository.findByUsername(username)
                .or(() -> email != null ? userRepository.findByEmail(email) : java.util.Optional.empty())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        Map<UUID, Map<String, Object>> resultMap = new java.util.LinkedHashMap<>();

        // 1. Direct DocumentShare records
        List<DocumentShare> shares = documentShareRepository.findByGrantedToUserId(user.getId());
        for (DocumentShare share : shares) {
            Document d = share.getDocument();
            if (d == null || Boolean.TRUE.equals(d.getIsDeleted())) {
                continue;
            }
            Map<String, Object> row = documentService.toResponse(d);
            row.put("shareId", share.getId());
            row.put("permissionLevel", share.getPermissionLevel());
            row.put("sharedAt", share.getCreatedAt());
            row.put("sharedBy", d.getAuthor() != null ? d.getAuthor().getUsername() : "System");
            resultMap.put(d.getId(), row);
        }

        return ResponseEntity.ok(new java.util.ArrayList<>(resultMap.values()));
    }

    // ===== FR-26: Subscriptions =====

    @PostMapping("/{id}/subscribe")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> subscribe(
            @PathVariable("id") UUID documentId,
            @RequestBody(required = false) java.util.Map<String, Boolean> body) {
        String username = SecurityUtils.getCurrentUsername();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));

        Subscription sub = subscriptionRepository
                .findByUserIdAndTargetTypeAndTargetId(user.getId(), "DOCUMENT", documentId)
                .orElseGet(() -> {
                    Subscription s = new Subscription();
                    s.setUser(user);
                    s.setTargetType("DOCUMENT");
                    s.setTargetId(documentId);
                    return s;
                });

        if (body != null) {
            if (body.containsKey("notifyVersions")) sub.setNotifyVersions(body.get("notifyVersions"));
            if (body.containsKey("notifyComments")) sub.setNotifyComments(body.get("notifyComments"));
            if (body.containsKey("notifyShares")) sub.setNotifyShares(body.get("notifyShares"));
        }

        Subscription saved = subscriptionRepository.save(sub);
        return ResponseEntity.ok(java.util.Map.of(
                "subscribed", true,
                "subscriptionId", saved.getId().toString(),
                "notifyVersions", saved.getNotifyVersions(),
                "notifyComments", saved.getNotifyComments(),
                "notifyShares", saved.getNotifyShares()
        ));
    }

    @DeleteMapping("/{id}/subscribe")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> unsubscribe(@PathVariable("id") UUID documentId) {
        String username = SecurityUtils.getCurrentUsername();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));

        subscriptionRepository.deleteByUserIdAndTargetTypeAndTargetId(user.getId(), "DOCUMENT", documentId);
        return ResponseEntity.ok(java.util.Map.of("subscribed", false));
    }

    @GetMapping("/{id}/subscribe/status")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> subscriptionStatus(@PathVariable("id") UUID documentId) {
        String username = SecurityUtils.getCurrentUsername();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));

        var opt = subscriptionRepository.findByUserIdAndTargetTypeAndTargetId(user.getId(), "DOCUMENT", documentId);
        if (opt.isPresent()) {
            var sub = opt.get();
            return ResponseEntity.ok(Map.of(
                    "subscribed", true,
                    "subscriptionId", sub.getId().toString(),
                    "notifyVersions", sub.getNotifyVersions(),
                    "notifyComments", sub.getNotifyComments(),
                    "notifyShares", sub.getNotifyShares()));
        }
        return ResponseEntity.ok(Map.of("subscribed", false));
    }

    // ===== FR-24: Native App Integration =====

    @GetMapping("/{id}/desktop-open")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> desktopOpen(@PathVariable("id") UUID documentId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        permissionService.requireDocumentAccess(documentId, PermissionService.VIEW);

        String fileName = doc.getCurrentVersion() != null && doc.getCurrentVersion().getFileName() != null
                ? doc.getCurrentVersion().getFileName()
                : doc.getTitle();
        if (fileName == null) fileName = "document";

        String extension = "";
        int dotIdx = fileName.lastIndexOf('.');
        if (dotIdx >= 0) extension = fileName.substring(dotIdx + 1).toLowerCase();

        String downloadUrl = "http://localhost:8081/api/v1/documents/" + documentId + "/download";

        String protocolUri = null;
        String openMethod = "browser";

        switch (extension) {
            case "doc", "docx" -> {
                protocolUri = "ms-word:ofe|u|" + downloadUrl;
                openMethod = "microsoft-word";
            }
            case "xls", "xlsx" -> {
                protocolUri = "ms-excel:ofe|u|" + downloadUrl;
                openMethod = "microsoft-excel";
            }
            case "ppt", "pptx" -> {
                protocolUri = "ms-powerpoint:ofe|u|" + downloadUrl;
                openMethod = "microsoft-powerpoint";
            }
            case "pdf" -> {
                openMethod = "pdf-viewer";
            }
            default -> {
                openMethod = "desktop-app";
            }
        }

        return ResponseEntity.ok(Map.of(
                "documentId", documentId.toString(),
                "fileName", fileName,
                "extension", extension,
                "protocolUri", protocolUri != null ? protocolUri : "",
                "downloadUrl", downloadUrl,
                "openMethod", openMethod
        ));
    }
}
