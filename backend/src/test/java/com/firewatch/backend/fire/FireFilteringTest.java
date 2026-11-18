package com.firewatch.backend.fire;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import com.firewatch.backend.exceptions.FireFilteringException;
import com.firewatch.backend.fire.dto.requests.FireRequest;

class FireFilteringTest {

    private final FireFiltering filtering = new FireFiltering();

    private static final Instant SYNC_TIME =
        Instant.parse("2026-11-05T12:00:00Z");

    private static final Instant START =
        SYNC_TIME.minusSeconds(3600);

    private static final Instant END =
        SYNC_TIME.plusSeconds(3600);

    private enum RequiredField {
        NATIONAL_FIRE_ID,
        AGENCY_FIRE_ID,
        AGENCY_CODE,
        LATITUDE,
        LONGITUDE,
        STAGE_OF_CONTROL_STATUS,
        RECORD_START,
        RECORD_END
    }

    private FireRequest fire(
            String id,
            String status,
            Instant start,
            Instant end,
            BigDecimal latitude,
            BigDecimal longitude,
            BigDecimal size,
            BigDecimal contained) {

        return new FireRequest(
            id,
            id,
            "QC",
            "QC-01",
            latitude,
            longitude,
            status,
            size,
            "H",
            contained,
            SYNC_TIME,
            start,
            end
        );
    }

    private FireRequest validFire(String id, String status) {
        return fire(
            id, status, START, END,
            BigDecimal.valueOf(46),
            BigDecimal.valueOf(-72),
            BigDecimal.TEN,
            BigDecimal.valueOf(50)
        );
    }

    private FireRequest withRequiredField(
            RequiredField field,
            Object replacement) {

        FireRequest valid = validFire("A", "OC");

        return new FireRequest(
            field == RequiredField.NATIONAL_FIRE_ID
                ? (String) replacement : valid.nationalFireId(),

            field == RequiredField.AGENCY_FIRE_ID
                ? (String) replacement : valid.agencyFireId(),

            field == RequiredField.AGENCY_CODE
                ? (String) replacement : valid.agencyCode(),

            valid.regionCode(),

            field == RequiredField.LATITUDE
                ? (BigDecimal) replacement : valid.latitude(),

            field == RequiredField.LONGITUDE
                ? (BigDecimal) replacement : valid.longitude(),

            field == RequiredField.STAGE_OF_CONTROL_STATUS
                ? (String) replacement : valid.stageOfControlStatus(),

            valid.fireSize(),
            valid.nationalFireCause(),
            valid.percentContained(),
            valid.statusDate(),

            field == RequiredField.RECORD_START
                ? (Instant) replacement : valid.recordStart(),

            field == RequiredField.RECORD_END
                ? (Instant) replacement : valid.recordEnd()
        );
    }

    @Test
    void acceptsActiveStatuses() {
        List<FireRequest> result = filtering.filter(
            List.of(
                validFire("A", "OC"),
                validFire("B", "BH"),
                validFire("C", "UC")
            ),
            SYNC_TIME
        );

        assertEquals(3, result.size());
    }

    @Test
    void excludesInactiveStatuses() {
        List<FireRequest> result = filtering.filter(
            List.of(
                validFire("A", "OUT"),
                validFire("B", "UNKNOWN"),
                validFire("C", "OC")
            ),
            SYNC_TIME
        );

        assertEquals(1, result.size());
        assertEquals("C", result.getFirst().nationalFireId());
    }

    @Test
    void keepsLatestVersionOfSameFire() {
        FireRequest older = fire(
            "A", "BH", START.minusSeconds(600), END,
            BigDecimal.valueOf(46), BigDecimal.valueOf(-72),
            BigDecimal.TEN, BigDecimal.ZERO
        );

        FireRequest newer = fire(
            "A", "OC", START, END,
            BigDecimal.valueOf(46), BigDecimal.valueOf(-72),
            BigDecimal.TEN, BigDecimal.valueOf(50)
        );

        List<FireRequest> result = filtering.filter(
            List.of(newer, older),
            SYNC_TIME
        );

        assertEquals(1, result.size());
        assertEquals("OC", result.getFirst().stageOfControlStatus());
        assertEquals(START, result.getFirst().recordStart());
    }

    @Test
    void excludesFireWhenLatestVersionIsOut() {
        FireRequest older = fire(
            "A", "OC", START.minusSeconds(600), END,
            BigDecimal.valueOf(46), BigDecimal.valueOf(-72),
            BigDecimal.TEN, BigDecimal.ZERO
        );

        FireRequest newer = validFire("A", "OUT");

        List<FireRequest> result = filtering.filter(
            List.of(older, newer),
            SYNC_TIME
        );

        assertTrue(result.isEmpty());
    }

    @Test
    void keepsFireWhenLatestVersionIsActive() {
        FireRequest older = fire(
            "A", "OUT", START.minusSeconds(600), END,
            BigDecimal.valueOf(46), BigDecimal.valueOf(-72),
            BigDecimal.TEN, BigDecimal.ZERO
        );

        FireRequest newer = validFire("A", "OC");

        List<FireRequest> result = filtering.filter(
            List.of(older, newer),
            SYNC_TIME
        );

        assertEquals(1, result.size());
        assertEquals("OC", result.getFirst().stageOfControlStatus());
    }

    @Test
    void normalizesNegativeOneToNull() {
        FireRequest input = fire(
            "A", "OC", START, END,
            BigDecimal.valueOf(46), BigDecimal.valueOf(-72),
            BigDecimal.valueOf(-1),
            BigDecimal.valueOf(-1)
        );

        FireRequest result =
            filtering.filter(List.of(input), SYNC_TIME).getFirst();

        assertNull(result.fireSize());
        assertNull(result.percentContained());
    }

