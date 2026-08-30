UPDATE t_p51170708_tablet_app_creation.staff
SET password_hash = 'disabled_after_test_' || id
WHERE id = 34 AND role = 'hunter';

UPDATE t_p51170708_tablet_app_creation.sessions
SET expires_at = NOW() - INTERVAL '1 day'
WHERE staff_id = 34;
