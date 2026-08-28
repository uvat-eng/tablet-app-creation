CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.transport_expenses (
  id SERIAL PRIMARY KEY,
  object_id INTEGER,
  category VARCHAR(40) DEFAULT 'parts',
  name VARCHAR(255),
  unit_price NUMERIC(12,2) DEFAULT 0,
  qty NUMERIC(12,2) DEFAULT 1,
  unit VARCHAR(20) DEFAULT 'шт',
  total NUMERIC(12,2) DEFAULT 0,
  spent_on DATE,
  vendor VARCHAR(255),
  mileage VARCHAR(60),
  note TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_by INTEGER,
  created_by_name VARCHAR(255),
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transport_expenses_object ON t_p51170708_tablet_app_creation.transport_expenses (object_id);
