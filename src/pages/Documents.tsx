import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import SearchBar from '@/components/app/SearchBar';
import { Row, listRows, createRow, removeRow } from '@/lib/api';
import { money, loadPriceItems } from '@/lib/price';
import { rublesInWords } from '@/lib/rubles';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

type SortKey = 'date_from' | 'final_total' | 'created_at';

const Documents = () => {
  const [acts, setActs] = useState<Row[]>([]);
  const [receipts, setReceipts] = useState<Row[]>([]);
  const [bookings, setBookings] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('date_from');
  const [asc, setAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const [a, r, b] = await Promise.all([
      listRows('checks'),
      listRows('receipts'),
      listRows('bookings'),
    ]);
    setActs(a);
    setReceipts(r);
    setBookings(b);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const createAct = useCallback(
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
      const price = await loadPriceItems();
      const items = price.map((i) => (i.group === 'stay' ? { ...i, hunters: people, days } : i));
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
      toast.success('Акт создан');
      navigate(`/documents/act/${created.id}`);
    },
    [navigate],
  );

  const openReceipt = useCallback(
    async (act: Row) => {
      const exist = receipts.find((r) => Number(r.check_id) === Number(act.id));
      if (exist) {
        navigate(`/documents/receipt/${exist.id}`);
        return;
      }
      const amount = Number(act.final_total || 0);
      const created = await createRow('receipts', {
        check_id: Number(act.id),
        booking_id: act.booking_id ? Number(act.booking_id) : null,
        number: String(Number(act.id)),
        issued_on: new Date().toISOString().slice(0, 10),
        org_name: 'Охотничье хозяйство «Малышенское»',
        accepted_from: String(act.guest_name || ''),
        basis: `Оплата услуг по акту № ${act.id} от ${String(act.date_from || '')}`,
        amount,
        amount_words: rublesInWords(amount),
        attachment: `Акт № ${act.id}`,
        credit_account: '90',
        debit_account: '50',
        chief_accountant: String(act.calculated_by || ''),
        cashier: String(act.accepted_by || ''),
      });
      toast.success('Приходный кассовый ордер создан');
      navigate(`/documents/receipt/${created.id}`);
    },
    [receipts, navigate],
  );

  useEffect(() => {
    const bid = params.get('booking');
    const want = params.get('doc') || 'act';
    if (!bid || loading) return;
    setParams({}, { replace: true });
    const exist = acts.find((r) => String(r.booking_id) === bid);
    if (exist) {
      if (want === 'receipt') openReceipt(exist);
      else navigate(`/documents/act/${exist.id}`);
      return;
    }
    const booking = bookings.find((b) => String(b.id) === bid);
    if (booking) createAct(booking);
  }, [params, acts, bookings, loading, navigate, setParams, createAct, openReceipt]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? acts.filter((r) =>
          ['guest_name', 'hunt_type', 'guest_phone'].some((k) =>
            String(r[k] ?? '').toLowerCase().includes(q),
          ),
        )
      : [...acts];
    list.sort((a, b) => {
      const x = sort === 'final_total' ? Number(a[sort] || 0) : String(a[sort] || '');
      const y = sort === 'final_total' ? Number(b[sort] || 0) : String(b[sort] || '');
      if (x === y) return 0;
      return (x > y ? 1 : -1) * (asc ? 1 : -1);
    });
    return list;
  }, [acts, query, sort, asc]);

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
      title="Акты и чеки"
      lede="Акт — расчёт по заезду. Чек — приходный кассовый ордер на принятую сумму."
      action={
        <button className="h-cta" onClick={() => navigate('/documents/act/new')}>
          Новый акт
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

      <SearchBar value={query} onChange={setQuery} count={visible.length} placeholder="Поиск по актам" />

      <div className="mb-4 h-label">Сумма по списку: {money(totalSum)}</div>

      <DataTable
        columns={[
          { key: 'id', label: 'Акт №', width: '80px' },
          { key: 'date_from', label: 'Заезд', width: '110px' },
          { key: 'date_to', label: 'Выезд', width: '110px' },
          { key: 'guest_name', label: 'Гость' },
          { key: 'hunt_type', label: 'Вид охоты', width: '140px' },
          { key: 'people', label: 'Чел.', width: '60px' },
          {
            key: 'final_total',
            label: 'Итог по акту',
            width: '130px',
            render: (r) => money(r.final_total),
          },
          {
            key: '__receipt',
            label: 'Чек (ПКО)',
            width: '150px',
            render: (r) => {
              const rec = receipts.find((x) => Number(x.check_id) === Number(r.id));
              return rec ? (
                <span className="text-[0.9em]">
                  № {String(rec.number)} · {money(rec.amount)}
                </span>
              ) : (
                <span className="text-[var(--hero-muted)] text-[0.9em]">не выписан</span>
              );
            },
          },
          {
            key: '__act',
            label: '',
            width: '280px',
            render: (r) => (
              <span className="flex gap-3">
                <button
                  className="h-label underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/documents/act/${r.id}`);
                  }}
                >
                  Акт
                </button>
                <button
                  className="h-label underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    openReceipt(r);
                  }}
                >
                  Чек
                </button>
                <button
                  className="h-label underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/documents/expenses/${r.id}`);
                  }}
                >
                  Расходы
                </button>
                <button
                  className="h-label underline"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await removeRow('checks', Number(r.id));
                    toast.success('Акт убран в архив');
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
        empty={loading ? 'Загружаем…' : 'Актов пока нет'}
        onRowClick={(r) => navigate(`/documents/act/${r.id}`)}
      />
    </Layout>
  );
};

export default Documents;