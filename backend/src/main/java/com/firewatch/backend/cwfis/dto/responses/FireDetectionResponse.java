package com.firewatch.backend.cwfis.dto.responses;

import java.math.BigDecimal;
import java.time.Instant;

public record FireDetectionResponse(
    String nationalFireId,
    String agencyCode,
    BigDecimal latitude,
    BigDecimal longitude,
    String stageOfControlStatus,
    BigDecimal fireSize,
    String nationalFireCause,
    BigDecimal percentContained,
    Instant statusDate
) {
}
