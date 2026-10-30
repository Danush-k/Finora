package com.paytrace.controller;

import com.paytrace.dto.response.ApiResponse;
import com.paytrace.dto.response.GmailStatusDto;
import com.paytrace.model.EmailProcessing;
import com.paytrace.model.GoogleCredential;
import com.paytrace.model.enums.ProcessingStatus;
import com.paytrace.repository.EmailProcessingRepository;
import com.paytrace.repository.GoogleCredentialRepository;
import com.paytrace.repository.TransactionRepository;
import com.paytrace.service.EmailSyncScheduler;
import com.paytrace.service.GmailApiService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/gmail")
@RequiredArgsConstructor
public class GmailSyncController {

    private final GmailApiService gmailApiService;
    private final EmailSyncScheduler emailSyncScheduler;
    private final GoogleCredentialRepository credentialRepository;
    private final EmailProcessingRepository emailProcessingRepository;
    private final TransactionRepository transactionRepository;

    @Value("${paytrace.gmail.frontend-redirect:http://localhost:3000/settings}")
    private String frontendRedirect;

    @Value("${paytrace.gmail.sync.delay-ms:120000}")
    private int syncDelayMs;

    @Value("${paytrace.gmail.sync.hdfc-senders:alerts@hdfcbank.net,instaalerts@hdfcbank.net}")
    private String hdfcSenders;

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<GmailStatusDto>> getStatus() {
        Optional<GoogleCredential> credOpt = credentialRepository.findById("primary_account");
        boolean connected = credOpt.isPresent() && credOpt.get().isConnected();

        long processed = credOpt.map(GoogleCredential::getTotalEmailsProcessed).orElse(0L);
        long transactionsExtracted = transactionRepository.count();
        long needsReview = emailProcessingRepository.countByProcessingStatus(ProcessingStatus.NEEDS_REVIEW);
        long duplicates = emailProcessingRepository.countByProcessingStatus(ProcessingStatus.DUPLICATE);

        GmailStatusDto status = GmailStatusDto.builder()
            .connected(connected)
            .email(credOpt.map(GoogleCredential::getEmail).orElse(null))
            .lastSyncAt(credOpt.map(GoogleCredential::getLastSyncAt).orElse(null))
            .totalEmailsProcessed(processed)
            .totalTransactionsExtracted(transactionsExtracted)
            .needsReviewCount(needsReview)
            .duplicateCount(duplicates)
            .senderFilter(hdfcSenders)
            .syncIntervalSeconds(syncDelayMs / 1000)
            .isSyncing(emailSyncScheduler.isCurrentlySyncing())
            .build();

        return ResponseEntity.ok(ApiResponse.ok(status));
    }

    @GetMapping("/connect")
    public ResponseEntity<ApiResponse<Map<String, String>>> connect() {
        if (!gmailApiService.isConfigured()) {
            return ResponseEntity.badRequest().body(ApiResponse.error(
                "Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured."
            ));
        }

        String authUrl = gmailApiService.buildAuthorizationUrl();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("authorizationUrl", authUrl)));
    }

    @GetMapping("/callback")
    public void callback(@RequestParam("code") String code, HttpServletResponse response) throws IOException {
        try {
            gmailApiService.handleCallback(code);
            response.sendRedirect(frontendRedirect + "?oauth=success");
        } catch (Exception e) {
            log.error("OAuth callback error: ", e);
            response.sendRedirect(frontendRedirect + "?oauth=error&message=" + e.getMessage());
        }
    }

    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<EmailSyncScheduler.SyncResult>> triggerSync() {
        EmailSyncScheduler.SyncResult result = emailSyncScheduler.syncNow();
        return ResponseEntity.ok(ApiResponse.ok(result, result.message()));
    }

    @PostMapping("/disconnect")
    public ResponseEntity<ApiResponse<Void>> disconnect() {
        Optional<GoogleCredential> credOpt = credentialRepository.findById("primary_account");
        if (credOpt.isPresent()) {
            GoogleCredential cred = credOpt.get();
            cred.setConnected(false);
            cred.setAccessToken(null);
            cred.setRefreshToken(null);
            credentialRepository.save(cred);
        }
        return ResponseEntity.ok(ApiResponse.ok(null, "Gmail account disconnected successfully"));
    }

    /**
     * Endpoint to simulate receiving an HDFC transaction email for immediate zero-credential local testing.
     */
    @PostMapping("/simulate-sync")
    public ResponseEntity<ApiResponse<EmailProcessing>> simulateSync(@RequestBody SimulateSyncRequest request) {
        String msgId = request.getMessageId() != null ? request.getMessageId() : "sim_" + System.currentTimeMillis();
        String sender = request.getSender() != null ? request.getSender() : "alerts@hdfcbank.net";
        String subject = request.getSubject() != null ? request.getSubject() : "Alert: HDFC Transaction";
        String body = request.getBody();

        EmailProcessing result = emailSyncScheduler.simulateEmailProcessing(msgId, sender, subject, body);
        return ResponseEntity.ok(ApiResponse.ok(result, "Simulated email processed with status: " + result.getProcessingStatus()));
    }

    @Data
    public static class SimulateSyncRequest {
        private String messageId;
        private String sender;
        private String subject;
        private String body;
    }
}
