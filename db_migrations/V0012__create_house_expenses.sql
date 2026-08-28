CREATE TABLE IF NOT EXISTS house_expenses (
  id SERIAL PRIMARY KEY,
  category VARCHAR(40) NOT NULL DEFAULT 'other',
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

CREATE INDEX IF NOT EXISTS idx_house_exp_cat ON house_expenses(category);
CREATE INDEX IF NOT EXISTS idx_house_exp_date ON house_expenses(spent_on);
