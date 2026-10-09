import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { Row, listRows, updateRow, createRow } from '@/lib/api';
import {
  FACILITIES,
  SUPPLY_COLOR,
  SUPPLY_STATUS,
  URGENCY,
  URGENCY_COLOR,
  money,
} from '@/lib/supply';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

const TABS = [
  { key: 'new', label: 'Новые' },
  { key: 'approved', label: 'В работе' },
  { key: 'bought', label: 'Куплено' },
  { key: 'declined', label: 'Отклонённые' },
];

const today = () => new Date().toISOString().slice(0, 10);

const Supply = () => {
  const [orders, setOrders] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [tab, setTab] = useState('new');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(0);
  const [openId, setOpenId] = useState(0);
  const [draft, setDraft] = useState<Record<number, { spent: number; facility: string }>>({});

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

  const visible = useMemo(() => orders.filter((o) => String(o.status) === tab), [orders, tab]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      const k = String(o.status);
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [orders]);

  const itemsOf = (id: number) => items.filter((i) => Number(i.order_id) === id);

  const openOrder = (id: number) => {
    setOpenId((cur) => (cur === id ? 0 : id));
    const next: Record<number, { spent: number; facility: string }> = {};
    itemsOf(id).forEach((i) => {
      next[Number(i.id)] = {
        spent: Number(i.spent || i.est_price || 0),
        facility: String(i.facility || 'Общее'),
      };
    });
    setDraft((p) => ({ ...p, ...next }));
  };

  const setDraftField = (
    itemId: number,
    patch: Partial<{ spent: number; facility: string }>,
  ) =>
    setDraft((p) => ({
      ...p,
      [itemId]: { ...{ spent: 0, facility: 'Общее' }, ...p[itemId], ...patch },
    }));

  const takeToWork = async (o: Row) => {
    setBusy(Number(o.id));
    try {
      await updateRow('supply_orders', { id: Number(o.id), status: 'approved' });
      toast.success('Заявка взята в работу');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не получилось');
    } finally {
      setBusy(0);
    }
  };

  const decline = async (o: Row) => {
    const reason = prompt('Причина отказа (её увидит автор заявки):', '');
    if (reason === null) return;
    setBusy(Number(o.id));
    try {
      await updateRow('supply_orders', {
        id: Number(o.id),
        status: 'declined',
        decline_reason: reason,
      });
      toast.success('Заявка отклонена');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не получилось');
    } finally {
      setBusy(0);
    }
  };

  const closeAsBought = async (o: Row) => {
    const id = Number(o.id);
    const list = itemsOf(id);
    let total = 0;

    setBusy(id);
    try {
      for (const i of list) {
        const iid = Number(i.id);
        const d = draft[iid] || {
          spent: Number(i.spent || 0),
          facility: String(i.facility || 'Общее'),
        };
        total += Number(d.spent || 0);
        await updateRow('supply_items', {
          id: iid,
          spent: Number(d.spent || 0),
          facility: d.facility,
          bought: true,
        });
      }

      await updateRow('supply_orders', {
        id,
        status: 'bought',
        spent_total: total,
        bought_on: today(),
      });

      const byFacility = new Map<string, number>();
      for (const i of list) {
        const d = draft[Number(i.id)];
        const f = String(d?.facility || i.facility || 'Общее');
        const v = Number(d?.spent ?? i.spent ?? 0);
        if (v > 0) byFacility.set(f, (byFacility.get(f) || 0) + v);
      }

      for (const [facility, amount] of byFacility) {
        await createRow('house_expenses', {
          facility,
          category: String(o.category || 'Хозтовары'),
          name: String(o.title || 'Закупка для хозяйства'),
          unit_price: amount,
          qty: 1,
          unit: 'заявка',
          total: amount,
          spent_on: today(),
          note: `Заявка №${id}`,
        });
      }

      toast.success(`Закрыто на ${money(total)}, расходы разнесены по объектам`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось закрыть');
    } finally {
      setBusy(0);
    }
  };

  const cell = 'w-full border border-[#e2e2df] px-2 py-1 text-[0.72em] bg-white';

  const spentSum = orders
    .filter((o) => String(o.status) === 'bought')
    .reduce((s, o) => s + Number(o.spent_total || 0), 0);

  return (
    <Layout
      index="Раздел / Заявки на обеспечение"
      title="Заявки на закупку"
      lede="Что нужно купить для дома, гостиницы и бани. Отметьте покупку — расход уйдёт на объект."
    >
      <div
        className="grid gap-px mb-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        <div className="bg-white p-4">
          <div className="h-label">Ждут решения</div>
          <div className="h-head text-[22px] mt-1">{counts.new || 0}</div>
        </div>
        <div className="bg-white p-4">
          <div className="h-label">В работе</div>
          <div className="h-head text-[22px] mt-1">{counts.approved || 0}</div>
        </div>
        <div className="bg-white p-4">
          <div className="h-label">Потрачено всего</div>
          <div className="h-head text-[22px] mt-1 whitespace-nowrap">{money(spentSum)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'h-cta' : 'h-cta-ghost'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {counts[t.key] ? ` · ${counts[t.key]}` : ''}
          </button>
        ))}
      </div>

      {!visible.length && (
        <div className="border border-dashed border-[#c9c9c5] p-12 text-center">
          <Icon name="Package" size={26} fallback="ShoppingCart" />
          <div className="h-head text-[18px] mt-3">
            {loading ? 'Загружаем…' : 'В этой вкладке пусто'}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {visible.map((o) => {
          const id = Number(o.id);
          const list = itemsOf(id);
          const open = openId === id;
          const draftTotal = list.reduce(
            (s, i) => s + Number(draft[Number(i.id)]?.spent ?? i.spent ?? 0),
            0,
          );
          return (
            <div key={id} className="border border-[#e2e2df] bg-white">
              <div className="p-5">
                <div className="flex flex-wrap gap-3 justify-between items-start">
                  <div>
                    <div className="h-head text-[19px]">{String(o.title || 'Заявка')}</div>
                    <div className="h-label mt-1">
                      от {String(o.created_by_name || '—')} ·{' '}
                      {String(o.created_at || '').slice(0, 10)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="h-label"
                      style={{ color: SUPPLY_COLOR[String(o.status)] || undefined }}
                    >
                      {SUPPLY_STATUS[String(o.status)] || String(o.status)}
                    </div>
                    <div
                      className="h-label mt-1"
                      style={{ color: URGENCY_COLOR[String(o.urgency)] || undefined }}
                    >
                      {URGENCY[String(o.urgency)] || ''}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 mt-4">
                  <div>
                    <div className="h-label">Категория</div>
                    <div className="text-[0.78em] mt-1">{String(o.category || '—')}</div>
                  </div>
                  <div>
                    <div className="h-label">Объекты</div>
                    <div className="text-[0.78em] mt-1">{String(o.facility || '—')}</div>
                  </div>
                  <div>
                    <div className="h-label">Планировали</div>
                    <div className="text-[0.78em] mt-1">{money(o.planned_total)}</div>
                  </div>
                  {Boolean(o.spent_total) && (
                    <div>
                      <div className="h-label">Потрачено</div>
                      <div className="text-[0.78em] mt-1">{money(o.spent_total)}</div>
                    </div>
                  )}
                </div>

                {o.note && (
                  <div className="mt-3 text-[0.74em] text-[var(--hero-muted)] leading-relaxed">
                    {String(o.note)}
                  </div>
                )}

                <button className="h-label underline mt-3" onClick={() => openOrder(id)}>
                  {open ? 'Скрыть список' : `Показать список · ${list.length} позиций`}
                </button>
              </div>

              {open && (
                <div className="border-t border-[#e2e2df] overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="bg-[var(--hero-surface)]">
                        <th className="h-label text-left px-4 py-2 font-normal">Позиция</th>
                        <th className="h-label text-left px-4 py-2 font-normal w-[110px]">
                          Кол-во
                        </th>
                        <th className="h-label text-left px-4 py-2 font-normal w-[110px]">
                          Цена ≈
                        </th>
                        <th className="h-label text-left px-4 py-2 font-normal w-[150px]">
                          Объект
                        </th>
                        <th className="h-label text-left px-4 py-2 font-normal w-[130px]">
                          Потрачено
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((i) => {
                        const iid = Number(i.id);
                        const d = draft[iid];
                        const done = String(o.status) === 'bought';
                        return (
                          <tr key={iid} className="border-t border-[#e2e2df]">
                            <td className="px-4 py-2 text-[0.72em]">
                              {String(i.name)}
                              {i.note ? (
                                <div className="h-label mt-1">{String(i.note)}</div>
                              ) : null}
                            </td>
                            <td className="px-4 py-2 text-[0.7em]">
                              {String(i.qty)} {String(i.unit || '')}
                            </td>
                            <td className="px-4 py-2 text-[0.7em]">{money(i.est_price)}</td>
                            <td className="px-4 py-2">
                              {done ? (
                                <span className="text-[0.7em]">{String(i.facility || '')}</span>
                              ) : (
                                <select
                                  className={cell}
                                  value={d?.facility || String(i.facility || 'Общее')}
                                  onChange={(e) =>
                                    setDraftField(iid, { facility: e.target.value })
                                  }
                                >
                                  {FACILITIES.map((f) => (
                                    <option key={f}>{f}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {done ? (
                                <span className="text-[0.72em]">{money(i.spent)}</span>
                              ) : (
                                <input
                                  type="number"
                                  min={0}
                                  className={cell}
                                  value={d?.spent ?? Number(i.spent || i.est_price || 0)}
                                  onChange={(e) =>
                                    setDraftField(iid, { spent: Number(e.target.value) })
                                  }
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-[#e2e2df] px-5 py-3 flex flex-wrap gap-2 items-center">
                {o.status === 'new' && (
                  <>
                    <button
                      className="h-cta"
                      disabled={busy === id}
                      onClick={() => takeToWork(o)}
                    >
                      Взять в работу
                    </button>
                    <button
                      className="h-cta-ghost"
                      disabled={busy === id}
                      onClick={() => decline(o)}
                    >
                      Отклонить
                    </button>
                  </>
                )}

                {(o.status === 'approved' || (o.status === 'new' && open)) && (
                  <>
                    <button
                      className="h-cta"
                      disabled={busy === id}
                      onClick={() => {
                        if (!open) {
                          openOrder(id);
                          return;
                        }
                        closeAsBought(o);
                      }}
                    >
                      {busy === id ? 'Закрываем…' : 'Купил, закрыть заявку'}
                    </button>
                    {open && (
                      <span className="h-label">Итого {money(draftTotal)}</span>
                    )}
                  </>
                )}

                {o.status === 'bought' && (
                  <span className="h-label">
                    Куплено {String(o.bought_on || '').slice(0, 10)} на{' '}
                    {money(o.spent_total)} — расходы разнесены по объектам
                  </span>
                )}

                {o.status === 'declined' && o.decline_reason && (
                  <span className="h-label" style={{ color: '#c0392b' }}>
                    Отказ: {String(o.decline_reason)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
};

export default Supply;