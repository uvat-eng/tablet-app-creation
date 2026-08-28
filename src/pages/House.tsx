import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import SearchBar from '@/components/app/SearchBar';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import { HOUSE_CATEGORIES, CATEGORY_LABEL, money } from '@/lib/houseCategories';
import { toast } from 'sonner';

const FIELDS: Field[] = [
  { key: 'name', label: 'Наименование' },
  { key: 'unit_price', label: 'Сумма за ед., ₽', type: 'number' },
  { key: 'qty', label: 'Количество', type: 'number' },
  { key: 'unit', label: 'Единица', placeholder: 'шт, м, кг, л, компл' },
  { key: 'spent_on', label: 'Дата', type: 'date' },
  { key: 'vendor', label: 'Поставщик / магазин' },
  {
    key: 'category',
    label: 'Ветка',
    type: 'select',
    options: HOUSE_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
  },
  { key: 'note', label: 'Примечание', type: 'textarea' },
];

const House = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [period, setPeriod] = useState<'all' | 'year' | 'month'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await listRows('house_expenses'));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inPeriod = useCallback(
    (r: Row) => {
      const d = String(r.spent_on || '').slice(0, 10);
      if (!d) return period === 'all';
      const now = new Date();
      if (period === 'year') return d.slice(0, 4) === String(now.getFullYear());
      if (period === 'month')
        return d.slice(0, 7) === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return true;
    },
    [period],
  );

  const scoped = useMemo(() => rows.filter(inPeriod), [rows, inPeriod]);

  const byCategory = useMemo(() => {
    const map: Record<string, { count: number; sum: number }> = {};
    HOUSE_CATEGORIES.forEach((c) => {
      map[c.key] = { count: 0, sum: 0 };
    });
    scoped.forEach((r) => {
      const k = String(r.category || 'other');
      if (!map[k]) map[k] = { count: 0, sum: 0 };
      map[k].count += 1;
      map[k].sum += Number(r.total || 0);
    });
    return map;
  }, [scoped]);

  const grandTotal = Object.values(byCategory).reduce((s, v) => s + v.sum, 0);

  const listRowsForCat = useMemo(() => {
    if (!category) return [];
    const q = query.trim().toLowerCase();
    return scoped
      .filter((r) => String(r.category || 'other') === category)
      .filter((r) =>
        q
          ? ['name', 'vendor', 'note'].some((k) => String(r[k] ?? '').toLowerCase().includes(q))
          : true,
      );
  }, [scoped, category, query]);

  const catTotal = listRowsForCat.reduce((s, r) => s + Number(r.total || 0), 0);

  const save = async (values: Row) => {
    const unitPrice = Number(values.unit_price || 0);
    const qty = Number(values.qty || 0);
    const payload: Row = {
      ...values,
      category: String(values.category || category || 'other'),
      unit_price: unitPrice,
      qty,
      total: Math.round(unitPrice * qty * 100) / 100,
      spent_on: String(values.spent_on || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
    };
    if (editing?.id) {
      await updateRow('house_expenses', { ...payload, id: editing.id });
      toast.success('Запись обновлена');
    } else {
      await createRow('house_expenses', payload);
      toast.success('Запись добавлена');
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  const PERIODS: { key: 'all' | 'year' | 'month'; label: string }[] = [
    { key: 'all', label: 'За всё время' },
    { key: 'year', label: 'Текущий год' },
    { key: 'month', label: 'Текущий месяц' },
  ];

  const periodBar = (
    <div className="mb-6 flex flex-wrap items-center gap-2 no-print">
      <span className="h-label mr-1">Период</span>
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => setPeriod(p.key)}
          className="h-label px-2 py-1 border"
          style={{
            borderColor: '#e2e2df',
            background: period === p.key ? 'var(--hero-accent)' : '#fff',
            color: period === p.key ? 'var(--hero-accent-contrast)' : 'inherit',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  if (category) {
    const cat = HOUSE_CATEGORIES.find((c) => c.key === category);
    return (
      <Layout
        index="Раздел / Дом"
        title={cat?.label || 'Иное'}
        lede={cat?.hint}
        action={
          <span className="flex gap-2 no-print">
            <button className="h-cta-ghost" onClick={() => navigate('/house')}>
              К сводке
            </button>
            <button className="h-cta-ghost" onClick={() => window.print()}>
              Печать
            </button>
            <button
              className="h-cta"
              onClick={() => {
                setEditing({
                  category,
                  qty: 1,
                  unit: 'шт',
                  spent_on: new Date().toISOString().slice(0, 10),
                } as Row);
                setOpen(true);
              }}
            >
              Добавить позицию
            </button>
          </span>
        }
      >
        {periodBar}
        <div className="no-print">
          <SearchBar
            value={query}
            onChange={setQuery}
            count={listRowsForCat.length}
            placeholder="Поиск по ведомости"
          />
        </div>

        <div id="check-print" className="border border-[#e2e2df] overflow-x-auto bg-white">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-[var(--hero-surface)]">
                <th className="h-label text-left px-4 py-3 font-normal w-[70px]">№ п/п</th>
                <th className="h-label text-left px-4 py-3 font-normal">Наименование</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[130px]">Сумма за ед.</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Кол-во</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[140px]">Итого, руб.</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Дата</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[110px] no-print" />
              </tr>
            </thead>
            <tbody>
              {listRowsForCat.map((r, i) => (
                <tr
                  key={String(r.id)}
                  className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  <td className="px-4 py-3 text-[0.7em]">{i + 1}</td>
                  <td className="px-4 py-3 text-[0.72em]">
                    {String(r.name)}
                    {r.vendor && (
                      <span className="block text-[0.85em] text-[var(--hero-muted)]">
                        {String(r.vendor)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[0.72em] whitespace-nowrap">
                    {money(r.unit_price)}
                  </td>
                  <td className="px-4 py-3 text-[0.72em]">
                    {Number(r.qty || 0).toLocaleString('ru-RU')} {String(r.unit || '')}
                  </td>
                  <td className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap">
                    {money(r.total)}
                  </td>
                  <td className="px-4 py-3 text-[0.68em]">{String(r.spent_on || '').slice(0, 10)}</td>
                  <td className="px-4 py-3 no-print">
                    <button
                      className="h-label underline"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await removeRow('house_expenses', Number(r.id));
                        toast.success('Позиция убрана в архив');
                        load();
                      }}
                    >
                      В архив
                    </button>
                  </td>
                </tr>
              ))}
              {!listRowsForCat.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center h-mono-cap text-[var(--hero-muted)]">
                    {loading ? 'Загружаем…' : 'Записей пока нет'}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-black bg-[var(--hero-surface)]">
                <td className="px-4 py-3 h-label" colSpan={4}>
                  Итого по ведомости
                </td>
                <td className="px-4 py-3 h-head text-[16px] whitespace-nowrap" colSpan={3}>
                  {money(catTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <RecordDialog
          open={open}
          onOpenChange={setOpen}
          title={editing?.id ? 'Редактировать позицию' : 'Добавить позицию'}
          fields={FIELDS}
          initial={editing}
          onSubmit={save}
        />
      </Layout>
    );
  }

  return (
    <Layout
      index="Раздел / Дом"
      title="Дом"
      lede="Эксплуатация охотничьего дома: все затраты по веткам с итогом."
      action={
        <button
          className="h-cta no-print"
          onClick={() => {
            setEditing({
              category: 'repair',
              qty: 1,
              unit: 'шт',
              spent_on: new Date().toISOString().slice(0, 10),
            } as Row);
            setOpen(true);
          }}
        >
          Добавить затрату
        </button>
      }
    >
      {periodBar}

      <div className="border border-[#e2e2df] bg-white p-6 mb-8">
        <div className="h-label">Всего затрат по дому</div>
        <div className="h-head text-[34px] mt-2">{money(grandTotal)}</div>
        <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
          {scoped.length} записей в {HOUSE_CATEGORIES.length} ветках
        </div>
      </div>

      <div className="grid gap-px" style={{ background: '#e2e2df', border: '1px solid #e2e2df' }}>
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', background: '#e2e2df' }}
        >
          {HOUSE_CATEGORIES.map((c) => {
            const data = byCategory[c.key] || { count: 0, sum: 0 };
            const share = grandTotal ? Math.round((data.sum / grandTotal) * 100) : 0;
            return (
              <button
                key={c.key}
                onClick={() => navigate(`/house/${c.key}`)}
                className="bg-white p-5 text-left hover:bg-[var(--hero-surface)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon name={c.icon} size={16} fallback="Package" />
                  <span className="h-label">{c.label}</span>
                </div>
                <div className="h-head text-[22px] mt-3 whitespace-nowrap">{money(data.sum)}</div>
                <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
                  {data.count} позиций · {share}%
                </div>
                <div className="mt-3 h-[4px] bg-[#e2e2df]">
                  <div
                    className="h-full"
                    style={{ width: `${share}%`, background: 'var(--hero-accent)' }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10">
        <div className="h-label mb-3">Последние записи</div>
        <div className="border border-[#e2e2df] overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="bg-[var(--hero-surface)]">
                <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Дата</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[140px]">Ветка</th>
                <th className="h-label text-left px-4 py-3 font-normal">Наименование</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Кол-во</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[140px]">Итого</th>
              </tr>
            </thead>
            <tbody>
              {scoped.slice(0, 12).map((r) => (
                <tr
                  key={String(r.id)}
                  className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                  onClick={() => navigate(`/house/${String(r.category || 'other')}`)}
                >
                  <td className="px-4 py-3 text-[0.68em]">{String(r.spent_on || '').slice(0, 10)}</td>
                  <td className="px-4 py-3 text-[0.68em]">{CATEGORY_LABEL(String(r.category))}</td>
                  <td className="px-4 py-3 text-[0.72em]">{String(r.name)}</td>
                  <td className="px-4 py-3 text-[0.7em]">
                    {Number(r.qty || 0).toLocaleString('ru-RU')} {String(r.unit || '')}
                  </td>
                  <td className="px-4 py-3 text-[0.72em] whitespace-nowrap">{money(r.total)}</td>
                </tr>
              ))}
              {!scoped.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center h-mono-cap text-[var(--hero-muted)]">
                    {loading ? 'Загружаем…' : 'Затрат пока нет'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Редактировать затрату' : 'Добавить затрату'}
        fields={FIELDS}
        initial={editing}
        onSubmit={save}
      />
    </Layout>
  );
};

export default House;
