package com.paytrace.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepaymentInstallment {
    private String id;
    private String title;
    private Instant dueDate;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal amount;

    private boolean settled;
    private Instant settledDate;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal settledAmount;

    private String linkedTransactionId;
    private String linkedTransactionDescription;
    private String notes;
}
