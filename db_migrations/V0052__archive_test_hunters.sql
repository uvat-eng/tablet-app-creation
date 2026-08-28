UPDATE t_p51170708_tablet_app_creation.guests
SET archived = TRUE
WHERE id IN (27, 28, 29, 30, 31, 32) AND club_member IS NOT TRUE;
