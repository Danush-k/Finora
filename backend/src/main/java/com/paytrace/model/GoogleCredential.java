package com.paytrace.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "googleCredentials")
public class GoogleCredential {

    @Id
    @Builder.Default
    private String id = "primary_account";

    private String email;

    private String accessToken;

    private String refreshToken;

    private Instant tokenExpiry;

    private Instant lastSyncAt;

    @Builder.Default
    private long totalEmailsProcessed = 0L;

    private Instant connectedAt;

    private boolean connected;
}
