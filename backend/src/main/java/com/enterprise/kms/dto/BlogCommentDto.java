package com.enterprise.kms.dto;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class BlogCommentDto {
    private UUID id;
    private String content;
    private BlogAuthorDto author;
    private UUID parentCommentId;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<BlogCommentDto> replies = new ArrayList<>();
    private int replyCount;

    public BlogCommentDto() {
    }

    public BlogCommentDto(UUID id, String content, BlogAuthorDto author, UUID parentCommentId,
                          OffsetDateTime createdAt, OffsetDateTime updatedAt,
                          List<BlogCommentDto> replies, int replyCount) {
        this.id = id;
        this.content = content;
        this.author = author;
        this.parentCommentId = parentCommentId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.replies = replies != null ? replies : new ArrayList<>();
        this.replyCount = replyCount;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public BlogAuthorDto getAuthor() {
        return author;
    }

    public void setAuthor(BlogAuthorDto author) {
        this.author = author;
    }

    public UUID getParentCommentId() {
        return parentCommentId;
    }

    public void setParentCommentId(UUID parentCommentId) {
        this.parentCommentId = parentCommentId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<BlogCommentDto> getReplies() {
        return replies;
    }

    public void setReplies(List<BlogCommentDto> replies) {
        this.replies = replies;
    }

    public int getReplyCount() {
        return replyCount;
    }

    public void setReplyCount(int replyCount) {
        this.replyCount = replyCount;
    }
}
