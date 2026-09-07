import base64
import io
import json
import os

import uuid

import boto3
import psycopg2
import psycopg2.extras
from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
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
        "SELECT s.id, s.name, s.role, s.login FROM sessions x "
        "JOIN staff s ON s.id = x.staff_id "
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


BIO_NORMS = [
    ('1', 'Лось', '3', '5', '10', '20'),
    ('2', 'Косуля', '1', '3', '3', '5'),
    ('3', 'Кабан', '3', '', '10', '20'),
    ('4', 'Медведь', '2', '5', '8', '20'),
]

BIO_NOTE = ('Или кормушка, или посев полей, плюс солонец плюс галечник. '
            'В количестве согласно таблицы на каждую особь')

BIO_SUBJECT = [
    '1.1. Охотник обязуется безвозмездно выполнить биотехнические и (или) учетные '
    'мероприятия, проводимые в закрепленных охотничьих угодьях, на территории '
    'Аромашевского района (угодье «Кротовский» и угодье «Бобровский»), для участия '
    'в дальнейшем распределении разрешений на добычу:',
]

BIO_AFTER_TABLE = [
    'Для получения лицензии, охотник обеспечивает выполнение биотехнических '
    'мероприятий, в объеме согласно таблицы №1. Объем биотехнических мероприятий '
    'суммируется согласно таблицы на каждую особь добываемого животного. Кроме '
    'подкормочной площадки и подкормочного поля, допускается выполнить либо '
    'площадки либо поле.',
    'В объем площадки входит четыре опоры заглубленные в землю, стропила и навес, '
    'покрытый шифером, либо рубероидом, либо иным материалом, защищающим подкорм от '
    'атмосферных осадков (дождь, снег). На площадке устанавливается табличка, с '
    'указанием номера и координат площадки, а также принадлежность к охотугодью. '
    'А также поддержание площадки зерном на протяжении сезона, в котором получается '
    'лицензия.',
    'В объем поля входят мероприятия по вспашке, боронению и посеву рапса. Осенняя '
    'уборка не требуется, рапс уходит под снег для зимней кормежки животных.',
    'В объем солонца входит подготовка корыта по одной из схем, преимущественно '
    'солонец ставится рядом с осинником, также входит забивка солонца солью и '
    'поддержание в течении сезона.',
    '1.2. При выполнении учетных работ Охотник обязуется руководствоваться нормами '
    'и правилами, установленными законодательством в области охоты, а также в части '
    'лесного законодательства.',
]

BIO_RIGHTS = [
    '2.1. Охотник обязан добросовестно выполнять принятые в соответствии с настоящим '
    'договором обязательства, предусмотренные пунктами 1.1 и 1.2 настоящего Договора, '
    'и сдать результаты выполненных мероприятий путем подписания соответствующих актов. '
    'Каждая изготовленная и установленная единица кормушки, солонца и/или галечника '
    'должна быть подписана с соответствующей табличкой (знак для таблички выдается '
    'Заказчиком).',
    '2.2. Охотник пользуется всеми правами и исполняет все обязанности, предусмотренные '
    'действующим законодательством Российской Федерации.',
    '2.3. Заказчик обязан принять результаты выполненных мероприятий путем подписания '
    'соответствующих актов. После учета и отражения выполненных биотехнических '
    'мероприятий, выдать охотнику соответствующее разрешение на охоту в пределах '
    'имеющихся лимитов.',
    '2.4. Заказчик обязан оказывать Охотнику все необходимое для надлежащего исполнения '
    'Охотником своих обязанностей по настоящему Договору содействие, в том числе '
    'предоставлять всю необходимую информацию и документацию о требованиях к проведению '
    'биотехнических мероприятий и учету численности охотничьих ресурсов.',
]

BIO_TERM = [
    '4.1. Настоящий Договор заключен и распространяется на работы и мероприятия, '
    'выполненные в течение срока его действия, и вступает в силу с момента его '
    'подписания сторонами.',
    '4.2. Продление срока действия настоящего Договора допускается.',
    '4.3. Действие Договора прекращается в одностороннем порядке в следующих случаях:',
]

BIO_STOP = [
    '- привлечения Охотника к административной ответственности за нарушения, '
    'предусмотренные статьями 7.11 и 8.37 КоАП РФ;',
    '- привлечения Охотника к уголовной ответственности за совершение умышленного '
    'преступления;',
    '- установления факта наличия у Охотника непогашенной или неснятой судимости за '
    'совершение умышленного преступления;',
    '- аннулирования выданного ему охотничьего билета единого федерального образца.',
]


