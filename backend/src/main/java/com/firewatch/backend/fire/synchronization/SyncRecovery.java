package com.firewatch.backend.fire.synchronization;

import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SyncRecovery {

    private final SyncService service;
    private final AtomicBoolean recoveryCompleted = new AtomicBoolean(false);

    @EventListener(ApplicationReadyEvent.class)
    public void recover() {
        service.interruptAbandonedSyncs();
        recoveryCompleted.set(true);
    }

    public boolean isRecoveryCompleted() {
        return recoveryCompleted.get();
    }
}
