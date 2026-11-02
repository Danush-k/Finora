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
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

import com.paytrace.model.MerchantRule;

@Slf4j
@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final MongoTemplate mongoTemplate;
    private final CategoryClassifier categoryClassifier;
    private final MerchantRuleService merchantRuleService;

    public TransactionService(
        TransactionRepository transactionRepository,
        MongoTemplate mongoTemplate,
        CategoryClassifier categoryClassifier
    ) {
        this(transactionRepository, mongoTemplate, categoryClassifier, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public TransactionService(
        TransactionRepository transactionRepository,
        MongoTemplate mongoTemplate,
        CategoryClassifier categoryClassifier,
        MerchantRuleService merchantRuleService
    ) {
        this.transactionRepository = transactionRepository;
        this.mongoTemplate = mongoTemplate;
        this.categoryClassifier = categoryClassifier;
        this.merchantRuleService = merchantRuleService;
    }

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

        List<Criteria> criteriaList = new ArrayList<>();

        if (type != null) {
            criteriaList.add(Criteria.where("transactionType").is(type));
        }

        if (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("ALL")) {
            criteriaList.add(Criteria.where("category").is(category.trim()));
        }

        if (startDate != null && endDate != null) {
            criteriaList.add(Criteria.where("transactionDate").gte(startDate).lte(endDate));
        } else if (startDate != null) {
            criteriaList.add(Criteria.where("transactionDate").gte(startDate));
        } else if (endDate != null) {
            criteriaList.add(Criteria.where("transactionDate").lte(endDate));
        }

        if (search != null && !search.trim().isEmpty()) {
            Pattern regex = Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
            criteriaList.add(new Criteria().orOperator(
                Criteria.where("merchant").regex(regex),
                Criteria.where("description").regex(regex),
                Criteria.where("referenceNumber").regex(regex)
            ));
        }

        Query query = new Query();
        if (!criteriaList.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteriaList.toArray(new Criteria[0])));
        }

        long total = mongoTemplate.count(query, Transaction.class);
        query.with(pageable);
        List<Transaction> items = mongoTemplate.find(query, Transaction.class);

        return new PageImpl<>(items, pageable, total);
    }

    public Transaction getTransactionById(String id) {
        return transactionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + id));
    }

    public Transaction createTransaction(TransactionRequestDto dto) {
        String merchant = dto.getMerchant() != null ? dto.getMerchant().trim() : "Unknown";
        String category = dto.getCategory();

        if (merchantRuleService != null && (category == null || category.trim().isEmpty() || "Other".equalsIgnoreCase(category))) {
            MerchantRuleService.MerchantResolution res = merchantRuleService.resolve(merchant);
            if (res.isMatched()) {
                if (res.getMerchant() != null && !res.getMerchant().isEmpty()) {
                    merchant = res.getMerchant();
                }
                category = res.getCategory();
            }
        }

        if (category == null || category.trim().isEmpty()) {
            category = categoryClassifier.classify(merchant, dto.getDescription(), dto.getTransactionType());
        }

        Transaction transaction = Transaction.builder()
            .bank(dto.getBank() != null && !dto.getBank().isEmpty() ? dto.getBank() : "MANUAL")
            .accountNumber(dto.getAccountNumber() != null ? dto.getAccountNumber() : "XX0000")
            .amount(dto.getAmount())
            .transactionType(dto.getTransactionType())
            .merchant(merchant)
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
        String oldMerchant = existing.getMerchant();

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

        Transaction saved = transactionRepository.save(existing);

        // If the user opted to save this rename/category change as an auto-rule
        if (Boolean.TRUE.equals(dto.getCreateMerchantRule()) && merchantRuleService != null) {
            String rawPattern = dto.getOriginalMerchant() != null && !dto.getOriginalMerchant().trim().isEmpty()
                ? dto.getOriginalMerchant().trim()
                : oldMerchant;

            MerchantRule rule = MerchantRule.builder()
                .rawMerchant(rawPattern)
                .cleanMerchantName(dto.getMerchant().trim())
                .category(dto.getCategory() != null ? dto.getCategory().trim() : saved.getCategory())
                .matchType("CONTAINS")
                .build();

            merchantRuleService.saveRule(rule, Boolean.TRUE.equals(dto.getApplyToAllMatching()));
        }

        return saved;
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
        } else {
            // Duplicate check 3: Fallback check if reference number is absent
            Query query = new Query();
            query.addCriteria(Criteria.where("accountNumber").is(parsed.getAccountNumber())
                .and("amount").is(parsed.getAmount())
                .and("transactionType").is(parsed.getTransactionType())
                .and("transactionDate").is(parsed.getTransactionDate())
                .and("merchant").is(parsed.getMerchant()));
            if (mongoTemplate.exists(query, Transaction.class)) {
                log.info("Duplicate detected: Transaction with identical amount, type, date, and merchant already exists");
                return Optional.empty();
            }
        }

        String finalMerchant = parsed.getMerchant();
        String finalCategory = parsed.getCategory();

        // Check custom user merchant rules first!
        if (merchantRuleService != null) {
            MerchantRuleService.MerchantResolution res = merchantRuleService.resolve(parsed.getMerchant());
            if (res.isMatched()) {
                if (res.getMerchant() != null && !res.getMerchant().isEmpty()) {
                    finalMerchant = res.getMerchant();
                }
                if (res.getCategory() != null && !res.getCategory().isEmpty()) {
                    finalCategory = res.getCategory();
                }
            }
        }

        Transaction transaction = Transaction.builder()
            .bank(parsed.getBank())
            .accountNumber(parsed.getAccountNumber())
            .amount(parsed.getAmount())
            .transactionType(parsed.getTransactionType())
            .merchant(finalMerchant)
            .description(parsed.getDescription())
            .transactionDate(parsed.getTransactionDate())
            .referenceNumber(parsed.getReferenceNumber())
            .category(finalCategory)
            .paymentMethod(parsed.getPaymentMethod())
            .source(TransactionSource.GMAIL_AUTOMATED)
            .gmailMessageId(gmailMessageId)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();

        return Optional.of(transactionRepository.save(transaction));
    }
}
