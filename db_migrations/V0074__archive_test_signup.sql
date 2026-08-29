-- Тестовые записи: отключаю доступ и убираю из выдачи
UPDATE staff SET active = FALSE
 WHERE login LIKE 'test%' AND role = 'hunter';

UPDATE guests SET archived = TRUE
 WHERE name = 'Тестовый Охотник' AND self_signup = TRUE;

UPDATE hunt_requests SET archived = TRUE, status = 'cancelled'
 WHERE hunter_name = 'Тестовый Охотник' AND note = 'тест';
