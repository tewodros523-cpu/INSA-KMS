package com.enterprise.kms.service;

import com.enterprise.kms.dto.TopContributorDto;
import com.enterprise.kms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AnalyticsService {
    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    private final UserRepository userRepository;

    public AnalyticsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<TopContributorDto> getTopContributors(int limit) {
        int effLimit = limit > 0 ? limit : 3;
        List<Object[]> rows = userRepository.findTopContributorsNative(effLimit);
        List<TopContributorDto> result = new ArrayList<>();

        int rank = 1;
        for (Object[] row : rows) {
            try {
                UUID employeeId = null;
                if (row[0] instanceof UUID) {
                    employeeId = (UUID) row[0];
                } else if (row[0] != null) {
                    employeeId = UUID.fromString(row[0].toString());
                }

                String name = row[1] != null ? row[1].toString() : "Unknown";
                String username = row[2] != null ? row[2].toString() : "";
                String email = row[3] != null ? row[3].toString() : "";
                String department = row[4] != null ? row[4].toString() : "Unassigned";
                String jobTitle = row[5] != null ? row[5].toString() : "";

                long documents = row[6] instanceof Number ? ((Number) row[6]).longValue() : 0L;
                long blogs = row[7] instanceof Number ? ((Number) row[7]).longValue() : 0L;
                long articles = row[8] instanceof Number ? ((Number) row[8]).longValue() : 0L;
                long totalContributions = row[9] instanceof Number ? ((Number) row[9]).longValue() : (documents + blogs + articles);

                TopContributorDto dto = new TopContributorDto(
                        rank++,
                        employeeId,
                        name,
                        username,
                        email,
                        department,
                        jobTitle,
                        null,
                        documents,
                        blogs,
                        articles,
                        totalContributions
                );
                result.add(dto);
            } catch (Exception e) {
                log.error("Error mapping top contributor row: {}", e.getMessage(), e);
            }
        }

        return result;
    }
}
