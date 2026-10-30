package com.paytrace.service;

import com.paytrace.dto.response.CalendarDaySummaryDto;
import com.paytrace.dto.response.DashboardSummaryDto;
import com.paytrace.dto.response.MonthlyChartDto;
import com.paytrace.model.Transaction;
import com.paytrace.model.enums.TransactionType;
import com.paytrace.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TransactionRepository transactionRepository;
    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    public DashboardSummaryDto getSummary() {
        LocalDate now = LocalDate.now(ZONE);
        YearMonth currentYearMonth = YearMonth.from(now);
        Instant startOfMonth = currentYearMonth.atDay(1).atStartOfDay(ZONE).toInstant();
        Instant endOfMonth = currentYearMonth.atEndOfMonth().atTime(23, 59, 59).atZone(ZONE).toInstant();

        List<Transaction> monthlyTxns = transactionRepository
            .findByTransactionDateBetweenOrderByTransactionDateDesc(startOfMonth, endOfMonth);

        BigDecimal totalExpenses = BigDecimal.ZERO;
        BigDecimal totalIncome = BigDecimal.ZERO;
        long expenseCount = 0;
        long incomeCount = 0;
        Map<String, BigDecimal> categoryMap = new HashMap<>();

        for (Transaction t : monthlyTxns) {
            BigDecimal amt = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;
            if (t.getTransactionType() == TransactionType.EXPENSE) {
                totalExpenses = totalExpenses.add(amt);
                expenseCount++;
                String cat = t.getCategory() != null ? t.getCategory() : "Other";
                categoryMap.put(cat, categoryMap.getOrDefault(cat, BigDecimal.ZERO).add(amt));
            } else if (t.getTransactionType() == TransactionType.INCOME) {
                totalIncome = totalIncome.add(amt);
                incomeCount++;
            } else if (t.getTransactionType() == TransactionType.REFUND) {
                // Refunds reduce expenses or add to income
                totalIncome = totalIncome.add(amt);
            }
        }

        BigDecimal netSavings = totalIncome.subtract(totalExpenses);
        long totalTransactionsCount = transactionRepository.count();
        List<Transaction> recent = transactionRepository.findTop10ByOrderByTransactionDateDesc();

        return DashboardSummaryDto.builder()
            .totalExpensesThisMonth(totalExpenses)
            .totalIncomeThisMonth(totalIncome)
            .netSavingsThisMonth(netSavings)
            .totalTransactionsCount(totalTransactionsCount)
            .expensesCountThisMonth(expenseCount)
            .incomeCountThisMonth(incomeCount)
            .recentTransactions(recent)
            .categoryBreakdown(categoryMap)
            .build();
    }

    public MonthlyChartDto getMonthlyChart() {
        LocalDate now = LocalDate.now(ZONE);
        List<MonthlyChartDto.MonthlyPoint> points = new ArrayList<>();
        DateTimeFormatter shortMonthFmt = DateTimeFormatter.ofPattern("MMM");
        DateTimeFormatter fullMonthFmt = DateTimeFormatter.ofPattern("yyyy-MM");

        // Last 6 months
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = YearMonth.from(now.minusMonths(i));
            Instant start = ym.atDay(1).atStartOfDay(ZONE).toInstant();
            Instant end = ym.atEndOfMonth().atTime(23, 59, 59).atZone(ZONE).toInstant();

            List<Transaction> txns = transactionRepository.findByTransactionDateBetweenOrderByTransactionDateDesc(start, end);

            BigDecimal exp = BigDecimal.ZERO;
            BigDecimal inc = BigDecimal.ZERO;

            for (Transaction t : txns) {
                BigDecimal amt = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;
                if (t.getTransactionType() == TransactionType.EXPENSE) {
                    exp = exp.add(amt);
                } else if (t.getTransactionType() == TransactionType.INCOME || t.getTransactionType() == TransactionType.REFUND) {
                    inc = inc.add(amt);
                }
            }

            points.add(MonthlyChartDto.MonthlyPoint.builder()
                .month(ym.format(shortMonthFmt))
                .fullMonth(ym.format(fullMonthFmt))
                .expenses(exp)
                .income(inc)
                .savings(inc.subtract(exp))
                .build());
        }

        return MonthlyChartDto.builder().points(points).build();
    }

    public List<CalendarDaySummaryDto> getMonthlyCalendar(int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        Instant start = yearMonth.atDay(1).atStartOfDay(ZONE).toInstant();
        Instant end = yearMonth.atEndOfMonth().atTime(23, 59, 59).atZone(ZONE).toInstant();

        List<Transaction> txns = transactionRepository.findByTransactionDateBetweenOrderByTransactionDateDesc(start, end);

        Map<LocalDate, List<Transaction>> txnsByDay = txns.stream()
            .collect(Collectors.groupingBy(t -> t.getTransactionDate().atZone(ZONE).toLocalDate()));

        List<CalendarDaySummaryDto> days = new ArrayList<>();
        int daysInMonth = yearMonth.lengthOfMonth();

        for (int day = 1; day <= daysInMonth; day++) {
            LocalDate date = yearMonth.atDay(day);
            List<Transaction> dayTxns = txnsByDay.getOrDefault(date, Collections.emptyList());

            BigDecimal dayExpense = BigDecimal.ZERO;
            BigDecimal dayIncome = BigDecimal.ZERO;

            for (Transaction t : dayTxns) {
                BigDecimal amt = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;
                if (t.getTransactionType() == TransactionType.EXPENSE) {
                    dayExpense = dayExpense.add(amt);
                } else if (t.getTransactionType() == TransactionType.INCOME || t.getTransactionType() == TransactionType.REFUND) {
                    dayIncome = dayIncome.add(amt);
                }
            }

            days.add(CalendarDaySummaryDto.builder()
                .date(date.toString())
                .dayOfMonth(day)
                .totalExpense(dayExpense)
                .totalIncome(dayIncome)
                .transactionCount(dayTxns.size())
                .transactions(dayTxns)
                .build());
        }

        return days;
    }
}
