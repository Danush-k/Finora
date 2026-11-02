package com.paytrace.repository;

import com.paytrace.model.MerchantRule;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MerchantRuleRepository extends MongoRepository<MerchantRule, String> {

    Optional<MerchantRule> findByRawMerchantIgnoreCase(String rawMerchant);

    List<MerchantRule> findAllByOrderByCreatedAtDesc();
}
