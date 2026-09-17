UPDATE t_p51170708_tablet_app_creation.weapons
SET owner_guest_id = 6
WHERE owner_guest_id IS NULL AND archived = FALSE;