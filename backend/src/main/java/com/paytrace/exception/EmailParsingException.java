package com.paytrace.exception;

public class EmailParsingException extends RuntimeException {
    public EmailParsingException(String message) {
        super(message);
    }

    public EmailParsingException(String message, Throwable cause) {
        super(message, cause);
    }
}
