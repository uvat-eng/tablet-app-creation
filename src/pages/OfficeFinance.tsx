import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import ReceiptLink from '@/components/app/ReceiptLink';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import {
  OFFICE_CATEGORIES,
  OFFICE_CATEGORY_LABEL,
  money,
  RECEIPT_FIELD,
} from '@/lib/expenses';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

const today = () => new Date().toISOString().slice(0, 10);

const monthName = (d: string) => {
  const m = Number(String(d).slice(5, 7));
  const names = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль',
    'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  return names[m - 1] || '';
};

const FIELDS: Field[] = [
  {
    key: 'category',
    label: 'Статья расхода',
    type: 'select',
    options: OFFICE_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
  },
  { key: 'name', label: 'Наименование', placeholder: 'Зарплата за август' },
  { key: 'amount', label: 'Сумма, ₽', type: 'number' },
  { key: 'spent_on', label: 'Дата оплаты', type: 'date' },
  { key: 'period', label: 'За какой период', placeholder: 'август 2026' },
  { key: 'recipient', label: 'Кому платим', placeholder: 'ФНС, Россети, арендодатель' },
  { key: 'payer', label: 'Кто платил', placeholder: 'с какого счёта' },
  { key: 'doc_number', label: 'Номер документа', placeholder: 'платёжка, счёт' },
  { key: 'note', label: 'Примечание', type: 'textarea' },
  RECEIPT_FIELD,
];

const OfficeFinance = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<number | 'all'>(new Date().getFullYear());
  const [cat, setCat] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await listRows('office_expenses'));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const years = useMemo(() => {
    const set = new Set<number>();
    rows.forEach((r) => {
      const y = Number(String(r.spent_on || '').slice(0, 4));
      if (y) set.add(y);
    });
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [rows]);

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        const okYear = season === 'all' || String(r.spent_on || '').slice(0, 4) === String(season);
        const okCat = !cat || String(r.category) === cat;
        return okYear && okCat;
      }),
    [rows, season, cat],
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    OFFICE_CATEGORIES.forEach((c) => {
      map[c.key] = 0;
    });
    rows
      .filter((r) => season === 'all' || String(r.spent_on || '').slice(0, 4) === String(season))
      .forEach((r) => {
        const k = String(r.category || 'other');
        map[k] = (map[k] || 0) + Number(r.amount || 0);
      });
    return map;
  }, [rows, season]);

  const total = Object.values(byCategory).reduce((s, v) => s + v, 0);

  const save = async (values: Row) => {
    const payload: Row = {
      ...values,
      amount: Number(values.amount || 0),
      spent_on: String(values.spent_on || today()),
      category: String(values.category || 'other'),
    };
    if (!payload.period && payload.spent_on) {
      payload.period = `${monthName(String(payload.spent_on))} ${String(payload.spent_on).slice(0, 4)}`;
    }
    try {
      if (editing?.id) {
        await updateRow('office_expenses', { ...payload, id: editing.id });
        toast.success('Расход обновлён');
      } else {
        await createRow('office_expenses', payload);
        toast.success('Расход внесён');
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  const drop = async (r: Row) => {
    try {
      await removeRow('office_expenses', Number(r.id));
      toast.success('Запись убрана в архив');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось убрать');
    }
  };

  const block = (label: string, value: string, icon?: string) => (
    <div key={label} className="bg-white px-4 py-3">
      <div className="h-label flex items-center gap-2">
        {icon && <Icon name={icon} size={13} fallback="Circle" />}
        {label}
      </div>
      <div className="h-head text-[19px] mt-1 whitespace-nowrap">{value}</div>
    </div>
  );

  return (
    <Layout
      index="Раздел / Финансы ОФИС"
      title="Финансы ОФИС"
      lede="Безналичные расходы хозяйства: зарплата, налоги, электричество и аренда земель."
      action={
        <button
          className="h-cta"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Icon name="Plus" size={15} /> Внести расход
        </button>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="h-label mr-1">Год</span>
        {['all', ...years].map((y) => (
          <button
            key={String(y)}
            onClick={() => setSeason(y === 'all' ? 'all' : Number(y))}
            className="h-label px-2 py-1 border"
            style={{
              borderColor: '#e2e2df',
              background: String(season) === String(y) ? 'var(--hero-accent)' : '#fff',
              color: String(season) === String(y) ? 'var(--hero-accent-contrast)' : 'inherit',
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
        {OFFICE_CATEGORIES.map((c) => (
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

      <div
        className="grid gap-px mb-8"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {OFFICE_CATEGORIES.map((c) => block(c.label, money(byCategory[c.key] || 0), c.icon))}
        {block('Итого безнал', money(total), 'Wallet')}
      </div>

      <div className="border border-[#e2e2df] overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Дата</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[160px]">Статья</th>
              <th className="h-label text-left px-4 py-3 font-normal">Наименование</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[140px]">Период</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[160px]">Кому</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[130px]">Сумма</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[90px]" />
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
                  {OFFICE_CATEGORY_LABEL(String(r.category))}
                </td>
                <td className="px-4 py-3 text-[0.72em]">
                  {String(r.name || '—')}
                  {r.receipt_url && (
                    <span className="block mt-1">
                      <ReceiptLink url={r.receipt_url} />
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[0.68em]">{String(r.period || '—')}</td>
                <td className="px-4 py-3 text-[0.68em]">{String(r.recipient || '—')}</td>
                <td className="px-4 py-3 text-[0.72em] whitespace-nowrap">{money(r.amount)}</td>
                <td className="px-4 py-3">
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
                <td colSpan={7} className="px-4 py-10 text-center h-mono-cap text-[var(--hero-muted)]">
                  {loading ? 'Загружаем…' : 'Расходов пока нет — нажмите «Внести расход»'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {visible.length > 0 && (
        <div className="h-label mt-3">
          Записей: {visible.length} · на сумму{' '}
          {money(visible.reduce((s, r) => s + Number(r.amount || 0), 0))}
        </div>
      )}

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Безналичный расход' : 'Новый безналичный расход'}
        fields={FIELDS}
        initial={editing || { category: 'payroll', spent_on: today() }}
        onSubmit={save}
      />
    </Layout>
  );
};

export default OfficeFinance;