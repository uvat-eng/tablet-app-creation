import base64
import io
import json
import os

import psycopg2
import psycopg2.extras
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Content-Type': 'application/json',
}

MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
          'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

LIMITS = [
    ('Косуля', '3 единицы', 'Бесплатно, в счет членских взносов'),
    ('Косуля', 'с 4-й единицы', '50% скидка от общего тарифа'),
    ('Лось, медведь', 'индивидуальная охота', '50% скидка от общего тарифа'),
    ('Лось, медведь', '1 ед. коллективно', 'Бесплатно, в счет членских взносов'),
    ('Тетерев', '3 единицы', 'Бесплатно, в счет членских взносов'),
    ('Тетерев', 'с 4-й единицы', '50% скидка от общего тарифа'),
    ('Куропатка', '', '50% скидка от общего тарифа'),
    ('Волк', '', 'Бесплатно, в счет членских взносов'),
]

BASE_TERMS = [
    ('Проживание в гостинице ОХОТНИКА и членов его семьи (супруга, дети)', 'Бесплатно'),
    ('Использование 2х единиц техники на выбор на ОХОТНИКА и членов его семьи '
     '(супруга, дети) (снегоходы VK540, BRP ED, Буран, Трэкол, крытые прогулочные '
     'сани, Тингер)', 'Бесплатно'),
    ('Использование любой техники от 3х единиц', '50% от тарифа'),
    ('Услуги Повара-уборщицы', 'Бесплатно'),
    ('Услуги Бани', 'Бесплатно'),
    ('Фотосессия', 'по догов-ти с егерем'),
]

DUTIES_ORG = (
    'Четко и заранее подготовить и организовать охоту. Метод охоты (с подхода, '
    'с вышки, загонами) определяется СТОРОНАМИ при заезде на базу и проведении '
    'вводного инструктажа. Организовать встречу и размещение на базе ОХОТНИКА '
    'в соответствии со следующими условиями:'
)

DUTIES_HUNTER = (
    'Иметь при себе все необходимые разрешительные документы (охотничий билет, '
    'разрешение на оружие, настоящий договор). Соблюдать правила охоты, меры '
    'безопасности и правила внутреннего распорядка ОХОТХОЗЯЙСТВА. Регулярно '
    'вносить платежи по членским взносам. Прибыв на место охоты, ОХОТНИК '
    'поступает в полное подчинение руководителю охоты и на время охоты '
    'становится членом единого коллектива. Охотник не имеет права заряжать '
    'оружие, если нет указания от руководителя охоты. ОХОТНИК должен быть '
    'предельно внимательным, в случае загонной охоты не имеет право покидать '
    'свое место охоты (номер, определенный руководителем охоты). Оружие '
    'заряжается, когда охотник встал и приготовился на своем месте охоты '
    '(номер, засидка, при охоте с подхода, по указанию сопровождающего). '
    'Прицеливаясь, ОХОТНИК должен внимательно осмотреться и убедиться, что на '
    'линии огня отсутствует загонщик и/или иные лица. Недопустимо вести огонь '
    'по линии стрелков, даже если дичь ранена и уходит от прямого выстрела. '
    'По прибытию на место охоты и до окончания ОХОТНИК обязан быть одет в '
    'жилет яркого цвета. Запрещено стрелять по неясно различимой цели, на '
    'шорох, по шевелящимся кустам и траве, камышу. Главное правило '
    'безопасности — не уверен, не стреляй.'
)


def esc(v):
    if v is None:
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"


def current_user(cur, event):
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''
    if not token:
        return None
    cur.execute(
        "SELECT s.id, s.name, s.role FROM sessions x JOIN staff s ON s.id = x.staff_id "
        "WHERE x.token = " + esc(token) + " AND x.expires_at > NOW() AND s.active = TRUE"
    )
    row = cur.fetchone()
    return dict(row) if row else None


def ru_date(d):
    if not d:
        return ''
    s = str(d)[:10]
    try:
        y, m, dd = s.split('-')
        return dd + '.' + m + '.' + y
    except ValueError:
        return s


def money_words(v):
    n = int(round(float(v or 0)))
    words = {6500: 'шесть тысяч пятьсот рублей'}
    return words.get(n, str(n) + ' рублей')


