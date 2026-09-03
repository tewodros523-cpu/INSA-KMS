package com.enterprise.kms.repository;

import com.enterprise.kms.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {
    Page<Document> findByIsDeletedFalse(Pageable pageable);
    Page<Document> findByIsDeletedTrue(Pageable pageable);
    List<Document> findByAuthorIdAndIsDeletedFalse(UUID authorUserId);
    Page<Document> findByAuthorIdAndIsDeletedFalse(UUID authorUserId, Pageable pageable);
    List<Document> findByOwnerDepartmentIdAndIsDeletedFalse(UUID departmentId);
    List<Document> findByDocumentTypeIdAndIsDeletedFalse(UUID documentTypeId);
    long countByDocumentTypeId(UUID documentTypeId);

    @Query(value = "SELECT d.owner_department_id, COALESCE(SUM(so.file_size_bytes), 0) AS used_bytes, COUNT(d.id) AS doc_count " +
                   "FROM documents d " +
                   "LEFT JOIN document_versions dv ON d.current_version_id = dv.id " +
                   "LEFT JOIN storage_objects so ON dv.storage_object_id = so.id " +
                   "WHERE d.is_deleted = false " +
                   "GROUP BY d.owner_department_id",
           nativeQuery = true)
    List<Object[]> aggregateUsageByDepartment();

    @Query(value = "SELECT to_char(date_trunc('month', d.created_at), 'YYYY-MM') AS month, " +
                   "COUNT(d.id) AS doc_count, COALESCE(SUM(so.file_size_bytes), 0) AS bytes_added " +
                   "FROM documents d " +
                   "LEFT JOIN document_versions dv ON d.current_version_id = dv.id " +
                   "LEFT JOIN storage_objects so ON dv.storage_object_id = so.id " +
                   "WHERE d.created_at >= :since AND d.is_deleted = false " +
                   "GROUP BY 1 ORDER BY 1",
           nativeQuery = true)
    List<Object[]> aggregateGrowthByMonth(@Param("since") OffsetDateTime since);

    @Query(value = "SELECT d.id, d.title, u.username AS owner, u.email AS owner_email, dep.name AS department, " +
                   "d.confidentiality_level, u.is_active AS owner_active, " +
                   "COALESCE(MAX(al.created_at), d.updated_at) AS last_activity " +
                   "FROM documents d " +
                   "JOIN users u ON d.author_user_id = u.id " +
                   "JOIN departments dep ON d.owner_department_id = dep.id " +
                   "LEFT JOIN audit_logs al ON al.resource_type = 'DOCUMENT' AND al.resource_id = CAST(d.id AS VARCHAR) " +
                   "WHERE d.is_deleted = false " +
                   "GROUP BY d.id, d.title, u.username, u.email, dep.name, d.confidentiality_level, u.is_active, d.updated_at " +
                   "HAVING (u.is_active = false OR COALESCE(MAX(al.created_at), d.updated_at) < :cutoff) " +
                   "ORDER BY last_activity ASC " +
                   "LIMIT :limit",
           nativeQuery = true)
    List<Object[]> findStaleOrOrphanedContent(@Param("cutoff") OffsetDateTime cutoff, @Param("limit") int limit);
    /** FR-31: documents whose scheduled review date has passed without completion. */
    @Query(value = "SELECT d.id, d.title, u.username AS owner, u.email AS owner_email, " +
                   "dep.name AS department, d.confidentiality_level, " +
                   "MIN(dr.review_due_date) AS overdue_since " +
                   "FROM documents d " +
                   "JOIN users u ON d.author_user_id = u.id " +
                   "JOIN departments dep ON d.owner_department_id = dep.id " +
                   "JOIN document_reviews dr ON dr.document_id = d.id AND dr.status = 'PENDING' " +
                   "WHERE d.is_deleted = false " +
                   "GROUP BY d.id, d.title, u.username, u.email, dep.name, d.confidentiality_level " +
                   "HAVING MIN(dr.review_due_date) < CURRENT_DATE " +
                   "ORDER BY overdue_since ASC LIMIT :limit",
           nativeQuery = true)
    List<Object[]> findReviewOverdueDocuments(@Param("limit") int limit);
    /** FR-08: soft-deleted documents whose recovery window has elapsed. */
    List<Document> findByIsDeletedTrueAndDeletedAtBeforeAndPurgedAtIsNull(OffsetDateTime deletedAt);

    /**
     * documents.status is a PostgreSQL ENUM (document_status_enum), so the value must be
     * cast explicitly — Hibernate would otherwise bind it as VARCHAR and Postgres rejects it.
     */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "UPDATE documents SET status = CAST(:status AS document_status_enum), updated_at = NOW() WHERE id = :id",
           nativeQuery = true)
    int updateStatus(@Param("id") UUID id, @Param("status") String status);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "UPDATE documents SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE id = :id",
           nativeQuery = true)
    int softDeleteById(@Param("id") UUID id);

    /** Document ids the given user opened most recently, from the immutable audit trail. */
    @Query(value = "SELECT al.resource_id, MAX(al.created_at) AS last_seen " +
                   "FROM audit_logs al " +
                   "WHERE al.resource_type = 'DOCUMENT' AND al.user_id = :username " +
                   "  AND al.action IN ('DOCUMENT_VIEW', 'DOCUMENT_DESKTOP_OPEN', 'DOCUMENT_DOWNLOAD') " +
                   "GROUP BY al.resource_id ORDER BY last_seen DESC LIMIT :limit",
           nativeQuery = true)
    List<Object[]> findRecentlyAccessed(@Param("username") String username, @Param("limit") int limit);

    /** Bytes currently stored by a department's active documents (FR-27 quota enforcement). */
    @Query(value = "SELECT COALESCE(SUM(so.file_size_bytes), 0) FROM documents d " +
                   "JOIN document_versions dv ON d.current_version_id = dv.id " +
                   "JOIN storage_objects so ON dv.storage_object_id = so.id " +
                   "WHERE d.owner_department_id = :departmentId AND d.is_deleted = false",
           nativeQuery = true)
    long sumStoredBytesByDepartment(@Param("departmentId") UUID departmentId);

    /*
     * FR-16 permission-aware access predicate, shared by search and browse.
     * A document is visible when the caller is privileged (admin/compliance/IT security),
     * is the author, holds an explicit document ACL grant, inherits a folder ACL grant
     * (folder or any ancestor), or the confidentiality label permits it (FR-19):
     *   PUBLIC / INTERNAL -> any authenticated user
     *   CONFIDENTIAL      -> same owning department only
     *   RESTRICTED        -> explicit grant / author / privileged only
     */
    String ACL_PREDICATE =
            " ( :privileged = true " +
            "   OR d.author_user_id = CAST(:userId AS uuid) " +
            "   OR EXISTS (SELECT 1 FROM document_permissions dp WHERE dp.document_id = d.id AND ( " +
            "        (dp.subject_type = 'USER'  AND dp.subject_id = :userId) " +
            "     OR (dp.subject_type = 'ROLE'  AND dp.subject_id = ANY(string_to_array(:roles, ','))) " +
            "     OR (dp.subject_type = 'GROUP' AND dp.subject_id = ANY(string_to_array(:groups, ','))) )) " +
            "   OR (d.folder_id IS NOT NULL AND EXISTS ( " +
            "        WITH RECURSIVE chain AS ( " +
            "          SELECT f.id, f.parent_id FROM folders f WHERE f.id = d.folder_id " +
            "          UNION ALL " +
            "          SELECT p.id, p.parent_id FROM folders p JOIN chain c ON p.id = c.parent_id ) " +
            "        SELECT 1 FROM folder_permissions fp JOIN chain ch ON fp.folder_id = ch.id WHERE ( " +
            "             (fp.subject_type = 'USER'  AND fp.subject_id = :userId) " +
            "          OR (fp.subject_type = 'ROLE'  AND fp.subject_id = ANY(string_to_array(:roles, ','))) " +
            "          OR (fp.subject_type = 'GROUP' AND fp.subject_id = ANY(string_to_array(:groups, ','))) ) )) " +
            "   OR d.confidentiality_level::text = 'PUBLIC' " +
            "   OR (d.confidentiality_level::text = 'INTERNAL' AND :departmentId IS NOT NULL AND :departmentId != '00000000-0000-0000-0000-000000000000' AND d.owner_department_id = CAST(:departmentId AS uuid)) " +
            "   OR (d.confidentiality_level::text = 'CONFIDENTIAL' AND :departmentId IS NOT NULL AND :departmentId != '00000000-0000-0000-0000-000000000000' AND d.owner_department_id = CAST(:departmentId AS uuid) AND ( " +
            "        'ROLE_CONTENT_OWNER' = ANY(string_to_array(:roles, ',')) " +
            "     OR 'CONTENT_OWNER' = ANY(string_to_array(:roles, ',')) " +
            "     OR 'ROLE_MANAGER' = ANY(string_to_array(:roles, ',')) " +
            "     OR 'ROLE_CONFIDENTIAL_VIEWER' = ANY(string_to_array(:roles, ',')) )) " +
            " ) ";

    @Query(value = "SELECT d.* FROM documents d " +
                   "JOIN document_versions dv ON d.current_version_id = dv.id " +
                   "WHERE d.is_deleted = false AND d.status::text = 'PUBLISHED' AND " +
                   "to_tsvector('english', coalesce(dv.extracted_text, '') || ' ' || dv.file_name || ' ' || d.title) @@ plainto_tsquery('english', :query) " +
                   "AND " + ACL_PREDICATE,
           countQuery = "SELECT count(d.id) FROM documents d " +
                        "JOIN document_versions dv ON d.current_version_id = dv.id " +
                        "WHERE d.is_deleted = false AND d.status::text = 'PUBLISHED' AND " +
                        "to_tsvector('english', coalesce(dv.extracted_text, '') || ' ' || dv.file_name || ' ' || d.title) @@ plainto_tsquery('english', :query) " +
                        "AND " + ACL_PREDICATE,
           nativeQuery = true)
    Page<Document> fullTextSearchAuthorized(@Param("query") String query,
                                            @Param("userId") String userId,
                                            @Param("roles") String roles,
                                            @Param("groups") String groups,
                                            @Param("departmentId") String departmentId,
                                            @Param("privileged") boolean privileged,
                                            Pageable pageable);

    @Query(value = "SELECT d.* FROM documents d WHERE d.is_deleted = false AND d.status::text = 'PUBLISHED' AND " + ACL_PREDICATE,
           countQuery = "SELECT count(d.id) FROM documents d WHERE d.is_deleted = false AND d.status::text = 'PUBLISHED' AND " + ACL_PREDICATE,
           nativeQuery = true)
    Page<Document> findAuthorized(@Param("userId") String userId,
                                  @Param("roles") String roles,
                                  @Param("groups") String groups,
                                  @Param("departmentId") String departmentId,
                                  @Param("privileged") boolean privileged,
                                  Pageable pageable);


    @Query(value = "SELECT d.* FROM documents d " +
                   "JOIN document_versions dv ON d.current_version_id = dv.id " +
                   "WHERE d.is_deleted = false AND d.status::text = 'PUBLISHED' AND " +
                   "to_tsvector('english', coalesce(dv.extracted_text, '') || ' ' || dv.file_name || ' ' || d.title) @@ plainto_tsquery('english', :query)",
           countQuery = "SELECT count(d.id) FROM documents d " +
                        "JOIN document_versions dv ON d.current_version_id = dv.id " +
                        "WHERE d.is_deleted = false AND d.status::text = 'PUBLISHED' AND " +
                        "to_tsvector('english', coalesce(dv.extracted_text, '') || ' ' || dv.file_name || ' ' || d.title) @@ plainto_tsquery('english', :query)",
           nativeQuery = true)
    Page<Document> fullTextSearch(@Param("query") String query, Pageable pageable);

    /** FR-12 filtered full-text search: results can be narrowed by type, department, confidentiality, author, date range, tags. */
    @Query(value = "SELECT d.* FROM documents d " +
                   "LEFT JOIN document_versions dv ON d.current_version_id = dv.id " +
                   "LEFT JOIN document_types dt ON d.document_type_id = dt.id " +
                   "LEFT JOIN users u ON d.author_user_id = u.id " +
                   "LEFT JOIN departments dep ON d.owner_department_id = dep.id " +
                   "WHERE d.is_deleted = false AND d.status::text = 'PUBLISHED' " +
                   "AND (CAST(:query AS varchar) IS NULL OR to_tsvector('english', coalesce(dv.extracted_text, '') || ' ' || coalesce(dv.file_name, '') || ' ' || coalesce(d.title, '')) @@ plainto_tsquery('english', CAST(:query AS varchar))) " +
                   "AND (:docTypeId IS NULL OR d.document_type_id = :docTypeId) " +
                   "AND (:deptId IS NULL OR d.owner_department_id = :deptId) " +
                   "AND (:confidentiality IS NULL OR d.confidentiality_level::text = :confidentiality) " +
                   "AND (:authorId IS NULL OR d.author_user_id = :authorId) " +
                   "AND (:dateFrom IS NULL OR d.created_at >= CAST(:dateFrom AS timestamptz)) " +
                   "AND (:dateTo IS NULL OR d.created_at <= CAST(:dateTo AS timestamptz)) " +
                   "AND " + ACL_PREDICATE,
           countQuery = "SELECT count(d.id) FROM documents d " +
                   "LEFT JOIN document_versions dv ON d.current_version_id = dv.id " +
                   "LEFT JOIN document_types dt ON d.document_type_id = dt.id " +
                   "LEFT JOIN users u ON d.author_user_id = u.id " +
                   "LEFT JOIN departments dep ON d.owner_department_id = dep.id " +
                   "WHERE d.is_deleted = false AND d.status::text = 'PUBLISHED' " +
                   "AND (CAST(:query AS varchar) IS NULL OR to_tsvector('english', coalesce(dv.extracted_text, '') || ' ' || coalesce(dv.file_name, '') || ' ' || coalesce(d.title, '')) @@ plainto_tsquery('english', CAST(:query AS varchar))) " +
                   "AND (:docTypeId IS NULL OR d.document_type_id = :docTypeId) " +
                   "AND (:deptId IS NULL OR d.owner_department_id = :deptId) " +
                   "AND (:confidentiality IS NULL OR d.confidentiality_level::text = :confidentiality) " +
                   "AND (:authorId IS NULL OR d.author_user_id = :authorId) " +
                   "AND (:dateFrom IS NULL OR d.created_at >= CAST(:dateFrom AS timestamptz)) " +
                   "AND (:dateTo IS NULL OR d.created_at <= CAST(:dateTo AS timestamptz)) " +
                   "AND " + ACL_PREDICATE,
           nativeQuery = true)
    Page<Document> filteredSearch(@Param("query") String query,
                                  @Param("docTypeId") UUID docTypeId,
                                  @Param("deptId") UUID deptId,
                                  @Param("confidentiality") String confidentiality,
                                  @Param("authorId") UUID authorId,
                                  @Param("dateFrom") String dateFrom,
                                  @Param("dateTo") String dateTo,
                                  @Param("userId") String userId,
                                  @Param("roles") String roles,
                                  @Param("groups") String groups,
                                  @Param("departmentId") String departmentId,
                                  @Param("privileged") boolean privileged,
                                  Pageable pageable);

    /** FR-14 improved ranking: combines ts_rank_cd with recency signal. */
    @Query(value = "SELECT d.* FROM documents d " +
                   "LEFT JOIN document_versions dv ON d.current_version_id = dv.id " +
                   "WHERE d.is_deleted = false AND d.status::text = 'PUBLISHED' AND " +
                   "to_tsvector('english', coalesce(dv.extracted_text, '') || ' ' || coalesce(dv.file_name, '') || ' ' || coalesce(d.title, '')) @@ plainto_tsquery('english', :query) " +
                   "AND " + ACL_PREDICATE + " " +
                   "ORDER BY (ts_rank_cd(to_tsvector('english', coalesce(dv.extracted_text, '') || ' ' || coalesce(dv.file_name, '') || ' ' || coalesce(d.title, '')), plainto_tsquery('english', :query)) * 0.7 " +
                   "+ (1.0 / (1.0 + extract(epoch from (NOW() - d.updated_at)) / 86400.0)) * 0.3) DESC",
           countQuery = "SELECT count(d.id) FROM documents d " +
                   "LEFT JOIN document_versions dv ON d.current_version_id = dv.id " +
                   "WHERE d.is_deleted = false AND d.status::text = 'PUBLISHED' AND " +
                   "to_tsvector('english', coalesce(dv.extracted_text, '') || ' ' || coalesce(dv.file_name, '') || ' ' || coalesce(d.title, '')) @@ plainto_tsquery('english', :query) " +
                   "AND " + ACL_PREDICATE,
           nativeQuery = true)
    Page<Document> rankedSearch(@Param("query") String query,
                                @Param("userId") String userId,
                                @Param("roles") String roles,
                                @Param("groups") String groups,
                                @Param("departmentId") String departmentId,
                                @Param("privileged") boolean privileged,
                                Pageable pageable);

    /** FR-12 facets: aggregated counts by document type for current filter context. */
    @Query(value = "SELECT dt.name AS facet_label, COUNT(d.id) AS facet_count FROM documents d " +
                   "JOIN document_types dt ON d.document_type_id = dt.id " +
                   "WHERE d.is_deleted = false AND d.status = 'PUBLISHED' AND " + ACL_PREDICATE + " " +
                   "GROUP BY dt.name ORDER BY facet_count DESC LIMIT :limit",
           nativeQuery = true)
    List<Object[]> facetByDocumentType(@Param("userId") String userId, @Param("roles") String roles,
                                       @Param("groups") String groups, @Param("departmentId") String departmentId,
                                       @Param("privileged") boolean privileged, @Param("limit") int limit);

    /** FR-12 facets: aggregated counts by confidentiality level. */
    @Query(value = "SELECT d.confidentiality_level AS facet_label, COUNT(d.id) AS facet_count FROM documents d " +
                   "WHERE d.is_deleted = false AND d.status = 'PUBLISHED' AND " + ACL_PREDICATE + " " +
                   "GROUP BY d.confidentiality_level ORDER BY facet_count DESC",
           nativeQuery = true)
    List<Object[]> facetByConfidentiality(@Param("userId") String userId, @Param("roles") String roles,
                                          @Param("groups") String groups, @Param("departmentId") String departmentId,
                                          @Param("privileged") boolean privileged);

    /** FR-12 facets: aggregated counts by owning department. */
    @Query(value = "SELECT dep.name AS facet_label, COUNT(d.id) AS facet_count FROM documents d " +
                   "JOIN departments dep ON d.owner_department_id = dep.id " +
                   "WHERE d.is_deleted = false AND d.status = 'PUBLISHED' AND " + ACL_PREDICATE + " " +
                   "GROUP BY dep.name ORDER BY facet_count DESC LIMIT :limit",
           nativeQuery = true)
    List<Object[]> facetByDepartment(@Param("userId") String userId, @Param("roles") String roles,
                                     @Param("groups") String groups, @Param("departmentId") String departmentId,
                                     @Param("privileged") boolean privileged, @Param("limit") int limit);
}
