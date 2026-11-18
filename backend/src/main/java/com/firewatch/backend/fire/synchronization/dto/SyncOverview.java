package com.firewatch.backend.fire.synchronization.dto;

import java.time.Instant;

public record SyncOverview(
    SyncStatusType latestStatus,
    Instant latestStartedAt,
    Instant lastSuccessfulAt
) {}