def build_biotech(guest, st, payload):
    """Договор на выполнение биотехнических мероприятий."""
    doc = Document()
    set_font(doc)
    sec = doc.sections[0]
    sec.top_margin = Cm(1.5)
    sec.bottom_margin = Cm(1.5)
    sec.left_margin = Cm(2.0)
    sec.right_margin = Cm(1.5)

    number = str(payload.get('number') or '').strip() or '____/20__-__'
    para(doc, 'ДОГОВОР', bold=True, align='center', size=14, space_after=0)
    para(doc, 'на выполнение биотехнических мероприятий № БИО-' + number,
         bold=True, align='center', size=12, space_after=10)

    signed = ru_date(payload.get('signed_on'))
    para(doc, (signed if signed else '«___» __________ 20___ г.'), align='left', space_after=0)
    para(doc, str(st.get('base_place') or 'д. Малоскаредное Аромашевский район '
                                          'Тюменской области'),
         align='left', space_after=10)

    director = str(st.get('org_director') or '')
    org = str(st.get('org_name') or 'Малышенское охотничье хозяйство')
    para(doc, org + ', в лице директора ' + (director or '____________________') +
         ', действующего на основании Устава, с одной стороны, именуемый далее '
         '«Заказчик», и')
    para(doc, doc_value(guest.get('name'), 45) + ', именуемый в дальнейшем «Охотник», '
         'заключили настоящий договор о нижеследующем:', bold=True, space_after=10)

    para(doc, '1. Предмет договора', bold=True, align='left', space_before=6)
    for text in BIO_SUBJECT:
        para(doc, text)
    para(doc, 'Таблица №1', bold=True, align='center', space_before=4, space_after=4)

    t = doc.add_table(rows=0, cols=7)
    t.style = 'Table Grid'
    head = t.add_row().cells
    titles = ['№ п/п', 'Наименование', 'Подкормочная площадка (кормушка), штук',
              'Подкормочное поле, в Га (общая площадь)', 'Солонец, штук',
              'Галечник, штук', 'Примечание']
    for cell, title in zip(head, titles):
        cell.text = title
        for p in cell.paragraphs:
            for r in p.runs:
                r.bold = True
    for row in BIO_NORMS:
        cells = t.add_row().cells
        for cell, value in zip(cells, list(row) + [BIO_NOTE]):
            cell.text = value
    widths = (Cm(1.2), Cm(2.4), Cm(2.8), Cm(2.8), Cm(2.0), Cm(2.0), Cm(4.5))
    for row in t.rows:
        for cell, w in zip(row.cells, widths):
            cell.width = w
            for p in cell.paragraphs:
                p.paragraph_format.space_after = Pt(2)
                for r in p.runs:
                    r.font.size = Pt(9)

    para(doc, '', space_after=4)
    for text in BIO_AFTER_TABLE:
        para(doc, text)

    para(doc, '2. Права и обязанности сторон', bold=True, align='left', space_before=8)
    for text in BIO_RIGHTS:
        para(doc, text)

    para(doc, '3. Ответственность сторон', bold=True, align='left', space_before=8)
    para(doc, '3.1. Стороны несут ответственность за неисполнение или ненадлежащее '
              'исполнение обязанностей по настоящему Договору в соответствии с '
              'действующим законодательством Российской Федерации.')

    para(doc, '4. Срок договора, его продление и досрочное расторжение',
         bold=True, align='left', space_before=8)
    for text in BIO_TERM:
        para(doc, text)
    for text in BIO_STOP:
        para(doc, text, align='left')
    para(doc, '4.4. За исключением случаев, предусмотренных пунктом 4.3 настоящего '
              'Договора, Договор может быть расторгнут в любой момент по инициативе '
              'Охотника. При этом Охотник обязан направить Заказчику уведомление о '
              'расторжении настоящего Договора в срок не позднее чем за 15 дней до '
              'такого расторжения.')

    para(doc, '5. Прочие условия', bold=True, align='left', space_before=8)
    para(doc, '5.1. В части, не урегулированной настоящим Договором, отношения сторон '
              'регулируются действующим законодательством Российской Федерации.')
    para(doc, '5.2. Настоящий Договор составлен в 2 экземплярах, имеющих равную '
              'юридическую силу, по одному для каждой из сторон.')

    para(doc, '6. Реквизиты сторон', bold=True, align='center', space_before=10)
    req = doc.add_table(rows=0, cols=1)
    req.style = 'Table Grid'
    lines = [
        (doc_value(guest.get('name'), 45), '(ФИО)'),
        (doc_value(guest.get('passport'), 45), '(серия, номер паспорта, КП, дата выдачи)'),
        (doc_value(guest.get('address'), 45), '(адрес регистрации)'),
        (doc_value(guest.get('hunt_ticket'), 45),
         '(номер охотничьего билета и дата выдачи)'),
        (doc_value(guest.get('phone'), 25), '(телефон)'),
    ]
    for value, caption in lines:
        cell = req.add_row().cells[0]
        cell.text = value
        p = cell.add_paragraph(caption)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for pp in cell.paragraphs:
            pp.paragraph_format.space_after = Pt(1)
            for r in pp.runs:
                r.font.size = Pt(9)

    para(doc, '', space_after=10)
    para(doc, 'Я, ' + doc_value(guest.get('name'), 30) + ', даю согласие оператору '
         'персональных данных на обработку (сбор, систематизацию, накопление, хранение, '
         'уточнение, использование и проверку) указанных в заявлении моих персональных '
         'данных в соответствии с Федеральным законом от 27 июля 2006 года № 152-ФЗ '
         '«О персональных данных» с целью взаимодействия при исполнении настоящего '
         'договора. Согласие действует с момента его подписания до моего письменного '
         'отзыва данного согласия.')

    para(doc, '', space_after=10)
    para(doc, '___________________       ______________________________',
         align='left', space_after=0)
    para(doc, 'подпись охотник                        расшифровка подписи',
         align='left', space_after=10)
    para(doc, '___________________       ______________________________',
         align='left', space_after=0)
    para(doc, 'подпись заказчик                       расшифровка подписи',
         align='left')

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


BIO_ACT_KINDS = [
    ('feeder', 'Подкормочная площадка (кормушка)', 'шт'),
    ('field', 'Подкормочное поле (посев рапса)', 'га'),
    ('sowing', 'Участие в посевах', 'га'),
    ('salt', 'Солонец', 'шт'),
    ('gravel', 'Галечник', 'шт'),
    ('sign', 'Аншлаги и указатели', 'шт'),
    ('biotech', 'Прочие биотехнические работы', 'шт'),
    ('repair', 'Ремонты и стройки', 'шт'),
    ('fuel', 'Передано топливо', 'л'),
    ('grain', 'Передано зерно', 'кг'),
]

BIO_ACT_LABEL = dict((k, (label, unit)) for k, label, unit in BIO_ACT_KINDS)


