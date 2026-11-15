package com.firewatch.backend;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Every Spring context integration test MUST extend this class.
 * Never fall back to the developer's DB_URL / DB_NAME from .env.
 * Docker is required: when unavailable, tests fail without touching the local database.
 */
public abstract class IsolatedDatabaseTest {

    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>(
                    DockerImageName.parse("postgis/postgis:18-3.6")
                        .asCompatibleSubstituteFor("postgres"))
                        .withDatabaseName("firewatch_integration_test")
                        .withUsername("firewatch_test")
                        .withPassword("firewatch_test_password");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void isolatedDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.task.scheduling.enabled", () -> "false");
        registry.add("cwfis.sync-delay-ms", () -> "86400000");
        registry.add("cwfis.sync-initial-delay-ms", () -> "86400000");   // never auto-sync during tests
        registry.add("logging.journal-delay-ms", () -> "86400000");
        registry.add("app.logging.import-delay-ms", () -> "86400000");
        registry.add("app.cors.allowed-origin", () -> "http://localhost:3000");
        registry.add("CORS_ALLOWED_ORIGIN", () -> "http://localhost:3000");
    }
}
