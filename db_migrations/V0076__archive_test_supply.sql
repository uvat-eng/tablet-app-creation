-- Убираю проверочные заявки снабжения из выдачи
UPDATE supply_orders SET archived = TRUE
 WHERE title IN ('Проверка химии', 'Цикл-проверка');
