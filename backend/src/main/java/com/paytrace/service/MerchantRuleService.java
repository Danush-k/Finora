package com.paytrace.service;

import com.paytrace.model.MerchantRule;
import com.paytrace.model.Transaction;
import com.paytrace.repository.MerchantRuleRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class MerchantRuleService {

    private final MerchantRuleRepository ruleRepository;
    private final MongoTemplate mongoTemplate;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MerchantResolution {
        private String merchant;
        private String category;
        private boolean matched;
    }

    public List<MerchantRule> getAllRules() {
        return ruleRepository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<MerchantRule> getRuleById(String id) {
        return ruleRepository.findById(id);
    }

    public MerchantRule saveRule(MerchantRule rule, boolean applyToExisting) {
        if (rule.getRawMerchant() != null) {
            rule.setRawMerchant(rule.getRawMerchant().trim());
        }
        if (rule.getCleanMerchantName() != null) {
            rule.setCleanMerchantName(rule.getCleanMerchantName().trim());
        }
        if (rule.getCategory() != null) {
            rule.setCategory(rule.getCategory().trim());
        }
        if (rule.getMatchType() == null || rule.getMatchType().trim().isEmpty()) {
            rule.setMatchType("CONTAINS");
        }

        // Check if an existing rule exists for this rawMerchant
        Optional<MerchantRule> existingOpt = ruleRepository.findByRawMerchantIgnoreCase(rule.getRawMerchant());
        if (existingOpt.isPresent() && (rule.getId() == null || !rule.getId().equals(existingOpt.get().getId()))) {
            MerchantRule existing = existingOpt.get();
            existing.setCleanMerchantName(rule.getCleanMerchantName());
            existing.setCategory(rule.getCategory());
            existing.setMatchType(rule.getMatchType());
            existing.setUpdatedAt(Instant.now());
            rule = ruleRepository.save(existing);
        } else {
            if (rule.getId() == null) {
                rule.setCreatedAt(Instant.now());
            }
            rule.setUpdatedAt(Instant.now());
            rule = ruleRepository.save(rule);
        }

        if (applyToExisting) {
            int updated = applyRuleToTransactions(rule);
            log.info("Applied merchant rule '{}' to {} existing transactions", rule.getRawMerchant(), updated);
        }

        return rule;
    }

    public int applyRuleToTransactions(MerchantRule rule) {
        if (rule == null || rule.getRawMerchant() == null || rule.getRawMerchant().isEmpty()) {
            return 0;
        }

        String raw = rule.getRawMerchant();
        Pattern regexPattern;
        if ("EXACT".equalsIgnoreCase(rule.getMatchType())) {
            regexPattern = Pattern.compile("^\\s*" + Pattern.quote(raw) + "\\s*$", Pattern.CASE_INSENSITIVE);
        } else {
            // CONTAINS or default
            regexPattern = Pattern.compile(Pattern.quote(raw), Pattern.CASE_INSENSITIVE);
        }

        Query query = new Query(Criteria.where("merchant").regex(regexPattern));
        Update update = new Update();
        if (rule.getCleanMerchantName() != null && !rule.getCleanMerchantName().isEmpty()) {
            update.set("merchant", rule.getCleanMerchantName());
        }
        if (rule.getCategory() != null && !rule.getCategory().isEmpty()) {
            update.set("category", rule.getCategory());
        }
        update.set("updatedAt", Instant.now());

        var result = mongoTemplate.updateMulti(query, update, Transaction.class);
        return (int) result.getModifiedCount();
    }

    public int applyAllRules() {
        List<MerchantRule> rules = getAllRules();
        int totalUpdated = 0;
        for (MerchantRule rule : rules) {
            totalUpdated += applyRuleToTransactions(rule);
        }
        return totalUpdated;
    }

    public void deleteRule(String id) {
        ruleRepository.deleteById(id);
    }

    /**
     * Resolves incoming merchant against custom rules.
     * Returns MerchantResolution if matched, or empty resolution if no rule matches.
     */
    public MerchantResolution resolve(String rawMerchant) {
        if (rawMerchant == null || rawMerchant.trim().isEmpty()) {
            return MerchantResolution.builder().matched(false).build();
        }

        String search = rawMerchant.trim().toLowerCase(Locale.ROOT);
        List<MerchantRule> rules = getAllRules();

        for (MerchantRule rule : rules) {
            String ruleRaw = rule.getRawMerchant().toLowerCase(Locale.ROOT);
            boolean matched = false;

            if ("EXACT".equalsIgnoreCase(rule.getMatchType())) {
                matched = search.equalsIgnoreCase(ruleRaw);
            } else {
                // CONTAINS
                matched = search.contains(ruleRaw) || ruleRaw.contains(search);
            }

            if (matched) {
                return MerchantResolution.builder()
                    .merchant(rule.getCleanMerchantName())
                    .category(rule.getCategory())
                    .matched(true)
                    .build();
            }
        }

        return MerchantResolution.builder().matched(false).build();
    }
}
