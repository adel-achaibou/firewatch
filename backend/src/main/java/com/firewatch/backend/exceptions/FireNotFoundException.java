package com.firewatch.backend.exceptions;

public class FireNotFoundException extends RuntimeException {

    public FireNotFoundException(String message) {
        super(message);
    }
}