package com.firewatch.backend.fire;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.firewatch.backend.exceptions.CwfisParsingException;
import com.firewatch.backend.fire.dto.requests.CwfisParseResult;
import com.firewatch.backend.fire.dto.requests.FireDetectionRequest;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class JsonParser {

    private final ObjectMapper objectMapper;
    private static final Logger log = LoggerFactory.getLogger(JsonParser.class);

    public JsonParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public CwfisParseResult parse(String json) {
        JsonNode root;

        try {
            root = objectMapper.readTree(json);
        }
        catch (JacksonException error) {
            throw new CwfisParsingException(
                "Failed to parse CWFIS JSON response", error
            );
        }

        // Validate JSON root
        if (root == null || !root.isObject()) {
            throw new CwfisParsingException("Invalid CWFIS JSON root");
        }

        JsonNode features = root.get("features");

        // Validate features array
        if (features == null || !features.isArray()) {
            throw new CwfisParsingException(
                "Missing or invalid 'features' array in CWFIS response"
            );
        }

        // Retrieve CWFIS metadata
        JsonNode matchedNode = root.get("numberMatched");
        JsonNode returnedNode = root.get("numberReturned");
        JsonNode totalNode = root.get("totalFeatures");

        // Validate metadata types
        if (matchedNode == null || !matchedNode.isIntegralNumber()
                || returnedNode == null || !returnedNode.isIntegralNumber()
                || totalNode == null || !totalNode.isIntegralNumber()) {
            throw new CwfisParsingException(
                "Missing or invalid CWFIS metadata"
            );
        }

        long numberMatched = matchedNode.longValue();
        long numberReturned = returnedNode.longValue();
        long totalFeatures = totalNode.longValue();

        // Validate response completeness
        if (numberMatched < 0 || numberReturned < 0 || totalFeatures < 0
                || numberMatched != numberReturned
                || numberReturned != features.size()
                || totalFeatures != numberMatched) {
            throw new CwfisParsingException(
                "Incomplete or inconsistent CWFIS response"
            );
        }

        List<FireDetectionRequest> fires = new ArrayList<>();
        int rejectedCount = 0;

        for (JsonNode feature : features) {
            try {
                JsonNode properties = feature == null || feature.isNull() ? null : feature.get("properties");

                if (properties == null || !properties.isObject()) {
                    rejectedCount++;
                    log.warn("Rejected fire: missing or invalid properties");
                    continue;
                }

                FireDetectionRequest fire = objectMapper.treeToValue(
                    properties, FireDetectionRequest.class
                );

                if (fire == null) {
                    rejectedCount++;
                    log.warn("Rejected fire: deserialization returned null");
                    continue;
                }

                fires.add(fire);
            }
            catch (JacksonException error) {
                rejectedCount++;
                log.warn(
                    "Failed to deserialize CWFIS fire: {}",
                    error.getMessage()
                );
            }
        }

        return new CwfisParseResult(
            fires,
            numberMatched,
            numberReturned,
            totalFeatures,
            rejectedCount
        );
    }
}
