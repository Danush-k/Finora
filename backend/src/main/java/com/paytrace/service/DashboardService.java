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
        return getSummary(null, null);
    }

    public DashboardSummaryDto getSummary(Integer year, Integer month) {
        YearMonth activeMonth;
        if (year != null && month != null) {
            activeMonth = YearMonth.of(year, month);
        } else {
            LocalDate now = LocalDate.now(ZONE);
            activeMonth = YearMonth.from(now);

            Optional<Transaction> latestOpt = transactionRepository.findTop10ByOrderByTransactionDateDesc().stream().findFirst();
            if (latestOpt.isPresent()) {
                YearMonth latestTxnMonth = YearMonth.from(latestOpt.get().getTransactionDate().atZone(ZONE));
                Instant startNow = activeMonth.atDay(1).atStartOfDay(ZONE).toInstant();
                Instant endNow = activeMonth.atEndOfMonth().atTime(23, 59, 59).atZone(ZONE).toInstant();
                if (transactionRepository.findByTransactionDateBetweenOrderByTransactionDateDesc(startNow, endNow).isEmpty()) {
                    activeMonth = latestTxnMonth;
                }
            }
        }

        Instant startOfMonth = activeMonth.atDay(1).atStartOfDay(ZONE).toInstant();
        Instant endOfMonth = activeMonth.atEndOfMonth().atTime(23, 59, 59).atZone(ZONE).toInstant();

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
                totalIncome = totalIncome.add(amt);
            }
        }

        BigDecimal netSavings = totalIncome.subtract(totalExpenses);
        long totalTransactionsCount = transactionRepository.count();

        // If a specific month is selected, show up to 10 transactions from that month
        List<Transaction> recent = monthlyTxns.stream().limit(10).collect(Collectors.toList());
        if (recent.isEmpty() && (year == null || month == null)) {
            recent = transactionRepository.findTop10ByOrderByTransactionDateDesc();
        }

        DateTimeFormatter nameFmt = DateTimeFormatter.ofPattern("MMMM yyyy");
        DateTimeFormatter keyFmt = DateTimeFormatter.ofPattern("yyyy-MM");

        return DashboardSummaryDto.builder()
            .totalExpensesThisMonth(totalExpenses)
            .totalIncomeThisMonth(totalIncome)
            .netSavingsThisMonth(netSavings)
            .totalTransactionsCount(totalTransactionsCount)
            .expensesCountThisMonth(expenseCount)
            .incomeCountThisMonth(incomeCount)
            .recentTransactions(recent)
            .categoryBreakdown(categoryMap)
            .activeMonthName(activeMonth.format(nameFmt))
            .activeMonthKey(activeMonth.format(keyFmt))
            .build();
    }

    public MonthlyChartDto getMonthlyChart() {
        LocalDate now = LocalDate.now(ZONE);
        YearMonth anchorMonth = YearMonth.from(now);

        Optional<Transaction> latestOpt = transactionRepository.findTop10ByOrderByTransactionDateDesc().stream().findFirst();
        if (latestOpt.isPresent()) {
            YearMonth latestTxnMonth = YearMonth.from(latestOpt.get().getTransactionDate().atZone(ZONE));
            Instant startNow = anchorMonth.atDay(1).atStartOfDay(ZONE).toInstant();
            Instant endNow = anchorMonth.atEndOfMonth().atTime(23, 59, 59).atZone(ZONE).toInstant();
            if (transactionRepository.findByTransactionDateBetweenOrderByTransactionDateDesc(startNow, endNow).isEmpty()) {
                anchorMonth = latestTxnMonth;
            }
        }

        List<MonthlyChartDto.MonthlyPoint> points = new ArrayList<>();
        DateTimeFormatter shortMonthFmt = DateTimeFormatter.ofPattern("MMM");
        DateTimeFormatter fullMonthFmt = DateTimeFormatter.ofPattern("yyyy-MM");

        // 12 months ending at anchorMonth for seamless sliding navigation
        for (int i = 11; i >= 0; i--) {
            YearMonth ym = anchorMonth.minusMonths(i);
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
                .year(ym.getYear())
                .monthNumber(ym.getMonthValue())
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