def set_font(doc, name='Times New Roman', size=11):
    style = doc.styles['Normal']
    style.font.name = name
    style.font.size = Pt(size)
    rpr = style.element.get_or_add_rPr()
    rfonts = rpr.find(qn('w:rFonts'))
    if rfonts is None:
        rfonts = OxmlElement('w:rFonts')
        rpr.append(rfonts)
    rfonts.set(qn('w:ascii'), name)
    rfonts.set(qn('w:hAnsi'), name)
    rfonts.set(qn('w:cs'), name)
    style.paragraph_format.space_after = Pt(4)
    style.paragraph_format.line_spacing = 1.05


def para(doc, text='', bold=False, align='just', size=None, space_before=0, space_after=4):
    p = doc.add_paragraph()
    p.alignment = {
        'just': WD_ALIGN_PARAGRAPH.JUSTIFY,
        'center': WD_ALIGN_PARAGRAPH.CENTER,
        'left': WD_ALIGN_PARAGRAPH.LEFT,
        'right': WD_ALIGN_PARAGRAPH.RIGHT,
    }[align]
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    if text:
        run = p.add_run(text)
        run.bold = bold
        if size:
            run.font.size = Pt(size)
    return p


def two_col_table(doc, rows, widths=(11.0, 5.5)):
    t = doc.add_table(rows=0, cols=2)
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for left, right in rows:
        cells = t.add_row().cells
        cells[0].text = left
        cells[1].text = right
        cells[0].width = Cm(widths[0])
        cells[1].width = Cm(widths[1])
        for c in cells:
            for p in c.paragraphs:
                p.paragraph_format.space_after = Pt(2)
                for r in p.runs:
                    r.font.size = Pt(10)
    return t


