package com.firewatch.backend.cwfis;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

import com.firewatch.backend.cwfis.dto.mappers.FireResponseMapper;
import com.firewatch.backend.cwfis.dto.requests.CwfisParseResult;
import com.firewatch.backend.cwfis.dto.requests.FireDetectionRequest;
import com.firewatch.backend.cwfis.dto.responses.FireDetectionResponse;
import com.firewatch.backend.exceptions.CwfisIngestionException;
import com.firewatch.backend.exceptions.FireNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CwfisService {

    private final Client client;
    private final Filtering filtering;
    private final Repository cwfisRepository;
    private final PersistenceService persistenceService;
    private final Mapper mapper;
    private final FireResponseMapper fireResponseMapper;

    public void saveDetection() {
        Instant syncTime = Instant.now();

        try {
            CwfisParseResult result = client.fetchDetections(syncTime);

            if (result == null || result.fires() == null || result.rejectedCount() > 0) {
                throw new CwfisIngestionException("CWFIS synchronization aborted: invalid or rejected records", new IllegalStateException("CWFIS parsing result is invalid"));
            }

            List<FireDetectionRequest> filteredFires = filtering.filter(result.fires(), syncTime);

            // Zero active fires is valid. Only null is an error.
            if (filteredFires == null) {
                throw new CwfisIngestionException("CWFIS synchronization aborted: filtering failed", new IllegalStateException("Filtering returned null"));
            }

            List<FireDetection> mappedFires = mapper.toEntities(filteredFires, syncTime);

            if (mappedFires == null || mappedFires.size() != filteredFires.size()) {
                throw new CwfisIngestionException("CWFIS synchronization aborted: mapping failed", new IllegalStateException("Mapped fire count does not match filtered fire count"));
            }

            // Persist active fires and deactivate missing ones
            persistenceService.reconcile(mappedFires, syncTime);

        } 
        catch (CwfisIngestionException error) {
            throw error;
        } 
        catch (RuntimeException error) {
            throw new CwfisIngestionException("CWFIS ingestion failed", error);
        }
    }

    public FireDetectionResponse getDetectionByNationalFireId(String id) {
        return cwfisRepository.findById(id).map(fireResponseMapper::toResponse).orElseThrow(() ->new FireNotFoundException("Fire not found : " + id));
    }

    public List<FireDetectionResponse> getDetectionAllActive() {
        return cwfisRepository.findAllByIsActiveTrue().stream().map(fireResponseMapper::toResponse).toList();
    }
}
