package com.paytrace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GmailStatusDto {

    private boolean connected;
    private String email;
    private Instant lastSyncAt;
    private long totalEmailsProcessed;
    private long totalTransactionsExtracted;
    private long needsReviewCount;
    private long duplicateCount;
    private String senderFilter;
    private int syncIntervalSeconds;
    private boolean isSyncing;
}
