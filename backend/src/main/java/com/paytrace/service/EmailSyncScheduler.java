package com.paytrace.service;

import com.paytrace.model.EmailProcessing;
import com.paytrace.model.GoogleCredential;
import com.paytrace.model.Transaction;
import com.paytrace.model.enums.ProcessingStatus;
import com.paytrace.parser.HdfcEmailParser;
import com.paytrace.parser.ParsedTransaction;
import com.paytrace.repository.EmailProcessingRepository;
import com.paytrace.repository.GoogleCredentialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailSyncScheduler {

    private final GmailApiService gmailApiService;
    private final HdfcEmailParser hdfcEmailParser;
    private final TransactionService transactionService;
    private final EmailProcessingRepository emailProcessingRepository;
    private final GoogleCredentialRepository credentialRepository;

    @Value("${paytrace.gmail.sync.enabled:true}")
    private boolean syncEnabled;

    private final AtomicBoolean isSyncing = new AtomicBoolean(false);

    /**
     * Automatic recurring sync. Default fixedDelayString configured in application.yml
     */
    @Scheduled(fixedDelayString = "${paytrace.gmail.sync.delay-ms:120000}", initialDelay = 15000)
    public void scheduledSync() {
        if (!syncEnabled) {
            return;
        }
        Optional<GoogleCredential> credOpt = credentialRepository.findFirstByConnectedTrue();
        if (credOpt.isEmpty()) {
            log.debug("Automated sync skipped: No connected Gmail account.");
            return;
        }
        log.info("Starting automated Gmail transaction sync...");
        syncNow();
    }

    /**
     * Triggered on-demand via POST /api/gmail/sync or by the scheduler.
     */
    public SyncResult syncNow() {
        return syncInternal(500, 6);
    }

    public SyncResult syncSingleBatch() {
        return syncInternal(500, 1);
    }

    private SyncResult syncInternal(int batchSize, int maxIterations) {
        if (!isSyncing.compareAndSet(false, true)) {
            log.warn("Sync already in progress. Ignoring duplicate trigger.");
            return new SyncResult(0, 0, 0, 0, "Sync already in progress");
        }

        try {
            Optional<GoogleCredential> credOpt = credentialRepository.findFirstByConnectedTrue();
            if (credOpt.isEmpty()) {
                return new SyncResult(0, 0, 0, 0, "No Gmail account connected");
            }

            GoogleCredential cred = credOpt.get();
            int totalProcessed = 0;
            int totalDuplicates = 0;
            int totalNeedsReview = 0;
            int totalErrors = 0;

            int iterations = 0;
            while (iterations < maxIterations) {
                iterations++;
                List<GmailApiService.GmailMessageContent> emails = gmailApiService.fetchHdfcEmails(cred, batchSize);
                if (emails.isEmpty()) {
                    log.info("No new emails to process in iteration {}.", iterations);
                    break;
                }

                int batchProcessed = 0;
                int batchDuplicates = 0;
                int batchNeedsReview = 0;
                int batchErrors = 0;

                for (GmailApiService.GmailMessageContent email : emails) {
                    if (emailProcessingRepository.existsByMessageId(email.messageId())) {
                        batchDuplicates++;
                        continue;
                    }

                    EmailProcessing record = EmailProcessing.builder()
                        .messageId(email.messageId())
                        .sender(email.sender())
                        .subject(email.subject())
                        .receivedAt(email.receivedAt())
                        .processedAt(Instant.now())
                        .build();

                    try {
                        Optional<ParsedTransaction> parsedOpt = hdfcEmailParser.parse(email.subject(), email.body());
                        if (parsedOpt.isPresent()) {
                            ParsedTransaction parsed = parsedOpt.get();
                            Optional<Transaction> savedOpt = transactionService.saveExtractedTransaction(parsed, email.messageId());
                            if (savedOpt.isPresent()) {
                                record.setProcessingStatus(ProcessingStatus.PROCESSED);
                                record.setExtractedTransactionId(savedOpt.get().getId());
                                batchProcessed++;
                            } else {
                                record.setProcessingStatus(ProcessingStatus.DUPLICATE);
                                batchDuplicates++;
                            }
                        } else {
                            record.setProcessingStatus(ProcessingStatus.NEEDS_REVIEW);
                            record.setErrorMessage("Email format not recognized by HDFC rules");
                            batchNeedsReview++;
                        }
                    } catch (Exception e) {
                        log.error("Failed processing email message {}: ", email.messageId(), e);
                        record.setProcessingStatus(ProcessingStatus.FAILED);
                        record.setErrorMessage(e.getMessage());
                        batchErrors++;
                    }

                    emailProcessingRepository.save(record);
                }

                totalProcessed += batchProcessed;
                totalDuplicates += batchDuplicates;
                totalNeedsReview += batchNeedsReview;
                totalErrors += batchErrors;

                cred.setLastSyncAt(Instant.now());
                cred.setTotalEmailsProcessed(cred.getTotalEmailsProcessed() + emails.size());
                credentialRepository.save(cred);

                log.info("Sync iteration {} finished: {} processed, {} duplicates, {} needsReview. Total processed so far: {}",
                    iterations, batchProcessed, batchDuplicates, batchNeedsReview, totalProcessed);

                // If this batch returned fewer messages than batchSize, we have reached the end of new messages
                if (emails.size() < batchSize) {
                    break;
                }
            }

            return new SyncResult(totalProcessed, totalDuplicates, totalNeedsReview, totalErrors, "Sync completed successfully");
        } finally {
            isSyncing.set(false);
        }
    }

    /**
     * Ingests a raw or simulated email directly for testing and demo purposes.
     */
    public EmailProcessing simulateEmailProcessing(String messageId, String sender, String subject, String body) {
        if (emailProcessingRepository.existsByMessageId(messageId)) {
            log.info("Simulation: Message {} already processed", messageId);
            return emailProcessingRepository.findByMessageId(messageId).get();
        }

        EmailProcessing record = EmailProcessing.builder()
            .messageId(messageId)
            .sender(sender)
            .subject(subject)
            .receivedAt(Instant.now())
            .processedAt(Instant.now())
            .build();

        try {
            Optional<ParsedTransaction> parsedOpt = hdfcEmailParser.parse(subject, body);
            if (parsedOpt.isPresent()) {
                ParsedTransaction parsed = parsedOpt.get();
                Optional<Transaction> savedOpt = transactionService.saveExtractedTransaction(parsed, messageId);
                if (savedOpt.isPresent()) {
                    record.setProcessingStatus(ProcessingStatus.PROCESSED);
                    record.setExtractedTransactionId(savedOpt.get().getId());
                } else {
                    record.setProcessingStatus(ProcessingStatus.DUPLICATE);
                }
            } else {
                record.setProcessingStatus(ProcessingStatus.NEEDS_REVIEW);
                record.setErrorMessage("Email format not recognized by HDFC rules");
            }
        } catch (Exception e) {
            record.setProcessingStatus(ProcessingStatus.FAILED);
            record.setErrorMessage(e.getMessage());
        }

        return emailProcessingRepository.save(record);
    }

    public boolean isCurrentlySyncing() {
        return isSyncing.get();
    }

    public record SyncResult(
        int processed,
        int duplicates,
        int needsReview,
        int errors,
        String message
    ) {}
}
