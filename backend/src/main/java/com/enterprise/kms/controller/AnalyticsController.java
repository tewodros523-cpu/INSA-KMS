package com.enterprise.kms.controller;

import com.enterprise.kms.dto.TopContributorDto;
import com.enterprise.kms.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/analytics", "/api/analytics"})
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    /**
     * Get monthly top contributors (pinned for the month).
     * Defaults to the current calendar month (e.g. "2026-09").
     */
    @GetMapping("/top-contributors")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TopContributorDto>> getTopContributors(
            @RequestParam(name = "yearMonth", required = false) String yearMonth,
            @RequestParam(name = "limit", defaultValue = "3") int limit) {
        return ResponseEntity.ok(analyticsService.getMonthlyTopContributors(yearMonth, limit));
    }

    /**
     * Manually trigger/recalculate monthly evaluation (Admin only).
     */
    @PostMapping("/top-contributors/evaluate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TopContributorDto>> evaluateMonthly(
            @RequestParam(name = "yearMonth", required = false) String yearMonth,
            @RequestParam(name = "limit", defaultValue = "3") int limit) {
        return ResponseEntity.ok(analyticsService.evaluateAndSaveMonthlySnapshot(yearMonth, limit));
    }
}
