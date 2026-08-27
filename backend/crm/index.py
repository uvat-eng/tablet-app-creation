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
                 'people', 'status', 'source', 'total', 'paid', 'note'],
    'objects': ['kind', 'name', 'capacity', 'price', 'note', 'status'],
    'guests': ['name', 'phone', 'city', 'club_member', 'club_until', 'note'],
    'services': ['name', 'category', 'price', 'unit', 'note', 'active'],
    'trophies': ['species', 'taken_on', 'hunter', 'location', 'weight', 'note', 'photo_url'],
    'locations': ['name', 'distance_km', 'area_ha', 'species', 'note'],
    'reviews': ['author', 'city', 'rating', 'text', 'published'],
}

ORDER = {
    'bookings': 'date_from DESC',
    'objects': 'kind, id',
    'guests': 'id DESC',
    'services': 'category, id',
    'trophies': 'taken_on DESC NULLS LAST',
    'locations': 'distance_km',
    'reviews': 'id DESC',
}


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


def handler(event: dict, context) -> dict:
    """Учёт охотхозяйства: брони, объекты, гости, услуги, трофеи, локации, отзывы."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    table = params.get('table', 'bookings')
    if table not in TABLES:
        return {'statusCode': 400, 'headers': CORS,
                'body': json.dumps({'error': 'unknown table'})}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        if table == 'bookings':
            cur.execute(
                "SELECT b.*, o.name AS object_name, o.kind AS object_kind "
                "FROM bookings b LEFT JOIN objects o ON o.id = b.object_id "
                "ORDER BY b.date_from DESC LIMIT 500"
            )
        else:
            cur.execute('SELECT * FROM ' + table + ' ORDER BY ' + ORDER[table] + ' LIMIT 500')
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
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': item})}

    cur.close()
    conn.close()
    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'method not allowed'})}