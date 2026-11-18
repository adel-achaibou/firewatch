package com.firewatch.backend.exceptions;

public class FireIngestionException extends RuntimeException {

    public FireIngestionException(String message, Throwable cause) {
        super(message, cause);
    }
}