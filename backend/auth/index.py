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
            "SELECT s.id, s.name, s.login, s.role FROM sessions x "
            "JOIN staff s ON s.id = x.staff_id "
            "WHERE x.token = " + esc(token) + " AND x.expires_at > NOW() AND s.active = TRUE"
        )
        row = cur.fetchone()
        return dict(row) if row else None

    if action == 'login':
        login = str(body.get('login', '')).strip().lower()
        password = str(body.get('password', ''))
        cur.execute(
            "SELECT id, name, login, role, password_hash FROM staff "
            "WHERE lower(login) = " + esc(login) + " AND active = TRUE"
        )
        row = cur.fetchone()
        if not row or row['password_hash'] != hash_password(password):
            close()
            return {'statusCode': 401, 'headers': CORS,
                    'body': json.dumps({'error': 'Неверный логин или пароль'})}

        new_token = secrets.token_hex(24)
        expires = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        cur.execute(
            "INSERT INTO sessions (token, staff_id, expires_at) VALUES (" +
            esc(new_token) + ", " + str(row['id']) + ", " + esc(expires) + ")"
        )
        user = {'id': row['id'], 'name': row['name'], 'login': row['login'], 'role': row['role']}
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
    if not me or me['role'] != 'owner':
        close()
        return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'forbidden'})}

    if action == 'staff' and method == 'GET':
        cur.execute("SELECT id, login, name, role, active FROM staff ORDER BY id")
        items = [dict(r) for r in cur.fetchall()]
        close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': items})}

    if action == 'staff' and method == 'POST':
        login = str(body.get('login', '')).strip().lower()
        name = str(body.get('name', '')).strip()
        password = str(body.get('password', ''))
        role = body.get('role', 'staff')
        if not login or not password:
            close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Нужны логин и пароль'})}
        cur.execute(
            "INSERT INTO staff (login, name, password_hash, role) VALUES (" +
            esc(login) + ", " + esc(name) + ", " + esc(hash_password(password)) + ", " +
            esc(role) + ") ON CONFLICT (login) DO NOTHING RETURNING id, login, name, role, active"
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
        if 'role' in body:
            sets.append('role = ' + esc(body['role']))
        if 'active' in body:
            sets.append('active = ' + esc(bool(body['active'])))
        if body.get('password'):
            sets.append('password_hash = ' + esc(hash_password(str(body['password']))))
        if not staff_id or not sets:
            close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'bad request'})}
        cur.execute("UPDATE staff SET " + ', '.join(sets) + " WHERE id = " + str(staff_id) +
                    " RETURNING id, login, name, role, active")
        row = cur.fetchone()
        close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': dict(row)})}

    close()
    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'unknown action'})}
