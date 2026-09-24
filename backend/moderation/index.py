import json
import os

import psycopg2
import psycopg2.extras

SCHEMA = 't_p51170708_tablet_app_creation'
REPORTS = SCHEMA + '.content_reports'
BLOCKS = SCHEMA + '.user_blocks'
CLUB = SCHEMA + '.club_chat'
MSG = SCHEMA + '.messages'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

REASONS = {
    'spam': 'Спам или реклама',
    'abuse': 'Оскорбления и травля',
    'obscene': 'Нецензурная лексика',
    'illegal': 'Призывы к незаконным действиям',
    'personal': 'Чужие личные данные',
    'other': 'Другое',
}

MODERATORS = {'uan', 'una'}


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
        'SELECT s.id, s.name, s.login, s.role, s.guest_id, s.can_moderate FROM '
        + SCHEMA + '.sessions x '
        'JOIN ' + SCHEMA + '.staff s ON s.id = x.staff_id '
        'WHERE x.token = ' + esc(token) + ' AND x.expires_at > NOW() AND s.active = TRUE'
    )
    row = cur.fetchone()
    return dict(row) if row else None


def notify_owner(cur, user, reason, comment, target):
    guest_id = int(user.get('guest_id') or 0)
    if not guest_id:
        return

    lines = [
        'ЖАЛОБА НА СООБЩЕНИЕ',
        'Причина: ' + REASONS.get(reason, 'Другое'),
        'Автор сообщения: ' + (target.get('author_name') or 'неизвестен'),
        'Текст: ' + (target.get('body') or '')[:300],
    ]
    if comment:
        lines.append('Пояснение: ' + comment)
    lines.append('Разобрать — раздел «Жалобы на сообщения».')
    body = '\n'.join(lines)

    cur.execute(
        'INSERT INTO ' + SCHEMA + '.messages (guest_id, staff_id, author_name, '
        'from_staff, body, read_staff, read_guest, kind) VALUES ('
        + str(guest_id) + ', ' + str(int(user['id'])) + ', '
        + esc(user.get('name') or '') + ", FALSE, " + esc(body)
        + ", FALSE, TRUE, 'report')"
    )


def is_moderator(user):
    if (user.get('login') or '').lower() in MODERATORS:
        return True
    return bool(user.get('can_moderate'))


def fetch_target(cur, kind, target_id):
    if kind == 'club':
        cur.execute('SELECT staff_id, author_name, body FROM ' + CLUB
                    + ' WHERE id = ' + str(target_id))
    elif kind == 'chat':
        cur.execute('SELECT staff_id, author_name, body FROM ' + MSG
                    + ' WHERE id = ' + str(target_id))
    else:
        return None
    row = cur.fetchone()
    return dict(row) if row else None


