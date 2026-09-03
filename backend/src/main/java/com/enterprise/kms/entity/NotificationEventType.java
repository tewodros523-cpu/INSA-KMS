package com.enterprise.kms.entity;

/**
 * Standardized notification event types for INSA KMS.
 */
public final class NotificationEventType {
    private NotificationEventType() {}

    // Document events
    public static final String DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED";
    public static final String DOCUMENT_UPDATED = "DOCUMENT_UPDATED";
    public static final String DOCUMENT_SUBMITTED = "DOCUMENT_SUBMITTED";
    public static final String DOCUMENT_APPROVAL_REQUIRED = "DOCUMENT_APPROVAL_REQUIRED";
    public static final String DOCUMENT_APPROVED = "DOCUMENT_APPROVED";
    public static final String DOCUMENT_REJECTED = "DOCUMENT_REJECTED";
    public static final String DOCUMENT_SHARED = "DOCUMENT_SHARED";
    public static final String DOCUMENT_PERMISSION_GRANTED = "DOCUMENT_PERMISSION_GRANTED";
    public static final String DOCUMENT_COMMENT_ADDED = "DOCUMENT_COMMENT_ADDED";
    public static final String DOCUMENT_CHECKED_OUT = "DOCUMENT_CHECKED_OUT";
    public static final String DOCUMENT_CHECKED_IN = "DOCUMENT_CHECKED_IN";
    public static final String DOCUMENT_VERSION_CREATED = "DOCUMENT_VERSION_CREATED";
    public static final String DOCUMENT_DELETED = "DOCUMENT_DELETED";

    // Knowledge Transfer events
    public static final String KT_CASE_CREATED = "KT_CASE_CREATED";
    public static final String KT_CASE_UPDATED = "KT_CASE_UPDATED";
    public static final String KT_SUCCESSOR_ASSIGNED = "KT_SUCCESSOR_ASSIGNED";
    public static final String KT_PLAN_UPDATED = "KT_PLAN_UPDATED";
    public static final String KT_CHECKLIST_ASSIGNED = "KT_CHECKLIST_ASSIGNED";
    public static final String KT_CHECKLIST_UPDATED = "KT_CHECKLIST_UPDATED";
    public static final String KT_KNOWLEDGE_SUBMITTED = "KT_KNOWLEDGE_SUBMITTED";
    public static final String KT_CHANGES_REQUESTED = "KT_CHANGES_REQUESTED";
    public static final String KT_APPROVED = "KT_APPROVED";
    public static final String KT_SESSION_SCHEDULED = "KT_SESSION_SCHEDULED";
    public static final String KT_ATTENDANCE_UPDATED = "KT_ATTENDANCE_UPDATED";
    public static final String KT_EXIT_CLEARANCE = "KT_EXIT_CLEARANCE";
    public static final String KT_FINAL_CLEARANCE = "KT_FINAL_CLEARANCE";

    // HR events
    public static final String HR_PROFILE_UPDATED = "HR_PROFILE_UPDATED";
    public static final String HR_DEPARTMENT_CHANGED = "HR_DEPARTMENT_CHANGED";
    public static final String HR_MANAGER_CHANGED = "HR_MANAGER_CHANGED";
    public static final String HR_STATUS_CHANGED = "HR_STATUS_CHANGED";

    // Administration events
    public static final String USER_CREATED = "USER_CREATED";
    public static final String USER_ROLE_CHANGED = "USER_ROLE_CHANGED";
    public static final String USER_ACTIVATED = "USER_ACTIVATED";
    public static final String USER_DEACTIVATED = "USER_DEACTIVATED";
    public static final String DEPARTMENT_CREATED = "DEPARTMENT_CREATED";
    public static final String DEPARTMENT_UPDATED = "DEPARTMENT_UPDATED";
    public static final String DOCUMENT_TYPE_CREATED = "DOCUMENT_TYPE_CREATED";
    public static final String DOCUMENT_TYPE_UPDATED = "DOCUMENT_TYPE_UPDATED";

    // Security & Search
    public static final String SEARCH_ALERT = "SEARCH_ALERT";
    public static final String SECURITY_EVENT = "SECURITY_EVENT";
    public static final String SYSTEM = "SYSTEM";

    // Blog & Discussion events
    public static final String BLOG_COMMENT_ADDED = "BLOG_COMMENT_ADDED";
    public static final String BLOG_REPLY_ADDED = "BLOG_REPLY_ADDED";
}
