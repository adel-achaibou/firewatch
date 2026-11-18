package com.firewatch.backend.fire.dto.mappers;

import org.springframework.stereotype.Component;

import com.firewatch.backend.fire.Fire;
import com.firewatch.backend.fire.dto.responses.FireResponse;

/**
 * Maps FireDetection entites to API reponse DTOs
 */
@Component 
public class FireResponseMapper {
    
    public FireResponse toResponse(Fire fireDetection) {
        return new FireResponse(
            fireDetection.getNationalFireId(),
            fireDetection.getAgencyCode(),
            fireDetection.getLatitude(),
            fireDetection.getLongitude(),
            fireDetection.getStageOfControlStatus(),
            fireDetection.getFireSize(),
            fireDetection.getNationalFireCause(),
            fireDetection.getPercentContained(),
            fireDetection.getStatusDate()
        );
    }
}
