INSERT INTO staff (login, name, password_hash, role, active, permissions, can_edit_others, can_remove, app)
VALUES
 ('uskov.a',   'Усков Александр',   '6fbd90140e5f3faada50bc1f074fb6aae637cee324afa97b03f7396837451148', 'owner',   TRUE, 'all', TRUE,  TRUE,  'core'),
 ('spirichev', 'Спиричев Михаил',   '6fbd90140e5f3faada50bc1f074fb6aae637cee324afa97b03f7396837451148', 'owner',   TRUE, 'all', TRUE,  TRUE,  'core'),
 ('uskov.n',   'Усков Николай',     '6fbd90140e5f3faada50bc1f074fb6aae637cee324afa97b03f7396837451148', 'manager', TRUE, 'all', FALSE, FALSE, 'core'),
 ('zemerov',   'Земеров Николай',   '6fbd90140e5f3faada50bc1f074fb6aae637cee324afa97b03f7396837451148', 'manager', TRUE, 'all', FALSE, FALSE, 'core'),
 ('tagiltsev', 'Тагильцев Владимир','6fbd90140e5f3faada50bc1f074fb6aae637cee324afa97b03f7396837451148', 'manager', TRUE, 'all', FALSE, FALSE, 'core')
ON CONFLICT (login) DO UPDATE
  SET name = EXCLUDED.name,
      role = EXCLUDED.role,
      active = TRUE,
      permissions = EXCLUDED.permissions,
      can_edit_others = EXCLUDED.can_edit_others,
      can_remove = EXCLUDED.can_remove,
      app = 'core';

UPDATE staff SET can_edit_others = TRUE, can_remove = TRUE, app = 'core' WHERE login = 'admin';
UPDATE staff SET active = FALSE WHERE login = 'eger';
