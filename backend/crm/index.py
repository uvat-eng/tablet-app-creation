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
    'hunt_plans': ['title', 'date_from', 'date_to', 'status', 'note',
                   'owner_guest_id', 'archived'],
    'hunt_plan_rows': ['plan_id', 'hunter_name', 'keeper_name', 'keeper_id',
                       'transport_id', 'transport_name', 'location_id',
                       'location_name', 'note', 'sort_order', 'archived'],
    'guests': ['name', 'phone', 'city', 'club_member', 'club_until', 'note', 'archived',
               'born_on', 'passport', 'passport_date', 'address', 'contract_no', 'cert_type',
               'fee_monthly', 'joined_on', 'country', 'nationality', 'hunt_ticket',
               'hunt_ticket_date', 'roh_number', 'roh_date', 'roh_weapon',
               'email', 'passport_issued', 'hunt_ticket_issued', 'inn', 'snils'],
    'permits': ['guest_id', 'guest_name', 'ground', 'permit_no', 'apply_on', 'date_from',
                'date_to', 'species', 'total', 'note', 'special_note', 'file_url',
                'file_name', 'archived'],
    'hunter_bag': ['guest_id', 'species', 'qty', 'taken_on', 'season', 'location_id',
                   'place', 'trophy_note', 'photo_url', 'archived'],
    'guest_docs': ['guest_id', 'kind', 'title', 'doc_no', 'signed_on', 'valid_to',
                   'file_url', 'note', 'archived'],
    'work_photos': ['work_id', 'photo_url', 'shot_on', 'caption'],
    'club_fees': ['guest_id', 'year', 'month', 'amount', 'paid', 'paid_on', 'method', 'note'],
    'club_bag': ['guest_id', 'season', 'species', 'taken_on', 'mode', 'price', 'debt',
                 'debt_status', 'paid_on', 'hours_credited', 'note', 'archived'],
    'services': ['name', 'category', 'price', 'unit', 'note', 'active', 'archived',
                 'calc_mode', 'price_group', 'sort_order', 'season', 'in_check'],
    'trophies': ['species', 'taken_on', 'hunter', 'location', 'weight', 'note', 'photo_url',
                 'archived'],
    'locations': ['name', 'distance_km', 'area_ha', 'species', 'note', 'archived',
                  'kind', 'coords', 'status', 'qty', 'unit', 'checked_on', 'responsible',
                  'photo_url', 'photo_url2', 'photo_url3', 'seed_type', 'sow_date',
                  'boars', 'roes', 'lat', 'lng'],
    'map_layers': ['name', 'kind', 'color', 'geojson', 'file_url', 'visible', 'archived'],
    'reviews': ['author', 'city', 'rating', 'text', 'published', 'archived',
                'photo_url', 'left_on'],
    'booking_services': ['booking_id', 'service_id', 'name', 'price', 'qty'],
    'payments': ['booking_id', 'amount', 'method', 'paid_on', 'note', 'receipt_url'],
    'checks': ['booking_id', 'guest_name', 'guest_phone', 'hunt_type', 'people', 'transport',
               'date_from', 'date_to', 'plan_bag', 'items', 'discount_pct', 'total',
               'licenses_total', 'extras_total', 'stay_total', 'final_total',
               'hunted_by', 'calculated_by', 'accepted_by', 'note', 'archived'],
    'receipts': ['check_id', 'booking_id', 'number', 'issued_on', 'org_name', 'org_okpo',
                 'accepted_from', 'basis', 'amount', 'amount_words', 'attachment',
                 'credit_account', 'debit_account', 'chief_accountant', 'cashier',
                 'note', 'archived'],
    'house_expenses': ['facility', 'category', 'name', 'unit_price', 'qty', 'unit', 'total',
                       'spent_on', 'vendor', 'note', 'receipt_url', 'archived'],
    'expenses': ['kind', 'category', 'check_id', 'booking_id', 'location_id', 'name',
                 'unit_price', 'qty', 'unit', 'total', 'spent_on', 'vendor', 'note',
                 'receipt_url', 'archived'],
    'office_expenses': ['category', 'name', 'period', 'amount', 'spent_on', 'payer',
                        'recipient', 'doc_number', 'note', 'receipt_url', 'archived'],
    'biotech_works': ['guest_id', 'hunter_name', 'kind', 'location_id', 'place', 'work_on',
                      'hours', 'qty', 'unit', 'value_rub', 'status', 'note', 'photo_url',
                      'archived'],
    'weapons': ['name', 'kind', 'caliber', 'serial_no', 'roh_number', 'roh_date',
                'owner_name', 'owner_guest_id', 'sort_order', 'note', 'archived'],
    'weapon_acts': ['weapon_id', 'guest_id', 'act_date', 'hunt_from', 'hunt_to',
                    'receiver_name', 'receiver_roh', 'receiver_roh_date',
                    'receiver_weapon', 'file_url', 'archived'],
    'transfers': ['name', 'amount', 'spent_on', 'source', 'payer', 'recipient', 'section',
                  'target_id', 'category', 'note', 'linked_table', 'linked_id',
                  'receipt_url', 'archived'],
    'transport_expenses': ['object_id', 'category', 'name', 'unit_price', 'qty', 'unit',
                           'total', 'spent_on', 'vendor', 'mileage', 'note',
                           'receipt_url', 'archived'],
    'hunt_requests': ['guest_id', 'hunter_name', 'hunter_phone', 'date_from', 'date_to',
                      'people', 'species', 'est_total', 'extras', 'note', 'status',
                      'booking_id', 'decline_reason', 'archived'],
    'supply_orders': ['title', 'facility', 'category', 'urgency', 'note', 'status',
                      'planned_total', 'spent_total', 'bought_on', 'receipt_url',
                      'decline_reason', 'archived'],
    'supply_items': ['order_id', 'name', 'qty', 'unit', 'facility', 'est_price', 'spent',
                     'bought', 'note'],
    'hunt_request_items': ['request_id', 'service_id', 'kind', 'name', 'price', 'qty', 'total'],
    'documents': ['kind', 'title', 'file_url', 'file_name', 'doc_date', 'guest_id',
                  'people', 'note', 'archived'],
}

