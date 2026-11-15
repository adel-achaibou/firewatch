package com.firewatch.backend.cwfis;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import com.firewatch.backend.exceptions.CwfisIngestionException;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

class PersistenceServiceTest {

    private final Repository repository =
        mock(Repository.class);

    private final EntityManager entityManager =
        mock(EntityManager.class);

    private final Query selectQuery = mock(Query.class);
    private final Query updateQuery = mock(Query.class);

    private final PersistenceService service =
        new PersistenceService(repository, entityManager);

    private static final Instant SYNC_TIME =
        Instant.parse("2026-11-05T12:00:00Z");

    @BeforeEach
    void setup() {
        reset(repository, entityManager, selectQuery, updateQuery);

        when(repository.tryAcquireSyncLock()).thenReturn(true);

        when(entityManager.createNativeQuery(
            contains("SELECT last_applied_at")
        )).thenReturn(selectQuery);

        when(selectQuery.getSingleResult()).thenReturn(null);

        when(entityManager.createNativeQuery(
            contains("UPDATE cwfis_reconciliation_state")
        )).thenReturn(updateQuery);

        when(updateQuery.setParameter(
            eq("syncTime"), any(Instant.class)
        )).thenReturn(updateQuery);

        when(updateQuery.executeUpdate()).thenReturn(1);
    }

    @Test
    void rejectsNullFireList() {
        assertThrows(
            IllegalArgumentException.class,
            () -> service.reconcile(null, SYNC_TIME)
        );

        verifyNoInteractions(repository, entityManager);
    }

    @Test
    void rejectsNullSyncTime() {
        assertThrows(
            IllegalArgumentException.class,
            () -> service.reconcile(List.of(), null)
        );

        verifyNoInteractions(repository, entityManager);
    }

    @Test
    void rejectsConcurrentSynchronizationWithoutWriting() {
        when(repository.tryAcquireSyncLock()).thenReturn(false);

        assertThrows(
            CwfisIngestionException.class,
            () -> service.reconcile(List.of(), SYNC_TIME)
        );

        verify(repository, never()).saveAllAndFlush(any());
        verify(repository, never()).deactivateMissingFires(any());
        verifyNoInteractions(entityManager);
    }

    @Test
    void rejectsStaleSnapshotWithoutWriting() {
        when(selectQuery.getSingleResult())
            .thenReturn(SYNC_TIME.plusSeconds(1));

        assertThrows(
            CwfisIngestionException.class,
            () -> service.reconcile(List.of(), SYNC_TIME)
        );

        verify(repository, never()).saveAllAndFlush(any());
        verify(repository, never()).deactivateMissingFires(any());
        verify(updateQuery, never()).executeUpdate();
    }

    @Test
    void rejectsRepeatedSnapshotWithoutWriting() {
        when(selectQuery.getSingleResult())
            .thenReturn(SYNC_TIME);

        assertThrows(
            CwfisIngestionException.class,
            () -> service.reconcile(List.of(), SYNC_TIME)
        );

        verify(repository, never()).saveAllAndFlush(any());
        verify(repository, never()).deactivateMissingFires(any());
        verify(updateQuery, never()).executeUpdate();
    }

    @Test
    void acceptsNewerSnapshot() {
        when(selectQuery.getSingleResult())
            .thenReturn(SYNC_TIME.minusSeconds(60));

        assertDoesNotThrow(
            () -> service.reconcile(List.of(), SYNC_TIME)
        );

        verify(repository).deactivateMissingFires(SYNC_TIME);
        verify(updateQuery).executeUpdate();
    }

    @Test
    void persistsFiresAndDeactivatesMissingOnes() {
        FireDetection fire = new FireDetection();
        fire.setNationalFireId("FIRE-001");

        List<FireDetection> fires = List.of(fire);

        service.reconcile(fires, SYNC_TIME);

        InOrder order = inOrder(repository, updateQuery);

        order.verify(repository).saveAllAndFlush(fires);
        order.verify(repository).deactivateMissingFires(SYNC_TIME);
        order.verify(updateQuery).setParameter("syncTime", SYNC_TIME);
        order.verify(updateQuery).executeUpdate();
    }

    @Test
    void acceptsEmptyInventory() {
        assertDoesNotThrow(
            () -> service.reconcile(List.of(), SYNC_TIME)
        );

        verify(repository).saveAllAndFlush(List.of());
        verify(repository).deactivateMissingFires(SYNC_TIME);
        verify(updateQuery).executeUpdate();
    }

    @Test
    void propagatesPersistenceFailureWithoutUpdatingCheckpoint() {
        doThrow(new IllegalStateException("Database failure"))
            .when(repository)
            .deactivateMissingFires(SYNC_TIME);

        assertThrows(
            IllegalStateException.class,
            () -> service.reconcile(List.of(), SYNC_TIME)
        );

        verify(updateQuery, never()).executeUpdate();
    }

    @Test
    void propagatesSaveFailureWithoutDeactivatingFires() {
        doThrow(new IllegalStateException("Save failed"))
            .when(repository)
            .saveAllAndFlush(anyList());

        assertThrows(
            IllegalStateException.class,
            () -> service.reconcile(List.of(), SYNC_TIME)
        );

        verify(repository, never()).deactivateMissingFires(any());
        verify(updateQuery, never()).executeUpdate();
    }
}
