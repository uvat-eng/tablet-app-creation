import { RefObject } from 'react';
import L from 'leaflet';
import Icon from '@/components/ui/icon';
import { Row } from '@/lib/api';
import { HOME_CENTER, HOME_ZOOM } from '@/lib/homeArea';
import { GeoFix } from '@/lib/useGeoLocate';
import { toast } from 'sonner';

interface Geo {
  tracking: boolean;
  fix: GeoFix | null;
  error: string;
  start: () => void;
  stop: () => void;
  center: () => void;
}

interface Props {
  boxRef: RefObject<HTMLDivElement>;
  mapRef: RefObject<L.Map | null>;
  geo: Geo;
  mayEdit: boolean;
  setDraft: (r: Row) => void;
  setOpen: (v: boolean) => void;
  pointsCount: number;
  noCoords: number;
}

const MapCanvas = ({
  boxRef,
  mapRef,
  geo,
  mayEdit,
  setDraft,
  setOpen,
  pointsCount,
  noCoords,
}: Props) => (
  <>
    <div className="relative">
      <div
        ref={boxRef}
        className="border border-[#e2e2df]"
        style={{ height: '620px', width: '100%' }}
      />

      <button
        onClick={() => mapRef.current?.setView(HOME_CENTER, HOME_ZOOM)}
        title="Показать угодья хозяйства"
        className="absolute flex items-center justify-center border shadow-md"
        style={{
          right: 12,
          bottom: 82,
          zIndex: 1000,
          width: 46,
          height: 46,
          borderColor: '#e2e2df',
          borderRadius: '50%',
          background: '#fff',
          color: '#3b3b38',
        }}
      >
        <Icon name="Home" size={20} />
      </button>

      <button
        onClick={geo.tracking ? geo.center : geo.start}
        title={geo.tracking ? 'Показать себя на карте' : 'Определить моё местоположение'}
        className="absolute flex items-center justify-center border shadow-md"
        style={{
          right: 12,
          bottom: 28,
          zIndex: 1000,
          width: 46,
          height: 46,
          borderColor: '#e2e2df',
          borderRadius: '50%',
          background: '#fff',
          color: geo.tracking ? '#1a73e8' : '#3b3b38',
        }}
      >
        <Icon name={geo.tracking ? 'LocateFixed' : 'Locate'} size={22} />
      </button>

      {geo.tracking && (
        <button
          onClick={geo.stop}
          title="Выключить слежение"
          className="absolute flex items-center justify-center border shadow-md"
          style={{
            right: 12,
            bottom: 82,
            zIndex: 1000,
            width: 46,
            height: 46,
            borderColor: '#e2e2df',
            borderRadius: '50%',
            background: '#fff',
            color: '#3b3b38',
          }}
        >
          <Icon name="X" size={20} />
        </button>
      )}
    </div>

    {(geo.fix || geo.error) && (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {geo.fix && (
          <>
            <span className="h-label">Вы здесь</span>
            <span className="text-sm">
              {geo.fix.lat.toFixed(6)}, {geo.fix.lng.toFixed(6)}
            </span>
            <span className="text-sm text-[#6d6d6d]">
              точность ±{Math.round(geo.fix.accuracy)} м
            </span>
            {mayEdit && (
              <button
                className="h-cta-ghost"
                onClick={() => {
                  const f = geo.fix!;
                  setDraft({
                    kind: 'tower',
                    name: '',
                    lat: Number(f.lat.toFixed(6)),
                    lng: Number(f.lng.toFixed(6)),
                    coords: `${f.lat.toFixed(6)}, ${f.lng.toFixed(6)}`,
                    qty: 1,
                    unit: 'шт',
                    status: 'ok',
                  } as Row);
                  setOpen(true);
                }}
              >
                Добавить точку здесь
              </button>
            )}
            <button
              className="h-cta-ghost"
              onClick={() => {
                const f = geo.fix!;
                navigator.clipboard?.writeText(`${f.lat.toFixed(6)}, ${f.lng.toFixed(6)}`);
                toast.success('Координаты скопированы');
              }}
            >
              Скопировать координаты
            </button>
          </>
        )}
        {geo.error && <span className="text-sm text-[#c0392b]">{geo.error}</span>}
      </div>
    )}

    <div className="mt-3 h-label">
      Точек на карте: {pointsCount}
      {noCoords > 0 && ` · без координат: ${noCoords}`} · двойной клик по метке открывает карточку
    </div>
  </>
);

export default MapCanvas;
