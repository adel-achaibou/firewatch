package com.firewatch.backend.fire.dto.requests;

import java.util.List;

public record CwfisParseResult(
    List<FireDetectionRequest> fires,
    long numberMatched,
    long numberReturned,
    long totalFeatures,
    int rejectedCount
) {}