package com.enterprise.kms.service;

import com.enterprise.kms.dto.BlogAuthorDto;
import com.enterprise.kms.dto.BlogCommentDto;
import com.enterprise.kms.dto.BlogReactionsDto;
import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.BlogCommentRepository;
import com.enterprise.kms.repository.BlogReactionRepository;
import com.enterprise.kms.repository.BlogRepository;
import com.enterprise.kms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class BlogInteractionService {
    private static final Logger log = LoggerFactory.getLogger(BlogInteractionService.class);

    private static final Set<String> ALLOWED_REACTIONS = Set.of("LIKE", "LOVE", "INSIGHTFUL", "HELPFUL");

    private final BlogRepository blogRepository;
    private final UserRepository userRepository;
    private final BlogCommentRepository commentRepository;
    private final BlogReactionRepository reactionRepository;
    private final NotificationService notificationService;

    public BlogInteractionService(BlogRepository blogRepository,
                                  UserRepository userRepository,
                                  BlogCommentRepository commentRepository,
                                  BlogReactionRepository reactionRepository,
                                  NotificationService notificationService) {
        this.blogRepository = blogRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.reactionRepository = reactionRepository;
        this.notificationService = notificationService;
    }

    private User resolveUser(String username) {
        if (username == null || username.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .or(() -> userRepository.findByKeycloakSub(username))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User record not found"));
    }

    private Blog resolveBlog(UUID blogId) {
        return blogRepository.findById(blogId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Blog not found"));
    }

    private BlogAuthorDto mapAuthor(User u) {
        if (u == null) {
            return new BlogAuthorDto(null, "System User", "system", "Unassigned", "", null);
        }
        String name = (u.getFullName() != null && !u.getFullName().isBlank()) ? u.getFullName() : u.getUsername();
        String dept = (u.getDepartment() != null) ? u.getDepartment().getName() : "Unassigned";
        String job = (u.getJobTitle() != null) ? u.getJobTitle() : "";
        return new BlogAuthorDto(u.getId(), name, u.getUsername(), dept, job, null);
    }

    private BlogCommentDto mapCommentDto(BlogComment c, List<BlogCommentDto> replies) {
        BlogAuthorDto author = mapAuthor(c.getUser());
        UUID parentId = c.getParentComment() != null ? c.getParentComment().getId() : null;
        return new BlogCommentDto(
                c.getId(),
                c.getContent(),
                author,
                parentId,
                c.getCreatedAt(),
                c.getUpdatedAt(),
                replies,
                replies != null ? replies.size() : 0
        );
    }

    // ==================== COMMENTS & REPLIES ====================

    @Transactional(readOnly = true)
    public List<BlogCommentDto> getComments(UUID blogId) {
        resolveBlog(blogId);

        List<BlogComment> rootComments = commentRepository.findByBlogIdAndParentCommentIsNullAndIsDeletedFalseOrderByCreatedAtAsc(blogId);
        List<BlogCommentDto> result = new ArrayList<>();

        for (BlogComment root : rootComments) {
            List<BlogComment> replies = commentRepository.findByParentCommentIdAndIsDeletedFalseOrderByCreatedAtAsc(root.getId());
            List<BlogCommentDto> replyDtos = new ArrayList<>();
            for (BlogComment reply : replies) {
                replyDtos.add(mapCommentDto(reply, Collections.emptyList()));
            }
            result.add(mapCommentDto(root, replyDtos));
        }

        return result;
    }

    @Transactional
    public BlogCommentDto addComment(UUID blogId, String content, String currentUsername) {
        if (content == null || content.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment content cannot be empty");
        }

        Blog blog = resolveBlog(blogId);
        User author = resolveUser(currentUsername);

        BlogComment comment = new BlogComment(blog, author, null, content.trim());
        BlogComment saved = commentRepository.save(comment);

        // Notify blog owner if author is not the blog owner
        User blogAuthor = blog.getAuthor();
        if (blogAuthor == null && blog.getAuthorUsername() != null) {
            blogAuthor = userRepository.findByUsername(blog.getAuthorUsername()).orElse(null);
        }

        if (blogAuthor != null && !blogAuthor.getId().equals(author.getId())) {
            String authorName = (author.getFullName() != null && !author.getFullName().isBlank())
                    ? author.getFullName()
                    : author.getUsername();
            String snippet = content.trim().length() > 100
                    ? content.trim().substring(0, 97) + "..."
                    : content.trim();

            String title = authorName + " commented on your blog";
            String message = "\"" + snippet + "\"";
            String actionUrl = "/blogs/" + blogId + "#comment-" + saved.getId();

            notificationService.sendNotificationToUser(
                    blogAuthor,
                    title,
                    message,
                    NotificationEventType.BLOG_COMMENT_ADDED,
                    "BLOG",
                    blogId,
                    actionUrl
            );
        }

        return mapCommentDto(saved, Collections.emptyList());
    }

    @Transactional
    public BlogCommentDto addReply(UUID blogId, UUID parentCommentId, String content, String currentUsername) {
        if (content == null || content.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reply content cannot be empty");
        }

        Blog blog = resolveBlog(blogId);
        User author = resolveUser(currentUsername);

        BlogComment parentComment = commentRepository.findById(parentCommentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent comment not found"));

        if (Boolean.TRUE.equals(parentComment.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot reply to a deleted comment");
        }

        // If parentComment is itself a reply, attach to its top-level parent to avoid excessive nesting
        BlogComment rootParent = parentComment.getParentComment() != null ? parentComment.getParentComment() : parentComment;

        BlogComment reply = new BlogComment(blog, author, rootParent, content.trim());
        BlogComment saved = commentRepository.save(reply);

        // Notify parent comment author (unless replying to own comment)
        User parentAuthor = parentComment.getUser();
        if (parentAuthor != null && !parentAuthor.getId().equals(author.getId())) {
            String authorName = (author.getFullName() != null && !author.getFullName().isBlank())
                    ? author.getFullName()
                    : author.getUsername();
            String snippet = content.trim().length() > 100
                    ? content.trim().substring(0, 97) + "..."
                    : content.trim();

            String title = authorName + " replied to your comment";
            String message = "\"" + snippet + "\"";
            String actionUrl = "/blogs/" + blogId + "#comment-" + saved.getId();

            notificationService.sendNotificationToUser(
                    parentAuthor,
                    title,
                    message,
                    NotificationEventType.BLOG_REPLY_ADDED,
                    "BLOG",
                    blogId,
                    actionUrl
            );
        }

        return mapCommentDto(saved, Collections.emptyList());
    }

    @Transactional
    public void deleteComment(UUID commentId, String currentUsername, boolean isAdmin) {
        BlogComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));

        boolean isAuthor = comment.getUser() != null && comment.getUser().getUsername().equalsIgnoreCase(currentUsername);
        if (!isAuthor && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only comment author or administrator can delete this comment");
        }

        // Soft delete so replies tree remains intact
        comment.setIsDeleted(true);
        commentRepository.save(comment);
    }

    // ==================== REACTIONS ====================

    @Transactional(readOnly = true)
    public BlogReactionsDto getReactions(UUID blogId, String currentUsername) {
        resolveBlog(blogId);

        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("like", 0L);
        counts.put("love", 0L);
        counts.put("insightful", 0L);
        counts.put("helpful", 0L);

        List<Object[]> aggregated = reactionRepository.countReactionsByBlogId(blogId);
        long total = 0;
        for (Object[] row : aggregated) {
            String type = String.valueOf(row[0]).toLowerCase();
            long count = ((Number) row[1]).longValue();
            counts.put(type, count);
            total += count;
        }

        String userReaction = null;
        if (currentUsername != null && !currentUsername.isBlank()) {
            User user = userRepository.findByUsername(currentUsername)
                    .or(() -> userRepository.findByKeycloakSub("sub-" + currentUsername))
                    .orElse(null);
            if (user != null) {
                userReaction = reactionRepository.findByBlogIdAndUserId(blogId, user.getId())
                        .map(r -> r.getReactionType().toLowerCase())
                        .orElse(null);
            }
        }

        return new BlogReactionsDto(counts, userReaction, total);
    }

    @Transactional
    public BlogReactionsDto react(UUID blogId, String reactionType, String currentUsername) {
        if (reactionType == null || reactionType.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reaction type is required");
        }

        String normalizedType = reactionType.trim().toUpperCase();
        if (!ALLOWED_REACTIONS.contains(normalizedType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid reaction type. Allowed types: " + ALLOWED_REACTIONS);
        }

        Blog blog = resolveBlog(blogId);
        User user = resolveUser(currentUsername);

        Optional<BlogReaction> existingOpt = reactionRepository.findByBlogIdAndUserId(blogId, user.getId());

        if (existingOpt.isPresent()) {
            BlogReaction existing = existingOpt.get();
            if (existing.getReactionType().equalsIgnoreCase(normalizedType)) {
                // Toggle off: Clicking already selected reaction removes it
                reactionRepository.delete(existing);
                log.debug("Removed reaction {} from user {} on blog {}", normalizedType, user.getUsername(), blogId);
            } else {
                // Switch reaction type
                existing.setReactionType(normalizedType);
                reactionRepository.save(existing);
                log.debug("Updated reaction to {} for user {} on blog {}", normalizedType, user.getUsername(), blogId);
            }
        } else {
            // New reaction
            BlogReaction newReaction = new BlogReaction(blog, user, normalizedType);
            reactionRepository.save(newReaction);
            log.debug("Added reaction {} from user {} on blog {}", normalizedType, user.getUsername(), blogId);
        }

        return getReactions(blogId, currentUsername);
    }

    @Transactional
    public BlogReactionsDto removeReaction(UUID blogId, String currentUsername) {
        Blog blog = resolveBlog(blogId);
        User user = resolveUser(currentUsername);

        reactionRepository.deleteByBlogIdAndUserId(blog.getId(), user.getId());
        return getReactions(blogId, currentUsername);
    }
}
