CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE wildfires (

    national_fire_id VARCHAR(255) PRIMARY KEY,
    agency_fire_id VARCHAR(255) NOT NULL,
    agency_code VARCHAR(5) NOT NULL,
    region_code VARCHAR(20),
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    stage_of_control_status VARCHAR(10) NOT NULL,
    fire_size NUMERIC,
    national_fire_cause VARCHAR(10),
    percent_contained NUMERIC,
    status_date TIMESTAMPTZ,
    record_start TIMESTAMPTZ NOT NULL,
    record_end TIMESTAMPTZ NOT NULL,
    last_synched_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL,

    CONSTRAINT check_wildfires_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT check_wildfires_longitude CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT check_wildfires_fire_size CHECK (fire_size >= 0),
    CONSTRAINT check_wildfires_record CHECK (record_end > record_start),
    CONSTRAINT check_wildfires_national_fire_id CHECK (length(trim(national_fire_id)) > 0),
    CONSTRAINT check_percent_contained CHECK (percent_contained BETWEEN 0 AND 100)
);

CREATE INDEX index_wildfires_location ON wildfires USING GIST (location);
CREATE INDEX index_wildfires_active_sync ON wildfires (last_synched_at) WHERE is_active = true;
