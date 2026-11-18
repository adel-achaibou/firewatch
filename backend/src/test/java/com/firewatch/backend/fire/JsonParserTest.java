package com.firewatch.backend.fire;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.firewatch.backend.exceptions.CwfisParsingException;
import com.firewatch.backend.fire.dto.requests.CwfisParseResult;
import com.firewatch.backend.fire.dto.requests.FireDetectionRequest;

import tools.jackson.databind.ObjectMapper;

class JsonParserTest {

    private final JsonParser parser = new JsonParser(new ObjectMapper());

    private String response(
            String features,
            long matched,
            long returned,
            long total) {

        return """
            {
              "type": "FeatureCollection",
              "numberMatched": %d,
              "numberReturned": %d,
              "totalFeatures": %d,
              "features": %s
            }
            """.formatted(matched, returned, total, features);
    }

    private String feature(String properties) {
        return """
            {
              "type": "Feature",
              "properties": %s
            }
            """.formatted(properties);
    }

    private String validProperties() {
        return """
            {
              "national_fire_id": "QC-123",
              "agency_fire_id": "AGENCY-456",
              "agency_code": "QC",
              "region_code": "QC-REGION-07",
              "latitude": 46.123456,
              "longitude": -72.654321,
              "stage_of_control_status": "OC",
              "fire_size": 125.75,
              "national_fire_cause": "L",
              "percent_contained": 42.5,
              "status_date": "2026-11-05T14:30:00Z",
              "record_start": "2026-11-01T00:00:00Z",
              "record_end": "2026-11-20T00:00:00Z"
            }
            """;
    }

    private void assertDecimal(
            String expected,
            BigDecimal actual) {

        assertNotNull(actual);
        assertEquals(
            0,
            new BigDecimal(expected).compareTo(actual)
        );
    }

    @Test
    void acceptsConsistentEmptySnapshot() {
        CwfisParseResult result =
            parser.parse(response("[]", 0, 0, 0));

        assertNotNull(result);
        assertNotNull(result.fires());
        assertTrue(result.fires().isEmpty());

        assertEquals(0, result.numberMatched());
        assertEquals(0, result.numberReturned());
        assertEquals(0, result.totalFeatures());
        assertEquals(0, result.rejectedCount());
    }

    @Test
    void parsesEveryFireDetectionFieldCorrectly() {
        String json = response(
            "[" + feature(validProperties()) + "]",
            1, 1, 1
        );

        CwfisParseResult result = parser.parse(json);

        assertEquals(1, result.numberMatched());
        assertEquals(1, result.numberReturned());
        assertEquals(1, result.totalFeatures());
        assertEquals(0, result.rejectedCount());
        assertEquals(1, result.fires().size());

        FireDetectionRequest fire = result.fires().getFirst();

        assertAll(
            () -> assertEquals(
                "QC-123", fire.nationalFireId()
            ),
            () -> assertEquals(
                "AGENCY-456", fire.agencyFireId()
            ),
            () -> assertEquals(
                "QC", fire.agencyCode()
            ),
            () -> assertEquals(
                "QC-REGION-07", fire.regionCode()
            ),
            () -> assertDecimal(
                "46.123456", fire.latitude()
            ),
            () -> assertDecimal(
                "-72.654321", fire.longitude()
            ),
            () -> assertEquals(
                "OC", fire.stageOfControlStatus()
            ),
            () -> assertDecimal(
                "125.75", fire.fireSize()
            ),
            () -> assertEquals(
                "L", fire.nationalFireCause()
            ),
            () -> assertDecimal(
                "42.5", fire.percentContained()
            ),
            () -> assertEquals(
                Instant.parse("2026-11-05T14:30:00Z"),
                fire.statusDate()
            ),
            () -> assertEquals(
                Instant.parse("2026-11-01T00:00:00Z"),
                fire.recordStart()
            ),
            () -> assertEquals(
                Instant.parse("2026-11-20T00:00:00Z"),
                fire.recordEnd()
            )
        );
    }

    @Test
    void acceptsOptionalFieldsWhenMissing() {
        String properties = """
            {
              "national_fire_id": "QC-MINIMAL",
              "agency_fire_id": "AG-1",
              "agency_code": "QC",
              "latitude": 45.0,
              "longitude": -73.0,
              "stage_of_control_status": "UC",
              "record_start": "2026-11-01T00:00:00Z",
              "record_end": "2026-11-20T00:00:00Z"
            }
            """;

        CwfisParseResult result = parser.parse(
            response("[" + feature(properties) + "]", 1, 1, 1)
        );

        assertEquals(0, result.rejectedCount());
        assertEquals(1, result.fires().size());

        FireDetectionRequest fire = result.fires().getFirst();

        assertEquals("QC-MINIMAL", fire.nationalFireId());
        assertEquals("UC", fire.stageOfControlStatus());

        assertNull(fire.regionCode());
        assertNull(fire.fireSize());
        assertNull(fire.nationalFireCause());
        assertNull(fire.percentContained());
        assertNull(fire.statusDate());
    }

