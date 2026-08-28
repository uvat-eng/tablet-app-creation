import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import SearchBar from '@/components/app/SearchBar';
import { Row, listRows, createRow, removeRow } from '@/lib/api';
import { money, emptyItems } from '@/lib/checkTariffs';
import { toast } from 'sonner';

type SortKey = 'date_from' | 'final_total' | 'created_at';

const Checks = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [bookings, setBookings] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('date_from');
  const [asc, setAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const [c, b] = await Promise.all([listRows('checks'), listRows('bookings')]);
    setRows(c);
    setBookings(b);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createFor = useCallback(
    async (booking: Row) => {
      const days = Math.max(
        1,
        Math.round(
          (new Date(String(booking.date_to)).getTime() -
            new Date(String(booking.date_from)).getTime()) /
            86400000,
        ),
      );
      const people = Number(booking.people || 1);
      const items = emptyItems().map((i) =>
        i.group === 'stay' ? { ...i, hunters: people, days } : i,
      );
      const stay = items
        .filter((i) => i.group === 'stay')
        .reduce((s, i) => s + i.tariff * i.days * i.hunters, 0);
      const created = await createRow('checks', {
        booking_id: Number(booking.id),
        guest_name: String(booking.guest_name || ''),
        guest_phone: String(booking.guest_phone || ''),
        hunt_type: String(booking.hunt_type || ''),
        people,
        transport: 'Хозяйство',
        date_from: String(booking.date_from),
        date_to: String(booking.date_to),
        plan_bag: '',
        items: items as never,
        discount_pct: 0,
        total: stay,
        stay_total: stay,
        licenses_total: 0,
        extras_total: 0,
        final_total: stay,
        hunted_by: '',
        calculated_by: '',
        accepted_by: '',
      });
      toast.success('Чек создан');
      navigate(`/checks/${created.id}`);
    },
    [navigate],
  );

  useEffect(() => {
    const bid = params.get('booking');
    if (!bid || loading) return;
    const exist = rows.find((r) => String(r.booking_id) === bid);
    setParams({}, { replace: true });
    if (exist) {
      navigate(`/checks/${exist.id}`);
      return;
    }
    const booking = bookings.find((b) => String(b.id) === bid);
    if (booking) createFor(booking);
  }, [params, rows, bookings, loading, navigate, setParams, createFor]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter((r) =>
          ['guest_name', 'hunt_type', 'guest_phone'].some((k) =>
            String(r[k] ?? '').toLowerCase().includes(q),
          ),
        )
      : [...rows];
    list.sort((a, b) => {
      const x = sort === 'final_total' ? Number(a[sort] || 0) : String(a[sort] || '');
      const y = sort === 'final_total' ? Number(b[sort] || 0) : String(b[sort] || '');
      if (x === y) return 0;
      return (x > y ? 1 : -1) * (asc ? 1 : -1);
    });
    return list;
  }, [rows, query, sort, asc]);

  const totalSum = visible.reduce((s, r) => s + Number(r.final_total || 0), 0);

  const toggle = (k: SortKey) => {
    if (sort === k) setAsc(!asc);
    else {
      setSort(k);
      setAsc(false);
    }
  };

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'date_from', label: 'По дате заезда' },
    { key: 'final_total', label: 'По сумме' },
    { key: 'created_at', label: 'По дате создания' },
  ];

  return (
    <Layout
      index="Раздел / Документы"
      title="Чеки"
      lede="Расчёт по заезду: размещение, лицензии, дополнительные услуги и итог со скидкой."
      action={
        <button className="h-cta" onClick={() => navigate('/checks/new')}>
          Новый чек
        </button>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="h-label mr-1">Сортировка</span>
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            className="h-label px-2 py-1 border"
            style={{
              borderColor: '#e2e2df',
              background: sort === s.key ? 'var(--hero-accent)' : '#fff',
              color: sort === s.key ? 'var(--hero-accent-contrast)' : 'inherit',
            }}
          >
            {s.label} {sort === s.key ? (asc ? '↑' : '↓') : ''}
          </button>
        ))}
      </div>

      <SearchBar value={query} onChange={setQuery} count={visible.length} />

      <div className="mb-4 h-label">Сумма по списку: {money(totalSum)}</div>

      <DataTable
        columns={[
          { key: 'id', label: '№', width: '70px' },
          { key: 'date_from', label: 'Заезд', width: '110px' },
          { key: 'date_to', label: 'Выезд', width: '110px' },
          { key: 'guest_name', label: 'Гость' },
          { key: 'hunt_type', label: 'Вид охоты', width: '150px' },
          { key: 'people', label: 'Чел.', width: '70px' },
          {
            key: 'final_total',
            label: 'Итог',
            width: '130px',
            render: (r) => money(r.final_total),
          },
          {
            key: '__act',
            label: '',
            width: '150px',
            render: (r) => (
              <span className="flex gap-3">
                <button
                  className="h-label underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/checks/${r.id}`);
                  }}
                >
                  Открыть
                </button>
                <button
                  className="h-label underline"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await removeRow('checks', Number(r.id));
                    toast.success('Чек убран в архив');
                    load();
                  }}
                >
                  В архив
                </button>
              </span>
            ),
          },
        ]}
        rows={visible}
        empty={loading ? 'Загружаем…' : 'Чеков пока нет'}
        onRowClick={(r) => navigate(`/checks/${r.id}`)}
      />
    </Layout>
  );
};

export default Checks;
