package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.DiscussionReply;
import com.enterprise.kms.entity.DiscussionTopic;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.DiscussionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/discussions")
public class DiscussionController {
    private final DiscussionService discussionService;

    public DiscussionController(DiscussionService discussionService) {
        this.discussionService = discussionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<Page<Map<String, Object>>> getTopics(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "status", required = false) String status,
            Pageable pageable) {
        return ResponseEntity.ok(discussionService.searchTopics(search, status, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DISCUSSION_TOPIC_CREATE", resourceType = "DISCUSSION")
    public ResponseEntity<Map<String, Object>> createTopic(@RequestBody Map<String, Object> body) {
        String username = SecurityUtils.getCurrentUsername();
        DiscussionTopic topic = discussionService.createTopic(body, username);
        return ResponseEntity.ok(discussionService.toTopicResponse(topic));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "DISCUSSION_TOPIC_VIEW", resourceType = "DISCUSSION")
    public ResponseEntity<Map<String, Object>> getTopicDetail(@PathVariable UUID id) {
        String username = SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(discussionService.getTopicDetail(id, username));
    }

    @PostMapping("/{id}/replies")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DISCUSSION_REPLY_ADD", resourceType = "DISCUSSION")
    public ResponseEntity<Map<String, Object>> addReply(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        String username = SecurityUtils.getCurrentUsername();
        DiscussionReply reply = discussionService.addReply(id, body, username);
        return ResponseEntity.ok(discussionService.toReplyResponse(reply));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DISCUSSION_STATUS_CHANGE", resourceType = "DISCUSSION")
    public ResponseEntity<Map<String, Object>> setTopicStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        String status = body.getOrDefault("status", "OPEN");
        DiscussionTopic topic = discussionService.setTopicStatus(id, status, username, isAdmin);
        return ResponseEntity.ok(discussionService.toTopicResponse(topic));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DISCUSSION_TOPIC_DELETE", resourceType = "DISCUSSION")
    public ResponseEntity<Void> deleteTopic(@PathVariable UUID id) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        discussionService.deleteTopic(id, username, isAdmin);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/replies/{replyId}")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DISCUSSION_REPLY_DELETE", resourceType = "DISCUSSION")
    public ResponseEntity<Void> deleteReply(@PathVariable UUID id, @PathVariable UUID replyId) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        discussionService.deleteReply(replyId, username, isAdmin);
        return ResponseEntity.noContent().build();
    }
}
