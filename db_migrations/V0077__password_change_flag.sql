-- Отметка о самостоятельной смене пароля
ALTER TABLE staff ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT FALSE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
