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

TABLES = {
    'bookings': ['guest_id', 'guest_name', 'guest_phone', 'object_id', 'date_from', 'date_to',
                 'people', 'status', 'source', 'total', 'paid', 'note', 'archived',
                 'country', 'hunt_type', 'payment_type', 'prepay'],
    'objects': ['kind', 'name', 'capacity', 'price', 'note', 'status', 'photo_url', 'archived'],
    'guests': ['name', 'phone', 'city', 'club_member', 'club_until', 'note', 'archived'],
    'services': ['name', 'category', 'price', 'unit', 'note', 'active', 'archived'],
    'trophies': ['species', 'taken_on', 'hunter', 'location', 'weight', 'note', 'photo_url',
                 'archived'],
    'locations': ['name', 'distance_km', 'area_ha', 'species', 'note', 'archived'],
    'reviews': ['author', 'city', 'rating', 'text', 'published', 'archived'],
    'booking_services': ['booking_id', 'service_id', 'name', 'price', 'qty'],
    'payments': ['booking_id', 'amount', 'method', 'paid_on', 'note'],
}

ORDER = {
    'bookings': 'date_from DESC',
    'objects': 'kind, id',
    'guests': 'id DESC',
    'services': 'category, id',
    'trophies': 'taken_on DESC NULLS LAST',
    'locations': 'distance_km',
    'reviews': 'id DESC',
    'booking_services': 'id',
    'payments': 'paid_on DESC, id DESC',
}

ARCHIVABLE = {'bookings', 'objects', 'guests', 'services', 'trophies', 'locations', 'reviews'}


def esc(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value).replace("'", "''")
    return "'" + text + "'"


