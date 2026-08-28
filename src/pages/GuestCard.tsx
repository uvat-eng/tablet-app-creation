import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import { Row, listRows } from '@/lib/api';

const money = (v: unknown) => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;

const STATUS: Record<string, string> = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  arrived: 'Заехали',
  done: 'Завершена',
  cancelled: 'Отменена',
};

const GuestCard = () => {
  const { id } = useParams();
  const { pathname } = useLocation();
  const fromHunters = pathname.startsWith('/hunters');
  const backTo = fromHunters ? '/hunters' : '/club';
  const sectionIndex = fromHunters
    ? 'Раздел / База охотников'
    : 'Раздел / Закрытый клуб охотников';
  const guestId = Number(id);
  const [guest, setGuest] = useState<Row | null>(null);
  const [bookings, setBookings] = useState<Row[]>([]);
  const [trophies, setTrophies] = useState<Row[]>([]);

  useEffect(() => {
    Promise.all([listRows('guests'), listRows('bookings'), listRows('trophies')]).then(
      ([g, b, t]) => {
        const found = g.find((x) => Number(x.id) === guestId) || null;
        setGuest(found);
        setBookings(
          b.filter(
            (x) =>
              Number(x.guest_id) === guestId ||
              (found && String(x.guest_name) === String(found.name)),
          ),
        );
        setTrophies(t.filter((x) => found && String(x.hunter) === String(found.name)));
      },
    );
  }, [guestId]);

  if (!guest) {
    return (
      <Layout index={sectionIndex} title="Гость">
        <div className="h-mono-cap">Загружаем…</div>
      </Layout>
    );
  }

  const total = bookings.reduce((s, b) => s + Number(b.total || 0), 0);
  const paid = bookings.reduce((s, b) => s + Number(b.paid || 0), 0);

  return (
    <Layout
      index={sectionIndex}
      title={String(guest.name)}
      lede={[guest.city, guest.phone].filter(Boolean).join(' — ') || undefined}
      action={
        <Link className="h-cta-ghost" to={backTo}>
          К списку
        </Link>
      }
    >
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {[
          { label: 'Заездов', value: String(bookings.length) },
          { label: 'Оставил денег', value: money(paid) },
          { label: 'Долг', value: money(Math.max(0, total - paid)) },
          { label: 'Трофеев', value: String(trophies.length) },
          {
            label: 'Клуб',
            value: guest.club_member ? `до ${guest.club_until || '—'}` : 'не член',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white p-5">
            <div className="h-label">{s.label}</div>
            <div className="h-head text-[22px] mt-2">{s.value}</div>
          </div>
        ))}
      </div>

      {guest.note && <div className="mt-4 h-mono-cap normal-case">{String(guest.note)}</div>}

      <div className="mt-10 h-label mb-3">История заездов</div>
      <DataTable
        columns={[
          { key: 'date_from', label: 'Заезд', width: '120px' },
          { key: 'date_to', label: 'Выезд', width: '120px' },
          { key: 'object_name', label: 'Объект' },
          { key: 'people', label: 'Чел.', width: '70px' },
          {
            key: 'status',
            label: 'Статус',
            width: '140px',
            render: (r) => STATUS[String(r.status)] || String(r.status),
          },
          { key: 'total', label: 'Сумма', render: (r) => money(r.total) },
        ]}
        rows={bookings}
        empty="Заездов не было"
      />

      <div className="mt-10 h-label mb-3">Трофеи гостя</div>
      <DataTable
        columns={[
          { key: 'species', label: 'Вид', width: '150px' },
          { key: 'taken_on', label: 'Дата', width: '130px' },
          { key: 'location', label: 'Угодье' },
          { key: 'weight', label: 'Вес', width: '110px' },
          { key: 'note', label: 'Заметка' },
        ]}
        rows={trophies}
        empty="Трофеев пока нет"
      />
    </Layout>
  );
};

export default GuestCard;