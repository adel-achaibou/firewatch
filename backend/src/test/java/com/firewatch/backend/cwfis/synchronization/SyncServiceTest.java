package com.firewatch.backend.cwfis.synchronization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.firewatch.backend.IsolatedDatabaseTest;
import com.firewatch.backend.cwfis.synchronization.dto.SyncOverview;
import com.firewatch.backend.cwfis.synchronization.dto.SyncStatusType;

@SpringBootTest
class SyncServiceTest extends IsolatedDatabaseTest {

    private static final Instant T0 =
        Instant.parse("2026-11-01T10:00:00Z");

    @Autowired
    private SyncRepository repository;

    @Autowired
    private SyncService service;

    @BeforeEach
    void resetDatabase() {
        repository.deleteAllInBatch();
    }

    @Test
    void startsSyncAndPersistsRunningState() {
        Instant before = Instant.now();

        SyncModel started = service.startSync();

        Instant after = Instant.now();

        assertNotNull(started.getId());
        assertEquals(
            SyncStatusType.RUNNING,
            started.getStatus()
        );

        assertNotNull(started.getStartedAt());
        assertFalse(started.getStartedAt().isBefore(before));
        assertFalse(started.getStartedAt().isAfter(after));

        assertNull(started.getCompletedAt());
        assertNull(started.getDurationSeconds());
        assertNull(started.getErrorMessage());

        SyncModel persisted = repository.findById(
            started.getId()
        ).orElseThrow();

        assertEquals(
            SyncStatusType.RUNNING,
            persisted.getStatus()
        );

        assertTrue(
            Duration.between(
                started.getStartedAt(),
                persisted.getStartedAt()
            ).abs().compareTo(Duration.ofNanos(1_000)) <= 0,
            "Persisted timestamp must match within PostgreSQL microsecond precision"
        );
    }

    @Test
    void completesRunningSyncAndPersistsSuccess() {
        SyncModel running = seed(
            T0,
            null,
            SyncStatusType.RUNNING
        );

        service.completedSync(running.getId());

        SyncModel persisted = repository.findById(
            running.getId()
        ).orElseThrow();

        assertEquals(
            SyncStatusType.SUCCESS,
            persisted.getStatus()
        );

        assertNotNull(persisted.getCompletedAt());
        assertNotNull(persisted.getDurationSeconds());

        assertFalse(
            persisted.getCompletedAt()
                .isBefore(persisted.getStartedAt())
        );

        assertTrue(persisted.getDurationSeconds() >= 0);
        assertNull(persisted.getErrorMessage());

        assertEquals(
            running.getId(),
            service.getLastSuccess().getId()
        );
    }

    @Test
    void failsRunningSyncAndPersistsRootCause() {
        SyncModel running = seed(
            T0,
            null,
            SyncStatusType.RUNNING
        );

        Exception error = new RuntimeException(
            "wrapper",
            new IllegalStateException("source failure")
        );

        service.failedSync(running.getId(), error);

        SyncModel persisted = repository.findById(
            running.getId()
        ).orElseThrow();

        assertEquals(
            SyncStatusType.FAILED,
            persisted.getStatus()
        );

        assertEquals(
            "java.lang.IllegalStateException: source failure",
            persisted.getErrorMessage()
        );

        assertNotNull(persisted.getCompletedAt());
        assertNotNull(persisted.getDurationSeconds());

        assertNull(service.getLastSuccess());
    }

    @Test
    void doesNotOverwriteTerminalStates() {
        for (SyncStatusType terminal : List.of(
            SyncStatusType.SUCCESS,
            SyncStatusType.FAILED,
            SyncStatusType.INTERRUPTED
        )) {
            SyncModel status = seed(
                T0,
                T0.plusSeconds(10),
                terminal
            );

            service.completedSync(status.getId());

            service.failedSync(
                status.getId(),
                new RuntimeException("ignored")
            );

            SyncModel persisted = repository.findById(
                status.getId()
            ).orElseThrow();

            assertEquals(terminal, persisted.getStatus());

            assertEquals(
                T0.plusSeconds(10),
                persisted.getCompletedAt()
            );

            assertEquals(
                "existing message",
                persisted.getErrorMessage()
            );
        }
    }

    @Test
    void rejectsMissingSync() {
        assertThrows(
            IllegalArgumentException.class,
            () -> service.completedSync(-999L)
        );

        assertThrows(
            IllegalArgumentException.class,
            () -> service.failedSync(
                -999L,
                new RuntimeException("failure")
            )
        );

        assertEquals(0, repository.count());
    }

