package com.paytrace.parser;

import com.paytrace.model.enums.PaymentMethod;
import com.paytrace.model.enums.TransactionType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class HdfcEmailParser implements EmailParser {

    private final CategoryClassifier categoryClassifier;

    @Value("${paytrace.gmail.sync.hdfc-senders:alerts@hdfcbank.net,instaalerts@hdfcbank.net}")
    private String configuredSenders;

    // Pattern 1: UPI Debit
    // e.g.: Rs.499.00 has been debited from your account **1234 to VPA swiggy@icici on 30-10-26 via UPI txn 430129849201
    // e.g.: You have done a UPI txn of Rs. 250.00 to Zomato on 28-OCT-26. Reference number 429182749102
    private static final Pattern UPI_DEBIT_PATTERN_1 = Pattern.compile(
        "(?i)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+has been debited from your account\\s+(?:\\*+|xx)?([0-9]{3,4})\\s+to\\s+(?:VPA\\s+)?([^\\n\\r]+?)\\s+on\\s+([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4}).*?(?:UPI txn|Ref(?:erence)?\\s*(?:no|number)?)\\s*([a-zA-Z0-9]+)"
    );

    private static final Pattern UPI_DEBIT_PATTERN_2 = Pattern.compile(
        "(?i)done a UPI txn of\\s+(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+to\\s+([^\\n\\r]+?)\\s+on\\s+([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4}).*?(?:Ref(?:erence)?\\s*(?:no|number)?)\\s*([a-zA-Z0-9]+)"
    );

    // Pattern 2: Credit Card Spend
    // e.g.: INR 2,499.00 has been spent on your HDFC Bank Credit Card ending 9876 at AMAZON INDIA on 29-10-26 ... Auth code: 789123
    private static final Pattern CREDIT_CARD_PATTERN = Pattern.compile(
        "(?i)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+(?:has been\\s+)?spent on (?:your\\s+)?HDFC Bank (?:Credit\\s+)?Card ending\\s+([0-9]{4})\\s+at\\s+([^\\n\\r]+?)\\s+on\\s+([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4}).*?(?:Auth(?:\\s*code)?|Ref(?:\\s*no)?)\\s*[:]?\\s*([a-zA-Z0-9]+)"
    );

    // Pattern 3: Debit Card / Account Debit
    // e.g.: Rs. 3,500.00 debited from HDFC Bank A/c **3456 on 27-10-26 towards RELIANCE RETAIL. Ref no 987654321
    private static final Pattern ACCOUNT_DEBIT_PATTERN = Pattern.compile(
        "(?i)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+debited from HDFC Bank A/c\\s+(?:\\*+|xx)?([0-9]{3,4})\\s+on\\s+([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4})\\s+towards\\s+([^\\n\\r.]+?)(?:\\.|\\s).*?(?:Ref(?:\\s*no)?)\\s*[:]?\\s*([a-zA-Z0-9]+)"
    );

    // Pattern 4: Account / UPI Credit (Income / Salary / Transfer)
    // e.g.: Rs. 85,000.00 has been credited to your account **1234 on 30-10-26 by INFOSYS TECH SALARY. UPI Ref no 430182910291
    private static final Pattern CREDIT_PATTERN = Pattern.compile(
        "(?i)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+has been credited to your (?:HDFC Bank\\s+)?account\\s+(?:\\*+|xx)?([0-9]{3,4})\\s+on\\s+([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4})\\s+by\\s+([^\\n\\r]+?)(?:\\.\\s*|\\s+)(?:UPI Ref(?:\\s*no)?|Ref(?:\\s*no)?)\\s*[:.]?\\s*([a-zA-Z0-9]+)"
    );

    // Pattern 5: Refund
    // e.g.: Rs. 499.00 has been refunded to your HDFC Bank account **1234 from SWIGGY on 29-10-26. Ref 5544332211
    private static final Pattern REFUND_PATTERN = Pattern.compile(
        "(?i)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+has been refunded to (?:your\\s+)?HDFC Bank account\\s+(?:\\*+|xx)?([0-9]{3,4})\\s+from\\s+([^\\n\\r.]+?)\\s+on\\s+([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4}).*?(?:Ref(?:\\s*no)?)\\s*[:]?\\s*([a-zA-Z0-9]+)"
    );

    @Override
    public boolean canParse(String sender, String subject, String body) {
        if (sender != null) {
            List<String> senders = Arrays.asList(configuredSenders.toLowerCase(Locale.ROOT).split(","));
            String cleanSender = sender.toLowerCase(Locale.ROOT);
            for (String s : senders) {
                if (cleanSender.contains(s.trim())) {
                    return true;
                }
            }
        }
        String text = (subject + " " + body).toLowerCase(Locale.ROOT);
        return text.contains("hdfc") && (text.contains("debited") || text.contains("credited") || text.contains("spent") || text.contains("refunded"));
    }

    @Override
    public Optional<ParsedTransaction> parse(String subject, String body) {
        String fullContent = subject + " " + body;

        // Try UPI Debit 1
        Matcher matcher = UPI_DEBIT_PATTERN_1.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(1), // amount
                matcher.group(2), // account
                matcher.group(3), // merchant
                matcher.group(4), // date
                matcher.group(5), // ref
                TransactionType.EXPENSE,
                PaymentMethod.UPI
            ));
        }

        // Try UPI Debit 2
        matcher = UPI_DEBIT_PATTERN_2.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(1),
                "PRIMARY",
                matcher.group(2),
                matcher.group(3),
                matcher.group(4),
                TransactionType.EXPENSE,
                PaymentMethod.UPI
            ));
        }

        // Try Credit Card Spend
        matcher = CREDIT_CARD_PATTERN.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(1),
                matcher.group(2),
                matcher.group(3),
                matcher.group(4),
                matcher.group(5),
                TransactionType.EXPENSE,
                PaymentMethod.CREDIT_CARD
            ));
        }

        // Try Account / Debit Card Spend
        matcher = ACCOUNT_DEBIT_PATTERN.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(1),
                matcher.group(2),
                matcher.group(3),
                matcher.group(4),
                matcher.group(5),
                TransactionType.EXPENSE,
                PaymentMethod.DEBIT_CARD
            ));
        }

        // Try Refund
        matcher = REFUND_PATTERN.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(1),
                matcher.group(2),
                matcher.group(3),
                matcher.group(4),
                matcher.group(5),
                TransactionType.REFUND,
                PaymentMethod.NET_BANKING
            ));
        }

        // Try Income / Credit
        matcher = CREDIT_PATTERN.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(1), // amount
                matcher.group(2), // account
                matcher.group(4), // merchant
                matcher.group(3), // date
                matcher.group(5), // ref
                TransactionType.INCOME,
                PaymentMethod.NET_BANKING
            ));
        }

        log.info("No HDFC transaction pattern matched for email. Marking for review.");
        return Optional.empty();
    }

    private ParsedTransaction buildTransaction(
        String amountStr,
        String accountSuffix,
        String merchantRaw,
        String dateStr,
        String refNumber,
        TransactionType type,
        PaymentMethod method
    ) {
        BigDecimal amount = parseAmount(amountStr);
        String cleanMerchant = cleanMerchant(merchantRaw);
        String maskedAccount = "XX" + (accountSuffix != null ? accountSuffix.replaceAll("[^0-9]", "") : "0000");
        Instant txnDate = parseDate(dateStr);
        String cleanRef = refNumber != null ? refNumber.trim() : null;
        String description = type + " via " + method + " to " + cleanMerchant;
        String category = categoryClassifier.classify(cleanMerchant, description, type);

        return ParsedTransaction.builder()
            .bank("HDFC")
            .accountNumber(maskedAccount)
            .amount(amount)
            .transactionType(type)
            .merchant(cleanMerchant)
            .description(description)
            .transactionDate(txnDate)
            .referenceNumber(cleanRef)
            .category(category)
            .paymentMethod(method)
            .build();
    }

    private BigDecimal parseAmount(String raw) {
        String clean = raw.replaceAll("[^0-9.]", "");
        return new BigDecimal(clean);
    }

    private String cleanMerchant(String raw) {
        if (raw == null) return "Unknown Merchant";
        String clean = raw.replaceAll("(?i)\\b(via|on|ref|upi|txn|towards)\\b.*", "").trim();
        clean = clean.replaceAll("[^a-zA-Z0-9 @._-]", " ").replaceAll("\\s+", " ").trim();
        return clean.isEmpty() ? "HDFC Merchant" : clean;
    }

    private Instant parseDate(String dateStr) {
        if (dateStr == null) return Instant.now();
        List<DateTimeFormatter> formatters = List.of(
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MM-yy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MM-yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MMM-yy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MMM-yyyy").toFormatter(Locale.ENGLISH)
        );

        String trimmed = dateStr.trim();
        for (DateTimeFormatter fmt : formatters) {
            try {
                LocalDate localDate = LocalDate.parse(trimmed, fmt);
                return localDate.atStartOfDay(ZoneId.of("Asia/Kolkata")).toInstant();
            } catch (Exception ignored) {
            }
        }
        return Instant.now();
    }
}
