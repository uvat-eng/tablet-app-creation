import { Row } from '@/lib/api';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const dmy = (v: unknown) => {
  const s = String(v || '').slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return { d: '__', m: '__________', y: '20__' };
  return { d, m: MONTHS[Number(m) - 1] || '', y };
};

const on = (v: unknown) => {
  const p = dmy(v);
  return `«${p.d}» ${p.m} ${p.y} г.`;
};

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export interface ActData {
  actDate: string;
  from: string;
  to: string;
}

export const printAct = (weapon: Row, guest: Row, act: ActData) => {
  const kind = String(weapon.kind) === 'smooth' ? 'гладкоствольное' : 'нарезное';
  const roh = String(weapon.roh_number || '');
  const rohLine = roh ? `серия и номер ${esc(roh)}, выдано ${on(weapon.roh_date)}` : '';

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Акт приёма-передачи</title>
<style>
  @page { size: A4; margin: 15mm 15mm 12mm 20mm; }
  body { font-family: "Times New Roman", serif; font-size: 11pt; line-height: 1.25;
         color: #000; margin: 0; }
  h1 { font-size: 13pt; text-align: center; margin: 0 0 2px; }
  h2 { font-size: 12pt; text-align: center; margin: 0 0 6px; font-weight: bold; }
  .c { text-align: center; }
  .j { text-align: justify; }
  .b { font-weight: bold; }
  .small { font-size: 8pt; }
  .mt { margin-top: 10px; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0; }
  td { border: 1px solid #000; padding: 3px 6px; font-size: 10pt; vertical-align: top; }
  td.k { width: 34%; }
  .sign td { height: 46px; }
  @media print { .noprint { display: none !important; } }
  .noprint { position: fixed; top: 12px; right: 12px; }
  .noprint button { font: inherit; padding: 8px 16px; cursor: pointer; }
</style></head><body>
<div class="noprint"><button onclick="window.print()">Печать</button></div>

<h1>АКТ ПРИЕМА – ПЕРЕДАЧИ</h1>
<h2>охотничьего огнестрельного оружия</h2>
<p class="c">${on(act.actDate)}</p>

<p class="j">Мы, нижеподписавшиеся, составили настоящий акт в том, что на основании
статьи 24.1 Федерального закона №150-ФЗ «Об оружии», при совместной охоте на
территории охотугодий «Кротовский» и «Бобровский» охотничьего хозяйства
«Малышенское» (охотсоглашения №245 от 30.12.2020 с ООО «Эксперт Плюс» и
охотсоглашение №242 от 24.12.2020 с ООО «ЭБНП»), в период совместной охоты:</p>

<p class="b">ОХОТНИК – ВЛАДЕЛЕЦ ОРУЖИЯ:</p>
<p class="c" style="margin:2px 0 0">${esc(weapon.owner_name)}</p>
<p class="c small" style="margin:0 0 8px">(ФИО полностью)</p>

<p>Временно передает для совместной охоты охотничье огнестрельное оружие:</p>
<table>
  <tr><td class="k">Тип оружия</td><td>${kind}</td></tr>
  <tr><td class="k">Марка, модель</td><td>${esc(weapon.name)}</td></tr>
  <tr><td class="k">Калибр</td><td>${esc(weapon.caliber)}</td></tr>
  <tr><td class="k">№ оружия</td><td>${esc(weapon.serial_no)}</td></tr>
  <tr><td class="k">РОХа</td><td>${rohLine}</td></tr>
  <tr><td class="k">Патроны</td><td>калибр ____________, тип ____________,
      количество ______ штук</td></tr>
</table>

<p class="b mt">ОХОТНИК – ПОЛУЧАТЕЛЬ ОРУЖИЯ:</p>
<p class="c" style="margin:2px 0 0">${esc(guest.name)}</p>
<p class="c small" style="margin:0 0 8px">(ФИО полностью)</p>

<p>У ОХОТНИКА-ПОЛУЧАТЕЛЯ ОРУЖИЯ имеется действующее разрешение на право ношения
и хранения оружия:</p>
<p class="c b" style="margin:2px 0">РОХа № ${esc(guest.roh_number)} от
${on(guest.roh_date)}</p>
${guest.roh_weapon ? `<p class="c" style="margin:0">${esc(guest.roh_weapon)}</p>` : ''}
<p class="c small" style="margin:0 0 8px">(тип, марка, модель, калибр и номер
имеющегося у охотника собственного оружия)</p>

<p>ОРУЖИЕ и ПАТРОНЫ передаются на период совместной охоты в срок</p>
<p class="c b">с ${on(act.from)} по ${on(act.to)}</p>

<table class="mt">
  <tr><td class="b" style="width:50%">ОХОТНИК-ВЛАДЕЛЕЦ ОРУЖИЯ:</td>
      <td class="b">ОХОТНИК-ПОЛУЧАТЕЛЬ ОРУЖИЯ:</td></tr>
  <tr><td class="b">ПЕРЕДАЛ</td><td class="b">ПОЛУЧИЛ</td></tr>
  <tr class="sign">
    <td>____________ «___» __________ 20__ г.<br><span class="small">подпись
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; дата</span></td>
    <td>____________ «___» __________ 20__ г.<br><span class="small">подпись
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; дата</span></td></tr>
  <tr><td class="b">ПОЛУЧИЛ</td><td class="b">ВОЗВРАТИЛ</td></tr>
  <tr class="sign">
    <td>____________ «___» __________ 20__ г.<br><span class="small">подпись
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; дата</span></td>
    <td>____________ «___» __________ 20__ г.<br><span class="small">подпись
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; дата</span></td></tr>
</table>

<script>window.addEventListener('load', function () {
  setTimeout(function () { window.print(); }, 300);
});</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
};
