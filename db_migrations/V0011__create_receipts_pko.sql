CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  check_id INTEGER,
  booking_id INTEGER,
  number VARCHAR(32),
  issued_on DATE DEFAULT CURRENT_DATE,
  org_name VARCHAR(200),
  org_okpo VARCHAR(32),
  accepted_from VARCHAR(200),
  basis TEXT,
  amount INTEGER DEFAULT 0,
  amount_words TEXT,
  attachment TEXT,
  credit_account VARCHAR(32) DEFAULT '90',
  debit_account VARCHAR(32) DEFAULT '50',
  chief_accountant VARCHAR(120),
  cashier VARCHAR(120),
  note TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_check ON receipts(check_id);
CREATE INDEX IF NOT EXISTS idx_receipts_booking ON receipts(booking_id);
