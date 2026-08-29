import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { canApproveHunts } from '@/lib/permissions';
import { REQUEST_STATUS, STATUS_COLOR, money } from '@/lib/hunts';
import { toast } from 'sonner';

const TABS = [
  { key: 'pending', label: 'На рассмотрении' },
  { key: 'approved', label: 'Одобренные' },
  { key: 'declined', label: 'Отклонённые' },
  { key: 'cancelled', label: 'Отменённые' },
];

const HuntRequests = () => {
  const { user } = useAuth();
  const mayApprove = canApproveHunts(user);
  const [rows, setRows] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(0);
  const [openId, setOpenId] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, i] = await Promise.all([
      listRows('hunt_requests'),
      listRows('hunt_request_items'),
    ]);
    setRows(r);
    setItems(i);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => rows.filter((r) => String(r.status) === tab), [rows, tab]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const k = String(r.status);
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [rows]);

  const itemsOf = (id: number) =>
    items.filter((i) => Number(i.request_id) === id);

  const approve = async (r: Row) => {
    if (!confirm(`Одобрить заявку «${r.hunter_name}» и создать бронь?`)) return;
    setBusy(Number(r.id));
    try {
      const booking = await createRow('bookings', {
        guest_id: r.guest_id ? Number(r.guest_id) : null,
        guest_name: String(r.hunter_name || ''),
        guest_phone: String(r.hunter_phone || ''),
        date_from: r.date_from,
        date_to: r.date_to,
        people: Number(r.people || 1),
        hunt_type: String(r.species || ''),
        status: 'confirmed',
        source: 'hunter',
        total: Number(r.est_total || 0),
        country: 'Россия',
        payment_type: 'cash',
        note: String(r.note || ''),
      });

      const bid = Number(booking.id);
      for (const i of itemsOf(Number(r.id))) {
        await createRow('booking_services', {
          booking_id: bid,
          service_id: i.service_id ? Number(i.service_id) : null,
          name: String(i.name),
          price: Number(i.price || 0),
          qty: Number(i.qty || 1),
        });
      }

      await updateRow('hunt_requests', {
        id: Number(r.id),
        status: 'approved',
        booking_id: bid,
      });
      toast.success('Заявка одобрена, бронь создана');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось одобрить');
    } finally {
      setBusy(0);
    }
  };

  const decline = async (r: Row) => {
    const reason = prompt('Причина отказа (охотник её увидит):', '');
    if (reason === null) return;
    setBusy(Number(r.id));
    try {
      await updateRow('hunt_requests', {
        id: Number(r.id),
        status: 'declined',
        decline_reason: reason,
      });
      toast.success('Заявка отклонена');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось отклонить');
    } finally {
      setBusy(0);
    }
  };

  return (
    <Layout
      index="Раздел / Заявки на охоту"
      title="Заявки от охотников"
      lede={
        mayApprove
          ? 'Одобрение создаёт бронь в календаре со всеми услугами.'
          : 'Одобрять заявки могут только Усков А.Н. и Спиричев М.Ю.'
      }
    >
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
          <Icon name="Inbox" size={26} fallback="CalendarDays" />
          <div className="h-head text-[18px] mt-3">
            {loading ? 'Загружаем…' : 'Заявок в этой вкладке нет'}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {visible.map((r) => {
          const id = Number(r.id);
          const open = openId === id;
          const list = itemsOf(id);
          return (
            <div key={id} className="border border-[#e2e2df] bg-white">
              <div className="p-5">
                <div className="flex flex-wrap gap-3 justify-between items-start">
                  <div>
                    <div className="h-head text-[19px]">{String(r.hunter_name || 'Охотник')}</div>
                    <div className="h-label mt-1">
                      {String(r.hunter_phone || 'телефон не указан')}
                    </div>
                  </div>
                  <span
                    className="h-label"
                    style={{ color: STATUS_COLOR[String(r.status)] || undefined }}
                  >
                    {REQUEST_STATUS[String(r.status)] || String(r.status)}
                  </span>
                </div>

                <div
                  className="grid gap-px mt-4"
                  style={{
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    background: '#e2e2df',
                    border: '1px solid #e2e2df',
                  }}
                >
                  {[
                    { label: 'Заезд', value: String(r.date_from || '').slice(0, 10) },
                    { label: 'Выезд', value: String(r.date_to || '').slice(0, 10) },
                    { label: 'Охотников', value: String(r.people || 1) },
                    { label: 'Примерно', value: money(r.est_total) },
                  ].map((s) => (
                    <div key={s.label} className="bg-white p-3">
                      <div className="h-label">{s.label}</div>
                      <div className="h-head text-[17px] mt-1">{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-[0.76em] leading-relaxed">
                  <span className="h-label">Дичь: </span>
                  {String(r.species || '—')}
                </div>
                {r.extras && (
                  <div className="mt-1 text-[0.76em] leading-relaxed">
                    <span className="h-label">Услуги: </span>
                    {String(r.extras)}
                  </div>
                )}
                {r.note && (
                  <div className="mt-2 text-[0.74em] leading-relaxed text-[var(--hero-muted)]">
                    {String(r.note)}
                  </div>
                )}
                {r.status === 'declined' && r.decline_reason && (
                  <div className="mt-2 text-[0.74em]" style={{ color: '#c0392b' }}>
                    Причина отказа: {String(r.decline_reason)}
                  </div>
                )}

                {Boolean(list.length) && (
                  <button
                    className="h-label underline mt-3"
                    onClick={() => setOpenId(open ? 0 : id)}
                  >
                    {open ? 'Скрыть расчёт' : `Показать расчёт · ${list.length} позиций`}
                  </button>
                )}
              </div>

              {open && (
                <div className="border-t border-[#e2e2df]">
                  {list.map((i) => (
                    <div
                      key={String(i.id)}
                      className="px-5 py-2 flex flex-wrap gap-2 justify-between border-b border-[#e2e2df]"
                    >
                      <span className="text-[0.74em]">
                        {String(i.name)}
                        <span className="h-label ml-2">
                          {String(i.qty)} × {money(i.price)}
                        </span>
                      </span>
                      <span className="text-[0.74em]">{money(i.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              {r.status === 'pending' && (
                <div className="border-t border-[#e2e2df] px-5 py-3 flex flex-wrap gap-2">
                  {mayApprove ? (
                    <>
                      <button
                        className="h-cta"
                        disabled={busy === id}
                        onClick={() => approve(r)}
                      >
                        {busy === id ? 'Создаём бронь…' : 'Одобрить и создать бронь'}
                      </button>
                      <button
                        className="h-cta-ghost"
                        disabled={busy === id}
                        onClick={() => decline(r)}
                      >
                        Отклонить
                      </button>
                    </>
                  ) : (
                    <span className="h-label">
                      Решение принимают Усков А.Н. и Спиричев М.Ю.
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
};

export default HuntRequests;
