package com.firewatch.backend.cwfis.dto.mappers;

import org.springframework.stereotype.Component;

import com.firewatch.backend.cwfis.FireDetection;
import com.firewatch.backend.cwfis.dto.responses.FireDetectionResponse;

/**
 * Maps FireDetection entites to API reponse DTOs
 */
@Component 
public class FireResponseMapper {
    
    public FireDetectionResponse toResponse(FireDetection fireDetection) {
        return new FireDetectionResponse(
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
