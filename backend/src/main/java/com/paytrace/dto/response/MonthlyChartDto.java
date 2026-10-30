package com.paytrace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyChartDto {

    private List<MonthlyPoint> points;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyPoint {
        private String month;        // e.g. "Jun", "Jul", "Aug", etc.
        private String fullMonth;    // e.g. "2026-06"
        private BigDecimal expenses;
        private BigDecimal income;
        private BigDecimal savings;
    }
}