def build_bio_act(guest, st, payload, works):
    """Акт сдачи-приёмки выполненных биотехнических мероприятий."""
    doc = Document()
    set_font(doc)
    sec = doc.sections[0]
    sec.top_margin = Cm(1.5)
    sec.bottom_margin = Cm(1.5)
    sec.left_margin = Cm(2.0)
    sec.right_margin = Cm(1.5)

    number = str(payload.get('number') or '').strip() or '____'
    para(doc, 'АКТ № ' + number, bold=True, align='center', size=14, space_after=0)
    para(doc, 'сдачи-приёмки выполненных биотехнических мероприятий',
         bold=True, align='center', size=12, space_after=10)

    signed = ru_date(payload.get('signed_on'))
    para(doc, (signed if signed else '«___» __________ 20___ г.'),
         align='left', space_after=0)
    para(doc, str(st.get('base_place') or ''), align='left', space_after=10)

    org = str(st.get('org_name') or '')
    director = str(st.get('org_director') or '')
    period = str(payload.get('period') or '').strip()
    para(doc, org + ', в лице директора ' + (director or '____________________') +
         ', именуемое далее «Заказчик», с одной стороны, и ' +
         doc_value(guest.get('name'), 40) + ', именуемый далее «Охотник», с другой '
         'стороны, составили настоящий акт о том, что Охотник выполнил, а Заказчик '
         'принял следующие биотехнические мероприятия' +
         (' за период ' + period if period else '') + ':', space_after=8)

    t = doc.add_table(rows=0, cols=5)
    t.style = 'Table Grid'
    head = t.add_row().cells
    for cell, title in zip(head, ['№', 'Вид мероприятия', 'Ед.', 'Объём', 'Место']):
        cell.text = title
        for p in cell.paragraphs:
            for r in p.runs:
                r.bold = True

    totals = {}
    hours = 0.0
    for i, w in enumerate(works, 1):
        kind = str(w.get('kind') or '')
        label, unit = BIO_ACT_LABEL.get(kind, (kind, str(w.get('unit') or 'шт')))
        qty = float(w.get('qty') or 0)
        hours += float(w.get('hours') or 0)
        totals[label] = totals.get(label, 0) + qty
        cells = t.add_row().cells
        cells[0].text = str(i)
        cells[1].text = label
        cells[2].text = unit
        cells[3].text = ('%g' % qty) if qty else '—'
        cells[4].text = str(w.get('place') or '—')

    if not works:
        cells = t.add_row().cells
        cells[1].text = 'Мероприятия не зафиксированы'

    widths = (Cm(1.2), Cm(7.5), Cm(1.6), Cm(2.2), Cm(5.0))
    for row in t.rows:
        for cell, w in zip(row.cells, widths):
            cell.width = w
            for p in cell.paragraphs:
                p.paragraph_format.space_after = Pt(2)
                for r in p.runs:
                    r.font.size = Pt(10)

    para(doc, '', space_after=6)
    if hours:
        para(doc, 'Всего отработано: ' + ('%g' % round(hours, 1)) + ' ч.', bold=True)

    licenses = payload.get('licenses') or []
    if licenses:
        para(doc, 'В соответствии с таблицей №1 договора выполненный объём даёт право '
                  'на получение разрешений на добычу:', space_before=6)
        for line in licenses:
            para(doc, '— ' + str(line), align='left', space_after=2)

    para(doc, 'Работы выполнены в полном объёме, Заказчик претензий по объёму и '
              'качеству не имеет. Настоящий акт является основанием для распределения '
              'разрешений на добычу охотничьих ресурсов в пределах имеющихся лимитов.',
         space_before=8)

    para(doc, '', space_after=12)
    sign = doc.add_table(rows=0, cols=2)
    sign.alignment = WD_TABLE_ALIGNMENT.CENTER
    r1 = sign.add_row().cells
    r1[0].text = 'ЗАКАЗЧИК:'
    r1[1].text = 'ОХОТНИК:'
    r2 = sign.add_row().cells
    r2[0].text = ('Директор ' + org + '\n\n______________ ' +
                  str(st.get('org_director_short') or '') +
                  '\n\n«___» _________ 20___ г.')
    r2[1].text = (doc_value(guest.get('name'), 30) +
                  '\n\n____________________________\n\n«___» _________ 20___ г.')
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
    """Делит номер охотбилета на серию и номер: 72 № 123456, 72-123456, 72123456."""
    raw = str(value or '').strip()
    if not raw:
        return '', ''
    cleaned = raw.replace('№', ' ').replace('-', ' ').replace('/', ' ')
    parts = [p for p in cleaned.split() if p]
    if len(parts) >= 2:
        return parts[0], ' '.join(parts[1:])
    one = parts[0] if parts else raw
    letters = ''.join(c for c in one if c.isalpha())
    digits = ''.join(c for c in one if c.isdigit())
    if letters and digits:
        return letters, digits
    if len(digits) > 6:
        return digits[:2], digits[2:]
    return '', one


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


def day_month_year(d):
    """Разбирает дату на «21» августа 2026 — как в бланке акта."""
    s = str(d or '')[:10]
    try:
        y, m, dd = s.split('-')
        return dd, MONTHS[int(m) - 1], y
    except (ValueError, IndexError):
        return '__', '__________', '20__'


def act_date_line(d):
    dd, mon, y = day_month_year(d)
    return '«' + dd + '» ' + mon + ' ' + y + ' г.'


KIND_LABEL = {'rifled': 'нарезное', 'smooth': 'гладкоствольное'}


def weapon_rows(w):
    dd, mon, y = day_month_year(w.get('roh_date'))
    roh = w.get('roh_number') or ''
    roh_line = ('серия и номер ' + str(roh) + ', выдано «' + dd + '» ' + mon +
                ' ' + y + ' г.') if roh else ''
    return [
        ('Тип оружия', KIND_LABEL.get(str(w.get('kind')), 'нарезное')),
        ('Марка, модель', str(w.get('name') or '')),
        ('Калибр', str(w.get('caliber') or '')),
        ('№ оружия', str(w.get('serial_no') or '')),
        ('РОХа', roh_line),
        ('Патроны', 'калибр ____________, тип ____________, количество ______ штук'),
    ]


