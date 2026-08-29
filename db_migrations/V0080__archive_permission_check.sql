-- Убираю проверочные записи из выдачи
UPDATE locations SET archived = TRUE WHERE name = 'Проверка клуба';
UPDATE hunt_requests SET archived = TRUE, status = 'cancelled' WHERE hunter_name = 'Проверка';
UPDATE staff SET active = FALSE WHERE login LIKE 'chk%' AND role = 'hunter';
UPDATE guests SET archived = TRUE WHERE name = 'Проверка Прав' AND self_signup = TRUE;
