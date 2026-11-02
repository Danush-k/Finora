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
public class CategoryBudgetStatusDto {
    private String category;
    private Integer year;
    private Integer month;
    private boolean hasLimit;
    private String limitType; // RUPEES or PERCENTAGE
    private BigDecimal limitValue;
    private BigDecimal computedLimitAmount; // in Rupees
    private BigDecimal currentSpend; // in Rupees
    private Double percentageUsed; // % of budget consumed
    private BigDecimal remainingAmount; // remaining budget
    private String status; // NORMAL, WARNING, EXCEEDED
    private Boolean applyToUpcoming;
    private boolean isInherited;
    private boolean isPastMonth;
}

