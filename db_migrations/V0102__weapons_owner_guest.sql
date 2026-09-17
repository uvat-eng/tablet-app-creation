ALTER TABLE t_p51170708_tablet_app_creation.weapons
  ADD COLUMN IF NOT EXISTS owner_guest_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_weapons_owner_guest
  ON t_p51170708_tablet_app_creation.weapons (owner_guest_id);