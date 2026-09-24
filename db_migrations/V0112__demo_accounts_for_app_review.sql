INSERT INTO t_p51170708_tablet_app_creation.guests
  (name, phone, city, club_member, club_until, self_signup, country, fee_monthly, joined_on)
SELECT 'Демонстрационный охотник', '+7 900 000-00-00', 'Тюмень', TRUE,
       CURRENT_DATE + INTERVAL '2 years', TRUE, 'Россия', 0, CURRENT_DATE
WHERE NOT EXISTS (
  SELECT 1 FROM t_p51170708_tablet_app_creation.guests
  WHERE name = 'Демонстрационный охотник'
);

INSERT INTO t_p51170708_tablet_app_creation.staff
  (login, name, password_hash, role, permissions, title, guest_id,
   can_edit_others, can_remove, password_changed, active, closing)
SELECT 'demohunter', 'Демонстрационный охотник',
       '6df2546cce34397ebe47795b51dd39220c7662cac5da7671de599545143f7ff3',
       'hunter', 'hunter', 'Охотник',
       (SELECT id FROM t_p51170708_tablet_app_creation.guests
        WHERE name = 'Демонстрационный охотник' ORDER BY id LIMIT 1),
       FALSE, FALSE, TRUE, TRUE, FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM t_p51170708_tablet_app_creation.staff WHERE login = 'demohunter'
);

INSERT INTO t_p51170708_tablet_app_creation.staff
  (login, name, password_hash, role, permissions, title,
   can_edit_others, can_remove, password_changed, active, closing,
   can_approve_hunts, can_supply, can_manage_access)
SELECT 'demostaff', 'Демонстрационный сотрудник',
       '37640a18f56e32053f1fc0816efed0dab74753f94256c4dd7e02e15bff21f0ec',
       'manager',
       'dashboard,bookings,hunt-requests,checks,files,services,trophies,locations,map,reviews,club,hunters,biotech',
       'Администратор',
       FALSE, FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM t_p51170708_tablet_app_creation.staff WHERE login = 'demostaff'
);
