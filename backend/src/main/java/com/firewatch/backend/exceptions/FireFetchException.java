package com.firewatch.backend.exceptions;

public class FireFetchException extends RuntimeException {
    public FireFetchException(String message, Throwable cause) {
        super(message, cause);
    }

    public FireFetchException(String message) {
        super(message);
    }
}

// The message takes our error message
// The cause takes the error created by Spring directly, by the system
