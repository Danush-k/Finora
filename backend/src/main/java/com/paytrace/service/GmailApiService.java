package com.paytrace.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.google.api.services.gmail.model.MessagePart;
import com.google.api.services.gmail.model.MessagePartHeader;
import com.paytrace.repository.GoogleCredentialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GmailApiService {

    private final GoogleCredentialRepository credentialRepository;

    @Value("${paytrace.gmail.client-id:}")
    private String clientId;

    @Value("${paytrace.gmail.client-secret:}")
    private String clientSecret;

    @Value("${paytrace.gmail.redirect-uri:http://localhost:8080/api/gmail/callback}")
    private String redirectUri;

    @Value("${paytrace.gmail.sync.hdfc-senders:alerts@hdfcbank.net,instaalerts@hdfcbank.net}")
    private String hdfcSenders;

    private static final List<String> SCOPES = List.of("https://www.googleapis.com/auth/gmail.readonly");
    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    public boolean isConfigured() {
        return clientId != null && !clientId.trim().isEmpty() &&
               clientSecret != null && !clientSecret.trim().isEmpty();
    }

    public String buildAuthorizationUrl() {
        if (!isConfigured()) {
            throw new IllegalStateException("Google OAuth Client ID and Secret are not configured in environment variables.");
        }

        try {
            NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
            GoogleClientSecrets.Details web = new GoogleClientSecrets.Details();
            web.setClientId(clientId);
            web.setClientSecret(clientSecret);
            GoogleClientSecrets clientSecrets = new GoogleClientSecrets().setWeb(web);

            GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                httpTransport, JSON_FACTORY, clientSecrets, SCOPES)
                .setAccessType("offline")
                .setApprovalPrompt("force")
                .build();

            return flow.newAuthorizationUrl().setRedirectUri(redirectUri).build();
        } catch (GeneralSecurityException | IOException e) {
            throw new RuntimeException("Failed to construct Google OAuth authorization URL", e);
        }
    }

    public com.paytrace.model.GoogleCredential handleCallback(String authCode) {
        try {
            NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
            GoogleClientSecrets.Details web = new GoogleClientSecrets.Details();
            web.setClientId(clientId);
            web.setClientSecret(clientSecret);
            GoogleClientSecrets clientSecrets = new GoogleClientSecrets().setWeb(web);

            GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                httpTransport, JSON_FACTORY, clientSecrets, SCOPES)
                .setAccessType("offline")
                .setApprovalPrompt("force")
                .build();

            GoogleTokenResponse tokenResponse = flow.newTokenRequest(authCode)
                .setRedirectUri(redirectUri)
                .execute();

            GoogleCredential credential = new GoogleCredential.Builder()
                .setTransport(httpTransport)
                .setJsonFactory(JSON_FACTORY)
                .setClientSecrets(clientSecrets)
                .build()
                .setFromTokenResponse(tokenResponse);

            Gmail gmail = new Gmail.Builder(httpTransport, JSON_FACTORY, credential)
                .setApplicationName("Finora by PayTrace")
                .build();

            var profile = gmail.users().getProfile("me").execute();
            String emailAddress = profile.getEmailAddress();

            Instant expiry = tokenResponse.getExpiresInSeconds() != null ?
                Instant.now().plusSeconds(tokenResponse.getExpiresInSeconds()) : null;

            com.paytrace.model.GoogleCredential entity = credentialRepository.findById("primary_account")
                .orElse(com.paytrace.model.GoogleCredential.builder().id("primary_account").build());

            entity.setEmail(emailAddress);
            entity.setAccessToken(tokenResponse.getAccessToken());
            if (tokenResponse.getRefreshToken() != null) {
                entity.setRefreshToken(tokenResponse.getRefreshToken());
            }
            entity.setTokenExpiry(expiry);
            entity.setConnected(true);
            entity.setConnectedAt(Instant.now());

            return credentialRepository.save(entity);
        } catch (Exception e) {
            log.error("Failed to exchange OAuth code for tokens: ", e);
            throw new RuntimeException("OAuth token exchange failed: " + e.getMessage(), e);
        }
    }

    public List<GmailMessageContent> fetchHdfcEmails(com.paytrace.model.GoogleCredential cred, int maxResults) {
        if (!isConfigured() || cred == null || cred.getRefreshToken() == null) {
            return Collections.emptyList();
        }

        try {
            NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
            GoogleClientSecrets.Details web = new GoogleClientSecrets.Details();
            web.setClientId(clientId);
            web.setClientSecret(clientSecret);
            GoogleClientSecrets clientSecrets = new GoogleClientSecrets().setWeb(web);

            GoogleCredential credential = new GoogleCredential.Builder()
                .setTransport(httpTransport)
                .setJsonFactory(JSON_FACTORY)
                .setClientSecrets(clientSecrets)
                .build()
                .setRefreshToken(cred.getRefreshToken());

            // Refresh token if needed
            credential.refreshToken();
            cred.setAccessToken(credential.getAccessToken());

            Gmail gmail = new Gmail.Builder(httpTransport, JSON_FACTORY, credential)
                .setApplicationName("Finora by PayTrace")
                .build();

            // Construct search query
            String[] senders = hdfcSenders.split(",");
            StringBuilder queryBuilder = new StringBuilder();
            queryBuilder.append("(");
            for (int i = 0; i < senders.length; i++) {
                if (i > 0) queryBuilder.append(" OR ");
                queryBuilder.append("from:").append(senders[i].trim());
            }
            queryBuilder.append(")");

            ListMessagesResponse listResponse = gmail.users().messages().list("me")
                .setQ(queryBuilder.toString())
                .setMaxResults((long) maxResults)
                .execute();

            List<Message> messages = listResponse.getMessages();
            if (messages == null || messages.isEmpty()) {
                return Collections.emptyList();
            }

            List<GmailMessageContent> result = new ArrayList<>();
            for (Message msgSummary : messages) {
                Message fullMsg = gmail.users().messages().get("me", msgSummary.getId())
                    .setFormat("full")
                    .execute();

                String subject = "";
                String sender = "";
                if (fullMsg.getPayload() != null && fullMsg.getPayload().getHeaders() != null) {
                    for (MessagePartHeader header : fullMsg.getPayload().getHeaders()) {
                        if ("Subject".equalsIgnoreCase(header.getName())) {
                            subject = header.getValue();
                        } else if ("From".equalsIgnoreCase(header.getName())) {
                            sender = header.getValue();
                        }
                    }
                }

                String body = extractBody(fullMsg.getPayload());
                if (body == null || body.isEmpty()) {
                    body = fullMsg.getSnippet();
                }

                Instant internalDate = fullMsg.getInternalDate() != null ?
                    Instant.ofEpochMilli(fullMsg.getInternalDate()) : Instant.now();

                result.add(new GmailMessageContent(fullMsg.getId(), sender, subject, body, internalDate));
            }

            return result;
        } catch (Exception e) {
            log.error("Error fetching Gmail messages: ", e);
            throw new RuntimeException("Failed to fetch Gmail emails: " + e.getMessage(), e);
        }
    }

    private String extractBody(MessagePart part) {
        if (part == null) return "";
        if (part.getBody() != null && part.getBody().getData() != null) {
            byte[] bytes = Base64.getUrlDecoder().decode(part.getBody().getData());
            return new String(bytes, StandardCharsets.UTF_8);
        }
        if (part.getParts() != null) {
            StringBuilder sb = new StringBuilder();
            for (MessagePart subPart : part.getParts()) {
                String subText = extractBody(subPart);
                if (subText != null && !subText.isEmpty()) {
                    sb.append(subText).append(" ");
                }
            }
            return sb.toString();
        }
        return "";
    }

    public record GmailMessageContent(
        String messageId,
        String sender,
        String subject,
        String body,
        Instant receivedAt
    ) {}
}
