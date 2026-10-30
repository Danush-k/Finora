package com.paytrace.model;

import com.paytrace.model.enums.ProcessingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "emailProcessing")
public class EmailProcessing {

    @Id
    private String id;

    @Indexed(unique = true)
    private String messageId;

    private String sender;

    private String subject;

    private Instant receivedAt;

    @Indexed
    private ProcessingStatus processingStatus;

    private String extractedTransactionId;

    private String errorMessage;

    @CreatedDate
    private Instant processedAt;
}
