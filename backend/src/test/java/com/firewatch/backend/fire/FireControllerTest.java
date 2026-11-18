package com.firewatch.backend.fire;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.firewatch.backend.exceptions.FireNotFoundException;
import com.firewatch.backend.exceptions.GlobalExceptionHandler;
import com.firewatch.backend.fire.dto.responses.FireResponse;

class FireControllerTest {

    private FireService service;
    private MockMvc mockMvc;

    private static final String BASE_URL = "/api/v1/fires";

    @BeforeEach
    void setUp() {
        service = mock(FireService.class);

        mockMvc = MockMvcBuilders
            .standaloneSetup(new FireController(service))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    private FireResponse createFire() {
        return new FireResponse(
            "FIRE-001",
            "QC",
            new BigDecimal("50.123"),
            new BigDecimal("-72.456"),
            "OC",
            new BigDecimal("120.5"),
            "L",
            new BigDecimal("15"),
            Instant.parse("2026-11-01T12:00:00Z")
        );
    }

    @Test
    void returnsFireByIdWithCorrectJson() throws Exception {
        when(service.getDetectionByNationalFireId("FIRE-001"))
            .thenReturn(createFire());

        mockMvc.perform(get(BASE_URL + "/FIRE-001"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(
                MediaType.APPLICATION_JSON
            ))
            .andExpect(jsonPath("$.nationalFireId").value("FIRE-001"))
            .andExpect(jsonPath("$.agencyCode").value("QC"))
            .andExpect(jsonPath("$.latitude").value(50.123))
            .andExpect(jsonPath("$.longitude").value(-72.456))
            .andExpect(jsonPath("$.stageOfControlStatus").value("OC"))
            .andExpect(jsonPath("$.fireSize").value(120.5))
            .andExpect(jsonPath("$.nationalFireCause").value("L"))
            .andExpect(jsonPath("$.percentContained").value(15))
            .andExpect(jsonPath("$.statusDate")
                .value("2026-11-01T12:00:00Z"))
            .andExpect(jsonPath("$.agencyFireId").doesNotExist())
            .andExpect(jsonPath("$.isActive").doesNotExist());

        verify(service).getDetectionByNationalFireId("FIRE-001");
        verifyNoMoreInteractions(service);
    }

    @Test
    void returnsAllActiveFiresWithCorrectJson() throws Exception {
        when(service.getDetectionAllActive())
            .thenReturn(List.of(createFire()));

        mockMvc.perform(get(BASE_URL))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(
                MediaType.APPLICATION_JSON
            ))
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].nationalFireId").value("FIRE-001"))
            .andExpect(jsonPath("$[0].agencyCode").value("QC"))
            .andExpect(jsonPath("$[0].stageOfControlStatus").value("OC"));

        verify(service).getDetectionAllActive();
        verifyNoMoreInteractions(service);
    }

    @Test
    void returnsEmptyArrayWhenNoActiveFires() throws Exception {
        when(service.getDetectionAllActive())
            .thenReturn(List.of());

        mockMvc.perform(get(BASE_URL))
            .andExpect(status().isOk())
            .andExpect(content().json("[]"));

        verify(service).getDetectionAllActive();
        verifyNoMoreInteractions(service);
    }

    @Test
    void setsPublicCacheForSixtySeconds() throws Exception {
        when(service.getDetectionAllActive())
            .thenReturn(List.of());

        mockMvc.perform(get(BASE_URL))
            .andExpect(status().isOk())
            .andExpect(header().string(
                "Cache-Control",
                org.hamcrest.Matchers.allOf(
                    org.hamcrest.Matchers.containsString("public"),
                    org.hamcrest.Matchers.containsString("max-age=60")
                )
            ));
    }

    @Test
    void returns404WhenFireDoesNotExist() throws Exception {
        when(service.getDetectionByNationalFireId("UNKNOWN"))
            .thenThrow(new FireNotFoundException("Fire not found"));

        mockMvc.perform(get(BASE_URL + "/UNKNOWN"))
            .andExpect(status().isNotFound())
            .andExpect(content().contentTypeCompatibleWith(
                MediaType.APPLICATION_PROBLEM_JSON
            ))
            .andExpect(jsonPath("$.status").value(404))
            .andExpect(jsonPath("$.detail").value("Fire not found"));

        verify(service).getDetectionByNationalFireId("UNKNOWN");
    }

    @Test
    void returns500WithoutExposingInternalError() throws Exception {
        when(service.getDetectionAllActive())
            .thenThrow(new IllegalStateException("Database credentials"));

        mockMvc.perform(get(BASE_URL))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.status").value(500))
            .andExpect(jsonPath("$.detail")
                .value("An unexpected server error occurred"))
            .andExpect(content().string(
                org.hamcrest.Matchers.not(
                    org.hamcrest.Matchers.containsString(
                        "Database credentials"
                    )
                )
            ));
    }
}
