package com.firewatch.backend.fire;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import com.firewatch.backend.exceptions.CwfisIngestionException;
import com.firewatch.backend.exceptions.FireNotFoundException;
import com.firewatch.backend.fire.dto.mappers.FireResponseMapper;
import com.firewatch.backend.fire.dto.requests.CwfisParseResult;
import com.firewatch.backend.fire.dto.requests.FireDetectionRequest;
import com.firewatch.backend.fire.dto.responses.FireDetectionResponse;

class FireServiceTest {

    private final FireClient client = mock(FireClient.class);
    private final FireFiltering filtering = mock(FireFiltering.class);
    private final FireRepository repository =
        mock(FireRepository.class);
    private final PersistenceService persistence =
        mock(PersistenceService.class);
    private final FireMapper mapper = mock(FireMapper.class);
    private final FireResponseMapper responseMapper =
        mock(FireResponseMapper.class);

    private final FireService service = new FireService(
        client,
        filtering,
        repository,
        persistence,
        mapper,
        responseMapper
    );

    @Test
    void passesSameSyncTimeAndCorrectDataThroughEntirePipeline() {
        FireDetectionRequest rawFire =
            mock(FireDetectionRequest.class);

        FireDetectionRequest filteredFire =
            mock(FireDetectionRequest.class);

        Fire mappedFire = new Fire();

        List<FireDetectionRequest> rawFires =
            List.of(rawFire);

        List<FireDetectionRequest> filteredFires =
            List.of(filteredFire);

        List<Fire> mappedFires =
            List.of(mappedFire);

        CwfisParseResult result = new CwfisParseResult(
            rawFires, 1, 1, 1, 0
        );

        when(client.fetchDetections(any(Instant.class)))
            .thenReturn(result);

        when(filtering.filter(
            anyList(),
            any(Instant.class)
        )).thenReturn(filteredFires);

        when(mapper.toEntities(
            anyList(),
            any(Instant.class)
        )).thenReturn(mappedFires);

        Instant before = Instant.now();

        service.saveDetection();

        Instant after = Instant.now();

        ArgumentCaptor<Instant> clientTime =
            ArgumentCaptor.forClass(Instant.class);

        ArgumentCaptor<Instant> filterTime =
            ArgumentCaptor.forClass(Instant.class);

        ArgumentCaptor<Instant> mapperTime =
            ArgumentCaptor.forClass(Instant.class);

        ArgumentCaptor<Instant> persistenceTime =
            ArgumentCaptor.forClass(Instant.class);

        InOrder order = inOrder(
            client, filtering, mapper, persistence
        );

        order.verify(client)
            .fetchDetections(clientTime.capture());

        order.verify(filtering)
            .filter(
                eq(rawFires),
                filterTime.capture()
            );

        order.verify(mapper)
            .toEntities(
                eq(filteredFires),
                mapperTime.capture()
            );

        order.verify(persistence)
            .reconcile(
                eq(mappedFires),
                persistenceTime.capture()
            );

        order.verifyNoMoreInteractions();

        Instant syncTime = clientTime.getValue();

        assertAll(
            () -> assertFalse(syncTime.isBefore(before)),
            () -> assertFalse(syncTime.isAfter(after)),
            () -> assertEquals(
                syncTime, filterTime.getValue()
            ),
            () -> assertEquals(
                syncTime, mapperTime.getValue()
            ),
            () -> assertEquals(
                syncTime, persistenceTime.getValue()
            )
        );

        verifyNoInteractions(repository, responseMapper);
    }