ORDER = {
    'bookings': 'date_from DESC',
    'objects': 'kind, id',
    'guests': 'id DESC',
    'services': 'sort_order, id',
    'trophies': 'taken_on DESC NULLS LAST',
    'locations': 'kind, id',
    'reviews': 'left_on DESC NULLS LAST, id DESC',
    'booking_services': 'id',
    'payments': 'paid_on DESC, id DESC',
    'checks': 'date_from DESC NULLS LAST, id DESC',
    'receipts': 'issued_on DESC NULLS LAST, id DESC',
    'house_expenses': 'spent_on DESC NULLS LAST, id DESC',
    'expenses': 'spent_on DESC NULLS LAST, id DESC',
    'map_layers': 'id',
    'office_expenses': 'spent_on DESC NULLS LAST, id DESC',
    'biotech_works': 'work_on DESC NULLS LAST, id DESC',
    'club_fees': 'year DESC, month',
    'club_bag': 'taken_on DESC NULLS LAST, id DESC',
    'hunter_bag': 'taken_on DESC NULLS LAST, id DESC',
    'guest_docs': 'signed_on DESC NULLS LAST, id DESC',
    'work_photos': 'shot_on DESC NULLS LAST, id DESC',
    'transport_expenses': 'spent_on DESC NULLS LAST, id DESC',
    'weapons': 'sort_order, id',
    'weapon_acts': 'act_date DESC NULLS LAST, id DESC',
    'transfers': 'spent_on DESC NULLS LAST, id DESC',
    'documents': 'created_at DESC, id DESC',
    'hunt_requests': 'created_at DESC, id DESC',
    'hunt_request_items': 'id',
    'supply_orders': 'created_at DESC, id DESC',
    'supply_items': 'id',
    'permits': 'date_from DESC NULLS LAST, id DESC',
    'hunt_plans': 'date_from DESC NULLS LAST, id DESC',
    'hunt_plan_rows': 'sort_order, id',
}

ARCHIVABLE = {'weapons', 'weapon_acts', 'hunt_plans', 'hunt_plan_rows',
              'bookings', 'objects', 'guests', 'services', 'trophies', 'locations', 'reviews',
              'checks', 'receipts', 'house_expenses', 'expenses', 'map_layers',
              'office_expenses', 'biotech_works', 'club_bag', 'hunter_bag', 'guest_docs',
              'transport_expenses', 'transfers', 'documents', 'hunt_requests', 'supply_orders',
              'permits'}

