import base64
import io
import json
import os
import uuid

import boto3
import psycopg2
import psycopg2.extras
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from fonts_data import BLD_B64, REG_B64

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-User-Id',
    'Content-Type': 'application/json',
}

REG = 'OS'
BLD = 'OSB'
_fonts_ready = False


def setup_fonts():
    global _fonts_ready
    if _fonts_ready:
        return
    pdfmetrics.registerFont(TTFont(REG, io.BytesIO(base64.b64decode(REG_B64))))
    pdfmetrics.registerFont(TTFont(BLD, io.BytesIO(base64.b64decode(BLD_B64))))
    _fonts_ready = True


def esc(v):
    return "'" + str(v).replace("'", "''") + "'"


def current_user(cur, event):
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''
    if not token:
        return None
    cur.execute(
        "SELECT s.id, s.name, s.role, s.login FROM sessions x "
        "JOIN staff s ON s.id = x.staff_id "
        "WHERE x.token = " + esc(token) + " AND x.expires_at > NOW() AND s.active = TRUE"
    )
    row = cur.fetchone()
    return dict(row) if row else None


def ru_date(d):
    s = str(d or '')[:10]
    if len(s) != 10 or s[4] != '-':
        return s
    y, m, dd = s.split('-')
    return dd + '.' + m + '.' + y


def money(v):
    n = float(v or 0)
    whole = int(round(n))
    s = '{:,}'.format(whole).replace(',', ' ')
    return s + ' руб.'


UNITS = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
         'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать',
         'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят',
        'семьдесят', 'восемьдесят', 'девяносто']
HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот',
            'семьсот', 'восемьсот', 'девятьсот']


