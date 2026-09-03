package com.enterprise.kms.controller;

import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.NotificationService;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<?> listNotifications(
            @RequestParam(value = "unreadOnly", defaultValue = "false") boolean unreadOnly,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        UUID userId = resolveUserId();
        if (userId == null) return ResponseEntity.ok(Map.of("content", java.util.List.of(), "totalElements", 0));
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(notificationService.listNotifications(userId, unreadOnly, pageable));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getUnreadCount() {
        UUID userId = resolveUserId();
        long count = userId != null ? notificationService.countUnread(userId) : 0;
        return ResponseEntity.ok(Map.of("unreadCount", count, "count", count));
    }

    @RequestMapping(value = "/{id}/read", method = {RequestMethod.POST, RequestMethod.PUT})
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> markRead(@PathVariable UUID id) {
        UUID userId = resolveUserId();
        if (userId != null) notificationService.markRead(id, userId);
        return ResponseEntity.ok(Map.of("status", "READ"));
    }

    @PostMapping("/read-all")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> markAllRead() {
        UUID userId = resolveUserId();
        if (userId != null) notificationService.markAllRead(userId);
        return ResponseEntity.ok(Map.of("status", "ALL_READ"));
    }

    private UUID resolveUserId() {
        String username = SecurityUtils.getCurrentUsername();
        String sub = SecurityUtils.getCurrentUserSub();
        String email = SecurityUtils.getCurrentUserEmail();
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub(sub))
                .or(() -> userRepository.findByEmail(email))
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .map(u -> u.getId())
                .orElse(null);
    }
}
