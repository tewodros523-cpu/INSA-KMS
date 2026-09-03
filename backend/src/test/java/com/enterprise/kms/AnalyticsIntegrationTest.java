package com.enterprise.kms;

import com.enterprise.kms.controller.AnalyticsController;
import com.enterprise.kms.dto.TopContributorDto;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.AnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnalyticsIntegrationTest {

    private UserRepository userRepository;
    private AnalyticsService analyticsService;
    private AnalyticsController analyticsController;

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(UserRepository.class);
        analyticsService = new AnalyticsService(userRepository);
        analyticsController = new AnalyticsController(analyticsService);
    }

    @Test
    @DisplayName("1. Top Contributors - Correctly maps ranking and calculates scores")
    void testTopContributors_CalculationAndRanking() {
        UUID u1 = UUID.randomUUID();
        UUID u2 = UUID.randomUUID();
        UUID u3 = UUID.randomUUID();

        List<Object[]> mockRows = new ArrayList<>();
        // Employee A: 10 docs + 5 blogs + 3 articles = 18
        mockRows.add(new Object[]{u1, "Employee A", "emp_a", "emp_a@kms.internal", "Finance", "Analyst", 10L, 5L, 3L, 18L});
        // Employee B: 7 docs + 8 blogs + 1 article = 16
        mockRows.add(new Object[]{u2, "Employee B", "emp_b", "emp_b@kms.internal", "IT Security", "Engineer", 7L, 8L, 1L, 16L});
        // Employee C: 5 docs + 4 blogs + 6 articles = 15
        mockRows.add(new Object[]{u3, "Employee C", "emp_c", "emp_c@kms.internal", "HR", "Specialist", 5L, 4L, 6L, 15L});

        when(userRepository.findTopContributorsNative(3)).thenReturn(mockRows);

        List<TopContributorDto> result = analyticsService.getTopContributors(3);
        assertNotNull(result);
        assertEquals(3, result.size());

        // Verify Rank 1
        TopContributorDto top1 = result.get(0);
        assertEquals(1, top1.getRank());
        assertEquals("Employee A", top1.getName());
        assertEquals(10L, top1.getDocuments());
        assertEquals(5L, top1.getBlogs());
        assertEquals(3L, top1.getArticles());
        assertEquals(18L, top1.getTotalContributions());
        assertEquals("Finance", top1.getDepartment());

        // Verify Rank 2
        TopContributorDto top2 = result.get(1);
        assertEquals(2, top2.getRank());
        assertEquals("Employee B", top2.getName());
        assertEquals(7L, top2.getDocuments());
        assertEquals(8L, top2.getBlogs());
        assertEquals(1L, top2.getArticles());
        assertEquals(16L, top2.getTotalContributions());

        // Verify Rank 3
        TopContributorDto top3 = result.get(2);
        assertEquals(3, top3.getRank());
        assertEquals("Employee C", top3.getName());
        assertEquals(5L, top3.getDocuments());
        assertEquals(4L, top3.getBlogs());
        assertEquals(6L, top3.getArticles());
        assertEquals(15L, top3.getTotalContributions());
    }

    @Test
    @DisplayName("2. Top Contributors - Controller endpoint returns 200 OK")
    void testTopContributors_ControllerEndpoint() {
        when(userRepository.findTopContributorsNative(3)).thenReturn(List.of());

        ResponseEntity<List<TopContributorDto>> response = analyticsController.getTopContributors(3);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isEmpty());
    }

    @Test
    @DisplayName("3. Top Contributors - Handles employees with zero contributions")
    void testTopContributors_HandlesZeroContributions() {
        UUID u1 = UUID.randomUUID();
        List<Object[]> mockRows = new ArrayList<>();
        mockRows.add(new Object[]{u1, "Inactive User", "user_zero", "zero@kms.internal", "Unassigned", "", 0L, 0L, 0L, 0L});

        when(userRepository.findTopContributorsNative(3)).thenReturn(mockRows);

        List<TopContributorDto> result = analyticsService.getTopContributors(3);
        assertEquals(1, result.size());
        assertEquals(0L, result.get(0).getTotalContributions());
        assertEquals(1, result.get(0).getRank());
    }
}
