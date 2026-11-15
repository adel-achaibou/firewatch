package com.firewatch.backend.exceptions;

public class CwfisFetchException extends RuntimeException {
    public CwfisFetchException(String message, Throwable cause) {
        super(message, cause);
    }

    public CwfisFetchException(String message) {
        super(message);
    }
}

// The message takes our error message
// The cause takes the error created by Spring directly, by the system
