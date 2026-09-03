package com.enterprise.kms.service;

import com.enterprise.kms.entity.DiscussionReply;
import com.enterprise.kms.entity.DiscussionTopic;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DiscussionReplyRepository;
import com.enterprise.kms.repository.DiscussionTopicRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DiscussionService {
    private final DiscussionTopicRepository topicRepository;
    private final DiscussionReplyRepository replyRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final Map<UUID, Map<String, OffsetDateTime>> topicUserViews = new ConcurrentHashMap<>();

    public DiscussionService(DiscussionTopicRepository topicRepository,
                             DiscussionReplyRepository replyRepository,
                             UserRepository userRepository,
                             NotificationService notificationService) {
        this.topicRepository = topicRepository;
        this.replyRepository = replyRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public DiscussionTopic createTopic(Map<String, Object> body, String username) {
        String title = (String) body.get("title");
        String description = (String) body.get("description");

        if (title == null || title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Topic title is required");
        }
        if (description == null || description.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Topic description is required");
        }

        User author = userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElse(null);

        DiscussionTopic topic = new DiscussionTopic();
        topic.setTitle(title.trim());
        topic.setDescription(sanitizeHtml(description));
        topic.setStatus("OPEN");
        topic.setAuthor(author);
        topic.setAuthorUsername(username);

        DiscussionTopic savedTopic = topicRepository.save(topic);

        // Broadcast notification for new discussion topic to all users
        try {
            String notifTitle = "New Discussion Topic: " + savedTopic.getTitle();
            String notifMessage = username + " created a new discussion topic: \"" + savedTopic.getTitle() + "\"";
            List<User> allUsers = userRepository.findAll();
            for (User u : allUsers) {
                if (u.getUsername() != null && !u.getUsername().equalsIgnoreCase(username)) {
                    notificationService.sendNotificationToUser(u, notifTitle, notifMessage);
                }
            }
        } catch (Exception e) {
            // Silently swallow notification errors
        }

        return savedTopic;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> searchTopics(String search, String status, Pageable pageable) {
        String effectiveSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        String effectiveStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())) ? status.trim() : null;

        return topicRepository.searchTopics(effectiveSearch, effectiveStatus, pageable)
                .map(this::toTopicResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTopicDetail(UUID id, String username) {
        DiscussionTopic topic = topicRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found"));

        if (username != null && !username.isBlank()) {
            topicUserViews.computeIfAbsent(id, k -> new ConcurrentHashMap<>())
                          .put(username.trim().toLowerCase(), OffsetDateTime.now());
        }

        Map<String, Object> response = toTopicResponse(topic);
        response.put("isRead", isMessageReadByOtherUser(id, topic.getAuthorUsername(), topic.getCreatedAt()));

        List<DiscussionReply> replies = replyRepository.findByTopicIdOrderByCreatedAtAsc(id);
        List<Map<String, Object>> replyList = new ArrayList<>();
        for (DiscussionReply r : replies) {
            Map<String, Object> replyMap = toReplyResponse(r);
            replyMap.put("isRead", isMessageReadByOtherUser(id, r.getAuthorUsername(), r.getCreatedAt()));
            replyList.add(replyMap);
        }
        response.put("replies", replyList);
        return response;
    }

    private boolean isMessageReadByOtherUser(UUID topicId, String authorUsername, OffsetDateTime createdAt) {
        Map<String, OffsetDateTime> userViews = topicUserViews.get(topicId);
        if (userViews == null || userViews.isEmpty()) {
            return false;
        }
        String authorLower = authorUsername != null ? authorUsername.trim().toLowerCase() : "";
        for (Map.Entry<String, OffsetDateTime> entry : userViews.entrySet()) {
            String viewer = entry.getKey();
            OffsetDateTime viewedAt = entry.getValue();
            if (!viewer.equalsIgnoreCase(authorLower) && viewedAt != null && !viewedAt.isBefore(createdAt)) {
                return true;
            }
        }
        return false;
    }

    @Transactional
    public DiscussionReply addReply(UUID topicId, Map<String, Object> body, String username) {
        DiscussionTopic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found"));

        // CRITICAL REQUIREMENT: Reject new replies when discussion is CLOSED at backend level
        if ("CLOSED".equalsIgnoreCase(topic.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot reply to a closed discussion topic");
        }

        String content = (String) body.get("content");
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reply content cannot be empty");
        }

        User author = userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElse(null);

        DiscussionReply reply = new DiscussionReply();
        reply.setTopic(topic);
        reply.setContent(sanitizeHtml(content));
        reply.setAuthor(author);
        reply.setAuthorUsername(username);

        if (body.containsKey("parentReplyId") && body.get("parentReplyId") != null) {
            String parentIdStr = (String) body.get("parentReplyId");
            if (!parentIdStr.isBlank()) {
                UUID parentUuid = UUID.fromString(parentIdStr);
                DiscussionReply parent = replyRepository.findById(parentUuid)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent reply not found"));

                if (!parent.getTopic().getId().equals(topicId)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent reply does not belong to this discussion topic");
                }
                reply.setParentReply(parent);
            }
        }

        // Update topic updatedAt so topic moves to top of discussions list
        topic.setUpdatedAt(OffsetDateTime.now());
        topicRepository.save(topic);

        DiscussionReply savedReply = replyRepository.save(reply);

        // Broadcast notification for new discussion reply/text to all users
        try {
            String notifTitle = "New Message in Discussion: " + topic.getTitle();
            String snippet = content.length() > 80 ? content.substring(0, 80) + "..." : content;
            String notifMessage = username + ": \"" + snippet + "\"";
            List<User> allUsers = userRepository.findAll();
            for (User u : allUsers) {
                if (u.getUsername() != null && !u.getUsername().equalsIgnoreCase(username)) {
                    notificationService.sendNotificationToUser(u, notifTitle, notifMessage);
                }
            }
        } catch (Exception e) {
            // Silently swallow notification errors to ensure reply posting succeeds
        }

        return savedReply;
    }

    @Transactional
    public DiscussionTopic setTopicStatus(UUID topicId, String status, String username, boolean isAdmin) {
        DiscussionTopic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found"));

        boolean isAuthor = topic.getAuthorUsername().equalsIgnoreCase(username);
        if (!isAuthor && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only author or admin can change discussion topic status");
        }

        if ("CLOSED".equalsIgnoreCase(status)) {
            topic.setStatus("CLOSED");
        } else {
            topic.setStatus("OPEN");
        }

        return topicRepository.save(topic);
    }

    @Transactional
    public void deleteTopic(UUID topicId, String username, boolean isAdmin) {
        DiscussionTopic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found"));

        boolean isAuthor = topic.getAuthorUsername().equalsIgnoreCase(username);
        if (!isAuthor && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only author or admin can delete discussion topic");
        }

        topicRepository.delete(topic);
    }

    @Transactional
    public void deleteReply(UUID replyId, String username, boolean isAdmin) {
        DiscussionReply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion reply not found"));

        boolean isAuthor = reply.getAuthorUsername().equalsIgnoreCase(username);
        if (!isAuthor && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only reply author or admin can delete this reply");
        }

        replyRepository.delete(reply);
    }

    public Map<String, Object> toTopicResponse(DiscussionTopic topic) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", topic.getId());
        res.put("title", topic.getTitle());
        res.put("description", topic.getDescription());
        res.put("status", topic.getStatus());
        res.put("author", topic.getAuthorUsername());
        res.put("authorId", topic.getAuthor() != null ? topic.getAuthor().getId() : null);
        res.put("createdAt", topic.getCreatedAt());
        res.put("updatedAt", topic.getUpdatedAt());
        res.put("replyCount", replyRepository.countByTopicId(topic.getId()));
        return res;
    }

    public Map<String, Object> toReplyResponse(DiscussionReply reply) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", reply.getId());
        res.put("topicId", reply.getTopic().getId());
        res.put("parentReplyId", reply.getParentReply() != null ? reply.getParentReply().getId() : null);
        res.put("content", reply.getContent());
        res.put("author", reply.getAuthorUsername());
        res.put("authorId", reply.getAuthor() != null ? reply.getAuthor().getId() : null);
        res.put("createdAt", reply.getCreatedAt());
        res.put("updatedAt", reply.getUpdatedAt());
        return res;
    }

    private String sanitizeHtml(String html) {
        if (html == null) return "";
        return html.replaceAll("(?i)<script.*?>.*?</script>", "")
                   .replaceAll("(?i)javascript:", "")
                   .replaceAll("(?i)on\\w+\\s*=", "data-disabled=");
    }
}
