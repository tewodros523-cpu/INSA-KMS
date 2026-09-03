package com.enterprise.kms.service;

import com.enterprise.kms.dto.TopContributorDto;
import com.enterprise.kms.entity.MonthlyTopContributor;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.MonthlyTopContributorRepository;
import com.enterprise.kms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class AnalyticsService {
    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);
    private static final DateTimeFormatter MONTH_LABEL_FORMATTER = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);

    private final UserRepository userRepository;
    private final MonthlyTopContributorRepository monthlyRepository;

    public AnalyticsService(UserRepository userRepository, MonthlyTopContributorRepository monthlyRepository) {
        this.userRepository = userRepository;
        this.monthlyRepository = monthlyRepository;
    }

    /**
     * Retrieves the Monthly Top Contributors for the specified month (e.g. "2026-09").
     * Once evaluated, rankings remain pinned in the monthly_top_contributors table for that month.
     */
    @Transactional
    public List<TopContributorDto> getMonthlyTopContributors(String targetYearMonth, int limit) {
        int effLimit = limit > 0 ? limit : 3;
        String ymStr = (targetYearMonth != null && !targetYearMonth.isBlank())
                ? targetYearMonth.trim()
                : YearMonth.now(ZoneOffset.UTC).toString();

        // 1. Check if snapshot already exists for this month
        List<MonthlyTopContributor> existing = monthlyRepository.findByYearMonthOrderByRankAsc(ymStr);
        if (!existing.isEmpty()) {
            log.debug("Returning existing pinned monthly snapshot for {}", ymStr);
            return mapEntitiesToDtos(existing, ymStr);
        }

        // 2. If no snapshot exists yet, evaluate and persist it for this month
        log.info("No monthly snapshot found for {}. Evaluating and pinning rankings now...", ymStr);
        return evaluateAndSaveMonthlySnapshot(ymStr, effLimit);
    }

    /**
     * Evaluates monthly activity and saves the top contributors to the database.
     */
    @Transactional
    public List<TopContributorDto> evaluateAndSaveMonthlySnapshot(String ymStr, int limit) {
        int effLimit = limit > 0 ? limit : 3;
        YearMonth ym;
        try {
            ym = YearMonth.parse(ymStr);
        } catch (Exception e) {
            ym = YearMonth.now(ZoneOffset.UTC);
            ymStr = ym.toString();
        }

        OffsetDateTime start = ym.atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = ym.plusMonths(1).atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        // Query performance for content created within this month
        List<Object[]> rows = userRepository.findMonthlyTopContributorsNative(start, end, effLimit);

        // If no content was created in this month yet, fallback to all-time active users to avoid empty initial states
        if (rows.isEmpty() || rows.stream().allMatch(r -> getNum(r[9]) == 0L)) {
            List<Object[]> fallbackRows = userRepository.findTopContributorsNative(effLimit);
            if (!fallbackRows.isEmpty()) {
                rows = fallbackRows;
            }
        }

        // Clear existing records for this month if any
        monthlyRepository.deleteByYearMonth(ymStr);

        List<MonthlyTopContributor> savedEntities = new ArrayList<>();
        int rank = 1;
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        for (Object[] row : rows) {
            try {
                UUID employeeId = parseUuid(row[0]);
                if (employeeId == null) continue;

                User user = userRepository.findById(employeeId).orElse(null);
                if (user == null) continue;

                long docs = getNum(row[6]);
                long blogs = getNum(row[7]);
                long articles = getNum(row[8]);
                long total = getNum(row[9]);
                if (total == 0L) {
                    total = docs + blogs + articles;
                }

                MonthlyTopContributor entity = new MonthlyTopContributor(
                        ymStr,
                        rank++,
                        user,
                        docs,
                        blogs,
                        articles,
                        total,
                        now
                );
                savedEntities.add(monthlyRepository.save(entity));
            } catch (Exception ex) {
                log.error("Error persisting monthly top contributor for {}: {}", ymStr, ex.getMessage(), ex);
            }
        }

        return mapEntitiesToDtos(savedEntities, ymStr);
    }

    /**
     * Automatic Scheduled Evaluation: Runs on the 1st day of every month at midnight UTC.
     */
    @Scheduled(cron = "0 0 0 1 * ?", zone = "UTC")
    public void scheduledMonthlyEvaluation() {
        YearMonth currentMonth = YearMonth.now(ZoneOffset.UTC);
        log.info("Scheduled monthly evaluation triggered for {}", currentMonth);
        try {
            evaluateAndSaveMonthlySnapshot(currentMonth.toString(), 3);
        } catch (Exception e) {
            log.error("Failed to run scheduled monthly evaluation: {}", e.getMessage(), e);
        }
    }

    private List<TopContributorDto> mapEntitiesToDtos(List<MonthlyTopContributor> entities, String ymStr) {
        String monthLabel = formatMonthLabel(ymStr);
        List<TopContributorDto> dtos = new ArrayList<>();

        for (MonthlyTopContributor e : entities) {
            User u = e.getUser();
            String name = (u != null && u.getFullName() != null && !u.getFullName().isBlank())
                    ? u.getFullName()
                    : (u != null ? u.getUsername() : "Unknown");
            String username = u != null ? u.getUsername() : "";
            String email = u != null ? u.getEmail() : "";
            String dept = (u != null && u.getDepartment() != null) ? u.getDepartment().getName() : "Unassigned";
            String title = (u != null && u.getJobTitle() != null) ? u.getJobTitle() : "";

            dtos.add(new TopContributorDto(
                    e.getRank(),
                    u != null ? u.getId() : null,
                    name,
                    username,
                    email,
                    dept,
                    title,
                    null,
                    e.getDocumentsCount(),
                    e.getBlogsCount(),
                    e.getArticlesCount(),
                    e.getTotalContributions(),
                    e.getYearMonth(),
                    monthLabel,
                    e.getEvaluatedAt()
            ));
        }
        return dtos;
    }

    private String formatMonthLabel(String ymStr) {
        try {
            return YearMonth.parse(ymStr).format(MONTH_LABEL_FORMATTER);
        } catch (Exception e) {
            return ymStr;
        }
    }

    private UUID parseUuid(Object obj) {
        if (obj instanceof UUID) return (UUID) obj;
        if (obj != null) {
            try {
                return UUID.fromString(obj.toString());
            } catch (Exception ignored) {}
        }
        return null;
    }

    private long getNum(Object obj) {
        return (obj instanceof Number) ? ((Number) obj).longValue() : 0L;
    }
}
