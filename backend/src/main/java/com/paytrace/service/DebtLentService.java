package com.paytrace.service;

import com.paytrace.dto.request.DebtLentRequestDto;
import com.paytrace.dto.request.RepaymentToggleRequestDto;
import com.paytrace.dto.response.DebtLentSummaryDto;
import com.paytrace.exception.ResourceNotFoundException;
import com.paytrace.model.DebtLentRecord;
import com.paytrace.model.RepaymentInstallment;
import com.paytrace.model.Transaction;
import com.paytrace.model.enums.DebtLentStatus;
import com.paytrace.model.enums.DebtLentType;
import com.paytrace.model.enums.InterestPeriodType;
import com.paytrace.model.enums.TransactionType;
import com.paytrace.repository.DebtLentRepository;
import com.paytrace.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class DebtLentService {

    private final DebtLentRepository debtLentRepository;
    private final TransactionRepository transactionRepository;
    private final MongoTemplate mongoTemplate;
    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    public List<DebtLentRecord> getAllRecords(DebtLentType type, DebtLentStatus status, String search) {
        List<Criteria> criteriaList = new ArrayList<>();

        if (type != null) {
            criteriaList.add(Criteria.where("type").is(type));
        }

        if (status != null) {
            criteriaList.add(Criteria.where("status").is(status));
        }

        if (search != null && !search.trim().isEmpty()) {
            Pattern regex = Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
            criteriaList.add(new Criteria().orOperator(
                Criteria.where("counterpartyName").regex(regex),
                Criteria.where("description").regex(regex)
            ));
        }

        Query query = new Query();
        if (!criteriaList.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteriaList.toArray(new Criteria[0])));
        }
        query.with(Sort.by(Sort.Direction.DESC, "createdAt"));

        List<DebtLentRecord> records = mongoTemplate.find(query, DebtLentRecord.class);

        // Auto-refresh overdue status if dueDate has passed
        Instant now = Instant.now();
        boolean hasUpdates = false;
        for (DebtLentRecord r : records) {
            if (r.getStatus() != DebtLentStatus.SETTLED && r.getDueDate() != null && r.getDueDate().isBefore(now)) {
                if (r.getStatus() != DebtLentStatus.OVERDUE) {
                    r.setStatus(DebtLentStatus.OVERDUE);
                    debtLentRepository.save(r);
                    hasUpdates = true;
                }
            }
        }

        return records;
    }

    public DebtLentSummaryDto getSummary() {
        List<DebtLentRecord> all = debtLentRepository.findAll();

        BigDecimal lentPrincipal = BigDecimal.ZERO;
        BigDecimal lentRemaining = BigDecimal.ZERO;
        BigDecimal lentRecovered = BigDecimal.ZERO;
        int lentActive = 0;

        BigDecimal debtPrincipal = BigDecimal.ZERO;
        BigDecimal debtRemaining = BigDecimal.ZERO;
        BigDecimal debtRepaid = BigDecimal.ZERO;
        int debtActive = 0;

        int overdueCount = 0;
        Instant now = Instant.now();

        for (DebtLentRecord r : all) {
            BigDecimal principal = r.getPrincipalAmount() != null ? r.getPrincipalAmount() : BigDecimal.ZERO;
            BigDecimal remaining = r.getRemainingAmount() != null ? r.getRemainingAmount() : BigDecimal.ZERO;
            BigDecimal repaid = r.getTotalRepaidAmount() != null ? r.getTotalRepaidAmount() : BigDecimal.ZERO;

            boolean isOverdue = r.getStatus() != DebtLentStatus.SETTLED && r.getDueDate() != null && r.getDueDate().isBefore(now);
            if (isOverdue) overdueCount++;

            if (r.getType() == DebtLentType.LENT) {
                lentPrincipal = lentPrincipal.add(principal);
                lentRemaining = lentRemaining.add(remaining);
                lentRecovered = lentRecovered.add(repaid);
                if (r.getStatus() != DebtLentStatus.SETTLED) lentActive++;
            } else if (r.getType() == DebtLentType.DEBT) {
                debtPrincipal = debtPrincipal.add(principal);
                debtRemaining = debtRemaining.add(remaining);
                debtRepaid = debtRepaid.add(repaid);
                if (r.getStatus() != DebtLentStatus.SETTLED) debtActive++;
            }
        }

        BigDecimal netStanding = lentRemaining.subtract(debtRemaining);

        return DebtLentSummaryDto.builder()
            .totalLentPrincipal(lentPrincipal)
            .totalLentRemaining(lentRemaining)
            .totalLentRecovered(lentRecovered)
            .lentActiveCount(lentActive)
            .totalDebtPrincipal(debtPrincipal)
            .totalDebtRemaining(debtRemaining)
            .totalDebtRepaid(debtRepaid)
            .debtActiveCount(debtActive)
            .netStanding(netStanding)
            .overdueCount(overdueCount)
            .build();
    }

    public DebtLentRecord getRecordById(String id) {
        return debtLentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Debt/Lent record not found with id: " + id));
    }

    @Transactional
    public DebtLentRecord createRecord(DebtLentRequestDto dto) {
        BigDecimal principal = dto.getPrincipalAmount();
        BigDecimal accruedInterest = BigDecimal.ZERO;
        BigDecimal totalExpected = principal;

        int months = dto.getTenureMonths() != null && dto.getTenureMonths() > 0 ? dto.getTenureMonths() : 1;

        if (dto.isHasInterest() && dto.getInterestRate() != null && dto.getInterestRate().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal rate = dto.getInterestRate().divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
            if (dto.getInterestPeriodType() == InterestPeriodType.MONTHLY) {
                accruedInterest = principal.multiply(rate).multiply(BigDecimal.valueOf(months))
                    .setScale(2, RoundingMode.HALF_UP);
            } else {
                // Default Yearly
                accruedInterest = principal.multiply(rate).multiply(BigDecimal.valueOf(months))
                    .divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            }
            totalExpected = principal.add(accruedInterest);
        }

        // Checklist installments
        List<RepaymentInstallment> installments = new ArrayList<>();
        if (dto.getInstallments() != null && !dto.getInstallments().isEmpty()) {
            installments.addAll(dto.getInstallments());
        } else if (months > 1) {
            // Auto-generate periodic checklist checkpoints based on tenure
            BigDecimal monthlyAmount = totalExpected.divide(BigDecimal.valueOf(months), 2, RoundingMode.HALF_UP);
            ZonedDateTime cursorDate = dto.getStartDate().atZone(ZONE);

            for (int i = 1; i <= months; i++) {
                cursorDate = cursorDate.plusMonths(1);
                installments.add(RepaymentInstallment.builder()
                    .id(UUID.randomUUID().toString())
                    .title("Month " + i + " Installment")
                    .dueDate(cursorDate.toInstant())
                    .amount(monthlyAmount)
                    .settled(false)
                    .settledAmount(BigDecimal.ZERO)
                    .build());
            }
        } else {
            // Single settlement checkpoint
            installments.add(RepaymentInstallment.builder()
                .id(UUID.randomUUID().toString())
                .title("Full Settlement")
                .dueDate(dto.getDueDate() != null ? dto.getDueDate() : dto.getStartDate().atZone(ZONE).plusMonths(1).toInstant())
                .amount(totalExpected)
                .settled(false)
                .settledAmount(BigDecimal.ZERO)
                .build());
        }

        // If dueDate was not explicitly passed, take the last installment's due date
        Instant effectiveDueDate = dto.getDueDate();
        if (effectiveDueDate == null && !installments.isEmpty()) {
            effectiveDueDate = installments.get(installments.size() - 1).getDueDate();
        }

        DebtLentRecord record = DebtLentRecord.builder()
            .type(dto.getType())
            .counterpartyName(dto.getCounterpartyName().trim())
            .counterpartyPhone(dto.getCounterpartyPhone())
            .principalAmount(principal)
            .description(dto.getDescription())
            .startDate(dto.getStartDate())
            .dueDate(effectiveDueDate)
            .linkedTransactionId(dto.getLinkedTransactionId())
            .linkedTransactionDescription(dto.getLinkedTransactionDescription())
            .linkedTransactionAmount(dto.getLinkedTransactionAmount())
            .hasInterest(dto.isHasInterest())
            .interestRate(dto.getInterestRate())
            .interestPeriodType(dto.getInterestPeriodType() != null ? dto.getInterestPeriodType() : InterestPeriodType.YEARLY)
            .tenureMonths(months)
            .accruedInterest(accruedInterest)
            .totalExpectedAmount(totalExpected)
            .installments(installments)
            .totalRepaidAmount(BigDecimal.ZERO)
            .remainingAmount(totalExpected)
            .status(DebtLentStatus.ACTIVE)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();

        return debtLentRepository.save(record);
    }

    @Transactional
    public DebtLentRecord updateRecord(String id, DebtLentRequestDto dto) {
        DebtLentRecord existing = getRecordById(id);

        existing.setCounterpartyName(dto.getCounterpartyName().trim());
        existing.setCounterpartyPhone(dto.getCounterpartyPhone());
        existing.setDescription(dto.getDescription());
        existing.setStartDate(dto.getStartDate());
        if (dto.getDueDate() != null) {
            existing.setDueDate(dto.getDueDate());
        }
        existing.setLinkedTransactionId(dto.getLinkedTransactionId());
        existing.setLinkedTransactionDescription(dto.getLinkedTransactionDescription());
        existing.setLinkedTransactionAmount(dto.getLinkedTransactionAmount());
        existing.setUpdatedAt(Instant.now());

        return debtLentRepository.save(existing);
    }

    @Transactional
    public void deleteRecord(String id) {
        DebtLentRecord existing = getRecordById(id);
        debtLentRepository.delete(existing);
    }

    @Transactional
    public DebtLentRecord toggleInstallment(String recordId, String installmentId, RepaymentToggleRequestDto toggleDto) {
        DebtLentRecord record = getRecordById(recordId);

        List<RepaymentInstallment> list = record.getInstallments();
        RepaymentInstallment target = null;
        for (RepaymentInstallment inst : list) {
            if (inst.getId().equals(installmentId)) {
                target = inst;
                break;
            }
        }

        if (target == null) {
            throw new ResourceNotFoundException("Installment checklist item not found: " + installmentId);
        }

        target.setSettled(toggleDto.isSettled());
        if (toggleDto.isSettled()) {
            target.setSettledDate(toggleDto.getSettledDate() != null ? toggleDto.getSettledDate() : Instant.now());
            target.setSettledAmount(toggleDto.getSettledAmount() != null ? toggleDto.getSettledAmount() : target.getAmount());
            if (toggleDto.getLinkedTransactionId() != null) {
                target.setLinkedTransactionId(toggleDto.getLinkedTransactionId());
                target.setLinkedTransactionDescription(toggleDto.getLinkedTransactionDescription());
            }
            if (toggleDto.getNotes() != null) {
                target.setNotes(toggleDto.getNotes());
            }
        } else {
            target.setSettledDate(null);
            target.setSettledAmount(BigDecimal.ZERO);
            target.setLinkedTransactionId(null);
            target.setLinkedTransactionDescription(null);
        }

        recalculateStatusAndBalances(record);
        return debtLentRepository.save(record);
    }

    @Transactional
    public DebtLentRecord addInstallment(String recordId, RepaymentInstallment installment) {
        DebtLentRecord record = getRecordById(recordId);
        if (installment.getId() == null || installment.getId().isEmpty()) {
            installment.setId(UUID.randomUUID().toString());
        }
        if (installment.getAmount() == null) {
            installment.setAmount(BigDecimal.ZERO);
        }
        record.getInstallments().add(installment);
        recalculateStatusAndBalances(record);
        return debtLentRepository.save(record);
    }

    @Transactional
    public DebtLentRecord recordQuickRepayment(String recordId, BigDecimal amount, String linkedTxnId, String linkedTxnDesc, String notes) {
        DebtLentRecord record = getRecordById(recordId);

        RepaymentInstallment inst = RepaymentInstallment.builder()
            .id(UUID.randomUUID().toString())
            .title("Repayment on " + ZonedDateTime.now(ZONE).format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy")))
            .dueDate(Instant.now())
            .amount(amount)
            .settled(true)
            .settledDate(Instant.now())
            .settledAmount(amount)
            .linkedTransactionId(linkedTxnId)
            .linkedTransactionDescription(linkedTxnDesc)
            .notes(notes)
            .build();

        record.getInstallments().add(inst);
        recalculateStatusAndBalances(record);
        return debtLentRepository.save(record);
    }

    private void recalculateStatusAndBalances(DebtLentRecord record) {
        BigDecimal totalRepaid = BigDecimal.ZERO;
        for (RepaymentInstallment inst : record.getInstallments()) {
            if (inst.isSettled()) {
                BigDecimal amt = inst.getSettledAmount() != null ? inst.getSettledAmount() : inst.getAmount();
                if (amt != null) {
                    totalRepaid = totalRepaid.add(amt);
                }
            }
        }

        record.setTotalRepaidAmount(totalRepaid);
        BigDecimal expected = record.getTotalExpectedAmount() != null ? record.getTotalExpectedAmount() : record.getPrincipalAmount();
        BigDecimal remaining = expected.subtract(totalRepaid);
        if (remaining.compareTo(BigDecimal.ZERO) < 0) {
            remaining = BigDecimal.ZERO;
        }
        record.setRemainingAmount(remaining);

        if (remaining.compareTo(BigDecimal.ZERO) == 0) {
            record.setStatus(DebtLentStatus.SETTLED);
        } else if (totalRepaid.compareTo(BigDecimal.ZERO) > 0) {
            record.setStatus(DebtLentStatus.PARTIALLY_SETTLED);
        } else if (record.getDueDate() != null && record.getDueDate().isBefore(Instant.now())) {
            record.setStatus(DebtLentStatus.OVERDUE);
        } else {
            record.setStatus(DebtLentStatus.ACTIVE);
        }

        record.setUpdatedAt(Instant.now());
    }

    public List<Transaction> getCandidateTransactions(String search, Integer limit) {
        return getCandidateTransactions(search, limit, null);
    }

    public List<Transaction> getCandidateTransactions(String search, Integer limit, TransactionType transactionType) {
        int max = limit != null && limit > 0 ? limit : 25;
        Query query = new Query();
        List<Criteria> filters = new ArrayList<>();

        if (transactionType != null) {
            filters.add(Criteria.where("transactionType").is(transactionType));
        }

        BigDecimal targetAmount = null;
        if (search != null && !search.trim().isEmpty()) {
            String raw = search.trim();
            // Try extracting numeric amount from search: e.g. "51000", "51,000", "₹51000", "₹ 51,000", "50k", "50K"
            try {
                String numericCandidate = raw.replaceAll("[₹$,\\s]", "");
                if (numericCandidate.toLowerCase().endsWith("k")) {
                    String base = numericCandidate.substring(0, numericCandidate.length() - 1);
                    targetAmount = new BigDecimal(base).multiply(new BigDecimal("1000"));
                } else if (numericCandidate.matches("^\\d+(\\.\\d+)?$")) {
                    targetAmount = new BigDecimal(numericCandidate);
                }
            } catch (Exception ignored) {
                targetAmount = null;
            }

            Pattern regex = Pattern.compile(Pattern.quote(raw), Pattern.CASE_INSENSITIVE);
            List<Criteria> searchOptions = new ArrayList<>();
            searchOptions.add(Criteria.where("merchant").regex(regex));
            searchOptions.add(Criteria.where("description").regex(regex));
            searchOptions.add(Criteria.where("referenceNumber").regex(regex));
            searchOptions.add(Criteria.where("bank").regex(regex));
            searchOptions.add(Criteria.where("accountNumber").regex(regex));

            if (targetAmount != null && targetAmount.compareTo(BigDecimal.ZERO) > 0) {
                // Determine a relative search window for amounts
                // +/- 40% relative tolerance or min +/- 2000 tolerance
                BigDecimal delta = targetAmount.multiply(new BigDecimal("0.40"));
                if (delta.compareTo(new BigDecimal("2000")) < 0) {
                    delta = new BigDecimal("2000");
                }
                BigDecimal minAmount = targetAmount.subtract(delta).max(BigDecimal.ZERO);
                BigDecimal maxAmount = targetAmount.add(delta);

                searchOptions.add(Criteria.where("amount").gte(minAmount).lte(maxAmount));
            }

            filters.add(new Criteria().orOperator(searchOptions.toArray(new Criteria[0])));
        }

        if (!filters.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(filters.toArray(new Criteria[0])));
        }

        // Fetch candidate transactions
        query.with(Sort.by(Sort.Direction.DESC, "transactionDate")).limit(100);
        List<Transaction> list = mongoTemplate.find(query, Transaction.class);

        // Sort results: if targetAmount was searched, sort by proximity to target amount!
        if (targetAmount != null) {
            final BigDecimal finalTarget = targetAmount;
            list.sort((t1, t2) -> {
                BigDecimal a1 = t1.getAmount() != null ? t1.getAmount() : BigDecimal.ZERO;
                BigDecimal a2 = t2.getAmount() != null ? t2.getAmount() : BigDecimal.ZERO;
                BigDecimal diff1 = a1.subtract(finalTarget).abs();
                BigDecimal diff2 = a2.subtract(finalTarget).abs();
                int cmp = diff1.compareTo(diff2);
                if (cmp != 0) return cmp; // closest amount first
                // Secondary sort: most recent first
                if (t1.getTransactionDate() != null && t2.getTransactionDate() != null) {
                    return t2.getTransactionDate().compareTo(t1.getTransactionDate());
                }
                return 0;
            });
        }

        if (list.size() > max) {
            return new ArrayList<>(list.subList(0, max));
        }
        return list;
    }
}