    @Test
    void reconcilesEmptySnapshotWithSameSyncTime() {
        List<FireDetectionRequest> emptyRequests = List.of();
        List<Fire> emptyEntities = List.of();

        when(client.fetchDetections(any(Instant.class)))
            .thenReturn(new CwfisParseResult(
                emptyRequests, 0, 0, 0, 0
            ));

        when(filtering.filter(
            eq(emptyRequests),
            any(Instant.class)
        )).thenReturn(emptyRequests);

        when(mapper.toEntities(
            eq(emptyRequests),
            any(Instant.class)
        )).thenReturn(emptyEntities);

        service.saveDetection();

        ArgumentCaptor<Instant> clientTime =
            ArgumentCaptor.forClass(Instant.class);

        verify(client).fetchDetections(clientTime.capture());

        Instant syncTime = clientTime.getValue();

        InOrder order = inOrder(filtering, mapper, persistence);

        order.verify(filtering)
            .filter(emptyRequests, syncTime);

        order.verify(mapper)
            .toEntities(emptyRequests, syncTime);

        order.verify(persistence)
            .reconcile(emptyEntities, syncTime);

        order.verifyNoMoreInteractions();

        verifyNoMoreInteractions(client);
    }

    @Test
    void abortsWhenParsingRejectedRecords() {
        FireDetectionRequest request =
            mock(FireDetectionRequest.class);

        when(client.fetchDetections(any(Instant.class)))
            .thenReturn(new CwfisParseResult(
                List.of(request), 2, 2, 2, 1
            ));

        CwfisIngestionException error = assertThrows(
            CwfisIngestionException.class,
            service::saveDetection
        );

        assertEquals(
            "CWFIS synchronization aborted: invalid or rejected records",
            error.getMessage()
        );

        verify(client).fetchDetections(any(Instant.class));
        verifyNoInteractions(filtering, mapper, persistence);
    }

    @Test
    void abortsWhenParserReturnsNull() {
        when(client.fetchDetections(any(Instant.class)))
            .thenReturn(null);

        assertThrows(
            CwfisIngestionException.class,
            service::saveDetection
        );

        verifyNoInteractions(filtering, mapper, persistence);
    }

    @Test
    void abortsWhenParserReturnsNullFireList() {
        when(client.fetchDetections(any(Instant.class)))
            .thenReturn(new CwfisParseResult(
                null, 0, 0, 0, 0
            ));

        assertThrows(
            CwfisIngestionException.class,
            service::saveDetection
        );

        verifyNoInteractions(filtering, mapper, persistence);
    }

    @Test
    void abortsWhenFilteringReturnsNull() {
        List<FireDetectionRequest> raw = List.of();

        when(client.fetchDetections(any(Instant.class)))
            .thenReturn(new CwfisParseResult(
                raw, 0, 0, 0, 0
            ));

        when(filtering.filter(
            eq(raw),
            any(Instant.class)
        )).thenReturn(null);

        assertThrows(
            CwfisIngestionException.class,
            service::saveDetection
        );

        ArgumentCaptor<Instant> time =
            ArgumentCaptor.forClass(Instant.class);

        verify(client).fetchDetections(time.capture());
        verify(filtering).filter(raw, time.getValue());

        verifyNoInteractions(mapper, persistence);
    }

    @Test
    void abortsWhenMappingReturnsNull() {
        List<FireDetectionRequest> raw = List.of();

        when(client.fetchDetections(any(Instant.class)))
            .thenReturn(new CwfisParseResult(
                raw, 0, 0, 0, 0
            ));

        when(filtering.filter(
            eq(raw),
            any(Instant.class)
        )).thenReturn(raw);

        when(mapper.toEntities(
            eq(raw),
            any(Instant.class)
        )).thenReturn(null);

        assertThrows(
            CwfisIngestionException.class,
            service::saveDetection
        );

        ArgumentCaptor<Instant> time =
            ArgumentCaptor.forClass(Instant.class);

        verify(client).fetchDetections(time.capture());
        verify(filtering).filter(raw, time.getValue());
        verify(mapper).toEntities(raw, time.getValue());

        verifyNoInteractions(persistence);
    }

