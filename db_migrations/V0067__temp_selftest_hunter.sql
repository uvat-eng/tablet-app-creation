INSERT INTO t_p51170708_tablet_app_creation.sessions (staff_id, token, expires_at)
SELECT id, 'selftest-owner-token', NOW() + INTERVAL '20 minutes'
FROM t_p51170708_tablet_app_creation.staff
WHERE active = TRUE AND role = 'owner'
ORDER BY id LIMIT 1;