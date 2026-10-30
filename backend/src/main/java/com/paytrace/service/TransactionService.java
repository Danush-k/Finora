package com.paytrace.service;

import com.paytrace.dto.request.TransactionRequestDto;
import com.paytrace.exception.ResourceNotFoundException;
import com.paytrace.model.Transaction;
import com.paytrace.model.enums.TransactionSource;
import com.paytrace.model.enums.TransactionType;
import com.paytrace.parser.CategoryClassifier;
import com.paytrace.parser.ParsedTransaction;
import com.paytrace.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryClassifier categoryClassifier;

    public Page<Transaction> getTransactions(
        TransactionType type,
        String category,
        Instant startDate,
        Instant endDate,
        String search,
        int page,
        int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "transactionDate"));
        return transactionRepository.searchTransactions(type, category, startDate, endDate, search, pageable);
    }

    public Transaction getTransactionById(String id) {
        return transactionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + id));
    }

    public Transaction createTransaction(TransactionRequestDto dto) {
        String category = dto.getCategory();
        if (category == null || category.trim().isEmpty()) {
            category = categoryClassifier.classify(dto.getMerchant(), dto.getDescription(), dto.getTransactionType());
        }

        Transaction transaction = Transaction.builder()
            .bank(dto.getBank() != null && !dto.getBank().isEmpty() ? dto.getBank() : "MANUAL")
            .accountNumber(dto.getAccountNumber() != null ? dto.getAccountNumber() : "XX0000")
            .amount(dto.getAmount())
            .transactionType(dto.getTransactionType())
            .merchant(dto.getMerchant())
            .description(dto.getDescription())
            .transactionDate(dto.getTransactionDate())
            .referenceNumber(dto.getReferenceNumber())
            .category(category)
            .paymentMethod(dto.getPaymentMethod())
            .source(TransactionSource.MANUAL)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();

        return transactionRepository.save(transaction);
    }

    public Transaction updateTransaction(String id, TransactionRequestDto dto) {
        Transaction existing = getTransactionById(id);

        existing.setBank(dto.getBank());
        existing.setAccountNumber(dto.getAccountNumber());
        existing.setAmount(dto.getAmount());
        existing.setTransactionType(dto.getTransactionType());
        existing.setMerchant(dto.getMerchant());
        existing.setDescription(dto.getDescription());
        existing.setTransactionDate(dto.getTransactionDate());
        existing.setReferenceNumber(dto.getReferenceNumber());
        existing.setCategory(dto.getCategory() != null ? dto.getCategory() : existing.getCategory());
        existing.setPaymentMethod(dto.getPaymentMethod());
        existing.setUpdatedAt(Instant.now());

        return transactionRepository.save(existing);
    }

    public void deleteTransaction(String id) {
        Transaction existing = getTransactionById(id);
        transactionRepository.delete(existing);
    }

    /**
     * Deduplicates and saves an extracted email transaction.
     * Returns true if saved, false if detected as duplicate.
     */
    @Transactional
    public Optional<Transaction> saveExtractedTransaction(ParsedTransaction parsed, String gmailMessageId) {
        // Duplicate check 1: Gmail message ID already recorded in transactions
        if (gmailMessageId != null && transactionRepository.findByGmailMessageId(gmailMessageId).isPresent()) {
            log.info("Duplicate detected: Gmail message {} already exists in transactions", gmailMessageId);
            return Optional.empty();
        }

        // Duplicate check 2: Compound key (bank, accountNumber, referenceNumber)
        if (parsed.getReferenceNumber() != null && !parsed.getReferenceNumber().isEmpty()) {
            Optional<Transaction> existing = transactionRepository
                .findByBankAndAccountNumberAndReferenceNumber(
                    parsed.getBank(),
                    parsed.getAccountNumber(),
                    parsed.getReferenceNumber()
                );

            if (existing.isPresent()) {
                log.info("Duplicate detected: Transaction with ref {} for account {} already exists",
                    parsed.getReferenceNumber(), parsed.getAccountNumber());
                return Optional.empty();
            }
        }

        Transaction transaction = Transaction.builder()
            .bank(parsed.getBank())
            .accountNumber(parsed.getAccountNumber())
            .amount(parsed.getAmount())
            .transactionType(parsed.getTransactionType())
            .merchant(parsed.getMerchant())
            .description(parsed.getDescription())
            .transactionDate(parsed.getTransactionDate())
            .referenceNumber(parsed.getReferenceNumber())
            .category(parsed.getCategory())
            .paymentMethod(parsed.getPaymentMethod())
            .source(TransactionSource.GMAIL_AUTOMATED)
            .gmailMessageId(gmailMessageId)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();

        return Optional.of(transactionRepository.save(transaction));
    }
}
