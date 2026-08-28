import json
import os
import secrets
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

ICS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/calendar; charset=utf-8',
    'Cache-Control': 'no-cache, max-age=0',
    'Content-Disposition': 'inline; filename="hunt.ics"',
}

STATUS_LABEL = {
    'new': 'новая',
    'confirmed': 'подтверждена',
    'arrived': 'заехали',
    'done': 'завершена',
    'cancelled': 'отменена',
}


def esc(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def ics_text(value):
    text = str(value or '')
    text = text.replace('\\', '\\\\').replace(';', r'\;').replace(',', r'\,')
    text = text.replace('\r\n', r'\n').replace('\n', r'\n')
    return text


def fold(line):
    raw = line.encode('utf-8')
    if len(raw) <= 73:
        return line
    out = []
    chunk = b''
    for ch in line:
        piece = ch.encode('utf-8')
        if len(chunk) + len(piece) > 73:
            out.append(chunk.decode('utf-8'))
            chunk = b' '
        chunk += piece
    out.append(chunk.decode('utf-8'))
    return '\r\n'.join(out)


def build_ics(rows, farm):
    stamp = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//' + ics_text(farm) + '//Бронирования//RU',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:' + ics_text(farm + ' — брони'),
        'X-WR-TIMEZONE:Asia/Yekaterinburg',
        'X-PUBLISHED-TTL:PT15M',
        'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    ]

    for b in rows:
        if not b.get('date_from') or not b.get('date_to'):
            continue

        start = b['date_from']
        end = b['date_to'] + timedelta(days=1)

        guest = b.get('guest_name') or 'Бронь'
        obj = b.get('object_name') or ''
        status = str(b.get('status') or 'new')
        people = b.get('people')

        summary = guest
        if obj:
            summary += ' · ' + obj
        if status == 'cancelled':
            summary = 'ОТМЕНА: ' + summary

        desc = []
        if people:
            desc.append('Гостей: ' + str(people))
        if b.get('guest_phone'):
            desc.append('Телефон: ' + str(b['guest_phone']))
        if b.get('hunt_type'):
            desc.append('Охота: ' + str(b['hunt_type']))
        desc.append('Статус: ' + STATUS_LABEL.get(status, status))
        if b.get('note'):
            desc.append(str(b['note']))

        lines += [
            'BEGIN:VEVENT',
            'UID:booking-' + str(b['id']) + '@malyshenskoe',
            'DTSTAMP:' + stamp,
            'DTSTART;VALUE=DATE:' + start.strftime('%Y%m%d'),
            'DTEND;VALUE=DATE:' + end.strftime('%Y%m%d'),
            fold('SUMMARY:' + ics_text(summary)),
            fold('DESCRIPTION:' + ics_text('\n'.join(desc))),
            'STATUS:' + ('CANCELLED' if status == 'cancelled' else 'CONFIRMED'),
            'TRANSP:TRANSPARENT',
            'SEQUENCE:' + str(int(b.get('seq') or 0)),
        ]
        if obj:
            lines.append(fold('LOCATION:' + ics_text(obj)))
        lines += [
            'BEGIN:VALARM',
            'TRIGGER:-P1D',
            'ACTION:DISPLAY',
            fold('DESCRIPTION:' + ics_text('Завтра заезд: ' + guest)),
            'END:VALARM',
            'END:VEVENT',
        ]

    lines.append('END:VCALENDAR')
    return '\r\n'.join(lines) + '\r\n'


def handler(event: dict, context) -> dict:
    """Календарь бронирований: ссылка-подписка для телефона в формате iCalendar."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    feed_token = params.get('feed', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def close():
        cur.close()
        conn.close()

    if feed_token:
        cur.execute("SELECT staff_id FROM calendar_feeds WHERE token = " + esc(feed_token))
        found = cur.fetchone()
        if not found:
            close()
            return {'statusCode': 404, 'headers': ICS_HEADERS,
                    'body': 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n'}

        cur.execute("UPDATE calendar_feeds SET last_read = NOW(), reads = reads + 1 "
                    "WHERE token = " + esc(feed_token))

        cur.execute(
            "SELECT b.id, b.guest_name, b.guest_phone, b.date_from, b.date_to, b.people, "
            "b.status, b.note, b.hunt_type, o.name AS object_name "
            "FROM bookings b LEFT JOIN objects o ON o.id = b.object_id "
            "WHERE b.archived = FALSE AND b.date_from IS NOT NULL "
            "ORDER BY b.date_from LIMIT 800"
        )
        rows = [dict(r) for r in cur.fetchall()]

        cur.execute("SELECT farm_name FROM settings WHERE id = 1")
        s = cur.fetchone()
        farm = (s or {}).get('farm_name') or 'Охотхозяйство'

        close()
        return {'statusCode': 200, 'headers': ICS_HEADERS, 'body': build_ics(rows, farm)}

    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''
    cur.execute(
        "SELECT s.id, s.name FROM sessions x JOIN staff s ON s.id = x.staff_id "
        "WHERE x.token = " + esc(token) + " AND x.expires_at > NOW() AND s.active = TRUE"
    )
    me = cur.fetchone()
    if not me:
        close()
        return {'statusCode': 401, 'headers': CORS,
                'body': json.dumps({'error': 'Нужен вход в систему'})}

    if method == 'POST' and params.get('action') == 'reset':
        cur.execute("DELETE FROM calendar_feeds WHERE staff_id = " + str(me['id']))
        found = None
    else:
        cur.execute("SELECT token, last_read, reads FROM calendar_feeds "
                    "WHERE staff_id = " + str(me['id']) + " ORDER BY created_at DESC LIMIT 1")
        found = cur.fetchone()

    if not found:
        new_token = secrets.token_urlsafe(18).replace('-', 'x').replace('_', 'y')
        cur.execute("INSERT INTO calendar_feeds (token, staff_id) VALUES (" +
                    esc(new_token) + ", " + str(me['id']) + ")")
        found = {'token': new_token, 'last_read': None, 'reads': 0}

    base = 'https://functions.poehali.dev/df783c40-9b19-4153-8aa3-7d77ca512ecf'
    close()
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
        'token': found['token'],
        'url': base + '?feed=' + found['token'],
        'last_read': found['last_read'].isoformat() if found.get('last_read') else None,
        'reads': found.get('reads') or 0,
    })}