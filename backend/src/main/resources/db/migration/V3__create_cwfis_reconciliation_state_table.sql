CREATE TABLE cwfis_reconciliation_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_applied_at TIMESTAMPTZ
);

INSERT INTO cwfis_reconciliation_state (id, last_applied_at)
VALUES (1, NULL);

