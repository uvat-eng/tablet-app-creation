UPDATE t_p51170708_tablet_app_creation.biotech_works SET archived = TRUE WHERE note = 'ТЕСТ доступа';
UPDATE t_p51170708_tablet_app_creation.locations SET archived = TRUE WHERE name LIKE 'ТЕСТ солонец%';
UPDATE t_p51170708_tablet_app_creation.staff SET active = FALSE WHERE login = 'selftest.hunter';
UPDATE t_p51170708_tablet_app_creation.sessions SET expires_at = NOW() - INTERVAL '1 day'
  WHERE token = 'selftest-owner-token'
     OR staff_id IN (SELECT id FROM t_p51170708_tablet_app_creation.staff WHERE login = 'selftest.hunter');