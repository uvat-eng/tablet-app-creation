import json
import os
from datetime import date, datetime
from decimal import Decimal

import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

TABLES = ['objects', 'guests', 'services', 'bookings', 'booking_services', 'payments',
          'checks', 'receipts', 'trophies', 'locations', 'map_layers', 'reviews',
          'house_expenses', 'expenses', 'office_expenses', 'settings']

RESTORE_ORDER = ['objects', 'guests', 'services', 'locations', 'map_layers', 'trophies',
                 'reviews', 'bookings', 'booking_services', 'payments', 'checks',
                 'receipts', 'house_expenses', 'expenses', 'office_expenses']

JSON_COLS = {'items', 'geojson'}

FORMAT = 'malyshenskoe-backup-v1'


def esc(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def jsonable(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def col_value(col, value):
    if value is None:
        return 'NULL'
    if col in JSON_COLS:
        return esc(json.dumps(value, ensure_ascii=False)) + '::jsonb'
    return esc(value)


def handler(event: dict, context) -> dict:
    """Резервная копия базы хозяйства: выгрузка в файл и восстановление из файла."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def close():
        cur.close()
        conn.close()

    cur.execute(
        "SELECT s.id, s.name, s.role, s.can_remove FROM sessions x "
        "JOIN staff s ON s.id = x.staff_id "
        "WHERE x.token = " + esc(token) + " AND x.expires_at > NOW() AND s.active = TRUE"
    )
    me = cur.fetchone()
    if not me:
        close()
        return {'statusCode': 401, 'headers': CORS,
                'body': json.dumps({'error': 'Нужен вход в систему'})}

    if not me['can_remove']:
        close()
        return {'statusCode': 403, 'headers': CORS,
                'body': json.dumps({'error': 'Резервные копии доступны только руководителям'})}

    if method == 'GET':
        data = {}
        counts = {}
        for t in TABLES:
            cur.execute('SELECT * FROM ' + t + ' ORDER BY id')
            rows = [{k: jsonable(v) for k, v in dict(r).items()} for r in cur.fetchall()]
            data[t] = rows
            counts[t] = len(rows)

        cur.execute("SELECT id, login, name, title, role, active, permissions, "
                    "can_edit_others, can_remove FROM staff ORDER BY id")
        data['staff'] = [{k: jsonable(v) for k, v in dict(r).items()} for r in cur.fetchall()]
        counts['staff'] = len(data['staff'])

        close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
            'format': FORMAT,
            'created_at': datetime.utcnow().isoformat(),
            'created_by': me['name'],
            'counts': counts,
            'total': sum(counts.values()),
            'data': data,
        }, ensure_ascii=False)}

    body = json.loads(event.get('body') or '{}')

    if body.get('format') != FORMAT:
        close()
        return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({
            'error': 'Это не файл резервной копии хозяйства'})}

    payload = body.get('data') or {}
    mode = body.get('mode', 'check')

    if mode == 'check':
        counts = {t: len(payload.get(t) or []) for t in TABLES if payload.get(t)}
        close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
            'ok': True, 'counts': counts, 'total': sum(counts.values()),
            'created_at': body.get('created_at'), 'created_by': body.get('created_by')})}

    restored = {}
    skipped = []

    for t in RESTORE_ORDER:
        rows = payload.get(t)
        if not rows:
            continue

        cur.execute('SELECT * FROM ' + t + ' LIMIT 0')
        allowed = {d[0] for d in cur.description}

        groups = {}
        for row in rows:
            cols = tuple(c for c in row.keys() if c in allowed)
            if cols:
                groups.setdefault(cols, []).append(row)

        done = 0
        for cols, batch in groups.items():
            updates = [c + ' = EXCLUDED.' + c for c in cols if c != 'id']
            tail = (' ON CONFLICT (id) DO UPDATE SET ' + ', '.join(updates)
                    if 'id' in cols and updates else ' ON CONFLICT DO NOTHING')
            head = 'INSERT INTO ' + t + ' (' + ', '.join(cols) + ') VALUES '

            for start in range(0, len(batch), 100):
                chunk = batch[start:start + 100]
                tuples = ['(' + ', '.join(col_value(c, r[c]) for c in cols) + ')' for r in chunk]
                try:
                    cur.execute(head + ', '.join(tuples) + tail)
                    done += len(chunk)
                except Exception as err:
                    conn.rollback()
                    skipped.append(t + ': ' + str(err)[:120])
        restored[t] = done

        if 'id' in allowed and done:
            try:
                cur.execute(
                    "SELECT setval(pg_get_serial_sequence(" + esc(t) + ", 'id'), "
                    "GREATEST(COALESCE((SELECT MAX(id) FROM " + t + "), 1), 1))"
                )
            except Exception:
                conn.rollback()

    if payload.get('settings'):
        s = payload['settings'][0] if isinstance(payload['settings'], list) else payload['settings']
        sets = []
        for f in ('farm_name', 'logo_url', 'configured'):
            if f in s:
                sets.append(f + ' = ' + esc(s[f]))
        if sets:
            try:
                cur.execute("UPDATE settings SET " + ', '.join(sets) + " WHERE id = 1")
                restored['settings'] = 1
            except Exception:
                conn.rollback()

    cur.execute(
        "INSERT INTO activity_log (staff_id, staff_name, action, table_name, title, changes, app) "
        "VALUES (" + str(me['id']) + ", " + esc(me['name']) + ", 'update', 'backup', "
        "'Восстановление из резервной копии', " +
        esc(json.dumps(restored, ensure_ascii=False)) + "::jsonb, 'core')"
    )

    close()
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
        'ok': True, 'restored': restored, 'total': sum(restored.values()),
        'skipped': skipped[:10]}, ensure_ascii=False)}