def handler(event: dict, context) -> dict:
    """Жалобы на сообщения, блокировка участников и разбор жалоб руководством."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'blocks')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def close():
        cur.close()
        conn.close()

    if action == 'reasons':
        close()
        return reply(200, {'reasons': [{'id': k, 'label': v} for k, v in REASONS.items()]})

    user = current_user(cur, event)
    if not user:
        close()
        return reply(401, {'error': 'Нужен вход в приложение'})

    uid = int(user['id'])
    body = json.loads(event.get('body') or '{}')

    if action == 'report':
        kind = str(body.get('kind') or '')
        target_id = int(body.get('id') or 0)
        reason = str(body.get('reason') or 'other')
        comment = str(body.get('comment') or '')[:1000]

        if kind not in ('club', 'chat') or not target_id:
            close()
            return reply(400, {'error': 'Не указано сообщение'})
        if reason not in REASONS:
            reason = 'other'

        target = fetch_target(cur, kind, target_id)
        if not target:
            close()
            return reply(404, {'error': 'Сообщение не найдено'})

        cur.execute(
            'SELECT id FROM ' + REPORTS + ' WHERE reporter_id = ' + str(uid)
            + ' AND target_kind = ' + esc(kind) + ' AND target_id = ' + str(target_id)
        )
        if cur.fetchone():
            close()
            return reply(200, {'ok': True, 'already': True})

        cur.execute(
            'INSERT INTO ' + REPORTS + ' (reporter_id, reporter_name, target_kind, '
            'target_id, target_author_id, target_author_name, target_body, reason, comment) '
            'VALUES (' + str(uid) + ', ' + esc(user.get('name') or '') + ', '
            + esc(kind) + ', ' + str(target_id) + ', '
            + str(int(target.get('staff_id') or 0)) + ', '
            + esc(target.get('author_name') or '') + ', '
            + esc((target.get('body') or '')[:2000]) + ', '
            + esc(reason) + ', ' + esc(comment) + ')'
        )

        notify_owner(cur, user, reason, comment, target)

        close()
        return reply(200, {'ok': True})

    if action == 'block':
        target_staff = int(body.get('staffId') or 0)
        if not target_staff or target_staff == uid:
            close()
            return reply(400, {'error': 'Нельзя заблокировать самого себя'})

        cur.execute('SELECT name FROM ' + SCHEMA + '.staff WHERE id = ' + str(target_staff))
        row = cur.fetchone()
        if not row:
            close()
            return reply(404, {'error': 'Участник не найден'})

        cur.execute(
            'INSERT INTO ' + BLOCKS + ' (staff_id, blocked_staff_id, blocked_name) VALUES ('
            + str(uid) + ', ' + str(target_staff) + ', '
            + esc(dict(row).get('name') or '') + ') ON CONFLICT DO NOTHING'
        )
        close()
        return reply(200, {'ok': True})

    if action == 'unblock':
        target_staff = int(body.get('staffId') or 0)
        cur.execute('DELETE FROM ' + BLOCKS + ' WHERE staff_id = ' + str(uid)
                    + ' AND blocked_staff_id = ' + str(target_staff))
        close()
        return reply(200, {'ok': True})

    if action == 'blocks':
        cur.execute(
            'SELECT blocked_staff_id, blocked_name, created_at FROM ' + BLOCKS
            + ' WHERE staff_id = ' + str(uid) + ' ORDER BY created_at DESC'
        )
        items = [{
            'staffId': int(dict(r)['blocked_staff_id']),
            'name': dict(r).get('blocked_name') or '',
            'createdAt': dict(r).get('created_at'),
        } for r in cur.fetchall()]
        close()
        return reply(200, {'blocked': items})

    if action == 'delete_own':
        kind = str(body.get('kind') or '')
        target_id = int(body.get('id') or 0)
        table = CLUB if kind == 'club' else MSG if kind == 'chat' else None
        if not table or not target_id:
            close()
            return reply(400, {'error': 'Не указано сообщение'})
        cur.execute('SELECT staff_id FROM ' + table + ' WHERE id = ' + str(target_id))
        row = cur.fetchone()
        if not row:
            close()
            return reply(404, {'error': 'Сообщение не найдено'})
        if int(dict(row)['staff_id']) != uid and not is_moderator(user):
            close()
            return reply(403, {'error': 'Можно удалить только своё сообщение'})
        cur.execute('UPDATE ' + table + ' SET hidden = TRUE WHERE id = ' + str(target_id))
        close()
        return reply(200, {'ok': True})

    if not is_moderator(user):
        close()
        return reply(403, {'error': 'Раздел доступен руководству хозяйства'})

    if action == 'reports':
        cur.execute(
            'SELECT id, reporter_name, target_kind, target_id, target_author_id, '
            'target_author_name, target_body, reason, comment, status, resolved_by, '
            'created_at FROM ' + REPORTS + ' ORDER BY '
            "(status = 'new') DESC, created_at DESC LIMIT 200"
        )
        items = []
        for r in cur.fetchall():
            d = dict(r)
            items.append({
                'id': int(d['id']),
                'reporter': d.get('reporter_name') or '',
                'kind': d.get('target_kind') or '',
                'targetId': int(d.get('target_id') or 0),
                'authorId': int(d.get('target_author_id') or 0),
                'author': d.get('target_author_name') or '',
                'body': d.get('target_body') or '',
                'reason': REASONS.get(d.get('reason') or '', 'Другое'),
                'comment': d.get('comment') or '',
                'status': d.get('status') or 'new',
                'resolvedBy': d.get('resolved_by') or '',
                'createdAt': d.get('created_at'),
            })
        close()
        return reply(200, {'reports': items})

    if action == 'resolve':
        report_id = int(body.get('id') or 0)
        verdict = str(body.get('verdict') or 'kept')
        if not report_id:
            close()
            return reply(400, {'error': 'Не указана жалоба'})

        cur.execute('SELECT target_kind, target_id FROM ' + REPORTS
                    + ' WHERE id = ' + str(report_id))
        row = cur.fetchone()
        if not row:
            close()
            return reply(404, {'error': 'Жалоба не найдена'})

        if verdict == 'removed':
            d = dict(row)
            table = CLUB if d.get('target_kind') == 'club' else MSG
            cur.execute('UPDATE ' + table + ' SET hidden = TRUE WHERE id = '
                        + str(int(d.get('target_id') or 0)))

        cur.execute(
            'UPDATE ' + REPORTS + ' SET status = ' + esc(verdict) + ', resolved_by = '
            + esc(user.get('name') or '') + ', resolved_at = NOW() WHERE id = '
            + str(report_id)
        )
        close()
        return reply(200, {'ok': True})

    close()
    return reply(400, {'error': 'unknown action'})