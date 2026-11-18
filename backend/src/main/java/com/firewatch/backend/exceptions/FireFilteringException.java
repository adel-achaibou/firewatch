package com.firewatch.backend.exceptions;

public class FireFilteringException extends RuntimeException {
    public FireFilteringException(String message) {
        super(message);
    }

    public FireFilteringException(String message, Throwable cause) {
        super(message, cause);
    }
}
