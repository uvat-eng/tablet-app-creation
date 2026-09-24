import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras

SALT = 'hb_salt_v1'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def esc(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def hash_password(raw: str) -> str:
    return hashlib.sha256((raw + SALT).encode()).hexdigest()


def handler(event: dict, context) -> dict:
    """Вход сотрудников хозяйства, проверка сессии и управление доступом."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'login')
    body = json.loads(event.get('body') or '{}')
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or body.get('token') or ''

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def close():
        cur.close()
        conn.close()

    def current_staff():
        if not token:
            return None
        cur.execute(
            "SELECT s.id, s.name, s.login, s.role, s.permissions, s.title, "
            "s.can_edit_others, s.can_remove, s.guest_id, s.can_approve_hunts, s.can_supply, s.password_changed, s.can_manage_access FROM sessions x "
            "JOIN staff s ON s.id = x.staff_id "
            "WHERE x.token = " + esc(token) + " AND x.expires_at > NOW() AND s.active = TRUE"
        )
        row = cur.fetchone()
        return dict(row) if row else None

    if action == 'login':
        login = str(body.get('login', '')).strip().lower()
        password = str(body.get('password', ''))
        role_claim = str(body.get('role', '')).strip()
        cur.execute(
            "SELECT id, name, login, role, permissions, title, can_edit_others, can_remove, "
            "guest_id, can_approve_hunts, can_supply, password_changed, can_manage_access, password_hash FROM staff "
            "WHERE lower(login) = " + esc(login) + " AND active = TRUE"
        )
        row = cur.fetchone()
        if not row or row['password_hash'] != hash_password(password):
            close()
            return {'statusCode': 401, 'headers': CORS,
                    'body': json.dumps({'error': 'Неверный логин или пароль'})}

        is_hunter_login = row['role'] == 'hunter'
        wants_hunter = role_claim == 'hunter'

        if role_claim and wants_hunter != is_hunter_login:
            close()
            msg = ('Это логин сотрудника хозяйства — выберите «Сотрудник хозяйства»'
                   if is_hunter_login is False
                   else 'Это логин охотника — выберите вход «Охотник»')
            return {'statusCode': 401, 'headers': CORS,
                    'body': json.dumps({'error': msg})}

        new_token = secrets.token_hex(24)
        expires = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        cur.execute(
            "INSERT INTO sessions (token, staff_id, expires_at) VALUES (" +
            esc(new_token) + ", " + str(row['id']) + ", " + esc(expires) + ")"
        )
        user = {'id': row['id'], 'name': row['name'], 'login': row['login'],
                'role': row['role'], 'permissions': row.get('permissions') or '',
                'title': row.get('title') or '',
                'can_edit_others': bool(row.get('can_edit_others')),
                'can_remove': bool(row.get('can_remove')),
                'guest_id': row.get('guest_id'),
                'can_approve_hunts': bool(row.get('can_approve_hunts')),
                'can_supply': bool(row.get('can_supply')),
                'password_changed': bool(row.get('password_changed')),
                'can_manage_access': bool(row.get('can_manage_access'))}
        close()
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'token': new_token, 'user': user})}

    if action == 'signup':
        name = str(body.get('name', '')).strip()
        phone = str(body.get('phone', '')).strip()
        city = str(body.get('city', '')).strip()
        login = str(body.get('login', '')).strip().lower()
        password = str(body.get('password', ''))

        if not name or not login or len(password) < 5:
            close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({
                'error': 'Заполните имя, логин и пароль от 5 символов'})}

        cur.execute("SELECT id FROM staff WHERE lower(login) = " + esc(login))
        if cur.fetchone():
            close()
            return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({
                'error': 'Такой логин уже занят — придумайте другой'})}

        cur.execute(
            "INSERT INTO guests (name, phone, city, club_member, self_signup) VALUES (" +
            esc(name) + ", " + esc(phone) + ", " + esc(city) + ", FALSE, TRUE) RETURNING id"
        )
        guest_id = cur.fetchone()['id']

        cur.execute(
            "INSERT INTO staff (login, name, password_hash, role, permissions, title, "
            "guest_id, can_edit_others, can_remove) VALUES (" +
            esc(login) + ", " + esc(name) + ", " + esc(hash_password(password)) +
            ", 'hunter', 'hunter', 'Охотник', " + str(guest_id) + ", FALSE, FALSE) "
            "RETURNING id, name, login, role, permissions, title, guest_id"
        )
        row = cur.fetchone()

        new_token = secrets.token_hex(24)
        expires = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        cur.execute(
            "INSERT INTO sessions (token, staff_id, expires_at) VALUES (" +
            esc(new_token) + ", " + str(row['id']) + ", " + esc(expires) + ")"
        )
        user = {'id': row['id'], 'name': row['name'], 'login': row['login'],
                'role': 'hunter', 'permissions': 'hunter', 'title': 'Охотник',
                'can_edit_others': False, 'can_remove': False,
                'guest_id': guest_id, 'can_approve_hunts': False, 'can_supply': False, 'password_changed': True, 'can_manage_access': False}
        close()
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'token': new_token, 'user': user})}

    if action == 'me':
        user = current_staff()
        close()
        if not user:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'no session'})}
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user': user})}

    if action == 'logout':
        if token:
            cur.execute("DELETE FROM sessions WHERE token = " + esc(token))
        close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    me = current_staff()

    if action == 'delete_account':
        if not me:
            close()
            return {'statusCode': 401, 'headers': CORS,
                    'body': json.dumps({'error': 'Сначала войдите в приложение'})}

        password = str(body.get('password', ''))
        reason = str(body.get('reason', ''))[:500]

        cur.execute("SELECT password_hash FROM staff WHERE id = " + str(int(me['id'])))
        row = cur.fetchone()
        if not row or row['password_hash'] != hash_password(password):
            close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Пароль введён неверно'})}

        if me['role'] != 'hunter':
            close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                'error': 'Учётные записи сотрудников закрывает руководство хозяйства'})}

        staff_id = int(me['id'])
        guest_id = int(me.get('guest_id') or 0)

        cur.execute(
            "INSERT INTO account_closures (staff_id, login, name, guest_id, reason) VALUES (" +
            str(staff_id) + ", " + esc(me.get('login') or '') + ", " +
            esc(me.get('name') or '') + ", " +
            (str(guest_id) if guest_id else 'NULL') + ", " + esc(reason) + ")"
        )

        cur.execute("UPDATE club_chat SET author_name = 'Удалённый пользователь' "
                    "WHERE staff_id = " + str(staff_id))
        cur.execute("UPDATE messages SET author_name = 'Удалённый пользователь' "
                    "WHERE staff_id = " + str(staff_id))

        if guest_id:
            cur.execute(
                "UPDATE guests SET name = 'Удалённый пользователь', phone = NULL, "
                "city = NULL, email = NULL, born_on = NULL, passport = NULL, "
                "passport_date = NULL, passport_issued = NULL, address = NULL, "
                "nationality = NULL, hunt_ticket = NULL, hunt_ticket_date = NULL, "
                "hunt_ticket_issued = NULL, roh_number = NULL, roh_date = NULL, "
                "roh_weapon = NULL, inn = NULL, snils = NULL, note = NULL, "
                "archived = TRUE, anonymized = TRUE, updated_at = NOW() "
                "WHERE id = " + str(guest_id)
            )
            cur.execute("DELETE FROM guest_docs WHERE guest_id = " + str(guest_id))

        cur.execute("DELETE FROM push_subs WHERE staff_id = " + str(staff_id))
        cur.execute("DELETE FROM user_blocks WHERE staff_id = " + str(staff_id) +
                    " OR blocked_staff_id = " + str(staff_id))
        cur.execute("DELETE FROM club_chat_reads WHERE staff_id = " + str(staff_id))
        cur.execute("DELETE FROM sessions WHERE staff_id = " + str(staff_id))
        cur.execute("DELETE FROM staff WHERE id = " + str(staff_id))

        close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'deleted': True})}

    if action == 'change_password':
        if not me:
            close()
            return {'statusCode': 401, 'headers': CORS,
                    'body': json.dumps({'error': 'Сначала войдите в приложение'})}

        old = str(body.get('old_password', ''))
        new = str(body.get('new_password', ''))

        if len(new) < 5:
            close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Новый пароль — не короче 5 символов'})}

        cur.execute("SELECT password_hash FROM staff WHERE id = " + str(int(me['id'])))
        row = cur.fetchone()
        if not row or row['password_hash'] != hash_password(old):
            close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Текущий пароль введён неверно'})}

        if hash_password(new) == row['password_hash']:
            close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Новый пароль совпадает со старым'})}

        cur.execute(
            "UPDATE staff SET password_hash = " + esc(hash_password(new)) +
            ", password_changed = TRUE, password_changed_at = NOW() WHERE id = " +
            str(int(me['id']))
        )
        cur.execute("DELETE FROM sessions WHERE staff_id = " + str(int(me['id'])) +
                    " AND token <> " + esc(token))
        close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    if action == 'hunter_access':
        if not me or me['role'] not in ('owner', 'manager'):
            close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Доступ выдаёт руководитель'})}

        if method != 'GET' and not me.get('can_manage_access'):
            close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                'error': 'Логины и пароли выдают только Усков А.Н. и Усков Н.А.'})}

        if method == 'GET':
            cur.execute("SELECT id, login, name, active, guest_id FROM staff "
                        "WHERE role = 'hunter' ORDER BY name")
            items = [dict(r) for r in cur.fetchall()]
            close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': items})}

        guest_id = int(body.get('guest_id') or 0)
        login = str(body.get('login', '')).strip().lower()
        password = str(body.get('password', ''))

        if not guest_id:
            close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Выберите охотника'})}

        cur.execute("SELECT id, name FROM guests WHERE id = " + str(guest_id))
        guest = cur.fetchone()
        if not guest:
            close()
            return {'statusCode': 404, 'headers': CORS,
                    'body': json.dumps({'error': 'Охотник не найден'})}

        cur.execute("SELECT id FROM staff WHERE guest_id = " + str(guest_id) +
                    " AND role = 'hunter'")
        existing = cur.fetchone()

        if method == 'DELETE':
            if existing:
                cur.execute("UPDATE staff SET active = FALSE WHERE id = " +
                            str(existing['id']))
                cur.execute("DELETE FROM sessions WHERE staff_id = " + str(existing['id']))
            close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if existing:
            sets = ['active = TRUE', 'name = ' + esc(guest['name'])]
            if password:
                sets.append('password_hash = ' + esc(hash_password(password)))
            if login:
                cur.execute("SELECT id FROM staff WHERE lower(login) = " + esc(login) +
                            " AND id <> " + str(existing['id']))
                if cur.fetchone():
                    close()
                    return {'statusCode': 409, 'headers': CORS,
                            'body': json.dumps({'error': 'Такой логин уже занят'})}
                sets.append('login = ' + esc(login))
            cur.execute("UPDATE staff SET " + ', '.join(sets) + " WHERE id = " +
                        str(existing['id']) +
                        " RETURNING id, login, name, active, guest_id")
            row = cur.fetchone()
            close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': dict(row)})}

        if not login or not password:
            close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Нужны логин и пароль'})}

        cur.execute(
            "INSERT INTO staff (login, name, password_hash, role, permissions, title, "
            "guest_id, can_edit_others, can_remove) VALUES (" +
            esc(login) + ", " + esc(guest['name']) + ", " + esc(hash_password(password)) +
            ", 'hunter', 'hunter', 'Член клуба', " + str(guest_id) + ", FALSE, FALSE) "
            "ON CONFLICT (login) DO NOTHING "
            "RETURNING id, login, name, active, guest_id"
        )
        row = cur.fetchone()
        close()
        if not row:
            return {'statusCode': 409, 'headers': CORS,
                    'body': json.dumps({'error': 'Такой логин уже занят'})}
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': dict(row)})}

    if action == 'access':
        if not me or not me.get('can_manage_access'):
            close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                'error': 'Пароли выдают только Усков А.Н. и Усков Н.А.'})}

        if method == 'GET':
            cur.execute(
                "SELECT s.id, s.name, s.login, s.role, s.title, s.active, s.guest_id, "
                "s.password_changed, s.password_changed_at, s.can_supply, "
                "s.can_approve_hunts, g.club_member "
                "FROM staff s LEFT JOIN guests g ON g.id = s.guest_id "
                "ORDER BY CASE s.role WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 "
                "WHEN 'staff' THEN 3 ELSE 4 END, s.name"
            )
            items = []
            for r in cur.fetchall():
                d = dict(r)
                if d.get('password_changed_at'):
                    d['password_changed_at'] = str(d['password_changed_at'])
                items.append(d)
            close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': items})}

        target = int(body.get('id') or 0)
        cur.execute("SELECT id, name, login, role FROM staff WHERE id = " + str(target))
        who = cur.fetchone()
        if not who:
            close()
            return {'statusCode': 404, 'headers': CORS,
                    'body': json.dumps({'error': 'Пользователь не найден'})}

        if method == 'PUT':
            new = str(body.get('new_password', ''))
            if len(new) < 5:
                close()
                return {'statusCode': 400, 'headers': CORS,
                        'body': json.dumps({'error': 'Пароль — не короче 5 символов'})}
            cur.execute(
                "UPDATE staff SET password_hash = " + esc(hash_password(new)) +
                ", password_changed = FALSE, password_changed_at = NULL, active = TRUE "
                "WHERE id = " + str(target)
            )
            cur.execute("DELETE FROM sessions WHERE staff_id = " + str(target))
            close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if method == 'POST':
            turn_on = bool(body.get('active'))
            if int(who['id']) == int(me['id']) and not turn_on:
                close()
                return {'statusCode': 400, 'headers': CORS,
                        'body': json.dumps({'error': 'Нельзя закрыть вход самому себе'})}
            cur.execute("UPDATE staff SET active = " + ('TRUE' if turn_on else 'FALSE') +
                        " WHERE id = " + str(target))
            if not turn_on:
                cur.execute("DELETE FROM sessions WHERE staff_id = " + str(target))
            close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        close()
        return {'statusCode': 405, 'headers': CORS,
                'body': json.dumps({'error': 'Метод не поддерживается'})}

    if not me or me['role'] != 'owner':
        close()
        return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'forbidden'})}

    if action == 'staff' and method == 'GET':
        cur.execute("SELECT id, login, name, title, role, active, permissions, "
                    "can_edit_others, can_remove FROM staff ORDER BY id")
        items = [dict(r) for r in cur.fetchall()]
        close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': items})}

    if action == 'staff' and method == 'POST':
        login = str(body.get('login', '')).strip().lower()
        name = str(body.get('name', '')).strip()
        password = str(body.get('password', ''))
        role = body.get('role', 'staff')
        if role == 'owner':
            role = 'manager'
        perms = body.get('permissions', '')
        title = body.get('title', '')
        if not login or not password:
            close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Нужны логин и пароль'})}
        cur.execute(
            "INSERT INTO staff (login, name, password_hash, role, permissions, title) VALUES (" +
            esc(login) + ", " + esc(name) + ", " + esc(hash_password(password)) + ", " +
            esc(role) + ", " + esc(perms) + ", " + esc(title) +
            ") ON CONFLICT (login) DO NOTHING "
            "RETURNING id, login, name, title, role, active, permissions"
        )
        row = cur.fetchone()
        close()
        if not row:
            return {'statusCode': 409, 'headers': CORS,
                    'body': json.dumps({'error': 'Такой логин уже есть'})}
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': dict(row)})}

    if action == 'staff' and method == 'PUT':
        staff_id = int(body.get('id', 0))
        sets = []
        if 'name' in body:
            sets.append('name = ' + esc(body['name']))
        if 'title' in body:
            sets.append('title = ' + esc(body['title']))
        if 'role' in body and body['role'] != 'owner':
            sets.append('role = ' + esc(body['role']))
        if 'permissions' in body:
            sets.append('permissions = ' + esc(body['permissions']))
        if 'active' in body:
            sets.append('active = ' + esc(bool(body['active'])))
        if 'can_edit_others' in body:
            sets.append('can_edit_others = ' + esc(bool(body['can_edit_others'])))
        if 'can_remove' in body:
            sets.append('can_remove = ' + esc(bool(body['can_remove'])))
        if body.get('password'):
            if not me.get('can_manage_access'):
                close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                    'error': 'Менять пароли могут только Усков А.Н. и Усков Н.А.'})}
            sets.append('password_hash = ' + esc(hash_password(str(body['password']))))
        if not staff_id or not sets:
            close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'bad request'})}
        cur.execute("UPDATE staff SET " + ', '.join(sets) + " WHERE id = " + str(staff_id) +
                    " RETURNING id, login, name, title, role, active, permissions, "
                    "can_edit_others, can_remove")
        row = cur.fetchone()
        close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': dict(row)})}

    if action == 'staff' and method == 'DELETE':
        staff_id = int(params.get('id', 0) or body.get('id', 0))
        if not staff_id:
            close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'id required'})}
        if staff_id == me['id']:
            close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Нельзя удалить самого себя'})}
        cur.execute("SELECT name FROM staff WHERE id = " + str(staff_id))
        row = cur.fetchone()
        if not row:
            close()
            return {'statusCode': 404, 'headers': CORS,
                    'body': json.dumps({'error': 'Сотрудник не найден'})}
        cur.execute("DELETE FROM sessions WHERE staff_id = " + str(staff_id))
        cur.execute("DELETE FROM staff WHERE id = " + str(staff_id))
        cur.execute(
            "INSERT INTO activity_log (staff_id, staff_name, action, table_name, row_id, "
            "title, app) VALUES (" + str(me['id']) + ", " + esc(me['name']) +
            ", 'delete', 'staff', " + str(staff_id) + ", " + esc(row['name']) + ", 'core')"
        )
        close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'deleted': staff_id})}

    close()
    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'unknown action'})}