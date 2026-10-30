package com.paytrace.parser;

import com.paytrace.model.enums.PaymentMethod;
import com.paytrace.model.enums.TransactionType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class HdfcEmailParserTest {

    private HdfcEmailParser parser;

    @BeforeEach
    void setUp() {
        CategoryClassifier classifier = new CategoryClassifier();
        parser = new HdfcEmailParser(classifier);
    }

    @Test
    @DisplayName("Should extract real HDFC InstaAlerts UPI Debit with merchant name extraction")
    void shouldExtractRealUpiDebit() {
        String subject = "❗  You have done a UPI txn. Check details!";
        String body = """
            <html><body>
            <td class="td esd-text">Dear Customer,<br>
            Rs.20.00 has been debited from account 1480 to VPA paytm.s1wwzwo@pty LOURDUSAMY M MARIYA JAMES on 04-04-26.<br>
            Your UPI transaction reference number is 646069131340.<br>
            If you did not authorize this transaction, please report it immediately by calling 18002586161 Or SMS BLOCK UPI to 7308080808.<br>
            Warm Regards,<br>
            HDFC Bank
            </td>
            </body></html>
            """;

        Optional<ParsedTransaction> result = parser.parse(subject, body);

        assertThat(result).isPresent();
        ParsedTransaction txn = result.get();
        assertThat(txn.getBank()).isEqualTo("HDFC");
        assertThat(txn.getAccountNumber()).isEqualTo("XX1480");
        assertThat(txn.getAmount()).isEqualByComparingTo(new BigDecimal("20.00"));
        assertThat(txn.getTransactionType()).isEqualTo(TransactionType.EXPENSE);
        assertThat(txn.getPaymentMethod()).isEqualTo(PaymentMethod.UPI);
        assertThat(txn.getMerchant()).isEqualTo("LOURDUSAMY M MARIYA JAMES");
        assertThat(txn.getReferenceNumber()).isEqualTo("646069131340");
    }

    @Test
    @DisplayName("Should extract real HDFC InstaAlerts UPI Credit")
    void shouldExtractRealUpiCredit() {
        String subject = "View: Account update for your HDFC Bank A/c";
        String body = """
            Dear Customer,
            Rs. 40.00 is successfully credited to your account **1480 by VPA geethaswamy1977@okhdfcbank Mr Naveenkumar S on 16-03-26.
            Your UPI transaction reference number is 120127900804.
            Thank you for banking with us.
            Warm Regards,
            HDFC Bank
            """;

        Optional<ParsedTransaction> result = parser.parse(subject, body);

        assertThat(result).isPresent();
        ParsedTransaction txn = result.get();
        assertThat(txn.getBank()).isEqualTo("HDFC");
        assertThat(txn.getAccountNumber()).isEqualTo("XX1480");
        assertThat(txn.getAmount()).isEqualByComparingTo(new BigDecimal("40.00"));
        assertThat(txn.getTransactionType()).isEqualTo(TransactionType.INCOME);
        assertThat(txn.getPaymentMethod()).isEqualTo(PaymentMethod.UPI);
        assertThat(txn.getMerchant()).isEqualTo("Mr Naveenkumar S");
        assertThat(txn.getReferenceNumber()).isEqualTo("120127900804");
    }

    @Test
    @DisplayName("Should extract standard UPI Debit transaction successfully")
    void shouldExtractStandardUpiDebit() {
        String subject = "Alert: Update on your HDFC Bank Account";
        String body = "Dear Customer, Rs.499.00 has been debited from your account **1234 to VPA swiggy@icici on 30-10-26 via UPI txn 430129849201. Avbl bal: Rs 45,210.50.";

        Optional<ParsedTransaction> result = parser.parse(subject, body);

        assertThat(result).isPresent();
        ParsedTransaction txn = result.get();
        assertThat(txn.getBank()).isEqualTo("HDFC");
        assertThat(txn.getAccountNumber()).isEqualTo("XX1234");
        assertThat(txn.getAmount()).isEqualByComparingTo(new BigDecimal("499.00"));
        assertThat(txn.getTransactionType()).isEqualTo(TransactionType.EXPENSE);
        assertThat(txn.getPaymentMethod()).isEqualTo(PaymentMethod.UPI);
        assertThat(txn.getReferenceNumber()).isEqualTo("430129849201");
        assertThat(txn.getCategory()).isEqualTo("Food & Dining");
    }

    @Test
    @DisplayName("Should extract Credit Card spend with category Shopping")
    void shouldExtractCreditCardSpend() {
        String subject = "Alert: Transaction on your HDFC Bank Credit Card";
        String body = "An amount of INR 2,499.00 has been spent on your HDFC Bank Credit Card ending 9876 at AMAZON INDIA on 29-10-26 at 14:32:10. Auth code: 789123.";

        Optional<ParsedTransaction> result = parser.parse(subject, body);

        assertThat(result).isPresent();
        ParsedTransaction txn = result.get();
        assertThat(txn.getBank()).isEqualTo("HDFC");
        assertThat(txn.getAccountNumber()).isEqualTo("XX9876");
        assertThat(txn.getAmount()).isEqualByComparingTo(new BigDecimal("2499.00"));
        assertThat(txn.getTransactionType()).isEqualTo(TransactionType.EXPENSE);
        assertThat(txn.getPaymentMethod()).isEqualTo(PaymentMethod.CREDIT_CARD);
        assertThat(txn.getReferenceNumber()).isEqualTo("789123");
        assertThat(txn.getCategory()).isEqualTo("Shopping");
    }

    @Test
    @DisplayName("Should extract Account Debit towards merchant")
    void shouldExtractAccountDebit() {
        String subject = "Notification from HDFC Bank";
        String body = "Alert: Rs. 3,500.00 debited from HDFC Bank A/c **3456 on 27-10-26 towards RELIANCE RETAIL. Ref no 987654321.";

        Optional<ParsedTransaction> result = parser.parse(subject, body);

        assertThat(result).isPresent();
        ParsedTransaction txn = result.get();
        assertThat(txn.getAccountNumber()).isEqualTo("XX3456");
        assertThat(txn.getAmount()).isEqualByComparingTo(new BigDecimal("3500.00"));
        assertThat(txn.getTransactionType()).isEqualTo(TransactionType.EXPENSE);
        assertThat(txn.getPaymentMethod()).isEqualTo(PaymentMethod.DEBIT_CARD);
        assertThat(txn.getReferenceNumber()).isEqualTo("987654321");
    }

    @Test
    @DisplayName("Should extract Salary / Income Credit")
    void shouldExtractIncomeCredit() {
        String subject = "Salary Credit: HDFC Bank Account Update";
        String body = "Dear Customer, Rs. 85,000.00 has been credited to your account **1234 on 30-10-26 by INFOSYS TECH SALARY. UPI Ref no 430182910291.";

        Optional<ParsedTransaction> result = parser.parse(subject, body);

        assertThat(result).isPresent();
        ParsedTransaction txn = result.get();
        assertThat(txn.getAmount()).isEqualByComparingTo(new BigDecimal("85000.00"));
        assertThat(txn.getTransactionType()).isEqualTo(TransactionType.INCOME);
        assertThat(txn.getCategory()).isEqualTo("Salary & Income");
        assertThat(txn.getReferenceNumber()).isEqualTo("430182910291");
    }

    @Test
    @DisplayName("Should extract Refund transaction")
    void shouldExtractRefund() {
        String subject = "Refund processed on HDFC Bank Account";
        String body = "Dear Customer, Rs. 499.00 has been refunded to your HDFC Bank account **1234 from SWIGGY on 29-10-26. Ref 5544332211.";

        Optional<ParsedTransaction> result = parser.parse(subject, body);

        assertThat(result).isPresent();
        ParsedTransaction txn = result.get();
        assertThat(txn.getAmount()).isEqualByComparingTo(new BigDecimal("499.00"));
        assertThat(txn.getTransactionType()).isEqualTo(TransactionType.REFUND);
        assertThat(txn.getCategory()).isEqualTo("Refund");
        assertThat(txn.getReferenceNumber()).isEqualTo("5544332211");
    }

    @Test
    @DisplayName("Should return empty for promotional/newsletter email")
    void shouldReturnEmptyForUnrecognizedEmail() {
        String subject = "Exciting Loan Offers for You from HDFC Bank";
        String body = "Dear Customer, Apply now for pre-approved personal loans up to 10 Lakhs at special interest rates.";

        Optional<ParsedTransaction> result = parser.parse(subject, body);

        assertThat(result).isEmpty();
    }
}
