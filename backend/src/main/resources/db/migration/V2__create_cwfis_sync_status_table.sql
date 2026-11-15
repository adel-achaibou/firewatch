CREATE TABLE cwfis_sync_status (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_seconds DOUBLE PRECISION,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED', 'INTERRUPTED')),
    error_message TEXT,

    CONSTRAINT check_sync_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);
