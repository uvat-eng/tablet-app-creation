-- Право выдавать и менять пароли: только Усков А.Н. (uan) и Усков Н.А. (una)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_manage_access BOOLEAN DEFAULT FALSE;

UPDATE staff SET can_manage_access = TRUE  WHERE login IN ('uan', 'una');
UPDATE staff SET can_manage_access = FALSE WHERE login NOT IN ('uan', 'una');
