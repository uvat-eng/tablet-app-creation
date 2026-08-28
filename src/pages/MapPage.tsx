import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import { LOCATION_KINDS, KIND, STATUSES } from '@/lib/locationKinds';
import { parseGeoFile, toGeoJson, fromGeoJson } from '@/lib/geoParse';
import useGeoLocate from '@/lib/useGeoLocate';
import { readOffline, probeOffline, offlineTileLayer, OfflineCfg } from '@/lib/offlineMap';
import { BASE_DEFS, makeBaseLayer } from '@/lib/basemaps';
import OfflineMapDownload from '@/components/app/OfflineMapDownload';
import { toast } from 'sonner';

const COLORS: Record<string, string> = {
  tower: '#ff5a1f',
  feeder: '#f4c20d',
  salt: '#8e6bd4',
  clearing: '#00b8d4',
  crops: '#00c853',
  enclosure: '#e91e63',
  ground: '#607d8b',
};

const pinIcon = (kind: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${
      COLORS[kind] || '#607d8b'
    };border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const MapPage = () => {
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const tracksRef = useRef<L.LayerGroup | null>(null);
  const baseRef = useRef<L.TileLayer | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Row[]>([]);
  const [tracks, setTracks] = useState<Row[]>([]);
  const [base, setBase] = useState('bing');
  const [active, setActive] = useState<string[]>(LOCATION_KINDS.map((k) => k.key));
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Row | null>(null);
  const [uploading, setUploading] = useState(false);

  const [offline] = useState<OfflineCfg>(readOffline);
  const [offlineReady, setOfflineReady] = useState(false);

  const geo = useGeoLocate(mapRef);

  useEffect(() => {
    probeOffline().then(setOfflineReady);
  }, [offline]);

  const load = useCallback(async () => {
    const [locs, layers] = await Promise.all([listRows('locations'), listRows('map_layers')]);
    setRows(locs);
    setTracks(layers);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const points = useMemo(
    () =>
      rows.filter(
        (r) => Number(r.lat) && Number(r.lng) && active.includes(String(r.kind || 'ground')),
      ),
    [rows, active],
  );

  useEffect(() => {
    if (mapRef.current || !boxRef.current) return;
    const map = L.map(boxRef.current, {
      center: [56.55, 68.65],
      zoom: 10,
      zoomControl: true,
      scrollWheelZoom: true,
    });
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    tracksRef.current = L.layerGroup().addTo(map);
    L.control.scale({ imperial: false }).addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (baseRef.current) map.removeLayer(baseRef.current);

    if (base === 'offline') {
      baseRef.current = offlineTileLayer(offline).addTo(map);
      baseRef.current.bringToBack();
      return;
    }

    baseRef.current = makeBaseLayer(base).addTo(map);
    baseRef.current.bringToBack();
  }, [base, offline]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) return;
    group.clearLayers();

    points.forEach((r) => {
      const kind = String(r.kind || 'ground');
      const k = KIND(kind);
      const marker = L.marker([Number(r.lat), Number(r.lng)], { icon: pinIcon(kind) });
      marker.bindPopup(
        `<div style="font-family:inherit;font-size:13px;min-width:170px">
          <b>${String(r.name)}</b><br/>
          <span style="color:#6d6d6d">${k.label}</span><br/>
          <span style="font-size:11px">${Number(r.lat).toFixed(5)}, ${Number(r.lng).toFixed(5)}</span><br/>
          <a href="/locations/${kind}/${r.id}" style="color:#0a7">Открыть карточку →</a>
        </div>`,
      );
      marker.on('dblclick', () => navigate(`/locations/${kind}/${r.id}`));
      group.addLayer(marker);
    });

    if (points.length) {
      const bounds = L.latLngBounds(points.map((r) => [Number(r.lat), Number(r.lng)]));
      map.fitBounds(bounds.pad(0.25), { maxZoom: 14 });
    }
  }, [points, navigate]);

  useEffect(() => {
    const group = tracksRef.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();
    tracks
      .filter((t) => t.visible !== false)
      .forEach((t) => {
        const data = fromGeoJson(t.geojson);
        data.lines.forEach((line) => {
          L.polyline(line, {
            color: String(t.color || '#ff5a1f'),
            weight: 3,
            opacity: 0.9,
          }).addTo(group);
        });
        data.points.forEach((p) => {
          L.circleMarker([p.lat, p.lng], {
            radius: 4,
            color: String(t.color || '#ff5a1f'),
            fillOpacity: 1,
          })
            .bindPopup(p.name)
            .addTo(group);
        });
      });
  }, [tracks]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onClick = (e: L.LeafletMouseEvent) => {
      if (!adding) return;
      setDraft({
        kind: 'tower',
        name: '',
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
        coords: `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`,
        qty: 1,
        unit: 'шт',
        status: 'ok',
      } as Row);
      setOpen(true);
      setAdding(false);
    };
    map.on('click', onClick);
    map.getContainer().style.cursor = adding ? 'crosshair' : '';
    return () => {
      map.off('click', onClick);
    };
  }, [adding]);

  const fields: Field[] = [
    { key: 'name', label: 'Название' },
    {
      key: 'kind',
      label: 'Направление',
      type: 'select',
      options: LOCATION_KINDS.map((k) => ({ value: k.key, label: k.label })),
    },
    { key: 'coords', label: 'GPS координаты' },
    { key: 'note', label: 'Краткое описание', type: 'textarea' },
    { key: 'status', label: 'Состояние', type: 'select', options: STATUSES },
  ];

  const save = async (values: Row) => {
    const parts = String(values.coords || '').split(',');
    const lat = Number(parts[0]) || Number(draft?.lat) || 0;
    const lng = Number(parts[1]) || Number(draft?.lng) || 0;
    const payload: Row = {
      ...values,
      lat,
      lng,
      coords: `${lat}, ${lng}`,
      kind: String(values.kind || 'tower'),
      qty: Number(values.qty || 1),
      status: String(values.status || 'ok'),
    };
    if (draft?.id) {
      await updateRow('locations', { ...payload, id: draft.id });
      toast.success('Точка обновлена');
    } else {
      await createRow('locations', payload);
      toast.success('Точка добавлена на карту');
    }
    setOpen(false);
    setDraft(null);
    load();
  };

  const importFile = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const data = await parseGeoFile(file);
        if (!data.lines.length && !data.points.length) {
          toast.error(`${file.name}: не найдено треков и точек`);
          continue;
        }
        await createRow('map_layers', {
          name: file.name.replace(/\.[^.]+$/, ''),
          kind: data.lines.length ? 'track' : 'points',
          color: '#ff5a1f',
          geojson: toGeoJson(data) as never,
          visible: true,
        });
        toast.success(
          `${file.name}: ${data.lines.length} треков, ${data.points.length} точек`,
        );
      }
      load();
    } catch {
      toast.error('Не удалось прочитать файл');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggleKind = (key: string) =>
    setActive((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const noCoords = rows.filter((r) => !Number(r.lat) || !Number(r.lng)).length;

  return (
    <Layout
      index="Раздел / Карта"
      title="Карта хозяйства"
      lede="Спутниковые снимки, границы угодий и все локации точками."
      action={
        <span className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".gpx,.kml,.json,.geojson"
            multiple
            className="hidden"
            onChange={(e) => importFile(e.target.files)}
          />
          <button
            className="h-cta-ghost"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Читаем…' : 'Загрузить треки'}
          </button>
          <button
            className={adding ? 'h-cta' : 'h-cta-ghost'}
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? 'Кликните по карте' : 'Добавить точку'}
          </button>
        </span>
      }
    >
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

      <div className="relative">
        <div
          ref={boxRef}
          className="border border-[#e2e2df]"
          style={{ height: '620px', width: '100%' }}
        />

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
        Точек на карте: {points.length}
        {noCoords > 0 && ` · без координат: ${noCoords}`} · двойной клик по метке открывает карточку
      </div>

      {tracks.length > 0 && (
        <div className="mt-8">
          <div className="h-label mb-3">Загруженные треки и границы</div>
          <div className="border border-[#e2e2df] overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="bg-[var(--hero-surface)]">
                  <th className="h-label text-left px-4 py-2 font-normal">Название</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[120px]">Тип</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Цвет</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Показать</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[100px]" />
                </tr>
              </thead>
              <tbody>
                {tracks.map((t) => (
                  <tr key={String(t.id)} className="border-t border-[#e2e2df]">
                    <td className="px-4 py-2 text-[0.72em]">{String(t.name)}</td>
                    <td className="px-4 py-2 text-[0.68em]">
                      {t.kind === 'track' ? 'Трек / граница' : 'Точки'}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="color"
                        value={String(t.color || '#ff5a1f')}
                        className="w-10 h-6 border border-[#e2e2df] bg-white"
                        onChange={async (e) => {
                          await updateRow('map_layers', { id: t.id, color: e.target.value });
                          load();
                        }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-black"
                        checked={t.visible !== false}
                        onChange={async (e) => {
                          await updateRow('map_layers', { id: t.id, visible: e.target.checked });
                          load();
                        }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        className="h-label underline"
                        onClick={async () => {
                          await removeRow('map_layers', Number(t.id));
                          toast.success('Слой убран');
                          load();
                        }}
                      >
                        Убрать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8 border border-[#e2e2df] p-5">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="Info" size={15} fallback="Circle" />
          <span className="h-label">Как загрузить свои данные</span>
        </div>
        <div className="h-mono-cap normal-case text-[var(--hero-muted)] leading-relaxed">
          Кнопка «Загрузить треки» принимает файлы GPX, KML и GeoJSON — это форматы, которые
          отдают все навигаторы и приложения вроде Locus Map, OsmAnd, Garmin. Границы хозяйства,
          маршруты и путевые точки лягут поверх спутника. Файлы SQLITEDB — это офлайн-кэш
          спутниковых тайлов, картинки без координат объектов; их место занимает встроенный
          спутниковый слой, а точки и треки экспортируйте из того же приложения в GPX или KML.
        </div>
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title="Новая точка на карте"
        fields={fields}
        initial={draft}
        onSubmit={save}
      />
    </Layout>
  );
};

export default MapPage;