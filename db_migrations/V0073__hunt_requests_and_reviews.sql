-- Заявки охотников на охоту (отдельно от админских броней)
CREATE TABLE IF NOT EXISTS hunt_requests (
    id SERIAL PRIMARY KEY,
    guest_id INTEGER,
    hunter_name TEXT,
    hunter_phone TEXT,
    date_from DATE,
    date_to DATE,
    people INTEGER DEFAULT 1,
    species TEXT,
    est_total INTEGER DEFAULT 0,
    extras TEXT,
    note TEXT,
    status TEXT DEFAULT 'pending',
    booking_id INTEGER,
    decided_by INTEGER,
    decided_by_name TEXT,
    decided_at TIMESTAMP,
    decline_reason TEXT,
    archived BOOLEAN DEFAULT FALSE,
    created_by INTEGER,
    created_by_name TEXT,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hunt_requests_guest ON hunt_requests(guest_id);
CREATE INDEX IF NOT EXISTS idx_hunt_requests_status ON hunt_requests(status);

-- Позиции заявки: вид дичи + количество, либо доп.услуга
CREATE TABLE IF NOT EXISTS hunt_request_items (
    id SERIAL PRIMARY KEY,
    request_id INTEGER,
    service_id INTEGER,
    kind TEXT DEFAULT 'license',
    name TEXT,
    price INTEGER DEFAULT 0,
    qty INTEGER DEFAULT 1,
    total INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hunt_request_items_req ON hunt_request_items(request_id);

-- Отзывы: привязка к автору-охотнику и модерация
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS guest_id INTEGER;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin';

-- Право одобрять заявки на охоту
ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_approve_hunts BOOLEAN DEFAULT FALSE;

-- Усков Александр и Спиричев Михаил — одобряют заявки
UPDATE staff SET can_approve_hunts = TRUE WHERE id IN (3, 4);

-- Простые охотники (не члены клуба) — самостоятельная регистрация
ALTER TABLE guests ADD COLUMN IF NOT EXISTS self_signup BOOLEAN DEFAULT FALSE;
