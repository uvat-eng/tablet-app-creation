UPDATE t_p51170708_tablet_app_creation.bookings SET archived = true WHERE id IN (1,2,3,4,5,6);

UPDATE t_p51170708_tablet_app_creation.checks SET archived = true WHERE id IN (1,2);

UPDATE t_p51170708_tablet_app_creation.receipts SET archived = true WHERE check_id IN (1,2) OR check_id IS NULL;

UPDATE t_p51170708_tablet_app_creation.reviews SET archived = true WHERE id IN (1,2,3);

UPDATE t_p51170708_tablet_app_creation.trophies SET archived = true WHERE id IN (1,2,3);

UPDATE t_p51170708_tablet_app_creation.house_expenses SET archived = true WHERE id = 1;

UPDATE t_p51170708_tablet_app_creation.transfers SET archived = true;
