package com.firewatch.backend.cwfis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.firewatch.backend.IsolatedDatabaseTest;
import com.firewatch.backend.exceptions.CwfisIngestionException;

import jakarta.persistence.EntityManager;

@SpringBootTest
@Transactional
class ReconciliationIntegrationTest extends IsolatedDatabaseTest {

    private static final Instant T0 =
        Instant.parse("2026-11-01T10:00:00Z");

    private static final String MISSING = "RECON-MISSING";

    @Autowired
    Repository repository;

    @Autowired
    PersistenceService service;

    @Autowired
    EntityManager em;

    @BeforeEach
    void seed() {
        em.createNativeQuery("""
                UPDATE cwfis_reconciliation_state
                SET last_applied_at = :checkpoint
                WHERE id = 1
                """)
            .setParameter("checkpoint", T0.minusSeconds(1))
            .executeUpdate();

        List<FireDetection> fires = new ArrayList<>();

        fires.add(fire(MISSING, T0));

        for (int i = 0; i < 4; i++) {
            fires.add(fire("RECON-PRESENT-" + i, T0));
        }

        repository.saveAllAndFlush(fires);
        em.clear();
    }

    @Test
    void deactivatesMissingFireImmediately() {
        reconcileWithoutMissing(T0.plusSeconds(1800));

        assertActive(MISSING, false);

        for (int i = 0; i < 4; i++) {
            assertActive("RECON-PRESENT-" + i, true);
        }
    }

    @Test
    void keepsPresentFiresActiveAcrossSynchronizations() {
        reconcileWithoutMissing(T0.plusSeconds(1800));
        reconcileWithoutMissing(T0.plusSeconds(3600));

        assertActive(MISSING, false);

        for (int i = 0; i < 4; i++) {
            assertActive("RECON-PRESENT-" + i, true);
        }
    }

    @Test
    void reactivatesFireWhenItReappears() {
        reconcileWithoutMissing(T0.plusSeconds(1800));
        assertActive(MISSING, false);

        Instant returnedAt = T0.plusSeconds(3600);

        List<FireDetection> all =
            new ArrayList<>(presentFires(returnedAt));

        all.add(fire(MISSING, returnedAt));

        service.reconcile(all, returnedAt);

        assertActive(MISSING, true);
    }

    @Test
    void deactivatesFireAgainAfterReappearance() {
        reconcileWithoutMissing(T0.plusSeconds(1800));

        Instant returnedAt = T0.plusSeconds(3600);

        List<FireDetection> all =
            new ArrayList<>(presentFires(returnedAt));

        all.add(fire(MISSING, returnedAt));

        service.reconcile(all, returnedAt);
        assertActive(MISSING, true);

        reconcileWithoutMissing(T0.plusSeconds(5400));
        assertActive(MISSING, false);
    }

    @Test
    void deactivatesAllFiresWhenInventoryIsEmpty() {
        service.reconcile(List.of(), T0.plusSeconds(1800));

        em.flush();
        em.clear();

        assertActive(MISSING, false);

        for (int i = 0; i < 4; i++) {
            assertActive("RECON-PRESENT-" + i, false);
        }
    }

    @Test
    void staleSnapshotIsRejectedWithoutChangingRows() {
        reconcileWithoutMissing(T0.plusSeconds(1800));
        assertActive(MISSING, false);

        assertThrows(
            CwfisIngestionException.class,
            () -> reconcileWithoutMissing(T0.plusSeconds(1200))
        );

        assertActive(MISSING, false);
    }

    @Test
    void repeatedSnapshotIsRejectedWithoutChangingRows() {
        Instant at = T0.plusSeconds(1800);

        reconcileWithoutMissing(at);
        assertActive(MISSING, false);

        assertThrows(
            CwfisIngestionException.class,
            () -> reconcileWithoutMissing(at)
        );

        assertActive(MISSING, false);
    }

    private void reconcileWithoutMissing(Instant at) {
        service.reconcile(presentFires(at), at);

        em.flush();
        em.clear();
    }

    private List<FireDetection> presentFires(Instant at) {
        List<FireDetection> fires = new ArrayList<>();

        for (int i = 0; i < 4; i++) {
            fires.add(fire("RECON-PRESENT-" + i, at));
        }

        return fires;
    }

    private void assertActive(String id, boolean expected) {
        em.flush();
        em.clear();

        FireDetection saved = repository.findById(id).orElseThrow();

        assertEquals(expected, saved.isActive());
    }

    private FireDetection fire(String id, Instant at) {
        FireDetection f = new FireDetection();

        f.setNationalFireId(id);
        f.setAgencyFireId(id);
        f.setAgencyCode("QC");

        f.setLatitude(BigDecimal.valueOf(46));
        f.setLongitude(BigDecimal.valueOf(-72));

        var point = new GeometryFactory()
            .createPoint(new Coordinate(-72, 46));

        point.setSRID(4326);
        f.setLocation(point);

        f.setStageOfControlStatus("OC");
        f.setRecordStart(T0.minusSeconds(86400));
        f.setRecordEnd(at.plusSeconds(86400));
        f.setLastSynchedAt(at);

        f.setActive(true);

        return f;
    }
}
