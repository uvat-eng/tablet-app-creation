INSERT INTO t_p51170708_tablet_app_creation.sessions (staff_id, token, expires_at)
SELECT id, 'selftest-club-owner', NOW() + INTERVAL '20 minutes'
FROM t_p51170708_tablet_app_creation.staff
WHERE active = TRUE AND role = 'owner' ORDER BY id LIMIT 1;
UPDATE t_p51170708_tablet_app_creation.staff SET active = TRUE WHERE login = 'selftest.hunter';
INSERT INTO t_p51170708_tablet_app_creation.sessions (staff_id, token, expires_at)
SELECT id, 'selftest-club-hunter', NOW() + INTERVAL '20 minutes'
FROM t_p51170708_tablet_app_creation.staff WHERE login = 'selftest.hunter';