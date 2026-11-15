package com.firewatch.backend.cwfis;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.HttpClientSettings;
import org.springframework.core.retry.RetryPolicy;
import org.springframework.core.retry.RetryTemplate;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import com.firewatch.backend.cwfis.dto.requests.CwfisParseResult;
import com.firewatch.backend.exceptions.CwfisFetchException;

@Component
public class Client {

    private final RestClient restClient;
    private final RetryTemplate retryTemplate;
    private final String baseUrl;
    private final JsonParser jsonParser;

    public Client(RestClient.Builder restClientBuilder, JsonParser jsonParser,
            @Value("${cwfis.api.base-url}") String baseUrl,
            @Value("${cwfis.api.connect-timeout}") Duration connectTimeout,
            @Value("${cwfis.api.read-timeout}") Duration readTimeout) {

        // Configure connection and read timeouts
        HttpClientSettings settings = HttpClientSettings.defaults()
            .withConnectTimeout(connectTimeout)
            .withReadTimeout(readTimeout);

        ClientHttpRequestFactory requestFactory =
            ClientHttpRequestFactoryBuilder.detect().build(settings);

        this.restClient = restClientBuilder
            .requestFactory(requestFactory)
            .build();

        // Retry temporary HTTP failures
        RetryPolicy retryPolicy = RetryPolicy.builder()
            .maxRetries(2)
            .delay(Duration.ofSeconds(1))
            .includes(RestClientException.class)
            .excludes(HttpClientErrorException.class)
            .build();

        this.retryTemplate = new RetryTemplate(retryPolicy);
        this.baseUrl = baseUrl;
        this.jsonParser = jsonParser;
    }

    // Fetch active fire records from CWFIS
    public String fetchRawDetections(Instant syncTime) {

        String filter = String.format(
            "record_start <= '%s' AND record_end > '%s'",
            syncTime, syncTime
        );

        URI uri = UriComponentsBuilder
            .fromUriString(baseUrl)
            .queryParam("service", "WFS")
            .queryParam("version", "2.0.0")
            .queryParam("request", "GetFeature")
            .queryParam("typeNames", "public:cwfif_national_activefires")
            .queryParam("outputFormat", "application/json")
            .queryParam("cql_filter", filter)
            .encode()
            .build()
            .toUri();

        String uriString = uri.toASCIIString()
            .replace("application%2Fjson", "application/json");

        URI requestUri = URI.create(uriString);

        try {
            return retryTemplate.invoke(
                () -> restClient.get()
                    .uri(requestUri)
                    .retrieve()
                    .body(String.class)
            );
        }
        catch (RestClientException error) {
            throw new CwfisFetchException(
                "Failed to fetch data from CWFIS", error
            );
        }
    }

    // Fetch and parse CWFIS data with completeness metadata
    public CwfisParseResult fetchDetections(Instant syncTime) {

        String json = fetchRawDetections(syncTime);

        if (json == null || json.isBlank()) {
            throw new CwfisFetchException(
                "CWFIS returned an empty HTTP response"
            );
        }

        return jsonParser.parse(json);
    }
}
