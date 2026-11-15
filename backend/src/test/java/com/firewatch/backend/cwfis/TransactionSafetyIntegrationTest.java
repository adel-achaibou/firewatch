package com.firewatch.backend.cwfis;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.firewatch.backend.IsolatedDatabaseTest;
import com.firewatch.backend.exceptions.CwfisIngestionException;

@SpringBootTest
class TransactionSafetyIntegrationTest
        extends IsolatedDatabaseTest {

    private static final Instant T0 =
        Instant.parse("2026-11-01T10:00:00Z");

    private static final String ID = "TX-SAFETY-FIRE";
    private static final String SECOND_ID = "TX-SAFETY-SECOND";

    @Autowired
    private Repository repository;

    @Autowired
    private PersistenceService service;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void resetDatabase() {
        removeFailureTrigger();

        jdbcTemplate.update("DELETE FROM wildfires");

        jdbcTemplate.update("""
            UPDATE cwfis_reconciliation_state
            SET last_applied_at = NULL
            WHERE id = 1
            """);

        repository.saveAndFlush(fire(ID, T0, "OC"));
        repository.saveAndFlush(fire(SECOND_ID, T0, "BH"));
    }

    @AfterEach
    void cleanup() {
        removeFailureTrigger();
    }

    @Test
    void successfulReconciliationCommitsFiresAndCheckpoint() {
        Instant updated = T0.plusSeconds(1800);

        service.reconcile(
            List.of(fire(ID, updated, "UC")),
            updated
        );

        FireDetection first = repository.findById(ID)
            .orElseThrow();

        FireDetection second = repository.findById(SECOND_ID)
            .orElseThrow();

        assertEquals(updated, first.getLastSynchedAt());
        assertEquals("UC", first.getStageOfControlStatus());
        assertTrue(first.isActive());

        assertFalse(second.isActive());

        assertEquals(updated, checkpoint());
    }

    @Test
    void rollsBackAllFireChangesWhenCheckpointUpdateFails() {
        Instant updated = T0.plusSeconds(1800);

        // Establish a real committed checkpoint first.
        service.reconcile(
            List.of(
                fire(ID, updated, "OC"),
                fire(SECOND_ID, updated, "BH")
            ),
            updated
        );

        Instant previousCheckpoint = checkpoint();
        long previousCount = repository.count();

        FireDetection beforeFirst =
            repository.findById(ID).orElseThrow();

        FireDetection beforeSecond =
            repository.findById(SECOND_ID).orElseThrow();

        assertEquals("OC", beforeFirst.getStageOfControlStatus());
        assertEquals("BH", beforeSecond.getStageOfControlStatus());

        // The trigger fails at the last SQL step of reconcile(),
        // after wildfire inserts/updates and deactivation.
        installCheckpointFailureTrigger();

        Instant next = updated.plusSeconds(1800);

        assertThrows(
            RuntimeException.class,
            () -> service.reconcile(
                List.of(fire(ID, next, "UC")),
                next
            )
        );

        // These reads happen outside the failed transaction.
        assertEquals(previousCheckpoint, checkpoint());
        assertEquals(previousCount, repository.count());

        FireDetection first = repository.findById(ID)
            .orElseThrow();

        FireDetection second = repository.findById(SECOND_ID)
            .orElseThrow();

        assertAll(
            () -> assertEquals(
                updated, first.getLastSynchedAt()
            ),
            () -> assertEquals(
                "OC", first.getStageOfControlStatus()
            ),
            () -> assertTrue(first.isActive()),
            () -> assertEquals(
                updated, second.getLastSynchedAt()
            ),
            () -> assertEquals(
                "BH", second.getStageOfControlStatus()
            ),
            () -> assertTrue(second.isActive())
        );
    }

    @Test
    void rollbackRestoresDatabaseWhenCallerTransactionFails() {
        TransactionTemplate tx =
            new TransactionTemplate(transactionManager);

        Instant updated = T0.plusSeconds(1800);

        assertThrows(
            IllegalStateException.class,
            () -> tx.executeWithoutResult(status -> {
                service.reconcile(
                    List.of(fire(ID, updated, "UC")),
                    updated
                );

                throw new IllegalStateException(
                    "forced failure after reconcile"
                );
            })
        );

        FireDetection persisted =
            repository.findById(ID).orElseThrow();

        assertEquals(T0, persisted.getLastSynchedAt());
        assertEquals("OC", persisted.getStageOfControlStatus());
        assertTrue(persisted.isActive());

        assertNull(checkpoint());
    }

    @Test
    void concurrentReconcileIsRejectedWhileAnotherTransactionHoldsLock()
            throws Exception {

        CountDownLatch locked = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);

        try (var executor = Executors.newSingleThreadExecutor()) {

            var holder = executor.submit(() -> {
                new TransactionTemplate(transactionManager)
                    .executeWithoutResult(status -> {

                        assertTrue(repository.tryAcquireSyncLock());
                        locked.countDown();

                        try {
                            if (!release.await(
                                    10, TimeUnit.SECONDS)) {
                                throw new AssertionError(
                                    "Timed out waiting to release lock"
                                );
                            }
                        } catch (InterruptedException error) {
                            Thread.currentThread().interrupt();
                            throw new RuntimeException(error);
                        }
                    });
            });

            try {
                assertTrue(
                    locked.await(10, TimeUnit.SECONDS)
                );

                Instant updated = T0.plusSeconds(1800);

                assertThrows(
                    CwfisIngestionException.class,
                    () -> service.reconcile(
                        List.of(fire(ID, updated, "UC")),
                        updated
                    )
                );

                assertEquals(
                    T0,
                    repository.findById(ID)
                        .orElseThrow()
                        .getLastSynchedAt()
                );

                assertNull(checkpoint());

            } finally {
                release.countDown();
            }

            holder.get(10, TimeUnit.SECONDS);
        }
    }

    private Instant checkpoint() {
        return jdbcTemplate.queryForObject(
            """
            SELECT last_applied_at
            FROM cwfis_reconciliation_state
            WHERE id = 1
            """,
            Instant.class
        );
    }

    private void installCheckpointFailureTrigger() {
        jdbcTemplate.execute("""
            CREATE OR REPLACE FUNCTION
                test_fail_cwfis_checkpoint()
            RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION
                    'Injected checkpoint failure';
            END;
            $$ LANGUAGE plpgsql
            """);

        jdbcTemplate.execute("""
            CREATE TRIGGER
                test_cwfis_checkpoint_failure
            BEFORE UPDATE
            ON cwfis_reconciliation_state
            FOR EACH ROW
            EXECUTE FUNCTION
                test_fail_cwfis_checkpoint()
            """);
    }

    private void removeFailureTrigger() {
        jdbcTemplate.execute("""
            DROP TRIGGER IF EXISTS
                test_cwfis_checkpoint_failure
            ON cwfis_reconciliation_state
            """);

        jdbcTemplate.execute("""
            DROP FUNCTION IF EXISTS
                test_fail_cwfis_checkpoint()
            """);
    }

    private FireDetection fire(
            String id,
            Instant at,
            String status) {

        FireDetection fire = new FireDetection();

        fire.setNationalFireId(id);
        fire.setAgencyFireId(id);
        fire.setAgencyCode("QC");

        fire.setLatitude(BigDecimal.valueOf(46));
        fire.setLongitude(BigDecimal.valueOf(-72));

        var point = new GeometryFactory()
            .createPoint(new Coordinate(-72, 46));

        point.setSRID(4326);
        fire.setLocation(point);

        fire.setStageOfControlStatus(status);
        fire.setRecordStart(T0.minusSeconds(86400));
        fire.setRecordEnd(at.plusSeconds(86400));
        fire.setLastSynchedAt(at);
        fire.setActive(true);

        return fire;
    }
}
