CREATE TABLE IF NOT EXISTS biotech_works (
  id              SERIAL PRIMARY KEY,
  guest_id        INTEGER,
  hunter_name     VARCHAR(200),
  kind            VARCHAR(32) NOT NULL,
  location_id     INTEGER,
  place           VARCHAR(200),
  work_on         DATE,
  hours           NUMERIC(8,2) DEFAULT 0,
  qty             NUMERIC(12,2) DEFAULT 0,
  unit            VARCHAR(24),
  value_rub       NUMERIC(14,2) DEFAULT 0,
  status          VARCHAR(24) DEFAULT 'done',
  note            TEXT,
  photo_url       VARCHAR(500),
  archived        BOOLEAN DEFAULT FALSE,
  created_by      INTEGER,
  created_by_name VARCHAR(160),
  updated_by      INTEGER,
  updated_at      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bio_date   ON biotech_works (work_on DESC);
CREATE INDEX IF NOT EXISTS idx_bio_guest  ON biotech_works (guest_id);
CREATE INDEX IF NOT EXISTS idx_bio_kind   ON biotech_works (kind);
