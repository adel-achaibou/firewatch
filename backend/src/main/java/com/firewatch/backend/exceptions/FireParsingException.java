package com.firewatch.backend.exceptions;

public class FireParsingException extends RuntimeException {
    public FireParsingException(String message) {
        super(message);
    }

    public FireParsingException(String message, Throwable cause) {
        super(message, cause);
    }
}