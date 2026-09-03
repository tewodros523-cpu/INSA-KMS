package com.enterprise.kms.repository;

import com.enterprise.kms.entity.BlogPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPost, UUID> {

    Page<BlogPost> findByStatus(String status, Pageable pageable);

    @Query("SELECT b FROM BlogPost b WHERE " +
           "(:status IS NULL OR b.status = :status) AND " +
           "(:category IS NULL OR LOWER(b.category) = LOWER(:category)) AND " +
           "(:search IS NULL OR :search = '' OR " +
           " LOWER(b.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(b.content) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<BlogPost> searchBlogs(@Param("status") String status,
                               @Param("category") String category,
                               @Param("search") String search,
                               Pageable pageable);
}
