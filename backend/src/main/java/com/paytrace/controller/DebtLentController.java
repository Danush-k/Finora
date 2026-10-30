package com.paytrace.controller;

import com.paytrace.dto.request.DebtLentRequestDto;
import com.paytrace.dto.request.RepaymentToggleRequestDto;
import com.paytrace.dto.response.ApiResponse;
import com.paytrace.dto.response.DebtLentSummaryDto;
import com.paytrace.model.DebtLentRecord;
import com.paytrace.model.RepaymentInstallment;
import com.paytrace.model.Transaction;
import com.paytrace.model.enums.DebtLentStatus;
import com.paytrace.model.enums.DebtLentType;
import com.paytrace.model.enums.TransactionType;
import com.paytrace.service.DebtLentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/debt-lent")
@RequiredArgsConstructor
public class DebtLentController {

    private final DebtLentService debtLentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DebtLentRecord>>> getAll(
        @RequestParam(required = false) DebtLentType type,
        @RequestParam(required = false) DebtLentStatus status,
        @RequestParam(required = false) String search
    ) {
        List<DebtLentRecord> records = debtLentService.getAllRecords(type, status, search);
        return ResponseEntity.ok(ApiResponse.ok(records));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DebtLentSummaryDto>> getSummary() {
        DebtLentSummaryDto summary = debtLentService.getSummary();
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/candidates")
    public ResponseEntity<ApiResponse<List<Transaction>>> getCandidateTransactions(
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "25") int limit,
        @RequestParam(required = false) TransactionType transactionType
    ) {
        List<Transaction> txns = debtLentService.getCandidateTransactions(search, limit, transactionType);
        return ResponseEntity.ok(ApiResponse.ok(txns));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DebtLentRecord>> getById(@PathVariable String id) {
        DebtLentRecord record = debtLentService.getRecordById(id);
        return ResponseEntity.ok(ApiResponse.ok(record));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DebtLentRecord>> create(@Valid @RequestBody DebtLentRequestDto dto) {
        DebtLentRecord created = debtLentService.createRecord(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created, "Record created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DebtLentRecord>> update(
        @PathVariable String id,
        @Valid @RequestBody DebtLentRequestDto dto
    ) {
        DebtLentRecord updated = debtLentService.updateRecord(id, dto);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Record updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        debtLentService.deleteRecord(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Record deleted successfully"));
    }

    @PatchMapping("/{id}/installments/{installmentId}/toggle")
    public ResponseEntity<ApiResponse<DebtLentRecord>> toggleInstallment(
        @PathVariable String id,
        @PathVariable String installmentId,
        @RequestBody RepaymentToggleRequestDto toggleDto
    ) {
        DebtLentRecord updated = debtLentService.toggleInstallment(id, installmentId, toggleDto);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Checklist item updated"));
    }

    @PostMapping("/{id}/installments")
    public ResponseEntity<ApiResponse<DebtLentRecord>> addInstallment(
        @PathVariable String id,
        @RequestBody RepaymentInstallment installment
    ) {
        DebtLentRecord updated = debtLentService.addInstallment(id, installment);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Installment added successfully"));
    }

    @DeleteMapping("/{id}/installments/{installmentId}")
    public ResponseEntity<ApiResponse<DebtLentRecord>> deleteInstallment(
        @PathVariable String id,
        @PathVariable String installmentId
    ) {
        DebtLentRecord updated = debtLentService.deleteInstallment(id, installmentId);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Installment deleted successfully"));
    }

    @PostMapping("/{id}/repay")
    public ResponseEntity<ApiResponse<DebtLentRecord>> recordRepayment(
        @PathVariable String id,
        @RequestParam BigDecimal amount,
        @RequestParam(required = false) String linkedTxnId,
        @RequestParam(required = false) String linkedTxnDesc,
        @RequestParam(required = false) String notes
    ) {
        DebtLentRecord updated = debtLentService.recordQuickRepayment(id, amount, linkedTxnId, linkedTxnDesc, notes);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Repayment recorded successfully"));
    }
}
