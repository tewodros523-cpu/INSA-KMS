package com.enterprise.kms;

import com.enterprise.kms.controller.BlogController;
import com.enterprise.kms.entity.Blog;
import com.enterprise.kms.repository.BlogRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.BlogService;
import com.enterprise.kms.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
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

class BlogIntegrationTest {

    private BlogRepository blogRepository;
    private UserRepository userRepository;
    private StorageService storageService;
    private NotificationService notificationService;
    private BlogService blogService;
    private BlogController blogController;

    @BeforeEach
    void setUp() {
        blogRepository = mock(BlogRepository.class);
        userRepository = mock(UserRepository.class);
        storageService = mock(StorageService.class);
        notificationService = mock(NotificationService.class);
        blogService = new BlogService(blogRepository, userRepository, storageService, notificationService);
        blogController = new BlogController(blogService);
    }

    @Test
    @DisplayName("Blog Lifecycle - Create Draft, Publish & View")
    void testBlogCreatePublishAndView() {
        UUID blogId = UUID.randomUUID();
        Blog draftBlog = new Blog();
        draftBlog.setId(blogId);
        draftBlog.setTitle("KMS Security Best Practices");
        draftBlog.setContent("Always enforce MFA and TLS.");
        draftBlog.setCategory("Security");
        draftBlog.setStatus("DRAFT");
        draftBlog.setAuthorUsername("test.user");

        when(blogRepository.save(any(Blog.class))).thenReturn(draftBlog);
        when(blogRepository.findById(blogId)).thenReturn(Optional.of(draftBlog));

        // Create
        Map<String, Object> req = Map.of(
                "title", "KMS Security Best Practices",
                "content", "Always enforce MFA and TLS.",
                "category", "Security",
                "status", "DRAFT"
        );
        Blog created = blogService.createBlog(req, "test.user", false);
        assertEquals("DRAFT", created.getStatus());

        // Forbidden draft view for non-author non-admin
        assertThrows(ResponseStatusException.class, () -> blogService.getBlogById(blogId, "other.user", false));

        // Allowed draft view for author
        Map<String, Object> viewRes = blogService.getBlogById(blogId, "test.user", false);
        assertEquals("KMS Security Best Practices", viewRes.get("title"));

        // Toggle Publish
        when(blogRepository.save(any(Blog.class))).thenAnswer(i -> {
            Blog b = i.getArgument(0);
            b.setStatus("PUBLISHED");
            return b;
        });
        Blog published = blogService.togglePublishStatus(blogId, "test.user", false);
        assertEquals("PUBLISHED", published.getStatus());
    }

    @Test
    @DisplayName("Blog Security - Ownership Check On Edit and Delete")
    void testBlogOwnershipEnforcement() {
        UUID blogId = UUID.randomUUID();
        Blog blog = new Blog();
        blog.setId(blogId);
        blog.setTitle("Author Blog");
        blog.setContent("Original Content");
        blog.setAuthorUsername("author.user");

        when(blogRepository.findById(blogId)).thenReturn(Optional.of(blog));

        // Other user attempts to update -> forbidden
        Map<String, Object> updateReq = Map.of("title", "Hacked Title");
        assertThrows(ResponseStatusException.class, () -> blogService.updateBlog(blogId, updateReq, "intruder.user", false));

        // Other user attempts to delete -> forbidden
        assertThrows(ResponseStatusException.class, () -> blogService.deleteBlog(blogId, "intruder.user", false));

        // System Admin can update
        when(blogRepository.save(any(Blog.class))).thenAnswer(i -> i.getArgument(0));
        Blog updatedByAdmin = blogService.updateBlog(blogId, updateReq, "admin.user", true);
        assertEquals("Hacked Title", updatedByAdmin.getTitle());
    }

    @Test
    @DisplayName("Blog Search & Filter")
    void testBlogSearchAndFilter() {
        Blog b1 = new Blog();
        b1.setId(UUID.randomUUID());
        b1.setTitle("Architecture Guide");
        b1.setContent("Spring Boot and Next.js guide");
        b1.setCategory("Tech");
        b1.setStatus("PUBLISHED");

        Page<Blog> page = new PageImpl<>(List.of(b1));
        when(blogRepository.searchPublishedBlogs(any(), any(), any()))
                .thenReturn(page);

        ResponseEntity<Page<Map<String, Object>>> res = blogController.getPublishedBlogs("Architecture", "Tech", PageRequest.of(0, 10));
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(1, res.getBody().getContent().size());
        assertEquals("Architecture Guide", res.getBody().getContent().get(0).get("title"));
    }
}
