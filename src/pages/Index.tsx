import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import { Row, listRows } from '@/lib/api';

const money = (v: number) => `${v.toLocaleString('ru-RU')} ₽`;

const STATUS: Record<string, string> = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  arrived: 'Заехали',
  done: 'Завершена',
  cancelled: 'Отменена',
};

const Index = () => {
  const [bookings, setBookings] = useState<Row[]>([]);
  const [guests, setGuests] = useState<Row[]>([]);
  const [objects, setObjects] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listRows('bookings'), listRows('guests'), listRows('objects')]).then(
      ([b, g, o]) => {
        setBookings(b);
        setGuests(g);
        setObjects(o);
        setLoading(false);
      },
    );
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings
    .filter((b) => String(b.date_to) >= today && b.status !== 'cancelled')
    .sort((a, b) => String(a.date_from).localeCompare(String(b.date_from)));

  const total = bookings.reduce((s, b) => s + Number(b.total || 0), 0);
  const paid = bookings.reduce((s, b) => s + Number(b.paid || 0), 0);
  const members = guests.filter((g) => g.club_member).length;

  const tiles = [
    { label: 'Ближайшие заезды', value: String(upcoming.length), to: '/bookings' },
    { label: 'Ожидается оплат', value: money(total - paid), to: '/bookings' },
    { label: 'Объектов в работе', value: String(objects.filter((o) => o.status === 'active').length), to: '/house' },
    { label: 'Членов клуба', value: String(members), to: '/club' },
  ];

  return (
    <Layout
      index="00 / Сводка"
      title="Охотхозяйство"
      lede="Рабочий стол: заезды, загрузка объектов и деньги за сезон."
      action={
        <Link className="h-cta" to="/bookings">
          Открыть календарь
        </Link>
      }
    >
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="bg-white p-5 hover:bg-[var(--hero-surface)]">
            <div className="h-label">{t.label}</div>
            <div className="h-head text-[28px] mt-2">{t.value}</div>
          </Link>
        ))}
      </div>

      <div className="mt-9">
        <div className="h-label mb-3">Ближайшие заезды</div>
        <DataTable
          columns={[
            { key: 'date_from', label: 'Заезд', width: '110px' },
            { key: 'date_to', label: 'Выезд', width: '110px' },
            { key: 'guest_name', label: 'Гость' },
            { key: 'object_name', label: 'Объект' },
            { key: 'people', label: 'Чел.', width: '70px' },
            {
              key: 'status',
              label: 'Статус',
              width: '140px',
              render: (r) => STATUS[String(r.status)] || String(r.status),
            },
            { key: 'total', label: 'Сумма', render: (r) => money(Number(r.total || 0)) },
          ]}
          rows={upcoming.slice(0, 8)}
          empty={loading ? 'Загружаем…' : 'Заездов пока нет'}
        />
      </div>
    </Layout>
  );
};

export default Index;
