INSERT INTO t_p51170708_tablet_app_creation.sessions (staff_id, token, expires_at)
SELECT id, 'selftest-act-token2', NOW() + INTERVAL '20 minutes'
FROM t_p51170708_tablet_app_creation.staff
WHERE active = TRUE AND role = 'owner'
ORDER BY id LIMIT 1;
UPDATE t_p51170708_tablet_app_creation.staff SET active = TRUE WHERE login = 'selftest.hunter';
UPDATE t_p51170708_tablet_app_creation.biotech_works SET archived = FALSE WHERE note = 'ТЕСТ доступа';
UPDATE t_p51170708_tablet_app_creation.locations SET archived = FALSE WHERE name LIKE 'ТЕСТ солонец%';