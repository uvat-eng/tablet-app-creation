ALTER TABLE t_p51170708_tablet_app_creation.staff ADD COLUMN IF NOT EXISTS guest_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_staff_guest ON t_p51170708_tablet_app_creation.staff(guest_id);
ALTER TABLE t_p51170708_tablet_app_creation.hunter_bag ADD COLUMN IF NOT EXISTS guest_id INTEGER;