import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import RecordDialog from '@/components/app/RecordDialog';
import { Row, listRows, createRow, removeRow } from '@/lib/api';
import { toast } from 'sonner';

const money = (v: unknown) => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;

const STATUS: Record<string, string> = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  arrived: 'Заехали',
  done: 'Завершена',
  cancelled: 'Отменена',
};

const METHODS: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
};

const BookingCard = () => {
  const { id } = useParams();
  const bookingId = Number(id);
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Row | null>(null);
  const [extras, setExtras] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [catalog, setCatalog] = useState<Row[]>([]);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const load = useCallback(async () => {
    const [bs, ex, pay, cat] = await Promise.all([
      listRows('bookings'),
      listRows('booking_services', { bookingId }),
      listRows('payments', { bookingId }),
      listRows('services'),
    ]);
    setBooking(bs.find((b) => Number(b.id) === bookingId) || null);
    setExtras(ex);
    setPayments(pay);
    setCatalog(cat);
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const dropBooking = async () => {
    if (!confirm('Удалить бронь целиком? Услуги и оплаты по ней тоже пропадут.')) return;
    try {
      await removeRow('bookings', bookingId);
      toast.success('Бронь удалена');
      navigate('/bookings');
    } catch {
      toast.error('Не удалось удалить');
    }
  };

  const addService = async (values: Row) => {
    const picked = catalog.find((c) => Number(c.id) === Number(values.service_id));
    await createRow('booking_services', {
      booking_id: bookingId,
      service_id: values.service_id ? Number(values.service_id) : null,
      name: String(values.name || picked?.name || 'Услуга'),
      price: Number(values.price || picked?.price || 0),
      qty: Number(values.qty || 1),
    });
    toast.success('Услуга добавлена');
    setServiceOpen(false);
    load();
  };

  const addPayment = async (values: Row) => {
    await createRow('payments', {
      booking_id: bookingId,
      amount: Number(values.amount || 0),
      method: String(values.method || 'cash'),
      paid_on: values.paid_on || new Date().toISOString().slice(0, 10),
      note: values.note || null,
    });
    toast.success('Платёж записан');
    setPayOpen(false);
    load();
  };

  const drop = async (table: string, rowId: number) => {
    await removeRow(table, rowId);
    load();
  };

  if (!booking) {
    return (
      <Layout index="Раздел / Бронирования" title="Бронь">
        <div className="h-mono-cap">Загружаем…</div>
      </Layout>
    );
  }

  const debt = Number(booking.total || 0) - Number(booking.paid || 0);

  return (
    <Layout
      index="Раздел / Бронирования"
      title={`Бронь № ${bookingId}`}
      lede={`${booking.guest_name || 'Без имени'} — ${booking.object_name || 'объект не выбран'}`}
      action={
        <span className="flex flex-wrap gap-2">
          <Link className="h-cta-ghost" to="/bookings">
            Назад
          </Link>
          <button className="h-cta-ghost" onClick={dropBooking}>
            Удалить бронь
          </button>
        </span>
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
          { label: 'Заезд', value: String(booking.date_from) },
          { label: 'Выезд', value: String(booking.date_to) },
          { label: 'Гостей', value: String(booking.people || 1) },
          { label: 'Статус', value: STATUS[String(booking.status)] || String(booking.status) },
          { label: 'Сумма', value: money(booking.total) },
          { label: debt > 0 ? 'Долг' : 'Оплачено', value: money(debt > 0 ? debt : booking.paid) },
        ].map((s) => (
          <div key={s.label} className="bg-white p-5">
            <div className="h-label">{s.label}</div>
            <div className="h-head text-[22px] mt-2">{s.value}</div>
          </div>
        ))}
      </div>

      {booking.guest_phone && (
        <div className="mt-4 h-mono-cap">Телефон: {String(booking.guest_phone)}</div>
      )}
      {booking.note && <div className="mt-2 h-mono-cap normal-case">{String(booking.note)}</div>}

      <div className="mt-10 flex items-center justify-between">
        <div className="h-label">Услуги в заезде</div>
        <button className="h-cta" onClick={() => setServiceOpen(true)}>
          Добавить услугу
        </button>
      </div>
      <div className="mt-3">
        <DataTable
          columns={[
            { key: 'name', label: 'Услуга' },
            { key: 'price', label: 'Цена', width: '120px', render: (r) => money(r.price) },
            { key: 'qty', label: 'Кол-во', width: '90px' },
            {
              key: 'sum',
              label: 'Итого',
              width: '130px',
              render: (r) => money(Number(r.price || 0) * Number(r.qty || 1)),
            },
            {
              key: 'del',
              label: '',
              width: '80px',
              render: (r) => (
                <button
                  className="h-label underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    drop('booking_services', Number(r.id));
                  }}
                >
                  Убрать
                </button>
              ),
            },
          ]}
          rows={extras}
          empty="Услуг пока нет"
        />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <div className="h-label">Платежи</div>
        <button className="h-cta" onClick={() => setPayOpen(true)}>
          Записать оплату
        </button>
      </div>
      <div className="mt-3">
        <DataTable
          columns={[
            { key: 'paid_on', label: 'Дата', width: '130px' },
            { key: 'amount', label: 'Сумма', width: '140px', render: (r) => money(r.amount) },
            {
              key: 'method',
              label: 'Способ',
              width: '140px',
              render: (r) => METHODS[String(r.method)] || String(r.method),
            },
            { key: 'note', label: 'Комментарий' },
            {
              key: 'del',
              label: '',
              width: '80px',
              render: (r) => (
                <button
                  className="h-label underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    drop('payments', Number(r.id));
                  }}
                >
                  Убрать
                </button>
              ),
            },
          ]}
          rows={payments}
          empty="Оплат пока нет"
        />
      </div>

      <RecordDialog
        open={serviceOpen}
        onOpenChange={setServiceOpen}
        title="Услуга в заезд"
        onSubmit={addService}
        fields={[
          {
            key: 'service_id',
            label: 'Из прайса',
            type: 'select',
            options: catalog.map((c) => ({
              value: String(c.id),
              label: `${c.name} — ${money(c.price)}`,
            })),
          },
          { key: 'name', label: 'Название (если своё)' },
          { key: 'price', label: 'Цена, ₽', type: 'number' },
          { key: 'qty', label: 'Количество', type: 'number' },
        ]}
      />

      <RecordDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        title="Оплата"
        onSubmit={addPayment}
        fields={[
          { key: 'amount', label: 'Сумма, ₽', type: 'number' },
          {
            key: 'method',
            label: 'Способ',
            type: 'select',
            options: Object.entries(METHODS).map(([value, label]) => ({ value, label })),
          },
          { key: 'paid_on', label: 'Дата', type: 'date' },
          { key: 'note', label: 'Комментарий' },
        ]}
      />
    </Layout>
  );
};

export default BookingCard;