def build_contract(guest, st):
    doc = Document()
    set_font(doc)
    sec = doc.sections[0]
    sec.top_margin = Cm(1.5)
    sec.bottom_margin = Cm(1.5)
    sec.left_margin = Cm(2.0)
    sec.right_margin = Cm(1.5)

    para(doc, st.get('base_place') or '', align='right', space_after=0)
    para(doc, st.get('base_region') or '', align='right', space_after=0)
    para(doc, '«___» __________ 20___ г.', align='right', space_after=10)

    para(doc, 'ПУТЕВКА-ДОГОВОР', bold=True, align='center', size=14, space_after=10)

    org = st.get('org_name') or ''
    intro = (
        org + ', ИНН ' + str(st.get('org_inn') or '') +
        ', КПП ' + str(st.get('org_kpp') or '') + ', ' + str(st.get('org_address') or '') +
        ', в лице генерального директора ' + str(st.get('org_director') or '') +
        ', действующей на основании Устава, с одной стороны, далее «ОХОТХОЗЯЙСТВО», '
        'и гражданин РФ'
    )
    para(doc, intro)

    name = str(guest.get('name') or '')
    passport = str(guest.get('passport') or '____________')
    issued = ru_date(guest.get('passport_date')) or '____________'
    address = str(guest.get('address') or '________________________________')
    para(doc, name + ', паспорт ' + passport + ', выдан ' + issued +
         ', проживающий по адресу: ' + address + ',', bold=True)
    para(doc, 'далее «ОХОТНИК», заключили настоящий договор о нижеследующем:',
         space_after=10)

    para(doc, '1. ПРЕДМЕТ ДОГОВОРА', bold=True, align='left', space_before=6)
    para(doc,
         'ОХОТХОЗЯЙСТВО имеет охотхозяйственное соглашение с ГОСОХОТДЕПАРТАМЕНТОМ '
         'г.Тюмени, ' + str(st.get('agreement_no') or '') + ' на право пользования '
         'объектами животного мира охотничьего угодья "Кротовский", а также договор '
         'на содержание, обслуживание и исполнение требований охотхозяйственного '
         'соглашения №242 от 24.12.2019, заключенного с другим охотпользователем на '
         'территории охотничьего угодья "Бобровский". Оба соглашения на 49 лет.')
    para(doc,
         'ОХОТХОЗЯЙСТВО организовывает ЗАКРЫТЫЙ КЛУБ охотников, ведет его учет, '
         'получает членские взносы, организовывает охоту в соответствии с сезонами '
         'в открытые сроки охоты, в количестве, на основаниях имеющихся лицензий на '
         'отстрел животных. ОХОТХОЗЯЙСТВО содержит базу в деревне Малоскаредное '
         'Аромашевского района, где организована гостиница для пребывания членов '
         'ЗАКРЫТОГО КЛУБА, а также авто, мото и вездеходную технику для передвижения '
         'по территории охотничьих угодий.')

    fee = guest.get('fee_monthly') or st.get('fee_monthly') or 6500
    para(doc,
         'ОХОТХОЗЯЙСТВО оказывает ОХОТНИКУ услуги по организации охоты, коллективной '
         'охоты в границах охотничьих угодий ' + str(st.get('grounds') or '') +
         ' на территории Аромашевского района, а ОХОТНИК оплачивает оказанные услуги '
         'и исполняет обязательства по настоящему договору. Оплата охотником '
         'осуществляется путем внесения ежемесячного взноса в размере ' +
         str(int(float(fee))) + ' (' + money_words(fee) + ') на реквизиты '
         'ОХОТХОЗЯЙСТВА. Объектами охоты являются косуля, лось, тетерев, куропатка, '
         'волк, медведь, в следующих лимитах на сезон:', space_after=6)

    t = doc.add_table(rows=0, cols=3)
    t.style = 'Table Grid'
    for a, b, c in LIMITS:
        cells = t.add_row().cells
        cells[0].text = a
        cells[1].text = b
        cells[2].text = c
        cells[0].width = Cm(4.0)
        cells[1].width = Cm(4.5)
        cells[2].width = Cm(8.0)
        for cell in cells:
            for p in cell.paragraphs:
                p.paragraph_format.space_after = Pt(2)
                for r in p.runs:
                    r.font.size = Pt(10)

    para(doc, '', space_after=2)
    para(doc,
         'В указанных лимитах договора ОХОТНИК имеет право находиться на территории '
         'ОХОТХОЗЯЙСТВА в сроки охоты, установленные законодательством, при наличии '
         'выданного ОХОТХОЗЯЙСТВОМ разрешения (лицензии) на добычу конкретных животных.')

    para(doc, '2. ОХОТХОЗЯЙСТВО ОБЯЗАНО:', bold=True, align='left', space_before=8)
    para(doc, DUTIES_ORG, space_after=6)
    two_col_table(doc, BASE_TERMS)

    para(doc, '3. ОХОТНИК ОБЯЗАН:', bold=True, align='left', space_before=10)
    para(doc, DUTIES_HUNTER)

    para(doc,
         'Карта для оплаты членских взносов: ' + str(st.get('pay_card') or '') +
         '. Оплата до ' + str(st.get('pay_day') or '03') + ' числа месяца.',
         bold=True, space_before=8, space_after=12)

    para(doc, '4. РЕКВИЗИТЫ ОХОТХОЗЯЙСТВА', bold=True, align='left', space_before=8)
    req = []
    if st.get('org_full_name'):
        req.append(str(st['org_full_name']))
    line = 'ИНН ' + str(st.get('org_inn') or '') + ', КПП ' + str(st.get('org_kpp') or '')
    if st.get('org_ogrn'):
        line += ', ОГРН ' + str(st['org_ogrn'])
    req.append(line)
    if st.get('org_address'):
        req.append('Юридический адрес: ' + str(st['org_address']))
    if st.get('org_address_fact'):
        req.append('Фактический адрес: ' + str(st['org_address_fact']))
    if st.get('org_rs'):
        bank = 'Р/с ' + str(st['org_rs'])
        if st.get('org_bank'):
            bank += ', ' + str(st['org_bank'])
        req.append(bank)
    if st.get('org_ks'):
        req.append('К/с ' + str(st['org_ks']) + ', БИК ' + str(st.get('org_bik') or ''))
    for item in req:
        para(doc, item, align='left', space_after=2)

    para(doc, '', space_after=8)
    sign = doc.add_table(rows=0, cols=2)
    sign.alignment = WD_TABLE_ALIGNMENT.CENTER
    r1 = sign.add_row().cells
    r1[0].text = 'ОХОТХОЗЯЙСТВО:'
    r1[1].text = 'ОХОТНИК:'
    r2 = sign.add_row().cells
    r2[0].text = ('Генеральный директор ' + org + '\n\n______________ ' +
                  str(st.get('org_director_short') or '') +
                  '\n\n«___» _________ 20___ г.')
    r2[1].text = name + '\n\n____________________________\n\n«___» _________ 20___ г.'
    for row in sign.rows:
        for cell in row.cells:
            cell.width = Cm(8.5)
            for p in cell.paragraphs:
                p.paragraph_format.space_after = Pt(2)
                for r in p.runs:
                    r.font.size = Pt(10)
    for p in sign.rows[0].cells[0].paragraphs + sign.rows[0].cells[1].paragraphs:
        for r in p.runs:
            r.bold = True

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


