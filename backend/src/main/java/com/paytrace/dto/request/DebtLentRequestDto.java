package com.paytrace.dto.request;

import com.paytrace.model.RepaymentInstallment;
import com.paytrace.model.enums.DebtLentType;
import com.paytrace.model.enums.InterestPeriodType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DebtLentRequestDto {

    @NotNull(message = "Type is required (LENT or DEBT)")
    private DebtLentType type;

    @NotBlank(message = "Counterparty name is required")
    private String counterpartyName;

    private String counterpartyPhone;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than zero")
    private BigDecimal principalAmount;

    private String description;

    @NotNull(message = "Start date is required")
    private Instant startDate;

    private Instant dueDate;

    // Initial linked transaction(s)
    private String linkedTransactionId;
    private String linkedTransactionDescription;
    private BigDecimal linkedTransactionAmount;
    private String amountDifferenceReason;
    private List<String> linkedTransactionIds;

    // Interest settings
    private boolean hasInterest;
    private BigDecimal interestRate;
    private InterestPeriodType interestPeriodType;
    private Integer tenureMonths;

    // Optional manual installments (auto-generated if empty and tenureMonths > 0)
    private List<RepaymentInstallment> installments;
}