def jsonable(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def rows_to_list(cur):
    return [{k: jsonable(v) for k, v in dict(r).items()} for r in cur.fetchall()]


def check_conflict(cur, body):
    object_id = body.get('object_id')
    date_from = body.get('date_from')
    date_to = body.get('date_to')
    status = body.get('status', 'new')
    if not object_id or not date_from or not date_to or status == 'cancelled':
        return None

    sql = (
        "SELECT b.id, b.guest_name, b.date_from, b.date_to, o.name AS object_name "
        "FROM bookings b LEFT JOIN objects o ON o.id = b.object_id "
        "WHERE b.object_id = " + str(int(object_id)) +
        " AND b.status <> 'cancelled'"
        " AND b.date_from < " + esc(date_to) +
        " AND b.date_to > " + esc(date_from)
    )
    if body.get('id'):
        sql += ' AND b.id <> ' + str(int(body['id']))
    sql += ' LIMIT 1'
    cur.execute(sql)
    found = cur.fetchone()
    if not found:
        return None
    return {k: jsonable(v) for k, v in dict(found).items()}


def recalc(cur, table, booking_id):
    if table not in ('booking_services', 'payments') or not booking_id:
        return
    bid = str(int(booking_id))
    cur.execute("SELECT COALESCE(SUM(price * qty), 0) AS s FROM booking_services "
                "WHERE booking_id = " + bid)
    services_sum = int(cur.fetchone()['s'])
    cur.execute("SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE booking_id = " + bid)
    paid_sum = int(cur.fetchone()['s'])

    cur.execute("SELECT b.date_from, b.date_to, COALESCE(o.price, 0) AS price "
                "FROM bookings b LEFT JOIN objects o ON o.id = b.object_id "
                "WHERE b.id = " + bid)
    row = cur.fetchone()
    stay = 0
    if row and row['date_from'] and row['date_to']:
        nights = max(1, (row['date_to'] - row['date_from']).days)
        stay = nights * int(row['price'] or 0)

    sets = 'paid = ' + str(paid_sum)
    if stay or services_sum:
        sets += ', total = ' + str(stay + services_sum)
    cur.execute("UPDATE bookings SET " + sets + " WHERE id = " + bid)


def handler(event: dict, context) -> dict:
    """Учёт охотхозяйства: брони, объекты, гости, услуги, трофеи, локации, отзывы."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    table = params.get('table', 'bookings')

    if table == 'settings':
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if method == 'GET':
            cur.execute("SELECT * FROM settings WHERE id = 1")
            row = cur.fetchone()
            item = {k: jsonable(v) for k, v in dict(row).items()} if row else {}
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': item})}

        body = json.loads(event.get('body') or '{}')
        sets = []
        for f in ('farm_name', 'logo_url', 'configured'):
            if f in body:
                sets.append(f + ' = ' + esc(body[f]))
        if not sets:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'no fields'})}
        cur.execute("UPDATE settings SET " + ', '.join(sets) +
                    ", updated_at = NOW() WHERE id = 1 RETURNING *")
        item = rows_to_list(cur)[0]
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': item})}

    if table not in TABLES:
        return {'statusCode': 400, 'headers': CORS,
                'body': json.dumps({'error': 'unknown table'})}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        show_archived = params.get('archived') == '1'
        where = []
        if table in ARCHIVABLE and not show_archived:
            where.append('archived = FALSE')
        if params.get('booking_id') and table in ('booking_services', 'payments'):
            where.append('booking_id = ' + str(int(params['booking_id'])))

        if table == 'bookings':
            cond = ' WHERE b.archived = FALSE' if not show_archived else ''
            cur.execute(
                "SELECT b.*, o.name AS object_name, o.kind AS object_kind "
                "FROM bookings b LEFT JOIN objects o ON o.id = b.object_id" + cond +
                " ORDER BY b.date_from DESC LIMIT 500"
            )
        else:
            sql = 'SELECT * FROM ' + table
            if where:
                sql += ' WHERE ' + ' AND '.join(where)
            sql += ' ORDER BY ' + ORDER[table] + ' LIMIT 500'
            cur.execute(sql)
        data = rows_to_list(cur)
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': data})}

    body = json.loads(event.get('body') or '{}')
    fields = TABLES[table]

    if table == 'bookings' and method in ('POST', 'PUT'):
        conflict = check_conflict(cur, body)
        if conflict:
            cur.close()
            conn.close()
            return {'statusCode': 409, 'headers': CORS,
                    'body': json.dumps({'error': 'conflict', 'conflict': conflict})}

    if method == 'POST':
        cols = [f for f in fields if f in body]
        sql = ('INSERT INTO ' + table + ' (' + ', '.join(cols) + ') VALUES (' +
               ', '.join(esc(body[c]) for c in cols) + ') RETURNING *')
        cur.execute(sql)
        item = rows_to_list(cur)[0]
        recalc(cur, table, item.get('booking_id'))
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': item})}

    if method == 'PUT':
        item_id = int(body.get('id', 0))
        sets = [f + ' = ' + esc(body[f]) for f in fields if f in body]
        if not item_id or not sets:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'id and fields required'})}
        cur.execute('UPDATE ' + table + ' SET ' + ', '.join(sets) +
                    ' WHERE id = ' + str(item_id) + ' RETURNING *')
        item = rows_to_list(cur)[0]
        recalc(cur, table, item.get('booking_id'))
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': item})}

    if method == 'DELETE':
        item_id = int(params.get('id', 0) or body.get('id', 0))
        if not item_id:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'id required'})}

        if table in ARCHIVABLE:
            cur.execute('UPDATE ' + table + ' SET archived = TRUE WHERE id = ' + str(item_id))
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'archived': item_id})}

        cur.execute('SELECT booking_id FROM ' + table + ' WHERE id = ' + str(item_id))
        row = cur.fetchone()
        booking_id = row['booking_id'] if row else None
        cur.execute('DELETE FROM ' + table + ' WHERE id = ' + str(item_id))
        recalc(cur, table, booking_id)
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'deleted': item_id})}

    cur.close()
    conn.close()
    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'method not allowed'})}