    @Test
    void abortsWhenMappedCountDoesNotMatch() {
        FireDetectionRequest request =
            mock(FireDetectionRequest.class);

        List<FireDetectionRequest> raw = List.of(request);

        when(client.fetchDetections(any(Instant.class)))
            .thenReturn(new CwfisParseResult(
                raw, 1, 1, 1, 0
            ));

        when(filtering.filter(
            eq(raw),
            any(Instant.class)
        )).thenReturn(raw);

        when(mapper.toEntities(
            eq(raw),
            any(Instant.class)
        )).thenReturn(List.of());

        assertThrows(
            CwfisIngestionException.class,
            service::saveDetection
        );

        ArgumentCaptor<Instant> time =
            ArgumentCaptor.forClass(Instant.class);

        verify(client).fetchDetections(time.capture());
        verify(filtering).filter(raw, time.getValue());
        verify(mapper).toEntities(raw, time.getValue());

        verifyNoInteractions(persistence);
    }

    @Test
    void propagatesExistingIngestionExceptionWithoutWrappingAgain() {
        CwfisIngestionException original =
            new CwfisIngestionException(
                "CWFIS unavailable",
                new IllegalStateException("Service unavailable")
            );

        when(client.fetchDetections(any(Instant.class)))
            .thenThrow(original);

        CwfisIngestionException actual = assertThrows(
            CwfisIngestionException.class,
            service::saveDetection
        );

        assertSame(original, actual);
        verifyNoInteractions(filtering, mapper, persistence);
    }

    @Test
    void wrapsUnexpectedRuntimeExceptionAndPreservesCause() {
        IllegalStateException original =
            new IllegalStateException("Unexpected error");

        when(client.fetchDetections(any(Instant.class)))
            .thenThrow(original);

        CwfisIngestionException error = assertThrows(
            CwfisIngestionException.class,
            service::saveDetection
        );

        assertEquals(
            "CWFIS ingestion failed",
            error.getMessage()
        );

        assertSame(original, error.getCause());
        verifyNoInteractions(filtering, mapper, persistence);
    }

    @Test
    void returnsFireByNationalId() {
        Fire fire = new Fire();
        fire.setNationalFireId("FIRE-001");

        FireDetectionResponse response =
            mock(FireDetectionResponse.class);

        when(repository.findById("FIRE-001"))
            .thenReturn(Optional.of(fire));

        when(responseMapper.toResponse(fire))
            .thenReturn(response);

        assertSame(
            response,
            service.getDetectionByNationalFireId("FIRE-001")
        );

        verify(repository).findById("FIRE-001");
        verify(responseMapper).toResponse(fire);
        verifyNoMoreInteractions(repository, responseMapper);
    }

    @Test
    void throwsWhenFireNotFound() {
        when(repository.findById("UNKNOWN"))
            .thenReturn(Optional.empty());

        assertThrows(
            FireNotFoundException.class,
            () -> service.getDetectionByNationalFireId("UNKNOWN")
        );

        verify(repository).findById("UNKNOWN");
        verifyNoInteractions(responseMapper);
    }

    @Test
    void returnsOnlyActiveFiresInRepositoryOrder() {
        Fire first = new Fire();
        first.setNationalFireId("FIRE-A");

        Fire second = new Fire();
        second.setNationalFireId("FIRE-B");

        FireDetectionResponse firstResponse =
            mock(FireDetectionResponse.class);

        FireDetectionResponse secondResponse =
            mock(FireDetectionResponse.class);

        when(repository.findAllByIsActiveTrue())
            .thenReturn(List.of(first, second));

        when(responseMapper.toResponse(first))
            .thenReturn(firstResponse);

        when(responseMapper.toResponse(second))
            .thenReturn(secondResponse);

        assertEquals(
            List.of(firstResponse, secondResponse),
            service.getDetectionAllActive()
        );

        InOrder order = inOrder(repository, responseMapper);

        order.verify(repository).findAllByIsActiveTrue();
        order.verify(responseMapper).toResponse(first);
        order.verify(responseMapper).toResponse(second);
        order.verifyNoMoreInteractions();
    }
}
