import json
import os

from pywebpush import webpush, WebPushException

SCHEMA = 't_p51170708_tablet_app_creation'
SUBS = SCHEMA + '.push_subs'
CONTACT = 'mailto:info@malyshenskoe.ru'


def esc(value):
    if value is None:
        return 'NULL'
    return "'" + str(value).replace("'", "''") + "'"


def send_to(cur, staff_ids, title, body, url, tag):
    key = os.environ.get('VAPID_PRIVATE_KEY', '')
    ids = [int(i) for i in staff_ids]
    if not key or not ids:
        return 0

    cur.execute(
        'SELECT id, endpoint, p256dh, auth FROM ' + SUBS
        + ' WHERE staff_id IN (' + ', '.join(str(i) for i in ids) + ')'
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
                timeout=6,
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
