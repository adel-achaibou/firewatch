package com.firewatch.backend.exceptions;

public class CwfisIngestionException extends RuntimeException {

    public CwfisIngestionException(String message, Throwable cause) {
        super(message, cause);
    }
}