package com.firewatch.backend.cwfis;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Component;

import com.firewatch.backend.cwfis.dto.requests.FireDetectionRequest;

@Component
public class Mapper {

    private static final int WGS84_SRID = 4326;

    private final GeometryFactory geometryFactory =
        new GeometryFactory(new PrecisionModel(), WGS84_SRID);

    public List<FireDetection> toEntities(List<FireDetectionRequest> filteredFires, Instant syncTime) {

        List<FireDetection> fires = new ArrayList<>();

        for (FireDetectionRequest filteredFire : filteredFires) {

            FireDetection fireDetection = new FireDetection();

            fireDetection.setNationalFireId(filteredFire.nationalFireId());
            fireDetection.setAgencyFireId(filteredFire.agencyFireId());
            fireDetection.setAgencyCode(filteredFire.agencyCode());
            fireDetection.setRegionCode(filteredFire.regionCode());
            fireDetection.setLatitude(filteredFire.latitude());
            fireDetection.setLongitude(filteredFire.longitude());
            Point location = geometryFactory.createPoint(new Coordinate(filteredFire.longitude().doubleValue(),filteredFire.latitude().doubleValue()));
            fireDetection.setLocation(location);
            fireDetection.setStageOfControlStatus(filteredFire.stageOfControlStatus());
            fireDetection.setFireSize(filteredFire.fireSize());
            fireDetection.setNationalFireCause(filteredFire.nationalFireCause());
            fireDetection.setPercentContained(filteredFire.percentContained());
            fireDetection.setStatusDate(filteredFire.statusDate());
            fireDetection.setRecordStart(filteredFire.recordStart());
            fireDetection.setRecordEnd(filteredFire.recordEnd());
            fireDetection.setLastSynchedAt(syncTime);

            // All fires passing the filtering are active
            fireDetection.setActive(true);

            fires.add(fireDetection);
        }

        return fires;
    }
}