    @Test
    void rejectsInvalidJsonAndRootShapes() {
        for (String json : new String[]{
            "{broken",
            "null",
            "[]",
            "42",
            "\"hello\""
        }) {
            assertThrows(
                CwfisParsingException.class,
                () -> parser.parse(json),
                json
            );
        }
    }

    @Test
    void rejectsMissingOrInvalidFeatures() {
        for (String json : new String[]{
            "{}",
            "{\"features\":null}",
            "{\"features\":{}}"
        }) {
            assertThrows(
                CwfisParsingException.class,
                () -> parser.parse(json),
                json
            );
        }
    }

    @Test
    void rejectsMissingAndNonIntegralMetadata() {
        for (String json : new String[]{
            "{\"features\":[]}",
            """
            {
              "features": [],
              "numberMatched": "0",
              "numberReturned": 0,
              "totalFeatures": 0
            }
            """,
            """
            {
              "features": [],
              "numberMatched": 0.5,
              "numberReturned": 0,
              "totalFeatures": 0
            }
            """
        }) {
            assertThrows(
                CwfisParsingException.class,
                () -> parser.parse(json),
                json
            );
        }
    }

    @Test
    void rejectsTruncatedAndContradictoryMetadata() {
        for (String json : new String[]{
            response("[]", 1, 0, 1),
            response("[]", 1, 1, 1),
            response("[]", 0, 0, 1),
            response("[]", -1, 0, 0),
            response("[]", 0, -1, 0),
            response("[]", 0, 0, -1)
        }) {
            assertThrows(
                CwfisParsingException.class,
                () -> parser.parse(json),
                json
            );
        }
    }

    @Test
    void countsMalformedFeatureProperties() {
        String features = """
            [
              null,
              {},
              {"properties": null},
              {"properties": []}
            ]
            """;

        CwfisParseResult result =
            parser.parse(response(features, 4, 4, 4));

        assertEquals(4, result.numberMatched());
        assertEquals(4, result.numberReturned());
        assertEquals(4, result.totalFeatures());

        assertEquals(4, result.rejectedCount());
        assertTrue(result.fires().isEmpty());
    }

    @Test
    void rejectsInvalidDateWithoutDiscardingValidFire() {
        String invalid = validProperties().replace(
            "2026-11-05T14:30:00Z",
            "not-a-valid-date"
        );

        String features = "["
            + feature(validProperties())
            + ","
            + feature(invalid)
            + "]";

        CwfisParseResult result =
            parser.parse(response(features, 2, 2, 2));

        assertEquals(2, result.numberMatched());
        assertEquals(2, result.numberReturned());
        assertEquals(2, result.totalFeatures());

        assertEquals(1, result.rejectedCount());
        assertEquals(1, result.fires().size());

        assertEquals(
            "QC-123",
            result.fires().getFirst().nationalFireId()
        );
    }

    @Test
    void rejectsInvalidNumericTypeWithoutDiscardingValidFire() {
        String invalid = validProperties().replace(
            "\"latitude\": 46.123456",
            "\"latitude\": {\"invalid\": true}"
        );

        String features = "["
            + feature(validProperties())
            + ","
            + feature(invalid)
            + "]";

        CwfisParseResult result =
            parser.parse(response(features, 2, 2, 2));

        assertEquals(2, result.numberMatched());
        assertEquals(2, result.numberReturned());
        assertEquals(2, result.totalFeatures());

        assertEquals(1, result.rejectedCount());
        assertEquals(1, result.fires().size());

        FireDetectionRequest valid =
            result.fires().getFirst();

        assertDecimal("46.123456", valid.latitude());
        assertDecimal("-72.654321", valid.longitude());
    }

    @Test
    void preservesMetadataWhenSomeFeaturesAreRejected() {
        String features = "["
            + feature(validProperties())
            + ","
            + "{\"type\":\"Feature\",\"properties\":null}"
            + "]";

        CwfisParseResult result =
            parser.parse(response(features, 2, 2, 2));

        assertEquals(2, result.numberMatched());
        assertEquals(2, result.numberReturned());
        assertEquals(2, result.totalFeatures());

        assertEquals(1, result.rejectedCount());
        assertEquals(1, result.fires().size());
    }
}
