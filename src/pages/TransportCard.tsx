import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import {
  TRANSPORT_CATEGORIES,
  TRANSPORT_CATEGORY_LABEL,
  TRANSPORT_STATUS,
  money,
} from '@/lib/transport';
import { RECEIPT_FIELD } from '@/lib/expenses';
import ReceiptLink from '@/components/app/ReceiptLink';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

const COST_FIELDS: Field[] = [
  {
    key: 'category',
    label: 'Статья затрат',
    type: 'select',
    options: TRANSPORT_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
  },
  { key: 'name', label: 'Что купили / что делали', placeholder: 'Масло моторное 10W-40' },
  { key: 'unit_price', label: 'Цена за единицу, ₽', type: 'number' },
  { key: 'qty', label: 'Количество', type: 'number' },
  { key: 'unit', label: 'Единица', placeholder: 'шт, л, компл, работа' },
  { key: 'spent_on', label: 'Дата', type: 'date' },
  { key: 'vendor', label: 'Поставщик / сервис' },
  { key: 'mileage', label: 'Пробег / моточасы', placeholder: '124 500 км' },
  { key: 'note', label: 'Примечание', type: 'textarea' },
  RECEIPT_FIELD,
];

const TransportCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<Row | null>(null);
  const [costs, setCosts] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number | 'all'>('all');
  const [cat, setCat] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [objects, exp] = await Promise.all([
      listRows('objects'),
      listRows('transport_expenses'),
    ]);
    setUnit(objects.find((r) => String(r.id) === String(id)) || null);
    setCosts(exp.filter((r) => String(r.object_id) === String(id)));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const years = useMemo(() => {
    const set = new Set<number>();
    costs.forEach((r) => {
      const y = Number(String(r.spent_on || '').slice(0, 4));
      if (y) set.add(y);
    });
    return [...set].sort((a, b) => b - a);
  }, [costs]);

  const visible = useMemo(
    () =>
      costs
        .filter((r) => year === 'all' || String(r.spent_on || '').slice(0, 4) === String(year))
        .filter((r) => !cat || String(r.category) === cat),
    [costs, year, cat],
  );

  const byYear = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    costs.forEach((r) => {
      const y = String(r.spent_on || '').slice(0, 4) || '—';
      const c = String(r.category || 'parts');
      if (!map[y]) map[y] = {};
      map[y][c] = (map[y][c] || 0) + Number(r.total || 0);
      map[y].__all = (map[y].__all || 0) + Number(r.total || 0);
    });
    return map;
  }, [costs]);

  const periodTotal = visible.reduce((s, r) => s + Number(r.total || 0), 0);

  const save = async (values: Row) => {
    const unitPrice = Number(values.unit_price || 0);
    const qty = Number(values.qty || 0);
    const payload: Row = {
      ...values,
      object_id: Number(id),
      category: String(values.category || 'parts'),
      unit_price: unitPrice,
      qty,
      total: Math.round(unitPrice * qty * 100) / 100,
      spent_on: String(values.spent_on || '').slice(0, 10) || today(),
    };
    try {
      if (editing?.id) await updateRow('transport_expenses', { ...payload, id: editing.id });
      else await createRow('transport_expenses', payload);
      toast.success('Затрата сохранена');
      setOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  const drop = async (r: Row) => {
    await removeRow('transport_expenses', Number(r.id));
    toast.success('Запись убрана в архив');
    load();
  };

  return (
    <Layout
      index="Транспорт / Карточка техники"
      title={unit ? String(unit.name) : 'Техника'}
      lede={unit?.note ? String(unit.note) : 'Затраты на обслуживание и содержание'}
      action={
        <span className="flex flex-wrap gap-2 no-print">
          <button className="h-cta-ghost" onClick={() => navigate('/transport')}>
            К парку
          </button>
          <button className="h-cta-ghost" onClick={() => window.print()}>
            Печать
          </button>
          <button
            className="h-cta"
            onClick={() => {
              setEditing({ qty: 1, unit: 'шт', spent_on: today() } as Row);
              setOpen(true);
            }}
          >
            <Icon name="Plus" size={15} /> Внести затрату
          </button>
        </span>
      }
    >
      {unit && (
        <div className="mb-6 flex items-center gap-3">
          {unit.photo_url && (
            <img
              src={String(unit.photo_url)}
              alt=""
              className="w-24 h-16 object-cover border border-[#e2e2df]"
            />
          )}
          <span className="h-label">
            Статус: {TRANSPORT_STATUS[String(unit.status)] || 'не указан'}
          </span>
        </div>
      )}

      <div className="border border-[#e2e2df] overflow-x-auto bg-white mb-8">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Год</th>
              {TRANSPORT_CATEGORIES.map((c) => (
                <th key={c.key} className="h-label text-left px-3 py-3 font-normal">
                  {c.label}
                </th>
              ))}
              <th className="h-label text-left px-4 py-3 font-normal w-[140px]">Всего</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(byYear)
              .sort((a, b) => b.localeCompare(a))
              .map((y) => (
                <tr key={y} className="border-t border-[#e2e2df]">
                  <td className="px-4 py-3 text-[0.72em] font-bold">{y}</td>
                  {TRANSPORT_CATEGORIES.map((c) => (
                    <td key={c.key} className="px-3 py-3 text-[0.7em] whitespace-nowrap">
                      {byYear[y][c.key] ? money(byYear[y][c.key]) : '—'}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap">
                    {money(byYear[y].__all || 0)}
                  </td>
                </tr>
              ))}
            {!costs.length && (
              <tr>
                <td className="px-4 py-6 text-[0.72em]" colSpan={TRANSPORT_CATEGORIES.length + 2}>
                  {loading ? 'Загружаем…' : 'Затрат пока нет'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 no-print">
        <span className="h-label mr-1">Год</span>
        {['all', ...years].map((y) => (
          <button
            key={String(y)}
            onClick={() => setYear(y === 'all' ? 'all' : Number(y))}
            className="h-label px-2 py-1 border"
            style={{
              borderColor: '#e2e2df',
              background: String(year) === String(y) ? 'var(--hero-accent)' : '#fff',
              color: String(year) === String(y) ? 'var(--hero-accent-contrast)' : 'inherit',
            }}
          >
            {y === 'all' ? 'Все' : y}
          </button>
        ))}
        <span className="h-label ml-4 mr-1">Статья</span>
        <button
          onClick={() => setCat('')}
          className="h-label px-2 py-1 border"
          style={{
            borderColor: '#e2e2df',
            background: !cat ? 'var(--hero-accent)' : '#fff',
            color: !cat ? 'var(--hero-accent-contrast)' : 'inherit',
          }}
        >
          Все
        </button>
        {TRANSPORT_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className="h-label px-2 py-1 border"
            style={{
              borderColor: '#e2e2df',
              background: cat === c.key ? 'var(--hero-accent)' : '#fff',
              color: cat === c.key ? 'var(--hero-accent-contrast)' : 'inherit',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div id="check-print" className="border border-[#e2e2df] overflow-x-auto bg-white">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-3 font-normal w-[100px]">Дата</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[150px]">Статья</th>
              <th className="h-label text-left px-4 py-3 font-normal">Наименование</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Цена</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[100px]">Кол-во</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[130px]">Итого</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[90px] no-print" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={String(r.id)}
                className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                onClick={() => {
                  setEditing(r);
                  setOpen(true);
                }}
              >
                <td className="px-4 py-3 text-[0.68em]">{String(r.spent_on || '').slice(0, 10)}</td>
                <td className="px-4 py-3 text-[0.68em]">
                  {TRANSPORT_CATEGORY_LABEL(String(r.category))}
                </td>
                <td className="px-4 py-3 text-[0.72em]">
                  {String(r.name || '')}
                  {(r.vendor || r.mileage) && (
                    <span className="block text-[0.85em] text-[var(--hero-muted)]">
                      {[r.vendor, r.mileage].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {r.receipt_url && (
                    <span className="block mt-1">
                      <ReceiptLink url={r.receipt_url} />
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[0.7em] whitespace-nowrap">{money(r.unit_price)}</td>
                <td className="px-4 py-3 text-[0.7em]">
                  {Number(r.qty || 0).toLocaleString('ru-RU')} {String(r.unit || '')}
                </td>
                <td className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap">
                  {money(r.total)}
                </td>
                <td className="px-4 py-3 no-print">
                  <button
                    className="h-label underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      drop(r);
                    }}
                  >
                    В архив
                  </button>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td className="px-4 py-6 text-[0.72em]" colSpan={7}>
                  {loading ? 'Загружаем…' : 'Нет записей за выбранный период'}
                </td>
              </tr>
            )}
          </tbody>
          {visible.length > 0 && (
            <tfoot>
              <tr className="border-t border-black bg-[var(--hero-surface)]">
                <td className="px-4 py-3 text-[0.72em] font-bold" colSpan={5}>
                  Итого за период
                </td>
                <td className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap">
                  {money(periodTotal)}
                </td>
                <td className="no-print" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Редактировать затрату' : 'Внести затрату'}
        fields={COST_FIELDS}
        initial={editing}
        onSubmit={save}
      />
    </Layout>
  );
};

export default TransportCard;