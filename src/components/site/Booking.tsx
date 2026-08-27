import { useMemo, useState } from 'react';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const busySeed = [3, 4, 5, 12, 13, 18, 21, 22, 23, 27];

const key = (y: number, m: number, d: number) => `${y}-${m}-${d}`;

const Booking = () => {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  const days = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const shift = (first.getDay() + 6) % 7;
    const total = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: (number | null)[] = Array(shift).fill(null);
    for (let d = 1; d <= total; d += 1) cells.push(d);
    return cells;
  }, [cursor]);

  const isBusy = (d: number) => busySeed.includes((d + cursor.m) % 30);

  const pick = (d: number) => {
    const k = key(cursor.y, cursor.m, d);
    if (!from || (from && to)) {
      setFrom(k);
      setTo(null);
    } else {
      setTo(k);
    }
  };

  const nights = from && to ? Math.abs(Number(to.split('-')[2]) - Number(from.split('-')[2])) : 0;

  const move = (delta: number) => {
    const m = cursor.m + delta;
    setCursor({ y: cursor.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  const fmt = (k: string | null) => {
    if (!k) return '—';
    const [, m, d] = k.split('-').map(Number);
    return `${d} ${MONTHS[m].slice(0, 3).toLowerCase()}`;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
      <div className="h-frame p-6">
        <div className="flex items-center justify-between">
          <div className="h-head text-[20px]">
            {MONTHS[cursor.m]} {cursor.y}
          </div>
          <div className="flex gap-2">
            <button className="h-chip h-chip-grey text-[0.6em]" onClick={() => move(-1)}>
              Назад
            </button>
            <button className="h-chip h-chip-grey text-[0.6em]" onClick={() => move(1)}>
              Вперёд
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1">
          {WEEK.map((w) => (
            <div key={w} className="h-label text-center py-1">
              {w}
            </div>
          ))}
          {days.map((d, i) => {
            if (d === null) return <div key={`e${i}`} />;
            const k = key(cursor.y, cursor.m, d);
            const busy = isBusy(d);
            const selected = k === from || k === to;
            const inRange =
              from && to && Number(k.split('-')[2]) > Number(from.split('-')[2]) &&
              Number(k.split('-')[2]) < Number(to.split('-')[2]);
            return (
              <button
                key={k}
                disabled={busy}
                onClick={() => pick(d)}
                className="h-9 text-[0.7em] border transition-colors"
                style={{
                  borderColor: '#e2e2df',
                  background: selected
                    ? 'var(--hero-accent)'
                    : inRange
                      ? 'var(--hero-surface)'
                      : busy
                        ? '#f7f7f6'
                        : '#fff',
                  color: busy ? '#c2c2be' : 'var(--hero-text)',
                  textDecoration: busy ? 'line-through' : 'none',
                  cursor: busy ? 'not-allowed' : 'pointer',
                }}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-5 h-label">
          <span>■ свободно</span>
          <span>■ занято</span>
          <span>■ ваш выбор</span>
        </div>
      </div>

      <div className="h-dialog self-start">
        Заезд {fmt(from)} — выезд {fmt(to)}.
        <b> {nights ? `${nights} ноч.` : 'Выберите даты'}</b>
        <div className="flex gap-2 mt-3">
          <span className="h-chip h-chip-grey">Смета</span>
          <span className="h-chip h-chip-mark">{nights ? `${nights * 16000} ₽` : '—'}</span>
        </div>
        <a className="h-cta mt-4 w-full text-center" href="#club">
          Оставить заявку
        </a>
      </div>
    </div>
  );
};

export default Booking;
