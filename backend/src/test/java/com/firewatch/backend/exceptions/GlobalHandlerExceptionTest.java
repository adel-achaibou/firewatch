
package com.firewatch.backend.exceptions;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler =
        new GlobalExceptionHandler();

    @Test
    void returns404WhenFireNotFound() {
        FireNotFoundException error =
            new FireNotFoundException("Fire not found");

        ResponseEntity<ProblemDetail> response =
            handler.handleFireNotFoundException(error);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(404, response.getBody().getStatus());
        assertEquals("Fire not found", response.getBody().getDetail());
    }

    @Test
    void returns500ForIngestionFailure() {
        CwfisIngestionException error =
            new CwfisIngestionException(
                "CWFIS unavailable",
                new IllegalStateException("Connection failed")
            );

        ResponseEntity<ProblemDetail> response =
            handler.handleCwfisIngestionException(error);

        assertEquals(
            HttpStatus.INTERNAL_SERVER_ERROR,
            response.getStatusCode()
        );
        assertNotNull(response.getBody());
        assertEquals(
            "Unable to process wildfire data",
            response.getBody().getDetail()
        );
    }

    @Test
    void preserves400ForInvalidRequest() {
        ErrorResponseException error =
            new ErrorResponseException(HttpStatus.BAD_REQUEST);

        ResponseEntity<ProblemDetail> response =
            handler.handleUnexpectedException(error);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Invalid request", response.getBody().getDetail());
    }

    @Test
    void preserves404ForSpringHttpError() {
        ErrorResponseException error =
            new ErrorResponseException(HttpStatus.NOT_FOUND);

        ResponseEntity<ProblemDetail> response =
            handler.handleUnexpectedException(error);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Invalid request", response.getBody().getDetail());
    }

    @Test
    void returns500ForUnexpectedException() {
        ResponseEntity<ProblemDetail> response =
            handler.handleUnexpectedException(
                new IllegalStateException("Unexpected failure")
            );

        assertEquals(
            HttpStatus.INTERNAL_SERVER_ERROR,
            response.getStatusCode()
        );
        assertNotNull(response.getBody());
        assertEquals(
            "An unexpected server error occurred",
            response.getBody().getDetail()
        );
    }

    @Test
    void returns500ForNon4xxSpringError() {
        ErrorResponseException error =
            new ErrorResponseException(HttpStatus.SERVICE_UNAVAILABLE);

        ResponseEntity<ProblemDetail> response =
            handler.handleUnexpectedException(error);

        assertEquals(
            HttpStatus.INTERNAL_SERVER_ERROR,
            response.getStatusCode()
        );
    }
}