    @Test
    void acceptsNullOptionalNumbers() {
        FireRequest input = fire(
            "A", "OC", START, END,
            BigDecimal.valueOf(46), BigDecimal.valueOf(-72),
            null, null
        );

        FireRequest result =
            filtering.filter(List.of(input), SYNC_TIME).getFirst();

        assertNull(result.fireSize());
        assertNull(result.percentContained());
    }

    @Test
    void acceptsBoundaryCoordinates() {
        FireRequest input = fire(
            "A", "OC", START, END,
            BigDecimal.valueOf(90),
            BigDecimal.valueOf(-180),
            BigDecimal.ZERO,
            BigDecimal.valueOf(100)
        );

        assertEquals(
            1,
            filtering.filter(List.of(input), SYNC_TIME).size()
        );
    }

    @Test
    void rejectsInvalidLatitude() {
        FireRequest input = fire(
            "A", "OC", START, END,
            BigDecimal.valueOf(91), BigDecimal.ZERO,
            BigDecimal.TEN, BigDecimal.ZERO
        );

        assertThrows(
            FireFilteringException.class,
            () -> filtering.filter(List.of(input), SYNC_TIME)
        );
    }

    @Test
    void rejectsInvalidLongitude() {
        FireRequest input = fire(
            "A", "OC", START, END,
            BigDecimal.ZERO, BigDecimal.valueOf(-181),
            BigDecimal.TEN, BigDecimal.ZERO
        );

        assertThrows(
            FireFilteringException.class,
            () -> filtering.filter(List.of(input), SYNC_TIME)
        );
    }

    @Test
    void rejectsNegativeFireSizeOtherThanMinusOne() {
        FireRequest input = fire(
            "A", "OC", START, END,
            BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.valueOf(-2), BigDecimal.ZERO
        );

        assertThrows(
            FireFilteringException.class,
            () -> filtering.filter(List.of(input), SYNC_TIME)
        );
    }

    @Test
    void rejectsPercentContainedAboveHundred() {
        FireRequest input = fire(
            "A", "OC", START, END,
            BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.TEN, BigDecimal.valueOf(101)
        );

        assertThrows(
            FireFilteringException.class,
            () -> filtering.filter(List.of(input), SYNC_TIME)
        );
    }

    @Test
    void rejectsInvalidNegativePercentContained() {
        FireRequest input = fire(
            "A", "OC", START, END,
            BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.TEN, BigDecimal.valueOf(-2)
        );

        assertThrows(
            FireFilteringException.class,
            () -> filtering.filter(List.of(input), SYNC_TIME)
        );
    }

    @Test
    void rejectsInvalidRecordPeriod() {
        FireRequest input = fire(
            "A", "OC", END, START,
            BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.TEN, BigDecimal.ZERO
        );

        assertThrows(
            FireFilteringException.class,
            () -> filtering.filter(List.of(input), SYNC_TIME)
        );
    }

    @Test
    void rejectsRecordOutsideSyncWindow() {
        FireRequest input = fire(
            "A", "OC",
            SYNC_TIME.plusSeconds(60),
            SYNC_TIME.plusSeconds(3600),
            BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.TEN, BigDecimal.ZERO
        );

        assertThrows(
            FireFilteringException.class,
            () -> filtering.filter(List.of(input), SYNC_TIME)
        );
    }

    @Test
    void rejectsRecordAtExclusiveEndBoundary() {
        FireRequest input = fire(
            "A", "OC",
            START, SYNC_TIME,
            BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.TEN, BigDecimal.ZERO
        );

        assertThrows(
            FireFilteringException.class,
            () -> filtering.filter(List.of(input), SYNC_TIME)
        );
    }

    @Test
    void rejectsNullRecord() {
        assertThrows(
            FireFilteringException.class,
            () -> filtering.filter(
                Arrays.asList((FireRequest) null),
                SYNC_TIME
            )
        );
    }

    @ParameterizedTest(name = "Reject null {0}")
    @EnumSource(RequiredField.class)
    void rejectsEachMissingRequiredFieldIndependently(
            RequiredField field) {

        FireRequest input =
            withRequiredField(field, null);

        FireFilteringException error = assertThrows(
            FireFilteringException.class,
            () -> filtering.filter(List.of(input), SYNC_TIME),
            "Expected rejection when " + field + " is null"
        );

        assertEquals(
            "Missing or blank required field",
            error.getMessage()
        );
    }

    @ParameterizedTest(name = "Reject blank {0}")
    @EnumSource(value = RequiredField.class, names = {
        "NATIONAL_FIRE_ID",
        "AGENCY_FIRE_ID",
        "AGENCY_CODE",
        "STAGE_OF_CONTROL_STATUS"
    })
    void rejectsEachBlankRequiredStringIndependently(
            RequiredField field) {

        for (String blank : List.of("", " ", "   ", "\t")) {
            FireRequest input =
                withRequiredField(field, blank);

            FireFilteringException error = assertThrows(
                FireFilteringException.class,
                () -> filtering.filter(List.of(input), SYNC_TIME),
                "Expected rejection for blank " + field
            );

            assertEquals(
                "Missing or blank required field",
                error.getMessage()
            );
        }
    }

    @Test
    void returnsEmptyListForEmptyInput() {
        assertTrue(
            filtering.filter(List.of(), SYNC_TIME).isEmpty()
        );
    }

    @Test
    void rejectsNullRecordInsteadOfSilentlyDroppingIt() {
        assertThrows(FireFilteringException.class, () -> filtering.filter(java.util.Arrays.asList((com.firewatch.backend.fire.dto.requests.FireRequest) null), Instant.now()));
    }
}
