package com.enterprise.kms.repository;

import com.enterprise.kms.entity.DiscussionReply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DiscussionReplyRepository extends JpaRepository<DiscussionReply, UUID> {
    List<DiscussionReply> findByTopicIdOrderByCreatedAtAsc(UUID topicId);
    long countByTopicId(UUID topicId);
}
