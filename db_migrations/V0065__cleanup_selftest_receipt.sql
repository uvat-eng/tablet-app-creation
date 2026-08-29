UPDATE t_p51170708_tablet_app_creation.expenses SET archived = TRUE WHERE name LIKE 'ТЕСТ чек%';
UPDATE t_p51170708_tablet_app_creation.office_expenses SET archived = TRUE WHERE name LIKE 'ТЕСТ чек%';
UPDATE t_p51170708_tablet_app_creation.transfers SET archived = TRUE WHERE name LIKE 'ТЕСТ чек%';
UPDATE t_p51170708_tablet_app_creation.transport_expenses SET archived = TRUE WHERE name LIKE 'ТЕСТ чек%';
UPDATE t_p51170708_tablet_app_creation.house_expenses SET archived = TRUE WHERE name LIKE 'ТЕСТ чек%';
UPDATE t_p51170708_tablet_app_creation.sessions SET expires_at = NOW() - INTERVAL '1 day' WHERE token = 'selftest-receipt-token';