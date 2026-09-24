ALTER TABLE t_p51170708_tablet_app_creation.club_chat
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE t_p51170708_tablet_app_creation.messages
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.content_reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL,
  reporter_name VARCHAR(200) NOT NULL DEFAULT '',
  target_kind VARCHAR(40) NOT NULL,
  target_id INTEGER NOT NULL,
  target_author_id INTEGER,
  target_author_name VARCHAR(200) NOT NULL DEFAULT '',
  target_body TEXT NOT NULL DEFAULT '',
  reason VARCHAR(80) NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  resolved_by VARCHAR(200) NOT NULL DEFAULT '',
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_reports_status_idx
  ON t_p51170708_tablet_app_creation.content_reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.user_blocks (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL,
  blocked_staff_id INTEGER NOT NULL,
  blocked_name VARCHAR(200) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, blocked_staff_id)
);

CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.account_closures (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL,
  login VARCHAR(120) NOT NULL DEFAULT '',
  name VARCHAR(200) NOT NULL DEFAULT '',
  guest_id INTEGER,
  reason TEXT NOT NULL DEFAULT '',
  closed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE t_p51170708_tablet_app_creation.guests
  ADD COLUMN IF NOT EXISTS anonymized BOOLEAN NOT NULL DEFAULT FALSE;
