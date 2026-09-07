UPDATE t_p51170708_tablet_app_creation.staff SET guest_id = 6 WHERE login = 'uan';
UPDATE t_p51170708_tablet_app_creation.staff SET guest_id = 7 WHERE login = 'una';
UPDATE t_p51170708_tablet_app_creation.staff SET guest_id = 8 WHERE login = 'spy';

UPDATE t_p51170708_tablet_app_creation.staff
SET active = FALSE
WHERE login IN ('uskovan', 'uskovna', 'spirichevmyu');