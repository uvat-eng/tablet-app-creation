import json
import os

import psycopg2
import psycopg2.extras

from pushsend import send_to

SCHEMA = 't_p51170708_tablet_app_creation'
CHAT = SCHEMA + '.club_chat'
READS = SCHEMA + '.club_chat_reads'

STAFF_ALLOWED = {'spy', 'uan', 'una', 'zna', 'tgw'}

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
        'SELECT s.id, s.name, s.login, s.role, s.guest_id FROM ' + SCHEMA + '.sessions x '
        'JOIN ' + SCHEMA + '.staff s ON s.id = x.staff_id '
        'WHERE x.token = ' + esc(token) + ' AND x.expires_at > NOW() AND s.active = TRUE'
    )
    row = cur.fetchone()
    return dict(row) if row else None


def allowed(cur, user):
    login = (user.get('login') or '').lower()
    if login in STAFF_ALLOWED:
        return True
    if user.get('role') != 'hunter':
        return False
    gid = int(user.get('guest_id') or 0)
    if not gid:
        return False
    cur.execute('SELECT club_member FROM ' + SCHEMA + '.guests WHERE id = ' + str(gid))
    g = cur.fetchone()
    return bool(g and dict(g).get('club_member'))


def push_club(cur, author_id, author_name, text):
    logins = ', '.join(esc(x) for x in STAFF_ALLOWED)
    cur.execute(
        'SELECT s.id FROM ' + SCHEMA + '.staff s '
        'LEFT JOIN ' + SCHEMA + '.guests g ON g.id = s.guest_id '
        'WHERE s.active = TRUE AND s.id <> ' + str(author_id) + ' AND ('
        'LOWER(s.login) IN (' + logins + ') OR '
        "(s.role = 'hunter' AND g.club_member = TRUE))"
    )
    ids = [int(dict(r)['id']) for r in cur.fetchall()]
    if not ids:
        return
    short = text if len(text) <= 90 else text[:90] + '…'
    try:
        send_to(cur, ids, 'Чат клуба', author_name + ': ' + short,
                '/club-chat', 'hb-club')
    except Exception:
        pass


def handler(event: dict, context) -> dict:
    """Общий чат закрытого клуба: сообщения членов клуба и руководства."""
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

    if not allowed(cur, user):
        close()
        return reply(403, {'error': 'Чат доступен только членам клуба'})

    uid = int(user['id'])
    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'list')

    if action == 'unread':
        cur.execute(
            'SELECT COUNT(*) AS n FROM ' + CHAT + ' c '
            'WHERE c.staff_id <> ' + str(uid) + ' AND c.id > '
            'COALESCE((SELECT last_read_id FROM ' + READS + ' WHERE staff_id = '
            + str(uid) + '), 0)'
        )
        n = int((cur.fetchone() or {}).get('n') or 0)
        close()
        return reply(200, {'unread': n})

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        text = str(body.get('body') or '').strip()[:4000]
        if not text:
            close()
            return reply(400, {'error': 'Пустое сообщение'})
        cur.execute(
            'INSERT INTO ' + CHAT + ' (staff_id, author_name, author_role, body) VALUES ('
            + str(uid) + ', ' + esc(user.get('name') or '') + ', '
            + esc(user.get('role') or '') + ', ' + esc(text) + ')'
        )
        push_club(cur, uid, user.get('name') or 'Участник', text)

    cur.execute(
        'SELECT id, staff_id, author_name, author_role, body, created_at FROM ' + CHAT
        + ' ORDER BY id DESC LIMIT 300'
    )
    rows = list(cur.fetchall())[::-1]

    items = []
    top = 0
    for r in rows:
        d = dict(r)
        mid = int(d['id'])
        top = max(top, mid)
        items.append({
            'id': mid,
            'staffId': int(d['staff_id']),
            'author': d.get('author_name') or '',
            'role': d.get('author_role') or '',
            'body': d.get('body') or '',
            'createdAt': d.get('created_at'),
            'me': int(d['staff_id']) == uid,
        })

    cur.execute(
        'SELECT COALESCE(last_read_id, 0) AS last FROM ' + READS
        + ' WHERE staff_id = ' + str(uid)
    )
    seen = cur.fetchone()
    last_read = int(dict(seen).get('last') or 0) if seen else 0

    if top:
        cur.execute(
            'INSERT INTO ' + READS + ' (staff_id, last_read_id, updated_at) VALUES ('
            + str(uid) + ', ' + str(top) + ', NOW()) '
            'ON CONFLICT (staff_id) DO UPDATE SET last_read_id = GREATEST('
            + READS + '.last_read_id, EXCLUDED.last_read_id), updated_at = NOW()'
        )

    close()
    return reply(200, {
        'messages': items,
        'lastReadId': last_read,
        'me': {'id': uid, 'name': user.get('name') or ''},
    })