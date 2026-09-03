package com.enterprise.kms.service;

import com.enterprise.kms.entity.Document;
import com.enterprise.kms.repository.DocumentRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * FR-11 full-text search, constrained by FR-16: results only ever contain
 * documents the requesting user is authorised to see.
 *
 * FR-12: faceted / filtered search.
 * FR-13: advanced query syntax (phrase matching, boolean operators, wildcards).
 * FR-14: relevance ranking with ts_rank_cd + recency weighting.
 */
@Service
public class SearchService {
    private final DocumentRepository documentRepository;
    private final PermissionService permissionService;

    public SearchService(DocumentRepository documentRepository, PermissionService permissionService) {
        this.documentRepository = documentRepository;
        this.permissionService = permissionService;
    }

    @Transactional
    public Page<Document> searchDocuments(String query, Pageable pageable) {
        PermissionService.Caller caller = permissionService.currentCaller();

        if (query == null || query.isBlank()) {
            return documentRepository.findAuthorized(
                    caller.userIdText(), caller.rolesCsv(), caller.groupsCsv(),
                    caller.departmentIdText(), caller.privilegedRead(), pageable);
        }
        try {
            return documentRepository.rankedSearch(
                    normalizeQuery(query),
                    caller.userIdText(), caller.rolesCsv(), caller.groupsCsv(),
                    caller.departmentIdText(), caller.privilegedRead(), pageable);
        } catch (Exception e) {
            return documentRepository.filteredSearch(
                    query.trim(), null, null, null, null, null, null,
                    caller.userIdText(), caller.rolesCsv(), caller.groupsCsv(),
                    caller.departmentIdText(), caller.privilegedRead(), pageable);
        }
    }

    private static java.util.UUID toUuid(String val) {
        if (val == null || val.isBlank() || "ALL".equalsIgnoreCase(val.trim()) || "null".equalsIgnoreCase(val.trim()) || "undefined".equalsIgnoreCase(val.trim())) {
            return null;
        }
        try {
            return java.util.UUID.fromString(val.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * FR-12 filtered search: applies optional filters alongside the full-text query.
     */
    @Transactional
    public Page<Document> searchDocuments(String query, String docTypeId, String deptId,
                                          String confidentiality, String authorId,
                                          String dateFrom, String dateTo, Pageable pageable) {
        PermissionService.Caller caller = permissionService.currentCaller();

        String normalizedQuery = (query != null && !query.isBlank()) ? normalizeQuery(query) : null;
        java.util.UUID docTypeUuid = toUuid(docTypeId);
        java.util.UUID deptUuid = toUuid(deptId);
        java.util.UUID authorUuid = toUuid(authorId);
        String conf = (confidentiality != null && !confidentiality.isBlank() && !"ALL".equalsIgnoreCase(confidentiality.trim())) ? confidentiality.trim().toUpperCase() : null;
        String from = (dateFrom != null && !dateFrom.isBlank()) ? dateFrom.trim() : null;
        String to = (dateTo != null && !dateTo.isBlank()) ? dateTo.trim() : null;

        return documentRepository.filteredSearch(
                normalizedQuery, docTypeUuid, deptUuid, conf, authorUuid, from, to,
                caller.userIdText(), caller.rolesCsv(), caller.groupsCsv(),
                caller.departmentIdText(), caller.privilegedRead(), pageable);
    }

    /**
     * FR-12 facet aggregation for the current permission context.
     */
    @Cacheable(value = "searchFacets", key = "T(com.enterprise.kms.security.SecurityUtils).getCurrentUsername()")
    @Transactional(readOnly = true)
    public Map<String, Object> getSearchFacets() {
        PermissionService.Caller caller = permissionService.currentCaller();
        Map<String, Object> facets = new LinkedHashMap<>();

        facets.put("documentType", toFacetList(
                documentRepository.facetByDocumentType(
                        caller.userIdText(), caller.rolesCsv(), caller.groupsCsv(),
                        caller.departmentIdText(), caller.privilegedRead(), 20)));
        facets.put("confidentiality", toFacetList(
                documentRepository.facetByConfidentiality(
                        caller.userIdText(), caller.rolesCsv(), caller.groupsCsv(),
                        caller.departmentIdText(), caller.privilegedRead())));
        facets.put("department", toFacetList(
                documentRepository.facetByDepartment(
                        caller.userIdText(), caller.rolesCsv(), caller.groupsCsv(),
                        caller.departmentIdText(), caller.privilegedRead(), 20)));
        return facets;
    }

    /**
     * FR-13 advanced query syntax: parses a user query string into a PostgreSQL-safe
     * tsquery expression.  Supports:
     *   - Double-quoted phrase matching  →  exact phrase via & proximity
     *   - Boolean operators AND / OR / NOT (case-insensitive)
     *   - Trailing wildcard expansion    →  prefix matching via :*
     *   - Unrecognised tokens are passed through as-is (plain words)
     */
    static String normalizeQuery(String raw) {
        if (raw == null) return "";
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return trimmed;

        // 1. Collapse multiple spaces
        trimmed = trimmed.replaceAll("\\s+", " ");

        // 2. Expand trailing wildcards: "doc*" → "doc:*"
        trimmed = trimmed.replaceAll("(\\w+)\\*", "$1:*");

        // 3. Handle quoted phrases: "machine learning" → 'machine' <-> 'learning'
        Pattern phrasePattern = Pattern.compile("\"([^\"]+)\"");
        Matcher matcher = phrasePattern.matcher(trimmed);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String phrase = matcher.group(1);
            String tsPhrase = String.join(" <-> ", phrase.split("\\s+"));
            matcher.appendReplacement(sb, Matcher.quoteReplacement("'" + tsPhrase + "'"));
        }
        matcher.appendTail(sb);
        trimmed = sb.toString();

        // 4. Strip remaining quote characters (unmatched quotes)
        trimmed = trimmed.replace("\"", "");

        // 5. Map boolean operators to PostgreSQL tsquery syntax
        trimmed = trimmed.replaceAll("\\bAND\\b", "&");
        trimmed = trimmed.replaceAll("\\bOR\\b", "|");
        trimmed = trimmed.replaceAll("\\bNOT\\b", "!");

        // 6. Wrap bare words (not already in quotes) with single quotes
        trimmed = trimmed.replaceAll("([^'&|!\\s<>]+)", "'$1'");

        // 7. Clean up empty quotes or double-apostrophes
        trimmed = trimmed.replace("''", "").trim();

        return trimmed.isEmpty() ? raw.trim() : trimmed;
    }

    private List<Map<String, Object>> toFacetList(List<Object[]> rawFacets) {
        return rawFacets.stream().map(row -> {
            Map<String, Object> f = new LinkedHashMap<>();
            f.put("label", row[0] != null ? row[0].toString() : "Unknown");
            f.put("count", row[1] != null ? ((Number) row[1]).longValue() : 0L);
            return f;
        }).toList();
    }
}
