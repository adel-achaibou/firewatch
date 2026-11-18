package com.firewatch.backend.fire;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Component;

import com.firewatch.backend.fire.dto.requests.FireDetectionRequest;

@Component
public class FireMapper {

    private static final int WGS84_SRID = 4326;

    private final GeometryFactory geometryFactory =
        new GeometryFactory(new PrecisionModel(), WGS84_SRID);

    public List<Fire> toEntities(List<FireDetectionRequest> filteredFires, Instant syncTime) {

        List<Fire> fires = new ArrayList<>();

        for (FireDetectionRequest filteredFire : filteredFires) {

            Fire fireDetection = new Fire();

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
