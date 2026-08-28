CREATE TABLE IF NOT EXISTS activity_log (
  id           BIGSERIAL PRIMARY KEY,
  staff_id     INTEGER,
  staff_name   VARCHAR(160),
  action       VARCHAR(16) NOT NULL,
  table_name   VARCHAR(48) NOT NULL,
  row_id       INTEGER,
  title        VARCHAR(300),
  changes      JSONB,
  app          VARCHAR(24) DEFAULT 'core',
  ip           VARCHAR(64),
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_created ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_staff   ON activity_log (staff_id);
CREATE INDEX IF NOT EXISTS idx_log_table   ON activity_log (table_name, row_id);

ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_edit_others BOOLEAN DEFAULT FALSE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_remove      BOOLEAN DEFAULT FALSE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS app             VARCHAR(24) DEFAULT 'core';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone           VARCHAR(32);
