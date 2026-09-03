package com.enterprise.kms.repository;

import com.enterprise.kms.entity.BlogComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BlogCommentRepository extends JpaRepository<BlogComment, UUID> {
    List<BlogComment> findByBlogIdAndParentCommentIsNullAndIsDeletedFalseOrderByCreatedAtAsc(UUID blogId);
    List<BlogComment> findByParentCommentIdAndIsDeletedFalseOrderByCreatedAtAsc(UUID parentCommentId);
    List<BlogComment> findByBlogIdAndIsDeletedFalseOrderByCreatedAtAsc(UUID blogId);
    long countByBlogIdAndIsDeletedFalse(UUID blogId);
    long countByParentCommentIdAndIsDeletedFalse(UUID parentCommentId);
}
