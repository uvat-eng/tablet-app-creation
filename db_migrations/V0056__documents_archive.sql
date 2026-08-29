CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.documents (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(30) DEFAULT 'collective',
  title VARCHAR(300),
  file_url TEXT,
  file_name VARCHAR(300),
  doc_date DATE,
  guest_id INTEGER,
  people INTEGER DEFAULT 0,
  note TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_by INTEGER,
  created_by_name VARCHAR(255),
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_documents_kind ON t_p51170708_tablet_app_creation.documents (kind);