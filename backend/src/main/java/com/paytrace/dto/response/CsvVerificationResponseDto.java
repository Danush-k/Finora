package com.paytrace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CsvVerificationResponseDto {
    private int totalRows;
    private int existingCount;
    private int newCount;
    private List<CsvTransactionDto> newTransactions;
    private List<CsvTransactionDto> existingTransactions;
    private String message;
    private boolean allPresent;
}
