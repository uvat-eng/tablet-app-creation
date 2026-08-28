import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import {
  EXPENSE_KINDS,
  SPLIT_KINDS,
  HUNT_CATEGORIES,
  HUNT_CATEGORY_LABEL,
  KIND_LABEL,
  money,
} from '@/lib/expenses';
import { FACILITIES } from '@/lib/houseCategories';
import { toast } from 'sonner';

const OTHER_KINDS = EXPENSE_KINDS.filter((k) => k.key !== 'hunt');
const SPLIT_KEYS = SPLIT_KINDS.map((k) => k.key);

const FIELDS: Field[] = [
  { key: 'name', label: 'Наименование' },
  {
    key: 'kind',
    label: 'Раздел расходов',
    type: 'select',
    options: [...OTHER_KINDS, ...SPLIT_KINDS].map((k) => ({ value: k.key, label: k.label })),
  },
  { key: 'unit_price', label: 'Сумма за ед., ₽', type: 'number' },
  { key: 'qty', label: 'Количество', type: 'number' },
  { key: 'unit', label: 'Единица', placeholder: 'шт, л, компл' },
  { key: 'spent_on', label: 'Дата', type: 'date' },
  { key: 'vendor', label: 'Кому / где' },
  { key: 'note', label: 'Примечание', type: 'textarea' },
];

