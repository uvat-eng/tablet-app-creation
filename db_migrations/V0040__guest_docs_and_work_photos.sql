CREATE TABLE IF NOT EXISTS guest_docs (
  id              SERIAL PRIMARY KEY,
  guest_id        INTEGER NOT NULL,
  kind            VARCHAR(40) DEFAULT 'contract',
  title           VARCHAR(200),
  doc_no          VARCHAR(80),
  signed_on       DATE,
  valid_to        DATE,
  file_url        VARCHAR(600),
  note            TEXT,
  archived        BOOLEAN DEFAULT FALSE,
  created_by      INTEGER,
  created_by_name VARCHAR(160),
  updated_by      INTEGER,
  updated_at      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gdocs_guest ON guest_docs (guest_id);

CREATE TABLE IF NOT EXISTS work_photos (
  id              SERIAL PRIMARY KEY,
  work_id         INTEGER NOT NULL,
  photo_url       VARCHAR(600) NOT NULL,
  shot_on         DATE,
  caption         VARCHAR(300),
  created_by      INTEGER,
  created_by_name VARCHAR(160),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wphotos_work ON work_photos (work_id);
