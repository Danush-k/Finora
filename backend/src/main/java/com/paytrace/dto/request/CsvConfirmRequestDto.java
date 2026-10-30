package com.paytrace.dto.request;

import com.paytrace.dto.response.CsvTransactionDto;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CsvConfirmRequestDto {
    @NotEmpty(message = "Transaction list cannot be empty")
    private List<CsvTransactionDto> transactions;
}
