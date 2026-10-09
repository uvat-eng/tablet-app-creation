import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import { TRANSPORT_CATEGORIES, TRANSPORT_STATUS, money } from '@/lib/transport';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

const UNIT_FIELDS: Field[] = [
  { key: 'name', label: 'Название техники' },
  { key: 'note', label: 'Описание', type: 'textarea' },
  {
    key: 'status',
    label: 'Статус',
    type: 'select',
    options: Object.entries(TRANSPORT_STATUS).map(([value, label]) => ({ value, label })),
  },
  { key: 'photo_url', label: 'Фотография', type: 'photo', folder: 'objects' },
];

const Transport = () => {
  const navigate = useNavigate();
  const [units, setUnits] = useState<Row[]>([]);
  const [costs, setCosts] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number | 'all'>(new Date().getFullYear());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [objects, exp] = await Promise.all([
      listRows('objects'),
      listRows('transport_expenses'),
    ]);
    setUnits(objects.filter((r) => r.kind === 'transport'));
    setCosts(exp);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const years = useMemo(() => {
    const set = new Set<number>();
    costs.forEach((r) => {
      const y = Number(String(r.spent_on || '').slice(0, 4));
      if (y) set.add(y);
    });
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [costs]);

  const scoped = useMemo(
    () =>
      costs.filter(
        (r) => year === 'all' || String(r.spent_on || '').slice(0, 4) === String(year),
      ),
    [costs, year],
  );

  const byUnit = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    scoped.forEach((r) => {
      const u = String(r.object_id ?? 0);
      const c = String(r.category || 'parts');
      if (!map[u]) map[u] = {};
      map[u][c] = (map[u][c] || 0) + Number(r.total || 0);
      map[u].__all = (map[u].__all || 0) + Number(r.total || 0);
    });
    return map;
  }, [scoped]);

  const totals = useMemo(() => {
    const map: Record<string, number> = { __all: 0 };
    scoped.forEach((r) => {
      const c = String(r.category || 'parts');
      map[c] = (map[c] || 0) + Number(r.total || 0);
      map.__all += Number(r.total || 0);
    });
    return map;
  }, [scoped]);

  const save = async (values: Row) => {
    const payload: Row = { ...values, kind: 'transport' };
    try {
      if (editing?.id) await updateRow('objects', { ...payload, id: editing.id });
      else await createRow('objects', payload);
      toast.success('Техника сохранена');
      setOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
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
      index="Раздел / Транспорт"
      title="Транспорт"
      lede="Парк техники и учёт затрат на обслуживание: масла, запчасти, ремонты на стороне."
      action={
        <button
          className="h-cta"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Icon name="Plus" size={15} /> Добавить технику
        </button>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
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
      </div>

      <div
        className="grid gap-px mb-8"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {TRANSPORT_CATEGORIES.map((c) => block(c.label, money(totals[c.key] || 0), c.icon))}
        {block('Итого за период', money(totals.__all), 'Wallet')}
      </div>

      <div className="border border-[#e2e2df] overflow-x-auto bg-white">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-3 font-normal">Техника</th>
              {TRANSPORT_CATEGORIES.map((c) => (
                <th key={c.key} className="h-label text-left px-3 py-3 font-normal w-[130px]">
                  {c.label}
                </th>
              ))}
              <th className="h-label text-left px-4 py-3 font-normal w-[140px]">Всего</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const row = byUnit[String(u.id)] || {};
              return (
                <tr
                  key={String(u.id)}
                  className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                  onClick={() => navigate(`/transport/${u.id}`)}
                >
                  <td className="px-4 py-3 text-[0.72em]">
                    {String(u.name)}
                    <span className="block text-[0.85em] text-[var(--hero-muted)]">
                      {TRANSPORT_STATUS[String(u.status)] || '—'}
                    </span>
                  </td>
                  {TRANSPORT_CATEGORIES.map((c) => (
                    <td key={c.key} className="px-3 py-3 text-[0.7em] whitespace-nowrap">
                      {row[c.key] ? money(row[c.key]) : '—'}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap">
                    {money(row.__all || 0)}
                  </td>
                </tr>
              );
            })}
            {!units.length && (
              <tr>
                <td className="px-4 py-6 text-[0.72em]" colSpan={TRANSPORT_CATEGORIES.length + 2}>
                  {loading ? 'Загружаем…' : 'Техника не внесена'}
                </td>
              </tr>
            )}
          </tbody>
          {units.length > 0 && (
            <tfoot>
              <tr className="border-t border-black bg-[var(--hero-surface)]">
                <td className="px-4 py-3 text-[0.72em] font-bold">Итого по парку</td>
                {TRANSPORT_CATEGORIES.map((c) => (
                  <td key={c.key} className="px-3 py-3 text-[0.7em] font-bold whitespace-nowrap">
                    {money(totals[c.key] || 0)}
                  </td>
                ))}
                <td className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap">
                  {money(totals.__all)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Редактировать технику' : 'Добавить технику'}
        fields={UNIT_FIELDS}
        initial={editing}
        onSubmit={save}
      />
    </Layout>
  );
};

export default Transport;
