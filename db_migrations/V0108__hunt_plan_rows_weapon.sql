ALTER TABLE t_p51170708_tablet_app_creation.hunt_plan_rows
  ADD COLUMN IF NOT EXISTS weapon_key VARCHAR(24),
  ADD COLUMN IF NOT EXISTS weapon_name VARCHAR(200);