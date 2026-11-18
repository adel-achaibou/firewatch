package com.firewatch.backend.fire.synchronization.dto;

import java.time.Instant;

import com.firewatch.backend.fire.synchronization.SyncModel;

public record SyncResponse(Instant startedAt, Instant completedAt, Double durationSeconds) {
    public static SyncResponse from(SyncModel sync) {
        return new SyncResponse(sync.getStartedAt(), sync.getCompletedAt(), sync.getDurationSeconds());
    }
}