def build_weapon_act(weapon, guest, act):
    """Собирает акт приёма-передачи оружия по образцу хозяйства."""
    doc = Document()
    set_font(doc, size=11)
    for s in doc.sections:
        s.top_margin = Cm(1.5)
        s.bottom_margin = Cm(1.2)
        s.left_margin = Cm(2.0)
        s.right_margin = Cm(1.5)

    para(doc, 'АКТ ПРИЕМА – ПЕРЕДАЧИ', bold=True, align='center', size=13)
    para(doc, 'охотничьего огнестрельного оружия', bold=True, align='center', size=12)
    para(doc, act_date_line(act.get('act_date')), align='center', space_after=8)

    para(doc,
         'Мы, нижеподписавшиеся, составили настоящий акт в том, что на основании '
         'статьи 24.1 Федерального закона №150-ФЗ «Об оружии», при совместной охоте '
         'на территории охотугодий «Кротовский» и «Бобровский» охотничьего хозяйства '
         '«Малышенское» (охотсоглашения №245 от 30.12.2020 с ООО «Эксперт Плюс» и '
         'охотсоглашение №242 от 24.12.2020 с ООО «ЭБНП»), в период совместной охоты:',
         space_after=8)

    para(doc, 'ОХОТНИК – ВЛАДЕЛЕЦ ОРУЖИЯ:', bold=True, space_after=2)
    para(doc, str(weapon.get('owner_name') or ''), align='center', space_after=0)
    para(doc, '(ФИО полностью)', align='center', size=8, space_after=8)

    para(doc, 'Временно передает для совместной охоты охотничье огнестрельное оружие:',
         space_after=4)
    two_col_table(doc, weapon_rows(weapon), widths=(5.5, 11.0))
    para(doc, '', space_after=6)

    para(doc, 'ОХОТНИК – ПОЛУЧАТЕЛЬ ОРУЖИЯ:', bold=True, space_after=2)
    para(doc, str(act.get('receiver_name') or guest.get('name') or ''),
         align='center', space_after=0)
    para(doc, '(ФИО полностью)', align='center', size=8, space_after=8)

    para(doc,
         'У ОХОТНИКА-ПОЛУЧАТЕЛЯ ОРУЖИЯ имеется действующее разрешение на право '
         'ношения и хранения оружия:', space_after=4)

    r_roh = act.get('receiver_roh') or guest.get('roh_number') or ''
    dd, mon, y = day_month_year(act.get('receiver_roh_date') or guest.get('roh_date'))
    para(doc, 'РОХа № ' + str(r_roh) + ' от «' + dd + '» ' + mon + ' ' + y + ' г.',
         bold=True, align='center', space_after=2)

    own = str(act.get('receiver_weapon') or guest.get('roh_weapon') or '').strip()
    if own:
        para(doc, own, align='center', space_after=0)
    para(doc, '(тип, марка, модель, калибр и номер имеющегося у охотника '
              'собственного оружия)', align='center', size=8, space_after=8)

    para(doc, 'ОРУЖИЕ и ПАТРОНЫ передаются на период совместной охоты в срок',
         space_after=2)
    d1, m1, y1 = day_month_year(act.get('hunt_from'))
    d2, m2, y2 = day_month_year(act.get('hunt_to'))
    para(doc, 'с «' + d1 + '» ' + m1 + ' ' + y1 + ' г. по «' + d2 + '» ' + m2 +
              ' ' + y2 + ' г.', bold=True, align='center', space_after=10)

    t = doc.add_table(rows=0, cols=2)
    t.style = 'Table Grid'
    head = t.add_row().cells
    head[0].text = 'ОХОТНИК-ВЛАДЕЛЕЦ ОРУЖИЯ:'
    head[1].text = 'ОХОТНИК-ПОЛУЧАТЕЛЬ ОРУЖИЯ:'
    for c in head:
        for p in c.paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.size = Pt(10)

    for left, right in (('ПЕРЕДАЛ', 'ПОЛУЧИЛ'), ('ПОЛУЧИЛ', 'ВОЗВРАТИЛ')):
        row = t.add_row().cells
        row[0].text = left
        row[1].text = right
        for c in row:
            for p in c.paragraphs:
                for r in p.runs:
                    r.bold = True
                    r.font.size = Pt(10)
        sign = t.add_row().cells
        for c in sign:
            c.text = '____________   «___» ____________ 20__ г.'
            c.add_paragraph('подпись                                  дата')
            for p in c.paragraphs:
                p.paragraph_format.space_after = Pt(2)
                for r in p.runs:
                    r.font.size = Pt(8) if 'подпись' in p.text else Pt(10)

    return doc_bytes(doc)


GROUNDS = {
    'krotovsky': {
        'title': 'охотугодья 72.3.6 "Кротовский" (ООО "Эксперт-Плюс")',
        'permit_prefix': '72',
    },
    'bobrovsky': {
        'title': 'охотугодья 72.3.5 "Бобровский" (ООО "Эксперт-Плюс")',
        'permit_prefix': '72',
    },
}

EXPERT = {
    'name': 'ООО "Эксперт-Плюс"',
    'director': 'Спиричеву М. Ю.',
    'director_short': 'Спиричев М. Ю.',
    'inn': 'ИНН 7203302257 / КПП 720301001',
    'region': '625003, Тюменская область,',
    'address': 'г. Тюмень, ул. Урицкого, д. 16, оф. 501',
    'phone': 'телефон: +7 (912) 929-52-85',
    'issuer': 'Земеров Н. А.',
}


def short_fio(full):
    """Спиричев Михаил Юрьевич -> Спиричев М. Ю."""
    parts = [p for p in str(full or '').replace(',', ' ').split() if p]
    if not parts:
        return ''
    out = parts[0]
    for p in parts[1:3]:
        out += ' ' + p[0].upper() + '.'
    return out


def dative_fio(full):
    """Спиричева Михаила Юрьевича -> Спиричеву М. Ю. (для шапки заявления)."""
    parts = [p for p in str(full or '').replace(',', ' ').split() if p]
    if not parts:
        return ''
    last = parts[0]
    if last.endswith('а') and len(last) > 3:
        last = last[:-1] + 'у'
    elif not last.endswith(('у', 'ю')):
        last = last + 'у'
    out = last
    for p in parts[1:3]:
        out += ' ' + p[0].upper() + '.'
    return out


def org_from_settings(st):
    """Реквизиты берём из настроек хозяйства, бланк — как запасной вариант."""
    name = str(st.get('org_name') or '').strip() or EXPERT['name']
    director_raw = str(st.get('org_director') or '').strip()
    inn = str(st.get('org_inn') or '7203302257').strip()
    kpp = str(st.get('org_kpp') or '720301001').strip()
    address = str(st.get('org_address') or '').strip()
    return {
        'name': name,
        'director': dative_fio(director_raw) if director_raw else EXPERT['director'],
        'director_short': (short_fio(director_raw) if director_raw
                           else EXPERT['director_short']),
        'inn': 'ИНН ' + inn + ' / КПП ' + kpp,
        'address': address or (EXPERT['region'] + ' ' + EXPERT['address']),
        'phone': EXPERT['phone'],
        'issuer': EXPERT['issuer'],
    }

RULES_LINE = (
    'С правилами охоты и техники безопасности при обращении с огнестрельным '
    'оружием, требованиями охотничьего законодательства, а так же с правилами '
    'пожарной безопасности ознакомлен'
)

CONSENT_LINE = (
    'Достоверность и полноту сведений подтверждаю и даю согласие на обработку '
    '(сбор, систематизацию, накопление, хранение, уточнение, передачу по запросу, '
    'использование и проверку) указанных в заявлении моих персональных данных в '
    'соответствии с Федеральным законом от 27 июля 2006 года №152 – ФЗ '
    '«О персональных данных». Даю согласие на получение информации по '
    'электронной почте.'
)


