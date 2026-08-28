import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import Icon from '@/components/ui/icon';
import { Row, listRows } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { can } from '@/lib/permissions';
import { useSettings } from '@/context/SettingsContext';

const money = (v: number) => `${v.toLocaleString('ru-RU')} ₽`;
const HIDDEN = '—';

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
  const [services, setServices] = useState<Row[]>([]);
  const [trophies, setTrophies] = useState<Row[]>([]);
  const [locations, setLocations] = useState<Row[]>([]);
  const [reviews, setReviews] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const seesMoney = can(user, 'finance');
  const rub = (v: number) => (seesMoney ? money(v) : HIDDEN);
  const { settings } = useSettings();

  useEffect(() => {
    Promise.all([
      listRows('bookings'),
      listRows('guests'),
      listRows('objects'),
      listRows('services'),
      listRows('trophies'),
      listRows('locations'),
      listRows('reviews'),
    ]).then(([b, g, o, s, t, l, r]) => {
      setBookings(b);
      setGuests(g);
      setObjects(o);
      setServices(s);
      setTrophies(t);
      setLocations(l);
      setReviews(r);
      setLoading(false);
    });
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
    ...(seesMoney
      ? [{ label: 'Ожидается оплат', value: money(total - paid), to: '/bookings' }]
      : []),
    { label: 'Объектов в работе', value: String(objects.filter((o) => o.status === 'active').length), to: '/house' },
    { label: 'Членов клуба', value: String(members), to: '/club' },
  ];

  const byKind = (kind: string) => objects.filter((o) => o.kind === kind);

  const chapters = [
    {
      to: '/services',
      icon: 'ClipboardList',
      index: '01',
      title: 'Услуги',
      lede: 'Прайс хозяйства: охота, лицензии, питание, съёмка.',
      stats: [
        { label: 'Позиций в прайсе', value: String(services.length) },
        {
          label: 'Средний чек услуги',
          value: services.length
            ? rub(Math.round(services.reduce((s, x) => s + Number(x.price || 0), 0) / services.length))
            : '—',
        },
      ],
      preview: services.slice(0, 4).map((s) => `${s.name} — ${rub(Number(s.price || 0))}`),
    },
    {
      to: '/transport',
      icon: 'Truck',
      index: '02',
      title: 'Транспорт',
      lede: 'Снегоходы, вездеходы, квадроциклы и лодки.',
      stats: [
        { label: 'Единиц техники', value: String(byKind('transport').length) },
        { label: 'В работе', value: String(byKind('transport').filter((o) => o.status === 'active').length) },
      ],
      preview: byKind('transport').slice(0, 4).map((o) => `${o.name} — ${rub(Number(o.price || 0))}/день`),
    },
    {
      to: '/house',
      icon: 'Home',
      index: '03',
      title: 'Дом',
      lede: 'Охотничьи дома: вместимость и суточная стоимость.',
      stats: [
        { label: 'Домов', value: String(byKind('house').length) },
        {
          label: 'Всего мест',
          value: String(byKind('house').reduce((s, o) => s + Number(o.capacity || 0), 0)),
        },
      ],
      preview: byKind('house').slice(0, 4).map((o) => `${o.name} — ${o.capacity} мест`),
    },
    {
      to: '/hotel',
      icon: 'BedDouble',
      index: '04',
      title: 'Гостиница',
      lede: 'Номерной фонд базы для одиночных гостей и семей.',
      stats: [
        { label: 'Номеров', value: String(byKind('hotel').length) },
        {
          label: 'Всего мест',
          value: String(byKind('hotel').reduce((s, o) => s + Number(o.capacity || 0), 0)),
        },
      ],
      preview: byKind('hotel').slice(0, 4).map((o) => `${o.name} — ${rub(Number(o.price || 0))}`),
    },
    {
      to: '/banya',
      icon: 'Flame',
      index: '05',
      title: 'Баня',
      lede: 'Парные, купель и комнаты отдыха, почасовая оплата.',
      stats: [
        { label: 'Объектов', value: String(byKind('banya').length) },
        {
          label: 'Цена за час',
          value: byKind('banya')[0] ? rub(Number(byKind('banya')[0].price || 0)) : '—',
        },
      ],
      preview: byKind('banya').slice(0, 4).map((o) => `${o.name} — ${o.capacity} чел.`),
    },
    {
      to: '/trophies',
      icon: 'Award',
      index: '06',
      title: 'Трофейный зал',
      lede: 'Журнал добычи: вид, дата, охотник, угодье.',
      stats: [
        { label: 'Трофеев в журнале', value: String(trophies.length) },
        { label: 'Последний', value: String(trophies[0]?.species || '—') },
      ],
      preview: trophies.slice(0, 4).map((t) => `${t.species} — ${t.hunter || 'без имени'}`),
    },
    {
      to: '/locations',
      icon: 'Map',
      index: '07',
      title: 'Локации',
      lede: 'Закреплённые угодья: площадь, удалённость, виды.',
      stats: [
        { label: 'Угодий', value: String(locations.length) },
        {
          label: 'Общая площадь',
          value: `${locations.reduce((s, l) => s + Number(l.area_ha || 0), 0).toLocaleString('ru-RU')} га`,
        },
      ],
      preview: locations.slice(0, 4).map((l) => `${l.name} — ${l.distance_km} км`),
    },
    {
      to: '/reviews',
      icon: 'MessageSquare',
      index: '08',
      title: 'Отзывы',
      lede: 'Обратная связь гостей и публикация на сайте.',
      stats: [
        { label: 'Отзывов', value: String(reviews.length) },
        {
          label: 'Средняя оценка',
          value: reviews.length
            ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
            : '—',
        },
      ],
      preview: reviews.slice(0, 3).map((r) => `${r.author} — ${r.rating}/5`),
    },
    {
      to: '/club',
      icon: 'Users',
      index: '09',
      title: 'Клуб охотников',
      lede: 'Гости хозяйства и члены клуба, сроки членства.',
      stats: [
        { label: 'Членов клуба', value: String(members) },
        { label: 'Всего гостей', value: String(guests.length) },
      ],
      preview: guests.slice(0, 4).map((g) => `${g.name}${g.club_member ? ' — клуб' : ''}`),
    },
  ];

  const visibleChapters = chapters.filter((c) => can(user, c.to.replace('/', '')));

  return (
    <Layout
      index="Раздел / Главная"
      title={settings.farm_name || 'Охотничье хозяйство'}
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
            ...(seesMoney
              ? [{ key: 'total', label: 'Сумма', render: (r: Row) => rub(Number(r.total || 0)) }]
              : []),
          ]}
          rows={upcoming.slice(0, 8)}
          empty={loading ? 'Загружаем…' : 'Заездов пока нет'}
        />
      </div>

      {visibleChapters.map((c) => (
        <section key={c.to} className="mt-12 pt-10 h-rule">
          <div className="grid gap-6 lg:grid-cols-[240px_1fr] items-start">
            <div>
              <div className="h-label flex items-center gap-2">
                <Icon name={c.icon} size={14} fallback="Circle" />
                {c.index} / Раздел
              </div>
              <h2 className="h-head text-[28px] mt-2">{c.title}</h2>
              <p className="h-mono-cap mt-3 max-w-[30ch]">{c.lede}</p>
              <Link className="h-cta mt-4" to={c.to}>
                Открыть раздел
              </Link>
            </div>

            <div>
              <div
                className="grid gap-px"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  background: '#e2e2df',
                  border: '1px solid #e2e2df',
                }}
              >
                {c.stats.map((s) => (
                  <div key={s.label} className="bg-white p-5">
                    <div className="h-label">{s.label}</div>
                    <div className="h-head text-[24px] mt-2">{s.value}</div>
                  </div>
                ))}
              </div>

              {c.preview.length > 0 && (
                <ul className="mt-4 grid gap-2">
                  {c.preview.map((p) => (
                    <li key={p} className="text-[0.72em] flex gap-3">
                      <span style={{ color: 'var(--hero-x-mark)' }}>—</span>
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ))}
    </Layout>
  );
};

export default Index;