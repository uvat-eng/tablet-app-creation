INSERT INTO t_p51170708_tablet_app_creation.staff
  (login, name, password_hash, role, permissions, title,
   can_edit_others, can_remove, can_approve_hunts, can_supply,
   can_manage_access, can_moderate, app, active, password_changed)
VALUES
  ('rustore', 'Проверка магазина',
   'bf3b639125b132ca87972090d941eef991de755c1fd901b0c3b0cf6c68682794',
   'staff', 'map,locations,trophies,reviews', 'Демо-доступ',
   false, false, false, false, false, false, 'core', true, false)
ON CONFLICT (login) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  permissions = EXCLUDED.permissions,
  title = EXCLUDED.title,
  active = true;