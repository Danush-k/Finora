package com.paytrace.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "category_budgets")
@CompoundIndexes({
    @CompoundIndex(name = "cat_year_month_idx", def = "{'category': 1, 'year': 1, 'month': 1}")
})
public class CategoryBudget {

    @Id
    private String id;

    private String category;

    /**
     * Target year (e.g. 2026). Can be null for legacy/default.
     */
    private Integer year;

    /**
     * Target month (1 - 12). Can be null for legacy/default.
     */
    private Integer month;

    /**
     * If true, this limit automatically applies to all upcoming/future months until customized.
     */
    @Builder.Default
    private Boolean applyToUpcoming = false;

    /**
     * RUPEES or PERCENTAGE
     */
    @Builder.Default
    private String limitType = "RUPEES";

    /**
     * Limit in Rupees (e.g. 5000) or Percentage of Monthly Budget/Income (e.g. 15 for 15%)
     */
    private BigDecimal limitValue;

    @Builder.Default
    private String period = "MONTHLY";

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}

