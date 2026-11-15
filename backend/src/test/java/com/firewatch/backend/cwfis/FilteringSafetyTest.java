package com.firewatch.backend.cwfis;

import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.firewatch.backend.exceptions.CwfisFilteringException;

class FilteringSafetyTest {
    private final Filtering filtering = new Filtering();

    @Test
    void rejectsNullRecordInsteadOfSilentlyDroppingIt() {
        assertThrows(CwfisFilteringException.class, () -> filtering.filter(java.util.Arrays.asList((com.firewatch.backend.cwfis.dto.requests.FireDetectionRequest) null), Instant.now()));
    }
}
