package com.enterprise.kms.dto;

import java.util.LinkedHashMap;
import java.util.Map;

public class BlogReactionsDto {
    private Map<String, Long> counts = new LinkedHashMap<>();
    private String currentUserReaction;
    private long totalReactions;

    public BlogReactionsDto() {
        counts.put("like", 0L);
        counts.put("love", 0L);
        counts.put("insightful", 0L);
        counts.put("helpful", 0L);
    }

    public BlogReactionsDto(Map<String, Long> counts, String currentUserReaction, long totalReactions) {
        this.counts = counts != null ? counts : new LinkedHashMap<>();
        this.currentUserReaction = currentUserReaction;
        this.totalReactions = totalReactions;
    }

    public Map<String, Long> getCounts() {
        return counts;
    }

    public void setCounts(Map<String, Long> counts) {
        this.counts = counts;
    }

    public String getCurrentUserReaction() {
        return currentUserReaction;
    }

    public void setCurrentUserReaction(String currentUserReaction) {
        this.currentUserReaction = currentUserReaction;
    }

    public long getTotalReactions() {
        return totalReactions;
    }

    public void setTotalReactions(long totalReactions) {
        this.totalReactions = totalReactions;
    }
}
