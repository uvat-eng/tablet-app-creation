import { useEffect, useMemo, useState } from 'react';
import { Row } from '@/lib/api';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

interface BookingCalendarProps {
  bookings: Row[];
  year?: number;
  onPick?: (from: string, to: string) => void;
}

const BookingCalendar = ({ bookings, year, onPick }: BookingCalendarProps) => {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  useEffect(() => {
    if (!year) return;
    setCursor((prev) =>
      prev.y === year ? prev : { y: year, m: year === today.getFullYear() ? today.getMonth() : 0 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  const cells = useMemo(() => {
    const shift = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;
    const total = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const list: (number | null)[] = Array(shift).fill(null);
    for (let d = 1; d <= total; d += 1) list.push(d);
    return list;
  }, [cursor]);

  const busyMap = useMemo(() => {
    const map: Record<string, Row[]> = {};
    bookings.forEach((b) => {
      if (b.status === 'cancelled') return;
      const start = new Date(String(b.date_from));
      const end = new Date(String(b.date_to));
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const k = iso(d.getFullYear(), d.getMonth(), d.getDate());
        map[k] = map[k] ? [...map[k], b] : [b];
      }
    });
    return map;
  }, [bookings]);

  const yearList = useMemo(() => {
    const set = new Set<number>([today.getFullYear(), cursor.y]);
    bookings.forEach((b) => {
      const y = Number(String(b.date_from || '').slice(0, 4));
      if (y) set.add(y);
    });
    return Array.from(set).sort((a, b) => a - b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, cursor.y]);

  const move = (delta: number) => {
    const m = cursor.m + delta;
    setCursor({ y: cursor.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  const pick = (d: number) => {
    const k = iso(cursor.y, cursor.m, d);
    if (!from || (from && to)) {
      setFrom(k);
      setTo(null);
    } else if (k < from) {
      setFrom(k);
    } else {
      setTo(k);
    }
  };

  return (
    <div className="h-frame p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="h-head text-[20px]">
          {MONTHS[cursor.m]} {cursor.y}
        </div>
        <div className="flex gap-2 items-center">
          {from && (
            <button
              className="h-cta"
              onClick={() => onPick?.(from, to || from)}
            >
              Создать бронь {from.slice(8)}–{(to || from).slice(8)}
            </button>
          )}
          <button className="h-chip h-chip-grey text-[0.6em]" onClick={() => move(-1)}>
            Назад
          </button>
          <button className="h-chip h-chip-grey text-[0.6em]" onClick={() => move(1)}>
            Вперёд
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1">
        {yearList.map((y) => (
          <button
            key={y}
            onClick={() => setCursor((p) => ({ ...p, y }))}
            className="h-label px-2 py-1 border transition-colors"
            style={{
              borderColor: '#e2e2df',
              background: cursor.y === y ? 'var(--hero-accent)' : '#fff',
              color: cursor.y === y ? 'var(--hero-accent-contrast)' : 'inherit',
            }}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {MONTHS.map((name, i) => (
          <button
            key={name}
            onClick={() => setCursor((p) => ({ ...p, m: i }))}
            className="h-label px-2 py-1 border transition-colors"
            style={{
              borderColor: '#e2e2df',
              background: cursor.m === i ? 'var(--hero-accent)' : '#fff',
              color: cursor.m === i ? 'var(--hero-accent-contrast)' : 'inherit',
            }}
          >
            {name.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1">
        {WEEK.map((w) => (
          <div key={w} className="h-label text-center py-1">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const k = iso(cursor.y, cursor.m, d);
          const busy = busyMap[k];
          const selected = k === from || k === to;
          const inRange = from && to && k > from && k < to;
          return (
            <button
              key={k}
              onClick={() => pick(d)}
              title={busy?.map((b) => `${b.guest_name} — ${b.object_name || ''}`).join('\n')}
              className="min-h-[58px] p-1 text-left border transition-colors"
              style={{
                borderColor: '#e2e2df',
                background: selected
                  ? 'var(--hero-accent)'
                  : inRange
                    ? 'var(--hero-surface)'
                    : '#fff',
              }}
            >
              <span className="text-[0.7em]">{d}</span>
              {busy && (
                <span className="block mt-1 space-y-[2px]">
                  {busy.slice(0, 2).map((b) => (
                    <span
                      key={String(b.id)}
                      className="block truncate text-[9px] leading-[12px] px-1"
                      style={{
                        background:
                          b.status === 'new' ? 'var(--hero-x-mark)' : 'var(--hero-accent)',
                        color: b.status === 'new' ? '#fff' : 'var(--hero-accent-contrast)',
                      }}
                    >
                      {String(b.guest_name || 'Бронь')}
                    </span>
                  ))}
                  {busy.length > 2 && (
                    <span className="block text-[9px] text-[var(--hero-muted)] px-1">
                      +{busy.length - 2}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-5 h-label">
        <span>Оранжевый — новая заявка</span>
        <span>Зелёный — завершено</span>
        <span>Клик по дням — создать бронь</span>
      </div>
    </div>
  );
};

export default BookingCalendar;