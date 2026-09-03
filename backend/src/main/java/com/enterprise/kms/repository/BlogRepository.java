package com.enterprise.kms.repository;

import com.enterprise.kms.entity.Blog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BlogRepository extends JpaRepository<Blog, UUID> {
       Page<Blog> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

       Page<Blog> findByAuthorUsernameOrderByCreatedAtDesc(String authorUsername, Pageable pageable);

       @Query("SELECT b FROM Blog b WHERE b.status = 'PUBLISHED' " +
                     "AND (:category IS NULL OR LOWER(CAST(b.category AS string)) = :category) " +
                     "AND (:searchPattern IS NULL OR LOWER(CAST(b.title AS string)) LIKE CAST(:searchPattern AS string) OR LOWER(CAST(b.content AS string)) LIKE CAST(:searchPattern AS string)) " +
                     "ORDER BY b.createdAt DESC")
       Page<Blog> searchPublishedBlogs(@Param("searchPattern") String searchPattern, @Param("category") String category,
                     Pageable pageable);

       @Query("SELECT b FROM Blog b WHERE " +
                     "(:searchPattern IS NULL OR LOWER(CAST(b.title AS string)) LIKE CAST(:searchPattern AS string) OR LOWER(CAST(b.content AS string)) LIKE CAST(:searchPattern AS string)) " +
                     "ORDER BY b.createdAt DESC")
       Page<Blog> searchAllBlogs(@Param("searchPattern") String searchPattern, Pageable pageable);

       List<Blog> findTop10ByStatusOrderByPublishedAtDesc(String status);
}
