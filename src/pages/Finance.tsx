import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import { Row, listRows } from '@/lib/api';

const money = (v: unknown) => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const METHODS: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
};

const Finance = () => {
  const [payments, setPayments] = useState<Row[]>([]);
  const [bookings, setBookings] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listRows('payments'), listRows('bookings')]).then(([p, b]) => {
      setPayments(p);
      setBookings(b);
      setLoading(false);
    });
  }, []);

  const nameOf = useMemo(() => {
    const map: Record<string, string> = {};
    bookings.forEach((b) => {
      map[String(b.id)] = `${b.guest_name || 'Гость'} — ${b.object_name || ''}`;
    });
    return map;
  }, [bookings]);

  const totals = useMemo(() => {
    const income = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const charged = bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((s, b) => s + Number(b.total || 0), 0);
    const collected = bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((s, b) => s + Number(b.paid || 0), 0);
    return { income, charged, debt: charged - collected };
  }, [payments, bookings]);

  const byMonth = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach((p) => {
      const d = String(p.paid_on || '').slice(0, 7);
      if (!d) return;
      map[d] = (map[d] || 0) + Number(p.amount || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([k, v]) => {
        const [y, m] = k.split('-');
        return { id: k, month: `${MONTHS[Number(m) - 1]} ${y}`, amount: v };
      });
  }, [payments]);

  const debtors = useMemo(
    () =>
      bookings
        .filter((b) => b.status !== 'cancelled' && Number(b.total || 0) > Number(b.paid || 0))
        .map((b) => ({ ...b, debt: Number(b.total || 0) - Number(b.paid || 0) })),
    [bookings],
  );

  return (
    <Layout
      index="Раздел / Финансы"
      title="Финансы"
      lede="Поступления, начисления и долги по заездам."
    >
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {[
          { label: 'Получено всего', value: money(totals.income) },
          { label: 'Начислено по броням', value: money(totals.charged) },
          { label: 'Долг гостей', value: money(totals.debt) },
        ].map((s) => (
          <div key={s.label} className="bg-white p-5">
            <div className="h-label">{s.label}</div>
            <div className="h-head text-[26px] mt-2">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 h-label mb-3">Поступления по месяцам</div>
      <DataTable
        columns={[
          { key: 'month', label: 'Месяц' },
          { key: 'amount', label: 'Получено', render: (r) => money(r.amount) },
        ]}
        rows={byMonth as unknown as Row[]}
        empty={loading ? 'Загружаем…' : 'Оплат пока нет'}
      />

      <div className="mt-10 h-label mb-3">Кто должен</div>
      <DataTable
        columns={[
          { key: 'guest_name', label: 'Гость' },
          { key: 'object_name', label: 'Объект' },
          { key: 'date_from', label: 'Заезд', width: '120px' },
          { key: 'total', label: 'Сумма', width: '130px', render: (r) => money(r.total) },
          { key: 'paid', label: 'Оплачено', width: '130px', render: (r) => money(r.paid) },
          { key: 'debt', label: 'Долг', width: '130px', render: (r) => money(r.debt) },
        ]}
        rows={debtors as unknown as Row[]}
        empty="Долгов нет"
      />

      <div className="mt-10 h-label mb-3">Все платежи</div>
      <DataTable
        columns={[
          { key: 'paid_on', label: 'Дата', width: '130px' },
          {
            key: 'booking_id',
            label: 'Бронь',
            render: (r) => nameOf[String(r.booking_id)] || `№ ${r.booking_id}`,
          },
          { key: 'amount', label: 'Сумма', width: '140px', render: (r) => money(r.amount) },
          {
            key: 'method',
            label: 'Способ',
            width: '140px',
            render: (r) => METHODS[String(r.method)] || String(r.method),
          },
        ]}
        rows={payments}
        empty={loading ? 'Загружаем…' : 'Платежей нет'}
      />
    </Layout>
  );
};

export default Finance;
