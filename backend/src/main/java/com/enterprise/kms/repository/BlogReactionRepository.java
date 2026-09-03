package com.enterprise.kms.repository;

import com.enterprise.kms.entity.BlogReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BlogReactionRepository extends JpaRepository<BlogReaction, UUID> {
    Optional<BlogReaction> findByBlogIdAndUserId(UUID blogId, UUID userId);
    List<BlogReaction> findByBlogId(UUID blogId);
    void deleteByBlogIdAndUserId(UUID blogId, UUID userId);

    @Query("SELECT LOWER(r.reactionType), COUNT(r) FROM BlogReaction r WHERE r.blog.id = :blogId GROUP BY LOWER(r.reactionType)")
    List<Object[]> countReactionsByBlogId(@Param("blogId") UUID blogId);
}
