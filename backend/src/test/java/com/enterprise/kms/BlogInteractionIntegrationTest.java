package com.enterprise.kms;

import com.enterprise.kms.dto.BlogCommentDto;
import com.enterprise.kms.dto.BlogReactionsDto;
import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.BlogCommentRepository;
import com.enterprise.kms.repository.BlogReactionRepository;
import com.enterprise.kms.repository.BlogRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.BlogInteractionService;
import com.enterprise.kms.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BlogInteractionIntegrationTest {

    private BlogRepository blogRepository;
    private UserRepository userRepository;
    private BlogCommentRepository commentRepository;
    private BlogReactionRepository reactionRepository;
    private NotificationService notificationService;
    private BlogInteractionService interactionService;

    private User blogAuthor;
    private User commenter;
    private User replier;
    private Blog blog;

    @BeforeEach
    void setUp() {
        blogRepository = Mockito.mock(BlogRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        commentRepository = Mockito.mock(BlogCommentRepository.class);
        reactionRepository = Mockito.mock(BlogReactionRepository.class);
        notificationService = Mockito.mock(NotificationService.class);

        interactionService = new BlogInteractionService(
                blogRepository,
                userRepository,
                commentRepository,
                reactionRepository,
                notificationService
        );

        blogAuthor = new User();
        blogAuthor.setId(UUID.randomUUID());
        blogAuthor.setUsername("blog_owner");
        blogAuthor.setFullName("Blog Owner");

        commenter = new User();
        commenter.setId(UUID.randomUUID());
        commenter.setUsername("commenter_user");
        commenter.setFullName("Commenter User");

        replier = new User();
        replier.setId(UUID.randomUUID());
        replier.setUsername("replier_user");
        replier.setFullName("Replier User");

        blog = new Blog();
        blog.setId(UUID.randomUUID());
        blog.setTitle("Tech Innovations in KMS");
        blog.setAuthor(blogAuthor);
        blog.setAuthorUsername(blogAuthor.getUsername());
        blog.setStatus("PUBLISHED");

        when(blogRepository.findById(blog.getId())).thenReturn(Optional.of(blog));
        when(userRepository.findByUsername("blog_owner")).thenReturn(Optional.of(blogAuthor));
        when(userRepository.findByUsername("commenter_user")).thenReturn(Optional.of(commenter));
        when(userRepository.findByUsername("replier_user")).thenReturn(Optional.of(replier));
    }

    @Test
    @DisplayName("1. Comment on blog - Persists comment and notifies blog author")
    void testAddComment_NotifiesBlogAuthor() {
        when(commentRepository.save(any(BlogComment.class))).thenAnswer(invocation -> {
            BlogComment c = invocation.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        BlogCommentDto result = interactionService.addComment(blog.getId(), "Very insightful post!", "commenter_user");

        assertNotNull(result);
        assertEquals("Very insightful post!", result.getContent());
        assertEquals("commenter_user", result.getAuthor().getUsername());

        // Verify blog owner was notified
        verify(notificationService, times(1)).sendNotificationToUser(
                eq(blogAuthor),
                contains("Commenter User commented"),
                contains("Very insightful post!"),
                eq(NotificationEventType.BLOG_COMMENT_ADDED),
                eq("BLOG"),
                eq(blog.getId()),
                contains("/blogs/" + blog.getId())
        );
    }

    @Test
    @DisplayName("2. Comment on own blog - Zero notification sent")
    void testAddComment_OwnBlog_NoNotification() {
        when(commentRepository.save(any(BlogComment.class))).thenAnswer(invocation -> {
            BlogComment c = invocation.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        BlogCommentDto result = interactionService.addComment(blog.getId(), "My own follow-up comment", "blog_owner");

        assertNotNull(result);
        verify(notificationService, never()).sendNotificationToUser(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("3. Reply to comment - Notifies parent comment author only, not blog author")
    void testAddReply_NotifiesParentCommentAuthorOnly() {
        BlogComment parentComment = new BlogComment(blog, commenter, null, "Parent comment text");
        parentComment.setId(UUID.randomUUID());

        when(commentRepository.findById(parentComment.getId())).thenReturn(Optional.of(parentComment));
        when(commentRepository.save(any(BlogComment.class))).thenAnswer(invocation -> {
            BlogComment r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        BlogCommentDto replyResult = interactionService.addReply(blog.getId(), parentComment.getId(), "I totally agree with you!", "replier_user");

        assertNotNull(replyResult);
        assertEquals("I totally agree with you!", replyResult.getContent());

        // Verify parent comment author (commenter) was notified
        verify(notificationService, times(1)).sendNotificationToUser(
                eq(commenter),
                contains("Replier User replied to your comment"),
                contains("I totally agree with you!"),
                eq(NotificationEventType.BLOG_REPLY_ADDED),
                eq("BLOG"),
                eq(blog.getId()),
                contains("/blogs/" + blog.getId())
        );

        // Verify blog author was NOT notified
        verify(notificationService, never()).sendNotificationToUser(
                eq(blogAuthor), any(), any(), any(), any(), any(), any()
        );
    }

    @Test
    @DisplayName("4. Reply to own comment - Zero notification sent")
    void testAddReply_OwnComment_NoNotification() {
        BlogComment parentComment = new BlogComment(blog, commenter, null, "Parent comment text");
        parentComment.setId(UUID.randomUUID());

        when(commentRepository.findById(parentComment.getId())).thenReturn(Optional.of(parentComment));
        when(commentRepository.save(any(BlogComment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        interactionService.addReply(blog.getId(), parentComment.getId(), "Replying to myself", "commenter_user");

        verify(notificationService, never()).sendNotificationToUser(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("5. Reactions - Add, switch type, and toggle off (remove)")
    void testReactions_AddSwitchAndRemove() {
        // Step A: User reacts LIKE
        when(reactionRepository.findByBlogIdAndUserId(blog.getId(), commenter.getId())).thenReturn(Optional.empty());
        when(reactionRepository.countReactionsByBlogId(blog.getId())).thenReturn(List.<Object[]>of(new Object[]{"like", 1L}));

        BlogReactionsDto res1 = interactionService.react(blog.getId(), "like", "commenter_user");
        verify(reactionRepository, times(1)).save(any(BlogReaction.class));
        assertNotNull(res1);

        // Step B: User switches reaction to LOVE
        BlogReaction existingLike = new BlogReaction(blog, commenter, "LIKE");
        when(reactionRepository.findByBlogIdAndUserId(blog.getId(), commenter.getId())).thenReturn(Optional.of(existingLike));
        when(reactionRepository.countReactionsByBlogId(blog.getId())).thenReturn(List.<Object[]>of(new Object[]{"love", 1L}));

        BlogReactionsDto res2 = interactionService.react(blog.getId(), "love", "commenter_user");
        assertEquals("LOVE", existingLike.getReactionType());
        verify(reactionRepository, atLeast(2)).save(any(BlogReaction.class));

        // Step C: User clicks LOVE again -> toggles off (deletes reaction)
        BlogReaction existingLove = new BlogReaction(blog, commenter, "LOVE");
        when(reactionRepository.findByBlogIdAndUserId(blog.getId(), commenter.getId())).thenReturn(Optional.of(existingLove));
        when(reactionRepository.countReactionsByBlogId(blog.getId())).thenReturn(Collections.emptyList());

        interactionService.react(blog.getId(), "love", "commenter_user");
        verify(reactionRepository, times(1)).delete(existingLove);
    }
}
