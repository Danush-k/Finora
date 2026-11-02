package com.paytrace.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "merchant_rules")
public class MerchantRule {

    @Id
    private String id;

    /**
     * The raw incoming merchant pattern (e.g. "PREMNATH A", "CHAI TRACK", etc.)
     */
    @Indexed(unique = true)
    private String rawMerchant;

    /**
     * Clean, human-friendly merchant display name (e.g. "PREMNATH A (Metro Cafe)" or "Metro Cafe")
     */
    private String cleanMerchantName;

    /**
     * Default category to assign (e.g. "Food & Dining")
     */
    private String category;

    /**
     * Matching strategy: CONTAINS, EXACT, or REGEX (default: CONTAINS)
     */
    @Builder.Default
    private String matchType = "CONTAINS";

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
