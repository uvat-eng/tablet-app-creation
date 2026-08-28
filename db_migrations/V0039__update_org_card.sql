ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_full_name    VARCHAR(300);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_ogrn         VARCHAR(30);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_okved        VARCHAR(30);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_address_fact VARCHAR(300);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_bank         VARCHAR(200);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_rs           VARCHAR(40);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_ks           VARCHAR(40);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_bik          VARCHAR(20);

UPDATE settings SET
  org_name           = 'ООО "Эксперт-плюс"',
  org_full_name      = 'Общество с ограниченной ответственностью "Эксперт-плюс"',
  org_address        = '625003, Тюменская область, г.Тюмень, ул. Урицкого, дом № 16, офис 501',
  org_address_fact   = '625000, Тюменская область, г.Тюмень, ул.Челюскинцев, д.26, офис 503',
  org_director       = 'Спиричева Михаила Юрьевича',
  org_director_short = 'М.Ю. Спиричев',
  org_inn            = '7203302257',
  org_kpp            = '720301001',
  org_ogrn           = '1137232065816',
  org_okved          = '85.23',
  org_bank           = 'ООО «Банк Точка»',
  org_rs             = '40702810420000019463',
  org_ks             = '30101810745374525104',
  org_bik            = '044525104'
WHERE id = 1;
