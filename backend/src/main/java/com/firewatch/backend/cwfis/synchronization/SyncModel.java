package com.firewatch.backend.cwfis.synchronization;

import java.time.Instant;

import com.firewatch.backend.cwfis.synchronization.dto.SyncStatusType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@NoArgsConstructor
@Getter
@Setter
@Table(name = "cwfis_sync_status")
public class SyncModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "duration_seconds")
    private Double durationSeconds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SyncStatusType status;

    @Column(name = "error_message")
    private String errorMessage;
}
