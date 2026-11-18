package com.firewatch.backend.fire.dto.requests;

import java.util.List;

public record FireParseResult(
    List<FireRequest> fires,
    long numberMatched,
    long numberReturned,
    long totalFeatures,
    int rejectedCount
) {}