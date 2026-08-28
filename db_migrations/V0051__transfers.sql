CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.transfers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  amount NUMERIC(12,2) DEFAULT 0,
  spent_on DATE,
  source VARCHAR(20) DEFAULT 'transfer',
  payer VARCHAR(255),
  recipient VARCHAR(255),
  section VARCHAR(30),
  target_id INTEGER,
  category VARCHAR(40),
  note TEXT,
  linked_table VARCHAR(40),
  linked_id INTEGER,
  archived BOOLEAN DEFAULT FALSE,
  created_by INTEGER,
  created_by_name VARCHAR(255),
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transfers_section ON t_p51170708_tablet_app_creation.transfers (section);
