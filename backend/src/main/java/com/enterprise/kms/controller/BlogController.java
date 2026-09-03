package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Blog;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.BlogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/blogs")
public class BlogController {
    private final BlogService blogService;

    public BlogController(BlogService blogService) {
        this.blogService = blogService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<Map<String, Object>>> getPublishedBlogs(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "category", required = false) String category,
            Pageable pageable) {
        return ResponseEntity.ok(blogService.getPublishedBlogs(search, category, pageable));
    }

    @GetMapping("/my-blogs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<Map<String, Object>>> getMyBlogs(Pageable pageable) {
        String username = SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(blogService.getMyBlogs(username, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @AuditLog(action = "BLOG_VIEW", resourceType = "BLOG")
    public ResponseEntity<Map<String, Object>> getBlogById(@PathVariable UUID id) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        return ResponseEntity.ok(blogService.getBlogById(id, username, isAdmin));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @AuditLog(action = "BLOG_CREATE", resourceType = "BLOG")
    public ResponseEntity<Map<String, Object>> createBlog(@RequestBody Map<String, Object> body) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        Blog blog = blogService.createBlog(body, username, isAdmin);
        return ResponseEntity.ok(blogService.toResponse(blog));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @AuditLog(action = "BLOG_UPDATE", resourceType = "BLOG")
    public ResponseEntity<Map<String, Object>> updateBlog(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        Blog blog = blogService.updateBlog(id, body, username, isAdmin);
        return ResponseEntity.ok(blogService.toResponse(blog));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @AuditLog(action = "BLOG_DELETE", resourceType = "BLOG")
    public ResponseEntity<Void> deleteBlog(@PathVariable UUID id) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        blogService.deleteBlog(id, username, isAdmin);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/publish")
    @PreAuthorize("isAuthenticated()")
    @AuditLog(action = "BLOG_PUBLISH_TOGGLE", resourceType = "BLOG")
    public ResponseEntity<Map<String, Object>> togglePublishStatus(@PathVariable UUID id) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        Blog blog = blogService.togglePublishStatus(id, username, isAdmin);
        return ResponseEntity.ok(blogService.toResponse(blog));
    }

    @PostMapping("/cover-image")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> uploadCoverImage(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(blogService.uploadCoverImage(file));
    }
}
