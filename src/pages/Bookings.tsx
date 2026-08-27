import { useEffect, useMemo, useState, useCallback } from 'react';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import BookingCalendar from '@/components/app/BookingCalendar';
import SearchBar from '@/components/app/SearchBar';
import { Row, listRows, createRow, updateRow, removeRow, ConflictError } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const STATUS: Record<string, string> = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  arrived: 'Заехали',
  done: 'Завершена',
  cancelled: 'Отменена',
};

const money = (v: unknown) => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;

const Bookings = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [objects, setObjects] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [objectFilter, setObjectFilter] = useState(0);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const visible = useMemo(() => {
    const base = objectFilter
      ? rows.filter((r) => Number(r.object_id) === objectFilter)
      : rows;
    if (!query.trim()) return base;
    const q = query.trim().toLowerCase();
    return base.filter((r) =>
      ['guest_name', 'guest_phone', 'object_name', 'note'].some((k) =>
        String(r[k] ?? '').toLowerCase().includes(q),
      ),
    );
  }, [rows, objectFilter, query]);

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
      { key: 'guest_name', label: 'Гость', placeholder: 'Имя и фамилия' },
      { key: 'guest_phone', label: 'Телефон', placeholder: '+7 …' },
      {
        key: 'object_id',
        label: 'Объект',
        type: 'select',
        options: objects.map((o) => ({ value: String(o.id), label: String(o.name) })),
      },
      { key: 'date_from', label: 'Заезд', type: 'date' },
      { key: 'date_to', label: 'Выезд', type: 'date' },
      { key: 'people', label: 'Человек', type: 'number' },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: Object.entries(STATUS).map(([value, label]) => ({ value, label })),
      },
      { key: 'total', label: 'Сумма, ₽', type: 'number' },
      { key: 'paid', label: 'Оплачено, ₽', type: 'number' },
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

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === 'confirmed' || r.status === 'new').length;
    const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
    const paid = rows.reduce((s, r) => s + Number(r.paid || 0), 0);
    return { active, total, paid, debt: total - paid };
  }, [rows]);

  return (
    <Layout
      index="Раздел / Бронирования"
      title="Бронирования"
      lede="Все заезды хозяйства: даты, объект, гость, деньги."
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
      <div className="grid gap-px mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', background: '#e2e2df', border: '1px solid #e2e2df' }}>
        {[
          { label: 'Активных броней', value: String(stats.active) },
          { label: 'Сумма всех', value: money(stats.total) },
          { label: 'Получено', value: money(stats.paid) },
          { label: 'Ожидается', value: money(stats.debt) },
        ].map((s) => (
          <div key={s.label} className="bg-white p-5">
            <div className="h-label">{s.label}</div>
            <div className="h-head text-[26px] mt-2">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="h-label mr-1">Объект</span>
        <button
          className={objectFilter ? 'h-cta-ghost' : 'h-cta'}
          onClick={() => setObjectFilter(0)}
        >
          Все
        </button>
        {objects.map((o) => (
          <button
            key={String(o.id)}
            className={objectFilter === Number(o.id) ? 'h-cta' : 'h-cta-ghost'}
            onClick={() => setObjectFilter(Number(o.id))}
          >
            {String(o.name)}
          </button>
        ))}
      </div>

      <BookingCalendar
        bookings={objectFilter ? rows.filter((r) => Number(r.object_id) === objectFilter) : rows}
        onPick={(from, to) => {
          setEditing({
            date_from: from,
            date_to: to,
            status: 'new',
            people: 1,
            object_id: objectFilter || null,
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
            { key: 'guest_name', label: 'Гость' },
            { key: 'object_name', label: 'Объект' },
            { key: 'people', label: 'Чел.', width: '70px' },
            {
              key: 'status',
              label: 'Статус',
              width: '140px',
              render: (r) => (
                <span className="h-chip h-chip-grey text-[0.9em]">
                  {STATUS[String(r.status)] || String(r.status)}
                </span>
              ),
            },
            { key: 'total', label: 'Сумма', render: (r) => money(r.total) },
            { key: 'paid', label: 'Оплачено', render: (r) => money(r.paid) },
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
                      setEditing(r);
                      setOpen(true);
                    }}
                  >
                    Править
                  </button>
                  <button
                    className="h-label underline"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await removeRow('bookings', Number(r.id));
                      toast.success('Бронь убрана в архив');
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