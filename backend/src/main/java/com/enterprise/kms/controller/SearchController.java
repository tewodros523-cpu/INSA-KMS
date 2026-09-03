package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Document;
import com.enterprise.kms.entity.SearchQueryLog;
import com.enterprise.kms.repository.SearchQueryLogRepository;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.SearchService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/search")
public class SearchController {
    private final SearchService searchService;
    private final SearchQueryLogRepository searchQueryLogRepository;
    private final com.enterprise.kms.service.DocumentService documentService;

    public SearchController(SearchService searchService,
                            SearchQueryLogRepository searchQueryLogRepository,
                            com.enterprise.kms.service.DocumentService documentService) {
        this.searchService = searchService;
        this.searchQueryLogRepository = searchQueryLogRepository;
        this.documentService = documentService;
    }

    @GetMapping("/quick")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "SEARCH_QUICK", resourceType = "SEARCH")
    public ResponseEntity<Page<Map<String, Object>>> quickSearch(
            @RequestParam(value = "q", required = false) String query,
            @RequestParam(value = "query", required = false) String queryAlt,
            Pageable pageable) {
        String effectiveQuery = (query != null && !query.isBlank()) ? query : queryAlt;
        Page<Document> results = searchService.searchDocuments(effectiveQuery, pageable);
        if (effectiveQuery != null && !effectiveQuery.isBlank()) {
            logSearchQuery(effectiveQuery, results);
        }
        return ResponseEntity.ok(results.map(documentService::toResponse));
    }

    @PostMapping("/advanced")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "SEARCH_ADVANCED", resourceType = "SEARCH")
    public ResponseEntity<Page<Map<String, Object>>> advancedSearch(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(value = "query", required = false) String queryParam,
            @RequestParam(value = "docTypeId", required = false) String docTypeIdParam,
            @RequestParam(value = "deptId", required = false) String deptIdParam,
            @RequestParam(value = "confidentiality", required = false) String confidentialityParam,
            @RequestParam(value = "authorId", required = false) String authorIdParam,
            @RequestParam(value = "dateFrom", required = false) String dateFromParam,
            @RequestParam(value = "dateTo", required = false) String dateToParam,
            Pageable pageable) {

        String query = body != null && body.containsKey("query") && body.get("query") != null
                ? body.get("query").toString() : queryParam;
        String rawDocType = body != null && (body.containsKey("docTypeId") || body.containsKey("documentTypeId"))
                ? (body.get("docTypeId") != null ? body.get("docTypeId").toString() : (body.get("documentTypeId") != null ? body.get("documentTypeId").toString() : null))
                : docTypeIdParam;
        String rawDept = body != null && (body.containsKey("deptId") || body.containsKey("departmentId"))
                ? (body.get("deptId") != null ? body.get("deptId").toString() : (body.get("departmentId") != null ? body.get("departmentId").toString() : null))
                : deptIdParam;
        String rawConf = body != null && (body.containsKey("confidentiality") || body.containsKey("classification"))
                ? (body.get("confidentiality") != null ? body.get("confidentiality").toString() : (body.get("classification") != null ? body.get("classification").toString() : null))
                : confidentialityParam;
        String authorId = body != null && body.containsKey("authorId") && body.get("authorId") != null
                ? body.get("authorId").toString() : authorIdParam;
        String dateFrom = body != null && body.containsKey("dateFrom") && body.get("dateFrom") != null
                ? body.get("dateFrom").toString() : dateFromParam;
        String dateTo = body != null && body.containsKey("dateTo") && body.get("dateTo") != null
                ? body.get("dateTo").toString() : dateToParam;

        String docTypeId = (rawDocType != null && !rawDocType.isBlank() && !"ALL".equalsIgnoreCase(rawDocType.trim())) ? rawDocType.trim() : null;
        String deptId = (rawDept != null && !rawDept.isBlank() && !"ALL".equalsIgnoreCase(rawDept.trim())) ? rawDept.trim() : null;
        String confidentiality = (rawConf != null && !rawConf.isBlank() && !"ALL".equalsIgnoreCase(rawConf.trim())) ? rawConf.trim() : null;

        if (authorId != null && authorId.isBlank()) {
            authorId = null;
        }
        if (dateFrom != null && dateFrom.isBlank()) {
            dateFrom = null;
        }
        if (dateTo != null && dateTo.isBlank()) {
            dateTo = null;
        }

        boolean hasFilters = (docTypeId != null)
                || (deptId != null)
                || (confidentiality != null)
                || (authorId != null)
                || (dateFrom != null)
                || (dateTo != null);

        Page<Document> results;
        if (hasFilters) {
            results = searchService.searchDocuments(
                    query,
                    docTypeId,
                    deptId,
                    confidentiality,
                    authorId,
                    dateFrom,
                    dateTo,
                    pageable);
        } else {
            results = searchService.searchDocuments(query, pageable);
        }

        if (query != null && !query.isBlank()) {
            logSearchQuery(query, results);
        }
        return ResponseEntity.ok(results.map(documentService::toResponse));
    }

    /** FR-12 facet counts for the current permission context. */
    @GetMapping("/facets")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getSearchFacets() {
        return ResponseEntity.ok(searchService.getSearchFacets());
    }

    private void logSearchQuery(String query, Page<Document> results) {
        try {
            String trimmed = query.trim();
            if (trimmed.isEmpty() || trimmed.length() > 500) {
                return;
            }
            SearchQueryLog entry = new SearchQueryLog();
            entry.setQueryText(trimmed.toLowerCase());
            entry.setUserId(SecurityUtils.getCurrentUsername());
            entry.setResultCount((int) Math.min(results.getTotalElements(), Integer.MAX_VALUE));
            searchQueryLogRepository.save(entry);
        } catch (Exception ignored) {
            // Analytics logging must never break the search itself
        }
    }
}
