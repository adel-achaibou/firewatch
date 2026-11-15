package com.firewatch.backend.cwfis.synchronization;

import java.time.Duration;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.firewatch.backend.cwfis.synchronization.dto.SyncOverview;
import com.firewatch.backend.cwfis.synchronization.dto.SyncStatusType;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SyncService {
    private final SyncRepository repository;

    @Transactional
    public SyncModel startSync() {
        SyncModel sync = new SyncModel();
        sync.setStartedAt(Instant.now());
        sync.setStatus(SyncStatusType.RUNNING);
        return repository.save(sync);
    }

    @Transactional
    public void completedSync(Long id) {
        SyncModel sync = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Sync not found: " + id));
        if (sync.getStatus() != SyncStatusType.RUNNING) return;
        finish(sync, SyncStatusType.SUCCESS, null);
    }

    @Transactional
    public void failedSync(Long id, Exception error) {
        SyncModel sync = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Sync not found: " + id));
        if (sync.getStatus() != SyncStatusType.RUNNING) return;
        Throwable cause = error.getCause() == null ? error : error.getCause();
        finish(sync, SyncStatusType.FAILED, cause.toString());
    }

    @Transactional
    public void interruptAbandonedSyncs() {
        for (SyncModel sync : repository.findAllByStatus(SyncStatusType.RUNNING)) {
            finish(sync, SyncStatusType.INTERRUPTED, "Application stopped before synchronization completed");
        }
    }

    @Transactional(readOnly = true)
    public SyncModel getLastSuccess() {
        return repository.findFirstByStatusOrderByCompletedAtDesc(SyncStatusType.SUCCESS).orElse(null);
    }

    @Transactional(readOnly = true)
    public SyncOverview getOverview() {
        SyncModel latest = repository.findFirstByOrderByStartedAtDescIdDesc().orElse(null);
        SyncModel lastSuccess = getLastSuccess();
        return new SyncOverview(
            latest == null ? null : latest.getStatus(),
            latest == null ? null : latest.getStartedAt(),
            lastSuccess == null ? null : lastSuccess.getCompletedAt()
        );
    }

    private void finish(SyncModel sync, SyncStatusType status, String message) {
        Instant completedAt = Instant.now();
        sync.setCompletedAt(completedAt);
        sync.setDurationSeconds(Duration.between(sync.getStartedAt(), completedAt).toMillis() / 1000.0);
        sync.setStatus(status);
        sync.setErrorMessage(message);
        repository.save(sync);
    }
}
