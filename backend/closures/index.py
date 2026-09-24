import json
import os

import psycopg2
import psycopg2.extras

SCHEMA = 't_p51170708_tablet_app_creation'
CLOSURES = SCHEMA + '.account_closures'
STAFF = SCHEMA + '.staff'
GUESTS = SCHEMA + '.guests'

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
        'SELECT s.id, s.name, s.login, s.role, s.can_manage_access FROM '
        + SCHEMA + '.sessions x JOIN ' + STAFF + ' s ON s.id = x.staff_id '
        'WHERE x.token = ' + esc(token) + ' AND x.expires_at > NOW() AND s.active = TRUE'
    )
    row = cur.fetchone()
    return dict(row) if row else None


def purge(cur, staff_id, guest_id):
    cur.execute("UPDATE " + SCHEMA + ".club_chat SET author_name = "
                "'Удалённый пользователь' WHERE staff_id = " + str(staff_id))
    cur.execute("UPDATE " + SCHEMA + ".messages SET author_name = "
                "'Удалённый пользователь' WHERE staff_id = " + str(staff_id))

    if guest_id:
        cur.execute(
            "UPDATE " + GUESTS + " SET name = 'Удалённый пользователь', phone = NULL, "
            "city = NULL, email = NULL, born_on = NULL, passport = NULL, "
            "passport_date = NULL, passport_issued = NULL, address = NULL, "
            "nationality = NULL, hunt_ticket = NULL, hunt_ticket_date = NULL, "
            "hunt_ticket_issued = NULL, roh_number = NULL, roh_date = NULL, "
            "roh_weapon = NULL, inn = NULL, snils = NULL, note = NULL, "
            "archived = TRUE, anonymized = TRUE, updated_at = NOW() "
            "WHERE id = " + str(guest_id)
        )
        cur.execute("DELETE FROM " + SCHEMA + ".guest_docs WHERE guest_id = "
                    + str(guest_id))

    cur.execute("DELETE FROM " + SCHEMA + ".push_subs WHERE staff_id = " + str(staff_id))
    cur.execute("DELETE FROM " + SCHEMA + ".user_blocks WHERE staff_id = " + str(staff_id)
                + " OR blocked_staff_id = " + str(staff_id))
    cur.execute("DELETE FROM " + SCHEMA + ".club_chat_reads WHERE staff_id = "
                + str(staff_id))
    cur.execute("DELETE FROM " + SCHEMA + ".sessions WHERE staff_id = " + str(staff_id))
    cur.execute("DELETE FROM " + STAFF + " WHERE id = " + str(staff_id))


def run_due(cur):
    cur.execute(
        "SELECT id, staff_id, guest_id FROM " + CLOSURES
        + " WHERE status = 'pending' AND purge_after <= NOW()"
    )
    rows = [dict(r) for r in cur.fetchall()]
    for r in rows:
        purge(cur, int(r['staff_id']), int(r.get('guest_id') or 0))
        cur.execute("UPDATE " + CLOSURES + " SET status = 'purged', purged_at = NOW() "
                    "WHERE id = " + str(int(r['id'])))
    return len(rows)


def handler(event: dict, context) -> dict:
    """Заявки на удаление учётных записей: список, восстановление и стирание по сроку."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def close():
        cur.close()
        conn.close()

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'list')

    done = run_due(cur)

    if action == 'cron':
        close()
        return reply(200, {'purged': done})

    user = current_user(cur, event)
    if not user:
        close()
        return reply(401, {'error': 'Нужен вход в приложение'})

    if not user.get('can_manage_access'):
        close()
        return reply(403, {'error': 'Раздел доступен только Ускову А.Н. и Ускову Н.А.'})

    if action == 'restore':
        body = json.loads(event.get('body') or '{}')
        closure_id = int(body.get('id') or 0)
        if not closure_id:
            close()
            return reply(400, {'error': 'Не указана заявка'})

        cur.execute("SELECT staff_id, name, status FROM " + CLOSURES
                    + " WHERE id = " + str(closure_id))
        row = cur.fetchone()
        if not row:
            close()
            return reply(404, {'error': 'Заявка не найдена'})

        d = dict(row)
        if d.get('status') != 'pending':
            close()
            return reply(400, {'error': 'Срок истёк — данные уже стёрты'})

        cur.execute("UPDATE " + STAFF + " SET active = TRUE, closing = FALSE WHERE id = "
                    + str(int(d['staff_id'])))
        cur.execute(
            "UPDATE " + CLOSURES + " SET status = 'restored', restored_by = "
            + esc(user.get('name') or '') + ", restored_at = NOW() WHERE id = "
            + str(closure_id)
        )
        close()
        return reply(200, {'ok': True, 'name': d.get('name') or ''})

    if action == 'purge_now':
        body = json.loads(event.get('body') or '{}')
        closure_id = int(body.get('id') or 0)
        cur.execute("SELECT staff_id, guest_id, status FROM " + CLOSURES
                    + " WHERE id = " + str(closure_id))
        row = cur.fetchone()
        if not row:
            close()
            return reply(404, {'error': 'Заявка не найдена'})
        d = dict(row)
        if d.get('status') != 'pending':
            close()
            return reply(400, {'error': 'Заявка уже обработана'})
        purge(cur, int(d['staff_id']), int(d.get('guest_id') or 0))
        cur.execute("UPDATE " + CLOSURES + " SET status = 'purged', purged_at = NOW() "
                    "WHERE id = " + str(closure_id))
        close()
        return reply(200, {'ok': True})

    cur.execute(
        "SELECT id, staff_id, login, name, guest_id, reason, status, closed_at, "
        "purge_after, restored_by, restored_at, purged_at, "
        "GREATEST(0, CEIL(EXTRACT(EPOCH FROM (purge_after - NOW())) / 86400)) AS days_left "
        "FROM " + CLOSURES + " ORDER BY (status = 'pending') DESC, closed_at DESC LIMIT 200"
    )
    items = []
    for r in cur.fetchall():
        d = dict(r)
        items.append({
            'id': int(d['id']),
            'login': d.get('login') or '',
            'name': d.get('name') or '',
            'reason': d.get('reason') or '',
            'status': d.get('status') or 'pending',
            'closedAt': d.get('closed_at'),
            'purgeAfter': d.get('purge_after'),
            'daysLeft': int(d.get('days_left') or 0),
            'restoredBy': d.get('restored_by') or '',
            'purgedAt': d.get('purged_at'),
        })

    close()
    return reply(200, {'items': items, 'purgedNow': done})
