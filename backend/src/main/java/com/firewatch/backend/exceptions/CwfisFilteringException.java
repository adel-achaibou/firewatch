package com.firewatch.backend.exceptions;

public class CwfisFilteringException extends RuntimeException {
    public CwfisFilteringException(String message) {
        super(message);
    }

    public CwfisFilteringException(String message, Throwable cause) {
        super(message, cause);
    }
}
