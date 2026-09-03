package com.enterprise.kms;

import com.enterprise.kms.controller.DiscussionController;
import com.enterprise.kms.entity.DiscussionReply;
import com.enterprise.kms.entity.DiscussionTopic;
import com.enterprise.kms.repository.DiscussionReplyRepository;
import com.enterprise.kms.repository.DiscussionTopicRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.DiscussionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.enterprise.kms.service.NotificationService;

class DiscussionIntegrationTest {

    private DiscussionTopicRepository topicRepository;
    private DiscussionReplyRepository replyRepository;
    private UserRepository userRepository;
    private NotificationService notificationService;
    private DiscussionService discussionService;
    private DiscussionController discussionController;

    @BeforeEach
    void setUp() {
        topicRepository = mock(DiscussionTopicRepository.class);
        replyRepository = mock(DiscussionReplyRepository.class);
        userRepository = mock(UserRepository.class);
        notificationService = mock(NotificationService.class);
        discussionService = new DiscussionService(topicRepository, replyRepository, userRepository, notificationService);
        discussionController = new DiscussionController(discussionService);
    }

    @Test
    @DisplayName("Discussion E2E - Topic Creation, Reply & Threading")
    void testTopicCreationAndReply() {
        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        topic.setTitle("KMS Roadmap Q4");
        topic.setDescription("Discussing Q4 release goals.");
        topic.setStatus("OPEN");
        topic.setAuthorUsername("alice");

        when(topicRepository.save(any(DiscussionTopic.class))).thenReturn(topic);
        when(topicRepository.findById(topicId)).thenReturn(Optional.of(topic));

        // 1. Create topic
        Map<String, Object> req = Map.of("title", "KMS Roadmap Q4", "description", "Discussing Q4 release goals.");
        DiscussionTopic created = discussionService.createTopic(req, "alice");
        assertEquals("OPEN", created.getStatus());

        // 2. Add reply
        DiscussionReply reply = new DiscussionReply();
        reply.setId(UUID.randomUUID());
        reply.setTopic(topic);
        reply.setContent("Sounds good!");
        reply.setAuthorUsername("bob");

        when(replyRepository.save(any(DiscussionReply.class))).thenReturn(reply);

        DiscussionReply addedReply = discussionService.addReply(topicId, Map.of("content", "Sounds good!"), "bob");
        assertEquals("Sounds good!", addedReply.getContent());
    }

    @Test
    @DisplayName("Discussion Security - Closed Topic Rejects New Replies")
    void testClosedTopicRejectsReply() {
        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        topic.setTitle("Closed Topic");
        topic.setDescription("No more comments.");
        topic.setStatus("CLOSED");
        topic.setAuthorUsername("alice");

        when(topicRepository.findById(topicId)).thenReturn(Optional.of(topic));

        // Attempting to reply to a CLOSED topic MUST be rejected
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                discussionService.addReply(topicId, Map.of("content", "Attempt reply"), "bob")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("closed discussion"));
    }

    @Test
    @DisplayName("Discussion Moderation - Status Toggle & Ownership Security")
    void testModerationAndStatusToggle() {
        UUID topicId = UUID.randomUUID();
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(topicId);
        topic.setTitle("Feature Discussion");
        topic.setStatus("OPEN");
        topic.setAuthorUsername("charlie");

        when(topicRepository.findById(topicId)).thenReturn(Optional.of(topic));
        when(topicRepository.save(any(DiscussionTopic.class))).thenAnswer(i -> i.getArgument(0));

        // Non-author non-admin attempts to close -> forbidden
        assertThrows(ResponseStatusException.class, () ->
                discussionService.setTopicStatus(topicId, "CLOSED", "intruder", false)
        );

        // Author can close
        DiscussionTopic closed = discussionService.setTopicStatus(topicId, "CLOSED", "charlie", false);
        assertEquals("CLOSED", closed.getStatus());

        // Admin can reopen
        DiscussionTopic reopened = discussionService.setTopicStatus(topicId, "OPEN", "admin.user", true);
        assertEquals("OPEN", reopened.getStatus());
    }

    @Test
    @DisplayName("Discussion Search Topics")
    void testSearchTopics() {
        DiscussionTopic topic = new DiscussionTopic();
        topic.setId(UUID.randomUUID());
        topic.setTitle("PostgreSQL Performance");
        topic.setDescription("Indexing strategy");
        topic.setStatus("OPEN");

        Page<DiscussionTopic> page = new PageImpl<>(List.of(topic));
        when(topicRepository.searchTopics(eq("PostgreSQL"), eq("OPEN"), any(PageRequest.class)))
                .thenReturn(page);

        ResponseEntity<Page<Map<String, Object>>> res = discussionController.getTopics("PostgreSQL", "OPEN", PageRequest.of(0, 10));
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(1, res.getBody().getContent().size());
        assertEquals("PostgreSQL Performance", res.getBody().getContent().get(0).get("title"));
    }
}
