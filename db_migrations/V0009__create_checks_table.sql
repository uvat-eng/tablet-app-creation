CREATE TABLE IF NOT EXISTS checks (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER,
  guest_name VARCHAR(160),
  guest_phone VARCHAR(40),
  hunt_type VARCHAR(160),
  people INTEGER DEFAULT 1,
  transport VARCHAR(120),
  date_from DATE,
  date_to DATE,
  plan_bag VARCHAR(120),
  items JSONB DEFAULT '[]'::jsonb,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  total INTEGER DEFAULT 0,
  licenses_total INTEGER DEFAULT 0,
  extras_total INTEGER DEFAULT 0,
  stay_total INTEGER DEFAULT 0,
  final_total INTEGER DEFAULT 0,
  hunted_by VARCHAR(120),
  calculated_by VARCHAR(120),
  accepted_by VARCHAR(120),
  note TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checks_booking ON checks(booking_id);
