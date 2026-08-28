CREATE TABLE IF NOT EXISTS hunter_bag (
  id              SERIAL PRIMARY KEY,
  guest_id        INTEGER NOT NULL,
  species         VARCHAR(32) NOT NULL,
  qty             INTEGER DEFAULT 1,
  taken_on        DATE,
  season          INTEGER,
  location_id     INTEGER,
  place           VARCHAR(200),
  trophy_note     VARCHAR(300),
  photo_url       VARCHAR(500),
  archived        BOOLEAN DEFAULT FALSE,
  created_by      INTEGER,
  created_by_name VARCHAR(160),
  updated_by      INTEGER,
  updated_at      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hbag_guest   ON hunter_bag (guest_id);
CREATE INDEX IF NOT EXISTS idx_hbag_species ON hunter_bag (species);
CREATE INDEX IF NOT EXISTS idx_hbag_date    ON hunter_bag (taken_on DESC);
