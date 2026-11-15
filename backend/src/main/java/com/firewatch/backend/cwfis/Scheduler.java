package com.firewatch.backend.cwfis;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.firewatch.backend.cwfis.synchronization.SyncModel;
import com.firewatch.backend.cwfis.synchronization.SyncRecovery;
import com.firewatch.backend.cwfis.synchronization.SyncService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class Scheduler {

    private static final Logger logger = LoggerFactory.getLogger(Scheduler.class);

    private final CwfisService cwfisService;
    private final SyncService syncService;
    private final SyncRecovery recovery;

    // First run 10 s after startup (recovery is done by then), then every sync-delay-ms
    @Scheduled(initialDelayString = "${cwfis.sync-initial-delay-ms:10000}",fixedDelayString = "${cwfis.sync-delay-ms}")

    public void callSaveDetection() {

        if (!recovery.isRecoveryCompleted()) {
            logger.info("CWFIS synchronization skipped: recovery not completed");
            return;
        }

        SyncModel sync;

        try {
            sync = syncService.startSync();
        } 
        catch (Exception error) {
            logger.error("Unable to start CWFIS synchronization", error);
            return;
        }

        try {
            cwfisService.saveDetection();
            syncService.completedSync(sync.getId());

            logger.info(
                "CWFIS synchronization completed successfully, id={}",
                sync.getId()
            );

        } 
        catch (Exception error) {
            logger.error("CWFIS synchronization failed, id={}", sync.getId(), error);

            try {
                syncService.failedSync(sync.getId(), error);
            } 
            catch (Exception statusError) {
                logger.error("Unable to record CWFIS synchronization failure, id={}", sync.getId(), statusError);
            }
        }
    }
}

