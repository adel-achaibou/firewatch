package com.firewatch.backend.cwfis.dto.requests;

import java.math.BigDecimal;
import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;

// DTO for data received from the CWFIS API

public record FireDetectionRequest (
    
    @JsonProperty("national_fire_id")
    String nationalFireId,

    @JsonProperty("agency_fire_id")
    String agencyFireId,

    @JsonProperty("agency_code")
    String agencyCode,

    @JsonProperty("region_code")
    String regionCode,

    BigDecimal latitude,
    BigDecimal longitude,

    @JsonProperty("stage_of_control_status")
    String stageOfControlStatus,

    @JsonProperty("fire_size")
    BigDecimal fireSize,

    @JsonProperty("national_fire_cause")
    String nationalFireCause,

    @JsonProperty("percent_contained")
    BigDecimal percentContained,

    @JsonProperty("status_date")
    Instant statusDate,

    @JsonProperty("record_start")
    Instant recordStart,

    @JsonProperty("record_end")
    Instant recordEnd
){}