def split_passport(value):
    """Делит паспорт на серию и номер: 7112 345678 или 71 12 № 345678."""
    digits = ''.join(c for c in str(value or '') if c.isdigit())
    if len(digits) >= 10:
        return digits[:4], digits[4:10]
    if not digits:
        return '', ''
    return digits[:4], digits[4:]


def date_slots(d):
    """Возвращает «21» августа 2026 в формате бланка: «21» августа 2026 г."""
    dd, mon, y = day_month_year(d)
    return '«' + dd + '» ' + mon + ' ' + y + ' г.'


def permit_line(doc, label, value, size=11):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after = Pt(3)
    r1 = p.add_run(label)
    r1.font.size = Pt(size)
    text = str(value or '').strip()
    r2 = p.add_run(' ' + (text or '_' * 40))
    r2.font.size = Pt(size)
    r2.underline = bool(text)
    return p


def caption(doc, text):
    para(doc, text, align='center', size=7, space_after=6)


def build_application(guest, payload, ground, org):
    """Заявление на выдачу разрешения на имя директора хозяйства."""
    doc = Document()
    set_font(doc, size=11)
    for s in doc.sections:
        s.page_width = Cm(21.0)
        s.page_height = Cm(29.7)
        s.top_margin = Cm(1.5)
        s.bottom_margin = Cm(1.2)
        s.left_margin = Cm(2.0)
        s.right_margin = Cm(1.5)

    para(doc, 'Директору ' + org['name'], align='right', space_after=0)
    para(doc, org['director'], align='right', space_after=6)

    name = str(guest.get('name') or '')
    para(doc, 'от ' + (name or '_' * 45), align='right', space_after=0)
    para(doc, '(Ф.И.О. полностью)', align='right', size=7, space_after=6)

    ser, num = split_passport(guest.get('passport'))
    para(doc, 'Паспорт: серия ' + (ser or '____') + '  № ' + (num or '______'),
         align='right', space_after=2)
    para(doc, 'Выдан: ' + (str(guest.get('passport_issued') or '') or '_' * 40),
         align='right', space_after=2)
    para(doc, 'от ' + date_slots(guest.get('passport_date')), align='right', space_after=4)
    para(doc, 'проживающего (ей) по адресу:', align='right', space_after=0)
    para(doc, str(guest.get('address') or '') or '_' * 45, align='right', space_after=4)
    para(doc, 'ИНН ' + (str(guest.get('inn') or '') or '_' * 14) +
              '      СНИЛС ' + (str(guest.get('snils') or '') or '_' * 16),
         align='right', space_after=2)
    para(doc, 'контактный телефон: ' + (str(guest.get('phone') or '') or '_' * 20),
         align='right', space_after=10)

    para(doc, 'ЗАЯВЛЕНИЕ от ' + date_slots(payload.get('apply_on')),
         bold=True, align='center', size=13, space_after=10)

    para(doc, '    Прошу выдать разрешение для осуществления любительской и '
              'спортивной охоты в предполагаемые сроки на добычу:', space_after=6)

    rows = payload.get('species') or []
    if not rows:
        rows = [{'name': '', 'qty': '', 'sex': '', 'age': ''}]

    d1 = date_slots(payload.get('date_from'))
    d2 = date_slots(payload.get('date_to'))

    for r in rows:
        line = (str(r.get('name') or '_' * 25) + ', в количестве ' +
                str(r.get('qty') or '__') + ' ос., пол ' +
                (str(r.get('sex') or '') or '____') + ', возраст ' +
                (str(r.get('age') or '') or '____'))
        para(doc, line, space_after=0)
        caption(doc, 'охотничьи ресурсы                    пол                    возраст')
        para(doc, 'с ' + d1 + ' по ' + d2, space_after=8)

    para(doc, 'на территории  ' + ground['title'], space_after=0)
    caption(doc, '(места охоты, наименование охотничьего угодья)')

    tser, tnum = split_ticket(guest.get('hunt_ticket'))
    para(doc, 'Охотничий билет: серия ' + (tser or '____') + '  № ' + (tnum or '______'),
         space_after=3)
    permit_line(doc, 'Кем выдан:', guest.get('hunt_ticket_issued'))
    para(doc, 'Дата выдачи: ' + date_slots(guest.get('hunt_ticket_date')), space_after=8)

    sign = short_fio(name)
    para(doc, RULES_LINE, space_after=10)
    para(doc, 'Подпись ______________________ / ' + (sign or '_' * 26) + ' /',
         space_after=12)

    para(doc, '    ' + CONSENT_LINE, space_after=12)
    para(doc, 'Подпись ______________________ / ' + (sign or '_' * 26) + ' /',
         space_after=0)

    return doc


def cpara(cell, text='', bold=False, align='left', size=8, space_after=2,
          underline=False):
    """Абзац внутри ячейки — экземпляр путёвки рисуем в колонке таблицы."""
    p = cell.add_paragraph()
    p.alignment = {
        'just': WD_ALIGN_PARAGRAPH.JUSTIFY,
        'center': WD_ALIGN_PARAGRAPH.CENTER,
        'left': WD_ALIGN_PARAGRAPH.LEFT,
        'right': WD_ALIGN_PARAGRAPH.RIGHT,
    }[align]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.0
    if text:
        r = p.add_run(text)
        r.bold = bold
        r.underline = underline
        r.font.size = Pt(size)
    return p


def cline(cell, label, value, size=8, fill=40):
    """Строка «Подпись: ______» с подчёркнутым значением."""
    p = cell.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.0
    r1 = p.add_run(label)
    r1.font.size = Pt(size)
    text = str(value or '').strip()
    r2 = p.add_run(' ' + (text or '_' * fill))
    r2.font.size = Pt(size)
    r2.underline = bool(text)
    return p


def ccaption(cell, text, size=6):
    cpara(cell, text, align='center', size=size, space_after=3)


def no_borders(table):
    """Убираем рамку — таблица нужна только как две колонки-экземпляра."""
    tbl = table._tbl
    pr = tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        el = OxmlElement('w:' + edge)
        el.set(qn('w:val'), 'none')
        el.set(qn('w:sz'), '0')
        borders.append(el)
    pr.append(borders)


