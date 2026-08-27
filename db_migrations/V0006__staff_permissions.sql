ALTER TABLE staff ADD COLUMN IF NOT EXISTS permissions TEXT DEFAULT '';

UPDATE staff SET permissions = 'all' WHERE role = 'owner';
