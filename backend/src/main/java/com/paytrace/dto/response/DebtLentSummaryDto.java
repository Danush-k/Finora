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
public class DebtLentSummaryDto {
    private BigDecimal totalLentPrincipal;
    private BigDecimal totalLentRemaining;
    private BigDecimal totalLentRecovered;
    private int lentActiveCount;

    private BigDecimal totalDebtPrincipal;
    private BigDecimal totalDebtRemaining;
    private BigDecimal totalDebtRepaid;
    private int debtActiveCount;

    private BigDecimal netStanding; // totalLentRemaining - totalDebtRemaining
    private int overdueCount;
}
