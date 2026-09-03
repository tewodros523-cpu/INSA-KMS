package com.enterprise.kms;

import com.enterprise.kms.controller.AnalyticsController;
import com.enterprise.kms.dto.TopContributorDto;
import com.enterprise.kms.entity.Department;
import com.enterprise.kms.entity.MonthlyTopContributor;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.MonthlyTopContributorRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.AnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AnalyticsIntegrationTest {

    private UserRepository userRepository;
    private MonthlyTopContributorRepository monthlyRepository;
    private AnalyticsService analyticsService;
    private AnalyticsController analyticsController;

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(UserRepository.class);
        monthlyRepository = Mockito.mock(MonthlyTopContributorRepository.class);
        analyticsService = new AnalyticsService(userRepository, monthlyRepository);
        analyticsController = new AnalyticsController(analyticsService);
    }

    @Test
    @DisplayName("1. Monthly Top Contributors - Returns existing pinned monthly snapshot")
    void testMonthlyTopContributors_ReturnsExistingSnapshot() {
        UUID u1 = UUID.randomUUID();
        User user1 = new User();
        user1.setId(u1);
        user1.setUsername("emp_a");
        user1.setFullName("Employee A");
        Department dept = new Department();
        dept.setName("Finance");
        user1.setDepartment(dept);

        MonthlyTopContributor snapshot = new MonthlyTopContributor(
                "2026-09",
                1,
                user1,
                10L,
                5L,
                3L,
                18L,
                OffsetDateTime.now()
        );

        when(monthlyRepository.findByYearMonthOrderByRankAsc("2026-09")).thenReturn(List.of(snapshot));

        List<TopContributorDto> result = analyticsService.getMonthlyTopContributors("2026-09", 3);
        assertNotNull(result);
        assertEquals(1, result.size());

        TopContributorDto top1 = result.get(0);
        assertEquals(1, top1.getRank());
        assertEquals("Employee A", top1.getName());
        assertEquals(10L, top1.getDocuments());
        assertEquals(5L, top1.getBlogs());
        assertEquals(3L, top1.getArticles());
        assertEquals(18L, top1.getTotalContributions());
        assertEquals("2026-09", top1.getYearMonth());
        assertEquals("September 2026", top1.getMonthLabel());

        // Verify no new evaluation was triggered
        verify(userRepository, never()).findMonthlyTopContributorsNative(any(), any(), anyInt());
    }

    @Test
    @DisplayName("2. Monthly Top Contributors - Evaluates and saves snapshot if none exists")
    void testMonthlyTopContributors_EvaluatesAndPinsSnapshot() {
        UUID u1 = UUID.randomUUID();
        User user1 = new User();
        user1.setId(u1);
        user1.setUsername("emp_a");
        user1.setFullName("Employee A");

        when(monthlyRepository.findByYearMonthOrderByRankAsc("2026-09")).thenReturn(List.of());
        when(userRepository.findById(u1)).thenReturn(Optional.of(user1));

        List<Object[]> mockRows = new ArrayList<>();
        mockRows.add(new Object[]{u1, "Employee A", "emp_a", "emp_a@kms.internal", "Finance", "Analyst", 7L, 2L, 1L, 10L});
        when(userRepository.findMonthlyTopContributorsNative(any(), any(), eq(3))).thenReturn(mockRows);

        when(monthlyRepository.save(any(MonthlyTopContributor.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<TopContributorDto> result = analyticsService.getMonthlyTopContributors("2026-09", 3);
        assertNotNull(result);
        assertEquals(1, result.size());

        TopContributorDto top1 = result.get(0);
        assertEquals(1, top1.getRank());
        assertEquals("Employee A", top1.getName());
        assertEquals(10L, top1.getTotalContributions());

        // Verify snapshot was persisted
        verify(monthlyRepository, atLeastOnce()).save(any(MonthlyTopContributor.class));
    }

    @Test
    @DisplayName("3. Monthly Top Contributors - Controller endpoints return 200 OK")
    void testMonthlyTopContributors_ControllerEndpoints() {
        when(monthlyRepository.findByYearMonthOrderByRankAsc("2026-09")).thenReturn(List.of());
        when(userRepository.findMonthlyTopContributorsNative(any(), any(), eq(3))).thenReturn(List.of());

        ResponseEntity<List<TopContributorDto>> getResp = analyticsController.getTopContributors("2026-09", 3);
        assertEquals(HttpStatus.OK, getResp.getStatusCode());

        ResponseEntity<List<TopContributorDto>> postResp = analyticsController.evaluateMonthly("2026-09", 3);
        assertEquals(HttpStatus.OK, postResp.getStatusCode());
    }
}
