package com.paytrace.parser;

import com.paytrace.model.enums.PaymentMethod;
import com.paytrace.model.enums.TransactionType;
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
public class ParsedTransaction {

    private String bank;
    private String accountNumber;
    private BigDecimal amount;
    private TransactionType transactionType;
    private String merchant;
    private String description;
    private Instant transactionDate;
    private String referenceNumber;
    private String category;
    private PaymentMethod paymentMethod;
}
