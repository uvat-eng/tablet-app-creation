UPDATE t_p51170708_tablet_app_creation.objects SET archived = TRUE WHERE kind = 'transport' AND id IN (6,7,8,9);

INSERT INTO t_p51170708_tablet_app_creation.objects (kind, name, capacity, price, note, status, archived) VALUES
('transport', 'Трэкол серый', 6, 0, 'Вездеход на шинах низкого давления', 'active', FALSE),
('transport', 'Трэкол пятнистый', 6, 0, 'Вездеход на шинах низкого давления', 'active', FALSE),
('transport', 'УАЗ Батон', 8, 0, 'УАЗ-452, вахтовый развоз', 'active', FALSE),
('transport', 'УАЗ Хантер', 4, 0, 'Внедорожник', 'active', FALSE),
('transport', 'Квадроцикл Росомаха', 2, 0, 'Квадроцикл', 'active', FALSE),
('transport', 'Квадроцикл Атлет', 2, 0, 'Квадроцикл', 'active', FALSE),
('transport', 'Нива (Бадах)', 4, 0, 'Закреплена за Бадахом', 'active', FALSE),
('transport', 'УАЗ Патриот (Вова)', 5, 0, 'Закреплён за Вовой', 'active', FALSE),
('transport', 'Ниссан (Николай)', 5, 0, 'Закреплён за Николаем', 'active', FALSE),
('transport', 'Пожарная машина УРАЛ', 3, 0, 'Противопожарная техника', 'active', FALSE),
('transport', 'Трактор МТЗ-82.1', 2, 0, 'Посевы, покосы, хозработы', 'active', FALSE),
('transport', 'Трактор Т-70', 2, 0, 'Гусеничный трактор', 'active', FALSE),
('transport', 'Снегоход BRP (Коля)', 2, 0, 'Закреплён за Николаем', 'active', FALSE),
('transport', 'Снегоход Yamaha красный (Вова)', 2, 0, 'Закреплён за Вовой', 'active', FALSE),
('transport', 'Снегоход Буран', 2, 0, 'Утилитарный снегоход с санями', 'active', FALSE),
('transport', 'Снегоход Yamaha чёрный', 2, 0, 'Снегоход', 'active', FALSE),
('transport', 'Снегоход BRP жёлтый', 2, 0, 'Снегоход', 'active', FALSE),
('transport', 'Снегоход Альпина большой', 4, 0, 'Двухгусеничный, грузовой', 'active', FALSE);
