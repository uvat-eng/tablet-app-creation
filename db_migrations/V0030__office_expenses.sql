CREATE TABLE IF NOT EXISTS office_expenses (
  id              SERIAL PRIMARY KEY,
  category        VARCHAR(32) NOT NULL,
  name            VARCHAR(300),
  period          VARCHAR(20),
  amount          NUMERIC(14,2) DEFAULT 0,
  spent_on        DATE,
  payer           VARCHAR(160),
  recipient       VARCHAR(200),
  doc_number      VARCHAR(80),
  note            TEXT,
  archived        BOOLEAN DEFAULT FALSE,
  created_by      INTEGER,
  created_by_name VARCHAR(160),
  updated_by      INTEGER,
  updated_at      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_office_date ON office_expenses (spent_on DESC);
CREATE INDEX IF NOT EXISTS idx_office_cat  ON office_expenses (category);
