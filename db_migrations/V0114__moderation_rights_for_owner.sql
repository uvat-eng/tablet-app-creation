ALTER TABLE t_p51170708_tablet_app_creation.staff
  ADD COLUMN IF NOT EXISTS can_moderate BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE t_p51170708_tablet_app_creation.staff
  SET can_moderate = TRUE
  WHERE can_manage_access = TRUE;

UPDATE t_p51170708_tablet_app_creation.staff
  SET can_moderate = TRUE
  WHERE login = 'demostaff';

ALTER TABLE t_p51170708_tablet_app_creation.messages
  ADD COLUMN IF NOT EXISTS kind VARCHAR(30) NOT NULL DEFAULT 'text';
