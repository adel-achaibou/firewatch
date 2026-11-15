package com.firewatch.backend.cwfis;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import com.firewatch.backend.cwfis.synchronization.SyncModel;
import com.firewatch.backend.cwfis.synchronization.SyncRecovery;
import com.firewatch.backend.cwfis.synchronization.SyncService;

class SchedulerTest {

    private final CwfisService cwfisService =
        mock(CwfisService.class);

    private final SyncService syncService =
        mock(SyncService.class);

    private final SyncRecovery recovery =
        mock(SyncRecovery.class);

    private final Scheduler scheduler =
        new Scheduler(
            cwfisService,
            syncService,
            recovery
        );

    @BeforeEach
    void ready() {
        when(recovery.isRecoveryCompleted()).thenReturn(true);

        SyncModel status = new SyncModel();
        status.setId(42L);

        when(syncService.startSync()).thenReturn(status);
    }

    @Test
    void skipsSynchronizationUntilRecoveryFinishes() {
        when(recovery.isRecoveryCompleted()).thenReturn(false);

        scheduler.callSaveDetection();

        verify(recovery).isRecoveryCompleted();
        verifyNoInteractions(cwfisService, syncService);
    }

    @Test
    void startsOnlyAfterRecoveryBecomesCompleted() {
        when(recovery.isRecoveryCompleted())
            .thenReturn(false, false, true);

        scheduler.callSaveDetection();
        scheduler.callSaveDetection();

        verifyNoInteractions(cwfisService, syncService);

        scheduler.callSaveDetection();

        InOrder order = inOrder(
            recovery,
            syncService,
            cwfisService
        );

        order.verify(recovery, times(3))
            .isRecoveryCompleted();

        order.verify(syncService).startSync();
        order.verify(cwfisService).saveDetection();
        order.verify(syncService).completedSync(42L);

        order.verifyNoMoreInteractions();
    }

    @Test
    void marksSuccessfulSynchronizationInCorrectOrder() {
        scheduler.callSaveDetection();

        InOrder order = inOrder(
            recovery,
            syncService,
            cwfisService
        );

        order.verify(recovery).isRecoveryCompleted();
        order.verify(syncService).startSync();
        order.verify(cwfisService).saveDetection();
        order.verify(syncService).completedSync(42L);

        order.verifyNoMoreInteractions();

        verify(syncService, never())
            .failedSync(anyLong(), any());
    }

    @Test
    void recordsIngestionFailureWithoutMarkingSuccess() {
        RuntimeException failure =
            new RuntimeException("upstream unavailable");

        doThrow(failure)
            .when(cwfisService)
            .saveDetection();

        scheduler.callSaveDetection();

        InOrder order = inOrder(
            syncService,
            cwfisService
        );

        order.verify(syncService).startSync();
        order.verify(cwfisService).saveDetection();
        order.verify(syncService).failedSync(42L, failure);

        order.verifyNoMoreInteractions();

        verify(syncService, never())
            .completedSync(anyLong());
    }

    @Test
    void recordsCompletionFailure() {
        RuntimeException failure =
            new RuntimeException("completion unavailable");

        doThrow(failure)
            .when(syncService)
            .completedSync(42L);

        scheduler.callSaveDetection();

        InOrder order = inOrder(
            syncService,
            cwfisService
        );

        order.verify(syncService).startSync();
        order.verify(cwfisService).saveDetection();
        order.verify(syncService).completedSync(42L);
        order.verify(syncService).failedSync(42L, failure);

        order.verifyNoMoreInteractions();
    }

    @Test
    void doesNotRunIngestionWhenStartSyncFails() {
        RuntimeException failure =
            new RuntimeException("database unavailable");

        when(syncService.startSync()).thenThrow(failure);

        assertDoesNotThrow(scheduler::callSaveDetection);

        verify(syncService).startSync();
        verifyNoInteractions(cwfisService);

        verify(syncService, never())
            .completedSync(anyLong());

        verify(syncService, never())
            .failedSync(anyLong(), any());
    }

    @Test
    void handlesFailureWhenRecordingSyncFailureFails() {
        RuntimeException ingestionFailure =
            new RuntimeException("CWFIS unavailable");

        RuntimeException statusFailure =
            new RuntimeException("database unavailable");

        doThrow(ingestionFailure)
            .when(cwfisService)
            .saveDetection();

        doThrow(statusFailure)
            .when(syncService)
            .failedSync(42L, ingestionFailure);

        assertDoesNotThrow(scheduler::callSaveDetection);

        InOrder order = inOrder(
            syncService,
            cwfisService
        );

        order.verify(syncService).startSync();
        order.verify(cwfisService).saveDetection();
        order.verify(syncService)
            .failedSync(42L, ingestionFailure);

        order.verifyNoMoreInteractions();

        verify(syncService, never())
            .completedSync(anyLong());
    }
}
