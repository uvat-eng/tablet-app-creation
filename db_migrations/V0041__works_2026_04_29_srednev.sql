INSERT INTO biotech_works (guest_id, hunter_name, kind, work_on, qty, unit, hours, status, note, photo_url)
VALUES (40, 'Среднёв Николай Григорьевич', 'salt', '2026-04-29', 3, 'шт', 5, 'done',
'Устройство солонцов в поваленных стволах: выборка корыт, закладка соли. Установлен аншлаг «Солонец» №25. Угодье Кротовский.',
'https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/bucket/e4e3eedc-9b6b-4b2b-b5f8-3d10ecee55f7.png');

INSERT INTO biotech_works (guest_id, hunter_name, kind, work_on, qty, unit, hours, status, note, photo_url)
VALUES (40, 'Среднёв Николай Григорьевич', 'gravel', '2026-04-29', 21, 'шт', 12, 'done',
'Устройство галечников для тетерева: покрышки заполнены гравийно-песчаной смесью, размещены по кромкам сосняка и колков. Установлен аншлаг «Галечник» №5. Угодье Кротовский.',
'https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/bucket/c493deed-925a-4a8e-b060-ad257b4b91d8.png');

INSERT INTO work_photos (work_id, photo_url, shot_on, caption)
SELECT w.id, v.url, '2026-04-29', v.cap FROM biotech_works w
JOIN (VALUES
 ('https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/bucket/e4e3eedc-9b6b-4b2b-b5f8-3d10ecee55f7.png','Солонец в поваленной берёзе: корыто заполнено солью'),
 ('https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/bucket/eade5217-e161-4b9b-ac9a-a34788d547f9.png','Аншлаг «Солонец» №25 на осине, угодье Кротовский')
) AS v(url, cap) ON TRUE
WHERE w.guest_id = 40 AND w.work_on = '2026-04-29' AND w.kind = 'salt';

INSERT INTO work_photos (work_id, photo_url, shot_on, caption)
SELECT w.id, v.url, '2026-04-29', v.cap FROM biotech_works w
JOIN (VALUES
 ('https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/bucket/901634a4-5ed4-47bd-9e83-b37646c37108.png','Галечник №5 у кромки сосняка: покрышка с гравием и аншлаг на столбе'),
 ('https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/bucket/c493deed-925a-4a8e-b060-ad257b4b91d8.png','Галечник для тетерева: покрышка заполнена гравийно-песчаной смесью')
) AS v(url, cap) ON TRUE
WHERE w.guest_id = 40 AND w.work_on = '2026-04-29' AND w.kind = 'gravel';
