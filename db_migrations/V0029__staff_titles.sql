ALTER TABLE staff ADD COLUMN IF NOT EXISTS title VARCHAR(80);

UPDATE staff SET title = 'Босс'                                  WHERE login = 'uan';
UPDATE staff SET title = 'Босс'                                  WHERE login = 'spy';
UPDATE staff SET title = 'Самый главный босс'                    WHERE login = 'una';
UPDATE staff SET title = 'Лесной босс'                           WHERE login = 'zna';
UPDATE staff SET title = 'Просто монстр'                         WHERE login = 'tgw';
UPDATE staff SET title = 'Директор базы'                         WHERE login = 'i';
UPDATE staff SET title = 'Хозяин трактора'                       WHERE login = 'bda';
