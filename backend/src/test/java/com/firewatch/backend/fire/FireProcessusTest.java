package com.firewatch.backend.fire;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestClient;

import com.firewatch.backend.IsolatedDatabaseTest;
import com.firewatch.backend.exceptions.FireIngestionException;
import com.firewatch.backend.fire.dto.mappers.FireResponseMapper;
import com.sun.net.httpserver.HttpServer;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
class FireProcessusTest extends IsolatedDatabaseTest {

    private static final String FIRE_A = "PIPELINE-QC-001";
    private static final String FIRE_B = "PIPELINE-ON-002";

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private FireFiltering filtering;

    @Autowired
    private FireMapper mapper;

    @Autowired
    private FireRepository repository;

    @Autowired
    private PersistenceService persistenceService;

    @Autowired
    private FireResponseMapper responseMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private HttpServer server;
    private FireService service;

    private final AtomicReference<String> response =
        new AtomicReference<>();

    private final AtomicInteger requestCount =
        new AtomicInteger();

    @BeforeEach
    void setUp() throws IOException {
        // This test deliberately commits real transactions.
        // Reset the shared Testcontainers database beforehand.
        jdbcTemplate.update("DELETE FROM wildfires");
        jdbcTemplate.update("""
            UPDATE cwfis_reconciliation_state
            SET last_applied_at = NULL
            WHERE id = 1
            """);

        requestCount.set(0);

        server = HttpServer.create(
            new InetSocketAddress("127.0.0.1", 0),
            0
        );

        server.createContext("/wfs", exchange -> {
            requestCount.incrementAndGet();

            byte[] body = response.get()
                .getBytes(StandardCharsets.UTF_8);

            exchange.getResponseHeaders().set(
                "Content-Type",
                "application/json"
            );

            exchange.sendResponseHeaders(200, body.length);

            try (var output = exchange.getResponseBody()) {
                output.write(body);
            }
        });

        server.start();

        String url = "http://127.0.0.1:"
            + server.getAddress().getPort()
            + "/wfs";

        JsonParser parser = new JsonParser(objectMapper);

        FireClient client = new FireClient(
            RestClient.builder(),
            parser,
            url,
            Duration.ofSeconds(2),
            Duration.ofSeconds(2)
        );

        // Only the HTTP server is simulated.
        // All ingestion and persistence components are real.
        service = new FireService(
            client,
            filtering,
            repository,
            persistenceService,
            mapper,
            responseMapper
        );

        response.set(snapshot(
            fire(FIRE_A, "QC", "OC", "120.5"),
            fire(FIRE_B, "ON", "UC", "80.0")
        ));
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void ingestsRealHttpJsonIntoPostgis() {
        service.saveDetection();

        List<Fire> active =
            repository.findAllByIsActiveTrue();

        assertEquals(2, active.size());
        assertEquals(1, requestCount.get());

        Fire qc = repository.findById(FIRE_A)
            .orElseThrow();

        assertEquals("QC", qc.getAgencyCode());
        assertEquals("OC", qc.getStageOfControlStatus());
        assertEquals(
            0,
            new BigDecimal("120.5")
                .compareTo(qc.getFireSize())
        );
        assertTrue(qc.isActive());

        assertEquals(
            0,
            new BigDecimal("46.5")
                .compareTo(qc.getLatitude())
        );

        assertEquals(
            0,
            new BigDecimal("-72.5")
                .compareTo(qc.getLongitude())
        );

        assertNotNull(qc.getLocation());
        assertEquals(4326, qc.getLocation().getSRID());
        assertEquals(
            -72.5,
            qc.getLocation().getX(),
            0.000001
        );
        assertEquals(
            46.5,
            qc.getLocation().getY(),
            0.000001
        );

        assertNotNull(checkpoint());
    }

    @Test
    void updatesExistingFireAndDeactivatesMissingFire() {
        service.saveDetection();

        Instant firstCheckpoint = checkpoint();

        response.set(snapshot(
            fire(FIRE_A, "QC", "BH", "250.0")
        ));

        service.saveDetection();

        Fire updated = repository.findById(FIRE_A)
            .orElseThrow();

        Fire missing = repository.findById(FIRE_B)
            .orElseThrow();

        assertEquals("BH", updated.getStageOfControlStatus());
        assertEquals(
            0,
            new BigDecimal("250.0")
                .compareTo(updated.getFireSize())
        );

        assertTrue(updated.isActive());
        assertFalse(missing.isActive());

        assertEquals(1, repository.findAllByIsActiveTrue().size());
        assertEquals(2, requestCount.get());
        assertTrue(checkpoint().isAfter(firstCheckpoint));
    }

    @Test
    void rejectsIncompleteSnapshotWithoutChangingDatabase() {
        service.saveDetection();

        Instant previousCheckpoint = checkpoint();
        long previousCount = repository.count();

        // Two features, but metadata declares three.
        response.set("""
            {
              "type": "FeatureCollection",
              "numberMatched": 3,
              "numberReturned": 3,
              "totalFeatures": 3,
              "features": [
                %s,
                %s
              ]
            }
            """.formatted(
                fire(FIRE_A, "QC", "BH", "999"),
                fire(FIRE_B, "ON", "UC", "999")
            ));

        assertThrows(
            FireIngestionException.class,
            () -> service.saveDetection()
        );

        assertEquals(previousCount, repository.count());
        assertEquals(previousCheckpoint, checkpoint());

        Fire unchanged = repository.findById(FIRE_A)
            .orElseThrow();

        assertEquals("OC", unchanged.getStageOfControlStatus());
        assertEquals(
            0,
            new BigDecimal("120.5")
                .compareTo(unchanged.getFireSize())
        );

        assertTrue(repository.findById(FIRE_B)
            .orElseThrow().isActive());
    }

    @Test
    void rejectsMalformedRecordWithoutChangingDatabase() {
        service.saveDetection();

        Instant previousCheckpoint = checkpoint();

        response.set("""
            {
              "type": "FeatureCollection",
              "numberMatched": 2,
              "numberReturned": 2,
              "totalFeatures": 2,
              "features": [
                %s,
                {
                  "type": "Feature",
                  "properties": null
                }
              ]
            }
            """.formatted(
                fire(FIRE_A, "QC", "BH", "999")
            ));

        assertThrows(
            FireIngestionException.class,
            () -> service.saveDetection()
        );

        assertEquals(previousCheckpoint, checkpoint());
        assertEquals(2, repository.count());

        Fire unchanged = repository.findById(FIRE_A)
            .orElseThrow();

        assertEquals("OC", unchanged.getStageOfControlStatus());
        assertTrue(unchanged.isActive());

        assertTrue(repository.findById(FIRE_B)
            .orElseThrow().isActive());
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

    private String snapshot(String... features) {
        String joined = String.join(",", features);
        int count = features.length;

        return """
            {
              "type": "FeatureCollection",
              "numberMatched": %d,
              "numberReturned": %d,
              "totalFeatures": %d,
              "features": [%s]
            }
            """.formatted(count, count, count, joined);
    }

    private String fire(
            String id,
            String agency,
            String status,
            String size) {

        return """
            {
              "type": "Feature",
              "properties": {
                "national_fire_id": "%s",
                "agency_fire_id": "%s",
                "agency_code": "%s",
                "region_code": "01",
                "latitude": 46.5,
                "longitude": -72.5,
                "stage_of_control_status": "%s",
                "fire_size": %s,
                "national_fire_cause": "L",
                "percent_contained": 25,
                "status_date": "2026-11-13T12:00:00Z",
                "record_start": "2020-01-01T00:00:00Z",
                "record_end": "2099-01-01T00:00:00Z"
              }
            }
            """.formatted(
                id,
                id,
                agency,
                status,
                size
            );
    }
}
