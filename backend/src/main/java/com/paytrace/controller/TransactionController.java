package com.paytrace.controller;

import com.paytrace.dto.request.TransactionRequestDto;
import com.paytrace.dto.response.ApiResponse;
import com.paytrace.model.Transaction;
import com.paytrace.model.enums.TransactionType;
import com.paytrace.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Transaction>>> getTransactions(
        @RequestParam(required = false) TransactionType type,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate,
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Page<Transaction> result = transactionService.getTransactions(type, category, startDate, endDate, search, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Transaction>> getTransactionById(@PathVariable String id) {
        Transaction txn = transactionService.getTransactionById(id);
        return ResponseEntity.ok(ApiResponse.ok(txn));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Transaction>> createTransaction(@Valid @RequestBody TransactionRequestDto dto) {
        Transaction created = transactionService.createTransaction(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created, "Transaction created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Transaction>> updateTransaction(
        @PathVariable String id,
        @Valid @RequestBody TransactionRequestDto dto
    ) {
        Transaction updated = transactionService.updateTransaction(id, dto);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Transaction updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTransaction(@PathVariable String id) {
        transactionService.deleteTransaction(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Transaction deleted successfully"));
    }
}
