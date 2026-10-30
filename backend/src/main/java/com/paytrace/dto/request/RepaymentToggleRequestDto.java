package com.paytrace.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepaymentToggleRequestDto {
    private boolean settled;
    private BigDecimal settledAmount;
    private Instant settledDate;
    private String linkedTransactionId;
    private String linkedTransactionDescription;
    private String notes;
}
