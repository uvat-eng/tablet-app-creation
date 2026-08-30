CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.push_subs (
    id         SERIAL PRIMARY KEY,
    staff_id   INTEGER NOT NULL,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    agent      VARCHAR(300) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_ok    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_subs_staff
    ON t_p51170708_tablet_app_creation.push_subs (staff_id);
