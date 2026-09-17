CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.hunt_plans (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  date_from DATE,
  date_to DATE,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  note TEXT,
  owner_guest_id INTEGER,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  created_by INTEGER,
  created_by_name VARCHAR(160),
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.hunt_plan_rows (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL,
  hunter_name VARCHAR(200),
  keeper_name VARCHAR(200),
  keeper_id INTEGER,
  transport_id INTEGER,
  transport_name VARCHAR(160),
  location_id INTEGER,
  location_name VARCHAR(160),
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  created_by INTEGER,
  created_by_name VARCHAR(160),
  updated_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_hunt_plan_rows_plan
  ON t_p51170708_tablet_app_creation.hunt_plan_rows (plan_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_hunt_plans_owner
  ON t_p51170708_tablet_app_creation.hunt_plans (owner_guest_id);