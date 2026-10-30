package com.paytrace.model;

import com.paytrace.model.enums.DebtLentStatus;
import com.paytrace.model.enums.DebtLentType;
import com.paytrace.model.enums.InterestPeriodType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "debt_lent_records")
public class DebtLentRecord {

    @Id
    private String id;

    @Indexed
    private DebtLentType type; // LENT or DEBT

    @Indexed
    private String counterpartyName; // Who did you lend to / borrow from

    private String counterpartyPhone;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal principalAmount;

    private String description;

    @Indexed
    private Instant startDate;

    @Indexed
    private Instant dueDate;

    // Linked initial transaction(s)
    private String linkedTransactionId;
    private String linkedTransactionDescription;
    private BigDecimal linkedTransactionAmount;
    private String amountDifferenceReason; // Reason if principal differs from linked transactions (e.g. extra in cash)

    @Builder.Default
    private List<String> linkedTransactionIds = new ArrayList<>();

    // Interest settings
    private boolean hasInterest;
    private BigDecimal interestRate; // e.g. 10.0 for 10%
    private InterestPeriodType interestPeriodType;
    private Integer tenureMonths; // e.g. 6 months

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal accruedInterest;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal totalExpectedAmount;

    // Checkpoints & installments checklist
    @Builder.Default
    private List<RepaymentInstallment> installments = new ArrayList<>();

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal totalRepaidAmount;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal remainingAmount;

    @Indexed
    private DebtLentStatus status;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
