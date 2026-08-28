ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_name      VARCHAR(200);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_inn       VARCHAR(20);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_kpp       VARCHAR(20);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_address   VARCHAR(300);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_director  VARCHAR(200);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_director_short VARCHAR(80);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS base_place    VARCHAR(200);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS base_region   VARCHAR(200);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS agreement_no  VARCHAR(100);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS grounds       VARCHAR(200);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pay_card      VARCHAR(60);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS pay_day       VARCHAR(20);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS fee_monthly   NUMERIC(12,2) DEFAULT 6500;

UPDATE settings SET
  org_name           = COALESCE(org_name, 'ООО "Эксперт Плюс"'),
  org_inn            = COALESCE(org_inn, '7203302257'),
  org_kpp            = COALESCE(org_kpp, '720301001'),
  org_address        = COALESCE(org_address, 'г.Тюмень, ул.Урицкого 16-601'),
  org_director       = COALESCE(org_director, 'Алиферовой Виктории Александровны'),
  org_director_short = COALESCE(org_director_short, 'В.А. Алиферова'),
  base_place         = COALESCE(base_place, 'д. Малоскаредное'),
  base_region        = COALESCE(base_region, 'Аромашевский район тюм.обл.'),
  agreement_no       = COALESCE(agreement_no, '№ 245 от 30.12.2019'),
  grounds            = COALESCE(grounds, '"Кротовский", "Бобровский"'),
  pay_card           = COALESCE(pay_card, '4261 0126 5340 6083'),
  pay_day            = COALESCE(pay_day, '03'),
  fee_monthly        = COALESCE(fee_monthly, 6500)
WHERE id = 1;
