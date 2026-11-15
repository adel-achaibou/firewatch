package com.firewatch.backend.cwfis.dto.requests;

import java.util.List;

public record CwfisParseResult(
    List<FireDetectionRequest> fires,
    long numberMatched,
    long numberReturned,
    long totalFeatures,
    int rejectedCount
) {}