def species_table(cell, rows, money):
    """Таблица добычи внутри экземпляра путёвки."""
    t = cell.add_table(rows=0, cols=4)
    t.style = 'Table Grid'
    last = 'Стоимость услуги (руб.)' if money else 'Отработано часов'
    titles = ['№', 'Разрешено к добыче\n(виды охотничьих ресурсов)',
              'Норма добычи\n(кол-во, ос)', last + '\nили кол-во часов']
    widths = (Cm(0.8), Cm(5.6), Cm(2.4), Cm(3.0))
    head = t.add_row().cells
    for i, title in enumerate(titles):
        head[i].text = title
        head[i].width = widths[i]
        for p in head[i].paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.0
            for r in p.runs:
                r.bold = True
                r.font.size = Pt(6)

    total = 0.0
    body = rows if rows else [{}]
    for i, r in enumerate(body, start=1):
        cells = t.add_row().cells
        price = r.get('price')
        try:
            total += float(price or 0)
        except (TypeError, ValueError):
            pass
        if money:
            last_val = '' if price in (None, '') else str(price)
        else:
            last_val = str(r.get('hours') or '')
        vals = [str(i), str(r.get('name') or ''), str(r.get('qty') or ''), last_val]
        for j, v in enumerate(vals):
            cells[j].text = v
            cells[j].width = widths[j]
            for p in cells[j].paragraphs:
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.0
                for run in p.runs:
                    run.font.size = Pt(7)

    for _ in range(max(0, 3 - len(body))):
        blank = t.add_row().cells
        for j, c in enumerate(blank):
            c.text = ''
            c.width = widths[j]
    return total


def permit_copy(cell, guest, payload, ground, org, mark):
    """Один экземпляр путёвки-договора — хозяйства или охотника."""
    money = not bool(payload.get('labour'))

    cpara(cell, mark, bold=True, align='right', size=8, space_after=1)
    cpara(cell, org['name'], bold=True, size=8, space_after=0)
    cpara(cell, org['inn'], size=7, space_after=0)
    cpara(cell, org['address'], size=7, space_after=0)
    cpara(cell, org['phone'], size=7, space_after=0)
    cpara(cell, 'Без права передачи', align='right', size=7, space_after=3)

    doc_no = str(payload.get('doc_no') or '')
    cpara(cell, 'ПУТЁВКА (ДОГОВОР) № ' + (doc_no or '_' * 10),
          bold=True, align='center', size=10, space_after=1)
    permit = str(payload.get('permit_no') or '')
    cpara(cell, 'к разрешению ' + ground['permit_prefix'] + ' № ' + (permit or '_' * 14),
          align='center', size=8, space_after=4)

    cpara(cell, 'На право охоты в охотничьих угодьях ' + org['name'] + ':',
          size=8, space_after=1)
    cpara(cell, 'Место охоты:  ' + ground['title'], size=8, space_after=0)
    ccaption(cell, '(указать точное место охоты)')

    cpara(cell, 'с ' + date_slots(payload.get('date_from')) + ' по ' +
          date_slots(payload.get('date_to')), size=8, space_after=4)

    name = str(guest.get('name') or '')
    cpara(cell, 'Выдана  ' + (name or '_' * 38), size=8, space_after=0)
    ccaption(cell, '(фамилия, имя, отчество охотника)')

    tser, tnum = split_ticket(guest.get('hunt_ticket'))
    cpara(cell, 'Охотничий билет: серия ' + (tser or '____') + '  № ' + (tnum or '______'),
          size=8, space_after=2)
    cline(cell, 'Кем выдан:', guest.get('hunt_ticket_issued'), fill=30)
    cpara(cell, 'Дата выдачи: ' + date_slots(guest.get('hunt_ticket_date')),
          size=8, space_after=3)

    cline(cell, 'Особая отметка', payload.get('special_note'), fill=28)
    ccaption(cell, '(охота с ловчей птицей, манной птицей, охотничьей собакой и т.п.)')

    total = species_table(cell, payload.get('species') or [], money)
    cpara(cell, '', space_after=2)

    if money:
        cline(cell, 'Итого оплачено:', rub_words(total), fill=30)
        ccaption(cell, '(сумма в рублях прописью)')
    else:
        cline(cell, 'Итого оплачено:', 'В счет трудоучастия', fill=30)
        ccaption(cell, '(сумма в рублях прописью)')

    cline(cell, 'Примечание:', payload.get('note'), fill=32)

    cpara(cell, 'Инструктаж по правилам охоты и техники безопасности при обращении '
          'с огнестрельным оружием, и правилам пожарной безопасности проведен:',
          size=7, align='just', space_after=3)

    instructor = str(payload.get('instructor') or org['issuer'])
    short_name = short_fio(name)
    cpara(cell, 'Инструктаж провел: ____________ / ' + instructor, size=8, space_after=3)
    cpara(cell, 'Инструктаж прошел: ____________ / ' + (short_name or '_' * 20),
          size=8, space_after=5)

    cpara(cell, 'Путёвку получил  ' + (short_name or '_' * 30), size=8, space_after=0)
    ccaption(cell, '(фамилия, имя, отчество охотника)')
    cpara(cell, 'Дата ____________     Подпись ____________', size=8, space_after=4)

    cpara(cell, 'Путёвку выдал  ' + org['issuer'], size=8, space_after=0)
    ccaption(cell, 'фамилия, имя, отчество представителя организации (хозяйства)')
    cpara(cell, 'Дата ____________     Подпись ____________', size=8, space_after=1)
    cpara(cell, 'М.П.', align='right', size=8, space_after=0)


def build_permit_body(doc, guest, payload, ground, org):
    """Путёвка-договор: альбомный лист, два экземпляра через линию отрыва."""
    land = doc.add_section(WD_SECTION.NEW_PAGE)
    land.orientation = WD_ORIENT.LANDSCAPE
    land.page_width = Cm(29.7)
    land.page_height = Cm(21.0)
    land.top_margin = Cm(0.8)
    land.bottom_margin = Cm(0.6)
    land.left_margin = Cm(0.8)
    land.right_margin = Cm(0.8)

    t = doc.add_table(rows=1, cols=3)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    no_borders(t)
    left, mid, right = t.rows[0].cells
    left.width = Cm(13.2)
    mid.width = Cm(0.6)
    right.width = Cm(13.2)

    for c in (left, mid, right):
        c.paragraphs[0]._p.getparent().remove(c.paragraphs[0]._p)

    permit_copy(left, guest, payload, ground, org, 'Экземпляр ХОЗЯЙСТВА')
    cut_line(mid)
    permit_copy(right, guest, payload, ground, org, 'Экземпляр ОХОТНИКА')
    return doc