    @Test
    void interruptsOnlyRunningRecords() {
        SyncModel first = seed(
            T0,
            null,
            SyncStatusType.RUNNING
        );

        SyncModel second = seed(
            T0.plusSeconds(5),
            null,
            SyncStatusType.RUNNING
        );

        SyncModel success = seed(
            T0.minusSeconds(20),
            T0.minusSeconds(10),
            SyncStatusType.SUCCESS
        );

        service.interruptAbandonedSyncs();

        for (Long id : List.of(
            first.getId(),
            second.getId()
        )) {
            SyncModel persisted = repository.findById(id)
                .orElseThrow();

            assertEquals(
                SyncStatusType.INTERRUPTED,
                persisted.getStatus()
            );

            assertNotNull(persisted.getCompletedAt());

            assertEquals(
                "Application stopped before synchronization completed",
                persisted.getErrorMessage()
            );
        }

        SyncModel unchanged = repository.findById(
            success.getId()
        ).orElseThrow();

        assertEquals(
            SyncStatusType.SUCCESS,
            unchanged.getStatus()
        );

        assertEquals(
            T0.minusSeconds(10),
            unchanged.getCompletedAt()
        );

        assertEquals(3, repository.count());
    }

    @Test
    void returnsMostRecentlyCompletedSuccessfulSync() {
        SyncModel olderSuccess = seed(
            T0,
            T0.plusSeconds(30),
            SyncStatusType.SUCCESS
        );

        SyncModel newerSuccess = seed(
            T0.plusSeconds(10),
            T0.plusSeconds(60),
            SyncStatusType.SUCCESS
        );

        seed(
            T0.plusSeconds(20),
            T0.plusSeconds(90),
            SyncStatusType.FAILED
        );

        SyncModel result = service.getLastSuccess();

        assertNotNull(result);
        assertEquals(newerSuccess.getId(), result.getId());

        assertNotEquals(
            olderSuccess.getId(),
            result.getId()
        );

        assertEquals(
            T0.plusSeconds(60),
            result.getCompletedAt()
        );
    }

    @Test
    void sortsLastSuccessByCompletionNotStartTime() {
        SyncModel lateStart = seed(
            T0.plusSeconds(30),
            T0.plusSeconds(40),
            SyncStatusType.SUCCESS
        );

        SyncModel lateCompletion = seed(
            T0,
            T0.plusSeconds(60),
            SyncStatusType.SUCCESS
        );

        SyncModel result = service.getLastSuccess();

        assertNotNull(result);

        assertEquals(
            lateCompletion.getId(),
            result.getId()
        );

        assertNotEquals(
            lateStart.getId(),
            result.getId()
        );
    }

    @Test
    void overviewUsesLatestStartedAndLastCompletedSuccess() {
        SyncModel success = seed(
            T0,
            T0.plusSeconds(20),
            SyncStatusType.SUCCESS
        );

        SyncModel latest = seed(
            T0.plusSeconds(60),
            null,
            SyncStatusType.RUNNING
        );

        SyncOverview overview = service.getOverview();

        assertEquals(
            SyncStatusType.RUNNING,
            overview.latestStatus()
        );

        assertEquals(
            latest.getStartedAt(),
            overview.latestStartedAt()
        );

        assertEquals(
            success.getCompletedAt(),
            overview.lastSuccessfulAt()
        );
    }

    @Test
    void overviewBreaksStartTimeTiesUsingHighestId() {
        SyncModel first = seed(
            T0,
            T0.plusSeconds(10),
            SyncStatusType.SUCCESS
        );

        SyncModel second = seed(
            T0,
            null,
            SyncStatusType.RUNNING
        );

        assertTrue(second.getId() > first.getId());

        SyncOverview overview = service.getOverview();

        assertEquals(
            SyncStatusType.RUNNING,
            overview.latestStatus()
        );

        assertEquals(
            T0,
            overview.latestStartedAt()
        );

        assertEquals(
            T0.plusSeconds(10),
            overview.lastSuccessfulAt()
        );
    }

    @Test
    void returnsEmptyOverviewWhenNoHistory() {
        assertEquals(0, repository.count());

        SyncOverview overview = service.getOverview();

        assertNull(overview.latestStatus());
        assertNull(overview.latestStartedAt());
        assertNull(overview.lastSuccessfulAt());

        assertNull(service.getLastSuccess());
    }

    private SyncModel seed(
            Instant startedAt,
            Instant completedAt,
            SyncStatusType status) {

        SyncModel sync = new SyncModel();

        sync.setStartedAt(startedAt);
        sync.setCompletedAt(completedAt);
        sync.setStatus(status);

        if (completedAt != null) {
            sync.setDurationSeconds(
                (double) (completedAt.toEpochMilli()
                    - startedAt.toEpochMilli()) / 1000.0
            );

            sync.setErrorMessage("existing message");
        }

        return repository.saveAndFlush(sync);
    }
}
