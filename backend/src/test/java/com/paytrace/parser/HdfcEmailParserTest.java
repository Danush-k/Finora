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
    @DisplayName("Should extract modern 2026 HDFC UPI Debit towards merchant with bracketed name")
    void shouldExtractModern2026UpiDebit() {
        String subject = "❗  You have done a UPI txn. Check details!";
        String body = """
            HDFC BANK --> Dear Customer, Greetings from HDFC Bank!
            Rs.65.00 is debited from your account ending 1480 towards VPA *************9823@pineaxis (Lg Electronics India Private Limited) on 30-10-26.
            UPI transaction reference no.: 132071662330.
            """;

        Optional<ParsedTransaction> result = parser.parse(subject, body);

        assertThat(result).isPresent();
        ParsedTransaction txn = result.get();
        assertThat(txn.getBank()).isEqualTo("HDFC");
        assertThat(txn.getAccountNumber()).isEqualTo("XX1480");
        assertThat(txn.getAmount()).isEqualByComparingTo(new BigDecimal("65.00"));
        assertThat(txn.getTransactionType()).isEqualTo(TransactionType.EXPENSE);
        assertThat(txn.getPaymentMethod()).isEqualTo(PaymentMethod.UPI);
        assertThat(txn.getMerchant()).isEqualTo("Lg Electronics India Private Limited");
        assertThat(txn.getReferenceNumber()).isEqualTo("132071662330");
    }

    @Test
    @DisplayName("Should extract modern 2026 HDFC UPI Credit with Transaction Details format")
    void shouldExtractModern2026UpiCredit() {
        String subject = "View: Account update for your HDFC Bank A/c";
        String body = """
            HDFC BANK --> Dear Customer, Greetings from HDFC Bank!
            We're writing to inform you that Rs.40.00 has been successfully credited to your HDFC Bank account ending in 1480.
            Transaction Details:
            a. Date: 30-10-26
            b. Sender: ASHWATH RAM (VPA: *******hram@okicici)
            c. UPI Reference No.: 666998298177
            """;

        Optional<ParsedTransaction> result = parser.parse(subject, body);

        assertThat(result).isPresent();
        ParsedTransaction txn = result.get();
        assertThat(txn.getBank()).isEqualTo("HDFC");
        assertThat(txn.getAccountNumber()).isEqualTo("XX1480");
        assertThat(txn.getAmount()).isEqualByComparingTo(new BigDecimal("40.00"));
        assertThat(txn.getTransactionType()).isEqualTo(TransactionType.INCOME);
        assertThat(txn.getPaymentMethod()).isEqualTo(PaymentMethod.UPI);
        assertThat(txn.getMerchant()).isEqualTo("ASHWATH RAM");
        assertThat(txn.getReferenceNumber()).isEqualTo("666998298177");
    }

    @Test
    @DisplayName("Should extract Debit Card spend with full date")
    void shouldExtractDebitCardSpend() {
        String subject = "Rs.100000.00 debited via Debit Card **5455";
        String body = """
            HDFC BANK --> Dear Customer, Greetings from HDFC Bank!
            Rs.100000.00 is debited from your HDFC Bank Debit Card ending 5455 at SSN TRUST FEES COLLECT on 17 Jun, 2026 at 07:11:30.
            """;

        Optional<ParsedTransaction> result = parser.parse(subject, body);

        assertThat(result).isPresent();
        ParsedTransaction txn = result.get();
        assertThat(txn.getBank()).isEqualTo("HDFC");
        assertThat(txn.getAccountNumber()).isEqualTo("XX5455");
        assertThat(txn.getAmount()).isEqualByComparingTo(new BigDecimal("100000.00"));
        assertThat(txn.getTransactionType()).isEqualTo(TransactionType.EXPENSE);
        assertThat(txn.getPaymentMethod()).isEqualTo(PaymentMethod.DEBIT_CARD);
        assertThat(txn.getMerchant()).isEqualTo("SSN TRUST FEES COLLECT");
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
    @DisplayName("Should return empty for promotional/newsletter email")
    void shouldReturnEmptyForUnrecognizedEmail() {
        String subject = "Exciting Loan Offers for You from HDFC Bank";
        String body = "Dear Customer, Apply now for pre-approved personal loans up to 10 Lakhs at special interest rates.";

        Optional<ParsedTransaction> result = parser.parse(subject, body);

        assertThat(result).isEmpty();
    }
}
