package com.firewatch.backend.fire.dto.mappers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.math.BigDecimal;
import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.firewatch.backend.fire.Fire;

class FireResponseMapperTest {
    private final FireResponseMapper mapper = new FireResponseMapper();

    @Test void mapsAllPublicFieldsWithoutExposingInternalState() {
        var fire = new Fire();
        fire.setNationalFireId("QC-123");
        fire.setAgencyCode("QC");
        fire.setLatitude(new BigDecimal("45.50"));
        fire.setLongitude(new BigDecimal("-73.60"));
        fire.setStageOfControlStatus("OC");
        fire.setFireSize(new BigDecimal("12.5"));
        fire.setNationalFireCause("H");
        fire.setPercentContained(new BigDecimal("25"));
        fire.setStatusDate(Instant.parse("2026-11-05T12:00:00Z"));
        var result = mapper.toResponse(fire);
        assertEquals("QC-123", result.nationalFireId());
        assertEquals("QC", result.agencyCode());
        assertEquals(new BigDecimal("45.50"), result.latitude());
        assertEquals(new BigDecimal("-73.60"), result.longitude());
        assertEquals("OC", result.stageOfControlStatus());
        assertEquals(new BigDecimal("12.5"), result.fireSize());
        assertEquals("H", result.nationalFireCause());
        assertEquals(new BigDecimal("25"), result.percentContained());
        assertEquals(Instant.parse("2026-11-05T12:00:00Z"), result.statusDate());
    }

    @Test void preservesUnknownOptionalValuesAsNull() {
        var fire = new Fire();
        fire.setNationalFireId("QC-124");
        var result = mapper.toResponse(fire);
        assertNull(result.fireSize());
        assertNull(result.percentContained());
        assertNull(result.statusDate());
        assertNull(result.nationalFireCause());
    }
}
