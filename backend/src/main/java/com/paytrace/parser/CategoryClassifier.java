package com.paytrace.parser;

import com.paytrace.model.enums.TransactionType;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Component
public class CategoryClassifier {

    private static final Map<String, Pattern> CATEGORY_PATTERNS = new LinkedHashMap<>();

    static {
        // High priority: Food & Dining (matches tea, chai, cafe, truck/track, canteen, snacks even on campus)
        CATEGORY_PATTERNS.put("Food & Dining", Pattern.compile("(?i)\\b(swiggy|zomato|mcdonalds|starbucks|dominos|pizza|kfc|burger|restaurant|cafe|eatclub|subway|blinkit|zepto|dunzo|food|court|mess|canteen|bites|bakery|tea|chai|coffee|hotel|dhaba|snacks|jigarthanda|sweets|tiffin|truck|track|kitchen|bhavan|beverage|juice|shawarma|biryani|parotta|dosa|idli|chats|samosa|mithai)\\b"));
        CATEGORY_PATTERNS.put("Groceries", Pattern.compile("(?i)\\b(grofers|bigbasket|dmart|spencer|supermarket|nature basket|reliance retail|kirana|provision|vegetables|fruits|dairy|milk|nandini|amul|heritage)\\b"));
        CATEGORY_PATTERNS.put("Travel & Fuel", Pattern.compile("(?i)\\b(uber|ola|rapido|makemytrip|goibibo|irctc|cleartrip|indigo|air india|fuel|petrol|hpcl|bpcl|ioc|shell|travels|transport|metro|toll|fastag)\\b"));
        CATEGORY_PATTERNS.put("Utilities & Bills", Pattern.compile("(?i)\\b(airtel|jio|vi|vodafone|bescom|electricity|billdesk|cred|recharge|dth|tata sky|gas|broadband|wifi|water board)\\b"));
        CATEGORY_PATTERNS.put("Entertainment", Pattern.compile("(?i)\\b(netflix|spotify|prime video|hotstar|pvr|inox|bookmyshow|youtube|playstation|steam|apple)\\b"));
        CATEGORY_PATTERNS.put("Health & Medical", Pattern.compile("(?i)\\b(apollo|pharmeasy|netmeds|1mg|practo|hospital|pharmacy|clinic|medplus|diagnostic|dental|doctor)\\b"));
        CATEGORY_PATTERNS.put("Investment", Pattern.compile("(?i)\\b(zerodha|groww|upstox|kuvera|coin|indmoney|angel|mutual fund|sip|etmoney|cleartax)\\b"));
        CATEGORY_PATTERNS.put("Education & Fees", Pattern.compile("(?i)\\b(ssn college|ssn university|college|university|school|academy|fees|tuition|institute|exam fee|admission|course)\\b"));
        CATEGORY_PATTERNS.put("Shopping", Pattern.compile("(?i)\\b(amazon|flipkart|myntra|zara|h&m|ajio|meesho|nykaa|reliancedigital|croma|tata cliq|ikea|decathlon|store|mart|retail|fashion|clothing)\\b"));
    }

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
