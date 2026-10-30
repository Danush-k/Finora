package com.paytrace.dto.response;

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
public class CsvTransactionDto {
    private String id; // Unique client tracking ID
    private String bank;
    private String accountNumber;
    private BigDecimal amount;
    private TransactionType transactionType;
    private String merchant;
    private String description;
    private Instant transactionDate;
    private String formattedDate;
    private String referenceNumber;
    private String category;
    private PaymentMethod paymentMethod;
}
