package com.enterprise.kms.controller;

import com.enterprise.kms.dto.BlogCommentDto;
import com.enterprise.kms.dto.BlogReactionsDto;
import com.enterprise.kms.repository.BlogCommentRepository;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.BlogInteractionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class BlogInteractionController {

    private final BlogInteractionService interactionService;
    private final BlogCommentRepository commentRepository;

    public BlogInteractionController(BlogInteractionService interactionService,
                                     BlogCommentRepository commentRepository) {
        this.interactionService = interactionService;
        this.commentRepository = commentRepository;
    }

    // ==================== COMMENTS & REPLIES ====================

    @GetMapping({"/api/v1/blogs/{blogId}/comments", "/api/blogs/{blogId}/comments"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BlogCommentDto>> getComments(@PathVariable UUID blogId) {
        return ResponseEntity.ok(interactionService.getComments(blogId));
    }

    @PostMapping({"/api/v1/blogs/{blogId}/comments", "/api/blogs/{blogId}/comments"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BlogCommentDto> addComment(
            @PathVariable UUID blogId,
            @RequestBody Map<String, String> body) {
        String username = SecurityUtils.getCurrentUsername();
        String content = body != null ? body.get("content") : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(interactionService.addComment(blogId, content, username));
    }

    @PostMapping({"/api/v1/blogs/{blogId}/comments/{commentId}/replies", "/api/blogs/{blogId}/comments/{commentId}/replies"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BlogCommentDto> addReply(
            @PathVariable UUID blogId,
            @PathVariable UUID commentId,
            @RequestBody Map<String, String> body) {
        String username = SecurityUtils.getCurrentUsername();
        String content = body != null ? body.get("content") : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(interactionService.addReply(blogId, commentId, content, username));
    }

    @PostMapping({"/api/v1/comments/{commentId}/replies", "/api/comments/{commentId}/replies"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BlogCommentDto> addReplyDirect(
            @PathVariable UUID commentId,
            @RequestBody Map<String, String> body) {
        String username = SecurityUtils.getCurrentUsername();
        String content = body != null ? body.get("content") : null;

        var parent = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent comment not found"));
        UUID blogId = parent.getBlog().getId();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(interactionService.addReply(blogId, commentId, content, username));
    }

    @DeleteMapping({"/api/v1/blogs/{blogId}/comments/{commentId}", "/api/blogs/{blogId}/comments/{commentId}",
                   "/api/v1/comments/{commentId}", "/api/comments/{commentId}"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteComment(@PathVariable(required = false) UUID blogId,
                                              @PathVariable UUID commentId) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        interactionService.deleteComment(commentId, username, isAdmin);
        return ResponseEntity.noContent().build();
    }

    // ==================== REACTIONS ====================

    @GetMapping({"/api/v1/blogs/{blogId}/reactions", "/api/blogs/{blogId}/reactions"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BlogReactionsDto> getReactions(@PathVariable UUID blogId) {
        String username = SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(interactionService.getReactions(blogId, username));
    }

    @PostMapping({"/api/v1/blogs/{blogId}/reactions", "/api/blogs/{blogId}/reactions"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BlogReactionsDto> react(
            @PathVariable UUID blogId,
            @RequestBody Map<String, String> body) {
        String username = SecurityUtils.getCurrentUsername();
        String type = body != null ? body.getOrDefault("type", body.get("reactionType")) : null;
        return ResponseEntity.ok(interactionService.react(blogId, type, username));
    }

    @DeleteMapping({"/api/v1/blogs/{blogId}/reactions", "/api/blogs/{blogId}/reactions"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BlogReactionsDto> removeReaction(@PathVariable UUID blogId) {
        String username = SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(interactionService.removeReaction(blogId, username));
    }
}
