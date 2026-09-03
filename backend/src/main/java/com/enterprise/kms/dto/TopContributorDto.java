package com.enterprise.kms.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class TopContributorDto {
    private int rank;
    private UUID employeeId;
    private String name;
    private String username;
    private String email;
    private String department;
    private String jobTitle;
    private String profileImage;
    private long documents;
    private long blogs;
    private long articles;
    private long totalContributions;
    private String yearMonth;
    private String monthLabel;
    private OffsetDateTime evaluatedAt;

    public TopContributorDto() {
    }

    public TopContributorDto(int rank, UUID employeeId, String name, String username, String email,
                             String department, String jobTitle, String profileImage,
                             long documents, long blogs, long articles, long totalContributions) {
        this(rank, employeeId, name, username, email, department, jobTitle, profileImage,
             documents, blogs, articles, totalContributions, null, null, OffsetDateTime.now());
    }

    public TopContributorDto(int rank, UUID employeeId, String name, String username, String email,
                             String department, String jobTitle, String profileImage,
                             long documents, long blogs, long articles, long totalContributions,
                             String yearMonth, String monthLabel, OffsetDateTime evaluatedAt) {
        this.rank = rank;
        this.employeeId = employeeId;
        this.name = name;
        this.username = username;
        this.email = email;
        this.department = department;
        this.jobTitle = jobTitle;
        this.profileImage = profileImage;
        this.documents = documents;
        this.blogs = blogs;
        this.articles = articles;
        this.totalContributions = totalContributions;
        this.yearMonth = yearMonth;
        this.monthLabel = monthLabel;
        this.evaluatedAt = evaluatedAt != null ? evaluatedAt : OffsetDateTime.now();
    }

    public int getRank() {
        return rank;
    }

    public void setRank(int rank) {
        this.rank = rank;
    }

    public UUID getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(UUID employeeId) {
        this.employeeId = employeeId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public String getProfileImage() {
        return profileImage;
    }

    public void setProfileImage(String profileImage) {
        this.profileImage = profileImage;
    }

    public long getDocuments() {
        return documents;
    }

    public void setDocuments(long documents) {
        this.documents = documents;
    }

    public long getBlogs() {
        return blogs;
    }

    public void setBlogs(long blogs) {
        this.blogs = blogs;
    }

    public long getArticles() {
        return articles;
    }

    public void setArticles(long articles) {
        this.articles = articles;
    }

    public long getTotalContributions() {
        return totalContributions;
    }

    public void setTotalContributions(long totalContributions) {
        this.totalContributions = totalContributions;
    }

    public String getYearMonth() {
        return yearMonth;
    }

    public void setYearMonth(String yearMonth) {
        this.yearMonth = yearMonth;
    }

    public String getMonthLabel() {
        return monthLabel;
    }

    public void setMonthLabel(String monthLabel) {
        this.monthLabel = monthLabel;
    }

    public OffsetDateTime getEvaluatedAt() {
        return evaluatedAt;
    }

    public void setEvaluatedAt(OffsetDateTime evaluatedAt) {
        this.evaluatedAt = evaluatedAt;
    }
}
