import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import TransferDialog from '@/components/app/TransferDialog';
import ReceiptLink from '@/components/app/ReceiptLink';
import { Row, listRows, removeRow } from '@/lib/api';
import {
  TRANSFER_SECTIONS,
  TRANSFER_SOURCES,
  SECTION,
  SECTION_LABEL,
  SOURCE_LABEL,
  money,
} from '@/lib/transfers';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

const Transfers = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [units, setUnits] = useState<Row[]>([]);
  const [locations, setLocations] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number | 'all'>(new Date().getFullYear());
  const [source, setSource] = useState('');
  const [section, setSection] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, o, l] = await Promise.all([
      listRows('transfers'),
      listRows('objects'),
      listRows('locations'),
    ]);
    setRows(t);
    setUnits(o.filter((r) => r.kind === 'transport'));
    setLocations(l);
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

  const scoped = useMemo(
    () =>
      rows.filter((r) => year === 'all' || String(r.spent_on || '').slice(0, 4) === String(year)),
    [rows, year],
  );

  const visible = useMemo(
    () =>
      scoped
        .filter((r) => !source || String(r.source) === source)
        .filter((r) => !section || String(r.section) === section),
    [scoped, source, section],
  );

  const bySource = useMemo(() => {
    const map: Record<string, number> = {};
    scoped.forEach((r) => {
      const k = String(r.source || 'transfer');
      map[k] = (map[k] || 0) + Number(r.amount || 0);
    });
    return map;
  }, [scoped]);

  const bySection = useMemo(() => {
    const map: Record<string, number> = {};
    scoped.forEach((r) => {
      const k = String(r.section || '');
      if (!k) return;
      map[k] = (map[k] || 0) + Number(r.amount || 0);
    });
    return map;
  }, [scoped]);

  const total = scoped.reduce((s, r) => s + Number(r.amount || 0), 0);
  const periodTotal = visible.reduce((s, r) => s + Number(r.amount || 0), 0);
  const unlinked = scoped.filter((r) => !r.section).reduce((s, r) => s + Number(r.amount || 0), 0);

  const targetName = (r: Row) => {
    if (!r.target_id) return '';
    const sec = SECTION(String(r.section));
    if (!sec?.needsTarget) return '';
    const src = sec.key === 'transport' ? units : locations;
    const found = src.find((x) => String(x.id) === String(r.target_id));
    return found ? String(found.name) : '';
  };

  const drop = async (r: Row) => {
    await removeRow('transfers', Number(r.id));
    if (r.linked_table && r.linked_id) {
      await removeRow(String(r.linked_table), Number(r.linked_id));
    }
    toast.success('Запись убрана в архив');
    load();
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
      index="Раздел / Финансы переводы"
      title="Финансы переводы"
      lede="Затраты, которые финансируются переводом на карту или тратами с личных карт. Привязка к разделу создаёт запись расхода автоматически."
      action={
        <button
          className="h-cta"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Icon name="Plus" size={15} /> Внести перевод
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
        className="grid gap-px mb-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {TRANSFER_SOURCES.map((s) => block(s.label, money(bySource[s.key] || 0), s.icon))}
        {block('Без привязки', money(unlinked), 'CircleHelp')}
        {block('Итого за период', money(total), 'Wallet')}
      </div>

      <div className="h-label mb-3">Распределение по разделам</div>
      <div
        className="grid gap-px mb-8"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {TRANSFER_SECTIONS.map((s) => block(s.label, money(bySection[s.key] || 0), s.icon))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="h-label mr-1">Источник</span>
        <button
          onClick={() => setSource('')}
          className="h-label px-2 py-1 border"
          style={{
            borderColor: '#e2e2df',
            background: !source ? 'var(--hero-accent)' : '#fff',
            color: !source ? 'var(--hero-accent-contrast)' : 'inherit',
          }}
        >
          Все
        </button>
        {TRANSFER_SOURCES.map((s) => (
          <button
            key={s.key}
            onClick={() => setSource(s.key)}
            className="h-label px-2 py-1 border"
            style={{
              borderColor: '#e2e2df',
              background: source === s.key ? 'var(--hero-accent)' : '#fff',
              color: source === s.key ? 'var(--hero-accent-contrast)' : 'inherit',
            }}
          >
            {s.label}
          </button>
        ))}

        <span className="h-label ml-4 mr-1">Раздел</span>
        <button
          onClick={() => setSection('')}
          className="h-label px-2 py-1 border"
          style={{
            borderColor: '#e2e2df',
            background: !section ? 'var(--hero-accent)' : '#fff',
            color: !section ? 'var(--hero-accent-contrast)' : 'inherit',
          }}
        >
          Все
        </button>
        {TRANSFER_SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className="h-label px-2 py-1 border"
            style={{
              borderColor: '#e2e2df',
              background: section === s.key ? 'var(--hero-accent)' : '#fff',
              color: section === s.key ? 'var(--hero-accent-contrast)' : 'inherit',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="border border-[#e2e2df] overflow-x-auto bg-white">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-3 font-normal w-[100px]">Дата</th>
              <th className="h-label text-left px-4 py-3 font-normal">Назначение</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[150px]">Источник</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[190px]">Раздел</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[140px]">Кто платил</th>
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
                <td className="px-4 py-3 text-[0.72em]">
                  {String(r.name || '')}
                  {r.note && (
                    <span className="block text-[0.85em] text-[var(--hero-muted)]">
                      {String(r.note)}
                    </span>
                  )}
                  {r.receipt_url && (
                    <span className="block mt-1">
                      <ReceiptLink url={r.receipt_url} />
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[0.68em]">{SOURCE_LABEL(String(r.source))}</td>
                <td className="px-4 py-3 text-[0.68em]">
                  {r.section ? SECTION_LABEL(String(r.section)) : '—'}
                  {targetName(r) && (
                    <span className="block text-[0.85em] text-[var(--hero-muted)]">
                      {targetName(r)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[0.68em]">{String(r.payer || '—')}</td>
                <td className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap">
                  {money(r.amount)}
                </td>
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
                <td className="px-4 py-8 text-center h-mono-cap text-[var(--hero-muted)]" colSpan={7}>
                  {loading ? 'Загружаем…' : 'Записей нет'}
                </td>
              </tr>
            )}
          </tbody>
          {visible.length > 0 && (
            <tfoot>
              <tr className="border-t border-black bg-[var(--hero-surface)]">
                <td className="px-4 py-3 text-[0.72em] font-bold" colSpan={5}>
                  Итого
                </td>
                <td className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap">
                  {money(periodTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <TransferDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        units={units}
        locations={locations}
        onSaved={load}
      />
    </Layout>
  );
};

export default Transfers;