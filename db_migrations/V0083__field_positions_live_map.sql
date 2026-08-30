CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.field_positions (
    staff_id    INTEGER PRIMARY KEY,
    name        VARCHAR(200) NOT NULL DEFAULT '',
    role        VARCHAR(50)  NOT NULL DEFAULT '',
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    accuracy    INTEGER      NOT NULL DEFAULT 0,
    speed       DOUBLE PRECISION,
    heading     DOUBLE PRECISION,
    battery     INTEGER,
    sharing     BOOLEAN      NOT NULL DEFAULT TRUE,
    sos         BOOLEAN      NOT NULL DEFAULT FALSE,
    note        VARCHAR(300) NOT NULL DEFAULT '',
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_positions_updated
    ON t_p51170708_tablet_app_creation.field_positions (updated_at DESC);
