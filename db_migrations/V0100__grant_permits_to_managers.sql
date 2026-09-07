UPDATE t_p51170708_tablet_app_creation.staff
SET permissions = permissions || ',permits'
WHERE login IN ('zna', 'tgw')
  AND permissions NOT LIKE '%permits%';