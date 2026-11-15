package com.firewatch.backend.cwfis.synchronization.dto;

import java.time.Instant;

public record SyncOverview(
    SyncStatusType latestStatus,
    Instant latestStartedAt,
    Instant lastSuccessfulAt
) {}
