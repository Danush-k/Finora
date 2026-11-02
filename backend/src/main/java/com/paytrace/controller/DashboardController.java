package com.paytrace.controller;

import com.paytrace.dto.response.ApiResponse;
import com.paytrace.dto.response.CalendarDaySummaryDto;
import com.paytrace.dto.response.DashboardSummaryDto;
import com.paytrace.dto.response.MonthlyChartDto;
import com.paytrace.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardSummaryDto>> getSummary(
        @RequestParam(required = false) Integer year,
        @RequestParam(required = false) Integer month
    ) {
        DashboardSummaryDto summary = dashboardService.getSummary(year, month);
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/monthly")
    public ResponseEntity<ApiResponse<MonthlyChartDto>> getMonthlyChart() {
        MonthlyChartDto chart = dashboardService.getMonthlyChart();
        return ResponseEntity.ok(ApiResponse.ok(chart));
    }

    @GetMapping("/calendar")
    public ResponseEntity<ApiResponse<List<CalendarDaySummaryDto>>> getMonthlyCalendar(
        @RequestParam(required = false) Integer year,
        @RequestParam(required = false) Integer month
    ) {
        LocalDate now = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
        int targetYear = (year != null) ? year : now.getYear();
        int targetMonth = (month != null) ? month : now.getMonthValue();

        List<CalendarDaySummaryDto> days = dashboardService.getMonthlyCalendar(targetYear, targetMonth);
        return ResponseEntity.ok(ApiResponse.ok(days));
    }
}
