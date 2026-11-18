package com.firewatch.backend.fire;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.firewatch.backend.exceptions.FireIngestionException;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PersistenceService {

    private final FireRepository repository;
    private final EntityManager entityManager;

    @Transactional
    public void reconcile(List<Fire> fires, Instant syncTime) {

        // Validate inputs before database operations
        if (fires == null || syncTime == null) {
            throw new IllegalArgumentException("Null CWFIS reconciliation argument");
        }

        // Prevent concurrent synchronizations
        if (!repository.tryAcquireSyncLock()) {
            throw new FireIngestionException("Concurrent CWFIS synchronization", new IllegalStateException("Sync lock busy"));
        }

        // Read the last applied reconciliation.
        // The row is locked until the transaction finishes.
        Instant latest = (Instant) entityManager.createNativeQuery("""
                SELECT last_applied_at
                FROM cwfis_reconciliation_state
                WHERE id = 1
                FOR UPDATE
                """)
                .getSingleResult();

        // Reject outdated or repeated snapshots
        if (latest != null && !syncTime.isAfter(latest)) {
            throw new FireIngestionException("Stale CWFIS snapshot", new IllegalStateException("A newer snapshot has already been persisted"));
        }

        // Save active fire detections
        repository.saveAllAndFlush(fires);

        // Deactivate fires missing from the current active inventory
        repository.deactivateMissingFires(syncTime);

        // Update the reconciliation checkpoint atomically
        // with all wildfire database changes.
        entityManager.createNativeQuery("""
                UPDATE cwfis_reconciliation_state
                SET last_applied_at = :syncTime
                WHERE id = 1
                """)
                .setParameter("syncTime", syncTime)
                .executeUpdate();
    }
}
