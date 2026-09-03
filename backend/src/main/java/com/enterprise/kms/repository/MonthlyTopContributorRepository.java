package com.enterprise.kms.repository;

import com.enterprise.kms.entity.MonthlyTopContributor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MonthlyTopContributorRepository extends JpaRepository<MonthlyTopContributor, UUID> {
    List<MonthlyTopContributor> findByYearMonthOrderByRankAsc(String yearMonth);
    boolean existsByYearMonth(String yearMonth);
    void deleteByYearMonth(String yearMonth);
}
