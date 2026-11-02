package com.paytrace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OverallBudgetDto {
    private boolean hasLimit;
    private BigDecimal limitValue;
    private BigDecimal totalExpenses;
    private BigDecimal totalAllocated;
    private BigDecimal remainingBuffer; // limitValue - totalAllocated
    private Double percentageUsed; // totalExpenses / limitValue * 100
    private Boolean applyToUpcoming;
    private boolean inherited;
    private boolean pastMonth;
    private String status; // NORMAL, WARNING, EXCEEDED
}
