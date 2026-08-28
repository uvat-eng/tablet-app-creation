UPDATE t_p51170708_tablet_app_creation.objects
SET name = 'Гостиница · 6 номеров', capacity = 10, price = 0
WHERE kind = 'hotel' AND id = 2;

UPDATE t_p51170708_tablet_app_creation.objects
SET status = 'archived'
WHERE kind = 'hotel' AND id IN (3, 4);

UPDATE t_p51170708_tablet_app_creation.objects
SET capacity = 10
WHERE kind = 'house';