SAFETY = [
    'соблюдать Правила охоты, утвержденные приказом Министерства природных ресурсов '
    'и экологии РФ №477 от 24.07.2020 г., а также параметры осуществления охоты в '
    'соответствующих охотничьих угодьях, указанных в части 2 статьи 23 ФЗ об охоте;',
    'при осуществлении коллективной охоты загоном, все лица обязаны носить '
    'специальную сигнальную одежду, повышенной видимости красного, желтого или '
    'оранжевого цвета;',
    'запрещается осуществлять добычу охотничьих животных ближе 200 метров от жилого '
    'дома или жилого строения;',
    'запрещается стрелять «на шум», «на шорох», по неясно видимой цели;',
    'запрещается стрелять вдоль линии стрелков, когда снаряд может пройти ближе, '
    'чем 15 метров от соседнего стрелка;',
    'запрещается сходить со стрелковой позиции, подходить к упавшему, добытому, '
    'раненому охотничьему животному до окончания загона;',
    'запрещается осуществлять охоту с неисправным охотничьим оружием;',
    'запрещается использование патронов, снаряженных дробью или картечью при '
    'осуществлении охоты на копытных животных, за исключением использования дроби '
    '(картечи) диаметром не менее 5 мм для стрельбы по косулям, и диаметром не '
    'менее 7,5 мм для стрельбы по кабану;',
    'заряжать или разряжать охотничье оружие направленное только вверх или в землю, '
    'отвернувшись от других физических лиц;',
    'отстрел охотничьих животных осуществлять способом, не допускающими жестокого '
    'обращения с животными, стрелять только по ясно видимой цели, стрелять на '
    'дистанцию больше установленной;',
    'стрелять только по охотничьему животному, на которое осуществляется '
    'коллективная охота в соответствии с выданным разрешением на добычу;',
    'соблюдать меры пожарной безопасности нахождения в лесу;',
]


def split_ticket(value):
    raw = str(value or '').strip()
    if not raw:
        return '', ''
    parts = raw.replace('№', ' ').replace('-', ' ').split()
    if len(parts) >= 2:
        return parts[0], ' '.join(parts[1:])
    return '', raw


def dotted(doc, label, value, tail_min=30):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(label + ': ')
    run.font.size = Pt(12)
    val = doc_value(value, tail_min)
    r2 = p.add_run(val)
    r2.font.size = Pt(12)
    r2.underline = bool(str(value or '').strip())
    return p


def doc_value(value, tail_min):
    text = str(value or '').strip()
    if text:
        return text
    return '_' * tail_min


