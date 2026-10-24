WITH g AS (
  INSERT INTO t_p51170708_tablet_app_creation.guests (name, country, club_member, created_by_name, note)
  SELECT 'Земеров Николай', 'Россия', FALSE, 'Система', 'Карточка сотрудника для раздела «Моё оружие»'
  WHERE NOT EXISTS (SELECT 1 FROM t_p51170708_tablet_app_creation.staff WHERE login = 'zna' AND guest_id IS NOT NULL)
  RETURNING id
)
UPDATE t_p51170708_tablet_app_creation.staff
SET guest_id = COALESCE((SELECT id FROM g), guest_id),
    permissions = 'dashboard,map,reviews,locations,transport,house,hotel,banya,trophies,hunters,biotech,permits,bookings,files,club,weapon-transfer'
WHERE login = 'zna';