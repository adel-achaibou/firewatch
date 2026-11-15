package com.firewatch.backend.cwfis;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.firewatch.backend.cwfis.dto.requests.FireDetectionRequest;

class MapperTest {

    private final Mapper mapper = new Mapper();

    private static final Instant SYNC_TIME =
        Instant.parse("2026-11-05T12:00:00Z");

    private FireDetectionRequest fire(String id) {
        return new FireDetectionRequest(
            id,
            "AGENCY-001",
            "QC",
            "QC-01",
            new BigDecimal("46.8139"),
            new BigDecimal("-71.2080"),
            "OC",
            new BigDecimal("125.5"),
            "H",
            new BigDecimal("35"),
            SYNC_TIME.minusSeconds(60),
            SYNC_TIME.minusSeconds(3600),
            SYNC_TIME.plusSeconds(3600)
        );
    }

    @Test
    void mapsAllFieldsCorrectly() {
        FireDetectionRequest request = fire("FIRE-001");

        FireDetection entity =
            mapper.toEntities(List.of(request), SYNC_TIME).get(0);

        assertAll(
            () -> assertEquals(
                request.nationalFireId(), entity.getNationalFireId()
            ),
            () -> assertEquals(
                request.agencyFireId(), entity.getAgencyFireId()
            ),
            () -> assertEquals(
                request.agencyCode(), entity.getAgencyCode()
            ),
            () -> assertEquals(
                request.regionCode(), entity.getRegionCode()
            ),
            () -> assertEquals(
                request.latitude(), entity.getLatitude()
            ),
            () -> assertEquals(
                request.longitude(), entity.getLongitude()
            ),
            () -> assertEquals(
                request.stageOfControlStatus(),
                entity.getStageOfControlStatus()
            ),
            () -> assertEquals(
                request.fireSize(), entity.getFireSize()
            ),
            () -> assertEquals(
                request.nationalFireCause(),
                entity.getNationalFireCause()
            ),
            () -> assertEquals(
                request.percentContained(),
                entity.getPercentContained()
            ),
            () -> assertEquals(
                request.statusDate(), entity.getStatusDate()
            ),
            () -> assertEquals(
                request.recordStart(), entity.getRecordStart()
            ),
            () -> assertEquals(
                request.recordEnd(), entity.getRecordEnd()
            )
        );
    }

    @Test
    void createsPointWithCorrectCoordinates() {
        FireDetection entity =
            mapper.toEntities(List.of(fire("A")), SYNC_TIME).get(0);

        assertNotNull(entity.getLocation());

        assertEquals(
            -71.2080,
            entity.getLocation().getX(),
            0.000001
        );

        assertEquals(
            46.8139,
            entity.getLocation().getY(),
            0.000001
        );
    }

    @Test
    void usesWgs84CoordinateSystem() {
        FireDetection entity =
            mapper.toEntities(List.of(fire("A")), SYNC_TIME).get(0);

        assertEquals(4326, entity.getLocation().getSRID());
    }

    @Test
    void marksMappedFiresAsActive() {
        FireDetection entity =
            mapper.toEntities(List.of(fire("A")), SYNC_TIME).get(0);

        assertTrue(entity.isActive());
    }

    @Test
    void assignsSynchronizationTimestamp() {
        FireDetection entity =
            mapper.toEntities(List.of(fire("A")), SYNC_TIME).get(0);

        assertEquals(SYNC_TIME, entity.getLastSynchedAt());
    }

    @Test
    void mapsMultipleFires() {
        List<FireDetection> result = mapper.toEntities(
            List.of(fire("A"), fire("B"), fire("C")),
            SYNC_TIME
        );

        assertEquals(3, result.size());

        assertEquals("A", result.get(0).getNationalFireId());
        assertEquals("B", result.get(1).getNationalFireId());
        assertEquals("C", result.get(2).getNationalFireId());
    }

    @Test
    void createsIndependentEntities() {
        List<FireDetection> result = mapper.toEntities(
            List.of(fire("A"), fire("B")),
            SYNC_TIME
        );

        assertNotSame(result.get(0), result.get(1));
        assertNotSame(
            result.get(0).getLocation(),
            result.get(1).getLocation()
        );
    }

    @Test
    void preservesNullOptionalFields() {
        FireDetectionRequest request = new FireDetectionRequest(
            "A",
            "AGENCY-001",
            "QC",
            null,
            BigDecimal.valueOf(46),
            BigDecimal.valueOf(-72),
            "OC",
            null,
            null,
            null,
            null,
            SYNC_TIME.minusSeconds(60),
            SYNC_TIME.plusSeconds(60)
        );

        FireDetection entity =
            mapper.toEntities(List.of(request), SYNC_TIME).get(0);

        assertNull(entity.getRegionCode());
        assertNull(entity.getFireSize());
        assertNull(entity.getNationalFireCause());
        assertNull(entity.getPercentContained());
        assertNull(entity.getStatusDate());
    }

    @Test
    void returnsEmptyListForEmptyInput() {
        List<FireDetection> result =
            mapper.toEntities(List.of(), SYNC_TIME);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }
}
