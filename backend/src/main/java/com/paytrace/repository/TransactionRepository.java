package com.paytrace.repository;

import com.paytrace.model.Transaction;
import com.paytrace.model.enums.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends MongoRepository<Transaction, String> {

    Optional<Transaction> findByBankAndAccountNumberAndReferenceNumber(String bank, String accountNumber, String referenceNumber);

    Optional<Transaction> findByGmailMessageId(String gmailMessageId);

    List<Transaction> findByTransactionDateBetweenOrderByTransactionDateDesc(Instant start, Instant end);

    List<Transaction> findTop10ByOrderByTransactionDateDesc();

    @Query("{ $and: [ " +
           "?#{ [0] == null ? { '$expr': { '$eq': [ 1, 1 ] } } : { 'transactionType': [0] } }, " +
           "?#{ [1] == null ? { '$expr': { '$eq': [ 1, 1 ] } } : { 'category': [1] } }, " +
           "?#{ [2] == null ? { '$expr': { '$eq': [ 1, 1 ] } } : { 'transactionDate': { '$gte': [2] } } }, " +
           "?#{ [3] == null ? { '$expr': { '$eq': [ 1, 1 ] } } : { 'transactionDate': { '$lte': [3] } } }, " +
           "?#{ [4] == null || [4].isEmpty() ? { '$expr': { '$eq': [ 1, 1 ] } } : { '$or': [ " +
           "    { 'merchant': { '$regex': [4], '$options': 'i' } }, " +
           "    { 'description': { '$regex': [4], '$options': 'i' } }, " +
           "    { 'referenceNumber': { '$regex': [4], '$options': 'i' } } " +
           "  ] } } " +
           "] }")
    Page<Transaction> searchTransactions(
        TransactionType transactionType,
        String category,
        Instant startDate,
        Instant endDate,
        String search,
        Pageable pageable
    );
}
