-- Демо-доступу открываем только витринные разделы без сводки по данным.
UPDATE staff
SET permissions = 'map,locations,trophies,reviews'
WHERE login = 'rustore';
