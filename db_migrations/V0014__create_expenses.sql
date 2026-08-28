CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(16) NOT NULL DEFAULT 'hunt',
  category VARCHAR(40) NOT NULL DEFAULT 'other',
  check_id INTEGER,
  booking_id INTEGER,
  name VARCHAR(200) NOT NULL,
  unit_price NUMERIC(12,2) DEFAULT 0,
  qty NUMERIC(12,2) DEFAULT 1,
  unit VARCHAR(32) DEFAULT 'шт',
  total NUMERIC(14,2) DEFAULT 0,
  spent_on DATE DEFAULT CURRENT_DATE,
  vendor VARCHAR(160),
  note TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_kind ON expenses(kind);
CREATE INDEX IF NOT EXISTS idx_expenses_check ON expenses(check_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(spent_on);
