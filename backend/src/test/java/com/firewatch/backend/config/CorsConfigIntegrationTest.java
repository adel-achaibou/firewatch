package com.firewatch.backend.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.firewatch.backend.IsolatedDatabaseTest;

@SpringBootTest
class CorsConfigIntegrationTest extends IsolatedDatabaseTest {

    private static final String ALLOWED_ORIGIN =
        "http://localhost:3000";

    private static final String FORBIDDEN_ORIGIN =
        "https://untrusted.example.com";

    private static final String ENDPOINT =
        "/api/v1/fires";

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
            .webAppContextSetup(context)
            .build();
    }

    @Test
    void allowsGetPreflightFromConfiguredOrigin() throws Exception {
        mockMvc.perform(options(ENDPOINT)
                .header("Origin", ALLOWED_ORIGIN)
                .header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isOk())
            .andExpect(header().string(
                "Access-Control-Allow-Origin",
                ALLOWED_ORIGIN
            ))
            .andExpect(header().string(
                "Access-Control-Allow-Methods",
                org.hamcrest.Matchers.containsString("GET")
            ));
    }

    @Test
    void allowsHeadPreflightFromConfiguredOrigin() throws Exception {
        mockMvc.perform(options(ENDPOINT)
                .header("Origin", ALLOWED_ORIGIN)
                .header("Access-Control-Request-Method", "HEAD"))
            .andExpect(status().isOk())
            .andExpect(header().string(
                "Access-Control-Allow-Origin",
                ALLOWED_ORIGIN
            ));
    }

    @Test
    void rejectsPreflightFromUnauthorizedOrigin() throws Exception {
        mockMvc.perform(options(ENDPOINT)
                .header("Origin", FORBIDDEN_ORIGIN)
                .header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isForbidden())
            .andExpect(header().doesNotExist(
                "Access-Control-Allow-Origin"
            ));
    }

    @Test
    void rejectsPostPreflight() throws Exception {
        mockMvc.perform(options(ENDPOINT)
                .header("Origin", ALLOWED_ORIGIN)
                .header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isForbidden())
            .andExpect(header().doesNotExist(
                "Access-Control-Allow-Origin"
            ));
    }

    @Test
    void allowsConfiguredContentTypeHeader() throws Exception {
        mockMvc.perform(options(ENDPOINT)
                .header("Origin", ALLOWED_ORIGIN)
                .header("Access-Control-Request-Method", "GET")
                .header(
                    "Access-Control-Request-Headers",
                    "Content-Type"
                ))
            .andExpect(status().isOk())
            .andExpect(header().string(
                "Access-Control-Allow-Origin",
                ALLOWED_ORIGIN
            ))
            .andExpect(header().string(
                "Access-Control-Allow-Headers",
                org.hamcrest.Matchers.containsString("Content-Type")
            ));
    }

    @Test
    void rejectsUnauthorizedCustomHeader() throws Exception {
        mockMvc.perform(options(ENDPOINT)
                .header("Origin", ALLOWED_ORIGIN)
                .header("Access-Control-Request-Method", "GET")
                .header(
                    "Access-Control-Request-Headers",
                    "X-Unauthorized-Header"
                ))
            .andExpect(status().isForbidden())
            .andExpect(header().doesNotExist(
                "Access-Control-Allow-Origin"
            ));
    }

    @Test
    void doesNotApplyApiCorsPolicyOutsideApiPaths() throws Exception {
        mockMvc.perform(options("/actuator/health")
                .header("Origin", ALLOWED_ORIGIN)
                .header("Access-Control-Request-Method", "GET"))
            .andExpect(header().doesNotExist(
                "Access-Control-Allow-Origin"
            ));
    }
}
