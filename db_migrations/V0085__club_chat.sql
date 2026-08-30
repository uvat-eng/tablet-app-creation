CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.club_chat (
    id          SERIAL PRIMARY KEY,
    staff_id    INTEGER NOT NULL,
    author_name VARCHAR(200) NOT NULL DEFAULT '',
    author_role VARCHAR(50)  NOT NULL DEFAULT '',
    body        TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_chat_created
    ON t_p51170708_tablet_app_creation.club_chat (created_at DESC);

CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.club_chat_reads (
    staff_id     INTEGER PRIMARY KEY,
    last_read_id INTEGER NOT NULL DEFAULT 0,
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
