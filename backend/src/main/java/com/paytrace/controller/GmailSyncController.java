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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

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

    private String getEffectiveFrontendRedirect() {
        if (frontendRedirect != null && !frontendRedirect.isBlank() && !frontendRedirect.contains("localhost:3000")) {
            return frontendRedirect.replaceAll("[\\r\\n]", "").trim();
        }
        return "https://finora-app-13673.web.app/settings";
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<GmailStatusDto>> getStatus() {
        Optional<GoogleCredential> credOpt = credentialRepository.findById("primary_account");
        boolean connected = credOpt.isPresent() && credOpt.get().isConnected();
        String errorMsg = credOpt.map(GoogleCredential::getErrorMessage).orElse(null);

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
            .errorMessage(errorMsg)
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

    @GetMapping(value = "/callback", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public String callback(@RequestParam("code") String code) {
        String targetUrl = getEffectiveFrontendRedirect();
        try {
            gmailApiService.handleCallback(code);
            CompletableFuture.runAsync(() -> {
                try {
                    log.info("Starting initial sync following successful Gmail OAuth...");
                    emailSyncScheduler.syncNow();
                } catch (Exception ex) {
                    log.error("Initial background sync error: ", ex);
                }
            });
            return String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <meta http-equiv="refresh" content="1;url=%s?oauth=success">
                  <title>Finora - Gmail Connected</title>
                  <style>
                    body { margin:0; background:#0B071E; color:white; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; text-align:center; }
                    .card { background:rgba(255,255,255,0.06); padding:40px; border-radius:24px; border:1px solid rgba(255,255,255,0.12); max-width:400px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                    h2 { color:#4ADE80; margin-bottom:10px; font-size:22px; }
                    p { color:#94A3B8; font-size:14px; line-height:1.5; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <h2>✓ Gmail Connected!</h2>
                    <p>Synchronizing your transactions... Redirecting you back to Finora.</p>
                  </div>
                  <script>
                    setTimeout(function() {
                      window.location.href = "%s?oauth=success";
                    }, 1000);
                  </script>
                </body>
                </html>
                """, targetUrl, targetUrl);
        } catch (Exception e) {
            log.error("OAuth callback error: ", e);
            String safeMsg = e.getMessage() != null ? e.getMessage().replaceAll("[\\r\\n]", " ") : "Unknown error";
            return String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <title>Finora - Connection Error</title>
                  <style>
                    body { margin:0; background:#0B071E; color:white; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; text-align:center; }
                    .card { background:rgba(255,255,255,0.06); padding:40px; border-radius:24px; border:1px solid rgba(255,255,255,0.12); max-width:440px; }
                    h2 { color:#F87171; margin-bottom:10px; font-size:22px; }
                    p { color:#94A3B8; font-size:13px; line-height:1.5; word-break:break-word; }
                    a { display:inline-block; margin-top:16px; padding:10px 20px; background:#6366F1; color:white; text-decoration:none; border-radius:12px; font-weight:bold; font-size:13px; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <h2>Connection Failed</h2>
                    <p>%s</p>
                    <a href="%s">Return to Settings</a>
                  </div>
                </body>
                </html>
                """, safeMsg, targetUrl);
        }
    }

    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<EmailSyncScheduler.SyncResult>> triggerSync() {
        Optional<GoogleCredential> credOpt = credentialRepository.findById("primary_account");
        if (credOpt.isEmpty() || !credOpt.get().isConnected() || credOpt.get().getRefreshToken() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error(
                "Gmail authorization expired or account disconnected. Please click 'Reconnect Gmail' to re-authorize."
            ));
        }

        if (emailSyncScheduler.isCurrentlySyncing()) {
            return ResponseEntity.ok(ApiResponse.ok(
                new EmailSyncScheduler.SyncResult(0, 0, 0, 0, "Sync already in progress"),
                "A synchronization is already actively in progress."
            ));
        }

        // Run sync asynchronously to prevent HTTP gateway timeouts & connection resets
        CompletableFuture.runAsync(() -> {
            try {
                emailSyncScheduler.syncNow();
            } catch (Exception e) {
                log.error("Background sync error: ", e);
            }
        });

        return ResponseEntity.ok(ApiResponse.ok(
            new EmailSyncScheduler.SyncResult(0, 0, 0, 0, "Sync started in background"),
            "Sync started in background. New transactions will appear automatically."
        ));
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

    @GetMapping("/inspect-sample")
    public ResponseEntity<ApiResponse<java.util.List<GmailApiService.GmailMessageContent>>> inspectSample() {
        Optional<GoogleCredential> credOpt = credentialRepository.findById("primary_account");
        if (credOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("No account connected"));
        }
        var sample = gmailApiService.fetchHdfcEmails(credOpt.get(), 10);
        return ResponseEntity.ok(ApiResponse.ok(sample));
    }

    @GetMapping("/inspect-message")
    public ResponseEntity<ApiResponse<String>> inspectMessage(@RequestParam String id) {
        Optional<GoogleCredential> credOpt = credentialRepository.findById("primary_account");
        if (credOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("No account connected"));
        }
        var emails = gmailApiService.fetchHdfcEmails(credOpt.get(), 50);
        for (var e : emails) {
            if (id.equals(e.messageId())) {
                return ResponseEntity.ok(ApiResponse.ok(e.body()));
            }
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/reset-and-resync")
    public ResponseEntity<ApiResponse<EmailSyncScheduler.SyncResult>> resetAndResync() {
        // Clear all transactions and emailProcessing history
        transactionRepository.deleteAll();
        emailProcessingRepository.deleteAll();
        Optional<GoogleCredential> credOpt = credentialRepository.findById("primary_account");
        credOpt.ifPresent(c -> {
            c.setTotalEmailsProcessed(0);
            credentialRepository.save(c);
        });

        // Trigger fresh sync
        EmailSyncScheduler.SyncResult result = emailSyncScheduler.syncNow();
        return ResponseEntity.ok(ApiResponse.ok(result, "Reset complete and fresh sync triggered"));
    }

    @Data
    public static class SimulateSyncRequest {
        private String messageId;
        private String sender;
        private String subject;
        private String body;
    }
}