def cut_line(cell):
    """Вертикальная линия отрыва между экземплярами."""
    p = cell.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.0
    for _ in range(58):
        r = p.add_run('\u2502\n')
        r.font.size = Pt(7)


ONES = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
        'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
        'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят',
        'восемьдесят', 'девяносто']
HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот',
            'восемьсот', 'девятьсот']


def under_thousand(n, female=False):
    out = []
    if n >= 100:
        out.append(HUNDREDS[n // 100])
        n %= 100
    if n >= 20:
        out.append(TENS[n // 10])
        n %= 10
    if n:
        word = ONES[n]
        if female and n == 1:
            word = 'одна'
        if female and n == 2:
            word = 'две'
        out.append(word)
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


def rub_words(value):
    """Сумма прописью: 15000 -> «15 000 (пятнадцать тысяч) рублей 00 копеек»."""
    try:
        amount = float(value or 0)
    except (TypeError, ValueError):
        amount = 0.0
    rub = int(amount)
    kop = int(round((amount - rub) * 100))
    if rub == 0:
        words = 'ноль'
    else:
        parts = []
        thousands = rub // 1000
        rest = rub % 1000
        if thousands:
            parts.append(under_thousand(thousands, female=True))
            parts.append(plural(thousands, ['тысяча', 'тысячи', 'тысяч']))
        if rest:
            parts.append(under_thousand(rest))
        words = ' '.join(p for p in parts if p)
    pretty = '{:,}'.format(rub).replace(',', ' ')
    return (pretty + ' (' + words + ') ' + plural(rub, ['рубль', 'рубля', 'рублей']) +
            ' ' + '{:02d}'.format(kop) + ' ' +
            plural(kop, ['копейка', 'копейки', 'копеек']))


def build_permit(guest, payload, st):
    """Пакет: заявление + путёвка-договор в одном файле."""
    key = str(payload.get('ground') or 'krotovsky')
    ground = GROUNDS.get(key, GROUNDS['krotovsky'])
    org = org_from_settings(st or {})
    doc = build_application(guest, payload, ground, org)
    build_permit_body(doc, guest, payload, ground, org)
    return doc_bytes(doc)


def doc_bytes(doc):
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


DOCX_MIME = ('application/vnd.openxmlformats-officedocument.'
             'wordprocessingml.document')


def store_doc(cur, data, kind, title, file_name, doc_date, people, user):
    """Кладёт готовый файл в хранилище и заводит запись в списке документов."""
    key = 'docs/' + uuid.uuid4().hex + '.docx'
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=data, ContentType=DOCX_MIME)
    url = ('https://cdn.poehali.dev/projects/' + os.environ['AWS_ACCESS_KEY_ID'] +
           '/bucket/' + key)

    def q(v):
        if v is None or v == '':
            return 'NULL'
        return "'" + str(v).replace("'", "''") + "'"

    uid = str(int(user['id'])) if user else 'NULL'
    cur.execute(
        'INSERT INTO documents (kind, title, file_url, file_name, doc_date, people, '
        'created_by, created_by_name) VALUES (' +
        q(kind) + ', ' + q(title) + ', ' + q(url) + ', ' + q(file_name) + ', ' +
        q(doc_date) + ', ' + str(int(people or 0)) + ', ' + uid + ', ' +
        q(user['name'] if user else None) + ')'
    )
    return url


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

    if str(user.get('login') or '').lower() == 'rustore':
        cur.close()
        conn.close()
        return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({
            'error': 'Демонстрационный доступ — документы недоступны'})}

    if kind == 'permit':
        payload = json.loads(event.get('body') or '{}')
        gid = payload.get('guest_id')
        if not gid or not str(gid).isdigit():
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Не выбран охотник'})}

        cur.execute('SELECT * FROM guests WHERE id = ' + str(int(gid)))
        grow = cur.fetchone()
        if not grow:
            cur.close()
            conn.close()
            return {'statusCode': 404, 'headers': CORS,
                    'body': json.dumps({'error': 'Охотник не найден'})}

        guest = dict(grow)
        cur.execute('SELECT * FROM settings WHERE id = 1')
        srow = cur.fetchone()
        st = dict(srow) if srow else {}

        data = build_permit(guest, payload, st)

        who = str(guest.get('name') or 'охотник')
        gkey = str(payload.get('ground') or 'krotovsky')
        gname = 'Кротовский' if gkey == 'krotovsky' else 'Бобровский'
        title = 'Путёвка ' + gname + ' — ' + who
        fname = ('Путёвка ' + who + ' ' + gname).replace(' ', '_') + '.docx'
        url = store_doc(cur, data, 'permit', title, fname,
                        payload.get('date_from') or None, 1, user)

        def qp(v):
            if v is None or v == '':
                return 'NULL'
            return "'" + str(v).replace("'", "''") + "'"

        rows = payload.get('species') or []
        species_text = '; '.join(
            str(r.get('name') or '') + ' — ' + str(r.get('qty') or '') + ' ос.'
            for r in rows if r.get('name')
        )
        total = 0.0
        for r in rows:
            try:
                total += float(r.get('price') or 0)
            except (TypeError, ValueError):
                pass

        cur.execute(
            'INSERT INTO permits (guest_id, guest_name, ground, permit_no, apply_on, '
            'date_from, date_to, species, total, note, special_note, file_url, '
            'file_name, created_by, created_by_name) VALUES ('
            + str(int(gid)) + ', ' + qp(who) + ', ' + qp(gkey) + ', '
            + qp(payload.get('permit_no')) + ', ' + qp(payload.get('apply_on')) + ', '
            + qp(payload.get('date_from')) + ', ' + qp(payload.get('date_to')) + ', '
            + qp(species_text) + ', ' + str(total) + ', '
            + qp(payload.get('note')) + ', ' + qp(payload.get('special_note')) + ', '
            + qp(url) + ', ' + qp(fname) + ', ' + str(int(user['id'])) + ', '
            + qp(user['name']) + ') RETURNING id'
        )
        new_id = cur.fetchone()['id']

        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': CORS,
            'body': json.dumps({
                'id': new_id,
                'url': url,
                'file_name': fname,
                'title': title,
                'total': total,
                'email': guest.get('email') or '',
                'phone': guest.get('phone') or '',
                'file': base64.b64encode(data).decode(),
            }),
        }

    if kind == 'bio_act':
        payload = json.loads(event.get('body') or '{}')
        guest = {}
        gid = payload.get('guest_id')
        works = []
        if gid and str(gid).isdigit():
            cur.execute('SELECT * FROM guests WHERE id = ' + str(int(gid)))
            grow = cur.fetchone()
            if grow:
                guest = dict(grow)
            sql = ('SELECT w.kind, w.qty, w.unit, w.hours, w.work_on, '
                   'COALESCE(l.name, w.place) AS place FROM biotech_works w '
                   'LEFT JOIN locations l ON l.id = w.location_id '
                   'WHERE w.guest_id = ' + str(int(gid)) +
                   " AND COALESCE(w.archived, FALSE) = FALSE")
            year = payload.get('year')
            if year and str(year).isdigit():
                sql += " AND EXTRACT(YEAR FROM w.work_on) = " + str(int(year))
            sql += ' ORDER BY w.work_on'
            cur.execute(sql)
            works = [dict(r) for r in cur.fetchall()]
        cur.execute('SELECT * FROM settings WHERE id = 1')
        srow = cur.fetchone()
        st = dict(srow) if srow else {}
        data = build_bio_act(guest, st, payload, works)
        who = str(guest.get('name') or 'бланк')
        store_doc(cur, data, 'bio_act', 'Акт биотехнических работ — ' + who,
                  'Акт биотехния ' + who.replace(' ', '_') + '.docx',
                  payload.get('signed_on') or None, 1, user)
        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': DOCX_MIME,
                'Content-Disposition': 'attachment; filename="bio_act.docx"',
            },
            'isBase64Encoded': True,
            'body': base64.b64encode(data).decode(),
        }

    if kind == 'weapon_act':
        if str(user.get('login') or '').lower() != 'uan':
            cur.close()
            conn.close()
            return {'statusCode': 403, 'headers': CORS,
                    'body': json.dumps({'error': 'Раздел закрыт'})}
        payload = json.loads(event.get('body') or '{}')
        wid = payload.get('weapon_id')
        gid = payload.get('guest_id')
        if not (wid and str(wid).isdigit()) or not (gid and str(gid).isdigit()):
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'Выберите карабин и охотника'})}

        cur.execute('SELECT * FROM weapons WHERE id = ' + str(int(wid)))
        wrow = cur.fetchone()
        cur.execute('SELECT * FROM guests WHERE id = ' + str(int(gid)))
        grow = cur.fetchone()
        if not wrow or not grow:
            cur.close()
            conn.close()
            return {'statusCode': 404, 'headers': CORS,
                    'body': json.dumps({'error': 'Карабин или охотник не найден'})}

        weapon = dict(wrow)
        guest = dict(grow)
        data = build_weapon_act(weapon, guest, payload)

        who = str(guest.get('name') or '')
        gun = str(weapon.get('name') or '')
        title = 'Акт передачи ' + gun + ' — ' + who
        fname = ('Акт ' + gun + ' ' + who).replace(' ', '_') + '.docx'
        url = store_doc(cur, data, 'weapon_act', title, fname,
                        payload.get('act_date') or None, 1, user)

        def qv(v):
            if v is None or v == '':
                return 'NULL'
            return "'" + str(v).replace("'", "''") + "'"

        cur.execute(
            'INSERT INTO weapon_acts (weapon_id, guest_id, act_date, hunt_from, '
            'hunt_to, receiver_name, receiver_roh, receiver_roh_date, '
            'receiver_weapon, file_url, created_by, created_by_name) VALUES ('
            + str(int(wid)) + ', ' + str(int(gid)) + ', '
            + qv(payload.get('act_date')) + ', ' + qv(payload.get('hunt_from')) + ', '
            + qv(payload.get('hunt_to')) + ', '
            + qv(payload.get('receiver_name') or guest.get('name')) + ', '
            + qv(payload.get('receiver_roh') or guest.get('roh_number')) + ', '
            + qv(payload.get('receiver_roh_date') or guest.get('roh_date')) + ', '
            + qv(payload.get('receiver_weapon') or guest.get('roh_weapon')) + ', '
            + qv(url) + ', ' + str(int(user['id'])) + ', ' + qv(user.get('name')) + ')'
        )

        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': DOCX_MIME,
                'Content-Disposition': 'attachment; filename="weapon_act.docx"',
            },
            'isBase64Encoded': True,
            'body': base64.b64encode(data).decode(),
        }

    if kind == 'biotech':
        payload = json.loads(event.get('body') or '{}')
        guest = {}
        gid = payload.get('guest_id')
        if gid and str(gid).isdigit():
            cur.execute('SELECT * FROM guests WHERE id = ' + str(int(gid)))
            grow = cur.fetchone()
            if grow:
                guest = dict(grow)
        cur.execute('SELECT * FROM settings WHERE id = 1')
        srow = cur.fetchone()
        st = dict(srow) if srow else {}
        data = build_biotech(guest, st, payload)
        who = str(guest.get('name') or 'бланк')
        store_doc(cur, data, 'biotech', 'Договор по биотехнии — ' + who,
                  'Биотехния ' + who.replace(' ', '_') + '.docx',
                  payload.get('signed_on') or None, 1, user)
        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': DOCX_MIME,
                'Content-Disposition': 'attachment; filename="biotech.docx"',
            },
            'isBase64Encoded': True,
            'body': base64.b64encode(data).decode(),
        }

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
        data = build_collective(payload, hunters, st)
        day = str(payload.get('hunt_date') or '')[:10]
        title = 'Коллективная охота ' + (ru_date(day) if day else '')
        file_name = 'Коллективная охота ' + (day or 'без даты') + '.docx'
        store_doc(cur, data, 'collective', title.strip(), file_name,
                  day or None, len(hunters), user)
        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': DOCX_MIME,
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

    data = build_contract(guest, st)
    fio = str(guest.get('name') or 'охотник').replace(' ', '_')
    store_doc(cur, data, 'contract', 'Договор — ' + str(guest.get('name') or ''),
              'Договор ' + fio + '.docx', None, 1, user)
    cur.close()
    conn.close()
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': DOCX_MIME,
            'Content-Disposition': 'attachment; filename="dogovor.docx"',
            'X-File-Name': fio,
        },
        'isBase64Encoded': True,
        'body': base64.b64encode(data).decode(),
    }