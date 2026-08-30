import Icon from '@/components/ui/icon';
import { Person, fmtAge } from '@/lib/fieldPresence';
import { GeoSample } from '@/lib/geoProvider';
import { distance, bearing, fmtDistance, sideName } from '@/lib/geoMath';

interface Props {
  people: Person[];
  fix: GeoSample | null;
  myDir: number | null;
  onGo: (p: Person) => void;
  onClose: () => void;
}

const AlarmScreen = ({ people, fix, myDir, onGo, onClose }: Props) => {
  if (!people.length) return null;

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: '#2a0b0b', zIndex: 40, color: '#fff' }}
    >
      <div
        className="flex flex-col items-center px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 28px)' }}
      >
        <Icon name="TriangleAlert" size={54} fallback="CircleAlert" />
        <div
          className="mt-3 text-center"
          style={{ fontSize: 30, lineHeight: 1.1, fontWeight: 700, letterSpacing: '0.04em' }}
        >
          ТРЕВОГА
        </div>
        <div className="mt-1 text-[0.78em] opacity-80 text-center">
          {people.length === 1
            ? 'Участник просит помощи'
            : `Просят помощи: ${people.length}`}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 mt-6">
        {people.map((p) => {
          const d = fix ? distance(fix.lat, fix.lng, p.lat, p.lng) : null;
          const brg = fix ? bearing(fix.lat, fix.lng, p.lat, p.lng) : null;
          const rel = brg !== null && myDir !== null ? (brg - myDir + 360) % 360 : brg;
          return (
            <div
              key={p.id}
              className="mb-4 p-4"
              style={{ background: '#ffffff14', border: '1px solid #ffffff26' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div style={{ fontSize: 22, fontWeight: 600 }} className="truncate">
                    {p.name}
                  </div>
                  <div className="text-[0.72em] opacity-70 mt-1">
                    {fmtAge(p.ageSec)}
                    {p.battery !== null && ` · батарея ${p.battery}%`}
                  </div>
                </div>
                {rel !== null && (
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: '50%',
                      background: '#00000059',
                      border: '2px solid #ffffff33',
                    }}
                  >
                    <div
                      style={{
                        transform: `rotate(${rel}deg)`,
                        transition: 'transform .3s ease-out',
                        width: 0,
                        height: 0,
                        borderLeft: '12px solid transparent',
                        borderRight: '12px solid transparent',
                        borderBottom: '34px solid #ffd54f',
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-baseline gap-3">
                <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>
                  {d === null ? '—' : fmtDistance(d)}
                </span>
                {brg !== null && (
                  <span className="text-[0.76em] opacity-80">
                    азимут {Math.round(brg)}° · {sideName(brg)}
                  </span>
                )}
              </div>

              <div className="mt-2 text-[0.68em] opacity-60">
                {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
              </div>

              <button
                onClick={() => onGo(p)}
                className="w-full mt-4 py-4 flex items-center justify-center gap-2 text-[0.78em] uppercase tracking-[0.08em]"
                style={{ background: '#c6e97a', color: '#1f1f1d' }}
              >
                <Icon name="Navigation" size={18} fallback="Compass" />
                Идти на помощь
              </button>
            </div>
          );
        })}
      </div>

      <div
        className="px-4 pt-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <button
          onClick={onClose}
          className="w-full py-4 text-[0.74em] uppercase tracking-[0.08em]"
          style={{ background: '#ffffff1a', color: '#fff' }}
        >
          Понял, к карте
        </button>
      </div>
    </div>
  );
};

export default AlarmScreen;
