package com.paytrace.dto.response;

import com.paytrace.model.Transaction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDto {

    private BigDecimal totalExpensesThisMonth;
    private BigDecimal totalIncomeThisMonth;
    private BigDecimal netSavingsThisMonth;
    private long totalTransactionsCount;
    private long expensesCountThisMonth;
    private long incomeCountThisMonth;
    private List<Transaction> recentTransactions;
    private Map<String, BigDecimal> categoryBreakdown;
}
