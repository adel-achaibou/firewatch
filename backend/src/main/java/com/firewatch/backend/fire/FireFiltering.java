package com.firewatch.backend.fire;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.firewatch.backend.exceptions.CwfisFilteringException;
import com.firewatch.backend.fire.dto.requests.FireDetectionRequest;

@Component
public class FireFiltering {

    public List<FireDetectionRequest> filter(List<FireDetectionRequest> fires, Instant syncTime) {

        Map<String, FireDetectionRequest> latestFires = new HashMap<>();

        for (FireDetectionRequest fire : fires) {

            if (fire == null) {
                throw new CwfisFilteringException("CWFIS returned a null fire record");
            }

            // 1. Validate required fields
            List<Object> obligatoryRows = Arrays.asList(
                fire.nationalFireId(),
                fire.agencyFireId(),
                fire.agencyCode(),
                fire.latitude(),
                fire.longitude(),
                fire.stageOfControlStatus(),
                fire.recordStart(),
                fire.recordEnd()
            );

            if (!areObligatoryRowsCorrect(obligatoryRows)) {
                throw new CwfisFilteringException("Missing or blank required field");
            }

            // 2. Validate coordinates
            if (!isLatitudeCorrect(fire.latitude())) {
                throw new CwfisFilteringException("Invalid latitude: " + fire.latitude());
            }

            if (!isLongitudeCorrect(fire.longitude())) {
                throw new CwfisFilteringException("Invalid longitude: " + fire.longitude());
            }

            // 3. Validate optional numeric fields
            if (!isFireSizeCorrect(fire.fireSize())) {
                throw new CwfisFilteringException("Invalid fireSize: " + fire.fireSize());
            }

            if (!isPercentContainedCorrect(fire.percentContained())) {
                throw new CwfisFilteringException("Invalid percentContained: " + fire.percentContained());
            }

            // 4. Validate record period
            if (!areRecordStartAndEndCorrect(fire.recordEnd(), fire.recordStart())) {
                throw new CwfisFilteringException(
                    "Invalid record period. recordEnd must be greater than recordStart"
                );
            }

            // 5. Validate the synchronization window
            if (!validatesRecordDates(fire.recordEnd(), fire.recordStart(), syncTime)) {
                throw new CwfisFilteringException(
                    "Fire record is outside the requested synchronization window"
                );
            }

            // 6. Normalize -1 into null
            BigDecimal fireSize = fireSizeNegativeOne(fire.fireSize());
            BigDecimal percentContained = percentContainedNegativeOne(fire.percentContained());

            FireDetectionRequest normalizedFire = new FireDetectionRequest(
                fire.nationalFireId(),
                fire.agencyFireId(),
                fire.agencyCode(),
                fire.regionCode(),
                fire.latitude(),
                fire.longitude(),
                fire.stageOfControlStatus(),
                fireSize,
                fire.nationalFireCause(),
                percentContained,
                fire.statusDate(),
                fire.recordStart(),
                fire.recordEnd()
            );

            // 7. Keep the latest version, regardless of its status
            FireDetectionRequest previous = latestFires.get(normalizedFire.nationalFireId());

            if (previous == null ||
                    normalizedFire.recordStart().isAfter(previous.recordStart())) {
                latestFires.put(
                    normalizedFire.nationalFireId(),
                    normalizedFire
                );
            }
        }

        // 8. Keep only active fires from their latest versions
        List<FireDetectionRequest> activeFires = new ArrayList<>();

        for (FireDetectionRequest fire : latestFires.values()) {
            if (isFireActive(fire.stageOfControlStatus())) {
                activeFires.add(fire);
            }
        }
        return activeFires;
    }

    private boolean isLatitudeCorrect(BigDecimal latitude) {
        return latitude.compareTo(BigDecimal.valueOf(-90)) >= 0 && latitude.compareTo(BigDecimal.valueOf(90)) <= 0;
    }

    private boolean isLongitudeCorrect(BigDecimal longitude) {
        return longitude.compareTo(BigDecimal.valueOf(-180)) >= 0 && longitude.compareTo(BigDecimal.valueOf(180)) <= 0;
    }

    private boolean isFireSizeCorrect(BigDecimal fireSize) {
        if (fireSize == null) {
            return true;
        }
        if (fireSize.compareTo(BigDecimal.valueOf(-1)) == 0) {
            return true;
        }
        return fireSize.compareTo(BigDecimal.ZERO) >= 0;
    }

    private boolean isPercentContainedCorrect(BigDecimal percentContained) {
        if (percentContained == null) {
            return true;
        }
        if (percentContained.compareTo(BigDecimal.valueOf(-1)) == 0) {
            return true;
        }
        return percentContained.compareTo(BigDecimal.ZERO) >= 0
            && percentContained.compareTo(BigDecimal.valueOf(100)) <= 0;
    }

    private BigDecimal fireSizeNegativeOne(BigDecimal fireSize) {
        if (fireSize == null) {
            return null;
        }
        if (fireSize.compareTo(BigDecimal.valueOf(-1)) == 0) {
            return null;
        }
        return fireSize;
    }

    private BigDecimal percentContainedNegativeOne(BigDecimal percentContained) {
        if (percentContained == null) {
            return null;
        }
        if (percentContained.compareTo(BigDecimal.valueOf(-1)) == 0) {
            return null;
        }
        return percentContained;
    }

    private boolean areObligatoryRowsCorrect(List<Object> values) {
        for (Object value : values) {
            if (value == null) {
                return false;
            }
            if (value instanceof String text && text.isBlank()) {
                return false;
            }
        }
        return true;
    }

    private boolean areRecordStartAndEndCorrect(Instant recordEnd, Instant recordStart) {
        return recordEnd.isAfter(recordStart);
    }

    private boolean validatesRecordDates(Instant recordEnd, Instant recordStart, Instant syncTime) {
        return !syncTime.isBefore(recordStart) && syncTime.isBefore(recordEnd);
    }

    private boolean isFireActive(String status) {
        return "OC".equals(status) || "BH".equals(status) || "UC".equals(status);
    }
}
