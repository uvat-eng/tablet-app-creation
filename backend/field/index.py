import json
import os
from datetime import datetime

import psycopg2
import psycopg2.extras

SCHEMA = 't_p51170708_tablet_app_creation'
TABLE = SCHEMA + '.field_positions'

STALE_MINUTES = 15
KEEP_MINUTES = 180

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


def num(value, default=None):
    try:
        if value is None or value == '':
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


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
        "SELECT s.id, s.name, s.role FROM " + SCHEMA + ".sessions x "
        "JOIN " + SCHEMA + ".staff s ON s.id = x.staff_id "
        "WHERE x.token = " + esc(token) + " AND x.expires_at > NOW() AND s.active = TRUE"
    )
    row = cur.fetchone()
    return dict(row) if row else None


def handler(event: dict, context) -> dict:
    """Обмен координатами между участниками в поле: кто где находится сейчас."""
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

    uid = int(user['id'])

    if method == 'DELETE':
        cur.execute("DELETE FROM " + TABLE + " WHERE staff_id = " + str(uid))
        close()
        return reply(200, {'ok': True, 'sharing': False})

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        lat = num(body.get('lat'))
        lng = num(body.get('lng'))
        if lat is None or lng is None:
            close()
            return reply(400, {'error': 'Нет координат'})

        sharing = bool(body.get('sharing', True))
        if not sharing:
            cur.execute("DELETE FROM " + TABLE + " WHERE staff_id = " + str(uid))
            close()
            return reply(200, {'ok': True, 'sharing': False})

        acc = int(num(body.get('accuracy'), 0) or 0)
        speed = num(body.get('speed'))
        heading = num(body.get('heading'))
        battery = body.get('battery')
        battery = int(battery) if isinstance(battery, (int, float)) else None
        sos = bool(body.get('sos'))
        note = str(body.get('note') or '')[:300]

        values = ', '.join([
            str(uid),
            esc(user.get('name') or ''),
            esc(user.get('role') or ''),
            esc(lat),
            esc(lng),
            str(acc),
            esc(speed),
            esc(heading),
            esc(battery),
            'TRUE',
            esc(sos),
            esc(note),
            'NOW()',
        ])
        sql = (
            'INSERT INTO ' + TABLE
            + ' (staff_id, name, role, lat, lng, accuracy, speed,'
            + ' heading, battery, sharing, sos, note, updated_at)'
            + ' VALUES (' + values + ')'
            + ' ON CONFLICT (staff_id) DO UPDATE SET'
            + ' name = EXCLUDED.name, role = EXCLUDED.role,'
            + ' lat = EXCLUDED.lat, lng = EXCLUDED.lng,'
            + ' accuracy = EXCLUDED.accuracy, speed = EXCLUDED.speed,'
            + ' heading = EXCLUDED.heading, battery = EXCLUDED.battery,'
            + ' sharing = TRUE, sos = EXCLUDED.sos, note = EXCLUDED.note,'
            + ' updated_at = NOW()'
        )
        cur.execute(sql)

    cur.execute(
        "DELETE FROM " + TABLE + " WHERE updated_at < NOW() - INTERVAL '"
        + str(KEEP_MINUTES) + " minutes'"
    )

    cur.execute(
        "SELECT staff_id, name, role, lat, lng, accuracy, speed, heading, battery, sos, note, "
        "EXTRACT(EPOCH FROM (NOW() - updated_at))::int AS age_sec "
        "FROM " + TABLE + " WHERE sharing = TRUE "
        "AND updated_at > NOW() - INTERVAL '" + str(STALE_MINUTES) + " minutes' "
        "ORDER BY sos DESC, updated_at DESC"
    )
    rows = cur.fetchall()
    close()

    people = []
    for r in rows:
        d = dict(r)
        people.append({
            'id': int(d['staff_id']),
            'name': d.get('name') or 'Без имени',
            'role': d.get('role') or '',
            'lat': float(d['lat']),
            'lng': float(d['lng']),
            'accuracy': int(d.get('accuracy') or 0),
            'speed': float(d['speed']) if d.get('speed') is not None else None,
            'heading': float(d['heading']) if d.get('heading') is not None else None,
            'battery': int(d['battery']) if d.get('battery') is not None else None,
            'sos': bool(d.get('sos')),
            'note': d.get('note') or '',
            'ageSec': int(d.get('age_sec') or 0),
            'me': int(d['staff_id']) == uid,
        })

    return reply(200, {'people': people, 'serverTime': datetime.utcnow().isoformat()})