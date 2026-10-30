package com.paytrace.parser;

import java.util.Optional;

public interface EmailParser {

    boolean canParse(String sender, String subject, String body);

    Optional<ParsedTransaction> parse(String subject, String body);
}
