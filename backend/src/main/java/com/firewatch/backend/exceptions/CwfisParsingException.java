package com.firewatch.backend.exceptions;

public class CwfisParsingException extends RuntimeException {
    public CwfisParsingException(String message) {
        super(message);
    }

    public CwfisParsingException(String message, Throwable cause) {
        super(message, cause);
    }
}