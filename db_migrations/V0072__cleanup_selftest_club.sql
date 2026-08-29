UPDATE t_p51170708_tablet_app_creation.club_bag SET archived = TRUE WHERE note = 'ТЕСТ клуб';
UPDATE t_p51170708_tablet_app_creation.staff SET active = FALSE WHERE login = 'selftest.hunter';
UPDATE t_p51170708_tablet_app_creation.sessions SET expires_at = NOW() - INTERVAL '1 day'
  WHERE token IN ('selftest-club-owner', 'selftest-club-hunter');