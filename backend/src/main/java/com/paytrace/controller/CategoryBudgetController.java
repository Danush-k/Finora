package com.paytrace.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paytrace.dto.response.ApiResponse;
import com.paytrace.dto.response.CategoryBudgetStatusDto;
import com.paytrace.model.CategoryBudget;
import com.paytrace.service.CategoryBudgetService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CategoryBudgetController {

    private final CategoryBudgetService budgetService;
    private final ObjectMapper objectMapper;

    @Data
    public static class SaveBudgetRequest {
        private String category;
        private String limitType; // RUPEES or PERCENTAGE
        private BigDecimal limitValue;
        private Integer year;
        private Integer month;
        private Boolean applyToUpcoming;
    }

    @Data
    public static class BulkSaveBudgetRequest {
        private Integer year;
        private Integer month;
        private Boolean applyToUpcoming;
        private List<SaveBudgetRequest> budgets;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<com.paytrace.dto.response.BudgetSummaryResponseDto>> getBudgets(
        @RequestParam(required = false) Integer year,
        @RequestParam(required = false) Integer month
    ) {
        com.paytrace.dto.response.BudgetSummaryResponseDto summary = budgetService.getBudgetSummary(year, month);
        return ResponseEntity.ok(ApiResponse.ok(summary, "Budget summary retrieved"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CategoryBudget>> saveBudget(@RequestBody SaveBudgetRequest request) {
        CategoryBudget saved = budgetService.saveBudget(
            request.getCategory(),
            request.getLimitType(),
            request.getLimitValue(),
            request.getYear(),
            request.getMonth(),
            request.getApplyToUpcoming()
        );
        return ResponseEntity.ok(ApiResponse.ok(saved, "Category budget saved successfully"));
    }

    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<String>> saveBudgetsBulk(
        @RequestParam(required = false) Integer year,
        @RequestParam(required = false) Integer month,
        @RequestParam(required = false) Boolean applyToUpcoming,
        @RequestBody JsonNode rootNode
    ) {
        List<SaveBudgetRequest> items = new ArrayList<>();
        Integer targetYear = year;
        Integer targetMonth = month;
        Boolean targetApplyToUpcoming = applyToUpcoming != null ? applyToUpcoming : false;
        BigDecimal overallLimit = null;

        if (rootNode.isArray()) {
            for (JsonNode itemNode : rootNode) {
                SaveBudgetRequest req = objectMapper.convertValue(itemNode, SaveBudgetRequest.class);
                items.add(req);
            }
        } else if (rootNode.isObject()) {
            if (rootNode.has("year") && !rootNode.get("year").isNull()) {
                targetYear = rootNode.get("year").asInt();
            }
            if (rootNode.has("month") && !rootNode.get("month").isNull()) {
                targetMonth = rootNode.get("month").asInt();
            }
            if (rootNode.has("applyToUpcoming") && !rootNode.get("applyToUpcoming").isNull()) {
                targetApplyToUpcoming = rootNode.get("applyToUpcoming").asBoolean();
            }
            if (rootNode.has("overallLimit") && !rootNode.get("overallLimit").isNull()) {
                overallLimit = new BigDecimal(rootNode.get("overallLimit").asText());
            } else if (rootNode.has("overallBudget") && !rootNode.get("overallBudget").isNull()) {
                overallLimit = new BigDecimal(rootNode.get("overallBudget").asText());
            }

            if (rootNode.has("budgets") && rootNode.get("budgets").isArray()) {
                for (JsonNode itemNode : rootNode.get("budgets")) {
                    SaveBudgetRequest req = objectMapper.convertValue(itemNode, SaveBudgetRequest.class);
                    items.add(req);
                }
            }
        }

        // Golden logic validation: Overall budget cannot be less than the sum of category allocations
        BigDecimal totalAllocatedRupees = BigDecimal.ZERO;
        for (SaveBudgetRequest req : items) {
            if (req.getLimitValue() != null && req.getLimitValue().compareTo(BigDecimal.ZERO) > 0) {
                if ("RUPEES".equalsIgnoreCase(req.getLimitType()) || req.getLimitType() == null) {
                    totalAllocatedRupees = totalAllocatedRupees.add(req.getLimitValue());
                }
            }
        }

        if (overallLimit != null && overallLimit.compareTo(BigDecimal.ZERO) > 0) {
            if (totalAllocatedRupees.compareTo(overallLimit) > 0) {
                throw new IllegalArgumentException(
                    "Overall monthly budget (₹" + overallLimit + ") cannot be less than total category allocations (₹"
                    + totalAllocatedRupees + "). Please increase the overall budget or reduce category allocations."
                );
            }
            // Save overall budget
            budgetService.saveBudget(
                CategoryBudgetService.OVERALL_CATEGORY,
                "RUPEES",
                overallLimit,
                targetYear,
                targetMonth,
                targetApplyToUpcoming
            );
        } else if (overallLimit != null && overallLimit.compareTo(BigDecimal.ZERO) <= 0) {
            // Delete overall budget
            budgetService.saveBudget(
                CategoryBudgetService.OVERALL_CATEGORY,
                "RUPEES",
                BigDecimal.ZERO,
                targetYear,
                targetMonth,
                targetApplyToUpcoming
            );
        }

        for (SaveBudgetRequest req : items) {
            budgetService.saveBudget(
                req.getCategory(),
                req.getLimitType(),
                req.getLimitValue(),
                req.getYear() != null ? req.getYear() : targetYear,
                req.getMonth() != null ? req.getMonth() : targetMonth,
                req.getApplyToUpcoming() != null ? req.getApplyToUpcoming() : targetApplyToUpcoming
            );
        }

        return ResponseEntity.ok(ApiResponse.ok("OK", "Budget limits updated successfully"));
    }

    @DeleteMapping("/{category}")
    public ResponseEntity<ApiResponse<Void>> deleteBudget(@PathVariable String category) {
        budgetService.deleteBudget(category);
        return ResponseEntity.ok(ApiResponse.ok(null, "Category budget deleted successfully"));
    }
}


