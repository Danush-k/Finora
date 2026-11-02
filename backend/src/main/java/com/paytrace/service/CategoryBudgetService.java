package com.paytrace.service;

import com.paytrace.dto.response.CategoryBudgetStatusDto;
import com.paytrace.model.CategoryBudget;
import com.paytrace.model.Transaction;
import com.paytrace.model.enums.TransactionType;
import com.paytrace.repository.CategoryBudgetRepository;
import com.paytrace.repository.TransactionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.CompoundIndexDefinition;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryBudgetService {

    private final CategoryBudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final MongoTemplate mongoTemplate;

    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    public static final String OVERALL_CATEGORY = "__OVERALL__";

    public static final List<String> STANDARD_CATEGORIES = List.of(
        "Food & Dining",
        "Shopping",
        "Groceries",
        "Travel & Fuel",
        "Utilities & Bills",
        "Entertainment",
        "Health & Medical",
        "Education & Fees",
        "Investment",
        "Other"
    );

    @PostConstruct
    public void initIndexes() {
        try {
            // Drop old unique index on category if it exists to allow multiple months per category
            mongoTemplate.indexOps("category_budgets").dropIndex("category");
        } catch (Exception ignored) {}
        try {
            mongoTemplate.indexOps("category_budgets").dropIndex("category_1");
        } catch (Exception ignored) {}
        try {
            mongoTemplate.indexOps("category_budgets").ensureIndex(
                new CompoundIndexDefinition(
                    new Document("category", 1).append("year", 1).append("month", 1)
                )
            );
        } catch (Exception e) {
            log.warn("Could not ensure compound index on category_budgets: {}", e.getMessage());
        }
    }

    public YearMonth getEarliestAllowedMonth() {
        LocalDate now = LocalDate.now(ZONE);
        YearMonth currentCalendar = YearMonth.from(now);
        YearMonth earliest = currentCalendar;

        Optional<Transaction> latestOpt = transactionRepository.findTop10ByOrderByTransactionDateDesc().stream().findFirst();
        if (latestOpt.isPresent()) {
            YearMonth latestTxnMonth = YearMonth.from(latestOpt.get().getTransactionDate().atZone(ZONE));
            if (latestTxnMonth.isBefore(earliest)) {
                earliest = latestTxnMonth;
            }
        }
        return earliest;
    }

    public boolean isPastMonth(int year, int month) {
        YearMonth target = YearMonth.of(year, month);
        LocalDate now = LocalDate.now(ZONE);
        return target.isBefore(YearMonth.from(now));
    }

    public List<CategoryBudget> getAllBudgets() {
        return budgetRepository.findAll();
    }

    public static class ResolvedBudget {
        public CategoryBudget budget;
        public boolean isInherited;

        public ResolvedBudget(CategoryBudget budget, boolean isInherited) {
            this.budget = budget;
            this.isInherited = isInherited;
        }
    }

    public ResolvedBudget resolveBudget(String category, int year, int month) {
        // 1. Check exact match for (category, year, month)
        Optional<CategoryBudget> exact = budgetRepository.findByCategoryAndYearAndMonth(category, year, month);
        if (exact.isPresent()) {
            return new ResolvedBudget(exact.get(), false);
        }

        // 2. Check for the most recent earlier month with applyToUpcoming == true
        List<CategoryBudget> earlierUpcoming = budgetRepository.findByCategoryAndApplyToUpcomingTrue(category);
        Optional<CategoryBudget> latestApplicable = earlierUpcoming.stream()
            .filter(b -> b.getYear() != null && b.getMonth() != null)
            .filter(b -> b.getYear() < year || (b.getYear() == year && b.getMonth() < month))
            .max(Comparator.comparingInt(CategoryBudget::getYear)
                .thenComparingInt(CategoryBudget::getMonth));

        if (latestApplicable.isPresent()) {
            return new ResolvedBudget(latestApplicable.get(), true);
        }

        // 3. Fallback to legacy default where year == null if any exists
        Optional<CategoryBudget> legacy = budgetRepository.findFirstByCategoryAndYearIsNull(category);
        if (legacy.isPresent()) {
            return new ResolvedBudget(legacy.get(), true);
        }

        return new ResolvedBudget(null, false);
    }

    public CategoryBudget saveBudget(String category, String limitType, BigDecimal limitValue) {
        YearMonth active = getEarliestAllowedMonth();
        return saveBudget(category, limitType, limitValue, active.getYear(), active.getMonthValue(), false);
    }

    public CategoryBudget saveBudget(String category, String limitType, BigDecimal limitValue,
                                     Integer year, Integer month, Boolean applyToUpcoming) {
        if (category == null || category.trim().isEmpty()) {
            throw new IllegalArgumentException("Category is required");
        }
        category = category.trim();

        if (year == null || month == null) {
            YearMonth active = getEarliestAllowedMonth();
            year = active.getYear();
            month = active.getMonthValue();
        }

        // Strictly enforce: Limits can only be configured for the current month or future months!
        if (isPastMonth(year, month)) {
            throw new IllegalArgumentException(
                "Spending limits can only be set for the current month or future months. "
                + YearMonth.of(year, month) + " is a past month and cannot be modified."
            );
        }

        boolean willApplyToUpcoming = Boolean.TRUE.equals(applyToUpcoming);

        if (limitValue == null || limitValue.compareTo(BigDecimal.ZERO) <= 0) {
            // Delete limit for this specific month
            budgetRepository.findByCategoryAndYearAndMonth(category, year, month)
                .ifPresent(budgetRepository::delete);

            // Also clean up legacy unassigned record if it matches
            budgetRepository.findFirstByCategoryAndYearIsNull(category)
                .ifPresent(budgetRepository::delete);

            // If applying to upcoming months, clear any future month overrides so future months also have no limit
            if (willApplyToUpcoming) {
                final int finalYear = year;
                final int finalMonth = month;
                List<CategoryBudget> futureList = budgetRepository.findByCategory(category).stream()
                    .filter(b -> b.getYear() != null && b.getMonth() != null)
                    .filter(b -> b.getYear() > finalYear || (b.getYear() == finalYear && b.getMonth() > finalMonth))
                    .toList();
                budgetRepository.deleteAll(futureList);
            }
            return null;
        }

        if (limitType == null || (!limitType.equalsIgnoreCase("PERCENTAGE") && !limitType.equalsIgnoreCase("RUPEES"))) {
            limitType = "RUPEES";
        }

        Optional<CategoryBudget> existingOpt = budgetRepository.findByCategoryAndYearAndMonth(category, year, month);
        CategoryBudget budget;
        if (existingOpt.isPresent()) {
            budget = existingOpt.get();
            budget.setLimitType(limitType.toUpperCase(Locale.ROOT));
            budget.setLimitValue(limitValue);
            budget.setApplyToUpcoming(willApplyToUpcoming);
            budget.setUpdatedAt(Instant.now());
        } else {
            budget = CategoryBudget.builder()
                .category(category)
                .year(year)
                .month(month)
                .applyToUpcoming(willApplyToUpcoming)
                .limitType(limitType.toUpperCase(Locale.ROOT))
                .limitValue(limitValue)
                .period("MONTHLY")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        }

        CategoryBudget saved = budgetRepository.save(budget);

        // If applyToUpcoming is true, remove explicit future overrides so upcoming months inherit this new limit
        if (willApplyToUpcoming) {
            final int finalYear = year;
            final int finalMonth = month;
            List<CategoryBudget> futureList = budgetRepository.findByCategory(category).stream()
                .filter(b -> b.getYear() != null && b.getMonth() != null)
                .filter(b -> b.getYear() > finalYear || (b.getYear() == finalYear && b.getMonth() > finalMonth))
                .toList();
            if (!futureList.isEmpty()) {
                budgetRepository.deleteAll(futureList);
            }
        }

        return saved;
    }

    public void deleteBudget(String category) {
        budgetRepository.deleteByCategory(category);
    }

    public com.paytrace.dto.response.BudgetSummaryResponseDto getBudgetSummary(Integer year, Integer month) {
        YearMonth activeMonth;
        if (year != null && month != null) {
            activeMonth = YearMonth.of(year, month);
        } else {
            LocalDate now = LocalDate.now(ZONE);
            activeMonth = YearMonth.from(now);
        }

        boolean isPast = isPastMonth(activeMonth.getYear(), activeMonth.getMonthValue());

        Instant startOfMonth = activeMonth.atDay(1).atStartOfDay(ZONE).toInstant();
        Instant endOfMonth = activeMonth.atEndOfMonth().atTime(23, 59, 59, 999_999_999).atZone(ZONE).toInstant();

        List<Transaction> monthlyTxns = transactionRepository
            .findByTransactionDateBetweenOrderByTransactionDateDesc(startOfMonth, endOfMonth);

        BigDecimal totalExpenses = BigDecimal.ZERO;
        Map<String, BigDecimal> categorySpendMap = new HashMap<>();

        for (Transaction t : monthlyTxns) {
            if (t.getTransactionType() == TransactionType.EXPENSE) {
                BigDecimal amt = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;
                totalExpenses = totalExpenses.add(amt);
                String cat = t.getCategory() != null ? t.getCategory().trim() : "Other";
                categorySpendMap.put(cat, categorySpendMap.getOrDefault(cat, BigDecimal.ZERO).add(amt));
            }
        }

        // Build list for all categories (excluding internal OVERALL_CATEGORY)
        Set<String> allCategories = new LinkedHashSet<>(STANDARD_CATEGORIES);
        allCategories.addAll(categorySpendMap.keySet());
        for (CategoryBudget b : budgetRepository.findAll()) {
            if (b.getCategory() != null && !OVERALL_CATEGORY.equals(b.getCategory())) {
                allCategories.add(b.getCategory());
            }
        }

        BigDecimal totalAllocated = BigDecimal.ZERO;
        List<CategoryBudgetStatusDto> categoryStatuses = new ArrayList<>();

        for (String cat : allCategories) {
            if (OVERALL_CATEGORY.equals(cat)) continue;

            BigDecimal spend = categorySpendMap.getOrDefault(cat, BigDecimal.ZERO);
            ResolvedBudget resolved = resolveBudget(cat, activeMonth.getYear(), activeMonth.getMonthValue());
            CategoryBudget b = resolved.budget;

            if (b == null || b.getLimitValue() == null || b.getLimitValue().compareTo(BigDecimal.ZERO) <= 0) {
                categoryStatuses.add(CategoryBudgetStatusDto.builder()
                    .category(cat)
                    .year(activeMonth.getYear())
                    .month(activeMonth.getMonthValue())
                    .hasLimit(false)
                    .currentSpend(spend)
                    .percentageUsed(0.0)
                    .remainingAmount(BigDecimal.ZERO)
                    .status("NORMAL")
                    .applyToUpcoming(false)
                    .isInherited(false)
                    .isPastMonth(isPast)
                    .build());
            } else {
                BigDecimal computedLimit;
                if ("PERCENTAGE".equalsIgnoreCase(b.getLimitType())) {
                    if (totalExpenses.compareTo(BigDecimal.ZERO) > 0) {
                        computedLimit = totalExpenses.multiply(b.getLimitValue())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    } else {
                        computedLimit = BigDecimal.ZERO;
                    }
                } else {
                    computedLimit = b.getLimitValue();
                    totalAllocated = totalAllocated.add(b.getLimitValue());
                }

                double pctUsed = 0.0;
                if (computedLimit.compareTo(BigDecimal.ZERO) > 0) {
                    pctUsed = spend.divide(computedLimit, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).doubleValue();
                }

                BigDecimal remaining = computedLimit.subtract(spend);
                String status = "NORMAL";
                if (pctUsed >= 100.0) {
                    status = "EXCEEDED";
                } else if (pctUsed >= 80.0) {
                    status = "WARNING";
                }

                categoryStatuses.add(CategoryBudgetStatusDto.builder()
                    .category(cat)
                    .year(activeMonth.getYear())
                    .month(activeMonth.getMonthValue())
                    .hasLimit(true)
                    .limitType(b.getLimitType())
                    .limitValue(b.getLimitValue())
                    .computedLimitAmount(computedLimit)
                    .currentSpend(spend)
                    .percentageUsed(Math.round(pctUsed * 10.0) / 10.0)
                    .remainingAmount(remaining)
                    .status(status)
                    .applyToUpcoming(Boolean.TRUE.equals(b.getApplyToUpcoming()))
                    .isInherited(resolved.isInherited)
                    .isPastMonth(isPast)
                    .build());
            }
        }

        // Sort: categories with limits or higher spend first
        categoryStatuses.sort((a, b) -> {
            if (a.isHasLimit() && !b.isHasLimit()) return -1;
            if (!a.isHasLimit() && b.isHasLimit()) return 1;
            return b.getCurrentSpend().compareTo(a.getCurrentSpend());
        });

        // Resolve Overall Monthly Budget
        ResolvedBudget overallResolved = resolveBudget(OVERALL_CATEGORY, activeMonth.getYear(), activeMonth.getMonthValue());
        CategoryBudget overallB = overallResolved.budget;

        com.paytrace.dto.response.OverallBudgetDto overallDto;
        if (overallB != null && overallB.getLimitValue() != null && overallB.getLimitValue().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal overallLimit = overallB.getLimitValue();
            BigDecimal remainingBuffer = overallLimit.subtract(totalAllocated);
            double pctUsed = 0.0;
            if (overallLimit.compareTo(BigDecimal.ZERO) > 0) {
                pctUsed = totalExpenses.divide(overallLimit, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).doubleValue();
            }
            String status = "NORMAL";
            if (pctUsed >= 100.0) {
                status = "EXCEEDED";
            } else if (pctUsed >= 80.0) {
                status = "WARNING";
            }

            overallDto = com.paytrace.dto.response.OverallBudgetDto.builder()
                .hasLimit(true)
                .limitValue(overallLimit)
                .totalExpenses(totalExpenses)
                .totalAllocated(totalAllocated)
                .remainingBuffer(remainingBuffer)
                .percentageUsed(Math.round(pctUsed * 10.0) / 10.0)
                .applyToUpcoming(Boolean.TRUE.equals(overallB.getApplyToUpcoming()))
                .inherited(overallResolved.isInherited)
                .pastMonth(isPast)
                .status(status)
                .build();
        } else {
            overallDto = com.paytrace.dto.response.OverallBudgetDto.builder()
                .hasLimit(false)
                .limitValue(BigDecimal.ZERO)
                .totalExpenses(totalExpenses)
                .totalAllocated(totalAllocated)
                .remainingBuffer(BigDecimal.ZERO)
                .percentageUsed(0.0)
                .applyToUpcoming(false)
                .inherited(false)
                .pastMonth(isPast)
                .status("NORMAL")
                .build();
        }

        return com.paytrace.dto.response.BudgetSummaryResponseDto.builder()
            .overallBudget(overallDto)
            .categories(categoryStatuses)
            .build();
    }

    public List<CategoryBudgetStatusDto> getBudgetStatuses(Integer year, Integer month) {
        return getBudgetSummary(year, month).getCategories();
    }

}

