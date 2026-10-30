package com.paytrace.model;

import com.paytrace.model.enums.PaymentMethod;
import com.paytrace.model.enums.TransactionSource;
import com.paytrace.model.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "transactions")
@CompoundIndexes({
    @CompoundIndex(
        name = "bank_acc_ref_unique_idx",
        def = "{'bank': 1, 'accountNumber': 1, 'referenceNumber': 1}",
        unique = true,
        partialFilter = "{'referenceNumber': {'$type': 'string'}}"
    )
})
public class Transaction {

    @Id
    private String id;

    @Indexed
    private String bank;

    private String accountNumber;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal amount;

    @Indexed
    private TransactionType transactionType;

    private String merchant;

    private String description;

    @Indexed
    private Instant transactionDate;

    private String referenceNumber;

    @Indexed
    private String category;

    private PaymentMethod paymentMethod;

    private TransactionSource source;

    @Indexed(sparse = true, unique = true)
    private String gmailMessageId;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
