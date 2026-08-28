UPDATE staff SET login = 'uan', name = 'Усков Александр',   role = 'owner',
  permissions = 'all', can_edit_others = TRUE, can_remove = TRUE  WHERE login = 'uskov.a';
UPDATE staff SET login = 'spy', name = 'Спиричев Михаил',   role = 'owner',
  permissions = 'all', can_edit_others = TRUE, can_remove = TRUE  WHERE login = 'spirichev';
UPDATE staff SET login = 'una', name = 'Усков Николай',     role = 'owner',
  permissions = 'all', can_edit_others = TRUE, can_remove = TRUE  WHERE login = 'uskov.n';

UPDATE staff SET login = 'zna', name = 'Земеров Николай',   role = 'manager',
  permissions = 'dashboard,map,reviews,locations,transport,house,hotel,banya,trophies',
  can_edit_others = FALSE, can_remove = FALSE WHERE login = 'zemerov';
UPDATE staff SET login = 'tgw', name = 'Тагильцев Владимир', role = 'manager',
  permissions = 'dashboard,map,reviews,locations,transport,house,hotel,banya,trophies',
  can_edit_others = FALSE, can_remove = FALSE WHERE login = 'tagiltsev';

INSERT INTO staff (login, name, password_hash, role, active, permissions,
                   can_edit_others, can_remove, app)
VALUES
 ('i',   'Ирина',            '6fbd90140e5f3faada50bc1f074fb6aae637cee324afa97b03f7396837451148',
  'manager', TRUE, 'dashboard,map,reviews,locations,transport,house,hotel,banya,trophies',
  FALSE, FALSE, 'core'),
 ('bda', 'Бадах Александр',  '6fbd90140e5f3faada50bc1f074fb6aae637cee324afa97b03f7396837451148',
  'manager', TRUE, 'dashboard,map,reviews,locations,transport,house,hotel,banya,trophies',
  FALSE, FALSE, 'core')
ON CONFLICT (login) DO UPDATE
  SET name = EXCLUDED.name, role = EXCLUDED.role, active = TRUE,
      permissions = EXCLUDED.permissions,
      can_edit_others = FALSE, can_remove = FALSE, app = 'core';

UPDATE staff SET active = FALSE WHERE login IN ('admin', 'eger');
