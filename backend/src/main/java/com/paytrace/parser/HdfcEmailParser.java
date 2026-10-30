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

    @Value("${paytrace.gmail.sync.hdfc-senders:alerts@hdfcbank.bank.in,instaalerts@hdfcbank.bank.in,alerts@hdfcbank.net,instaalerts@hdfcbank.net,information@hdfcbank.net}")
    private String configuredSenders;

    // Pattern 1A: Modern 2026 HDFC UPI Debit (InstaAlerts with 'towards VPA ...')
    // e.g.: Rs.65.00 is debited from your account ending 1480 towards VPA *************9823@pineaxis (Lg Electronics India Private Limited) on 30-10-26. UPI transaction reference no.: 132071662330.
    // e.g.: Rs.295.00 is debited from your account ending 1480 towards VPA ******1502@ybl (Chai track ssn) on 30-10-26. UPI transaction reference no.: 630327469755.
    private static final Pattern UPI_DEBIT_2026_TOWARDS = Pattern.compile(
        "(?is)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+(?:is|has been)\\s+debited from (?:your\\s+)?account\\s+(?:ending\\s+(?:in\\s+)?|(?:\\*+|xx)?)([0-9]{3,4})\\s+towards\\s+(?:VPA\\s+)?(.+?)\\s+on\\s+([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4})(?:\\.|\\s+).*?(?:UPI transaction reference no\\.?|UPI txn|Ref(?:erence)?\\s*(?:no|number)?)\\s*[:]?\\s*([a-zA-Z0-9]+)"
    );

    // Pattern 1B: Standard / Legacy HDFC UPI Debit ('to VPA ...')
    // e.g.: Rs.130.00 has been debited from account 1480 to VPA 7010818264@slc ARIVUCHEZHIYAN E on 29-03-26. Your UPI transaction reference number is 120772909583.
    // e.g.: Rs.499.00 has been debited from your account **1234 to VPA swiggy@icici on 30-10-26 via UPI txn 430129849201
    private static final Pattern UPI_DEBIT_REAL_PATTERN = Pattern.compile(
        "(?is)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+(?:is|has been)\\s+debited from (?:your\\s+)?account\\s+(?:ending\\s+(?:in\\s+)?|(?:\\*+|xx)?)([0-9]{3,4})\\s+to\\s+(?:VPA\\s+)?(.+?)\\s+on\\s+([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4})(?:\\.|\\s+).*?(?:Your UPI transaction reference number is|UPI transaction reference no\\.?|UPI txn|Ref(?:erence)?\\s*(?:no|number)?)\\s*[:]?\\s*([a-zA-Z0-9]+)"
    );

    // Pattern 2A: Modern 2026 HDFC UPI Credit ('We're writing to inform you that Rs.... has been successfully credited...')
    // e.g.: Rs.40.00 has been successfully credited to your HDFC Bank account ending in 1480. Transaction Details: a. Date: 30-10-26 b. Sender: ASHWATH RAM (VPA: ... ) c. UPI Reference No.: 666998298177
    // e.g.: Rs.645.00 has been successfully credited to your HDFC Bank account ending in 1480. Transaction Details: a. Date: 29-10-26 b. Sender: Ms M Kamalika (VPA: ... ) c. UPI Reference No.: 666859966664
    private static final Pattern UPI_CREDIT_2026_INFORM = Pattern.compile(
        "(?is)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+has been successfully credited to (?:your\\s+)?(?:HDFC Bank\\s+)?account\\s+(?:ending\\s+(?:in\\s+)?|(?:\\*+|xx)?)([0-9]{3,4}).*?Date:\\s*([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4}).*?Sender:\\s*([^\\n\\r(]+?)(?:\\s*\\(VPA:|\\s+c\\.|\\s+on|\\s*$).*?(?:UPI Reference No\\.?|Ref(?:erence)?\\s*(?:no|number)?)\\s*[:]?\\s*([a-zA-Z0-9]+)"
    );

    // Pattern 2B: Standard / Legacy HDFC UPI Credit ('credited by VPA ...')
    // e.g.: Rs. 40.00 is successfully credited to your account **1480 by VPA geethaswamy1977@okhdfcbank Mr Naveenkumar S on 16-03-26. Your UPI transaction reference number is 120127900804.
    private static final Pattern UPI_CREDIT_REAL_PATTERN = Pattern.compile(
        "(?is)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+(?:is successfully|has been)\\s+credited to (?:your\\s+)?(?:HDFC Bank\\s+)?account\\s+(?:ending\\s+(?:in\\s+)?|(?:\\*+|xx)?)([0-9]{3,4})\\s+by\\s+(?:VPA\\s+)?(.+?)\\s+on\\s+([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4})(?:\\.|\\s+).*?(?:Your UPI transaction reference number is|UPI Ref(?:erence)?(?:\\s*no)?|Ref(?:erence)?\\s*(?:no|number)?)\\s*[:]?\\s*([a-zA-Z0-9]+)"
    );

    // Pattern 3: Debit Card Spend
    // e.g.: Rs.100000.00 is debited from your HDFC Bank Debit Card ending 5455 at SSN TRUST FEES COLLECT on 17 Jun, 2026 at 07:11:30.
    // e.g.: Rs.33424.29 is debited from your HDFC Bank Debit Card ending 5455 at WL *VUE*Testing Exam on 28 Jun, 2026 at 12:20:22.
    private static final Pattern DEBIT_CARD_PATTERN = Pattern.compile(
        "(?is)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+(?:is|has been)\\s+debited from (?:your\\s+)?HDFC Bank Debit Card ending\\s+([0-9]{4})\\s+at\\s+([^.\\n\\r]+?)\\s+on\\s+([0-9]{1,2}\\s+[a-zA-Z]{3},?\\s+[0-9]{2,4})"
    );

    // Pattern 4: Direct Account / ATM / Branch Credit
    // e.g.: Your account XX1480 is credited with INR 5,000.00 on 27/10/26 at 20:21:23 at THILLAI NA
    private static final Pattern ACCOUNT_CREDITED_DIRECT = Pattern.compile(
        "(?is)(?:Your\\s+)?account\\s+(?:ending\\s+(?:in\\s+)?|(?:\\*+|xx)?)([0-9]{3,4})\\s+is credited with\\s+(?:INR|Rs\\.?)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+on\\s+([0-9]{1,2}[/-][a-zA-Z0-9]{2,3}[/-][0-9]{2,4}).*?(?:at|towards|by)\\s+([^.\\n\\r]+)"
    );

    // Pattern 5: Credit Card Spend
    // e.g.: INR 2,499.00 has been spent on your HDFC Bank Credit Card ending 9876 at AMAZON INDIA on 29-10-26 ... Auth code: 789123
    private static final Pattern CREDIT_CARD_PATTERN = Pattern.compile(
        "(?is)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+(?:has been\\s+)?spent on (?:your\\s+)?HDFC Bank (?:Credit\\s+)?Card ending\\s+([0-9]{4})\\s+at\\s+([^\\n\\r]+?)\\s+on\\s+([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4}).*?(?:Auth(?:\\s*code)?|Ref(?:\\s*no)?)\\s*[:]?\\s*([a-zA-Z0-9]+)"
    );

    // Pattern 6: Salary / Netbanking Credit
    // e.g.: Rs. 85,000.00 has been credited to your account **1234 on 30-10-26 by INFOSYS TECH SALARY. UPI Ref no 430182910291
    private static final Pattern CREDIT_PATTERN = Pattern.compile(
        "(?is)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+has been credited to your (?:HDFC Bank\\s+)?account\\s+(?:ending\\s+(?:in\\s+)?|(?:\\*+|xx)?)([0-9]{3,4})\\s+on\\s+([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4})\\s+by\\s+([^\\n\\r]+?)(?:\\.\\s*|\\s+)(?:UPI Ref(?:\\s*no)?|Ref(?:\\s*no)?)\\s*[:.]?\\s*([a-zA-Z0-9]+)"
    );

    // Pattern 7: Refund
    // e.g.: Rs. 499.00 has been refunded to your HDFC Bank account **1234 from SWIGGY on 29-10-26. Ref 5544332211
    private static final Pattern REFUND_PATTERN = Pattern.compile(
        "(?is)(?:Rs\\.?|INR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+has been refunded to (?:your\\s+)?HDFC Bank account\\s+(?:ending\\s+(?:in\\s+)?|(?:\\*+|xx)?)([0-9]{3,4})\\s+from\\s+([^\\n\\r.]+?)\\s+on\\s+([0-9]{1,2}-[a-zA-Z0-9]{2,3}-[0-9]{2,4}).*?(?:Ref(?:\\s*no)?)\\s*[:]?\\s*([a-zA-Z0-9]+)"
    );

    /**
     * Strips HTML markup, scripts, styles and decodes basic entities.
     */
    public static String cleanHtml(String html) {
        if (html == null) return "";
        return html.replaceAll("(?is)<style.*?</style>", " ")
                   .replaceAll("(?is)<script.*?</script>", " ")
                   .replaceAll("<[^>]+>", " ")
                   .replaceAll("&nbsp;", " ")
                   .replaceAll("&#39;", "'")
                   .replaceAll("&amp;", "&")
                   .replaceAll("&quot;", "\"")
                   .replaceAll("&lt;", "<")
                   .replaceAll("&gt;", ">")
                   .replaceAll("\\s+", " ")
                   .trim();
    }

    @Override
    public boolean canParse(String sender, String subject, String body) {
        if (sender != null) {
            String cleanSender = sender.toLowerCase(Locale.ROOT);
            if (cleanSender.contains("hdfcbank")) {
                return true;
            }
            List<String> senders = Arrays.asList(configuredSenders.toLowerCase(Locale.ROOT).split(","));
            for (String s : senders) {
                if (cleanSender.contains(s.trim())) {
                    return true;
                }
            }
        }
        String text = (subject + " " + cleanHtml(body)).toLowerCase(Locale.ROOT);
        return text.contains("hdfc") && (text.contains("debited") || text.contains("credited") || text.contains("spent") || text.contains("refunded"));
    }

    @Override
    public Optional<ParsedTransaction> parse(String subject, String body) {
        String cleanSubject = subject != null ? subject.trim() : "";
        String cleanTextBody = cleanHtml(body);
        String fullContent = cleanSubject + " " + cleanTextBody;

        // 1. Try Modern 2026 UPI Debit ('towards VPA ... (Merchant)')
        Matcher matcher = UPI_DEBIT_2026_TOWARDS.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(1), // amount
                matcher.group(2), // account suffix
                matcher.group(3), // beneficiary / merchant raw
                matcher.group(4), // date
                matcher.group(5), // reference number
                TransactionType.EXPENSE,
                PaymentMethod.UPI
            ));
        }

        // 2. Try Standard UPI Debit ('to VPA ...')
        matcher = UPI_DEBIT_REAL_PATTERN.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(1),
                matcher.group(2),
                matcher.group(3),
                matcher.group(4),
                matcher.group(5),
                TransactionType.EXPENSE,
                PaymentMethod.UPI
            ));
        }

        // 3. Try Modern 2026 UPI Credit ('inform you that Rs... has been successfully credited ... Sender: ...')
        matcher = UPI_CREDIT_2026_INFORM.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(1), // amount
                matcher.group(2), // account suffix
                matcher.group(4), // sender / remitter
                matcher.group(3), // date
                matcher.group(5), // reference number
                TransactionType.INCOME,
                PaymentMethod.UPI
            ));
        }

        // 4. Try Standard UPI Credit ('credited by VPA ...')
        matcher = UPI_CREDIT_REAL_PATTERN.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(1),
                matcher.group(2),
                matcher.group(3),
                matcher.group(4),
                matcher.group(5),
                TransactionType.INCOME,
                PaymentMethod.UPI
            ));
        }

        // 5. Try Debit Card Spend
        matcher = DEBIT_CARD_PATTERN.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(1),
                matcher.group(2),
                matcher.group(3),
                matcher.group(4),
                null,
                TransactionType.EXPENSE,
                PaymentMethod.DEBIT_CARD
            ));
        }

        // 6. Try Direct Account Credit (Cash / ATM / Branch deposit)
        matcher = ACCOUNT_CREDITED_DIRECT.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(2), // amount
                matcher.group(1), // account suffix
                matcher.group(4), // merchant / branch
                matcher.group(3), // date
                null,
                TransactionType.INCOME,
                PaymentMethod.NET_BANKING
            ));
        }

        // 7. Try Credit Card Spend
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

        // 8. Try Refund
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

        // 9. Try Salary / Income Credit
        matcher = CREDIT_PATTERN.matcher(fullContent);
        if (matcher.find()) {
            return Optional.of(buildTransaction(
                matcher.group(1),
                matcher.group(2),
                matcher.group(4),
                matcher.group(3),
                matcher.group(5),
                TransactionType.INCOME,
                PaymentMethod.NET_BANKING
            ));
        }

        log.debug("No HDFC transaction pattern matched for email. Marking for review.");
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

    /**
     * Extracts a clean, human-readable merchant or beneficiary name from raw VPA / text strings.
     * e.g. "towards VPA *************9823@pineaxis (Lg Electronics India Private Limited)" -> "Lg Electronics India Private Limited"
     * e.g. "towards VPA ******1502@ybl (Chai track ssn)" -> "Chai track ssn"
     * e.g. "paytmqr1om8q1ut4e@paytm RISHABH FOOD COURT" -> "RISHABH FOOD COURT"
     * e.g. "ASHWATH RAM (VPA: *******hram@okicici)" -> "ASHWATH RAM"
     */
    public String cleanMerchant(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return "HDFC Merchant";
        }
        String trimmed = raw.trim();

        // Check if name is inside brackets like "... (Merchant Name)"
        Matcher bracketMatcher = Pattern.compile("\\(([^)]+)\\)").matcher(trimmed);
        if (bracketMatcher.find()) {
            String candidate = bracketMatcher.group(1).trim();
            if (!candidate.toLowerCase(Locale.ROOT).startsWith("vpa")) {
                return candidate.replaceAll("[^a-zA-Z0-9 ._-]", " ").replaceAll("\\s+", " ").trim();
            }
        }

        // Check if formatted as "vpa@handle Human/Merchant Name"
        if (trimmed.contains("@")) {
            int atIdx = trimmed.indexOf('@');
            int spaceAfterAt = trimmed.indexOf(' ', atIdx);
            if (spaceAfterAt != -1 && spaceAfterAt + 1 < trimmed.length()) {
                String nameAfterVpa = trimmed.substring(spaceAfterAt + 1).trim();
                nameAfterVpa = nameAfterVpa.replaceAll("(?i)\\b(on\\s+\\d{1,2}-[a-zA-Z0-9]{2,3}-\\d{2,4}|via|ref|upi|txn).*$", "").trim();
                if (nameAfterVpa.length() >= 2) {
                    return nameAfterVpa.replaceAll("[^a-zA-Z0-9 ._-]", " ").replaceAll("\\s+", " ").trim();
                }
            }
        }

        String clean = trimmed.replaceAll("(?i)\\b(via|on|ref|upi|txn|towards)\\b.*", "").trim();
        clean = clean.replaceAll("[^a-zA-Z0-9 @._-]", " ").replaceAll("\\s+", " ").trim();
        return clean.isEmpty() ? "HDFC Merchant" : clean;
    }

    private Instant parseDate(String dateStr) {
        if (dateStr == null) return Instant.now();
        List<DateTimeFormatter> formatters = List.of(
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MM-yy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MM-yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd/MM/yy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd/MM/yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MMM-yy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MMM-yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d MMM, yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd MMM, yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d MMM yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd MMM yyyy").toFormatter(Locale.ENGLISH)
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
