package com.paytrace.service;

import com.paytrace.dto.response.CsvTransactionDto;
import com.paytrace.dto.response.CsvVerificationResponseDto;
import com.paytrace.model.Transaction;
import com.paytrace.model.enums.PaymentMethod;
import com.paytrace.model.enums.TransactionSource;
import com.paytrace.model.enums.TransactionType;
import com.paytrace.parser.CategoryClassifier;
import com.paytrace.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class CsvImportService {

    private final TransactionRepository transactionRepository;
    private final MongoTemplate mongoTemplate;
    private final CategoryClassifier categoryClassifier;
    private final MerchantRuleService merchantRuleService;

    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
        DateTimeFormatter.ofPattern("yyyy-MM-dd"),
        DateTimeFormatter.ofPattern("dd/MM/yyyy"),
        DateTimeFormatter.ofPattern("dd-MM-yyyy"),
        DateTimeFormatter.ofPattern("dd/MM/yy"),
        DateTimeFormatter.ofPattern("dd-MM-yy"),
        DateTimeFormatter.ofPattern("dd-MMM-yyyy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("dd-MMM-yy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("MM/dd/yyyy"),
        DateTimeFormatter.ofPattern("yyyy/MM/dd")
    );

    /**
     * Verifies transactions from an uploaded CSV against existing records in the database.
     * Categorizes into new unlisted transactions and already existing transactions.
     */
    public CsvVerificationResponseDto verifyCsv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return CsvVerificationResponseDto.builder()
                .totalRows(0)
                .existingCount(0)
                .newCount(0)
                .newTransactions(Collections.emptyList())
                .existingTransactions(Collections.emptyList())
                .message("The uploaded CSV file is empty.")
                .allPresent(false)
                .build();
        }

        List<List<String>> rows = parseCsvLines(file);
        if (rows.isEmpty()) {
            return CsvVerificationResponseDto.builder()
                .totalRows(0)
                .existingCount(0)
                .newCount(0)
                .newTransactions(Collections.emptyList())
                .existingTransactions(Collections.emptyList())
                .message("No readable lines found in CSV.")
                .allPresent(false)
                .build();
        }

        // Find header row index and map column indices
        int headerIndex = findHeaderRowIndex(rows);
        if (headerIndex == -1) {
            return CsvVerificationResponseDto.builder()
                .totalRows(0)
                .existingCount(0)
                .newCount(0)
                .newTransactions(Collections.emptyList())
                .existingTransactions(Collections.emptyList())
                .message("Could not recognize CSV format. Please ensure headers like Date, Narration/Description, and Amount/Withdrawal are present.")
                .allPresent(false)
                .build();
        }

        List<String> headers = rows.get(headerIndex);
        Map<String, Integer> colMap = buildColumnMapping(headers);

        List<CsvTransactionDto> parsedTransactions = new ArrayList<>();
        Set<String> batchRefSeen = new HashSet<>();
        Set<String> batchCompositeSeen = new HashSet<>();

        for (int i = headerIndex + 1; i < rows.size(); i++) {
            List<String> row = rows.get(i);
            if (row == null || row.isEmpty() || isRowEmpty(row)) {
                continue;
            }

            try {
                CsvTransactionDto dto = parseRow(row, colMap);
                if (dto != null && dto.getAmount() != null && dto.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                    // Prevent duplicate rows inside the CSV file itself
                    String refKey = dto.getReferenceNumber() != null ? dto.getReferenceNumber().trim() : "";
                    String compKey = dto.getFormattedDate() + "_" + dto.getAmount() + "_" + dto.getTransactionType() + "_" + dto.getMerchant();

                    if (!refKey.isEmpty() && batchRefSeen.contains(refKey)) {
                        continue;
                    }
                    if (batchCompositeSeen.contains(compKey)) {
                        continue;
                    }

                    if (!refKey.isEmpty()) batchRefSeen.add(refKey);
                    batchCompositeSeen.add(compKey);

                    parsedTransactions.add(dto);
                }
            } catch (Exception ex) {
                log.debug("Skipping row {}: {}", i, ex.getMessage());
            }
        }

        if (parsedTransactions.isEmpty()) {
            return CsvVerificationResponseDto.builder()
                .totalRows(0)
                .existingCount(0)
                .newCount(0)
                .newTransactions(Collections.emptyList())
                .existingTransactions(Collections.emptyList())
                .message("No valid transaction rows found in CSV. Please verify column contents.")
                .allPresent(false)
                .build();
        }

        List<CsvTransactionDto> newTxns = new ArrayList<>();
        List<CsvTransactionDto> existingTxns = new ArrayList<>();

        for (CsvTransactionDto candidate : parsedTransactions) {
            boolean exists = checkIfExists(candidate);
            if (exists) {
                existingTxns.add(candidate);
            } else {
                newTxns.add(candidate);
            }
        }

        boolean allPresent = !parsedTransactions.isEmpty() && newTxns.isEmpty();
        String message;
        if (allPresent) {
            message = String.format("All %d transactions in this CSV already exist in your records. No new transactions to import.", existingTxns.size());
        } else if (existingTxns.isEmpty()) {
            message = String.format("Found %d new transactions ready to import. None currently exist in your database.", newTxns.size());
        } else {
            message = String.format("Found %d new unlisted transactions. %d duplicate transactions already exist in your records and will be skipped.", newTxns.size(), existingTxns.size());
        }

        return CsvVerificationResponseDto.builder()
            .totalRows(parsedTransactions.size())
            .existingCount(existingTxns.size())
            .newCount(newTxns.size())
            .newTransactions(newTxns)
            .existingTransactions(existingTxns)
            .message(message)
            .allPresent(allPresent)
            .build();
    }

    /**
     * Checks if a candidate transaction already exists in the database.
     */
    private boolean checkIfExists(CsvTransactionDto candidate) {
        // Check 1: Reference number (UTR / Ref no)
        if (candidate.getReferenceNumber() != null && !candidate.getReferenceNumber().trim().isEmpty()) {
            String ref = candidate.getReferenceNumber().trim();
            if (transactionRepository.findByReferenceNumber(ref).isPresent()) {
                return true;
            }
        }

        // Check 2: Amount + Date (+/- 24 hours) + Merchant/Description
        if (candidate.getTransactionDate() != null && candidate.getAmount() != null) {
            Instant start = candidate.getTransactionDate().minus(Duration.ofHours(24));
            Instant end = candidate.getTransactionDate().plus(Duration.ofHours(24));

            List<Transaction> candidates = transactionRepository
                .findByTransactionDateBetweenOrderByTransactionDateDesc(start, end);

            for (Transaction existing : candidates) {
                if (existing.getAmount() != null && existing.getAmount().compareTo(candidate.getAmount()) == 0
                    && existing.getTransactionType() == candidate.getTransactionType()) {

                    // Check merchant or description match
                    String candMerch = (candidate.getMerchant() != null ? candidate.getMerchant() : "").toLowerCase(Locale.ROOT).trim();
                    String existMerch = (existing.getMerchant() != null ? existing.getMerchant() : "").toLowerCase(Locale.ROOT).trim();

                    if (!candMerch.isEmpty() && !existMerch.isEmpty()) {
                        if (candMerch.equals(existMerch) || candMerch.contains(existMerch) || existMerch.contains(candMerch)) {
                            return true;
                        }
                    }

                    String candDesc = (candidate.getDescription() != null ? candidate.getDescription() : "").toLowerCase(Locale.ROOT).trim();
                    String existDesc = (existing.getDescription() != null ? existing.getDescription() : "").toLowerCase(Locale.ROOT).trim();

                    if (!candDesc.isEmpty() && !existDesc.isEmpty()) {
                        if (candDesc.equals(existDesc) || candDesc.contains(existDesc) || existDesc.contains(candDesc)) {
                            return true;
                        }
                    }

                    // If exact same amount and same date, treat as duplicate to be safe
                    if (candidate.getTransactionDate().equals(existing.getTransactionDate())) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Saves confirmed transactions to MongoDB with source CSV_IMPORT.
     */
    @Transactional
    public int confirmImport(List<CsvTransactionDto> transactions) {
        if (transactions == null || transactions.isEmpty()) {
            return 0;
        }

        int savedCount = 0;
        for (CsvTransactionDto dto : transactions) {
            // Final safety duplicate check before persisting
            if (checkIfExists(dto)) {
                log.info("Skipping duplicate on confirmation: ref={}, amount={}", dto.getReferenceNumber(), dto.getAmount());
                continue;
            }

            Transaction txn = Transaction.builder()
                .bank(dto.getBank() != null && !dto.getBank().isEmpty() ? dto.getBank() : "HDFC")
                .accountNumber(dto.getAccountNumber() != null && !dto.getAccountNumber().isEmpty() ? dto.getAccountNumber() : "XX1480")
                .amount(dto.getAmount())
                .transactionType(dto.getTransactionType() != null ? dto.getTransactionType() : TransactionType.EXPENSE)
                .merchant(dto.getMerchant() != null && !dto.getMerchant().isEmpty() ? dto.getMerchant() : "Unknown Merchant")
                .description(dto.getDescription())
                .transactionDate(dto.getTransactionDate() != null ? dto.getTransactionDate() : Instant.now())
                .referenceNumber(dto.getReferenceNumber())
                .category(dto.getCategory() != null && !dto.getCategory().isEmpty() ? dto.getCategory() : "Other")
                .paymentMethod(dto.getPaymentMethod() != null ? dto.getPaymentMethod() : PaymentMethod.UPI)
                .source(TransactionSource.CSV_IMPORT)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

            transactionRepository.save(txn);
            savedCount++;
        }

        log.info("Successfully imported {} transactions from CSV", savedCount);
        return savedCount;
    }

    /**
     * Generates a sample CSV template for users to download.
     */
    public String getSampleCsvTemplate() {
        return "Date,Merchant,Description,Amount,Type,Category,Reference Number,Payment Method\n" +
            "2026-10-25,Swiggy,Dinner delivery order,450.00,EXPENSE,Food & Dining,663989043347,UPI\n" +
            "2026-10-26,Amazon India,Electronics and books,1299.00,EXPENSE,Shopping,663869920515,DEBIT_CARD\n" +
            "2026-10-27,Indian Oil,Fuel fill at station,1500.00,EXPENSE,Travel & Fuel,663869968987,UPI\n" +
            "2026-10-28,Tech Corp,Monthly Salary,85000.00,INCOME,Salary & Income,SAL2026102801,NET_BANKING\n" +
            "2026-10-29,Starbucks,Coffee & snacks,340.00,EXPENSE,Food & Dining,663756140436,UPI\n";
    }

    // ==========================================
    // CSV Parsing Helpers
    // ==========================================

    private List<List<String>> parseCsvLines(MultipartFile file) {
        List<List<String>> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean firstLine = true;
            while ((line = reader.readLine()) != null) {
                if (firstLine) {
                    // Strip BOM if present
                    if (line.startsWith("\uFEFF")) {
                        line = line.substring(1);
                    }
                    firstLine = false;
                }
                if (line.trim().isEmpty()) {
                    continue;
                }
                List<String> tokens = parseCsvLine(line);
                rows.add(tokens);
            }
        } catch (Exception e) {
            log.error("Failed to read CSV file", e);
        }
        return rows;
    }

    private List<String> parseCsvLine(String line) {
        List<String> tokens = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '\"') {
                inQuotes = !inQuotes;
            } else if ((c == ',' || c == ';') && !inQuotes) {
                tokens.add(sb.toString().trim());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        tokens.add(sb.toString().trim());
        return tokens;
    }

    private int findHeaderRowIndex(List<List<String>> rows) {
        for (int i = 0; i < Math.min(rows.size(), 20); i++) {
            List<String> row = rows.get(i);
            String rowStr = String.join(" ", row).toLowerCase(Locale.ROOT);
            if (rowStr.contains("date") &&
                (rowStr.contains("amount") || rowStr.contains("narration") || rowStr.contains("description")
                    || rowStr.contains("withdrawal") || rowStr.contains("debit") || rowStr.contains("particulars")
                    || rowStr.contains("merchant"))) {
                return i;
            }
        }
        return -1;
    }

    private Map<String, Integer> buildColumnMapping(List<String> headers) {
        Map<String, Integer> map = new HashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            String h = headers.get(i).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");

            if (h.contains("date") || h.contains("txndate") || h.contains("valuedt")) {
                map.putIfAbsent("date", i);
            } else if (h.contains("merchant")) {
                map.putIfAbsent("merchant", i);
            } else if (h.contains("narration") || h.contains("description") || h.contains("particulars") || h.contains("remarks")) {
                map.putIfAbsent("narration", i);
            } else if (h.contains("withdrawal") || h.contains("debit") || h.equals("dr") || h.contains("dramt")) {
                map.putIfAbsent("withdrawal", i);
            } else if (h.contains("deposit") || h.contains("credit") || h.equals("cr") || h.contains("cramt")) {
                map.putIfAbsent("deposit", i);
            } else if (h.contains("amount") || h.contains("txnamt")) {
                map.putIfAbsent("amount", i);
            } else if (h.contains("type") || h.contains("drcr") || h.contains("crdr")) {
                map.putIfAbsent("type", i);
            } else if (h.contains("ref") || h.contains("chq") || h.contains("utr") || h.contains("txnid")) {
                map.putIfAbsent("ref", i);
            } else if (h.contains("category")) {
                map.putIfAbsent("category", i);
            } else if (h.contains("method") || h.contains("mode") || h.contains("channel")) {
                map.putIfAbsent("method", i);
            }
        }
        return map;
    }

    private CsvTransactionDto parseRow(List<String> row, Map<String, Integer> colMap) {
        // Date
        String dateStr = getColValue(row, colMap.get("date"));
        if (dateStr == null || dateStr.isEmpty()) {
            return null;
        }

        Instant txnDate = parseDate(dateStr);
        if (txnDate == null) {
            return null;
        }

        // Amount & Type
        BigDecimal amount = BigDecimal.ZERO;
        TransactionType type = TransactionType.EXPENSE;

        if (colMap.containsKey("withdrawal") || colMap.containsKey("deposit")) {
            BigDecimal withdrawal = parseAmount(getColValue(row, colMap.get("withdrawal")));
            BigDecimal deposit = parseAmount(getColValue(row, colMap.get("deposit")));

            if (withdrawal != null && withdrawal.compareTo(BigDecimal.ZERO) > 0) {
                amount = withdrawal;
                type = TransactionType.EXPENSE;
            } else if (deposit != null && deposit.compareTo(BigDecimal.ZERO) > 0) {
                amount = deposit;
                type = TransactionType.INCOME;
            } else {
                return null;
            }
        } else if (colMap.containsKey("amount")) {
            String rawAmt = getColValue(row, colMap.get("amount"));
            amount = parseAmount(rawAmt);
            if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
                return null;
            }

            if (rawAmt != null && (rawAmt.startsWith("-") || rawAmt.toUpperCase().contains("DR"))) {
                type = TransactionType.EXPENSE;
            } else if (rawAmt != null && (rawAmt.toUpperCase().contains("CR") || rawAmt.startsWith("+"))) {
                type = TransactionType.INCOME;
            } else if (colMap.containsKey("type")) {
                String typeStr = getColValue(row, colMap.get("type"));
                if (typeStr != null) {
                    typeStr = typeStr.toUpperCase(Locale.ROOT);
                    if (typeStr.contains("CR") || typeStr.contains("INCOME") || typeStr.contains("DEP")) {
                        type = TransactionType.INCOME;
                    } else if (typeStr.contains("REFUND")) {
                        type = TransactionType.REFUND;
                    } else {
                        type = TransactionType.EXPENSE;
                    }
                }
            }
        } else {
            return null;
        }

        // Description & Narration
        String narration = getColValue(row, colMap.get("narration"));
        String merchant = getColValue(row, colMap.get("merchant"));

        if (merchant == null || merchant.isEmpty()) {
            merchant = extractMerchantFromNarration(narration);
        }
        if (merchant == null || merchant.isEmpty()) {
            merchant = narration != null && !narration.isEmpty() ? narration : "Expense Record";
        }

        String description = narration != null && !narration.isEmpty() ? narration : merchant;

        // Reference number
        String ref = getColValue(row, colMap.get("ref"));
        if (ref == null || ref.isEmpty()) {
            ref = extractRefFromNarration(narration);
        }

        // Category & Custom Merchant Rules
        String category = getColValue(row, colMap.get("category"));
        if (merchantRuleService != null) {
            MerchantRuleService.MerchantResolution res = merchantRuleService.resolve(merchant);
            if (res.isMatched()) {
                if (res.getMerchant() != null && !res.getMerchant().isEmpty()) {
                    merchant = res.getMerchant();
                }
                if (category == null || category.isEmpty()) {
                    category = res.getCategory();
                }
            }
        }
        if (category == null || category.isEmpty()) {
            category = categoryClassifier.classify(merchant, description, type);
        }

        // Payment Method
        PaymentMethod method = PaymentMethod.UPI;
        String methodStr = getColValue(row, colMap.get("method"));
        if (methodStr != null && !methodStr.isEmpty()) {
            method = parsePaymentMethod(methodStr);
        } else {
            method = detectPaymentMethod(description);
        }

        DateTimeFormatter displayFmt = DateTimeFormatter.ofPattern("dd MMM yyyy").withZone(ZONE);

        return CsvTransactionDto.builder()
            .id(UUID.randomUUID().toString())
            .bank("HDFC")
            .accountNumber("XX1480")
            .amount(amount.abs())
            .transactionType(type)
            .merchant(merchant)
            .description(description)
            .transactionDate(txnDate)
            .formattedDate(displayFmt.format(txnDate))
            .referenceNumber(ref)
            .category(category)
            .paymentMethod(method)
            .build();
    }

    private String getColValue(List<String> row, Integer colIndex) {
        if (colIndex == null || colIndex < 0 || colIndex >= row.size()) {
            return null;
        }
        String val = row.get(colIndex);
        if (val == null) return null;
        val = val.trim();
        if (val.startsWith("\"") && val.endsWith("\"") && val.length() >= 2) {
            val = val.substring(1, val.length() - 1).trim();
        }
        return val.isEmpty() ? null : val;
    }

    private boolean isRowEmpty(List<String> row) {
        for (String s : row) {
            if (s != null && !s.trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private BigDecimal parseAmount(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        try {
            String clean = raw.replaceAll("[₹$,\\s]", "");
            clean = clean.replaceAll("(?i)(cr|dr)", "");
            if (clean.isEmpty() || clean.equals("-")) {
                return null;
            }
            return new BigDecimal(clean).abs();
        } catch (Exception e) {
            return null;
        }
    }

    private Instant parseDate(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String clean = raw.trim().split("\\s+")[0]; // Take date part if datetime provided
        for (DateTimeFormatter fmt : DATE_FORMATTERS) {
            try {
                LocalDate ld = LocalDate.parse(clean, fmt);
                return ld.atStartOfDay(ZONE).toInstant();
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private String extractMerchantFromNarration(String narration) {
        if (narration == null || narration.isEmpty()) {
            return null;
        }
        // UPI pattern: UPI-MERCHANT-UTR-BANK or UPI/MERCHANT/UTR
        Pattern upiPattern = Pattern.compile("(?i)UPI[/-]([A-Za-z0-9\\s.]+?)[/-]");
        Matcher m = upiPattern.matcher(narration);
        if (m.find()) {
            return m.group(1).trim();
        }

        // POS pattern: POS 416024XXXXXX1480 MERCHANT
        Pattern posPattern = Pattern.compile("(?i)POS\\s+[0-9X]+\\s+([A-Za-z0-9\\s.]+?)(?:\\s+[A-Z]{2,})?$");
        Matcher mPos = posPattern.matcher(narration);
        if (mPos.find()) {
            return mPos.group(1).trim();
        }

        return narration.length() > 40 ? narration.substring(0, 40) : narration;
    }

    private String extractRefFromNarration(String narration) {
        if (narration == null || narration.isEmpty()) {
            return null;
        }
        // 12-digit UTR or 6-12 digit ref
        Pattern refPattern = Pattern.compile("\\b(\\d{10,12})\\b");
        Matcher m = refPattern.matcher(narration);
        if (m.find()) {
            return m.group(1);
        }
        return null;
    }

    private PaymentMethod detectPaymentMethod(String text) {
        if (text == null) return PaymentMethod.UPI;
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.contains("upi")) return PaymentMethod.UPI;
        if (lower.contains("pos") || lower.contains("debit")) return PaymentMethod.DEBIT_CARD;
        if (lower.contains("credit card")) return PaymentMethod.CREDIT_CARD;
        if (lower.contains("neft") || lower.contains("rtgs") || lower.contains("imps") || lower.contains("netbanking")) return PaymentMethod.NET_BANKING;
        return PaymentMethod.UPI;
    }

    private PaymentMethod parsePaymentMethod(String method) {
        try {
            return PaymentMethod.valueOf(method.toUpperCase(Locale.ROOT).replace(" ", "_"));
        } catch (Exception e) {
            return PaymentMethod.UPI;
        }
    }
}