def trio(n, female=False):
    out = []
    if n >= 100:
        out.append(HUNDREDS[n // 100])
        n %= 100
    if n >= 20:
        out.append(TENS[n // 10])
        n %= 10
    if n:
        w = UNITS[n]
        if female and n == 1:
            w = 'одна'
        if female and n == 2:
            w = 'две'
        out.append(w)
    return ' '.join(x for x in out if x)


def plural(n, forms):
    n = abs(n) % 100
    if 11 <= n <= 19:
        return forms[2]
    n %= 10
    if n == 1:
        return forms[0]
    if 2 <= n <= 4:
        return forms[1]
    return forms[2]


def rub_words(v):
    total = int(round(float(v or 0)))
    if total == 0:
        return 'Ноль рублей 00 копеек'
    kop = int(round((float(v or 0) - total) * 100))
    mil, rest = divmod(total, 1000000)
    thou, ones = divmod(rest, 1000)
    parts = []
    if mil:
        parts.append(trio(mil) + ' ' + plural(mil, ['миллион', 'миллиона', 'миллионов']))
    if thou:
        parts.append(trio(thou, True) + ' ' + plural(thou, ['тысяча', 'тысячи', 'тысяч']))
    if ones:
        parts.append(trio(ones))
    text = ' '.join(parts).strip()
    text = text[:1].upper() + text[1:]
    return (text + ' ' + plural(total, ['рубль', 'рубля', 'рублей']) +
            ' ' + ('%02d' % kop) + ' ' + plural(kop, ['копейка', 'копейки', 'копеек']))


def clean(v):
    return ' '.join(str(v or '').replace('|', ' ').split())


def pay_payload(st, amount, purpose, payer, doc_no, doc_date):
    if not (clean(st.get('org_rs')) and clean(st.get('org_bik'))):
        return None
    kop = int(round(float(amount or 0) * 100))
    parts = [
        'ST00012',
        'Name=' + clean(st.get('org_name') or st.get('org_full_name'))[:80],
        'PersonalAcc=' + clean(st.get('org_rs')),
        'BankName=' + clean(st.get('org_bank'))[:45],
        'BIC=' + clean(st.get('org_bik')),
        'CorrespAcc=' + clean(st.get('org_ks')),
    ]
    if clean(st.get('org_inn')):
        parts.append('PayeeINN=' + clean(st.get('org_inn')))
    if clean(st.get('org_kpp')):
        parts.append('KPP=' + clean(st.get('org_kpp')))
    if kop > 0:
        parts.append('Sum=' + str(kop))
    parts.append('Purpose=' + clean(purpose)[:90])
    if clean(payer):
        parts.append('LastName=' + clean(payer)[:60])
    if clean(doc_no):
        parts.append('DocNo=' + clean(doc_no))
    if clean(doc_date):
        parts.append('DocDate=' + clean(doc_date))
    return '|'.join(parts)


def qr_image(payload):
    q = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M,
                      box_size=10, border=1)
    q.add_data(payload)
    q.make(fit=True)
    img = q.make_image(fill_color='black', back_color='white').convert('RGB')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf


class Sheet:
    """Лист А4 с автопереносом на новую страницу."""

    def __init__(self):
        setup_fonts()
        self.buf = io.BytesIO()
        self.c = canvas.Canvas(self.buf, pagesize=A4)
        self.w, self.h = A4
        self.left = 18 * mm
        self.right = self.w - 18 * mm
        self.y = self.h - 18 * mm

    def room(self, need):
        if self.y - need < 18 * mm:
            self.c.showPage()
            self.y = self.h - 18 * mm
            return True
        return False

    def text(self, s, size=9, font=REG, dy=4.6 * mm, x=None):
        self.room(dy)
        self.c.setFont(font, size)
        self.c.drawString(x if x is not None else self.left, self.y, str(s))
        self.y -= dy

    def center(self, s, size=13, font=BLD, dy=7 * mm):
        self.room(dy)
        self.c.setFont(font, size)
        self.c.drawCentredString(self.w / 2, self.y, str(s))
        self.y -= dy

    def right_text(self, s, size=8, font=REG):
        self.c.setFont(font, size)
        self.c.drawRightString(self.right, self.y, str(s))

    def gap(self, mm_v=4):
        self.y -= mm_v * mm

    def line(self):
        self.room(3 * mm)
        self.c.setLineWidth(0.5)
        self.c.line(self.left, self.y, self.right, self.y)
        self.y -= 3 * mm

    def wrap(self, s, size=9, font=REG, width=None):
        limit = width or (self.right - self.left)
        self.c.setFont(font, size)
        words = str(s).split()
        line = ''
        for wd in words:
            probe = (line + ' ' + wd).strip()
            if self.c.stringWidth(probe, font, size) > limit and line:
                self.text(line, size, font, 4.2 * mm)
                line = wd
            else:
                line = probe
        if line:
            self.text(line, size, font, 4.2 * mm)

    def row(self, cells, widths, size=8.5, font=REG, head=False, height=6.2 * mm):
        self.room(height)
        f = BLD if head else font
        self.c.setFont(f, size)
        x = self.left
        top = self.y + 4.2 * mm
        self.c.setLineWidth(0.4)
        for text, wd in zip(cells, widths):
            self.c.rect(x, self.y - 1.6 * mm, wd, height, stroke=1, fill=0)
            s = str(text)
            while self.c.stringWidth(s, f, size) > wd - 3 * mm and len(s) > 3:
                s = s[:-2]
            self.c.drawString(x + 1.5 * mm, self.y + 0.4 * mm, s)
            x += wd
        self.y -= height

    def signs(self, pairs):
        self.gap(6)
        self.room(len(pairs) * 8 * mm)
        for label, who in pairs:
            self.room(8 * mm)
            self.c.setFont(REG, 9)
            self.c.drawString(self.left, self.y, label)
            self.c.line(self.left + 42 * mm, self.y - 1 * mm, self.left + 90 * mm, self.y - 1 * mm)
            self.c.drawString(self.left + 95 * mm, self.y, str(who or ''))
            self.y -= 8 * mm

    def done(self):
        self.c.save()
        self.buf.seek(0)
        return self.buf.read()


def head_block(p, st, title, sub=''):
    p.c.setFont(REG, 8)
    p.c.drawString(p.left, p.y, clean(st.get('org_name')))
    p.y -= 4 * mm
    if clean(st.get('org_inn')):
        p.c.setFont(REG, 7.5)
        p.c.drawString(p.left, p.y, 'ИНН ' + clean(st.get('org_inn')) +
                       (' · КПП ' + clean(st.get('org_kpp')) if clean(st.get('org_kpp')) else ''))
        p.y -= 4 * mm
    if clean(st.get('org_address')):
        p.c.setFont(REG, 7.5)
        p.wrap(clean(st.get('org_address')), 7.5, REG, p.right - p.left - 45 * mm)
    p.gap(3)
    p.line()
    p.gap(2)
    p.center(title, 14, BLD, 7 * mm)
    if sub:
        p.center(sub, 9, REG, 6 * mm)
    p.gap(2)


def draw_qr(p, st, amount, purpose, payer, doc_no, doc_date):
    payload = pay_payload(st, amount, purpose, payer, doc_no, doc_date)
    if not payload:
        return
    from reportlab.lib.utils import ImageReader
    size = 40 * mm
    x = p.right - size
    y = p.h - 15 * mm - size
    p.c.drawImage(ImageReader(qr_image(payload)), x, y, size, size)
    p.c.setFont(REG, 6.5)
    p.c.drawCentredString(x + size / 2, y - 3.4 * mm, 'Оплата по QR-коду')
    if float(amount or 0) > 0:
        p.c.setFont(BLD, 8)
        p.c.drawCentredString(x + size / 2, y - 7.4 * mm, money(amount))


def build_act(check, st, items):
    p = Sheet()
    no = str(check.get('id') or '')
    total = float(check.get('final_total') or check.get('total') or 0)
    purpose = ('Оплата услуг по акту № ' + no + ' от ' + ru_date(check.get('date_from')) +
               '. ' + clean(check.get('hunt_type')))
    draw_qr(p, st, total, purpose, check.get('guest_name'), no, ru_date(check.get('date_from')))
    head_block(p, st, 'Акт выполненных работ № ' + no,
               'от ' + ru_date(check.get('date_from') or check.get('created_at')))

    p.text('Заказчик: ' + clean(check.get('guest_name')) +
           ('  тел. ' + clean(check.get('guest_phone')) if clean(check.get('guest_phone')) else ''), 9.5, BLD)
    p.text('Вид охоты: ' + clean(check.get('hunt_type') or '—'))
    p.text('Участников: ' + str(check.get('people') or 0) + ' чел.   Транспорт: ' +
           clean(check.get('transport') or '—'))
    p.text('Срок охоты: ' + ru_date(check.get('date_from')) + ' — ' + ru_date(check.get('date_to')))
    if clean(check.get('plan_bag')):
        p.text('План добычи: ' + clean(check.get('plan_bag')))
    p.gap(3)

    widths = [76 * mm, 16 * mm, 14 * mm, 24 * mm, 18 * mm, 26 * mm]
    p.row(['Услуга', 'Кол-во', 'Дней', 'Тариф', 'Скидка', 'Сумма'], widths, head=True)
    for it in items:
        tariff = float(it.get('tariff') or 0)
        hunters = float(it.get('hunters') or 0)
        days = float(it.get('days') or 0) if it.get('mode') == 'perDayPerHunter' else 0
        disc = float(it.get('discount') or 0)
        base = tariff * (hunters or 1) * (days or 1)
        line_sum = round(base * (100 - disc) / 100)
        p.row([
            clean(it.get('name')),
            str(int(hunters)) if hunters else '—',
            str(int(days)) if days else '—',
            money(tariff),
            (str(int(disc)) + '%') if disc else '—',
            money(line_sum),
        ], widths)

    p.gap(2)
    for label, val in [
        ('Стоимость лицензий', check.get('licenses_total')),
        ('Стоимость размещения', check.get('stay_total')),
        ('Дополнительные услуги', check.get('extras_total')),
        ('Итого', check.get('total')),
    ]:
        if float(val or 0):
            p.text(label + ': ' + money(val), 9)
    disc_pct = float(check.get('discount_pct') or 0)
    if disc_pct:
        cut = float(check.get('total') or 0) - total
        p.text('Скидка ' + str(int(disc_pct)) + '%: минус ' + money(cut), 9)
    p.gap(2)
    p.text('ИТОГО К ОПЛАТЕ: ' + money(total), 12, BLD)
    p.wrap('Сумма прописью: ' + rub_words(total), 8.5)

    p.gap(3)
    p.wrap('Услуги оказаны в полном объёме. Заказчик претензий по объёму, качеству '
           'и срокам оказания услуг не имеет.', 8.5)

    p.signs([
        ('Охоту провёл', check.get('hunted_by')),
        ('Расчёт произвёл', check.get('calculated_by')),
        ('Оплату принял', check.get('accepted_by')),
        ('Заказчик', check.get('guest_name')),
    ])
    return p.done()


def build_expense(check, st, rows, cat_label):
    p = Sheet()
    no = str(check.get('id') or '')
    head_block(p, st, 'Акт о расходах к акту № ' + no,
               clean(check.get('guest_name')) + ' · ' + ru_date(check.get('date_from')) +
               ' — ' + ru_date(check.get('date_to')))

    total = sum(float(r.get('total') or 0) for r in rows)
    income = float(check.get('final_total') or 0)

    widths = [12 * mm, 34 * mm, 60 * mm, 24 * mm, 20 * mm, 24 * mm]
    p.row(['№', 'Статья', 'Наименование', 'Цена за ед.', 'Кол-во', 'Сумма'], widths, head=True)
    for i, r in enumerate(rows, 1):
        p.row([
            str(i),
            cat_label.get(str(r.get('category') or ''), 'Прочее'),
            clean(r.get('name')),
            money(r.get('unit_price')),
            str(r.get('qty') or 0) + ' ' + clean(r.get('unit')),
            money(r.get('total')),
        ], widths)
    if not rows:
        p.text('Расходов не зафиксировано.', 9)

    p.gap(3)
    p.text('Поступление по акту: ' + money(income), 9.5)
    p.text('Расходы на охоту: ' + money(total), 9.5)
    p.text('Остаток: ' + money(income - total), 11, BLD)
    p.wrap('Сумма расходов прописью: ' + rub_words(total), 8.5)

    p.signs([
        ('Составил', check.get('calculated_by')),
        ('Проверил', check.get('accepted_by')),
    ])
    return p.done()


def build_receipt(doc, st):
    p = Sheet()
    amount = float(doc.get('amount') or 0)
    no = str(doc.get('number') or doc.get('id') or '')

    p.c.setFont(REG, 7.5)
    p.c.drawString(p.left, p.y, 'Унифицированная форма № КО-1')
    p.y -= 5 * mm
    head_block(p, st, 'Приходный кассовый ордер',
               '№ ' + no + ' от ' + ru_date(doc.get('issued_on')))

    widths = [40 * mm, 25 * mm, 40 * mm, 25 * mm]
    p.row(['Дебет', str(doc.get('debit_account') or ''),
           'Кредит', str(doc.get('credit_account') or '')], widths)
    p.row(['Сумма, руб.', money(amount), 'Код по ОКПО',
           clean(doc.get('org_okpo') or '—')], widths)
    p.gap(4)

    p.text('Принято от: ' + clean(doc.get('accepted_from') or '—'), 9.5, BLD)
    p.wrap('Основание: ' + clean(doc.get('basis') or '—'), 9)
    p.wrap('Сумма прописью: ' + rub_words(amount), 9)
    p.text('Приложение: ' + clean(doc.get('attachment') or '—'), 9)

    p.signs([
        ('Главный бухгалтер', doc.get('chief_accountant')),
        ('Кассир', doc.get('cashier')),
    ])

    p.gap(4)
    p.c.setDash(2, 2)
    p.line()
    p.c.setDash()
    p.gap(2)
    p.center('Квитанция к приходному кассовому ордеру № ' + no, 10, BLD, 6 * mm)
    p.text('от ' + ru_date(doc.get('issued_on')) + ' · Принято от ' +
           clean(doc.get('accepted_from') or '—'), 9)
    p.text('Сумма: ' + money(amount), 9.5, BLD)
    p.wrap(rub_words(amount), 8.5)
    p.signs([('Кассир', doc.get('cashier'))])
    return p.done()


def store_pdf(cur, data, kind, title, file_name, doc_date, user):
    key = 'docs/' + uuid.uuid4().hex + '.pdf'
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=data, ContentType='application/pdf')
    url = ('https://cdn.poehali.dev/projects/' + os.environ['AWS_ACCESS_KEY_ID'] +
           '/bucket/' + key)

    def q(v):
        if v is None or v == '':
            return 'NULL'
        return "'" + str(v).replace("'", "''") + "'"

    cur.execute("SELECT id FROM documents WHERE kind = " + q(kind) +
                " AND title = " + q(title) + " AND COALESCE(archived, FALSE) = FALSE "
                "ORDER BY id DESC LIMIT 1")
    old = cur.fetchone()
    uid = str(int(user['id'])) if user else 'NULL'
    if old:
        cur.execute('UPDATE documents SET file_url = ' + q(url) + ', file_name = ' +
                    q(file_name) + ', doc_date = ' + q(doc_date) +
                    ' WHERE id = ' + str(int(old['id'])))
    else:
        cur.execute(
            'INSERT INTO documents (kind, title, file_url, file_name, doc_date, people, '
            'created_by, created_by_name) VALUES (' +
            q(kind) + ', ' + q(title) + ', ' + q(url) + ', ' + q(file_name) + ', ' +
            q(doc_date) + ', 1, ' + uid + ', ' +
            q(user['name'] if user else None) + ')'
        )
    return url


CAT = {
    'food': 'Питание', 'fuel': 'ГСМ', 'transport': 'Транспорт',
    'salary': 'Оплата труда', 'license': 'Лицензии', 'stay': 'Проживание',
    'repair': 'Ремонт', 'other': 'Прочее',
}


def handler(event: dict, context) -> dict:
    """Собирает PDF актов охоты, расходов и кассового ордера с QR-кодом оплаты."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    kind = params.get('kind') or 'act'
    row_id = params.get('id') or ''
    if not str(row_id).isdigit():
        return {'statusCode': 400, 'headers': CORS,
                'body': json.dumps({'error': 'Не указан номер документа'})}
    rid = int(row_id)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user = current_user(cur, event)
    if not user:
        cur.close()
        conn.close()
        return {'statusCode': 401, 'headers': CORS,
                'body': json.dumps({'error': 'Нужен вход в систему'})}

    cur.execute('SELECT * FROM settings WHERE id = 1')
    srow = cur.fetchone()
    st = dict(srow) if srow else {}

    if kind == 'receipt':
        cur.execute('SELECT * FROM receipts WHERE id = ' + str(rid))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return {'statusCode': 404, 'headers': CORS,
                    'body': json.dumps({'error': 'Чек не найден'})}
        doc = dict(row)
        data = build_receipt(doc, st)
        who = clean(doc.get('accepted_from')) or 'бланк'
        title = 'Кассовый ордер № ' + str(doc.get('number') or rid) + ' — ' + who
        fname = ('ПКО ' + str(doc.get('number') or rid) + ' ' + who).replace(' ', '_') + '.pdf'
        url = store_pdf(cur, data, 'receipt_pdf', title, fname, doc.get('issued_on'), user)
        cur.close()
        conn.close()
        return {'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'url': url, 'file_name': fname})}

    cur.execute('SELECT * FROM checks WHERE id = ' + str(rid))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return {'statusCode': 404, 'headers': CORS,
                'body': json.dumps({'error': 'Акт не найден'})}
    check = dict(row)
    who = clean(check.get('guest_name')) or 'без имени'

    if kind == 'expense':
        cur.execute('SELECT * FROM expenses WHERE check_id = ' + str(rid) +
                    " AND COALESCE(archived, FALSE) = FALSE ORDER BY spent_on, id")
        rows = [dict(r) for r in cur.fetchall()]
        data = build_expense(check, st, rows, CAT)
        title = 'Акт о расходах № ' + str(rid) + ' — ' + who
        fname = ('Акт расходов ' + str(rid) + ' ' + who).replace(' ', '_') + '.pdf'
    else:
        raw = check.get('items')
        try:
            parsed = json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            parsed = []
        items = parsed if isinstance(parsed, list) else []
        data = build_act(check, st, items)
        title = 'Акт выполненных работ № ' + str(rid) + ' — ' + who
        fname = ('Акт ' + str(rid) + ' ' + who).replace(' ', '_') + '.pdf'

    url = store_pdf(cur, data, 'act_pdf' if kind != 'expense' else 'expense_pdf',
                    title, fname, check.get('date_from'), user)
    cur.close()
    conn.close()
    return {'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'url': url, 'file_name': fname})}