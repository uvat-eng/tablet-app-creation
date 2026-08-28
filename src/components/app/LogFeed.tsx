import Icon from '@/components/ui/icon';
import { LogEntry } from '@/lib/api';

export const TABLE_LABEL: Record<string, string> = {
  bookings: 'Бронь',
  objects: 'Объект',
  guests: 'Гость',
  services: 'Услуга',
  trophies: 'Трофей',
  locations: 'Локация',
  map_layers: 'Слой карты',
  reviews: 'Отзыв',
  checks: 'Расчёт',
  receipts: 'Квитанция',
  house_expenses: 'Расход по базе',
  expenses: 'Расход',
  booking_services: 'Услуга в брони',
  payments: 'Платёж',
};

const ACTION: Record<string, { label: string; icon: string; color: string }> = {
  create: { label: 'создал', icon: 'Plus', color: '#00a05a' },
  update: { label: 'изменил', icon: 'Pencil', color: '#c58a00' },
  archive: { label: 'убрал в архив', icon: 'Archive', color: '#8a8a86' },
  delete: { label: 'удалил', icon: 'Trash2', color: '#c0392b' },
};

const FIELD_LABEL: Record<string, string> = {
  name: 'название',
  status: 'состояние',
  note: 'описание',
  price: 'цена',
  total: 'сумма',
  paid: 'оплачено',
  qty: 'количество',
  coords: 'координаты',
  lat: 'широта',
  lng: 'долгота',
  date_from: 'заезд',
  date_to: 'выезд',
  people: 'человек',
  guest_name: 'гость',
  guest_phone: 'телефон',
  archived: 'архив',
  visible: 'видимость',
  color: 'цвет',
  species: 'вид',
  hunter: 'охотник',
  responsible: 'ответственный',
};

const short = (v: unknown) => {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  if (s === 'true') return 'да';
  if (s === 'false') return 'нет';
  return s.length > 44 ? s.slice(0, 44) + '…' : s;
};

const when = (iso: string) => {
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const LogFeed = ({ items, empty }: { items: LogEntry[]; empty: string }) => {
  if (!items.length) return <p className="text-sm text-[#6d6d6d] py-8">{empty}</p>;

  return (
    <div className="border border-[#e2e2df] divide-y divide-[#e2e2df]">
      {items.map((e) => {
        const a = ACTION[e.action] || ACTION.update;
        const changed = e.changes ? Object.entries(e.changes) : [];
        return (
          <div key={e.id} className="px-4 py-3 flex gap-3">
            <span
              className="mt-[3px] shrink-0 flex items-center justify-center"
              style={{ width: 22, height: 22, color: a.color }}
            >
              <Icon name={a.icon} size={16} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="text-sm">
                <b>{e.staff_name}</b> <span style={{ color: a.color }}>{a.label}</span>{' '}
                {TABLE_LABEL[e.table_name] || e.table_name}
                {e.title && <> «{e.title}»</>}
              </div>

              {changed.length > 0 && (
                <ul className="mt-1 space-y-[2px]">
                  {changed.slice(0, 6).map(([f, v]) => (
                    <li key={f} className="text-xs text-[#6d6d6d]">
                      {FIELD_LABEL[f] || f}: <s>{short(v.was)}</s> → <b>{short(v.now)}</b>
                    </li>
                  ))}
                  {changed.length > 6 && (
                    <li className="text-xs text-[#6d6d6d]">и ещё {changed.length - 6} поля</li>
                  )}
                </ul>
              )}

              <div className="mt-1 text-xs text-[#a3a39d]">
                {when(e.created_at)}
                {e.row_id ? ` · запись №${e.row_id}` : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LogFeed;
