package com.paytrace.controller;

import com.paytrace.dto.response.ApiResponse;
import com.paytrace.model.MerchantRule;
import com.paytrace.model.Transaction;
import com.paytrace.service.MerchantRuleService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/merchant-rules")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MerchantRuleController {

    private final MerchantRuleService merchantRuleService;
    private final MongoTemplate mongoTemplate;

    @Data
    public static class SaveRuleRequest {
        private String id;
        private String rawMerchant;
        private String cleanMerchantName;
        private String category;
        private String matchType;
        private boolean applyToExisting;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MerchantRule>>> getAllRules() {
        List<MerchantRule> rules = merchantRuleService.getAllRules();
        return ResponseEntity.ok(ApiResponse.ok(rules, "Merchant rules retrieved successfully"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MerchantRule>> saveRule(@RequestBody SaveRuleRequest request) {
        MerchantRule rule = MerchantRule.builder()
            .id(request.getId())
            .rawMerchant(request.getRawMerchant())
            .cleanMerchantName(request.getCleanMerchantName())
            .category(request.getCategory())
            .matchType(request.getMatchType() != null ? request.getMatchType() : "CONTAINS")
            .build();

        MerchantRule saved = merchantRuleService.saveRule(rule, request.isApplyToExisting());
        return ResponseEntity.ok(ApiResponse.ok(saved, "Merchant rule saved successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable String id) {
        merchantRuleService.deleteRule(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Merchant rule deleted successfully"));
    }

    @PostMapping("/{id}/apply")
    public ResponseEntity<ApiResponse<Map<String, Object>>> applyRule(@PathVariable String id) {
        MerchantRule rule = merchantRuleService.getRuleById(id)
            .orElseThrow(() -> new IllegalArgumentException("Rule not found with ID: " + id));

        int updated = merchantRuleService.applyRuleToTransactions(rule);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "ruleId", id,
            "modifiedCount", updated
        ), "Rule applied to transactions"));
    }

    @PostMapping("/apply-all")
    public ResponseEntity<ApiResponse<Map<String, Object>>> applyAllRules() {
        int totalUpdated = merchantRuleService.applyAllRules();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "totalModifiedCount", totalUpdated
        ), "All merchant rules applied"));
    }

    @GetMapping("/preview-count")
    public ResponseEntity<ApiResponse<Map<String, Object>>> previewCount(
        @RequestParam String merchant,
        @RequestParam(defaultValue = "CONTAINS") String matchType
    ) {
        Pattern pattern = "EXACT".equalsIgnoreCase(matchType)
            ? Pattern.compile("^\\s*" + Pattern.quote(merchant) + "\\s*$", Pattern.CASE_INSENSITIVE)
            : Pattern.compile(Pattern.quote(merchant), Pattern.CASE_INSENSITIVE);

        long count = mongoTemplate.count(new Query(Criteria.where("merchant").regex(pattern)), Transaction.class);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "merchant", merchant,
            "matchingCount", count
        ), "Matching count retrieved"));
    }
}