def build_collective(payload, hunters, st):
    doc = Document()
    set_font(doc, size=12)
    sec = doc.sections[0]
    sec.top_margin = Cm(1.0)
    sec.bottom_margin = Cm(1.0)
    sec.left_margin = Cm(1.0)
    sec.right_margin = Cm(1.0)

    para(doc, 'Список лиц,', bold=True, align='center', size=14, space_after=0)
    para(doc, 'участвующих в коллективной охоте', bold=True, align='center', size=14,
         space_after=12)

    dotted(doc, 'Дата осуществления охоты', ru_date(payload.get('hunt_date')), 26)
    dotted(doc, 'Место осуществления охоты',
           payload.get('place') or st.get('grounds'), 60)
    dotted(doc, 'Сведения о лице, ответственного за осуществление коллективной охоты '
                'или которому выдано разрешение на добычу охотничьих ресурсов',
           payload.get('responsible'), 60)
    dotted(doc, 'Разрешение на добычу охотничьих ресурсов', payload.get('permit'), 40)
    dotted(doc, 'Вид охотничьих животных, подлежащих добыче', payload.get('species'), 40)
    dotted(doc, 'Количество охотничьих животных, подлежащих добыче',
           payload.get('qty'), 30)

    rows_count = max(int(payload.get('rows') or 0), len(hunters), 21)
    t = doc.add_table(rows=0, cols=5)
    t.style = 'Table Grid'
    widths = (Cm(1.2), Cm(10.2), Cm(1.5), Cm(3.3), Cm(3.2))

    head = t.add_row().cells
    head2 = t.add_row().cells
    titles = ['№\nп/п', 'Ф. И. О.', 'Охотничий билет', '', 
              'Подпись о прохождении инструктажа по технике безопасности']
    for i, val in enumerate(titles):
        head[i].text = val
    head2[0].text = ''
    head2[1].text = ''
    head2[2].text = 'серия'
    head2[3].text = 'номер'
    head2[4].text = ''
    head[0].merge(head2[0])
    head[1].merge(head2[1])
    head[2].merge(head[3])
    head[4].merge(head2[4])

    for n in range(rows_count):
        cells = t.add_row().cells
        cells[0].text = str(n + 1)
        if n < len(hunters):
            h = hunters[n]
            serie, number = split_ticket(h.get('hunt_ticket'))
            cells[1].text = str(h.get('name') or '')
            cells[2].text = serie
            cells[3].text = number
        cells[4].text = ''

    for row in t.rows:
        row.height = Cm(0.8)
        for i, cell in enumerate(row.cells):
            cell.width = widths[i] if i < len(widths) else Cm(3)
            for p in cell.paragraphs:
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.space_before = Pt(0)
                if i in (0, 2, 3):
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for r in p.runs:
                    r.font.size = Pt(11)

    doc.add_page_break()
    para(doc, 'Инструктаж по технике безопасности и порядку осуществлению охоты',
         bold=True, align='center', size=12, space_after=10)
    for item in SAFETY:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run('- ' + item)
        run.font.size = Pt(12)

    para(doc, '«____» _______________ 20___ года.', align='right', space_before=10,
         space_after=14)
    para(doc, 'Инструктаж лиц, участвующих в коллективной охоте по технике '
              'безопасности и порядку осуществления охоты провел:', align='left',
         space_after=14)
    lead = str(payload.get('instructor') or '').strip()
    para(doc, ('__________________ / ' + lead + ' /.') if lead
         else '__________________ / ___________________________ /.', align='left')

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def handler(event: dict, context) -> dict:
    """Формирует печатные документы: путевку-договор и коллективный лист охоты в Word."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    kind = params.get('kind') or 'contract'
    guest_id = params.get('guest_id')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user = current_user(cur, event)
    if not user:
        cur.close()
        conn.close()
        return {'statusCode': 401, 'headers': CORS,
                'body': json.dumps({'error': 'Нужен вход в систему'})}

    if kind == 'collective':
        payload = json.loads(event.get('body') or '{}')
        ids = [int(x) for x in (payload.get('guest_ids') or []) if str(x).isdigit()]
        hunters = []
        if ids:
            cur.execute('SELECT id, name, hunt_ticket FROM guests WHERE id IN (' +
                        ','.join(str(i) for i in ids) + ')')
            found = {int(r['id']): dict(r) for r in cur.fetchall()}
            hunters = [found[i] for i in ids if i in found]
        cur.execute('SELECT * FROM settings WHERE id = 1')
        srow = cur.fetchone()
        st = dict(srow) if srow else {}
        cur.close()
        conn.close()
        data = build_collective(payload, hunters, st)
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/vnd.openxmlformats-officedocument.'
                                'wordprocessingml.document',
                'Content-Disposition': 'attachment; filename="collective.docx"',
            },
            'isBase64Encoded': True,
            'body': base64.b64encode(data).decode(),
        }

    if kind != 'contract' or not guest_id:
        cur.close()
        conn.close()
        return {'statusCode': 400, 'headers': CORS,
                'body': json.dumps({'error': 'Не указан член клуба'})}

    cur.execute('SELECT * FROM guests WHERE id = ' + str(int(guest_id)))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return {'statusCode': 404, 'headers': CORS,
                'body': json.dumps({'error': 'Охотник не найден'})}
    guest = dict(row)

    cur.execute('SELECT * FROM settings WHERE id = 1')
    srow = cur.fetchone()
    st = dict(srow) if srow else {}
    cur.close()
    conn.close()

    data = build_contract(guest, st)
    fio = str(guest.get('name') or 'охотник').replace(' ', '_')
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.'
                            'wordprocessingml.document',
            'Content-Disposition': 'attachment; filename="dogovor.docx"',
            'X-File-Name': fio,
        },
        'isBase64Encoded': True,
        'body': base64.b64encode(data).decode(),
    }
