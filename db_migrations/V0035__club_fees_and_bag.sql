ALTER TABLE guests ADD COLUMN IF NOT EXISTS born_on       DATE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS passport      VARCHAR(40);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS passport_date DATE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS address       VARCHAR(300);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS contract_no   VARCHAR(40);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS cert_type     VARCHAR(40);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS fee_monthly   NUMERIC(12,2) DEFAULT 6500;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS joined_on     DATE;

CREATE TABLE IF NOT EXISTS club_fees (
  id              SERIAL PRIMARY KEY,
  guest_id        INTEGER NOT NULL,
  year            INTEGER NOT NULL,
  month           INTEGER NOT NULL,
  amount          NUMERIC(12,2) DEFAULT 0,
  paid            BOOLEAN DEFAULT FALSE,
  paid_on         DATE,
  method          VARCHAR(32) DEFAULT 'cash',
  note            TEXT,
  created_by      INTEGER,
  created_by_name VARCHAR(160),
  updated_by      INTEGER,
  updated_at      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (guest_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_fee_guest ON club_fees (guest_id, year);

CREATE TABLE IF NOT EXISTS club_bag (
  id              SERIAL PRIMARY KEY,
  guest_id        INTEGER NOT NULL,
  season          INTEGER NOT NULL,
  species         VARCHAR(32) NOT NULL,
  taken_on        DATE,
  mode            VARCHAR(24) DEFAULT 'free',
  price           NUMERIC(14,2) DEFAULT 0,
  debt            NUMERIC(14,2) DEFAULT 0,
  debt_status     VARCHAR(24) DEFAULT 'none',
  paid_on         DATE,
  hours_credited  NUMERIC(8,2) DEFAULT 0,
  note            TEXT,
  archived        BOOLEAN DEFAULT FALSE,
  created_by      INTEGER,
  created_by_name VARCHAR(160),
  updated_by      INTEGER,
  updated_at      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bag_guest ON club_bag (guest_id, season);
