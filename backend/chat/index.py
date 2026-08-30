import json
import os

import psycopg2
import psycopg2.extras

SCHEMA = 't_p51170708_tablet_app_creation'
MSG = SCHEMA + '.messages'

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


def reply(code, payload):
    return {
        'statusCode': code,
        'headers': CORS,
        'isBase64Encoded': False,
        'body': json.dumps(payload, ensure_ascii=False, default=str),
    }


def current_user(cur, event):
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''
    if not token:
        return None
    cur.execute(
        'SELECT s.id, s.name, s.role, s.guest_id FROM ' + SCHEMA + '.sessions x '
        'JOIN ' + SCHEMA + '.staff s ON s.id = x.staff_id '
        'WHERE x.token = ' + esc(token) + ' AND x.expires_at > NOW() AND s.active = TRUE'
    )
    row = cur.fetchone()
    return dict(row) if row else None


def handler(event: dict, context) -> dict:
    """Личная переписка сотрудников хозяйства с охотниками."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def close():
        cur.close()
        conn.close()

    user = current_user(cur, event)
    if not user:
        close()
        return reply(401, {'error': 'Нужен вход в приложение'})

    is_hunter = user.get('role') == 'hunter'
    my_guest = int(user.get('guest_id') or 0)

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'thread')

    if is_hunter and not my_guest:
        close()
        return reply(403, {'error': 'Профиль охотника не найден'})

    if action == 'threads':
        if is_hunter:
            close()
            return reply(403, {'error': 'Недоступно'})
        cur.execute(
            'SELECT g.id AS guest_id, g.name, g.phone, g.club_member, '
            'COUNT(m.id) AS total, '
            'COUNT(m.id) FILTER (WHERE m.from_staff = FALSE AND m.read_staff = FALSE) AS unread, '
            'MAX(m.created_at) AS last_at, '
            "(ARRAY_AGG(m.body ORDER BY m.created_at DESC))[1] AS last_body, "
            "(ARRAY_AGG(m.from_staff ORDER BY m.created_at DESC))[1] AS last_mine "
            'FROM ' + SCHEMA + '.guests g '
            'JOIN ' + MSG + ' m ON m.guest_id = g.id '
            'GROUP BY g.id, g.name, g.phone, g.club_member '
            'ORDER BY MAX(m.created_at) DESC'
        )
        threads = []
        for r in cur.fetchall():
            d = dict(r)
            threads.append({
                'guestId': int(d['guest_id']),
                'name': d.get('name') or 'Без имени',
                'phone': d.get('phone') or '',
                'clubMember': bool(d.get('club_member')),
                'total': int(d.get('total') or 0),
                'unread': int(d.get('unread') or 0),
                'lastAt': d.get('last_at'),
                'lastBody': (d.get('last_body') or '')[:160],
                'lastMine': bool(d.get('last_mine')),
            })
        close()
        return reply(200, {'threads': threads})

    if action == 'unread':
        if is_hunter:
            cur.execute(
                'SELECT COUNT(*) AS n FROM ' + MSG + ' WHERE guest_id = ' + str(my_guest)
                + ' AND from_staff = TRUE AND read_guest = FALSE'
            )
        else:
            cur.execute(
                'SELECT COUNT(*) AS n FROM ' + MSG
                + ' WHERE from_staff = FALSE AND read_staff = FALSE'
            )
        n = int((cur.fetchone() or {}).get('n') or 0)
        close()
        return reply(200, {'unread': n})

    guest_id = my_guest if is_hunter else int(params.get('guest_id') or 0)
    if not guest_id:
        close()
        return reply(400, {'error': 'Не указан охотник'})

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        text = str(body.get('body') or '').strip()[:4000]
        if not text:
            close()
            return reply(400, {'error': 'Пустое сообщение'})
        cur.execute(
            'INSERT INTO ' + MSG
            + ' (guest_id, staff_id, author_name, from_staff, body, read_staff, read_guest) '
            + 'VALUES (' + str(guest_id) + ', ' + str(int(user['id'])) + ', '
            + esc(user.get('name') or '') + ', ' + esc(not is_hunter) + ', ' + esc(text)
            + ', ' + esc(is_hunter is False) + ', ' + esc(is_hunter) + ')'
        )

    if method == 'GET' or method == 'POST':
        if is_hunter:
            cur.execute(
                'UPDATE ' + MSG + ' SET read_guest = TRUE WHERE guest_id = ' + str(guest_id)
                + ' AND from_staff = TRUE AND read_guest = FALSE'
            )
        else:
            cur.execute(
                'UPDATE ' + MSG + ' SET read_staff = TRUE WHERE guest_id = ' + str(guest_id)
                + ' AND from_staff = FALSE AND read_staff = FALSE'
            )

    cur.execute(
        'SELECT id, staff_id, author_name, from_staff, body, read_guest, read_staff, '
        'created_at FROM ' + MSG + ' WHERE guest_id = ' + str(guest_id)
        + ' ORDER BY created_at ASC LIMIT 500'
    )
    items = []
    for r in cur.fetchall():
        d = dict(r)
        items.append({
            'id': int(d['id']),
            'author': d.get('author_name') or '',
            'fromStaff': bool(d.get('from_staff')),
            'body': d.get('body') or '',
            'readGuest': bool(d.get('read_guest')),
            'readStaff': bool(d.get('read_staff')),
            'createdAt': d.get('created_at'),
        })

    cur.execute('SELECT name FROM ' + SCHEMA + '.guests WHERE id = ' + str(guest_id))
    g = cur.fetchone()
    close()

    return reply(200, {
        'guestId': guest_id,
        'guestName': (dict(g).get('name') if g else '') or '',
        'messages': items,
    })
