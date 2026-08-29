import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PickedItem,
  REQUEST_STATUS,
  STATUS_COLOR,
  grandTotal,
  isLicense,
  isPerDay,
  itemTotal,
  money,
  nights,
} from '@/lib/hunts';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

const MyHunts = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Row[]>([]);
  const [requests, setRequests] = useState<Row[]>([]);
  const [me, setMe] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [people, setPeople] = useState(1);
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<Record<number, PickedItem>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [s, r, g] = await Promise.all([
      listRows('services'),
      listRows('hunt_requests'),
      listRows('guests'),
    ]);
    setServices(s);
    setRequests(r);
    setMe(g[0] || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const days = nights(from, to);
  const items = useMemo(() => Object.values(picked), [picked]);
  const total = grandTotal(items, days, people);
  const licenses = items.filter((i) => i.kind === 'license');

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    services
      .filter((s) => s.active !== false)
      .forEach((s) => {
        const key = String(s.category || 'Прочее');
        map.set(key, [...(map.get(key) || []), s]);
      });
    return Array.from(map.entries());
  }, [services]);

  const toggle = (s: Row) => {
    const id = Number(s.id);
    setPicked((p) => {
      const next = { ...p };
      if (next[id]) {
        delete next[id];
        return next;
      }
      next[id] = {
        service_id: id,
        kind: isLicense(s) ? 'license' : 'extra',
        name: String(s.name),
        price: Number(s.price || 0),
        qty: 1,
        perDay: isPerDay(s),
      };
      return next;
    });
  };

  const setQty = (id: number, qty: number) =>
    setPicked((p) => (p[id] ? { ...p, [id]: { ...p[id], qty: Math.max(1, qty) } } : p));

  const reset = () => {
    setPicked({});
    setNote('');
    setPeople(1);
    setFrom(today());
    setTo(today());
    setForm(false);
  };

  const submit = async () => {
    if (!days) {
      toast.error('Выберите даты заезда и выезда');
      return;
    }
    if (!licenses.length) {
      toast.error('Выберите хотя бы один вид дичи');
      return;
    }
    setSaving(true);
    try {
      const req = await createRow('hunt_requests', {
        hunter_name: String(me?.name || user?.name || ''),
        hunter_phone: String(me?.phone || ''),
        date_from: from,
        date_to: to,
        people,
        species: licenses.map((l) => `${l.name} × ${l.qty}`).join(', '),
        est_total: total,
        extras: items
          .filter((i) => i.kind === 'extra')
          .map((i) => i.name)
          .join(', '),
        note,
      });
      const reqId = Number(req.id);
      for (const i of items) {
        await createRow('hunt_request_items', {
          request_id: reqId,
          service_id: i.service_id,
          kind: i.kind,
          name: i.name,
          price: i.price,
          qty: i.qty,
          total: itemTotal(i, days, people),
        });
      }
      toast.success('Заявка отправлена — хозяйство её рассмотрит');
      reset();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (r: Row) => {
    if (!confirm('Отменить заявку?')) return;
    try {
      await updateRow('hunt_requests', { id: Number(r.id), status: 'cancelled' });
      toast.success('Заявка отменена');
      load();
    } catch {
      toast.error('Не удалось отменить');
    }
  };

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white';

  return (
    <Layout
      index="Кабинет / Мои охоты"
      title="Мои охоты"
      lede="Выберите даты и дичь — увидите примерную стоимость до подачи заявки."
      action={
        <button className="h-cta" onClick={() => setForm((v) => !v)}>
          <Icon name={form ? 'X' : 'Plus'} size={15} />
          {form ? 'Свернуть' : 'Новая заявка'}
        </button>
      }
    >
      {form && (
        <div className="border border-[#e2e2df] p-5 mb-8">
          <div className="h-head text-[20px] mb-4">Когда и сколько человек</div>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <label className="block">
              <span className="h-label block mb-1">Заезд</span>
              <input
                type="date"
                className={input}
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  if (e.target.value > to) setTo(e.target.value);
                }}
              />
            </label>
            <label className="block">
              <span className="h-label block mb-1">Выезд</span>
              <input
                type="date"
                className={input}
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="h-label block mb-1">Охотников</span>
              <input
                type="number"
                min={1}
                className={input}
                value={people}
                onChange={(e) => setPeople(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
          </div>

          {Boolean(days) && (
            <p className="h-mono-cap mb-6">
              {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} · {people}{' '}
              {people === 1 ? 'охотник' : 'охотника'}
            </p>
          )}

          <div className="h-head text-[20px] mb-1">Дичь и услуги</div>
          <p className="h-label mb-4 leading-relaxed">
            Отметьте, на кого охота. Ниже — размещение, лицензии, разделка и транспорт.
          </p>

          <div className="grid gap-6 mb-6">
            {groups.map(([category, list]) => (
              <div key={category}>
                <div className="h-label mb-2">{category}</div>
                <div className="border border-[#e2e2df]">
                  {list.map((s, i) => {
                    const id = Number(s.id);
                    const on = Boolean(picked[id]);
                    return (
                      <div
                        key={id}
                        className="px-3 py-2 flex flex-wrap items-center gap-2"
                        style={{
                          borderTop: i ? '1px solid #e2e2df' : 'none',
                          background: on ? 'var(--hero-surface)' : '#fff',
                        }}
                      >
                        <button
                          onClick={() => toggle(s)}
                          className="flex items-center gap-2 flex-1 min-w-[180px] text-left"
                        >
                          <span
                            className="w-4 h-4 shrink-0 border border-black flex items-center justify-center text-[10px]"
                            style={{ background: on ? '#1f1f1d' : '#fff', color: '#fff' }}
                          >
                            {on ? '✓' : ''}
                          </span>
                          <span className="text-[0.74em]">{String(s.name)}</span>
                        </button>
                        <span className="h-label whitespace-nowrap">
                          {money(s.price)}
                          {s.unit ? ` / ${s.unit}` : ''}
                        </span>
                        {on && (
                          <input
                            type="number"
                            min={1}
                            value={picked[id].qty}
                            onChange={(e) => setQty(id, Number(e.target.value))}
                            className="w-[64px] border border-[#e2e2df] px-2 py-1 text-[0.72em]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <label className="block mb-6">
            <span className="h-label block mb-1">Пожелания</span>
            <textarea
              className={input}
              rows={3}
              value={note}
              placeholder="Особые пожелания, вопросы к хозяйству"
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {Boolean(items.length) && (
            <div className="border border-black mb-5">
              <div className="px-4 py-3 border-b border-[#e2e2df]">
                <div className="h-label">Предварительный расчёт</div>
              </div>
              {items.map((i) => (
                <div
                  key={i.service_id}
                  className="px-4 py-2 flex flex-wrap gap-2 justify-between border-b border-[#e2e2df]"
                >
                  <span className="text-[0.74em]">
                    {i.name}
                    <span className="h-label ml-2">
                      {i.qty} × {money(i.price)}
                      {i.perDay ? ` × ${days} дн × ${people} чел` : ''}
                    </span>
                  </span>
                  <span className="text-[0.74em]">{money(itemTotal(i, days, people))}</span>
                </div>
              ))}
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="h-label">Примерно к оплате</span>
                <span className="h-head text-[24px]">{money(total)}</span>
              </div>
            </div>
          )}

          <p className="h-mono-cap mb-4 text-[var(--hero-muted)]">
            Расчёт предварительный. Точную сумму подтвердит хозяйство.
          </p>

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
      <div className="border border-[#e2e2df] overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Заезд</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Выезд</th>
              <th className="h-label text-left px-4 py-2 font-normal">Дичь</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[70px]">Чел.</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[130px]">Примерно</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[160px]">Статус</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[90px]" />
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={String(r.id)} className="border-t border-[#e2e2df]">
                <td className="px-4 py-2 text-[0.7em]">
                  {String(r.date_from || '').slice(0, 10)}
                </td>
                <td className="px-4 py-2 text-[0.7em]">
                  {String(r.date_to || '').slice(0, 10)}
                </td>
                <td className="px-4 py-2 text-[0.72em]">{String(r.species || '—')}</td>
                <td className="px-4 py-2 text-[0.7em]">{String(r.people || 1)}</td>
                <td className="px-4 py-2 text-[0.72em]">{money(r.est_total)}</td>
                <td className="px-4 py-2 text-[0.7em]">
                  <span style={{ color: STATUS_COLOR[String(r.status)] || undefined }}>
                    {REQUEST_STATUS[String(r.status)] || String(r.status)}
                  </span>
                  {r.status === 'declined' && r.decline_reason && (
                    <div className="h-label mt-1">{String(r.decline_reason)}</div>
                  )}
                </td>
                <td className="px-4 py-2">
                  {r.status === 'pending' && (
                    <button className="h-label underline" onClick={() => cancel(r)}>
                      Отменить
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!requests.length && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center h-mono-cap text-[var(--hero-muted)]"
                >
                  {loading ? 'Загружаем…' : 'Заявок пока нет — нажмите «Новая заявка»'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default MyHunts;
