package com.firewatch.backend.fire.synchronization;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.firewatch.backend.fire.synchronization.dto.SyncOverview;
import com.firewatch.backend.fire.synchronization.dto.SyncResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/cwfis/sync")
@RequiredArgsConstructor
public class SyncController {
    private final SyncService service;

    @GetMapping("/last-success")
    public ResponseEntity<SyncResponse> lastSuccess() {
        SyncModel sync = service.getLastSuccess();
        if (sync == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(SyncResponse.from(sync));
    }

    @GetMapping("/status")
    public SyncOverview status() {
        return service.getOverview();
    }
}
