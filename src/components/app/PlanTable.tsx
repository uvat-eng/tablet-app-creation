import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Row, createRow, updateRow } from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  planId: number;
  rows: Row[];
  transport: Row[];
  locations: Row[];
  keepers: Row[];
  guns: Row[];
  onReload: () => void;
}

const cell = 'px-2 py-1 border-r align-top';

const PlanTable = ({
  planId,
  rows,
  transport,
  locations,
  keepers,
  guns,
  onReload,
}: Props) => {
  const [busy, setBusy] = useState(false);

  const patch = async (row: Row, values: Row) => {
    setBusy(true);
    try {
      await updateRow('hunt_plan_rows', { id: row.id, plan_id: planId, ...values }, true);
      onReload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const addRow = async () => {
    setBusy(true);
    try {
      const last = rows.length ? Number(rows[rows.length - 1].sort_order || 0) : 0;
      await createRow(
        'hunt_plan_rows',
        { plan_id: planId, sort_order: last + 10, hunter_name: '' },
        true,
      );
      onReload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось добавить');
    } finally {
      setBusy(false);
    }
  };

  const move = async (i: number, dir: -1 | 1) => {
    const a = rows[i];
    const b = rows[i + dir];
    if (!a || !b) return;
    setBusy(true);
    try {
      await updateRow(
        'hunt_plan_rows',
        { id: a.id, plan_id: planId, sort_order: Number(b.sort_order || 0) },
        true,
      );
      await updateRow(
        'hunt_plan_rows',
        { id: b.id, plan_id: planId, sort_order: Number(a.sort_order || 0) },
        true,
      );
      onReload();
    } finally {
      setBusy(false);
    }
  };

  const drop = async (row: Row) => {
    setBusy(true);
    try {
      await updateRow('hunt_plan_rows', { id: row.id, plan_id: planId, archived: true }, true);
      toast.success('Строка убрана');
      onReload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось убрать');
    } finally {
      setBusy(false);
    }
  };

  const pickKeeper = (row: Row, key: string) => {
    const k = keepers.find((x) => String(x.key) === key);
    patch(row, { keeper_name: String(k?.name || ''), keeper_id: null });
  };

  const pickTransport = (row: Row, id: string) => {
    const t = transport.find((x) => String(x.id) === id);
    patch(row, {
      transport_id: id ? Number(id) : null,
      transport_name: String(t?.name || ''),
    });
  };

  const pickGun = (row: Row, key: string) => {
    const g = guns.find((x) => String(x.key) === key);
    patch(row, { weapon_key: key || null, weapon_name: String(g?.title || '') });
  };

  const pickLocation = (row: Row, id: string) => {
    const l = locations.find((x) => String(x.id) === id);
    patch(row, {
      location_id: id ? Number(id) : null,
      location_name: String(l?.name || ''),
    });
  };

  const sel = 'w-full bg-transparent text-[0.8em] p-1 border-0 outline-none';

  return (
    <>
      <div className="border border-[#e2e2df] overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-2 py-2 font-normal w-[44px]">№</th>
              <th className="h-label text-left px-2 py-2 font-normal w-[190px]">Охотник</th>
              <th className="h-label text-left px-2 py-2 font-normal w-[200px]">Оружие</th>
              <th className="h-label text-left px-2 py-2 font-normal w-[190px]">Егерь</th>
              <th className="h-label text-left px-2 py-2 font-normal w-[180px]">Транспорт</th>
              <th className="h-label text-left px-2 py-2 font-normal w-[190px]">Локация</th>
              <th className="h-label text-left px-2 py-2 font-normal w-[130px]">Внёс</th>
              <th className="h-label text-left px-2 py-2 font-normal w-[110px]">Порядок</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={String(r.id)} style={{ borderTop: '1px solid #e2e2df' }}>
                <td className={cell} style={{ borderColor: '#f0f0ee' }}>
                  <span className="h-label">{i + 1}</span>
                </td>
                <td className={cell} style={{ borderColor: '#f0f0ee' }}>
                  <input
                    defaultValue={String(r.hunter_name || '')}
                    placeholder="Фамилия и имя"
                    className={sel}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== String(r.hunter_name || '')) patch(r, { hunter_name: v });
                    }}
                  />
                </td>
                <td className={cell} style={{ borderColor: '#f0f0ee' }}>
                  <select
                    value={String(r.weapon_key || '')}
                    className={sel}
                    onChange={(e) => pickGun(r, e.target.value)}
                  >
                    <option value="">— выбрать —</option>
                    {guns.map((g) => (
                      <option key={String(g.key)} value={String(g.key)}>
                        {String(g.title)} · {String(g.owner || '')}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={cell} style={{ borderColor: '#f0f0ee' }}>
                  <select
                    value={
                      keepers.find((k) => String(k.name) === String(r.keeper_name || ''))?.key
                        ? String(
                            keepers.find((k) => String(k.name) === String(r.keeper_name || ''))?.key,
                          )
                        : ''
                    }
                    className={sel}
                    onChange={(e) => pickKeeper(r, e.target.value)}
                  >
                    <option value="">— выбрать —</option>
                    {keepers.map((k) => (
                      <option key={String(k.key)} value={String(k.key)}>
                        {String(k.name)} · {String(k.role_label || '')}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={cell} style={{ borderColor: '#f0f0ee' }}>
                  <select
                    value={r.transport_id ? String(r.transport_id) : ''}
                    className={sel}
                    onChange={(e) => pickTransport(r, e.target.value)}
                  >
                    <option value="">— выбрать —</option>
                    {transport.map((t) => (
                      <option key={String(t.id)} value={String(t.id)}>
                        {String(t.name)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={cell} style={{ borderColor: '#f0f0ee' }}>
                  <select
                    value={r.location_id ? String(r.location_id) : ''}
                    className={sel}
                    onChange={(e) => pickLocation(r, e.target.value)}
                  >
                    <option value="">— выбрать —</option>
                    {locations.map((l) => (
                      <option key={String(l.id)} value={String(l.id)}>
                        {String(l.name)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={cell} style={{ borderColor: '#f0f0ee' }}>
                  <span className="h-label text-[var(--hero-muted)]">
                    {String(r.created_by_name || '—')}
                  </span>
                </td>
                <td className="px-2 py-1">
                  <div className="flex gap-1">
                    <button
                      className="p-1"
                      disabled={busy || i === 0}
                      style={{ opacity: i === 0 ? 0.3 : 1 }}
                      onClick={() => move(i, -1)}
                      title="Выше"
                    >
                      <Icon name="ChevronUp" size={16} />
                    </button>
                    <button
                      className="p-1"
                      disabled={busy || i === rows.length - 1}
                      style={{ opacity: i === rows.length - 1 ? 0.3 : 1 }}
                      onClick={() => move(i, 1)}
                      title="Ниже"
                    >
                      <Icon name="ChevronDown" size={16} />
                    </button>
                    <button
                      className="p-1"
                      disabled={busy}
                      onClick={() => drop(r)}
                      title="Убрать"
                    >
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <div className="h-mono-cap text-[var(--hero-muted)]">
                    Строк пока нет — добавьте первую
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button className="h-cta-ghost mt-3" disabled={busy} onClick={addRow}>
        <Icon name="Plus" size={14} /> Добавить строку
      </button>
    </>
  );
};

export default PlanTable;