package com.firewatch.backend.fire.synchronization;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.firewatch.backend.fire.synchronization.dto.SyncStatusType;

public interface SyncRepository extends JpaRepository<SyncModel, Long> {
    List<SyncModel> findAllByStatus(SyncStatusType status);
    Optional<SyncModel> findFirstByStatusOrderByCompletedAtDesc(SyncStatusType status);
    Optional<SyncModel> findFirstByOrderByStartedAtDescIdDesc();
}
