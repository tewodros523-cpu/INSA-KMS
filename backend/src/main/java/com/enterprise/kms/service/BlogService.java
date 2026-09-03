package com.enterprise.kms.service;

import com.enterprise.kms.entity.Blog;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.BlogRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;

@Service
public class BlogService {
    private final BlogRepository blogRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final NotificationService notificationService;

    public BlogService(BlogRepository blogRepository, UserRepository userRepository, StorageService storageService, NotificationService notificationService) {
        this.blogRepository = blogRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.notificationService = notificationService;
    }

    @Transactional
    public Blog createBlog(Map<String, Object> body, String username, boolean isSystemAdmin) {
        String title = (String) body.get("title");
        String content = (String) body.get("content");
        String category = (String) body.getOrDefault("category", "General");
        String coverImageUrl = (String) body.get("coverImageUrl");
        String status = (String) body.getOrDefault("status", "DRAFT");

        if (title == null || title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Blog title is required");
        }
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Blog content is required");
        }

        User author = userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElse(null);

        Blog blog = new Blog();
        blog.setTitle(sanitize(title));
        blog.setContent(sanitizeHtml(content));
        blog.setCategory(category != null && !category.isBlank() ? sanitize(category) : "General");
        blog.setCoverImageUrl(coverImageUrl);
        blog.setAuthor(author);
        blog.setAuthorUsername(username);

        boolean isPublishing = "PUBLISHED".equalsIgnoreCase(status);
        if (isPublishing) {
            blog.setStatus("PUBLISHED");
            blog.setPublishedAt(OffsetDateTime.now());
        } else {
            blog.setStatus("DRAFT");
        }

        Blog savedBlog = blogRepository.save(blog);

        if (isPublishing) {
            broadcastBlogPublishNotification(savedBlog);
        }

        return savedBlog;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getPublishedBlogs(String search, String category, Pageable pageable) {
        String searchPattern = (search != null && !search.isBlank()) ? "%" + search.trim().toLowerCase() + "%" : null;
        String effectiveCat = (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category.trim())) ? category.trim().toLowerCase() : null;

        return blogRepository.searchPublishedBlogs(searchPattern, effectiveCat, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getMyBlogs(String username, Pageable pageable) {
        return blogRepository.findByAuthorUsernameOrderByCreatedAtDesc(username, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getBlogById(UUID id, String currentUsername, boolean isAdmin) {
        Blog blog = blogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Blog not found"));

        if ("DRAFT".equalsIgnoreCase(blog.getStatus())) {
            boolean isAuthor = blog.getAuthorUsername().equalsIgnoreCase(currentUsername);
            if (!isAuthor && !isAdmin) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to draft blog");
            }
        }
        return toResponse(blog);
    }

    @Transactional
    public Blog updateBlog(UUID id, Map<String, Object> body, String currentUsername, boolean isAdmin) {
        Blog blog = blogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Blog not found"));

        boolean isAuthor = blog.getAuthorUsername().equalsIgnoreCase(currentUsername);
        if (!isAuthor && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only author or admin can update this blog");
        }

        if (body.containsKey("title") && body.get("title") != null) {
            blog.setTitle(sanitize((String) body.get("title")));
        }
        if (body.containsKey("content") && body.get("content") != null) {
            blog.setContent(sanitizeHtml((String) body.get("content")));
        }
        if (body.containsKey("category") && body.get("category") != null) {
            blog.setCategory(sanitize((String) body.get("category")));
        }
        if (body.containsKey("coverImageUrl")) {
            blog.setCoverImageUrl((String) body.get("coverImageUrl"));
        }
        boolean becamePublished = false;
        if (body.containsKey("status") && body.get("status") != null) {
            String newStatus = (String) body.get("status");
            if ("PUBLISHED".equalsIgnoreCase(newStatus) && !"PUBLISHED".equals(blog.getStatus())) {
                blog.setStatus("PUBLISHED");
                becamePublished = true;
                if (blog.getPublishedAt() == null) {
                    blog.setPublishedAt(OffsetDateTime.now());
                }
            } else if ("DRAFT".equalsIgnoreCase(newStatus)) {
                blog.setStatus("DRAFT");
            }
        }

        Blog savedBlog = blogRepository.save(blog);
        if (becamePublished) {
            broadcastBlogPublishNotification(savedBlog);
        }
        return savedBlog;
    }

    @Transactional
    public void deleteBlog(UUID id, String currentUsername, boolean isAdmin) {
        Blog blog = blogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Blog not found"));

        boolean isAuthor = blog.getAuthorUsername().equalsIgnoreCase(currentUsername);
        if (!isAuthor && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only author or admin can delete this blog");
        }

        blogRepository.delete(blog);
    }

    @Transactional
    public Blog togglePublishStatus(UUID id, String currentUsername, boolean isAdmin) {
        Blog blog = blogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Blog not found"));

        boolean isAuthor = blog.getAuthorUsername().equalsIgnoreCase(currentUsername);
        if (!isAuthor && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only author or admin can publish/unpublish this blog");
        }

        boolean becamePublished = false;
        if ("PUBLISHED".equalsIgnoreCase(blog.getStatus())) {
            blog.setStatus("DRAFT");
        } else {
            blog.setStatus("PUBLISHED");
            becamePublished = true;
            if (blog.getPublishedAt() == null) {
                blog.setPublishedAt(OffsetDateTime.now());
            }
        }
        Blog savedBlog = blogRepository.save(blog);
        if (becamePublished) {
            broadcastBlogPublishNotification(savedBlog);
        }
        return savedBlog;
    }

    private void broadcastBlogPublishNotification(Blog blog) {
        try {
            String author = blog.getAuthorUsername() != null ? blog.getAuthorUsername() : "A user";
            String notifTitle = "New Blog Published: " + blog.getTitle();
            String notifMessage = author + " published a new blog post: \"" + blog.getTitle() + "\"";
            List<User> allUsers = userRepository.findAll();
            for (User u : allUsers) {
                if (u.getUsername() != null && !u.getUsername().equalsIgnoreCase(author)) {
                    notificationService.sendNotificationToUser(u, notifTitle, notifMessage);
                }
            }
        } catch (Exception e) {
            // Silently swallow notification errors
        }
    }

    public Map<String, String> uploadCoverImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File cannot be empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.startsWith("image/"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image files are allowed for cover images");
        }
        return storageService.storePublicMedia(file);
    }

    public Map<String, Object> toResponse(Blog blog) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", blog.getId());
        res.put("title", blog.getTitle());
        res.put("content", blog.getContent());
        res.put("category", blog.getCategory());
        res.put("coverImageUrl", blog.getCoverImageUrl());
        res.put("status", blog.getStatus());
        res.put("author", blog.getAuthorUsername());
        res.put("authorId", blog.getAuthor() != null ? blog.getAuthor().getId() : null);
        res.put("createdAt", blog.getCreatedAt());
        res.put("updatedAt", blog.getUpdatedAt());
        res.put("publishedAt", blog.getPublishedAt());
        return res;
    }

    private String sanitize(String str) {
        if (str == null) return "";
        return str.trim();
    }

    private String sanitizeHtml(String html) {
        if (html == null) return "";
        // Basic script tag and unsafe event handler sanitization
        return html.replaceAll("(?i)<script.*?>.*?</script>", "")
                   .replaceAll("(?i)javascript:", "")
                   .replaceAll("(?i)on\\w+\\s*=", "data-disabled=");
    }
}
