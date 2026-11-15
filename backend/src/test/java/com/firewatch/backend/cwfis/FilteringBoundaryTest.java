package com.firewatch.backend.cwfis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.firewatch.backend.cwfis.dto.requests.FireDetectionRequest;
import com.firewatch.backend.exceptions.CwfisFilteringException;

class FilteringBoundaryTest {
    private static final Instant NOW = Instant.parse("2026-11-05T12:00:00Z");
    private final Filtering filtering = new Filtering();

    private FireDetectionRequest fire(String id, String status, BigDecimal lat, BigDecimal lon,
                                      BigDecimal size, BigDecimal contained, Instant start, Instant end) {
        return new FireDetectionRequest(id, id, "QC", null, lat, lon, status,
            size, null, contained, null, start, end);
    }

    @Test void acceptsGeographicBoundaries() {
        var f = fire("F1", "OC", BigDecimal.valueOf(90), BigDecimal.valueOf(-180),
            BigDecimal.ZERO, BigDecimal.valueOf(100), NOW.minusSeconds(1), NOW.plusSeconds(1));
        assertEquals(1, filtering.filter(List.of(f), NOW).size());
    }

    @Test void normalizesUnknownNumericValues() {
        var f = fire("F1", "OC", BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.valueOf(-1), BigDecimal.valueOf(-1), NOW.minusSeconds(1), NOW.plusSeconds(1));
        var result = filtering.filter(List.of(f), NOW).getFirst();
        assertNull(result.fireSize());
        assertNull(result.percentContained());
    }

    @Test void rejectsOutOfRangeCoordinates() {
        for (BigDecimal latitude : List.of(BigDecimal.valueOf(-91), BigDecimal.valueOf(91))) {
            var f = fire("F1", "OC", latitude, BigDecimal.ZERO, null, null, NOW.minusSeconds(1), NOW.plusSeconds(1));
            assertThrows(CwfisFilteringException.class, () -> filtering.filter(List.of(f), NOW));
        }
        var f = fire("F1", "OC", BigDecimal.ZERO, BigDecimal.valueOf(181), null, null, NOW.minusSeconds(1), NOW.plusSeconds(1));
        assertThrows(CwfisFilteringException.class, () -> filtering.filter(List.of(f), NOW));
    }

    @Test void rejectsInvalidOptionalNumbers() {
        var f = fire("F1", "OC", BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.valueOf(-2), null, NOW.minusSeconds(1), NOW.plusSeconds(1));
        assertThrows(CwfisFilteringException.class, () -> filtering.filter(List.of(f), NOW));
        var g = fire("F1", "OC", BigDecimal.ZERO, BigDecimal.ZERO,
            null, BigDecimal.valueOf(101), NOW.minusSeconds(1), NOW.plusSeconds(1));
        assertThrows(CwfisFilteringException.class, () -> filtering.filter(List.of(g), NOW));
    }

    @Test void rejectsNullAndBlankRequiredRecords() {
        assertThrows(CwfisFilteringException.class, () -> filtering.filter(java.util.Arrays.asList((FireDetectionRequest) null), NOW));
        var f = fire(" ", "OC", BigDecimal.ZERO, BigDecimal.ZERO, null, null, NOW.minusSeconds(1), NOW.plusSeconds(1));
        assertThrows(CwfisFilteringException.class, () -> filtering.filter(List.of(f), NOW));
    }

    @Test void rejectsInvalidTimeWindow() {
        var f = fire("F1", "OC", BigDecimal.ZERO, BigDecimal.ZERO, null, null, NOW, NOW);
        assertThrows(CwfisFilteringException.class, () -> filtering.filter(List.of(f), NOW));
        var g = fire("F1", "OC", BigDecimal.ZERO, BigDecimal.ZERO, null, null, NOW.plusSeconds(1), NOW.plusSeconds(60));
        assertThrows(CwfisFilteringException.class, () -> filtering.filter(List.of(g), NOW));
    }

    @Test void ignoresInactiveStatuses() {
        var f = fire("F1", "OUT", BigDecimal.ZERO, BigDecimal.ZERO, null, null, NOW.minusSeconds(1), NOW.plusSeconds(1));
        assertTrue(filtering.filter(List.of(f), NOW).isEmpty());
    }

    @Test void keepsNewestVersionForSameFireId() {
        var older = fire("F1", "OC", BigDecimal.ONE, BigDecimal.ZERO, null, null, NOW.minusSeconds(30), NOW.plusSeconds(60));
        var newer = fire("F1", "OC", BigDecimal.TEN, BigDecimal.ZERO, null, null, NOW.minusSeconds(10), NOW.plusSeconds(60));
        var result = filtering.filter(List.of(older, newer), NOW);
        assertEquals(1, result.size());
        assertEquals(BigDecimal.TEN, result.getFirst().latitude());
    }
}
