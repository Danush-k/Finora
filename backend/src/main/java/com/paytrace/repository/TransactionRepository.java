package com.paytrace.repository;

import com.paytrace.model.Transaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends MongoRepository<Transaction, String> {

    Optional<Transaction> findByBankAndAccountNumberAndReferenceNumber(String bank, String accountNumber, String referenceNumber);

    Optional<Transaction> findByReferenceNumber(String referenceNumber);

    Optional<Transaction> findByGmailMessageId(String gmailMessageId);

    @org.springframework.data.mongodb.repository.Query(value = "{ 'transactionDate' : { $gte: ?0, $lte: ?1 } }", sort = "{ 'transactionDate' : -1 }")
    List<Transaction> findByTransactionDateBetweenOrderByTransactionDateDesc(Instant start, Instant end);

    List<Transaction> findTop10ByOrderByTransactionDateDesc();
}
