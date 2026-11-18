package com.firewatch.backend.exceptions;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log =
            LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(FireNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleFireNotFoundException(
            FireNotFoundException error) {

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                error.getMessage()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(FireIngestionException.class)
    public ResponseEntity<ProblemDetail> handleCwfisIngestionException(
            FireIngestionException error) {

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Unable to process wildfire data"
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpectedException(
            Exception error) {

        if (error instanceof ErrorResponse springError) {
            HttpStatus status = HttpStatus.resolve(
                    springError.getStatusCode().value()
            );

            if (status != null && status.is4xxClientError()) {
                ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                        status,
                        "Invalid request"
                );

                return ResponseEntity.status(status).body(problem);
            }
        }

        log.error("Unexpected HTTP error: {}", error.getMessage(), error);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected server error occurred"
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(problem);
    }
}
