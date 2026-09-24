ALTER TABLE t_p51170708_tablet_app_creation.account_closures
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS purge_after TIMESTAMP,
  ADD COLUMN IF NOT EXISTS restored_by VARCHAR(200) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS purged_at TIMESTAMP;

UPDATE t_p51170708_tablet_app_creation.account_closures
  SET purge_after = closed_at + INTERVAL '7 days'
  WHERE purge_after IS NULL;

CREATE INDEX IF NOT EXISTS account_closures_status_idx
  ON t_p51170708_tablet_app_creation.account_closures (status, purge_after);

ALTER TABLE t_p51170708_tablet_app_creation.staff
  ADD COLUMN IF NOT EXISTS closing BOOLEAN NOT NULL DEFAULT FALSE;
