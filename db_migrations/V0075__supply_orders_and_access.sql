-- Новые пароли сотрудников
UPDATE staff SET password_hash = '6fbd90140e5f3faada50bc1f074fb6aae637cee324afa97b03f7396837451148' WHERE login = 'una';
UPDATE staff SET password_hash = 'd59aa6189e20cbaca436f84217c5c628f626fd523ba397e5b89e960ada907567' WHERE login = 'zna';
UPDATE staff SET password_hash = 'f72a63d15a1a15f4975fddad6c367a8200601c01d7facb76dde18fd31a03b947' WHERE login = 'spy';
UPDATE staff SET password_hash = 'd1a1cd82c0899a2ac105ea4e188e38530edf4bbb1dbb10f35553384069d04373' WHERE login = 'bda';
UPDATE staff SET password_hash = '7a585ad1a3d193029393b593103af7cfd2dbf942e51dae5356ab28bc3d1481ae' WHERE login = 'tgw';
UPDATE staff SET password_hash = 'bbf93f8ef061fcc6d32342b9d7e6f3a9536d5398a7a8038328b9e1299b1ba5d4' WHERE login = 'i';

-- Ирина: только бронирования, дом, гостиница, баня, трофеи, локации, карта и свои заказы
UPDATE staff SET permissions = 'bookings,house,hotel,banya,trophies,locations,map,supply-new'
 WHERE login = 'i';

-- Заявки на обеспечение хозяйства
CREATE TABLE IF NOT EXISTS supply_orders (
    id SERIAL PRIMARY KEY,
    title TEXT,
    facility TEXT,
    category TEXT,
    urgency TEXT DEFAULT 'normal',
    note TEXT,
    status TEXT DEFAULT 'new',
    planned_total INTEGER DEFAULT 0,
    spent_total INTEGER DEFAULT 0,
    bought_on DATE,
    bought_by INTEGER,
    bought_by_name TEXT,
    receipt_url TEXT,
    decline_reason TEXT,
    archived BOOLEAN DEFAULT FALSE,
    created_by INTEGER,
    created_by_name TEXT,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supply_orders_status ON supply_orders(status);

-- Позиции заявки: что купить, сколько, на какой объект и сколько потратили
CREATE TABLE IF NOT EXISTS supply_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER,
    name TEXT,
    qty NUMERIC DEFAULT 1,
    unit TEXT DEFAULT 'шт',
    facility TEXT,
    est_price INTEGER DEFAULT 0,
    spent INTEGER DEFAULT 0,
    bought BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supply_items_order ON supply_items(order_id);

-- Кто видит и закрывает заявки снабжения: Усков А.Н., Усков Н.А., Спиричев М.Ю., Земеров Н.А.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_supply BOOLEAN DEFAULT FALSE;
UPDATE staff SET can_supply = TRUE WHERE login IN ('uan', 'una', 'spy', 'zna');
