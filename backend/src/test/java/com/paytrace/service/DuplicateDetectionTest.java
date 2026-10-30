package com.paytrace.service;

import com.paytrace.model.Transaction;
import com.paytrace.model.enums.PaymentMethod;
import com.paytrace.model.enums.TransactionType;
import com.paytrace.parser.CategoryClassifier;
import com.paytrace.parser.ParsedTransaction;
import com.paytrace.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DuplicateDetectionTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    private TransactionService transactionService;

    @BeforeEach
    void setUp() {
        CategoryClassifier classifier = new CategoryClassifier();
        transactionService = new TransactionService(transactionRepository, mongoTemplate, classifier);
    }

    @Test
    @DisplayName("Should detect and reject duplicate Gmail message ID")
    void shouldRejectDuplicateGmailMessageId() {
        String msgId = "msg_123456";
        when(transactionRepository.findByGmailMessageId(msgId))
            .thenReturn(Optional.of(Transaction.builder().id("existing_1").build()));

        ParsedTransaction parsed = ParsedTransaction.builder()
            .bank("HDFC")
            .accountNumber("XX1234")
            .amount(new BigDecimal("500.00"))
            .referenceNumber("REF111")
            .build();

        Optional<Transaction> result = transactionService.saveExtractedTransaction(parsed, msgId);

        assertThat(result).isEmpty();
        verify(transactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should detect and reject duplicate reference number for same bank and account")
    void shouldRejectDuplicateReferenceNumber() {
        String msgId = "msg_different";
        when(transactionRepository.findByGmailMessageId(msgId)).thenReturn(Optional.empty());
        when(transactionRepository.findByBankAndAccountNumberAndReferenceNumber("HDFC", "XX1234", "REF999"))
            .thenReturn(Optional.of(Transaction.builder().id("existing_2").build()));

        ParsedTransaction parsed = ParsedTransaction.builder()
            .bank("HDFC")
            .accountNumber("XX1234")
            .amount(new BigDecimal("1200.00"))
            .referenceNumber("REF999")
            .build();

        Optional<Transaction> result = transactionService.saveExtractedTransaction(parsed, msgId);

        assertThat(result).isEmpty();
        verify(transactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should successfully save new unique transaction")
    void shouldSaveUniqueTransaction() {
        String msgId = "msg_unique";
        when(transactionRepository.findByGmailMessageId(msgId)).thenReturn(Optional.empty());
        when(transactionRepository.findByBankAndAccountNumberAndReferenceNumber("HDFC", "XX1234", "REF_NEW"))
            .thenReturn(Optional.empty());

        Transaction expected = Transaction.builder()
            .id("new_txn_1")
            .bank("HDFC")
            .accountNumber("XX1234")
            .amount(new BigDecimal("499.00"))
            .referenceNumber("REF_NEW")
            .build();

        when(transactionRepository.save(any(Transaction.class))).thenReturn(expected);

        ParsedTransaction parsed = ParsedTransaction.builder()
            .bank("HDFC")
            .accountNumber("XX1234")
            .amount(new BigDecimal("499.00"))
            .transactionType(TransactionType.EXPENSE)
            .paymentMethod(PaymentMethod.UPI)
            .referenceNumber("REF_NEW")
            .merchant("Swiggy")
            .category("Food & Dining")
            .transactionDate(Instant.now())
            .build();

        Optional<Transaction> result = transactionService.saveExtractedTransaction(parsed, msgId);

        assertThat(result).isPresent();
        assertThat(result.get().getReferenceNumber()).isEqualTo("REF_NEW");
        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }
}
