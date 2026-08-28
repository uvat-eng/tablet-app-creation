import { useEffect, useMemo, useState, useCallback } from 'react';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import BookingCalendar from '@/components/app/BookingCalendar';
import SearchBar from '@/components/app/SearchBar';
import { Row, listRows, createRow, updateRow, ConflictError } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const STATUS: Record<string, string> = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  arrived: 'Заехали',
  done: 'Завершена',
  cancelled: 'Отменена',
};

const PAYMENT: Record<string, string> = {
  cash: 'Наличные',
  cashless: 'Безнал',
};

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const money = (v: unknown) => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;

const Bookings = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [objects, setObjects] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [season, setSeason] = useState(new Date().getFullYear());
  const navigate = useNavigate();

  const years = useMemo(() => {
    const base = new Date().getFullYear();
    const set = new Set<number>([base - 1, base, base + 1, base + 2]);
    rows.forEach((r) => {
      const y = Number(String(r.date_from || '').slice(0, 4));
      if (y) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const seasonRows = useMemo(
    () => rows.filter((r) => String(r.date_from || '').slice(0, 4) === String(season)),
    [rows, season],
  );

  const visible = useMemo(() => {
    if (!query.trim()) return seasonRows;
    const q = query.trim().toLowerCase();
    return seasonRows.filter((r) =>
      ['guest_name', 'guest_phone', 'country', 'hunt_type', 'note'].some((k) =>
        String(r[k] ?? '').toLowerCase().includes(q),
      ),
    );
  }, [seasonRows, query]);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, o] = await Promise.all([listRows('bookings'), listRows('objects')]);
    setRows(b);
    setObjects(o);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fields: Field[] = useMemo(
    () => [
      { key: 'guest_name', label: 'Гость (ФИО)', placeholder: 'Фамилия Имя Отчество' },
      { key: 'guest_phone', label: 'Телефон', placeholder: '+7 …' },
      { key: 'country', label: 'Страна', placeholder: 'Россия' },
      { key: 'date_from', label: 'Заезд', type: 'date' },
      { key: 'date_to', label: 'Выезд', type: 'date' },
      { key: 'people', label: 'Человек', type: 'number' },
      { key: 'hunt_type', label: 'Вид охоты', placeholder: 'Лось, кабан, утка…' },
      {
        key: 'object_id',
        label: 'Размещение',
        type: 'select',
        options: objects.map((o) => ({ value: String(o.id), label: String(o.name) })),
      },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: Object.entries(STATUS).map(([value, label]) => ({ value, label })),
      },
      { key: 'total', label: 'Сумма тотал, ₽', type: 'number' },
      { key: 'prepay', label: 'Аванс, ₽', type: 'number' },
      {
        key: 'payment_type',
        label: 'Форма оплаты',
        type: 'select',
        options: Object.entries(PAYMENT).map(([value, label]) => ({ value, label })),
      },
      { key: 'note', label: 'Заметка', type: 'textarea' },
    ],
    [objects],
  );

  const save = async (values: Row) => {
    const payload: Row = {
      ...values,
      object_id: values.object_id ? Number(values.object_id) : null,
    };
    try {
      if (editing?.id) {
        await updateRow('bookings', { ...payload, id: editing.id });
        toast.success('Бронь обновлена');
      } else {
        await createRow('bookings', payload);
        toast.success('Бронь добавлена');
      }
    } catch (e) {
      if (e instanceof ConflictError) {
        const c = e.conflict;
        toast.error('Даты заняты', {
          description: `${c.object_name} уже забронирован: ${c.guest_name}, ${String(c.date_from)} — ${String(c.date_to)}`,
        });
        return;
      }
      toast.error('Не удалось сохранить');
      return;
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  const now = new Date();
  const isCurrentYear = season === now.getFullYear();
  const month = isCurrentYear ? now.getMonth() : 11;
  const monthName = MONTHS[month];

  const stats = useMemo(() => {
    const live = seasonRows.filter((r) => r.status !== 'cancelled');

    const sum = (list: Row[]) => ({
      active: list.filter((r) => r.status === 'confirmed' || r.status === 'new').length,
      prepay: list.reduce((s, r) => s + Number(r.prepay || 0) + Number(r.paid || 0), 0),
      total: list.reduce((s, r) => s + Number(r.total || 0), 0),
    });

    const monthKey = `${season}-${String(month + 1).padStart(2, '0')}`;
    const inMonth = live.filter((r) => String(r.date_from || '').slice(0, 7) === monthKey);

    return { month: sum(inMonth), season: sum(live) };
  }, [seasonRows, season, month]);

  return (
    <Layout
      index="Раздел / Бронирования"
      title="Бронирования"
      action={
        <button
          className="h-cta"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Новая бронь
        </button>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="h-label mr-1">Сезон</span>
        {years.map((y) => (
          <button
            key={y}
            className={season === y ? 'h-cta' : 'h-cta-ghost'}
            onClick={() => setSeason(y)}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {[
          {
            caption: isCurrentYear
              ? `Текущий месяц — ${monthName} ${season}`
              : `${monthName} ${season}`,
            data: stats.month,
          },
          {
            caption: `Сезон целиком — 01.01.${season} — 31.12.${season}`,
            data: stats.season,
          },
        ].map((block) => (
          <div key={block.caption}>
            <div className="h-label mb-2">{block.caption}</div>
            <div
              className="grid gap-px"
              style={{
                gridTemplateColumns: 'repeat(3, 1fr)',
                background: '#e2e2df',
                border: '1px solid #e2e2df',
              }}
            >
              {[
                { label: 'Активных', value: String(block.data.active) },
                { label: 'Аванс', value: money(block.data.prepay) },
                { label: 'Тотал', value: money(block.data.total) },
              ].map((s) => (
                <div key={s.label} className="bg-white p-4 min-h-[92px]">
                  <div className="h-label">{s.label}</div>
                  <div className="h-head text-[17px] mt-2 whitespace-nowrap">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BookingCalendar
        bookings={rows}
        year={season}
        onPick={(from, to) => {
          setEditing({
            date_from: from,
            date_to: to,
            status: 'new',
            people: 1,
            country: 'Россия',
            payment_type: 'cash',
          } as Row);
          setOpen(true);
        }}
      />

      <div className="mt-8">
        <SearchBar value={query} onChange={setQuery} count={visible.length} />
        <DataTable
          columns={[
            { key: 'date_from', label: 'Заезд', width: '110px' },
            { key: 'date_to', label: 'Выезд', width: '110px' },
            { key: 'guest_name', label: 'Гость ФИО' },
            { key: 'country', label: 'Страна', width: '120px' },
            { key: 'people', label: 'Чел.', width: '70px' },
            { key: 'hunt_type', label: 'Вид охоты', width: '150px' },
            {
              key: 'total',
              label: 'Сумма тотал',
              width: '140px',
              render: (r) => money(r.total),
            },
            {
              key: 'payment_type',
              label: 'Факт оплаты',
              width: '160px',
              render: (r) => {
                const fact = Number(r.prepay || 0) + Number(r.paid || 0);
                if (!fact) return 'нет оплаты';
                return `${money(fact)} · ${PAYMENT[String(r.payment_type)] || 'нал'}`;
              },
            },
            {
              key: '__act',
              label: '',
              width: '190px',
              render: (r) => (
                <span className="flex gap-3">
                  <button
                    className="h-label underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(r);
                      setOpen(true);
                    }}
                  >
                    Править
                  </button>
                  <button
                    className="h-label underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/documents?booking=${r.id}&doc=act`);
                    }}
                  >
                    Акт
                  </button>
                  <button
                    className="h-label underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/documents?booking=${r.id}&doc=receipt`);
                    }}
                  >
                    Чек
                  </button>
                </span>
              ),
            },
          ]}
          rows={visible}
          empty={loading ? 'Загружаем…' : 'Броней пока нет'}
          onRowClick={(r) => navigate(`/bookings/${r.id}`)}
        />
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Бронь' : 'Новая бронь'}
        fields={fields}
        initial={editing}
        onSubmit={save}
      />
    </Layout>
  );
};

export default Bookings;