JSON_FIELDS = {'checks': {'items'}, 'map_layers': {'geojson'}}

AUTHORED = {'bookings', 'objects', 'guests', 'services', 'trophies', 'locations', 'map_layers',
            'reviews', 'checks', 'receipts', 'house_expenses', 'expenses', 'booking_services',
            'payments', 'office_expenses', 'biotech_works', 'club_bag', 'hunter_bag',
            'guest_docs', 'transport_expenses', 'transfers', 'documents',
            'hunt_requests', 'supply_orders', 'permits',
            'hunt_plans', 'hunt_plan_rows'}

DEMO_READ = {'locations', 'map_layers', 'objects', 'trophies', 'reviews', 'services'}

HUNTER_READ = {'locations', 'map_layers', 'biotech_works', 'work_photos', 'guests',
               'hunter_bag', 'guest_docs', 'documents', 'trophies', 'club_fees',
               'club_bag', 'services', 'hunt_requests', 'hunt_request_items', 'reviews',
               'weapons', 'weapon_acts', 'hunt_plans', 'hunt_plan_rows', 'objects'}

HUNTER_WRITE = {'locations', 'biotech_works', 'work_photos', 'guests', 'hunter_bag',
                'club_bag', 'hunt_requests', 'hunt_request_items', 'reviews',
                'weapons', 'hunt_plans', 'hunt_plan_rows'}

HUNTER_OWN_ONLY = {'biotech_works', 'hunter_bag', 'guest_docs', 'guests', 'documents',
                   'club_fees', 'club_bag', 'hunt_requests'}

OWN_WEAPON_KEY = {'weapons': 'owner_guest_id'}

CLUB_ONLY_WRITE = {'locations', 'biotech_works', 'work_photos', 'club_bag'}

CLUB_ONLY_READ = {'locations'}

PLAIN_HUNTER_LAYERS = ('boundary',)

HUNTER_LOCKED = {
    'club_bag': ('price', 'debt', 'debt_status', 'paid_on', 'hours_credited'),
    'guests': ('club_member', 'club_until', 'fee_monthly', 'archived'),
    'hunt_requests': ('status', 'booking_id', 'decline_reason', 'archived'),
    'reviews': ('published', 'archived'),
}

TITLE_FIELD = {
    'supply_orders': 'title', 'supply_items': 'name',
    'bookings': 'guest_name', 'objects': 'name', 'guests': 'name', 'services': 'name',
    'trophies': 'species', 'locations': 'name', 'map_layers': 'name', 'reviews': 'author',
    'checks': 'guest_name', 'receipts': 'number', 'house_expenses': 'name',
    'expenses': 'name', 'booking_services': 'name', 'payments': 'amount',
    'office_expenses': 'name',
    'biotech_works': 'hunter_name',
    'club_fees': 'note',
    'club_bag': 'species',
    'hunter_bag': 'species',
    'guest_docs': 'title',
    'work_photos': 'caption',
    'transport_expenses': 'name',
    'weapons': 'name',
    'weapon_acts': 'receiver_name',
    'transfers': 'name',
    'documents': 'title',
    'hunt_plans': 'title',
    'hunt_plan_rows': 'hunter_name',
}

