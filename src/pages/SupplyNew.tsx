import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import {
  CATEGORIES,
  FACILITIES,
  SUPPLY_COLOR,
  SUPPLY_STATUS,
  SupplyTemplate,
  TEMPLATES,
  UNITS,
  URGENCY,
  money,
} from '@/lib/supply';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

interface Line {
  key: number;
  name: string;
  qty: number;
  unit: string;
  facility: string;
  est_price: number;
  note: string;
}

const blank = (): Line => ({
  key: Date.now() + Math.random(),
  name: '',
  qty: 1,
  unit: 'шт',
  facility: 'Общее',
  est_price: 0,
  note: '',
});

const SupplyNew = () => {
  const [orders, setOrders] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState(0);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [urgency, setUrgency] = useState('normal');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([blank()]);

  const load = useCallback(async () => {
    setLoading(true);
    const [o, i] = await Promise.all([listRows('supply_orders'), listRows('supply_items')]);
    setOrders(o);
    setItems(i);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const planned = lines.reduce((s, l) => s + Number(l.est_price || 0) * Number(l.qty || 0), 0);

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const reset = () => {
    setTitle('');
    setCategory(CATEGORIES[0]);
    setUrgency('normal');
    setNote('');
    setLines([blank()]);
    setForm(false);
  };

  const applyTemplate = (t: SupplyTemplate) => {
    setTitle(t.title);
    setCategory(t.category);
    setLines(
      t.lines.map((l) => ({
        key: Date.now() + Math.random(),
        name: l.name,
        qty: l.qty,
        unit: l.unit,
        facility: l.facility,
        est_price: l.est_price,
        note: '',
      })),
    );
    setForm(true);
    toast.success(`Шаблон «${t.title}» подставлен — поправьте под себя`);
  };

  const submit = async () => {
    const filled = lines.filter((l) => l.name.trim());
    if (!filled.length) {
      toast.error('Впишите хотя бы одну позицию');
      return;
    }
    setSaving(true);
    try {
      const order = await createRow('supply_orders', {
        title: title.trim() || `${category} · ${new Date().toLocaleDateString('ru-RU')}`,
        category,
        urgency,
        note,
        planned_total: planned,
        facility: Array.from(new Set(filled.map((l) => l.facility))).join(', '),
      });
      const oid = Number(order.id);
      for (const l of filled) {
        await createRow('supply_items', {
          order_id: oid,
          name: l.name.trim(),
          qty: Number(l.qty || 1),
          unit: l.unit,
          facility: l.facility,
          est_price: Number(l.est_price || 0),
          note: l.note,
        });
      }
      toast.success('Заявка отправлена руководству');
      reset();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (o: Row) => {
    if (!confirm('Убрать заявку из списка?')) return;
    try {
      await updateRow('supply_orders', { id: Number(o.id), archived: true });
      toast.success('Заявка убрана');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не получилось');
    }
  };

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white';
  const cell = 'w-full border border-[#e2e2df] px-2 py-1 text-[0.72em] bg-white';

  return (
    <Layout
      index="Раздел / Заказ"
      title="Заказ для обеспечения хозяйства"
      lede="Впишите, что нужно купить. Руководство увидит заявку и закроет её после покупки."
      action={
        <button className="h-cta" onClick={() => setForm((v) => !v)}>
          <Icon name={form ? 'X' : 'Plus'} size={15} />
          {form ? 'Свернуть' : 'Новая заявка'}
        </button>
      }
    >
      <div className="mb-8">
        <div className="h-label mb-2">Готовые списки — нажмите и поправьте под себя</div>
        <div
          className="grid gap-px"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            background: '#e2e2df',
            border: '1px solid #e2e2df',
          }}
        >
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => applyTemplate(t)}
              className="bg-white p-4 text-left hover:bg-[var(--hero-surface)] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Icon name={t.icon} size={16} fallback="Package" />
                <span className="h-head text-[16px]">{t.title}</span>
              </span>
              <div className="h-label mt-2">{t.hint}</div>
              <div className="h-mono-cap mt-1 text-[var(--hero-muted)]">
                {t.lines.length} позиций ·{' '}
                {money(t.lines.reduce((s, l) => s + l.est_price * l.qty, 0))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {form && (
        <div className="border border-[#e2e2df] p-5 mb-8">
          <div className="grid gap-4 sm:grid-cols-3 mb-5">
            <label className="block">
              <span className="h-label block mb-1">Название заявки</span>
              <input
                className={input}
                value={title}
                placeholder="например, химия на неделю"
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="h-label block mb-1">Категория</span>
              <select
                className={input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="h-label block mb-1">Срочность</span>
              <select
                className={input}
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
              >
                {Object.entries(URGENCY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="h-label mb-2">Что купить</div>
          <div className="border border-[#e2e2df] overflow-x-auto mb-3">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="bg-[var(--hero-surface)]">
                  <th className="h-label text-left px-3 py-2 font-normal">Наименование</th>
                  <th className="h-label text-left px-3 py-2 font-normal w-[80px]">Кол-во</th>
                  <th className="h-label text-left px-3 py-2 font-normal w-[90px]">Ед.</th>
                  <th className="h-label text-left px-3 py-2 font-normal w-[140px]">Объект</th>
                  <th className="h-label text-left px-3 py-2 font-normal w-[110px]">Цена ≈</th>
                  <th className="h-label text-left px-3 py-2 font-normal w-[40px]" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.key} className="border-t border-[#e2e2df]">
                    <td className="px-3 py-2">
                      <input
                        className={cell}
                        value={l.name}
                        placeholder="Fairy, туалетная бумага…"
                        onChange={(e) => setLine(l.key, { name: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        className={cell}
                        value={l.qty}
                        onChange={(e) => setLine(l.key, { qty: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className={cell}
                        value={l.unit}
                        onChange={(e) => setLine(l.key, { unit: e.target.value })}
                      >
                        {UNITS.map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className={cell}
                        value={l.facility}
                        onChange={(e) => setLine(l.key, { facility: e.target.value })}
                      >
                        {FACILITIES.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        className={cell}
                        value={l.est_price}
                        onChange={(e) => setLine(l.key, { est_price: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {lines.length > 1 && (
                        <button
                          className="h-label"
                          onClick={() =>
                            setLines((p) => p.filter((x) => x.key !== l.key))
                          }
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="h-cta-ghost mb-5" onClick={() => setLines((p) => [...p, blank()])}>
            <Icon name="Plus" size={14} /> Ещё строка
          </button>

          <label className="block mb-5">
            <span className="h-label block mb-1">Примечание</span>
            <textarea
              className={input}
              rows={2}
              value={note}
              placeholder="Где купить, какой марки, к какому сроку"
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {Boolean(planned) && (
            <div className="border border-black px-4 py-3 mb-5 flex justify-between items-center">
              <span className="h-label">Примерная сумма</span>
              <span className="h-head text-[22px]">{money(planned)}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button className="h-cta" disabled={saving} onClick={submit}>
              {saving ? 'Отправляем…' : 'Отправить заявку'}
            </button>
            <button className="h-cta-ghost" onClick={reset}>
              Очистить
            </button>
          </div>
        </div>
      )}

      <div className="h-head text-[22px] mb-3">Мои заявки</div>

      {!orders.length && (
        <div className="border border-dashed border-[#c9c9c5] p-12 text-center">
          <Icon name="ShoppingCart" size={26} fallback="Package" />
          <div className="h-head text-[18px] mt-3">
            {loading ? 'Загружаем…' : 'Заявок пока нет'}
          </div>
          <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
            Нажмите «Новая заявка» и впишите, что нужно купить
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {orders.map((o) => {
          const id = Number(o.id);
          const list = items.filter((i) => Number(i.order_id) === id);
          const open = openId === id;
          return (
            <div key={id} className="border border-[#e2e2df] bg-white">
              <div className="p-5">
                <div className="flex flex-wrap gap-3 justify-between items-start">
                  <div>
                    <div className="h-head text-[18px]">{String(o.title || 'Заявка')}</div>
                    <div className="h-label mt-1">
                      {String(o.category || '')} · {String(o.facility || '')}
                    </div>
                  </div>
                  <span
                    className="h-label"
                    style={{ color: SUPPLY_COLOR[String(o.status)] || undefined }}
                  >
                    {SUPPLY_STATUS[String(o.status)] || String(o.status)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-6 mt-4">
                  <div>
                    <div className="h-label">Планировали</div>
                    <div className="h-head text-[17px] mt-1">{money(o.planned_total)}</div>
                  </div>
                  {Boolean(o.spent_total) && (
                    <div>
                      <div className="h-label">Потрачено</div>
                      <div className="h-head text-[17px] mt-1">{money(o.spent_total)}</div>
                    </div>
                  )}
                  {Boolean(o.bought_on) && (
                    <div>
                      <div className="h-label">Куплено</div>
                      <div className="h-head text-[17px] mt-1">
                        {String(o.bought_on).slice(0, 10)}
                      </div>
                    </div>
                  )}
                </div>

                {o.note && (
                  <div className="mt-3 text-[0.74em] text-[var(--hero-muted)] leading-relaxed">
                    {String(o.note)}
                  </div>
                )}
                {o.status === 'declined' && o.decline_reason && (
                  <div className="mt-2 text-[0.74em]" style={{ color: '#c0392b' }}>
                    Причина отказа: {String(o.decline_reason)}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 mt-3">
                  <button
                    className="h-label underline"
                    onClick={() => setOpenId(open ? 0 : id)}
                  >
                    {open ? 'Скрыть список' : `Показать список · ${list.length}`}
                  </button>
                  {o.status === 'new' && (
                    <button className="h-label underline" onClick={() => cancel(o)}>
                      Убрать заявку
                    </button>
                  )}
                </div>
              </div>

              {open && (
                <div className="border-t border-[#e2e2df] overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="bg-[var(--hero-surface)]">
                        <th className="h-label text-left px-4 py-2 font-normal">Позиция</th>
                        <th className="h-label text-left px-4 py-2 font-normal w-[100px]">
                          Кол-во
                        </th>
                        <th className="h-label text-left px-4 py-2 font-normal w-[130px]">
                          Объект
                        </th>
                        <th className="h-label text-left px-4 py-2 font-normal w-[110px]">
                          Потрачено
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((i) => (
                        <tr key={String(i.id)} className="border-t border-[#e2e2df]">
                          <td className="px-4 py-2 text-[0.72em]">
                            {String(i.name)}
                            {i.bought ? ' ✓' : ''}
                          </td>
                          <td className="px-4 py-2 text-[0.7em]">
                            {String(i.qty)} {String(i.unit || '')}
                          </td>
                          <td className="px-4 py-2 text-[0.7em]">{String(i.facility || '')}</td>
                          <td className="px-4 py-2 text-[0.72em]">
                            {i.spent ? money(i.spent) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
};

export default SupplyNew;