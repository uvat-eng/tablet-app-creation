CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.messages (
    id          SERIAL PRIMARY KEY,
    guest_id    INTEGER NOT NULL,
    staff_id    INTEGER,
    author_name VARCHAR(200) NOT NULL DEFAULT '',
    from_staff  BOOLEAN NOT NULL DEFAULT TRUE,
    body        TEXT NOT NULL,
    read_staff  BOOLEAN NOT NULL DEFAULT FALSE,
    read_guest  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_guest
    ON t_p51170708_tablet_app_creation.messages (guest_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_unread_staff
    ON t_p51170708_tablet_app_creation.messages (read_staff) WHERE from_staff = FALSE;
