package com.firewatch.backend.fire.synchronization;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.firewatch.backend.exceptions.GlobalExceptionHandler;
import com.firewatch.backend.fire.synchronization.dto.SyncOverview;
import com.firewatch.backend.fire.synchronization.dto.SyncStatusType;

class SyncControllerTest {

    private static final String BASE_URL = "/api/v1/cwfis/sync";

    private SyncService service;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        service = mock(SyncService.class);

        mockMvc = MockMvcBuilders
            .standaloneSetup(new SyncController(service))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void returns204WhenNoSuccessfulSyncExists() throws Exception {
        when(service.getLastSuccess()).thenReturn(null);

        mockMvc.perform(get(BASE_URL + "/last-success"))
            .andExpect(status().isNoContent())
            .andExpect(content().string(""));

        verify(service).getLastSuccess();
        verifyNoMoreInteractions(service);
    }

    @Test
    void returnsLastSuccessfulSyncAsJson() throws Exception {
        SyncModel sync = new SyncModel();
        sync.setId(1L);
        sync.setStatus(SyncStatusType.SUCCESS);
        sync.setStartedAt(
            Instant.parse("2026-11-13T12:00:00Z")
        );
        sync.setCompletedAt(
            Instant.parse("2026-11-13T12:00:05Z")
        );
        sync.setDurationSeconds(5.0);

        when(service.getLastSuccess()).thenReturn(sync);

        mockMvc.perform(get(BASE_URL + "/last-success"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(
                MediaType.APPLICATION_JSON
            ))
            .andExpect(jsonPath("$.startedAt")
                .value("2026-11-13T12:00:00Z"))
            .andExpect(jsonPath("$.completedAt")
                .value("2026-11-13T12:00:05Z"))
            .andExpect(jsonPath("$.durationSeconds").value(5.0))
            .andExpect(jsonPath("$.id").doesNotExist())
            .andExpect(jsonPath("$.status").doesNotExist())
            .andExpect(jsonPath("$.errorMessage").doesNotExist());

        verify(service).getLastSuccess();
        verifyNoMoreInteractions(service);
    }

    @Test
    void returnsOverviewWhenNoSyncExists() throws Exception {
        when(service.getOverview()).thenReturn(
            new SyncOverview(null, null, null)
        );

        mockMvc.perform(get(BASE_URL + "/status"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(
                MediaType.APPLICATION_JSON
            ))
            .andExpect(jsonPath("$.latestStatus").value(
                org.hamcrest.Matchers.nullValue()
            ))
            .andExpect(jsonPath("$.latestStartedAt").value(
                org.hamcrest.Matchers.nullValue()
            ))
            .andExpect(jsonPath("$.lastSuccessfulAt").value(
                org.hamcrest.Matchers.nullValue()
            ));

        verify(service).getOverview();
        verifyNoMoreInteractions(service);
    }

    @Test
    void returnsRunningSyncOverview() throws Exception {
        when(service.getOverview()).thenReturn(
            new SyncOverview(
                SyncStatusType.RUNNING,
                Instant.parse("2026-11-13T13:00:00Z"),
                Instant.parse("2026-11-12T18:00:00Z")
            )
        );

        mockMvc.perform(get(BASE_URL + "/status"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.latestStatus").value("RUNNING"))
            .andExpect(jsonPath("$.latestStartedAt")
                .value("2026-11-13T13:00:00Z"))
            .andExpect(jsonPath("$.lastSuccessfulAt")
                .value("2026-11-12T18:00:00Z"));

        verify(service).getOverview();
        verifyNoMoreInteractions(service);
    }

    @Test
    void returnsFailedSyncOverviewWithPreviousSuccess() throws Exception {
        when(service.getOverview()).thenReturn(
            new SyncOverview(
                SyncStatusType.FAILED,
                Instant.parse("2026-11-13T14:00:00Z"),
                Instant.parse("2026-11-12T18:00:00Z")
            )
        );

        mockMvc.perform(get(BASE_URL + "/status"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.latestStatus").value("FAILED"))
            .andExpect(jsonPath("$.latestStartedAt")
                .value("2026-11-13T14:00:00Z"))
            .andExpect(jsonPath("$.lastSuccessfulAt")
                .value("2026-11-12T18:00:00Z"));

        verify(service).getOverview();
        verifyNoMoreInteractions(service);
    }

    @Test
    void returns500WithoutLeakingInternalErrors() throws Exception {
        when(service.getOverview()).thenThrow(
            new IllegalStateException("Database connection failed")
        );

        mockMvc.perform(get(BASE_URL + "/status"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.status").value(500))
            .andExpect(jsonPath("$.detail")
                .value("An unexpected server error occurred"))
            .andExpect(content().string(
                org.hamcrest.Matchers.not(
                    org.hamcrest.Matchers.containsString(
                        "Database connection failed"
                    )
                )
            ));

        verify(service).getOverview();
    }
}
