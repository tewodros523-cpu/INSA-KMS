package com.enterprise.kms.controller;

import com.enterprise.kms.dto.TopContributorDto;
import com.enterprise.kms.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/analytics", "/api/analytics"})
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/top-contributors")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TopContributorDto>> getTopContributors(
            @RequestParam(name = "limit", defaultValue = "3") int limit) {
        return ResponseEntity.ok(analyticsService.getTopContributors(limit));
    }
}
