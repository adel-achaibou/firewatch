package com.firewatch.backend.fire;

import java.math.BigDecimal;
import java.time.Instant;

import org.locationtech.jts.geom.Point;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

// BigDecimal instead of Double or double, because the database imposes it.
// The data type in the database is NUMERIC, so it needs BigDecimal in order to work.

@Entity
@NoArgsConstructor
@Getter
@Setter
@ToString
@Table(name = "wildfires")
public class Fire {

    @Id
    @Column(name = "national_fire_id")
    private String nationalFireId;

    @Column(name = "agency_fire_id")
    private String agencyFireId;

    @Column(name = "agency_code")
    private String agencyCode;

    @Column(name = "region_code")
    private String regionCode;

    @Column(nullable = false)
    private BigDecimal latitude;

    @Column(nullable = false)
    private BigDecimal longitude;

    @Column(nullable = false, columnDefinition = "geography(Point, 4326)")
    private Point location;

    @Column(name = "stage_of_control_status", nullable = false)
    private String stageOfControlStatus;

    @Column(name = "fire_size")
    private BigDecimal fireSize;

    @Column(name = "national_fire_cause")
    private String nationalFireCause;

    @Column(name = "percent_contained")
    private BigDecimal percentContained;

    @Column(name = "status_date")
    private Instant statusDate;

    @Column(name = "record_start", nullable = false)
    private Instant recordStart;

    @Column(name = "record_end", nullable = false)
    private Instant recordEnd;

    @Column(name = "last_synched_at", nullable = false)
    private Instant lastSynchedAt;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;
}
