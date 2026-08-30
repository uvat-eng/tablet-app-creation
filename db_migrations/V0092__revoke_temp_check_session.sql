UPDATE t_p51170708_tablet_app_creation.sessions
SET expires_at = NOW() - INTERVAL '1 day'
WHERE token = 'tmpcheck_una_weapon_2026';
