UPDATE map_layers SET visible = true WHERE id BETWEEN 2 AND 26;

UPDATE map_layers SET color = '#2563eb' WHERE name LIKE 'бобр%';
UPDATE map_layers SET color = '#16a34a' WHERE name LIKE 'крот%' OR name LIKE 'маршрутКрот%';
UPDATE map_layers SET color = '#9333ea' WHERE name LIKE 'вольер%';
