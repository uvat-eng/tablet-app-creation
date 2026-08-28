import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { readOffline, offlineTileLayer, probeOffline } from '@/lib/offlineMap';

const BASES = [
  {
    key: 'sat',
    label: 'Спутник',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: 'Esri',
    max: 19,
  },
  {
    key: 'osm',
    label: 'Схема',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: 'OpenStreetMap',
    max: 19,
  },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value?: string;
  onPick: (coords: string) => void;
}

const PIN = L.divIcon({
  className: '',
  html:
    '<div style="width:18px;height:18px;border-radius:50%;background:#ff5a1f;' +
    'border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const parse = (v?: string): [number, number] | null => {
  const p = String(v || '').replace(/;/g, ',').split(',');
  const lat = Number(String(p[0] || '').trim());
  const lng = Number(String(p[1] || '').trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (!lat && !lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
};

const PickPointDialog = ({ open, onOpenChange, value, onPick }: Props) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markRef = useRef<L.Marker | null>(null);
  const baseRef = useRef<L.TileLayer | null>(null);
  const [base, setBase] = useState('sat');
  const [point, setPoint] = useState<[number, number] | null>(null);
  const [hasOffline, setHasOffline] = useState(false);
  const hasPoint = point !== null;

  useEffect(() => {
    if (open) probeOffline().then(setHasOffline);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    let tries = 0;

    const build = () => {
      if (mapRef.current) return;
      const box = boxRef.current;
      if (!box || box.clientWidth === 0) {
        if (tries++ < 60) raf = requestAnimationFrame(build);
        return;
      }
      const start = parse(value);
      const map = L.map(boxRef.current, {
        center: start || [56.55, 68.65],
        zoom: start ? 15 : 10,
        zoomControl: true,
      });
      mapRef.current = map;
      L.control.scale({ imperial: false }).addTo(map);

      if (start) {
        setPoint(start);
        markRef.current = L.marker(start, { draggable: true, icon: PIN }).addTo(map);
        markRef.current.on('dragend', () => {
          const p = markRef.current!.getLatLng();
          setPoint([p.lat, p.lng]);
        });
      }

      map.on('click', (e: L.LeafletMouseEvent) => {
        const p: [number, number] = [e.latlng.lat, e.latlng.lng];
        setPoint(p);
        if (markRef.current) {
          markRef.current.setLatLng(p);
        } else {
          markRef.current = L.marker(p, { draggable: true, icon: PIN }).addTo(map);
          markRef.current.on('dragend', () => {
            const q = markRef.current!.getLatLng();
            setPoint([q.lat, q.lng]);
          });
        }
      });
      setTimeout(() => map.invalidateSize(), 60);
    };

    raf = requestAnimationFrame(build);

    return () => {
      cancelAnimationFrame(raf);
      mapRef.current?.remove();
      mapRef.current = null;
      markRef.current = null;
      baseRef.current = null;
      setPoint(null);
    };
  }, [open, value]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !open) return;
    if (baseRef.current) map.removeLayer(baseRef.current);
    if (base === 'offline') {
      baseRef.current = offlineTileLayer(readOffline()).addTo(map);
    } else {
      const cfg = BASES.find((b) => b.key === base) || BASES[0];
      baseRef.current = L.tileLayer(cfg.url, {
        attribution: cfg.attr,
        maxZoom: cfg.max,
        maxNativeZoom: cfg.max,
      }).addTo(map);
    }
    baseRef.current.bringToBack();
  }, [base, open, hasPoint]);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setPoint(p);
      const map = mapRef.current;
      if (!map) return;
      map.setView(p, 16);
      if (markRef.current) markRef.current.setLatLng(p);
      else markRef.current = L.marker(p, { draggable: true, icon: PIN }).addTo(map);
    });
  };

  const fmt = (p: [number, number]) => `${p[0].toFixed(6)}, ${p[1].toFixed(6)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] rounded-none border-black">
        <DialogHeader>
          <DialogTitle className="h-head text-[22px]">Точка на карте</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          {BASES.map((b) => (
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
          {hasOffline && (
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
              Офлайн
            </button>
          )}
          <button className="h-cta-ghost ml-auto text-[0.7em]" onClick={locate}>
            <Icon name="LocateFixed" size={14} /> Я здесь
          </button>
        </div>

        <div
          ref={boxRef}
          className="mt-3 w-full h-[380px] border border-[#e2e2df]"
          style={{ background: '#eceae4' }}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="h-label">
            {point ? fmt(point) : 'Нажмите на карту, чтобы поставить точку'}
          </span>
          <button
            className="h-cta ml-auto"
            disabled={!point}
            style={{ opacity: point ? 1 : 0.4 }}
            onClick={() => {
              if (!point) return;
              onPick(fmt(point));
              onOpenChange(false);
            }}
          >
            Использовать точку
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PickPointDialog;