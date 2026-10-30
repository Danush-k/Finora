package com.paytrace.dto.response;

import com.paytrace.model.Transaction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarDaySummaryDto {

    private String date; // YYYY-MM-DD
    private int dayOfMonth;
    private BigDecimal totalExpense;
    private BigDecimal totalIncome;
    private int transactionCount;
    private List<Transaction> transactions;
}
