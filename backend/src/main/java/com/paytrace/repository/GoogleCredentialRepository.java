package com.paytrace.repository;

import com.paytrace.model.GoogleCredential;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GoogleCredentialRepository extends MongoRepository<GoogleCredential, String> {

    Optional<GoogleCredential> findFirstByConnectedTrue();
}
