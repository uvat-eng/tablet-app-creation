import json
import os

import psycopg2
import psycopg2.extras
from pywebpush import webpush, WebPushException

SCHEMA = 't_p51170708_tablet_app_creation'
SUBS = SCHEMA + '.push_subs'

VAPID_PUBLIC = 'BPFHXC22HMXJGCCkIVdTyi6uoGJNfqrtfm-gCEqtC3uACBocakGiRwz6UfTDnb6AhJszz5OBMLzJDr5vnIy0Xa4'
CONTACT = 'mailto:info@malyshenskoe.ru'

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


def deliver(cur, staff_ids, title, body, url, tag):
    key = os.environ.get('VAPID_PRIVATE_KEY', '')
    if not key or not staff_ids:
        return 0

    ids = ', '.join(str(int(i)) for i in staff_ids)
    cur.execute(
        'SELECT id, endpoint, p256dh, auth FROM ' + SUBS
        + ' WHERE staff_id IN (' + ids + ')'
    )
    rows = cur.fetchall()

    payload = json.dumps(
        {'title': title, 'body': body, 'url': url, 'tag': tag},
        ensure_ascii=False,
    )

    sent = 0
    dead = []
    for r in rows:
        d = dict(r)
        try:
            webpush(
                subscription_info={
                    'endpoint': d['endpoint'],
                    'keys': {'p256dh': d['p256dh'], 'auth': d['auth']},
                },
                data=payload,
                vapid_private_key=key,
                vapid_claims={'sub': CONTACT},
                timeout=8,
            )
            sent += 1
        except WebPushException as e:
            code = getattr(e.response, 'status_code', 0) if e.response is not None else 0
            if code in (404, 410):
                dead.append(int(d['id']))
        except Exception:
            pass

    if dead:
        cur.execute(
            'DELETE FROM ' + SUBS + ' WHERE id IN ('
            + ', '.join(str(i) for i in dead) + ')'
        )
    return sent


def handler(event: dict, context) -> dict:
    """Веб-уведомления: подписка устройств и отправка сообщений на телефоны."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'key')

    if action == 'key':
        return reply(200, {'publicKey': VAPID_PUBLIC})

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

    uid = int(user['id'])
    body = json.loads(event.get('body') or '{}')

    if action == 'subscribe' and method == 'POST':
        sub = body.get('subscription') or {}
        endpoint = str(sub.get('endpoint') or '')
        keys = sub.get('keys') or {}
        p256dh = str(keys.get('p256dh') or '')
        auth = str(keys.get('auth') or '')
        if not endpoint or not p256dh or not auth:
            close()
            return reply(400, {'error': 'Неполные данные подписки'})

        agent = str(body.get('agent') or '')[:300]
        cur.execute(
            'INSERT INTO ' + SUBS + ' (staff_id, endpoint, p256dh, auth, agent) VALUES ('
            + str(uid) + ', ' + esc(endpoint) + ', ' + esc(p256dh) + ', '
            + esc(auth) + ', ' + esc(agent) + ') '
            'ON CONFLICT (endpoint) DO UPDATE SET staff_id = EXCLUDED.staff_id, '
            'p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, agent = EXCLUDED.agent'
        )
        close()
        return reply(200, {'ok': True})

    if action == 'unsubscribe' and method == 'POST':
        endpoint = str(body.get('endpoint') or '')
        if endpoint:
            cur.execute('DELETE FROM ' + SUBS + ' WHERE endpoint = ' + esc(endpoint))
        close()
        return reply(200, {'ok': True})

    if action == 'test' and method == 'POST':
        n = deliver(cur, [uid], 'Малышенское', 'Уведомления работают', '/', 'hb-test')
        close()
        return reply(200, {'sent': n})

    if action == 'notify' and method == 'POST':
        targets = body.get('staffIds') or []
        title = str(body.get('title') or 'Малышенское')[:100]
        text = str(body.get('body') or '')[:300]
        url = str(body.get('url') or '/')[:200]
        tag = str(body.get('tag') or 'hb-msg')[:60]
        ids = [int(i) for i in targets if str(i).isdigit() and int(i) != uid]
        n = deliver(cur, ids, title, text, url, tag)
        close()
        return reply(200, {'sent': n})

    close()
    return reply(400, {'error': 'Неизвестное действие'})
