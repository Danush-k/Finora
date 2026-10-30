package com.paytrace.parser;

import com.paytrace.model.enums.TransactionType;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Component
public class CategoryClassifier {

    private static final Map<String, Pattern> CATEGORY_PATTERNS = Map.of(
        "Food & Dining", Pattern.compile("(?i)\\b(swiggy|zomato|mcdonalds|starbucks|dominos|pizza|kfc|burger|restaurant|cafe|eatclub|subway|blinkit|zepto|dunzo|food|court|mess|canteen|bites|bakery|tea|coffee|hotel|dhaba|snacks|jigarthanda|sweets)\\b"),
        "Shopping", Pattern.compile("(?i)\\b(amazon|flipkart|myntra|zara|h&m|ajio|meesho|nykaa|reliancedigital|croma|tata cliq|ikea|decathlon|store|mart|retail)\\b"),
        "Groceries", Pattern.compile("(?i)\\b(grofers|bigbasket|dmart|spencer|supermarket|nature basket|reliance retail|kirana)\\b"),
        "Travel & Fuel", Pattern.compile("(?i)\\b(uber|ola|rapido|makemytrip|goibibo|irctc|cleartrip|indigo|air india|fuel|petrol|hpcl|bpcl|ioc|shell|travels|transport)\\b"),
        "Utilities & Bills", Pattern.compile("(?i)\\b(airtel|jio|vi|vodafone|bescom|electricity|billdesk|cred|recharge|dth|tata sky|gas|broadband|fastag)\\b"),
        "Entertainment", Pattern.compile("(?i)\\b(netflix|spotify|prime video|hotstar|pvr|inox|bookmyshow|youtube|playstation|steam|apple)\\b"),
        "Health & Medical", Pattern.compile("(?i)\\b(apollo|pharmeasy|netmeds|1mg|practo|hospital|pharmacy|clinic|medplus|diagnostic)\\b"),
        "Education & Fees", Pattern.compile("(?i)\\b(ssn|college|university|school|academy|fees|tuition|rzp|institute|exam)\\b"),
        "Investment", Pattern.compile("(?i)\\b(zerodha|groww|upstox|kuvera|coin|indmoney|angel|mutual fund|sip|etmoney|cleartax)\\b")
    );

    public String classify(String merchant, String description, TransactionType type) {
        if (type == TransactionType.INCOME) {
            String combined = (merchant + " " + description).toLowerCase(Locale.ROOT);
            if (combined.contains("salary") || combined.contains("payroll") || combined.contains("wages")) {
                return "Salary & Income";
            }
            if (combined.contains("dividend") || combined.contains("interest")) {
                return "Investment Return";
            }
            return "Income";
        }

        if (type == TransactionType.REFUND) {
            return "Refund";
        }

        if (type == TransactionType.TRANSFER) {
            return "Transfer";
        }

        String searchTarget = (merchant != null ? merchant : "") + " " + (description != null ? description : "");
        for (Map.Entry<String, Pattern> entry : CATEGORY_PATTERNS.entrySet()) {
            if (entry.getValue().matcher(searchTarget).find()) {
                return entry.getKey();
            }
        }

        return "Other";
    }
}
