CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  farm_name VARCHAR(200) DEFAULT '',
  logo_url TEXT,
  configured BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO settings (id, farm_name, configured)
VALUES (1, '', FALSE)
ON CONFLICT (id) DO NOTHING;
