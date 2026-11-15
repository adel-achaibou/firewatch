package com.firewatch.backend.cwfis;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface Repository extends JpaRepository<FireDetection, String> {

    List<FireDetection> findAllByIsActiveTrue();

    @Query(value = "SELECT pg_try_advisory_xact_lock(20261105, 1)", nativeQuery = true)
    boolean tryAcquireSyncLock();

    @Modifying
    @Query(value = """
        UPDATE wildfires SET is_active = false WHERE is_active = true AND last_synched_at < :syncTime""", nativeQuery = true)
    int deactivateMissingFires(@Param("syncTime") Instant syncTime);
}
