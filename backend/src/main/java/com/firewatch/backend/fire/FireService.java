package com.firewatch.backend.fire;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

import com.firewatch.backend.exceptions.FireIngestionException;
import com.firewatch.backend.exceptions.FireNotFoundException;
import com.firewatch.backend.fire.dto.mappers.FireResponseMapper;
import com.firewatch.backend.fire.dto.requests.FireParseResult;
import com.firewatch.backend.fire.dto.requests.FireRequest;
import com.firewatch.backend.fire.dto.responses.FireResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FireService {

    private final FireClient client;
    private final FireFiltering filtering;
    private final FireRepository cwfisRepository;
    private final PersistenceService persistenceService;
    private final FireMapper mapper;
    private final FireResponseMapper fireResponseMapper;

    public void saveDetection() {
        Instant syncTime = Instant.now();

        try {
            FireParseResult result = client.fetchDetections(syncTime);

            if (result == null || result.fires() == null || result.rejectedCount() > 0) {
                throw new FireIngestionException("CWFIS synchronization aborted: invalid or rejected records", new IllegalStateException("CWFIS parsing result is invalid"));
            }

            List<FireRequest> filteredFires = filtering.filter(result.fires(), syncTime);

            // Zero active fires is valid. Only null is an error.
            if (filteredFires == null) {
                throw new FireIngestionException("CWFIS synchronization aborted: filtering failed", new IllegalStateException("Filtering returned null"));
            }

            List<Fire> mappedFires = mapper.toEntities(filteredFires, syncTime);

            if (mappedFires == null || mappedFires.size() != filteredFires.size()) {
                throw new FireIngestionException("CWFIS synchronization aborted: mapping failed", new IllegalStateException("Mapped fire count does not match filtered fire count"));
            }

            // Persist active fires and deactivate missing ones
            persistenceService.reconcile(mappedFires, syncTime);

        } 
        catch (FireIngestionException error) {
            throw error;
        } 
        catch (RuntimeException error) {
            throw new FireIngestionException("CWFIS ingestion failed", error);
        }
    }

    public FireResponse getDetectionByNationalFireId(String id) {
        return cwfisRepository.findById(id).map(fireResponseMapper::toResponse).orElseThrow(() ->new FireNotFoundException("Fire not found : " + id));
    }

    public List<FireResponse> getDetectionAllActive() {
        return cwfisRepository.findAllByIsActiveTrue().stream().map(fireResponseMapper::toResponse).toList();
    }
}
