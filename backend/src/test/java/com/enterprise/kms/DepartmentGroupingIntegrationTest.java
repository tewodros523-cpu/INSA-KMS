package com.enterprise.kms;

import com.enterprise.kms.controller.DocumentController;
import com.enterprise.kms.dto.BulkUploadItemResult;
import com.enterprise.kms.dto.BulkUploadResult;
import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.*;
import com.enterprise.kms.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import jakarta.persistence.EntityManager;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class DepartmentGroupingIntegrationTest {

    private DocumentService documentService;
    private PermissionService permissionService;
    private SearchService searchService;
    private DocumentController documentController;
    private DocumentRepository documentRepository;
    private DepartmentRepository departmentRepository;
    private DocumentTypeRepository documentTypeRepository;
    private DocumentVersionRepository documentVersionRepository;
    private StorageService storageService;
    private UserRepository userRepository;
    private ApprovalService approvalService;

    private Department financeDept;
    private Department hrDept;
    private Department itDept;
    private DocumentType reportType;
    private User testUser;

    @BeforeEach
    void setUp() {
        documentService = mock(DocumentService.class);
        permissionService = mock(PermissionService.class);
        searchService = mock(SearchService.class);
        documentRepository = mock(DocumentRepository.class);
        departmentRepository = mock(DepartmentRepository.class);
        documentTypeRepository = mock(DocumentTypeRepository.class);
        documentVersionRepository = mock(DocumentVersionRepository.class);
        storageService = mock(StorageService.class);
        userRepository = mock(UserRepository.class);
        approvalService = mock(ApprovalService.class);

        documentController = new DocumentController(
                documentService, permissionService, null, null, null, null,
                userRepository, null, null, null, documentRepository,
                storageService, null, searchService, null
        );

        financeDept = new Department();
        financeDept.setId(UUID.randomUUID());
        financeDept.setName("Finance Department");
        financeDept.setCode("FIN");

        hrDept = new Department();
        hrDept.setId(UUID.randomUUID());
        hrDept.setName("HR Department");
        hrDept.setCode("HR");

        itDept = new Department();
        itDept.setId(UUID.randomUUID());
        itDept.setName("IT Department");
        itDept.setCode("IT");

        reportType = new DocumentType();
        reportType.setId(UUID.randomUUID());
        reportType.setName("Report");

        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setUsername("testadmin");
    }

    @Test
    @DisplayName("Documents returned for library contain Department information")
    void testDocumentsContainDepartmentInfo() {
        Document doc1 = new Document();
        doc1.setId(UUID.randomUUID());
        doc1.setTitle("Budget Report.pdf");
        doc1.setOwnerDepartment(financeDept);
        doc1.setStatus("PUBLISHED");

        Document doc2 = new Document();
        doc2.setId(UUID.randomUUID());
        doc2.setTitle("HR Policy.pdf");
        doc2.setOwnerDepartment(hrDept);
        doc2.setStatus("PUBLISHED");

        Pageable pageable = PageRequest.of(0, 10);
        when(documentService.getAllActiveDocumentResponses(pageable)).thenReturn(
                new PageImpl<>(List.of(
                        Map.of("id", doc1.getId(), "title", doc1.getTitle(), "department", "Finance Department",
                               "ownerDepartment", Map.of("id", financeDept.getId(), "name", financeDept.getName(), "code", financeDept.getCode())),
                        Map.of("id", doc2.getId(), "title", doc2.getTitle(), "department", "HR Department",
                               "ownerDepartment", Map.of("id", hrDept.getId(), "name", hrDept.getName(), "code", hrDept.getCode()))
                ))
        );

        ResponseEntity<Page<Map<String, Object>>> response = documentController.getAllDocuments(
                null, null, null, null, null, null, null, null, null, null, pageable);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().getTotalElements());

        Map<String, Object> item1 = response.getBody().getContent().get(0);
        assertEquals("Finance Department", item1.get("department"));
        assertNotNull(item1.get("ownerDepartment"));

        Map<String, Object> item2 = response.getBody().getContent().get(1);
        assertEquals("HR Department", item2.get("department"));
    }

    @Test
    @DisplayName("Department filter isolates documents belonging to specific department")
    void testDepartmentFilter() {
        Document financeDoc = new Document();
        financeDoc.setId(UUID.randomUUID());
        financeDoc.setTitle("Annual Report.pdf");
        financeDoc.setOwnerDepartment(financeDept);
        financeDoc.setStatus("PUBLISHED");

        Pageable pageable = PageRequest.of(0, 10);
        when(searchService.searchDocuments(isNull(), isNull(), eq(financeDept.getId().toString()), isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(financeDoc)));
        when(documentService.toResponse(financeDoc)).thenReturn(
                Map.of("id", financeDoc.getId(), "title", financeDoc.getTitle(), "department", "Finance Department",
                       "ownerDepartment", Map.of("id", financeDept.getId(), "name", financeDept.getName(), "code", financeDept.getCode()))
        );

        ResponseEntity<Page<Map<String, Object>>> response = documentController.getAllDocuments(
                financeDept.getId().toString(), null, null, null, null, null, null, null, null, null, pageable);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getTotalElements());
        assertEquals("Finance Department", response.getBody().getContent().get(0).get("department"));
    }

    @Test
    @DisplayName("Combined filter: Department + Category + Search query")
    void testCombinedDepartmentCategorySearchFilter() {
        Document matchingDoc = new Document();
        matchingDoc.setId(UUID.randomUUID());
        matchingDoc.setTitle("Budget Report.pdf");
        matchingDoc.setOwnerDepartment(financeDept);
        matchingDoc.setDocumentType(reportType);
        matchingDoc.setStatus("PUBLISHED");

        Pageable pageable = PageRequest.of(0, 10);
        when(searchService.searchDocuments(eq("Budget"), eq(reportType.getId().toString()), eq(financeDept.getId().toString()), isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(matchingDoc)));
        when(documentService.toResponse(matchingDoc)).thenReturn(
                Map.of("id", matchingDoc.getId(), "title", matchingDoc.getTitle(), "department", "Finance Department",
                       "documentType", "Report",
                       "ownerDepartment", Map.of("id", financeDept.getId(), "name", financeDept.getName(), "code", financeDept.getCode()))
        );

        ResponseEntity<Page<Map<String, Object>>> response = documentController.getAllDocuments(
                financeDept.getId().toString(), null, reportType.getId().toString(), null, null, null, null, null, null, "Budget", pageable);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getTotalElements());
        assertEquals("Budget Report.pdf", response.getBody().getContent().get(0).get("title"));
        assertEquals("Finance Department", response.getBody().getContent().get(0).get("department"));
    }

    @Test
    @DisplayName("7-parameter overload is backward compatible")
    void testBackwardCompatibleOverload() {
        Pageable pageable = PageRequest.of(0, 10);
        when(documentService.getAllActiveDocumentResponses(pageable)).thenReturn(
                new PageImpl<>(Collections.emptyList())
        );

        ResponseEntity<Page<Map<String, Object>>> response = documentController.getAllDocuments(
                null, null, null, null, null, null, pageable);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("Bulk upload preserves department across all items")
    void testBulkUploadPreservesDepartment() {
        DocumentService realDocService = new DocumentService(
                documentRepository, documentVersionRepository, storageService,
                mock(TextExtractionService.class), mock(DocumentMetadataRepository.class),
                mock(DocumentTypeFieldRepository.class), userRepository, departmentRepository,
                documentTypeRepository, mock(FolderRepository.class), permissionService,
                mock(LegalHoldItemRepository.class), approvalService
        );

        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(testUser));
        when(departmentRepository.findByCode("FIN")).thenReturn(Optional.of(financeDept));
        when(departmentRepository.findByName("FIN")).thenReturn(Optional.of(financeDept));
        when(documentTypeRepository.findByName(anyString())).thenReturn(Optional.of(reportType));

        StorageObject so = new StorageObject();
        so.setId(UUID.randomUUID());
        so.setStoragePath("test-so.bin");
        so.setFileSizeBytes(1024L);
        when(storageService.storeFile(any())).thenReturn(so);

        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> {
            Document d = inv.getArgument(0);
            if (d.getId() == null) d.setId(UUID.randomUUID());
            return d;
        });
        when(documentVersionRepository.save(any(DocumentVersion.class))).thenAnswer(inv -> {
            DocumentVersion v = inv.getArgument(0);
            if (v.getId() == null) v.setId(UUID.randomUUID());
            return v;
        });

        MockMultipartFile f1 = new MockMultipartFile("files", "Budget Report.pdf", "application/pdf", "content1".getBytes());
        MockMultipartFile f2 = new MockMultipartFile("files", "Financial Policy.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "content2".getBytes());

        BulkUploadResult result = realDocService.bulkUploadDocuments(
                List.of(f1, f2),
                List.of("Budget Report", "Financial Policy"),
                "FIN",
                "Report",
                "INTERNAL",
                null,
                null,
                null,
                "testadmin"
        );

        assertNotNull(result);
        assertEquals(2, result.getSuccessfulCount());
        assertEquals(0, result.getFailedCount());
        verify(documentRepository, atLeast(2)).save(argThat(d ->
                d.getOwnerDepartment() != null && "Finance Department".equals(d.getOwnerDepartment().getName())
        ));
    }
}
