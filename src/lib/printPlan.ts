import { Row } from '@/lib/api';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const ru = (v: unknown) => {
  const s = String(v || '').slice(0, 10);
  const [y, m, d] = s.split('-');
  return d && m && y ? `${d}.${m}.${y}` : '';
};

export const planPeriod = (plan: Row) => {
  const a = ru(plan.date_from);
  const b = ru(plan.date_to);
  if (a && b && a !== b) return `${a} – ${b}`;
  return a || b || '';
};

export const planText = (plan: Row, rows: Row[]) => {
  const head = [String(plan.title || 'Охота'), planPeriod(plan)].filter(Boolean).join(' · ');
  const body = rows.map((r, i) => {
    const parts = [
      String(r.hunter_name || '—'),
      r.weapon_name ? `оружие: ${r.weapon_name}` : '',
      r.keeper_name ? `егерь: ${r.keeper_name}` : '',
      r.transport_name ? `транспорт: ${r.transport_name}` : '',
      r.location_name ? `место: ${r.location_name}` : '',
    ].filter(Boolean);
    return `${i + 1}. ${parts.join(' | ')}`;
  });
  const tail = plan.note ? `\n${String(plan.note)}` : '';
  return `${head}\n\n${body.join('\n')}${tail}`;
};

export const printPlan = (plan: Row, rows: Row[]) => {
  const period = planPeriod(plan);
  const trs = rows
    .map(
      (r, i) => `<tr>
  <td class="n">${i + 1}</td>
  <td>${esc(r.hunter_name)}</td>
  <td>${esc(r.weapon_name)}</td>
  <td>${esc(r.keeper_name)}</td>
  <td>${esc(r.transport_name)}</td>
  <td>${esc(r.location_name)}</td>
</tr>`,
    )
    .join('');

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>${esc(plan.title)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: "Times New Roman", serif; font-size: 11pt; color: #000; margin: 0; }
  h1 { font-size: 15pt; margin: 0 0 4px; }
  .sub { font-size: 10pt; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 5px 6px; text-align: left; vertical-align: top; }
  th { font-size: 9pt; text-transform: uppercase; background: #f2f2f0; }
  td.n { width: 28px; text-align: center; }
  .note { margin-top: 12px; font-size: 10pt; white-space: pre-wrap; }
</style></head><body>
<h1>${esc(plan.title || 'План охоты')}</h1>
<div class="sub">${esc(period)}${
    plan.created_by_name ? ` · составил: ${esc(plan.created_by_name)}` : ''
  }</div>
<table>
  <thead><tr>
    <th>№</th><th>Охотник</th><th>Оружие</th><th>Егерь</th><th>Транспорт</th><th>Локация</th>
  </tr></thead>
  <tbody>${trs}</tbody>
</table>
${plan.note ? `<div class="note">${esc(plan.note)}</div>` : ''}
<script>window.onload = function () { window.print(); };</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
};
