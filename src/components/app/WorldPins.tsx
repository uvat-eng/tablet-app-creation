import { useMemo, useState } from 'react';
import { findCountry } from '@/lib/countries';

interface WorldPinsProps {
  counts: Record<string, number>;
}

const WorldPins = ({ counts }: WorldPinsProps) => {
  const [hover, setHover] = useState<string>('');

  const pins = useMemo(() => {
    const out: { name: string; x: number; y: number; n: number; flag: string }[] = [];
    Object.entries(counts).forEach(([name, n]) => {
      const c = findCountry(name);
      if (c && n > 0) out.push({ name: c.name, x: c.x, y: c.y, n, flag: c.flag });
    });
    return out.sort((a, b) => b.n - a.n);
  }, [counts]);

  const unknown = useMemo(
    () => Object.keys(counts).filter((k) => k && !findCountry(k)),
    [counts],
  );

  const max = Math.max(1, ...pins.map((p) => p.n));

  return (
    <div className="border border-[#e2e2df] bg-white">
      <div className="relative" style={{ paddingBottom: '65.26%' }}>
        <img
          src="/world.svg"
          alt="Карта мира"
          className="absolute inset-0 w-full h-full opacity-[0.3]"
          loading="lazy"
        />

        {pins.map((p) => {
          const size = 12 + Math.round((p.n / max) * 14);
          const on = hover === p.name;
          return (
            <button
              key={p.name}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-transform"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: size,
                height: size,
                background: 'var(--hero-accent)',
                color: 'var(--hero-accent-contrast)',
                fontSize: Math.max(8, size * 0.5),
                border: '1.5px solid #fff',
                boxShadow: on ? '0 0 0 4px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.25)',
                transform: `translate(-50%, -50%) scale(${on ? 1.25 : 1})`,
                zIndex: on ? 3 : 2,
              }}
              onMouseEnter={() => setHover(p.name)}
              onMouseLeave={() => setHover('')}
              title={`${p.name} — ${p.n}`}
            >
              {p.n}
            </button>
          );
        })}

        {hover && (
          <div
            className="absolute px-2 py-1 bg-black text-white text-[0.62em] whitespace-nowrap"
            style={{
              left: `${pins.find((p) => p.name === hover)?.x || 0}%`,
              top: `calc(${pins.find((p) => p.name === hover)?.y || 0}% - 26px)`,
              transform: 'translateX(-50%)',
              zIndex: 4,
            }}
          >
            {hover} — {counts[hover]}
          </div>
        )}
      </div>

      <div className="border-t border-[#e2e2df] px-4 py-3 flex flex-wrap gap-x-5 gap-y-2">
        {pins.length === 0 && (
          <span className="h-label text-[var(--hero-muted)]">
            Укажите страну в карточке охотника — она появится на карте
          </span>
        )}
        {pins.map((p) => (
          <span
            key={p.name}
            className="h-label flex items-center gap-2 cursor-default"
            onMouseEnter={() => setHover(p.name)}
            onMouseLeave={() => setHover('')}
            style={{ opacity: hover && hover !== p.name ? 0.45 : 1 }}
          >
            <span className="text-[1.3em] leading-none">{p.flag}</span>
            {p.name}
            <b>{p.n}</b>
          </span>
        ))}
        {unknown.length > 0 && (
          <span className="h-label text-[var(--hero-muted)]">
            без метки: {unknown.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
};

export default WorldPins;