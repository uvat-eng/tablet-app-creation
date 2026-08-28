import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Row } from '@/lib/api';
import Icon from '@/components/ui/icon';

const STATUS: Record<string, string> = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  arrived: 'Заехали',
  done: 'Завершена',
  cancelled: 'Отменена',
};

const money = (v: unknown) => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;

const human = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
};

interface Props {
  date: string | null;
  bookings: Row[];
  onClose: () => void;
  onEdit: (b: Row) => void;
  onCreate: (date: string) => void;
  onOpenCard: (b: Row) => void;
  onDelete: (b: Row) => void;
}

const BookingDayDialog = ({
  date,
  bookings,
  onClose,
  onEdit,
  onCreate,
  onOpenCard,
  onDelete,
}: Props) => (
  <Dialog open={!!date} onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="max-w-[560px] rounded-none border-black">
      <DialogHeader>
        <DialogTitle className="h-head text-[22px]">
          {date ? human(date) : ''}
        </DialogTitle>
      </DialogHeader>

      <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1">
        {bookings.length === 0 ? (
          <p className="text-[0.8em] text-[var(--hero-muted)] py-4">
            На этот день броней нет.
          </p>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={String(b.id)} className="border border-[#e2e2df] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="h-head text-[16px] truncate">
                      {String(b.guest_name || 'Без имени')}
                    </div>
                    <div className="h-label mt-1">
                      {human(String(b.date_from))} — {human(String(b.date_to))}
                      {b.people ? ` · ${b.people} чел.` : ''}
                    </div>
                    <div className="text-[0.75em] mt-1 text-[var(--hero-muted)]">
                      {[
                        String(b.object_name || ''),
                        String(b.hunt_type || ''),
                        STATUS[String(b.status)] || '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                    <div className="text-[0.75em] mt-1">{money(b.total)}</div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button className="h-cta text-[0.7em]" onClick={() => onEdit(b)}>
                      Править
                    </button>
                    <button className="h-cta-ghost text-[0.7em]" onClick={() => onOpenCard(b)}>
                      Карточка
                    </button>
                    <button
                      className="h-label underline text-center"
                      style={{ color: '#c0392b' }}
                      onClick={() => onDelete(b)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className="h-cta w-full flex items-center justify-center gap-2 mt-2"
        onClick={() => date && onCreate(date)}
      >
        <Icon name="Plus" size={15} />
        Новая бронь с этой даты
      </button>
    </DialogContent>
  </Dialog>
);

export default BookingDayDialog;