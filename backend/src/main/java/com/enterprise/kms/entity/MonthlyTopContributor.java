package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "monthly_top_contributors")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MonthlyTopContributor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "year_month", nullable = false, length = 7)
    private String yearMonth;

    @Column(nullable = false)
    private Integer rank;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "documents_count", nullable = false)
    private Long documentsCount = 0L;

    @Column(name = "blogs_count", nullable = false)
    private Long blogsCount = 0L;

    @Column(name = "articles_count", nullable = false)
    private Long articlesCount = 0L;

    @Column(name = "total_contributions", nullable = false)
    private Long totalContributions = 0L;

    @Column(name = "evaluated_at", nullable = false)
    private OffsetDateTime evaluatedAt = OffsetDateTime.now();

    public MonthlyTopContributor() {
    }

    public MonthlyTopContributor(String yearMonth, Integer rank, User user,
                                 Long documentsCount, Long blogsCount, Long articlesCount,
                                 Long totalContributions, OffsetDateTime evaluatedAt) {
        this.yearMonth = yearMonth;
        this.rank = rank;
        this.user = user;
        this.documentsCount = documentsCount;
        this.blogsCount = blogsCount;
        this.articlesCount = articlesCount;
        this.totalContributions = totalContributions;
        this.evaluatedAt = evaluatedAt != null ? evaluatedAt : OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getYearMonth() {
        return yearMonth;
    }

    public void setYearMonth(String yearMonth) {
        this.yearMonth = yearMonth;
    }

    public Integer getRank() {
        return rank;
    }

    public void setRank(Integer rank) {
        this.rank = rank;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Long getDocumentsCount() {
        return documentsCount;
    }

    public void setDocumentsCount(Long documentsCount) {
        this.documentsCount = documentsCount;
    }

    public Long getBlogsCount() {
        return blogsCount;
    }

    public void setBlogsCount(Long blogsCount) {
        this.blogsCount = blogsCount;
    }

    public Long getArticlesCount() {
        return articlesCount;
    }

    public void setArticlesCount(Long articlesCount) {
        this.articlesCount = articlesCount;
    }

    public Long getTotalContributions() {
        return totalContributions;
    }

    public void setTotalContributions(Long totalContributions) {
        this.totalContributions = totalContributions;
    }

    public OffsetDateTime getEvaluatedAt() {
        return evaluatedAt;
    }

    public void setEvaluatedAt(OffsetDateTime evaluatedAt) {
        this.evaluatedAt = evaluatedAt;
    }
}
