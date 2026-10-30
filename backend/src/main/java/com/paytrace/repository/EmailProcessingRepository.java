package com.paytrace.repository;

import com.paytrace.model.EmailProcessing;
import com.paytrace.model.enums.ProcessingStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailProcessingRepository extends MongoRepository<EmailProcessing, String> {

    Optional<EmailProcessing> findByMessageId(String messageId);

    boolean existsByMessageId(String messageId);

    long countByProcessingStatus(ProcessingStatus status);
}