const Finance = () => {
  const navigate = useNavigate();
  const [acts, setActs] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [facilityRows, setFacilityRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<number | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, e, h] = await Promise.all([
      listRows('checks'),
      listRows('expenses'),
      listRows('house_expenses'),
    ]);
    setActs(a);
    setExpenses(e);
    setFacilityRows(h);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const years = useMemo(() => {
    const set = new Set<number>();
    acts.forEach((a) => {
      const y = Number(String(a.date_from || '').slice(0, 4));
      if (y) set.add(y);
    });
    [...expenses, ...facilityRows].forEach((r) => {
      const y = Number(String(r.spent_on || '').slice(0, 4));
      if (y) set.add(y);
    });
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [acts, expenses, facilityRows]);

  const inSeason = useCallback(
    (dateStr: unknown) => {
      if (season === 'all') return true;
      return String(dateStr || '').slice(0, 4) === String(season);
    },
    [season],
  );

  const seasonActs = useMemo(() => acts.filter((a) => inSeason(a.date_from)), [acts, inSeason]);
  const seasonExpenses = useMemo(
    () => expenses.filter((e) => inSeason(e.spent_on)),
    [expenses, inSeason],
  );
  const seasonFacility = useMemo(
    () => facilityRows.filter((r) => inSeason(r.spent_on)),
    [facilityRows, inSeason],
  );

  const income = useMemo(() => {
    const total = seasonActs.reduce((s, a) => s + Number(a.final_total || 0), 0);
    const licenses = seasonActs.reduce((s, a) => s + Number(a.licenses_total || 0), 0);
    const stay = seasonActs.reduce((s, a) => s + Number(a.stay_total || 0), 0);
    const extras = seasonActs.reduce((s, a) => s + Number(a.extras_total || 0), 0);
    const discount = seasonActs.reduce(
      (s, a) => s + (Number(a.total || 0) - Number(a.final_total || 0)),
      0,
    );
    return { total, licenses, stay, extras, discount, count: seasonActs.length };
  }, [seasonActs]);

  const huntExpenses = useMemo(
    () => seasonExpenses.filter((e) => String(e.kind || 'hunt') === 'hunt'),
    [seasonExpenses],
  );

  const huntByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    HUNT_CATEGORIES.forEach((c) => {
      map[c.key] = 0;
    });
    huntExpenses.forEach((e) => {
      const k = String(e.category || 'other');
      map[k] = (map[k] || 0) + Number(e.total || 0);
    });
    return map;
  }, [huntExpenses]);

  const huntTotal = huntExpenses.reduce((s, e) => s + Number(e.total || 0), 0);

  const otherByKind = useMemo(() => {
    const map: Record<string, { sum: number; rows: Row[] }> = {};
    OTHER_KINDS.forEach((k) => {
      map[k.key] = { sum: 0, rows: [] };
    });
    seasonExpenses.forEach((e) => {
      const k = String(e.kind || 'hunt');
      if (k === 'hunt' || SPLIT_KEYS.includes(k)) return;
      if (!map[k]) map[k] = { sum: 0, rows: [] };
      map[k].sum += Number(e.total || 0);
      map[k].rows.push(e);
    });
    return map;
  }, [seasonExpenses]);

  const otherTotal = OTHER_KINDS.reduce((s, k) => s + (otherByKind[k.key]?.sum || 0), 0);

  const facilityTotals = useMemo(() => {
    const map: Record<string, number> = {};
    Object.keys(FACILITIES).forEach((k) => {
      map[k] = 0;
    });
    seasonFacility.forEach((r) => {
      const k = String(r.facility || 'house');
      map[k] = (map[k] || 0) + Number(r.total || 0);
    });
    return map;
  }, [seasonFacility]);

  const facilityTotal = Object.values(facilityTotals).reduce((s, v) => s + v, 0);
  const expenseTotal = huntTotal + otherTotal + facilityTotal;
  const profit = income.total - expenseTotal;

  const splitRows = useMemo(
    () => seasonExpenses.filter((e) => SPLIT_KEYS.includes(String(e.kind))),
    [seasonExpenses],
  );

  const split = useMemo(() => {
    const map: Record<string, { sum: number; rows: Row[] }> = {};
    SPLIT_KINDS.forEach((k) => {
      map[k.key] = { sum: 0, rows: [] };
    });
    splitRows.forEach((r) => {
      const k = String(r.kind);
      map[k].sum += Number(r.total || 0);
      map[k].rows.push(r);
    });
    return map;
  }, [splitRows]);

  const distributed = SPLIT_KINDS.reduce((s, k) => s + split[k.key].sum, 0);
  const undistributed = profit - distributed;

  const save = async (values: Row) => {
    const unitPrice = Number(values.unit_price || 0);
    const qty = Number(values.qty || 0);
    const payload: Row = {
      ...values,
      kind: String(values.kind || 'transfer'),
      category: 'other',
      unit_price: unitPrice,
      qty,
      total: Math.round(unitPrice * qty * 100) / 100,
      spent_on: String(values.spent_on || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
    };
    if (editing?.id) {
      await updateRow('expenses', { ...payload, id: editing.id });
      toast.success('Запись обновлена');
    } else {
      await createRow('expenses', payload);
      toast.success('Расход добавлен');
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  const block = (label: string, value: string, big = false) => (
    <div key={label} className="bg-white p-5">
      <div className="h-label">{label}</div>
      <div className={`h-head mt-2 whitespace-nowrap ${big ? 'text-[28px]' : 'text-[20px]'}`}>
        {value}
      </div>
    </div>
  );

  return (
    <Layout
      index="Раздел / Финансы"
      title="Финансы"
      lede="Поступления по актам и все расходы хозяйства в одном месте."
      action={
        <button
          className="h-cta"
          onClick={() => {
            setEditing({
              kind: 'transfer',
              qty: 1,
              unit: 'шт',
              spent_on: new Date().toISOString().slice(0, 10),
            } as Row);
            setOpen(true);
          }}
        >
          Добавить расход
        </button>
      }
    >
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="h-label mr-1">Сезон</span>
        <button
          onClick={() => setSeason('all')}
          className="h-label px-2 py-1 border"
          style={{
            borderColor: '#e2e2df',
            background: season === 'all' ? 'var(--hero-accent)' : '#fff',
            color: season === 'all' ? 'var(--hero-accent-contrast)' : 'inherit',
          }}
        >
          За всё время
        </button>
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setSeason(y)}
            className="h-label px-2 py-1 border"
            style={{
              borderColor: '#e2e2df',
              background: season === y ? 'var(--hero-accent)' : '#fff',
              color: season === y ? 'var(--hero-accent-contrast)' : 'inherit',
            }}
          >
            {y}
          </button>
        ))}
      </div>

      <div
        className="grid gap-px mb-10"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {block('Поступления', money(income.total), true)}
        {block('Расходы', money(expenseTotal), true)}
        {block(profit >= 0 ? 'Прибыль' : 'Убыток', money(Math.abs(profit)), true)}
      </div>

      <div className="h-head text-[22px] mb-3">Распределение прибыли</div>
      <div
        className="grid gap-px mb-3"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {SPLIT_KINDS.map((k) => {
          const sum = split[k.key].sum;
          const share = profit > 0 ? Math.round((sum / profit) * 100) : 0;
          return (
            <button
              key={k.key}
              className="bg-white p-5 text-left hover:bg-[var(--hero-surface)] transition-colors"
              onClick={() => {
                setEditing({
                  kind: k.key,
                  qty: 1,
                  unit: 'шт',
                  name: k.label,
                  spent_on: new Date().toISOString().slice(0, 10),
                } as Row);
                setOpen(true);
              }}
            >
              <span className="flex items-center gap-2">
                <Icon name={k.icon} size={15} fallback="Circle" />
                <span className="h-label">{k.label}</span>
              </span>
              <div className="h-head text-[24px] mt-2 whitespace-nowrap">{money(sum)}</div>
              <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
                {share}% от прибыли · {split[k.key].rows.length} записей
              </div>
              <div className="mt-3 h-[4px] bg-[#e2e2df]">
                <div
                  className="h-full"
                  style={{ width: `${Math.min(share, 100)}%`, background: 'var(--hero-accent)' }}
                />
              </div>
            </button>
          );
        })}
        <div className="bg-white p-5">
          <div className="h-label">Не распределено</div>
          <div className="h-head text-[24px] mt-2 whitespace-nowrap">{money(undistributed)}</div>
          <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
            Прибыль минус распределённое
          </div>
        </div>
      </div>

      {splitRows.length > 0 && (
        <div className="border border-[#e2e2df] overflow-x-auto mb-10">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="bg-[var(--hero-surface)]">
                <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Дата</th>
                <th className="h-label text-left px-4 py-2 font-normal w-[230px]">Направление</th>
                <th className="h-label text-left px-4 py-2 font-normal">Назначение</th>
                <th className="h-label text-left px-4 py-2 font-normal w-[130px]">Сумма</th>
                <th className="h-label text-left px-4 py-2 font-normal w-[100px]" />
              </tr>
            </thead>
            <tbody>
              {splitRows.map((r) => (
                <tr
                  key={String(r.id)}
                  className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  <td className="px-4 py-2 text-[0.68em]">{String(r.spent_on || '').slice(0, 10)}</td>
                  <td className="px-4 py-2 text-[0.68em]">{KIND_LABEL(String(r.kind))}</td>
                  <td className="px-4 py-2 text-[0.72em]">{String(r.name)}</td>
                  <td className="px-4 py-2 text-[0.72em] whitespace-nowrap">{money(r.total)}</td>
                  <td className="px-4 py-2">
                    <button
                      className="h-label underline"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await removeRow('expenses', Number(r.id));
                        toast.success('Запись убрана в архив');
                        load();
                      }}
                    >
                      В архив
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="h-head text-[22px] mb-3">Поступления</div>
      <div
        className="grid gap-px mb-3"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {block('Итого по актам', money(income.total))}
        {block('в т.ч. лицензии', money(income.licenses))}
        {block('в т.ч. размещение', money(income.stay))}
        {block('в т.ч. доп. услуги', money(income.extras))}
        {block('Скидки', money(income.discount))}
      </div>
      <div className="h-label mb-8">
        {loading ? 'Загружаем…' : `${income.count} актов в выбранном периоде`}
      </div>

      <div className="h-head text-[22px] mb-3">Расходы на проведение охоты</div>
      <div
        className="grid gap-px mb-3"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {HUNT_CATEGORIES.map((c) => block(c.label, money(huntByCategory[c.key] || 0)))}
        {block('Итого', money(huntTotal))}
      </div>

      <div className="border border-[#e2e2df] overflow-x-auto mb-10">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Дата</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[150px]">Статья</th>
              <th className="h-label text-left px-4 py-3 font-normal">Наименование</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Акт</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[130px]">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {huntExpenses.slice(0, 15).map((e) => (
              <tr
                key={String(e.id)}
                className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                onClick={() => navigate(`/documents/expenses/${e.check_id}`)}
              >
                <td className="px-4 py-3 text-[0.68em]">{String(e.spent_on || '').slice(0, 10)}</td>
                <td className="px-4 py-3 text-[0.68em]">
                  {HUNT_CATEGORY_LABEL(String(e.category))}
                </td>
                <td className="px-4 py-3 text-[0.72em]">{String(e.name)}</td>
                <td className="px-4 py-3 text-[0.68em]">№ {String(e.check_id || '—')}</td>
                <td className="px-4 py-3 text-[0.72em] whitespace-nowrap">{money(e.total)}</td>
              </tr>
            ))}
            {!huntExpenses.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center h-mono-cap text-[var(--hero-muted)]">
                  Расходы вносятся в акте о расходах после каждой охоты
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="h-head text-[22px] mb-3">Прочие расходы</div>
      <div className="grid gap-6 mb-10">
        {OTHER_KINDS.map((k) => {
          const data = otherByKind[k.key] || { sum: 0, rows: [] };
          return (
            <div key={k.key}>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2">
                  <Icon name={k.icon} size={15} fallback="Circle" />
                  <span className="h-label">{k.label}</span>
                </span>
                <span className="h-head text-[18px]">{money(data.sum)}</span>
              </div>
              <div className="border border-[#e2e2df] overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead>
                    <tr className="bg-[var(--hero-surface)]">
                      <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Дата</th>
                      <th className="h-label text-left px-4 py-2 font-normal">Наименование</th>
                      <th className="h-label text-left px-4 py-2 font-normal w-[150px]">Кому / где</th>
                      <th className="h-label text-left px-4 py-2 font-normal w-[130px]">Сумма</th>
                      <th className="h-label text-left px-4 py-2 font-normal w-[100px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr
                        key={String(r.id)}
                        className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                        onClick={() => {
                          setEditing(r);
                          setOpen(true);
                        }}
                      >
                        <td className="px-4 py-2 text-[0.68em]">
                          {String(r.spent_on || '').slice(0, 10)}
                        </td>
                        <td className="px-4 py-2 text-[0.72em]">{String(r.name)}</td>
                        <td className="px-4 py-2 text-[0.68em]">{String(r.vendor || '—')}</td>
                        <td className="px-4 py-2 text-[0.72em] whitespace-nowrap">
                          {money(r.total)}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            className="h-label underline"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await removeRow('expenses', Number(r.id));
                              toast.success('Запись убрана в архив');
                              load();
                            }}
                          >
                            В архив
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!data.rows.length && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center h-mono-cap text-[var(--hero-muted)]"
                        >
                          Записей нет
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-head text-[22px] mb-3">Содержание объектов</div>
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {Object.values(FACILITIES).map((f) => (
          <button
            key={f.key}
            onClick={() => navigate(f.base)}
            className="bg-white p-5 text-left hover:bg-[var(--hero-surface)] transition-colors"
          >
            <div className="h-label">{f.title}</div>
            <div className="h-head text-[20px] mt-2 whitespace-nowrap">
              {money(facilityTotals[f.key] || 0)}
            </div>
          </button>
        ))}
        <div className="bg-white p-5">
          <div className="h-label">Итого по объектам</div>
          <div className="h-head text-[20px] mt-2 whitespace-nowrap">{money(facilityTotal)}</div>
        </div>
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Редактировать расход' : 'Добавить расход'}
        fields={FIELDS}
        initial={editing}
        onSubmit={save}
      />
    </Layout>
  );
};

export default Finance;