ALTER TABLE locations ADD COLUMN IF NOT EXISTS lat NUMERIC(10,6);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS lng NUMERIC(10,6);

UPDATE locations
SET lat = NULLIF(split_part(coords, ',', 1), '')::numeric,
    lng = NULLIF(split_part(coords, ',', 2), '')::numeric
WHERE coords ~ '^\s*-?\d+\.?\d*\s*,\s*-?\d+\.?\d*\s*$' AND lat IS NULL;

CREATE TABLE IF NOT EXISTS map_layers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  kind VARCHAR(24) NOT NULL DEFAULT 'track',
  color VARCHAR(16) DEFAULT '#ff5a1f',
  geojson JSONB,
  file_url TEXT,
  visible BOOLEAN DEFAULT TRUE,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
