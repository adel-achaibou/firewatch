package com.firewatch.backend.cwfis;

import java.time.Duration;
import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.firewatch.backend.cwfis.dto.responses.FireDetectionResponse;

@RestController 
@RequestMapping("api/v1/fires")
public class Controller {

    private final CwfisService cwfisService;

    public Controller(CwfisService cwfisService) {
        this.cwfisService = cwfisService;
    }

    @GetMapping("/{nationalFireId}")
    public ResponseEntity<FireDetectionResponse> getDetectionByNationalFireId(@PathVariable("nationalFireId") String id) {
        return ResponseEntity.ok(cwfisService.getDetectionByNationalFireId(id));
    }

    @GetMapping()
    public ResponseEntity<List<FireDetectionResponse>> getDetectionAll() {
        return ResponseEntity.ok()
        // Allow browsers and shared HTTP caches to reuse responses for up to 60 seconds.
            .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
            .body(cwfisService.getDetectionAllActive());
    }
}
