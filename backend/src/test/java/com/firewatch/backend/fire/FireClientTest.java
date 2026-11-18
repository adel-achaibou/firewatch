package com.firewatch.backend.fire;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.IntFunction;
import java.util.stream.Collectors;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import com.firewatch.backend.exceptions.FireFetchException;
import com.firewatch.backend.fire.dto.requests.FireParseResult;
import com.sun.net.httpserver.HttpServer;

class FireClientTest {

    private static final Instant SYNC_TIME =
        Instant.parse("2026-11-05T12:00:00Z");

    private HttpServer server;
    private FireClient client;
    private JsonParser parser;

    private final AtomicInteger requests = new AtomicInteger();

    @BeforeEach
    void setup() throws IOException {
        parser = mock(JsonParser.class);

        server = HttpServer.create(
            new InetSocketAddress("127.0.0.1", 0),
            0
        );

        server.setExecutor(
            Executors.newVirtualThreadPerTaskExecutor()
        );

        server.start();

        client = createClient(
            Duration.ofSeconds(2),
            Duration.ofSeconds(2)
        );
    }

    @AfterEach
    void cleanup() {
        if (server != null) {
            server.stop(0);
        }
    }

    private FireClient createClient(
            Duration connectTimeout,
            Duration readTimeout) {

        String baseUrl = "http://127.0.0.1:"
            + server.getAddress().getPort()
            + "/wfs";

        return new FireClient(
            RestClient.builder(),
            parser,
            baseUrl,
            connectTimeout,
            readTimeout
        );
    }

    private void respond(int status, String body) {
        respondWith(attempt -> status, body);
    }

