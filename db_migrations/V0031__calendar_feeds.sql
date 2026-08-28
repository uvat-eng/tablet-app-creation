CREATE TABLE IF NOT EXISTS calendar_feeds (
  token      VARCHAR(48) PRIMARY KEY,
  staff_id   INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_read  TIMESTAMP,
  reads      INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_feed_staff ON calendar_feeds (staff_id);
