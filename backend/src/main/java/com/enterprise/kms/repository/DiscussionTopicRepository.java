package com.enterprise.kms.repository;

import com.enterprise.kms.entity.DiscussionTopic;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DiscussionTopicRepository extends JpaRepository<DiscussionTopic, UUID> {
    @Query("SELECT t FROM DiscussionTopic t WHERE " +
           "(:status IS NULL OR LOWER(t.status) = LOWER(CAST(:status AS string))) AND " +
           "(:search IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR LOWER(t.description) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))) " +
           "ORDER BY t.updatedAt DESC, t.createdAt DESC")
    Page<DiscussionTopic> searchTopics(@Param("search") String search, @Param("status") String status, Pageable pageable);
}
