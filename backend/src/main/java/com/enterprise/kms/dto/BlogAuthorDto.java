package com.enterprise.kms.dto;

import java.util.UUID;

public class BlogAuthorDto {
    private UUID id;
    private String name;
    private String username;
    private String department;
    private String jobTitle;
    private String profileImage;

    public BlogAuthorDto() {
    }

    public BlogAuthorDto(UUID id, String name, String username, String department, String jobTitle, String profileImage) {
        this.id = id;
        this.name = name;
        this.username = username;
        this.department = department;
        this.jobTitle = jobTitle;
        this.profileImage = profileImage;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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
}
