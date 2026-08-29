import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import Icon from '@/components/ui/icon';
import { Row } from '@/lib/api';
import { KIND } from '@/lib/locationKinds';
import { watchLocation, GeoSample, FAIL_TEXT } from '@/lib/geoProvider';
import { readOffline, offlineTileLayer } from '@/lib/offlineMap';
import { makeBaseLayer } from '@/lib/basemaps';
import { BASE_POINT, BASE_LABEL } from '@/lib/homeArea';
import { distance, bearing, fmtDistance, fmtSpeed, sideName } from '@/lib/geoMath';
import useTrackRecorder from '@/lib/useTrackRecorder';
import useCompass from '@/lib/useCompass';
import useBattery from '@/lib/useBattery';
import { toast } from 'sonner';

interface Target {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: string;
}

interface Props {
  points: Row[];
  offlineReady: boolean;
  onClose: () => void;
}

const clock = () =>
  new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const Navigator = ({ points, offlineReady, onClose }: Props) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const meRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const trackRef = useRef<L.Polyline | null>(null);
  const targetRef = useRef<L.Marker | null>(null);

  const [fix, setFix] = useState<GeoSample | null>(null);
  const [error, setError] = useState('');
  const [target, setTarget] = useState<Target | null>(null);
  const [picker, setPicker] = useState(false);
  const [now, setNow] = useState(clock);
  const [follow, setFollow] = useState(true);

  const rec = useTrackRecorder();
  const compass = useCompass(true);
  const battery = useBattery();

  const targets: Target[] = useMemo(() => {
    const list: Target[] = [
      { id: 'base', name: BASE_LABEL, lat: BASE_POINT[0], lng: BASE_POINT[1], kind: 'base' },
    ];
    points.forEach((r) => {
      if (!Number(r.lat) || !Number(r.lng)) return;
      list.push({
        id: String(r.id),
        name: String(r.name),
        lat: Number(r.lat),
        lng: Number(r.lng),
        kind: String(r.kind || 'ground'),
      });
    });
    return list;
  }, [points]);

  useEffect(() => {
    const t = setInterval(() => setNow(clock()), 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock) return;
    let lock: { release: () => Promise<void> } | null = null;
    let dead = false;

    const grab = () => {
      nav.wakeLock
        ?.request('screen')
        .then((l) => {
          if (dead) l.release().catch(() => undefined);
          else lock = l;
        })
        .catch(() => undefined);
    };
    grab();

    const onVisible = () => {
      if (!document.hidden) grab();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      dead = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => undefined);
    };
  }, []);

  const pushRef = useRef(rec.push);
  useEffect(() => {
    pushRef.current = rec.push;
  }, [rec.push]);

  useEffect(() => {
    const stop = watchLocation(
      (s) => {
        setError('');
        setFix(s);
        pushRef.current(s);
      },
      (f) => setError(FAIL_TEXT[f.kind]),
    );
    return () => stop.stop();
  }, []);

  useEffect(() => {
    if (mapRef.current || !boxRef.current) return;
    const map = L.map(boxRef.current, {
      center: BASE_POINT,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;
    const cfg = readOffline();
    const layer = offlineReady ? offlineTileLayer(cfg) : makeBaseLayer('bing');
    layer.addTo(map);
    map.on('dragstart', () => setFollow(false));
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [offlineReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fix) return;
    const pos: L.LatLngExpression = [fix.lat, fix.lng];
    const dir = compass ?? fix.heading;
    const icon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:30px;height:30px">
        ${
          dir === null
            ? ''
            : `<div style="position:absolute;left:50%;top:50%;width:0;height:0;
                transform:translate(-50%,-50%) rotate(${dir}deg) translateY(-20px);
                border-left:9px solid transparent;border-right:9px solid transparent;
                border-bottom:16px solid #1a73e8;filter:drop-shadow(0 0 2px #fff)"></div>`
        }
        <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
          width:20px;height:20px;border-radius:50%;background:#1a73e8;
          border:4px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.4)"></div>
      </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    if (!meRef.current) {
      meRef.current = L.marker(pos, { icon, zIndexOffset: 1000, interactive: false }).addTo(map);
    } else {
      meRef.current.setLatLng(pos);
      meRef.current.setIcon(icon);
    }
    if (follow) map.setView(pos, Math.max(map.getZoom(), 15), { animate: true });
  }, [fix, compass, follow]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (targetRef.current) {
      map.removeLayer(targetRef.current);
      targetRef.current = null;
    }
    if (!target) return;
    targetRef.current = L.marker([target.lat, target.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#e53935;
          border:4px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.4)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      interactive: false,
    }).addTo(map);
  }, [target]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lineRef.current) {
      map.removeLayer(lineRef.current);
      lineRef.current = null;
    }
    if (!target || !fix) return;
    lineRef.current = L.polyline(
      [
        [fix.lat, fix.lng],
        [target.lat, target.lng],
      ],
      { color: '#e53935', weight: 3, dashArray: '8 6', interactive: false },
    ).addTo(map);
  }, [target, fix]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (trackRef.current) {
      map.removeLayer(trackRef.current);
      trackRef.current = null;
    }
    if (rec.points.length < 2) return;
    trackRef.current = L.polyline(
      rec.points.map((p) => [p.lat, p.lng] as [number, number]),
      { color: '#00c853', weight: 4, opacity: 0.85, interactive: false },
    ).addTo(map);
  }, [rec.points]);

  const dist = fix && target ? distance(fix.lat, fix.lng, target.lat, target.lng) : null;
  const brg = fix && target ? bearing(fix.lat, fix.lng, target.lat, target.lng) : null;
  const myDir = compass ?? fix?.heading ?? null;
  const rel = brg !== null && myDir !== null ? (brg - myDir + 360) % 360 : brg;

  return (
    <div className="fixed inset-0 z-[3000]" style={{ background: '#0d0d0c' }}>
      <div ref={boxRef} className="absolute inset-0" />

      <div
        className="absolute left-0 right-0 top-0 flex items-center justify-between px-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
          paddingBottom: 10,
          background: 'linear-gradient(#0d0d0ce6,#0d0d0c00)',
          color: '#fff',
        }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: '#ffffff1a', color: '#fff' }}
        >
          <Icon name="X" size={18} />
          <span className="text-[0.72em] uppercase tracking-[0.06em]">Выход</span>
        </button>
        <div className="flex items-center gap-3 text-[0.78em]">
          <span>{now}</span>
          {battery.level !== null && (
            <span
              className="flex items-center gap-1"
              style={{ color: battery.level <= 15 ? '#ff6b6b' : '#fff' }}
            >
              <Icon
                name={battery.charging ? 'BatteryCharging' : 'Battery'}
                size={16}
                fallback="Zap"
              />
              {battery.level}%
            </span>
          )}
        </div>
      </div>

      {target && (
        <div
          className="absolute left-0 right-0 flex flex-col items-center"
          style={{ top: 'calc(env(safe-area-inset-top) + 62px)', color: '#fff' }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 132,
              height: 132,
              borderRadius: '50%',
              background: '#0d0d0cb3',
              border: '2px solid #ffffff33',
            }}
          >
            <div
              style={{
                transform: `rotate(${rel ?? 0}deg)`,
                transition: 'transform .3s ease-out',
                width: 0,
                height: 0,
                borderLeft: '26px solid transparent',
                borderRight: '26px solid transparent',
                borderBottom: '74px solid #c6e97a',
                filter: 'drop-shadow(0 0 4px #0008)',
              }}
            />
          </div>
          <div
            className="mt-3 px-4 py-2 text-center"
            style={{ background: '#0d0d0cd9', minWidth: 190 }}
          >
            <div className="text-[0.68em] uppercase tracking-[0.1em] opacity-70">
              {target.name}
            </div>
            <div style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 600 }}>
              {dist === null ? '—' : fmtDistance(dist)}
            </div>
            {brg !== null && (
              <div className="text-[0.72em] opacity-80">
                азимут {Math.round(brg)}° · {sideName(brg)}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="absolute left-0 right-0 bottom-0 px-4"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)',
          paddingTop: 16,
          background: 'linear-gradient(#0d0d0c00,#0d0d0ce6 40%)',
          color: '#fff',
        }}
      >
        {error && (
          <div className="mb-3 text-center text-[0.74em]" style={{ color: '#ff8a80' }}>
            {error}
          </div>
        )}

        <div className="flex items-center justify-center gap-6 mb-4 text-center">
          <div>
            <div className="text-[0.62em] uppercase tracking-[0.1em] opacity-60">Курс</div>
            <div style={{ fontSize: 22 }}>
              {myDir === null ? '—' : `${Math.round(myDir)}° ${sideName(myDir)}`}
            </div>
          </div>
          <div>
            <div className="text-[0.62em] uppercase tracking-[0.1em] opacity-60">Скорость</div>
            <div style={{ fontSize: 22 }}>{fmtSpeed(fix?.speed ?? null)}</div>
          </div>
          {rec.points.length > 1 && (
            <div>
              <div className="text-[0.62em] uppercase tracking-[0.1em] opacity-60">След</div>
              <div style={{ fontSize: 22 }}>{fmtDistance(rec.length)}</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setPicker(true)}
            className="px-4 py-3 text-[0.72em] uppercase tracking-[0.06em]"
            style={{ background: '#ffffff1a', color: '#fff' }}
          >
            {target ? 'Сменить цель' : 'Выбрать цель'}
          </button>
          <button
            onClick={() =>
              setTarget({
                id: 'base',
                name: BASE_LABEL,
                lat: BASE_POINT[0],
                lng: BASE_POINT[1],
                kind: 'base',
              })
            }
            className="px-4 py-3 text-[0.72em] uppercase tracking-[0.06em] flex items-center gap-2"
            style={{ background: '#c6e97a', color: '#1f1f1d' }}
          >
            <Icon name="Home" size={16} />
            На базу
          </button>
          <button
            onClick={rec.recording ? rec.stop : rec.start}
            className="px-4 py-3 text-[0.72em] uppercase tracking-[0.06em] flex items-center gap-2"
            style={{
              background: rec.recording ? '#e53935' : '#ffffff1a',
              color: '#fff',
            }}
          >
            <Icon name={rec.recording ? 'Square' : 'Circle'} size={14} />
            {rec.recording ? 'Стоп' : 'Запись'}
          </button>
          <button
            onClick={() => {
              setFollow(true);
              if (fix) mapRef.current?.setView([fix.lat, fix.lng], 16);
            }}
            className="px-4 py-3"
            style={{ background: follow ? '#1a73e8' : '#ffffff1a', color: '#fff' }}
          >
            <Icon name={follow ? 'LocateFixed' : 'Locate'} size={18} />
          </button>
        </div>

        {fix && (
          <div className="mt-3 text-center text-[0.68em] opacity-60">
            {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)} · точность ±{Math.round(fix.accuracy)} м
          </div>
        )}
      </div>

      {picker && (
        <div
          className="absolute inset-0 flex flex-col"
          style={{ background: '#0d0d0cf2', zIndex: 10 }}
        >
          <div
            className="flex items-center justify-between px-4 py-4"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)', color: '#fff' }}
          >
            <span className="text-[0.76em] uppercase tracking-[0.1em]">Куда идём</span>
            <button onClick={() => setPicker(false)} style={{ color: '#fff' }}>
              <Icon name="X" size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {targets.map((t) => {
              const d = fix ? distance(fix.lat, fix.lng, t.lat, t.lng) : null;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTarget(t);
                    setPicker(false);
                    toast.success(`Курс на «${t.name}»`);
                  }}
                  className="w-full flex items-center justify-between py-3 px-2 text-left"
                  style={{ borderBottom: '1px solid #ffffff1a', color: '#fff' }}
                >
                  <span className="flex items-center gap-3">
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: t.kind === 'base' ? '#c6e97a' : '#e53935',
                      }}
                    />
                    <span>
                      <span className="block text-[0.86em]">{t.name}</span>
                      <span className="block text-[0.64em] opacity-60 uppercase tracking-[0.08em]">
                        {t.kind === 'base' ? 'База' : KIND(t.kind).label}
                      </span>
                    </span>
                  </span>
                  <span className="text-[0.78em] opacity-80">
                    {d === null ? '' : fmtDistance(d)}
                  </span>
                </button>
              );
            })}
          </div>
          {rec.points.length > 0 && (
            <div className="px-4 pb-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
              <button
                onClick={() => {
                  rec.clear();
                  setPicker(false);
                  toast.success('След очищен');
                }}
                className="w-full py-3 text-[0.72em] uppercase tracking-[0.06em]"
                style={{ background: '#ffffff1a', color: '#fff' }}
              >
                Очистить след ({fmtDistance(rec.length)})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Navigator;