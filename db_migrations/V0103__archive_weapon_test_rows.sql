UPDATE t_p51170708_tablet_app_creation.weapons
SET archived = TRUE
WHERE serial_no IN ('TEST0001', 'T1');

UPDATE t_p51170708_tablet_app_creation.weapon_acts
SET archived = TRUE
WHERE weapon_id IN (
  SELECT id FROM t_p51170708_tablet_app_creation.weapons WHERE serial_no = 'TEST0001'
);