    private void respondWith(
            IntFunction<Integer> statusForAttempt,
            String body) {

        server.createContext("/wfs", exchange -> {
            int attempt = requests.incrementAndGet();
            int status = statusForAttempt.apply(attempt);

            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);

            exchange.getResponseHeaders().set(
                "Content-Type", "application/json"
            );

            exchange.sendResponseHeaders(status, bytes.length);

            try (var output = exchange.getResponseBody()) {
                output.write(bytes);
            }
        });
    }

    private Map<String, String> decodeQuery(String rawQuery) {
        assertNotNull(rawQuery);

        return Arrays.stream(rawQuery.split("&"))
            .map(part -> part.split("=", 2))
            .collect(Collectors.toMap(
                part -> URLDecoder.decode(
                    part[0], StandardCharsets.UTF_8
                ),
                part -> URLDecoder.decode(
                    part.length == 2 ? part[1] : "",
                    StandardCharsets.UTF_8
                )
            ));
    }

    @Test
    void fetchesRawJsonSuccessfully() {
        respond(200, "{\"features\":[]}");

        assertEquals(
            "{\"features\":[]}",
            client.fetchRawDetections(SYNC_TIME)
        );

        assertEquals(1, requests.get());
    }

    @Test
    void buildsExactWfsRequest() {
        AtomicReference<Map<String, String>> capturedQuery =
            new AtomicReference<>();

        AtomicReference<String> capturedMethod =
            new AtomicReference<>();

        server.createContext("/wfs", exchange -> {
            requests.incrementAndGet();

            capturedMethod.set(exchange.getRequestMethod());

            capturedQuery.set(
                decodeQuery(exchange.getRequestURI().getRawQuery())
            );

            byte[] bytes = "{}".getBytes(StandardCharsets.UTF_8);

            exchange.sendResponseHeaders(200, bytes.length);

            try (var output = exchange.getResponseBody()) {
                output.write(bytes);
            }
        });

        assertEquals("{}", client.fetchRawDetections(SYNC_TIME));
        assertEquals(1, requests.get());
        assertEquals("GET", capturedMethod.get());

        Map<String, String> query = capturedQuery.get();

        assertNotNull(query);
        assertEquals(6, query.size());

        assertEquals("WFS", query.get("service"));
        assertEquals("2.0.0", query.get("version"));
        assertEquals("GetFeature", query.get("request"));

        assertEquals(
            "public:cwfif_national_activefires",
            query.get("typeNames")
        );

        assertEquals(
            "application/json",
            query.get("outputFormat")
        );

        assertEquals(
            "record_start <= '2026-11-05T12:00:00Z' "
                + "AND record_end > '2026-11-05T12:00:00Z'",
            query.get("cql_filter")
        );
    }

    @Test
    void usesProvidedTimestampInBothCqlConditions() {
        Instant anotherTime =
            Instant.parse("2026-07-01T08:15:30Z");

        AtomicReference<String> capturedFilter =
            new AtomicReference<>();

        server.createContext("/wfs", exchange -> {
            requests.incrementAndGet();

            Map<String, String> query = decodeQuery(
                exchange.getRequestURI().getRawQuery()
            );

            capturedFilter.set(query.get("cql_filter"));

            byte[] bytes = "{}".getBytes(StandardCharsets.UTF_8);

            exchange.sendResponseHeaders(200, bytes.length);

            try (var output = exchange.getResponseBody()) {
                output.write(bytes);
            }
        });

        assertEquals("{}", client.fetchRawDetections(anotherTime));

        assertEquals(
            "record_start <= '2026-07-01T08:15:30Z' "
                + "AND record_end > '2026-07-01T08:15:30Z'",
            capturedFilter.get()
        );

        assertEquals(1, requests.get());
    }

    @Test
    void parsesSuccessfulResponse() {
        String json = "{\"features\":[]}";
        respond(200, json);

        FireParseResult expected =
            new FireParseResult(List.of(), 0, 0, 0, 0);

        when(parser.parse(json)).thenReturn(expected);

        assertSame(expected, client.fetchDetections(SYNC_TIME));

        verify(parser).parse(json);
        verifyNoMoreInteractions(parser);
    }

    @Test
    void rejectsBlankHttpResponse() {
        respond(200, "   ");

        assertThrows(
            FireFetchException.class,
            () -> client.fetchDetections(SYNC_TIME)
        );

        verifyNoInteractions(parser);
        assertEquals(1, requests.get());
    }

    @Test
    void rejectsHttp404WithoutRetry() {
        respond(404, "Not found");

        assertThrows(
            FireFetchException.class,
            () -> client.fetchRawDetections(SYNC_TIME)
        );

        assertEquals(1, requests.get());
    }

    @Test
    void rejectsHttp400WithoutRetry() {
        respond(400, "Bad request");

        assertThrows(
            FireFetchException.class,
            () -> client.fetchRawDetections(SYNC_TIME)
        );

        assertEquals(1, requests.get());
    }

    @Test
    void retriesTemporaryServerFailure() {
        respondWith(
            attempt -> attempt == 1 ? 503 : 200,
            "{}"
        );

        assertEquals(
            "{}",
            client.fetchRawDetections(SYNC_TIME)
        );

        assertEquals(2, requests.get());
    }

    @Test
    void failsAfterRetryAttemptsAreExhausted() {
        respond(500, "Server error");

        FireFetchException error = assertThrows(
            FireFetchException.class,
            () -> client.fetchRawDetections(SYNC_TIME)
        );

        assertEquals(
            "Failed to fetch data from CWFIS",
            error.getMessage()
        );

        assertNotNull(error.getCause());
        assertEquals(3, requests.get());
    }

    @Test
    void retriesWhenServerExceedsReadTimeout() {
        client = createClient(
            Duration.ofSeconds(2),
            Duration.ofMillis(150)
        );

        CountDownLatch requestsObserved =
            new CountDownLatch(3);

        CountDownLatch releaseResponses =
            new CountDownLatch(1);

        server.createContext("/wfs", exchange -> {
            requests.incrementAndGet();
            requestsObserved.countDown();

            try {
                releaseResponses.await(
                    10, TimeUnit.SECONDS
                );
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });

        try {
            FireFetchException error = assertThrows(
                FireFetchException.class,
                () -> client.fetchRawDetections(SYNC_TIME)
            );

            assertEquals(
                "Failed to fetch data from CWFIS",
                error.getMessage()
            );

            assertNotNull(error.getCause());

            assertTrue(
                requestsObserved.await(
                    5, TimeUnit.SECONDS
                ),
                "Expected three HTTP attempts after read timeouts"
            );

            assertEquals(3, requests.get());

        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            fail("Interrupted while awaiting HTTP attempts");

        } finally {
            releaseResponses.countDown();
        }
    }

    @Test
    void succeedsWhenResponseArrivesBeforeReadTimeout() {
        client = createClient(
            Duration.ofSeconds(2),
            Duration.ofSeconds(2)
        );

        server.createContext("/wfs", exchange -> {
            requests.incrementAndGet();

            try {
                Thread.sleep(100);

                byte[] bytes =
                    "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);

                exchange.getResponseHeaders().set(
                    "Content-Type",
                    "application/json"
                );

                exchange.sendResponseHeaders(200, bytes.length);

                try (var output = exchange.getResponseBody()) {
                    output.write(bytes);
                }

            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
            }
        });

        assertEquals(
            "{\"ok\":true}",
            client.fetchRawDetections(SYNC_TIME)
        );

        assertEquals(1, requests.get());
    }

    @Test
    void propagatesParserFailure() {
        String json = "{\"invalid\":true}";
        respond(200, json);

        IllegalArgumentException original =
            new IllegalArgumentException("Invalid JSON");

        when(parser.parse(json)).thenThrow(original);

        IllegalArgumentException actual = assertThrows(
            IllegalArgumentException.class,
            () -> client.fetchDetections(SYNC_TIME)
        );

        assertSame(original, actual);
        verify(parser).parse(json);
    }
}
