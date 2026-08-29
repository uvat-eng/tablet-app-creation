ALTER TABLE t_p51170708_tablet_app_creation.expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE t_p51170708_tablet_app_creation.house_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE t_p51170708_tablet_app_creation.office_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE t_p51170708_tablet_app_creation.transfers ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE t_p51170708_tablet_app_creation.transport_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE t_p51170708_tablet_app_creation.payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;