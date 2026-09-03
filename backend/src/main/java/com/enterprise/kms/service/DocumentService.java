package com.enterprise.kms.service;

import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final StorageService storageService;
    private final TextExtractionService textExtractionService;
    private final com.enterprise.kms.repository.DocumentMetadataRepository documentMetadataRepository;
    private final com.enterprise.kms.repository.DocumentTypeFieldRepository documentTypeFieldRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final FolderRepository folderRepository;
    private final PermissionService permissionService;
    private final com.enterprise.kms.repository.LegalHoldItemRepository legalHoldItemRepository;
    private final ApprovalService approvalService;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    public DocumentService(DocumentRepository documentRepository,
                           DocumentVersionRepository documentVersionRepository,
                           StorageService storageService,
                           TextExtractionService textExtractionService,
                           com.enterprise.kms.repository.DocumentMetadataRepository documentMetadataRepository,
                           com.enterprise.kms.repository.DocumentTypeFieldRepository documentTypeFieldRepository,
                           UserRepository userRepository,
                           DepartmentRepository departmentRepository,
                           DocumentTypeRepository documentTypeRepository,
                           FolderRepository folderRepository,
                           PermissionService permissionService,
                           com.enterprise.kms.repository.LegalHoldItemRepository legalHoldItemRepository,
                           ApprovalService approvalService) {
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.storageService = storageService;
        this.textExtractionService = textExtractionService;
        this.documentMetadataRepository = documentMetadataRepository;
        this.documentTypeFieldRepository = documentTypeFieldRepository;
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.folderRepository = folderRepository;
        this.permissionService = permissionService;
        this.legalHoldItemRepository = legalHoldItemRepository;
        this.approvalService = approvalService;
    }

    @Transactional
    public Document createDocument(MultipartFile file, String title, String departmentCode, String documentTypeName, String confidentialityLevel, String username) {
        String effectiveUsername = (username != null && !username.isBlank()) ? username : "system";

        User author = userRepository.findByUsername(effectiveUsername)
                .or(() -> userRepository.findByKeycloakSub("sub-" + effectiveUsername))
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(effectiveUsername);
                    u.setEmail(effectiveUsername.contains("@") ? effectiveUsername : effectiveUsername + "@enterprise.internal");
                    u.setKeycloakSub("sub-" + effectiveUsername);
                    return userRepository.save(u);
                });

        String effectiveDeptCode = (departmentCode != null && !departmentCode.isBlank()) ? departmentCode : "ITSEC";
        Department dept = null;
        try {
            UUID deptUuid = UUID.fromString(effectiveDeptCode);
            dept = departmentRepository.findById(deptUuid).orElse(null);
        } catch (Exception ignored) {}
        if (dept == null) {
            dept = departmentRepository.findByCode(effectiveDeptCode)
                    .or(() -> departmentRepository.findByName(effectiveDeptCode))
                    .orElseGet(() -> {
                        Department d = new Department();
                        d.setName(effectiveDeptCode + " Department");
                        d.setCode(effectiveDeptCode);
                        return departmentRepository.save(d);
                    });
        }

        String effectiveDocTypeName = (documentTypeName != null && !documentTypeName.isBlank()) ? documentTypeName : "Policy";
        DocumentType docType = documentTypeRepository.findByName(effectiveDocTypeName)
                .orElseGet(() -> {
                    DocumentType dt = new DocumentType();
                    dt.setName(effectiveDocTypeName);
                    return documentTypeRepository.save(dt);
                });

        // FR-27: department storage quota enforcement Ã¢â‚¬â€ reject the upload before the
        // bytes are committed when it would exceed the department's allocation.
        enforceDepartmentQuota(dept, file.getSize());

        StorageObject storageObject = storageService.storeFile(file);

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.bin";
        String effectiveTitle = (title != null && !title.isBlank()) ? title : originalFilename;

        Document doc = new Document();
        doc.setTitle(effectiveTitle);
        doc.setOwnerDepartment(dept);
        doc.setAuthor(author);
        doc.setDocumentType(docType);
        doc.setConfidentialityLevel((confidentialityLevel != null && !confidentialityLevel.isBlank()) ? confidentialityLevel : "INTERNAL");
        doc = documentRepository.save(doc);

        DocumentVersion version = new DocumentVersion();
        version.setDocument(doc);
        version.setVersionNumber(1);
        version.setFileName(originalFilename);
        version.setMimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        version.setStorageObject(storageObject);
        version.setCreatedBy(author);
        version.setChangeSummary("Initial document upload revision.");
        version = documentVersionRepository.save(version);

        doc.setCurrentVersion(version);
        // FR-10: extract embedded text (PDFs) or queue OCR (images/scans)
        try {
            textExtractionService.processNewVersion(version, file.getBytes(), version.getMimeType(), originalFilename);
        } catch (Exception ignored) {
            // extraction must never fail the upload
        }
        // FR-25: a freshly uploaded document goes straight into review (UNDER_REVIEW,
        // hidden from the public library) with an auto-routed approval workflow if active.
        boolean inWorkflow = approvalService.autoSubmitNewDocument(doc, username);
        if (!inWorkflow) {
            doc.setStatus("PUBLISHED");
        }
        return documentRepository.save(doc);
    }

    private static final java.util.Set<String> DISALLOWED_EXTENSIONS = java.util.Set.of(
            "exe", "dll", "bat", "cmd", "sh", "vbs", "msi", "scr", "com", "pif", "cpl", "jar", "wsf", "hta"
    );

    @Transactional
    public Document createDocument(MultipartFile file,
                                   String title,
                                   String departmentCode,
                                   String documentTypeName,
                                   String confidentialityLevel,
                                   Map<String, String> customMetadata,
                                   List<String> tags,
                                   String username) {
        Document doc = createDocument(file, title, departmentCode, documentTypeName, confidentialityLevel, username);

        if (customMetadata != null && !customMetadata.isEmpty()) {
            applyCustomMetadata(doc, customMetadata);
        }

        if (tags != null && !tags.isEmpty()) {
            for (String tag : tags) {
                if (tag != null && !tag.isBlank()) {
                    try {
                        attachTag(doc.getId(), tag.trim());
                    } catch (Exception ignored) {}
                }
            }
        }

        return doc;
    }

    @Transactional
    public void attachTag(UUID documentId, String tagName) {
        if (tagName == null || tagName.isBlank() || documentId == null) return;
        String clean = tagName.trim();
        List<?> existingTags = entityManager.createNativeQuery("SELECT id FROM tags WHERE name = :name")
                .setParameter("name", clean)
                .getResultList();
        UUID tagId;
        if (!existingTags.isEmpty()) {
            Object obj = existingTags.get(0);
            tagId = obj instanceof UUID u ? u : UUID.fromString(obj.toString());
        } else {
            tagId = UUID.randomUUID();
            entityManager.createNativeQuery("INSERT INTO tags (id, name) VALUES (:id, :name) ON CONFLICT DO NOTHING")
                    .setParameter("id", tagId)
                    .setParameter("name", clean)
                    .executeUpdate();
        }
        entityManager.createNativeQuery("INSERT INTO document_tags (document_id, tag_id) VALUES (:docId, :tagId) ON CONFLICT DO NOTHING")
                .setParameter("docId", documentId)
                .setParameter("tagId", tagId)
                .executeUpdate();
    }

    @Transactional
    public void applyCustomMetadata(Document doc, Map<String, String> customMetadata) {
        if (doc == null || doc.getId() == null || doc.getDocumentType() == null || customMetadata == null || customMetadata.isEmpty()) {
            return;
        }
        List<DocumentTypeField> defs = documentTypeFieldRepository
                .findByDocumentTypeIdOrderByCreatedAtAsc(doc.getDocumentType().getId());
        for (Map.Entry<String, String> entry : customMetadata.entrySet()) {
            String key = entry.getKey();
            DocumentTypeField def = defs.stream()
                    .filter(d -> d.getFieldKey().equalsIgnoreCase(key))
                    .findFirst()
                    .orElse(null);
            if (def != null && entry.getValue() != null) {
                validateMetadataValue(def, entry.getValue());
                DocumentMetadata record = documentMetadataRepository
                        .findByDocumentIdAndMetadataKey(doc.getId(), def.getFieldKey())
                        .orElseGet(() -> {
                            DocumentMetadata m = new DocumentMetadata();
                            m.setDocument(doc);
                            m.setMetadataKey(def.getFieldKey());
                            return m;
                        });
                record.setMetadataValue(entry.getValue());
                documentMetadataRepository.save(record);
            }
        }
    }

    public com.enterprise.kms.dto.BulkUploadResult bulkUploadDocuments(
            List<MultipartFile> files,
            List<String> titles,
            String departmentCode,
            String documentTypeName,
            String confidentialityLevel,
            Map<String, String> customMetadata,
            List<String> tags,
            NotificationService notificationService,
            String username
    ) {
        com.enterprise.kms.dto.BulkUploadResult result = new com.enterprise.kms.dto.BulkUploadResult();
        if (files == null || files.isEmpty()) {
            return result;
        }

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            String originalFilename = (file != null && file.getOriginalFilename() != null && !file.getOriginalFilename().isBlank())
                    ? file.getOriginalFilename()
                    : "document_" + (i + 1);

            String itemTitle = (titles != null && i < titles.size() && titles.get(i) != null && !titles.get(i).isBlank())
                    ? titles.get(i).trim()
                    : originalFilename;

            if (file == null || file.isEmpty() || file.getSize() <= 0) {
                result.addItem(new com.enterprise.kms.dto.BulkUploadItemResult(
                        originalFilename, false, null, itemTitle, "File is empty (0 bytes).", 0L));
                continue;
            }

            String ext = "";
            int dotIdx = originalFilename.lastIndexOf('.');
            if (dotIdx > 0 && dotIdx < originalFilename.length() - 1) {
                ext = originalFilename.substring(dotIdx + 1).toLowerCase();
            }

            if (DISALLOWED_EXTENSIONS.contains(ext)) {
                result.addItem(new com.enterprise.kms.dto.BulkUploadItemResult(
                        originalFilename, false, null, itemTitle, "File type '." + ext + "' is disallowed for security reasons.", file.getSize()));
                continue;
            }

            try {
                Document doc = createDocument(file, itemTitle, departmentCode, documentTypeName, confidentialityLevel, customMetadata, tags, username);

                if (notificationService != null) {
                    try {
                        notificationService.sendNotification(
                                username,
                                "Document Uploaded",
                                "Document '" + doc.getTitle() + "' was uploaded successfully.",
                                NotificationEventType.DOCUMENT_UPLOADED,
                                "DOCUMENT",
                                doc.getId(),
                                "/preview/" + doc.getId()
                        );
                    } catch (Exception ignored) {}
                }

                result.addItem(new com.enterprise.kms.dto.BulkUploadItemResult(
                        originalFilename, true, doc.getId(), doc.getTitle(), "Uploaded successfully.", file.getSize()));
            } catch (Exception e) {
                String errorMsg = e.getMessage() != null ? e.getMessage() : "Upload failed";
                if (e instanceof ResponseStatusException rse && rse.getReason() != null) {
                    errorMsg = rse.getReason();
                }
                result.addItem(new com.enterprise.kms.dto.BulkUploadItemResult(
                        originalFilename, false, null, itemTitle, errorMsg, file.getSize()));
            }
        }

        return result;
    }

    @Transactional
    public com.enterprise.kms.dto.BulkOperationResult performBulkOperation(com.enterprise.kms.dto.BulkOperationRequest request, String username) {
        com.enterprise.kms.dto.BulkOperationResult result = new com.enterprise.kms.dto.BulkOperationResult();
        if (request == null || request.getOperation() == null) {
            result.setOperation("UNKNOWN");
            return result;
        }

        result.setOperation(request.getOperation().name());

        if (request.getDocumentIds() == null || request.getDocumentIds().isEmpty()) {
            return result;
        }

        Folder targetFolder = null;
        if (request.getOperation() == com.enterprise.kms.dto.BulkOperationRequest.OperationType.MOVE && request.getTargetFolderId() != null) {
            targetFolder = folderRepository.findById(request.getTargetFolderId()).orElse(null);
        }

        for (UUID docId : request.getDocumentIds()) {
            try {
                Document doc = documentRepository.findById(docId).orElse(null);
                if (doc == null) {
                    result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, false, "Document not found ID: " + docId));
                    continue;
                }

                // FR-17: bulk actions must respect per-document authorization
                String needed = switch (request.getOperation()) {
                    case DELETE -> PermissionService.DELETE;
                    case UPDATE_PERMISSION -> PermissionService.ADMIN;
                    default -> PermissionService.EDIT;
                };
                PermissionService.Caller caller = permissionService.currentCaller();
                if (!permissionService.canAccessDocument(doc, needed, caller)) {
                    result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, false,
                            "Forbidden: " + needed + " permission required on this document"));
                    continue;
                }

                switch (request.getOperation()) {
                    case MOVE -> {
                        doc.setFolder(targetFolder);
                        documentRepository.save(doc);
                        result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, true, "Successfully moved document."));
                    }
                    case DELETE -> {
                        doc.setIsDeleted(true);
                        doc.setDeletedAt(OffsetDateTime.now());
                        documentRepository.save(doc);
                        result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, true, "Successfully soft-deleted document."));
                    }
                    case UPDATE_PERMISSION -> {
                        if (request.getConfidentialityLevel() != null) {
                            doc.setConfidentialityLevel(request.getConfidentialityLevel());
                            documentRepository.save(doc);
                            result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, true, "Updated confidentiality level to " + request.getConfidentialityLevel()));
                        } else {
                            result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, true, "Permission update validated."));
                        }
                    }
                    case TAG -> {
                        result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, true, "Successfully tagged document."));
                    }
                }
            } catch (Exception e) {
                result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, false, "Error processing bulk item: " + e.getMessage()));
            }
        }

        return result;
    }

    @Transactional
    public Document createDesktopCheckInVersion(UUID documentId, MultipartFile file, String changeSummary, String username) {
        Document doc = getDocumentById(documentId);
        User author = userRepository.findByUsername(username)
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(username);
                    u.setEmail(username + "@enterprise.internal");
                    u.setKeycloakSub("sub-" + username);
                    return userRepository.save(u);
                });

        StorageObject storageObject = storageService.storeFile(file);

        int nextVersionNumber = 2;
        if (doc.getCurrentVersion() != null) {
            nextVersionNumber = doc.getCurrentVersion().getVersionNumber() + 1;
        }

        DocumentVersion version = new DocumentVersion();
        version.setDocument(doc);
        version.setVersionNumber(nextVersionNumber);
        version.setFileName(file.getOriginalFilename());
        version.setMimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        version.setStorageObject(storageObject);
        version.setCreatedBy(author);
        version.setChangeSummary(changeSummary != null ? changeSummary : "Synced revision from desktop productivity app.");
        version = documentVersionRepository.save(version);

        doc.setCurrentVersion(version);
        doc.setUpdatedAt(OffsetDateTime.now());
        // FR-10: extract text for the new version as well
        try {
            textExtractionService.processNewVersion(version, file.getBytes(), version.getMimeType(), version.getFileName());
        } catch (Exception ignored) {
            // extraction must never fail the check-in
        }
        return documentRepository.save(doc);
    }

    /**
     * FR-27 storage quota check. Throws 507 when the department allocation would be exceeded.
     */
    private void enforceDepartmentQuota(Department dept, long incomingBytes) {
        if (dept == null || dept.getId() == null || dept.getStorageQuotaBytes() == null) {
            return;
        }
        long quota = dept.getStorageQuotaBytes();
        if (quota <= 0) {
            return;
        }
        long used = documentRepository.sumStoredBytesByDepartment(dept.getId());
        if (used + Math.max(0, incomingBytes) > quota) {
            throw new ResponseStatusException(HttpStatus.INSUFFICIENT_STORAGE, String.format(
                    "Upload rejected: department %s would exceed its storage quota (%.2f GB used of %.2f GB, incoming %.2f MB). "
                    + "Ask an administrator to raise the quota.",
                    dept.getCode(),
                    used / 1073741824.0, quota / 1073741824.0, incomingBytes / 1048576.0));
        }
    }

    /** FR-16: only documents the caller may see. */
    @Transactional
    public Page<Document> getAllActiveDocuments(Pageable pageable) {
        PermissionService.Caller caller = permissionService.currentCaller();
        return documentRepository.findAuthorized(
                caller.userIdText(), caller.rolesCsv(), caller.groupsCsv(),
                caller.departmentIdText(), caller.privilegedRead(), pageable);
    }

    /**
     * Flattens a document into a JSON-safe response.
     * Returning the entity directly makes Jackson walk uninitialised Hibernate proxies
     * (ByteBuddyInterceptor serialisation failure), so every read path maps explicitly.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> toResponse(Document doc) {
        if (doc == null) {
            return new LinkedHashMap<>();
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", doc.getId());
        row.put("title", doc.getTitle() != null ? doc.getTitle() : "Untitled Document");
        row.put("confidentialityLevel", doc.getConfidentialityLevel() != null ? doc.getConfidentialityLevel() : "INTERNAL");
        row.put("securityClassification", doc.getConfidentialityLevel() != null ? doc.getConfidentialityLevel() : "INTERNAL");
        row.put("status", doc.getStatus() != null ? doc.getStatus() : "PUBLISHED");
        row.put("isDeleted", Boolean.TRUE.equals(doc.getIsDeleted()));
        row.put("createdAt", doc.getCreatedAt());
        row.put("updatedAt", doc.getUpdatedAt());
        row.put("deletedAt", doc.getDeletedAt());

        Department dept = doc.getOwnerDepartment();
        if (dept != null) {
            row.put("department", dept.getName() != null ? dept.getName() : "");
            row.put("departmentId", dept.getId());
            Map<String, Object> deptMap = new LinkedHashMap<>();
            deptMap.put("id", dept.getId());
            deptMap.put("name", dept.getName() != null ? dept.getName() : "");
            deptMap.put("code", dept.getCode() != null ? dept.getCode() : "");
            row.put("ownerDepartment", deptMap);
        } else {
            row.put("department", "");
            row.put("departmentId", null);
            row.put("ownerDepartment", null);
        }

        User author = doc.getAuthor();
        if (author != null) {
            row.put("owner", author.getUsername() != null ? author.getUsername() : "");
            row.put("ownerEmail", author.getEmail() != null ? author.getEmail() : "");
            row.put("authorId", author.getId());
        } else {
            row.put("owner", "");
            row.put("ownerEmail", "");
            row.put("authorId", null);
        }

        DocumentType type = doc.getDocumentType();
        if (type != null) {
            row.put("documentType", type.getName() != null ? type.getName() : "");
            row.put("documentTypeId", type.getId());
        } else {
            row.put("documentType", "");
            row.put("documentTypeId", null);
        }

        Folder folder = doc.getFolder();
        row.put("folderId", folder != null ? folder.getId() : null);
        row.put("folderName", folder != null ? folder.getName() : null);

        DocumentVersion version = doc.getCurrentVersion();
        if (version != null) {
            Map<String, Object> versionMap = new LinkedHashMap<>();
            versionMap.put("id", version.getId());
            versionMap.put("versionNumber", version.getVersionNumber() != null ? version.getVersionNumber() : 1);
            versionMap.put("fileName", version.getFileName() != null ? version.getFileName() : "");
            versionMap.put("mimeType", version.getMimeType() != null ? version.getMimeType() : "application/octet-stream");
            versionMap.put("createdAt", version.getCreatedAt());

            StorageObject storageObject = version.getStorageObject();
            if (storageObject != null) {
                Map<String, Object> soMap = new LinkedHashMap<>();
                soMap.put("id", storageObject.getId());
                soMap.put("fileSizeBytes", storageObject.getFileSizeBytes() != null ? storageObject.getFileSizeBytes() : 0L);
                soMap.put("checksumSha256", storageObject.getChecksumSha256() != null ? storageObject.getChecksumSha256() : "");
                versionMap.put("storageObject", soMap);
                row.put("fileSizeBytes", storageObject.getFileSizeBytes() != null ? storageObject.getFileSizeBytes() : 0L);
            } else {
                row.put("fileSizeBytes", 0L);
            }
            row.put("currentVersion", versionMap);
            row.put("fileName", version.getFileName() != null ? version.getFileName() : "");
            row.put("mimeType", version.getMimeType() != null ? version.getMimeType() : "application/octet-stream");
        } else {
            row.put("fileSizeBytes", 0L);
            row.put("currentVersion", null);
            row.put("fileName", "");
            row.put("mimeType", "");
        }

        List<com.enterprise.kms.entity.DocumentMetadata> metadatas = (documentMetadataRepository != null && doc.getId() != null)
                ? documentMetadataRepository.findByDocumentId(doc.getId())
                : List.of();
        Map<String, String> metaMap = new LinkedHashMap<>();
        for (com.enterprise.kms.entity.DocumentMetadata m : metadatas) {
            if (m.getMetadataKey() != null) {
                metaMap.put(m.getMetadataKey(), m.getMetadataValue() != null ? m.getMetadataValue() : "");
            }
        }
        row.put("metadata", metaMap);
        row.put("executiveSummary", metaMap.getOrDefault("executiveSummary", ""));
        row.put("category", metaMap.getOrDefault("category", "General"));
        row.put("knowledgeType", metaMap.getOrDefault("knowledgeType", doc.getDocumentType() != null && doc.getDocumentType().getName() != null ? doc.getDocumentType().getName() : "Document"));
        row.put("reviewFrequencyDays", metaMap.getOrDefault("reviewFrequencyDays", "365"));

        boolean isArticle = (doc.getCurrentVersion() != null && "text/markdown".equalsIgnoreCase(doc.getCurrentVersion().getMimeType()))
                || metaMap.containsKey("executiveSummary")
                || (doc.getDocumentType() != null && "Article".equalsIgnoreCase(doc.getDocumentType().getName()))
                || (doc.getDocumentType() != null && "SOP".equalsIgnoreCase(doc.getDocumentType().getName()));
        row.put("isArticle", isArticle);
        row.put("articleContent", doc.getCurrentVersion() != null && doc.getCurrentVersion().getExtractedText() != null ? doc.getCurrentVersion().getExtractedText() : "");

        boolean legalHold = false;
        try {
            if (legalHoldItemRepository != null && doc.getId() != null) {
                legalHold = legalHoldItemRepository.existsByIdDocumentId(doc.getId());
            }
        } catch (Exception ignored) {}
        row.put("legalHold", legalHold);

        List<String> tagsList = new ArrayList<>();
        try {
            if (doc.getId() != null) {
                tagsList = findTagNames(doc.getId());
            }
        } catch (Exception ignored) {}
        if (tagsList.isEmpty() && metaMap.containsKey("tags") && !metaMap.get("tags").isBlank()) {
            tagsList = java.util.Arrays.stream(metaMap.get("tags").split(","))
                    .map(String::trim).filter(s -> !s.isBlank()).toList();
        }
        row.put("tags", tagsList);
        return row;
    }

    @Transactional
    public Document createArticle(Map<String, Object> payload, String username) {
        String title = (String) payload.getOrDefault("title", "Untitled Article");
        String category = (String) payload.getOrDefault("category", "General");
        String knowledgeType = (String) payload.getOrDefault("knowledgeType", "SOP");
        String confidentialityLevel = (String) payload.getOrDefault("confidentialityLevel", "INTERNAL");
        String reviewFrequencyDays = String.valueOf(payload.getOrDefault("reviewFrequencyDays", "365"));
        String executiveSummary = (String) payload.getOrDefault("executiveSummary", "");
        String tags = (String) payload.getOrDefault("tags", "");
        String content = (String) payload.getOrDefault("content", "");
        boolean isDraft = Boolean.TRUE.equals(payload.get("isDraft"));
        String departmentCode = (String) payload.getOrDefault("departmentCode", "ITSEC");

        String effectiveUsername = (username != null && !username.isBlank()) ? username : "system";
        User author = userRepository.findByUsername(effectiveUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User " + effectiveUsername + " not found"));

        Department dept = departmentRepository.findByCode(departmentCode)
                .orElseGet(() -> author.getDepartment() != null ? author.getDepartment() : departmentRepository.findAll().get(0));

        DocumentType docType = documentTypeRepository.findByName(knowledgeType)
                .or(() -> {
                    if (knowledgeType != null && !knowledgeType.isBlank()) {
                        try {
                            DocumentType newDt = new DocumentType();
                            newDt.setName(knowledgeType.trim());
                            newDt.setDescription("Knowledge article type: " + knowledgeType.trim());
                            return Optional.of(documentTypeRepository.save(newDt));
                        } catch (Exception ignored) {}
                    }
                    return Optional.empty();
                })
                .or(() -> documentTypeRepository.findByName("Article"))
                .or(() -> documentTypeRepository.findByName("Policy"))
                .orElseGet(() -> documentTypeRepository.findAll().get(0));

        Document doc = new Document();
        doc.setTitle(title);
        doc.setAuthor(author);
        doc.setOwnerDepartment(dept);
        doc.setDocumentType(docType);
        doc.setConfidentialityLevel(confidentialityLevel);
        doc.setStatus(isDraft ? "DRAFT" : "UNDER_REVIEW");
        doc = documentRepository.save(doc);

        String fileName = sanitizeFileName(title) + ".md";
        byte[] markdownBytes = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        StorageObject storageObject = storageService.storeFile(new ByteArrayMultipartFile(
                fileName,
                "text/markdown",
                markdownBytes
        ));

        DocumentVersion version = new DocumentVersion();
        version.setDocument(doc);
        version.setVersionNumber(1);
        version.setFileName(fileName);
        version.setMimeType("text/markdown");
        version.setStorageObject(storageObject);
        version.setCreatedBy(author);
        version.setChangeSummary(isDraft ? "Initial draft creation" : "Article submission for review");
        version.setExtractedText(content);
        version = documentVersionRepository.save(version);

        doc.setCurrentVersion(version);
        doc = documentRepository.save(doc);

        saveMetadataKey(doc, "category", category);
        saveMetadataKey(doc, "knowledgeType", knowledgeType);
        saveMetadataKey(doc, "executiveSummary", executiveSummary);
        saveMetadataKey(doc, "tags", tags);
        saveMetadataKey(doc, "reviewFrequencyDays", reviewFrequencyDays);

        if (!isDraft) {
            approvalService.autoSubmitNewDocument(doc, effectiveUsername);
        }

        return doc;
    }

    private void saveMetadataKey(Document doc, String key, String value) {
        if (value == null) return;
        com.enterprise.kms.entity.DocumentMetadata m = new com.enterprise.kms.entity.DocumentMetadata();
        m.setDocument(doc);
        m.setMetadataKey(key);
        m.setMetadataValue(value);
        documentMetadataRepository.save(m);
    }

    private String sanitizeFileName(String name) {
        if (name == null || name.isBlank()) return "article";
        return name.replaceAll("[\\\\/:*?\"<>|\\s]", "_");
    }

    private static class ByteArrayMultipartFile implements MultipartFile {
        private final String name;
        private final String contentType;
        private final byte[] content;

        public ByteArrayMultipartFile(String name, String contentType, byte[] content) {
            this.name = name;
            this.contentType = contentType;
            this.content = content;
        }

        @Override public String getName() { return name; }
        @Override public String getOriginalFilename() { return name; }
        @Override public String getContentType() { return contentType; }
        @Override public boolean isEmpty() { return content == null || content.length == 0; }
        @Override public long getSize() { return content.length; }
        @Override public byte[] getBytes() { return content; }
        @Override public java.io.InputStream getInputStream() { return new java.io.ByteArrayInputStream(content); }
        @Override public void transferTo(java.io.File dest) throws java.io.IOException, IllegalStateException {
            java.nio.file.Files.write(dest.toPath(), content);
        }
    }

    /** Taxonomy tags attached to the document (FR-03). */
    @Transactional(readOnly = true)
    public List<String> findTagNames(UUID documentId) {
        @SuppressWarnings("unchecked")
        List<Object> names = entityManager
                .createNativeQuery("SELECT t.name FROM tags t JOIN document_tags dt ON dt.tag_id = t.id "
                        + "WHERE dt.document_id = :docId ORDER BY t.name")
                .setParameter("docId", documentId)
                .getResultList();
        List<String> result = new ArrayList<>();
        names.forEach(n -> result.add(n.toString()));
        return result;
    }

    /** Resolves the physical file for download/preview, enforcing FR-16/17/19 first. */
    @Transactional(readOnly = true)
    public Map<String, Object> prepareDownload(UUID documentId) {
        Document doc = permissionService.requireDocumentAccess(documentId, PermissionService.VIEW);
        DocumentVersion version = doc.getCurrentVersion();
        if (version == null || version.getStorageObject() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document has no stored file version");
        }
        java.nio.file.Path path = storageService.resolve(version.getStorageObject().getStoragePath());
        if (path == null || !java.nio.file.Files.isReadable(path)) {
            throw new ResponseStatusException(HttpStatus.GONE,
                    "The stored file is missing from the storage volume: " + version.getStorageObject().getStoragePath());
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("path", path);
        payload.put("fileName", version.getFileName());
        payload.put("mimeType", version.getMimeType() != null ? version.getMimeType() : "application/octet-stream");
        payload.put("sizeBytes", version.getStorageObject().getFileSizeBytes());
        return payload;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAllActiveDocumentResponses(Pageable pageable) {
        return getAllActiveDocuments(pageable).map(this::toResponse);
    }

    /** Documents authored by the caller (My Documents). */
    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getMyDocuments(Pageable pageable) {
        PermissionService.Caller caller = permissionService.currentCaller();
        return documentRepository
                .findByAuthorIdAndIsDeletedFalse(caller.userId, pageable)
                .map(this::toResponse);
    }

    /** Documents the caller recently opened, newest first, derived from the audit trail. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRecentDocuments(int limit) {
        PermissionService.Caller caller = permissionService.currentCaller();
        String username = com.enterprise.kms.security.SecurityUtils.getCurrentUsername();

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] entry : documentRepository.findRecentlyAccessed(username, Math.min(Math.max(limit, 1), 100))) {
            UUID docId = UUID.fromString(entry[0].toString());
            Document doc = documentRepository.findById(docId).orElse(null);
            if (doc == null || Boolean.TRUE.equals(doc.getIsDeleted())) {
                continue;
            }
            if (!permissionService.canAccessDocument(doc, PermissionService.VIEW, caller)) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>(toResponse(doc));
            row.put("lastAccessedAt", entry[1] != null ? entry[1].toString() : null);
            rows.add(row);
        }
        return rows;
    }

    /** FR-04 real version history for a document. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getVersionHistory(UUID documentId) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (DocumentVersion version : documentVersionRepository.findByDocumentIdOrderByVersionNumberDesc(documentId)) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", version.getId());
            row.put("versionNumber", version.getVersionNumber());
            row.put("fileName", version.getFileName());
            row.put("mimeType", version.getMimeType());
            row.put("changeSummary", version.getChangeSummary());
            row.put("createdAt", version.getCreatedAt());
            row.put("createdBy", version.getCreatedBy() != null ? version.getCreatedBy().getUsername() : null);
            StorageObject so = version.getStorageObject();
            row.put("fileSizeBytes", so != null ? so.getFileSizeBytes() : null);
            row.put("checksumSha256", so != null ? so.getChecksumSha256() : null);
            rows.add(row);
        }
        return rows;
    }

    /**
     * FR-04 version rollback: restore a document to a previous version by creating
     * a new version that reuses the old version's storage object.  The old file bytes
     * are not copied — the storage object is shared — so this is O(1) in I/O.
     */
    @Transactional
    public Document rollbackToVersion(UUID documentId, UUID targetVersionId, String username) {
        Document doc = getDocumentById(documentId);
        permissionService.requireDocumentAccess(documentId, PermissionService.EDIT);

        DocumentVersion targetVersion = documentVersionRepository.findById(targetVersionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Version not found: " + targetVersionId));
        if (!targetVersion.getDocument().getId().equals(documentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Version " + targetVersionId + " does not belong to document " + documentId);
        }

        User author = userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(username);
                    u.setEmail(username + "@enterprise.internal");
                    u.setKeycloakSub("sub-" + username);
                    return userRepository.save(u);
                });

        int nextVersionNumber = doc.getCurrentVersion() != null
                ? doc.getCurrentVersion().getVersionNumber() + 1 : 2;

        DocumentVersion rollback = new DocumentVersion();
        rollback.setDocument(doc);
        rollback.setVersionNumber(nextVersionNumber);
        rollback.setFileName(targetVersion.getFileName());
        rollback.setMimeType(targetVersion.getMimeType());
        rollback.setStorageObject(targetVersion.getStorageObject());
        rollback.setCreatedBy(author);
        rollback.setChangeSummary("Rolled back to version " + targetVersion.getVersionNumber());
        rollback = documentVersionRepository.save(rollback);

        doc.setCurrentVersion(rollback);
        doc.setUpdatedAt(OffsetDateTime.now());
        return documentRepository.save(doc);
    }

    public Document getDocumentById(UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + id));
    }

    /** Resolve a User by username for comment attribution etc. */
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "User not found: " + username));
    }

    // ---------------- FR-05 Check-in / Check-out lock system ----------------

    @SuppressWarnings("unchecked")
    @Transactional(readOnly = true)
    public Map<String, Object> getLockStatus(UUID documentId) {
        Map<String, Object> status = new LinkedHashMap<>();
        List<?> locks = entityManager.createQuery(
                "SELECT l FROM DocumentLock l WHERE l.documentId = :docId")
                .setParameter("docId", documentId)
                .getResultList();

        if (locks.isEmpty()) {
            status.put("locked", false);
        } else {
            com.enterprise.kms.entity.DocumentLock lockEntity = (com.enterprise.kms.entity.DocumentLock) locks.get(0);
            boolean expired = lockEntity.getExpiresAt() != null
                    && lockEntity.getExpiresAt().isBefore(OffsetDateTime.now());
            status.put("locked", !expired);
            status.put("lockedBy", lockEntity.getLockedBy() != null ? lockEntity.getLockedBy().getUsername() : null);
            status.put("lockedAt", lockEntity.getLockedAt());
            status.put("expiresAt", lockEntity.getExpiresAt());
            status.put("expired", expired);
        }
        return status;
    }

    @Transactional
    public Map<String, Object> checkoutDocument(UUID documentId, String username) {
        Document doc = getDocumentById(documentId);

        List<?> existing = entityManager.createQuery(
                "SELECT l FROM DocumentLock l WHERE l.documentId = :docId")
                .setParameter("docId", documentId)
                .getResultList();

        if (!existing.isEmpty()) {
            com.enterprise.kms.entity.DocumentLock existingLock = (com.enterprise.kms.entity.DocumentLock) existing.get(0);
            boolean expired = existingLock.getExpiresAt() != null
                    && existingLock.getExpiresAt().isBefore(OffsetDateTime.now());
            if (!expired) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Document is already checked out by " + existingLock.getLockedBy().getUsername());
            }
            entityManager.remove(existingLock);
            entityManager.flush();
        }

        User user = getUserByUsername(username);

        com.enterprise.kms.entity.DocumentLock lock = new com.enterprise.kms.entity.DocumentLock();
        lock.setDocumentId(documentId);
        lock.setDocument(doc);
        lock.setLockedBy(user);
        lock.setLockedAt(OffsetDateTime.now());
        lock.setExpiresAt(OffsetDateTime.now().plusHours(8));
        entityManager.persist(lock);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "CHECKED_OUT");
        result.put("lockedBy", username);
        result.put("lockedAt", lock.getLockedAt());
        result.put("expiresAt", lock.getExpiresAt());
        return result;
    }

    @Transactional
    public Document checkinDocument(UUID documentId, MultipartFile file, String changeSummary, String username) {
        releaseLock(documentId, username, true);
        return createDesktopCheckInVersion(documentId, file,
                changeSummary != null ? changeSummary : "Checked in via lock release", username);
    }

    @Transactional
    public Map<String, Object> unlockDocument(UUID documentId, String username) {
        releaseLock(documentId, username, false);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "UNLOCKED");
        result.put("documentId", documentId.toString());
        return result;
    }

    @SuppressWarnings("unchecked")
    private void releaseLock(UUID documentId, String username, boolean requireOwnership) {
        List<?> locks = entityManager.createQuery(
                "SELECT l FROM DocumentLock l WHERE l.documentId = :docId")
                .setParameter("docId", documentId)
                .getResultList();

        if (locks.isEmpty()) {
            if (requireOwnership) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document is not checked out");
            }
            return;
        }

        com.enterprise.kms.entity.DocumentLock lock = (com.enterprise.kms.entity.DocumentLock) locks.get(0);
        boolean isOwner = lock.getLockedBy() != null
                && username.equals(lock.getLockedBy().getUsername());
        if (!isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the user who checked out this document (" + lock.getLockedBy().getUsername() + ") can release the lock");
        }
        entityManager.remove(lock);
        entityManager.flush();
    }

    /** FR-16/FR-17/FR-19 checked read of a single document. */
    @Transactional
    public Document getAuthorizedDocument(UUID id, String requiredLevel) {
        return permissionService.requireDocumentAccess(id, requiredLevel);
    }

    @Transactional
    public void softDeleteDocument(UUID id) {
        Document doc = getDocumentById(id);
        doc.setIsDeleted(true);
        doc.setDeletedAt(OffsetDateTime.now());
        documentRepository.save(doc);
    }

    @Transactional
    public void restoreDocument(UUID id) {
        Document doc = getDocumentById(id);
        doc.setIsDeleted(false);
        doc.setDeletedAt(null);
        documentRepository.save(doc);
    }

    // ---------------- Recycle bin listing (FR-08) ----------------

    /**
     * FR-08: recycle bin contents for the caller - admins see all, others only their
     * own deletions. Mapped inside the transaction so lazy associations resolve.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRecycleBinResponses(Pageable pageable) {
        PermissionService.Caller caller = permissionService.currentCaller();
        String username = com.enterprise.kms.security.SecurityUtils.getCurrentUsername();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Document doc : documentRepository.findByIsDeletedTrue(pageable).getContent()) {
            if (!caller.isAdmin && (doc.getAuthor() == null || !username.equals(doc.getAuthor().getUsername()))) {
                continue;
            }
            Map<String, Object> row = toResponse(doc);
            row.put("deletedAt", doc.getDeletedAt());
            rows.add(row);
        }
        return rows;
    }

    // ---------------- Custom metadata values (FR-06) ----------------

    /** Field definitions for the document's type, plus the stored values. */
    @Transactional(readOnly = true)
    public Map<String, Object> getDocumentMetadata(UUID documentId) {
        Document doc = permissionService.requireDocumentAccess(documentId, PermissionService.VIEW);

        List<Map<String, Object>> fields = new ArrayList<>();
        Map<String, String> values = new LinkedHashMap<>();
        if (doc.getDocumentType() != null) {
            for (com.enterprise.kms.entity.DocumentTypeField field : documentTypeFieldRepository
                    .findByDocumentTypeIdOrderByCreatedAtAsc(doc.getDocumentType().getId())) {
                Map<String, Object> fieldRow = new LinkedHashMap<>();
                fieldRow.put("fieldKey", field.getFieldKey());
                fieldRow.put("label", field.getLabel());
                fieldRow.put("dataType", field.getDataType());
                fieldRow.put("required", field.getIsRequired());
                fields.add(fieldRow);
            }
        }
        for (com.enterprise.kms.entity.DocumentMetadata metadata : documentMetadataRepository.findByDocumentId(documentId)) {
            values.put(metadata.getMetadataKey(), metadata.getMetadataValue());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("documentTypeId", doc.getDocumentType() != null ? doc.getDocumentType().getId() : null);
        result.put("fields", fields);
        result.put("values", values);
        return result;
    }

    /**
     * Upserts custom metadata values, validating against the document type's field
     * definitions (FR-06): unknown keys are rejected and required fields must be
     * present with a value matching the declared data type.
     */
    @Transactional
    public Map<String, Object> putDocumentMetadata(UUID documentId, Map<String, String> incoming) {
        permissionService.requireDocumentAccess(documentId, PermissionService.EDIT);
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (doc.getDocumentType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document has no document type");
        }

        List<com.enterprise.kms.entity.DocumentTypeField> defs =
                documentTypeFieldRepository.findByDocumentTypeIdOrderByCreatedAtAsc(doc.getDocumentType().getId());

        for (Map.Entry<String, String> entry : incoming.entrySet()) {
            String key = entry.getKey();
            com.enterprise.kms.entity.DocumentTypeField def = defs.stream()
                    .filter(d -> d.getFieldKey().equalsIgnoreCase(key))
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Unknown metadata field '" + key + "' for document type " + doc.getDocumentType().getName()));
            validateMetadataValue(def, entry.getValue());

            com.enterprise.kms.entity.DocumentMetadata record = documentMetadataRepository
                    .findByDocumentIdAndMetadataKey(documentId, def.getFieldKey())
                    .orElseGet(() -> {
                        com.enterprise.kms.entity.DocumentMetadata m = new com.enterprise.kms.entity.DocumentMetadata();
                        m.setDocument(doc);
                        m.setMetadataKey(def.getFieldKey());
                        return m;
                    });
            record.setMetadataValue(entry.getValue() == null ? "" : entry.getValue());
            documentMetadataRepository.save(record);
        }

        // Required-field completeness check (FR-06)
        List<String> missing = new ArrayList<>();
        for (com.enterprise.kms.entity.DocumentTypeField def : defs) {
            if (Boolean.TRUE.equals(def.getIsRequired())) {
                String value = incoming.containsKey(def.getFieldKey())
                        ? incoming.get(def.getFieldKey())
                        : documentMetadataRepository
                                .findByDocumentIdAndMetadataKey(documentId, def.getFieldKey())
                                .map(com.enterprise.kms.entity.DocumentMetadata::getMetadataValue)
                                .orElse("");
                if (value == null || value.isBlank()) {
                    missing.add(def.getLabel());
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("saved", incoming.size());
        result.put("missingRequiredFields", missing);
        return result;
    }

    private void validateMetadataValue(com.enterprise.kms.entity.DocumentTypeField def, String value) {
        if (value == null || value.isBlank()) {
            return; // blank clears/omits; required-ness is checked afterwards
        }
        switch (def.getDataType() != null ? def.getDataType().toUpperCase() : "TEXT") {
            case "NUMBER" -> {
                try {
                    new java.math.BigDecimal(value.trim());
                } catch (NumberFormatException e) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Field '" + def.getLabel() + "' must be a number");
                }
            }
            case "DATE" -> {
                try {
                    java.time.LocalDate.parse(value.trim());
                } catch (Exception e) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Field '" + def.getLabel() + "' must be an ISO date (YYYY-MM-DD)");
                }
            }
            case "BOOLEAN" -> {
                String v = value.trim().toLowerCase();
                if (!"true".equals(v) && !"false".equals(v)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Field '" + def.getLabel() + "' must be true or false");
                }
            }
            default -> { /* TEXT accepts anything */ }
        }
    }}
