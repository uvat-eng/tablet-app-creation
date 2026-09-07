-- Недостающие данные охотника для заявления в «Эксперт-Плюс»
ALTER TABLE guests ADD COLUMN IF NOT EXISTS email VARCHAR(160);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS passport_issued TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS hunt_ticket_issued TEXT;

-- Журнал выданных путёвок
CREATE TABLE IF NOT EXISTS permits (
    id SERIAL PRIMARY KEY,
    guest_id INTEGER,
    guest_name VARCHAR(200),
    ground VARCHAR(40) NOT NULL DEFAULT 'krotovsky',
    permit_no VARCHAR(60),
    apply_on DATE,
    date_from DATE,
    date_to DATE,
    species TEXT,
    total NUMERIC(12,2) DEFAULT 0,
    note TEXT,
    special_note TEXT,
    file_url TEXT,
    file_name VARCHAR(200),
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    created_by_name VARCHAR(120),
    updated_at TIMESTAMP,
    updated_by INTEGER
);

CREATE INDEX IF NOT EXISTS permits_guest_idx ON permits (guest_id);
CREATE INDEX IF NOT EXISTS permits_date_idx ON permits (date_from DESC);
