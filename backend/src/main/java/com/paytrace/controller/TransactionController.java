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

import com.paytrace.dto.request.CsvConfirmRequestDto;
import com.paytrace.dto.response.CsvVerificationResponseDto;
import com.paytrace.service.CsvImportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final CsvImportService csvImportService;

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

    @PostMapping(value = "/csv/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<CsvVerificationResponseDto>> verifyCsv(
        @RequestParam("file") MultipartFile file
    ) {
        CsvVerificationResponseDto response = csvImportService.verifyCsv(file);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMessage()));
    }

    @PostMapping("/csv/confirm")
    public ResponseEntity<ApiResponse<Integer>> confirmCsvImport(
        @Valid @RequestBody CsvConfirmRequestDto request
    ) {
        int count = csvImportService.confirmImport(request.getTransactions());
        return ResponseEntity.ok(ApiResponse.ok(count, "Successfully imported " + count + " transactions"));
    }

    @GetMapping("/csv/template")
    public ResponseEntity<String> getCsvTemplate() {
        String template = csvImportService.getSampleCsvTemplate();
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"paytrace_template.csv\"")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(template);
    }
}