TABLE_LABEL = {
    'bookings': 'Бронь', 'objects': 'Объект', 'guests': 'Гость', 'services': 'Услуга',
    'trophies': 'Трофей', 'locations': 'Локация', 'map_layers': 'Слой карты',
    'reviews': 'Отзыв', 'checks': 'Расчёт', 'receipts': 'Квитанция',
    'house_expenses': 'Расход по базе', 'expenses': 'Расход', 'settings': 'Настройки',
    'office_expenses': 'Офисный расход',
    'biotech_works': 'Биотехния',
    'club_fees': 'Взнос',
    'club_bag': 'Добыча члена клуба',
    'hunter_bag': 'Трофей охотника',
    'guest_docs': 'Документ охотника',
    'work_photos': 'Фото работы',
    'transport_expenses': 'Расход по технике',
    'hunt_plans': 'План охоты',
    'hunt_plan_rows': 'Строка плана охоты',
    'transfers': 'Перевод / личная карта',
    'documents': 'Готовый документ',
    'booking_services': 'Услуга в брони', 'payments': 'Платёж',
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


def field_value(table, field, value):
    if field in JSON_FIELDS.get(table, set()):
        return esc(json.dumps(value, ensure_ascii=False)) + '::jsonb'
    return esc(value)


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


def current_user(cur, event):
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''
    if not token:
        return None
    cur.execute(
        "SELECT s.id, s.name, s.role, s.can_edit_others, s.can_remove, s.guest_id, "
        "s.can_approve_hunts, s.can_supply, s.login "
        "FROM sessions x "
        "JOIN staff s ON s.id = x.staff_id "
        "WHERE x.token = " + esc(token) + " AND x.expires_at > NOW() AND s.active = TRUE"
    )
    row = cur.fetchone()
    return dict(row) if row else None


def write_log(cur, user, action, table, row_id, title, changes, ip):
    name = user['name'] if user else 'Неизвестный'
    uid = str(user['id']) if user else 'NULL'
    payload = esc(json.dumps(changes, ensure_ascii=False, default=str)) + '::jsonb' \
        if changes is not None else 'NULL'
    cur.execute(
        "INSERT INTO activity_log (staff_id, staff_name, action, table_name, row_id, "
        "title, changes, app, ip) VALUES (" + uid + ", " + esc(name) + ", " + esc(action) +
        ", " + esc(table) + ", " + (str(int(row_id)) if row_id else 'NULL') + ", " +
        esc(str(title)[:290] if title else None) + ", " + payload + ", 'core', " + esc(ip) + ")"
    )


def diff_fields(before, after, fields):
    out = {}
    for f in fields:
        if f not in after:
            continue
        old = before.get(f) if before else None
        new = after.get(f)
        if str(old) != str(new):
            out[f] = {'was': jsonable(old), 'now': jsonable(new)}
    return out


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
    ip = ((event.get('requestContext') or {}).get('identity') or {}).get('sourceIp', '')

    if table == 'activity_log':
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if method != 'GET':
            cur.close()
            conn.close()
            return {'statusCode': 405, 'headers': CORS,
                    'body': json.dumps({'error': 'журнал только для чтения'})}
        where = []
        if params.get('staff_id'):
            where.append('staff_id = ' + str(int(params['staff_id'])))
        if params.get('table_name'):
            where.append('table_name = ' + esc(params['table_name']))
        if params.get('action'):
            where.append('action = ' + esc(params['action']))
        if params.get('since'):
            where.append('created_at >= ' + esc(params['since']))
        sql = 'SELECT * FROM activity_log'
        if where:
            sql += ' WHERE ' + ' AND '.join(where)
        sql += ' ORDER BY created_at DESC, id DESC LIMIT ' + str(min(
            int(params.get('limit', 300) or 300), 1000))
        cur.execute(sql)
        data = rows_to_list(cur)
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': data})}

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
        for f in ('farm_name', 'logo_url', 'configured', 'org_name', 'org_inn', 'org_kpp',
                  'org_address', 'org_director', 'org_director_short', 'base_place',
                  'base_region', 'agreement_no', 'grounds', 'pay_card', 'pay_day',
                  'fee_monthly', 'org_full_name', 'org_ogrn', 'org_okved',
                  'org_address_fact', 'org_bank', 'org_rs', 'org_ks', 'org_bik'):
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

    viewer = current_user(cur, event)
    is_hunter = bool(viewer and viewer.get('role') == 'hunter')
    my_guest = int(viewer.get('guest_id') or 0) if viewer else 0
    mine_only = params.get('mine') == '1' and my_guest > 0
    own_weapon = bool(my_guest) and (is_hunter or mine_only)
    recipients = params.get('recipients') == '1' and bool(my_guest)

    is_club = False
    if is_hunter and my_guest:
        cur.execute("SELECT club_member FROM guests WHERE id = " + str(my_guest))
        g = cur.fetchone()
        is_club = bool(g and g.get('club_member'))

    if params.get('keepers') == '1' and table == 'guests' and method == 'GET':
        if not viewer:
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Раздел закрыт'})}
        cur.execute(
            "SELECT 'g' || id AS key, name, 'Член клуба' AS role_label "
            'FROM guests WHERE archived = FALSE AND club_member = TRUE '
            'UNION ALL '
            "SELECT 's' || id AS key, name, COALESCE(NULLIF(title, ''), 'Сотрудник') "
            'FROM staff WHERE active = TRUE AND role <> \'hunter\' '
            'ORDER BY name'
        )
        items = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'items': items}, default=str)}

    if recipients and table == 'guests' and method == 'GET':
        cur.execute(
            'SELECT id, name, club_member, hunt_ticket, roh_number, roh_date '
            'FROM guests WHERE archived = FALSE ORDER BY name'
        )
        items = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'items': items}, default=str)}

    if is_hunter:
        allowed = HUNTER_READ if method == 'GET' else HUNTER_WRITE
        if table not in allowed:
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Этот раздел доступен только хозяйству'})}
        if method == 'GET' and table in CLUB_ONLY_READ and not is_club:
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': []})}
        if method != 'GET' and table in CLUB_ONLY_WRITE and not is_club:
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                'error': 'Карта и локации доступны только для просмотра'})}
        if method == 'DELETE':
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Удалять записи может только хозяйство'})}

    if viewer and str(viewer.get('login') or '').lower() == 'rustore':
        if method != 'GET' or table not in DEMO_READ:
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                'error': 'Демонстрационный доступ — раздел закрыт'})}

    if table in ('weapons', 'weapon_acts'):
        boss = viewer and str(viewer.get('login') or '').lower() == 'uan'
        if not viewer or not (boss or own_weapon):
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Раздел закрыт'})}
        if own_weapon and not boss and method == 'DELETE':
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Удалять записи может только хозяйство'})}

    if table in ('supply_orders', 'supply_items'):
        if is_hunter or not viewer:
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Раздел закрыт'})}

    if method == 'GET':
        show_archived = params.get('archived') == '1'
        where = []
        if table == 'supply_orders' and not viewer.get('can_supply'):
            where.append('created_by = ' + str(int(viewer['id'])))
        if table == 'supply_items' and not viewer.get('can_supply'):
            where.append('order_id IN (SELECT id FROM supply_orders WHERE created_by = ' +
                         str(int(viewer['id'])) + ')')
        if table in ARCHIVABLE and not show_archived:
            where.append('archived = FALSE')
        if params.get('booking_id') and table in ('booking_services', 'payments', 'checks',
                                                  'receipts', 'expenses'):
            where.append('booking_id = ' + str(int(params['booking_id'])))
        if params.get('work_id') and table == 'work_photos':
            where.append('work_id = ' + str(int(params['work_id'])))
        if params.get('plan_id') and table == 'hunt_plan_rows':
            where.append('plan_id = ' + str(int(params['plan_id'])))
        if params.get('guest_id') and table in ('club_fees', 'club_bag', 'biotech_works',
                                                'hunter_bag', 'guest_docs'):
            where.append('guest_id = ' + str(int(params['guest_id'])))
        if is_hunter and not is_club and table == 'map_layers':
            kinds = ', '.join("'" + k + "'" for k in PLAIN_HUNTER_LAYERS)
            where.append('kind IN (' + kinds + ')')
        if (is_hunter or mine_only) and table in HUNTER_OWN_ONLY:
            key = 'id' if table == 'guests' else 'guest_id'
            where.append(key + ' = ' + str(my_guest or 0))
        if is_hunter and table == 'objects':
            where.append("kind = 'transport'")
        if own_weapon and not (viewer
                               and str(viewer.get('login') or '').lower() == 'uan'):
            if table in OWN_WEAPON_KEY:
                where.append(OWN_WEAPON_KEY[table] + ' = ' + str(my_guest))
            if table == 'weapon_acts':
                where.append('(guest_id = ' + str(my_guest) +
                             ' OR weapon_id IN (SELECT id FROM weapons WHERE '
                             'owner_guest_id = ' + str(my_guest) + '))')
        if params.get('year') and table == 'club_fees':
            where.append('year = ' + str(int(params['year'])))
        if params.get('season') and table == 'club_bag':
            where.append('season = ' + str(int(params['season'])))

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
            sql += ' ORDER BY ' + ORDER[table] + ' LIMIT 2000'
            cur.execute(sql)
        data = rows_to_list(cur)
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': data})}

    body = json.loads(event.get('body') or '{}')
    fields = TABLES[table]
    me = viewer

    if own_weapon and table == 'hunt_plans':
        if method == 'POST':
            body['owner_guest_id'] = my_guest
        else:
            body.pop('owner_guest_id', None)

    if own_weapon and table == 'weapons':
        if method == 'POST':
            body['owner_guest_id'] = my_guest
        else:
            cur.execute('SELECT owner_guest_id FROM weapons WHERE id = ' +
                        str(int(body.get('id') or 0)))
            row = cur.fetchone()
            if not row or int(row.get('owner_guest_id') or 0) != my_guest:
                cur.close()
                conn.close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                    'error': 'Можно менять только своё оружие'})}
            body.pop('owner_guest_id', None)

    if mine_only and not is_hunter:
        if table in ('biotech_works', 'hunter_bag', 'club_bag', 'hunt_requests', 'reviews'):
            body['guest_id'] = my_guest
        if table == 'reviews' and method == 'POST':
            body['source'] = 'hunter'
        if table == 'guests' and method == 'PUT':
            body['id'] = my_guest

    if is_hunter:
        if not my_guest:
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                'error': 'Ваш доступ не привязан к карточке охотника'})}
        if table in ('biotech_works', 'hunter_bag', 'club_bag', 'hunt_requests'):
            body['guest_id'] = my_guest
        if table == 'reviews':
            body['guest_id'] = my_guest
            body['source'] = 'hunter'
            body['published'] = False
        if table == 'hunt_requests' and method == 'POST':
            body['status'] = 'pending'
        if table == 'hunt_request_items':
            req_id = int(body.get('request_id') or 0)
            cur.execute("SELECT guest_id, status FROM hunt_requests WHERE id = " + str(req_id))
            own = cur.fetchone()
            if not own or int(own['guest_id'] or 0) != my_guest:
                cur.close()
                conn.close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                    'error': 'Можно менять только свою заявку'})}
            if str(own['status'] or '') != 'pending':
                cur.close()
                conn.close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                    'error': 'Заявку уже рассмотрели — менять нельзя'})}
        if table == 'guests':
            if method == 'POST' or int(body.get('id') or 0) != my_guest:
                cur.close()
                conn.close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                    'error': 'Можно менять только свою анкету'})}
        for locked in HUNTER_LOCKED.get(table, ()):
            body.pop(locked, None)

    if table in ('supply_orders', 'supply_items') and not viewer.get('can_supply'):
        if table == 'supply_orders':
            for locked in ('status', 'spent_total', 'bought_on', 'receipt_url',
                           'decline_reason', 'archived'):
                body.pop(locked, None)
            if method == 'PUT':
                cur.execute("SELECT created_by, status FROM supply_orders WHERE id = " +
                            str(int(body.get('id') or 0)))
                own = cur.fetchone()
                if not own or int(own['created_by'] or 0) != int(viewer['id']):
                    cur.close()
                    conn.close()
                    return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                        'error': 'Можно менять только свою заявку'})}
                if str(own['status'] or '') != 'new':
                    cur.close()
                    conn.close()
                    return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                        'error': 'Заявку уже взяли в работу — менять нельзя'})}
        else:
            for locked in ('spent', 'bought'):
                body.pop(locked, None)
            order_id = int(body.get('order_id') or 0)
            if order_id:
                cur.execute("SELECT created_by, status FROM supply_orders WHERE id = " +
                            str(order_id))
                own = cur.fetchone()
                if not own or int(own['created_by'] or 0) != int(viewer['id']):
                    cur.close()
                    conn.close()
                    return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                        'error': 'Можно менять только свою заявку'})}

    if table == 'hunt_requests' and method == 'PUT' and not is_hunter:
        new_status = str(body.get('status') or '')
        if new_status in ('approved', 'declined'):
            if not me or not me.get('can_approve_hunts'):
                cur.close()
                conn.close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                    'error': 'Одобрять заявки могут только Усков А.Н. и Спиричев М.Ю.'})}

    if table == 'bookings' and method in ('POST', 'PUT'):
        conflict = check_conflict(cur, body)
        if conflict:
            cur.close()
            conn.close()
            return {'statusCode': 409, 'headers': CORS,
                    'body': json.dumps({'error': 'conflict', 'conflict': conflict})}

    if method == 'POST':
        cols = [f for f in fields if f in body]
        vals = [field_value(table, c, body[c]) for c in cols]
        if table in AUTHORED and me:
            cols += ['created_by', 'created_by_name', 'updated_by', 'updated_at']
            vals += [str(me['id']), esc(me['name']), str(me['id']), 'NOW()']
        sql = ('INSERT INTO ' + table + ' (' + ', '.join(cols) + ') VALUES (' +
               ', '.join(vals) + ') RETURNING *')
        try:
            cur.execute(sql)
        except psycopg2.errors.NumericValueOutOfRange:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({
                'error': 'Слишком большое число в одном из полей. '
                         'Проверьте площадь, количество и координаты'})}
        except psycopg2.Error as err:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({
                'error': 'Не удалось сохранить: ' + str(err).split('\n')[0]})}
        item = rows_to_list(cur)[0]
        recalc(cur, table, item.get('booking_id'))
        write_log(cur, me, 'create', table, item.get('id'),
                  item.get(TITLE_FIELD.get(table, 'name')), None, ip)
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': item})}

    if method == 'PUT':
        item_id = int(body.get('id', 0))
        if not item_id:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'id required'})}

        cur.execute('SELECT * FROM ' + table + ' WHERE id = ' + str(item_id))
        found = cur.fetchone()
        before = {k: jsonable(v) for k, v in dict(found).items()} if found else {}
        if not found:
            cur.close()
            conn.close()
            return {'statusCode': 404, 'headers': CORS,
                    'body': json.dumps({'error': 'Запись не найдена'})}

        own_record = is_hunter and (
            (table == 'guests' and int(before.get('id') or 0) == my_guest)
            or (table in ('biotech_works', 'hunter_bag', 'club_bag')
                and int(before.get('guest_id') or 0) == my_guest)
        )

        if table in ('supply_orders', 'supply_items') and me and me.get('can_supply'):
            own_record = True

        if table in AUTHORED and me and not me.get('can_edit_others') and not own_record:
            owner_id = before.get('created_by')
            if owner_id and int(owner_id) != int(me['id']):
                cur.close()
                conn.close()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                    'error': 'Можно изменять только свои записи. Эту внёс ' +
                             str(before.get('created_by_name') or 'другой сотрудник')})}

        sets = [f + ' = ' + field_value(table, f, body[f]) for f in fields if f in body]
        if not sets:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'id and fields required'})}
        if table in AUTHORED and me:
            sets += ['updated_by = ' + str(me['id']), 'updated_at = NOW()']
        try:
            cur.execute('UPDATE ' + table + ' SET ' + ', '.join(sets) +
                        ' WHERE id = ' + str(item_id) + ' RETURNING *')
        except psycopg2.errors.NumericValueOutOfRange:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({
                'error': 'Слишком большое число в одном из полей. '
                         'Проверьте площадь, количество и координаты'})}
        except psycopg2.Error as err:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({
                'error': 'Не удалось сохранить: ' + str(err).split('\n')[0]})}
        item = rows_to_list(cur)[0]
        recalc(cur, table, item.get('booking_id'))
        changes = diff_fields(before, body, fields)
        write_log(cur, me, 'update', table, item_id,
                  item.get(TITLE_FIELD.get(table, 'name')), changes or None, ip)
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': item})}

    if method == 'DELETE':
        item_id = int(params.get('id', 0) or body.get('id', 0))
        if not item_id:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'id required'})}

        if me and not me.get('can_remove'):
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
                'error': 'Удалять записи могут только руководители'})}

        cur.execute('SELECT * FROM ' + table + ' WHERE id = ' + str(item_id))
        found = cur.fetchone()
        before = {k: jsonable(v) for k, v in dict(found).items()} if found else {}
        title = before.get(TITLE_FIELD.get(table, 'name'))

        if table in ARCHIVABLE:
            cur.execute('UPDATE ' + table + ' SET archived = TRUE WHERE id = ' + str(item_id))
            write_log(cur, me, 'archive', table, item_id, title, None, ip)
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'archived': item_id})}

        booking_id = before.get('booking_id')
        cur.execute('DELETE FROM ' + table + ' WHERE id = ' + str(item_id))
        recalc(cur, table, booking_id)
        write_log(cur, me, 'delete', table, item_id, title, before or None, ip)
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'deleted': item_id})}

    cur.close()
    conn.close()
    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'method not allowed'})}