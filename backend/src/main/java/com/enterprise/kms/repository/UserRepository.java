package com.enterprise.kms.repository;

import com.enterprise.kms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {
    Optional<User> findByKeycloakSub(String keycloakSub);
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    List<User> findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(String username, String email);
    List<User> findByRoleName(String roleName);
    long countByRoleName(String roleName);
    long countByDepartmentId(UUID departmentId);
    long countByIsActiveTrue();

    @Query(value = "SELECT " +
            "u.id AS employee_id, " +
            "COALESCE(NULLIF(u.full_name, ''), u.username) AS name, " +
            "u.username AS username, " +
            "u.email AS email, " +
            "COALESCE(dpt.name, 'Unassigned') AS department, " +
            "COALESCE(u.job_title, '') AS job_title, " +
            "COALESCE(doc_counts.docs, 0) AS documents_count, " +
            "COALESCE(blog_counts.blogs, 0) AS blogs_count, " +
            "COALESCE(art_counts.articles, 0) AS articles_count, " +
            "(COALESCE(doc_counts.docs, 0) + COALESCE(blog_counts.blogs, 0) + COALESCE(art_counts.articles, 0)) AS total_contributions " +
            "FROM users u " +
            "LEFT JOIN departments dpt ON u.department_id = dpt.id " +
            "LEFT JOIN (" +
            "    SELECT d.author_user_id, COUNT(d.id) AS docs " +
            "    FROM documents d " +
            "    LEFT JOIN document_versions dv ON d.current_version_id = dv.id " +
            "    LEFT JOIN document_types dt ON d.document_type_id = dt.id " +
            "    WHERE d.is_deleted = false " +
            "      AND NOT (LOWER(COALESCE(dv.mime_type, '')) = 'text/markdown' OR LOWER(COALESCE(dt.name, '')) IN ('article', 'sop')) " +
            "    GROUP BY d.author_user_id" +
            ") doc_counts ON u.id = doc_counts.author_user_id " +
            "LEFT JOIN (" +
            "    SELECT d.author_user_id, COUNT(d.id) AS articles " +
            "    FROM documents d " +
            "    LEFT JOIN document_versions dv ON d.current_version_id = dv.id " +
            "    LEFT JOIN document_types dt ON d.document_type_id = dt.id " +
            "    WHERE d.is_deleted = false " +
            "      AND (LOWER(COALESCE(dv.mime_type, '')) = 'text/markdown' OR LOWER(COALESCE(dt.name, '')) IN ('article', 'sop')) " +
            "    GROUP BY d.author_user_id" +
            ") art_counts ON u.id = art_counts.author_user_id " +
            "LEFT JOIN (" +
            "    SELECT COALESCE(b.author_id, u2.id) AS author_user_id, COUNT(b.id) AS blogs " +
            "    FROM blogs b " +
            "    LEFT JOIN users u2 ON LOWER(b.author_username) = LOWER(u2.username) " +
            "    WHERE COALESCE(b.author_id, u2.id) IS NOT NULL " +
            "    GROUP BY COALESCE(b.author_id, u2.id)" +
            ") blog_counts ON u.id = blog_counts.author_user_id " +
            "WHERE u.is_active = true " +
            "ORDER BY total_contributions DESC, u.created_at ASC " +
            "LIMIT :limit",
            nativeQuery = true)
    List<Object[]> findTopContributorsNative(@Param("limit") int limit);

    @Query(value = "SELECT " +
            "u.id AS employee_id, " +
            "COALESCE(NULLIF(u.full_name, ''), u.username) AS name, " +
            "u.username AS username, " +
            "u.email AS email, " +
            "COALESCE(dpt.name, 'Unassigned') AS department, " +
            "COALESCE(u.job_title, '') AS job_title, " +
            "COALESCE(doc_counts.docs, 0) AS documents_count, " +
            "COALESCE(blog_counts.blogs, 0) AS blogs_count, " +
            "COALESCE(art_counts.articles, 0) AS articles_count, " +
            "(COALESCE(doc_counts.docs, 0) + COALESCE(blog_counts.blogs, 0) + COALESCE(art_counts.articles, 0)) AS total_contributions " +
            "FROM users u " +
            "LEFT JOIN departments dpt ON u.department_id = dpt.id " +
            "LEFT JOIN (" +
            "    SELECT d.author_user_id, COUNT(d.id) AS docs " +
            "    FROM documents d " +
            "    LEFT JOIN document_versions dv ON d.current_version_id = dv.id " +
            "    LEFT JOIN document_types dt ON d.document_type_id = dt.id " +
            "    WHERE d.is_deleted = false " +
            "      AND d.created_at >= :start AND d.created_at < :end " +
            "      AND NOT (LOWER(COALESCE(dv.mime_type, '')) = 'text/markdown' OR LOWER(COALESCE(dt.name, '')) IN ('article', 'sop')) " +
            "    GROUP BY d.author_user_id" +
            ") doc_counts ON u.id = doc_counts.author_user_id " +
            "LEFT JOIN (" +
            "    SELECT d.author_user_id, COUNT(d.id) AS articles " +
            "    FROM documents d " +
            "    LEFT JOIN document_versions dv ON d.current_version_id = dv.id " +
            "    LEFT JOIN document_types dt ON d.document_type_id = dt.id " +
            "    WHERE d.is_deleted = false " +
            "      AND d.created_at >= :start AND d.created_at < :end " +
            "      AND (LOWER(COALESCE(dv.mime_type, '')) = 'text/markdown' OR LOWER(COALESCE(dt.name, '')) IN ('article', 'sop')) " +
            "    GROUP BY d.author_user_id" +
            ") art_counts ON u.id = art_counts.author_user_id " +
            "LEFT JOIN (" +
            "    SELECT COALESCE(b.author_id, u2.id) AS author_user_id, COUNT(b.id) AS blogs " +
            "    FROM blogs b " +
            "    LEFT JOIN users u2 ON LOWER(b.author_username) = LOWER(u2.username) " +
            "    WHERE COALESCE(b.author_id, u2.id) IS NOT NULL " +
            "      AND b.created_at >= :start AND b.created_at < :end " +
            "    GROUP BY COALESCE(b.author_id, u2.id)" +
            ") blog_counts ON u.id = blog_counts.author_user_id " +
            "WHERE u.is_active = true " +
            "ORDER BY total_contributions DESC, u.created_at ASC " +
            "LIMIT :limit",
            nativeQuery = true)
    List<Object[]> findMonthlyTopContributorsNative(
            @Param("start") OffsetDateTime start,
            @Param("end") OffsetDateTime end,
            @Param("limit") int limit);
}
