-- Демо-доступ для модераторов магазина приложений.
-- Логин: rustore, пароль: RuStore2026
-- Роль обычного сотрудника с доступом только к витринным разделам.

INSERT INTO staff (login, name, password_hash, role, permissions, title, active,
                   can_edit_others, can_remove, can_approve_hunts, can_supply,
                   can_manage_access, password_changed, app)
VALUES ('rustore', 'Проверка магазина',
        'bf3b639125b132ca87972090d941eef991de755c1fd901b0c3b0cf6c68682794',
        'staff', 'dashboard,locations,map,trophies,reviews', 'Демо-доступ', TRUE,
        FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, 'core')
ON CONFLICT (login) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    permissions = EXCLUDED.permissions,
    role = EXCLUDED.role,
    active = TRUE;
