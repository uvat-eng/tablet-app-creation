ALTER TABLE locations ADD COLUMN IF NOT EXISTS photo_url2 TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS photo_url3 TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS seed_type VARCHAR(160);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS sow_date DATE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS boars INTEGER DEFAULT 0;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS roes INTEGER DEFAULT 0;

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS location_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_expenses_location ON expenses(location_id);

INSERT INTO locations (name, kind, area_ha, qty, unit, status, note, boars, roes)
SELECT 'Вольер', 'enclosure', 50, 50, 'га', 'ok', 'Вольерное содержание, площадь 50 га', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE kind = 'enclosure');
