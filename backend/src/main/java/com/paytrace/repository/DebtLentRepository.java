package com.paytrace.repository;

import com.paytrace.model.DebtLentRecord;
import com.paytrace.model.enums.DebtLentStatus;
import com.paytrace.model.enums.DebtLentType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DebtLentRepository extends MongoRepository<DebtLentRecord, String> {

    List<DebtLentRecord> findAllByOrderByCreatedAtDesc();

    List<DebtLentRecord> findByTypeOrderByCreatedAtDesc(DebtLentType type);

    List<DebtLentRecord> findByStatusOrderByCreatedAtDesc(DebtLentStatus status);

    List<DebtLentRecord> findByTypeAndStatusOrderByCreatedAtDesc(DebtLentType type, DebtLentStatus status);
}
