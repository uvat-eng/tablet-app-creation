import Icon from '@/components/ui/icon';
import { Row } from '@/lib/api';
import { LOCATION_KINDS } from '@/lib/locationKinds';
import { BASE_DEFS } from '@/lib/basemaps';
import { OfflineCfg } from '@/lib/offlineMap';
import OfflineMapDownload from '@/components/app/OfflineMapDownload';
import { COLORS } from '@/components/map/mapStyles';

interface Props {
  base: string;
  setBase: (key: string) => void;
  offline: OfflineCfg;
  offlineReady: boolean;
  setOfflineReady: (v: boolean) => void;
  rows: Row[];
  active: string[];
  toggleKind: (key: string) => void;
  onOpenNav: () => void;
}

const MapControls = ({
  base,
  setBase,
  offline,
  offlineReady,
  setOfflineReady,
  rows,
  active,
  toggleKind,
  onOpenNav,
}: Props) => (
  <>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="h-label mr-1">Подложка</span>
      {BASE_DEFS.map((b) => (
        <button
          key={b.key}
          onClick={() => setBase(b.key)}
          className="h-label px-2 py-1 border"
          style={{
            borderColor: '#e2e2df',
            background: base === b.key ? 'var(--hero-accent)' : '#fff',
            color: base === b.key ? 'var(--hero-accent-contrast)' : 'inherit',
          }}
        >
          {b.label}
        </button>
      ))}
      {offlineReady && (
        <button
          onClick={() => setBase('offline')}
          className="h-label px-2 py-1 border flex items-center gap-1"
          style={{
            borderColor: '#e2e2df',
            background: base === 'offline' ? 'var(--hero-accent)' : '#fff',
            color: base === 'offline' ? 'var(--hero-accent-contrast)' : 'inherit',
          }}
        >
          <Icon name="WifiOff" size={13} />
          {offline.label}
        </button>
      )}
    </div>

    <OfflineMapDownload onReady={() => setOfflineReady(true)} />

    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="h-label mr-1">Слои</span>
      {LOCATION_KINDS.map((k) => {
        const on = active.includes(k.key);
        const count = rows.filter(
          (r) => String(r.kind || 'ground') === k.key && Number(r.lat) && Number(r.lng),
        ).length;
        return (
          <button
            key={k.key}
            onClick={() => toggleKind(k.key)}
            className="h-label px-2 py-1 border flex items-center gap-2"
            style={{
              borderColor: '#e2e2df',
              background: on ? '#fff' : '#f2f2f0',
              opacity: on ? 1 : 0.5,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: COLORS[k.key],
                display: 'inline-block',
              }}
            />
            {k.label} {count > 0 && `(${count})`}
          </button>
        );
      })}
    </div>

    <button
      onClick={onOpenNav}
      className="w-full mb-4 flex items-center justify-center gap-3 py-4"
      style={{ background: '#1f1f1d', color: '#fff' }}
    >
      <Icon name="Compass" size={22} fallback="Navigation" />
      <span className="text-[0.8em] uppercase tracking-[0.1em]">Открыть навигатор</span>
    </button>
  </>
);

export default MapControls;
