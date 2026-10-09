import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Layout from '@/components/app/Layout';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import {
  LOCATION_KINDS,
  KIND,
  STATUSES,
  CROP_STATUSES,
  parseCoords,
} from '@/lib/locationKinds';
import { parseGeoFile, toGeoJson, fromGeoJson } from '@/lib/geoParse';
import useGeoLocate from '@/lib/useGeoLocate';
import { readOffline, probeOffline, offlineTileLayer, OfflineCfg } from '@/lib/offlineMap';
import { makeBaseLayer } from '@/lib/basemaps';
import { HOME_CENTER, HOME_ZOOM, BASE_POINT, BASE_LABEL } from '@/lib/homeArea';
import Navigator from '@/components/app/Navigator';
import MapControls from '@/components/map/MapControls';
import MapCanvas from '@/components/map/MapCanvas';
import TracksTable from '@/components/map/TracksTable';
import { pinIcon } from '@/components/map/mapStyles';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { canEditMap, canSeeObjects } from '@/lib/permissions';
import useDataRefresh from '@/hooks/useDataRefresh';

const MapPage = () => {
  const { user } = useAuth();
  const mayEdit = canEditMap(user);
  const seeObjects = canSeeObjects(user);
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
  const [navOpen, setNavOpen] = useState(false);

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


  useDataRefresh(load);

  const points = useMemo(
    () =>
      seeObjects
        ? rows.filter(
            (r) => Number(r.lat) && Number(r.lng) && active.includes(String(r.kind || 'ground')),
          )
        : [],
    [rows, active, seeObjects],
  );

  useEffect(() => {
    if (mapRef.current || !boxRef.current) return;
    const map = L.map(boxRef.current, {
      center: HOME_CENTER,
      zoom: HOME_ZOOM,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false,
    });
    L.control
      .attribution({ prefix: 'Малышенское', position: 'bottomright' })
      .addTo(map);
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

    if (!seeObjects) {
      const base = L.marker(BASE_POINT, { icon: pinIcon('base') });
      base.bindPopup(
        `<div style="font-family:inherit;font-size:13px;min-width:150px">
          <b>${BASE_LABEL}</b><br/>
          <span style="font-size:11px">${BASE_POINT[0].toFixed(5)}, ${BASE_POINT[1].toFixed(5)}</span>
        </div>`,
      );
      base.bindTooltip(BASE_LABEL, { direction: 'top', offset: [0, -12] });
      group.addLayer(base);
    }

    if (points.length) {
      const bounds = L.latLngBounds(points.map((r) => [Number(r.lat), Number(r.lng)]));
      map.fitBounds(bounds.pad(0.25), { maxZoom: 14 });
    }
  }, [points, navigate, seeObjects]);

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
      if (!adding || !mayEdit) return;
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
    map.getContainer().style.cursor = adding && mayEdit ? 'crosshair' : '';
    return () => {
      map.off('click', onClick);
    };
  }, [adding, mayEdit]);

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
    {
      key: 'status',
      label: 'Состояние',
      type: 'select',
      options: [...STATUSES, ...CROP_STATUSES],
    },
  ];

  const save = async (values: Row) => {
    const parsed = parseCoords(values.coords);
    const lat = parsed.lat || Number(draft?.lat) || 0;
    const lng = parsed.lng || Number(draft?.lng) || 0;
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
      lede={
        seeObjects
          ? 'Спутниковые снимки, границы угодий и все локации точками.'
          : 'Спутниковые снимки, границы угодий и база хозяйства.'
      }
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
          {mayEdit && (
            <>
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
            </>
          )}
        </span>
      }
    >
      <MapControls
        base={base}
        setBase={setBase}
        offline={offline}
        offlineReady={offlineReady}
        setOfflineReady={setOfflineReady}
        rows={rows}
        active={active}
        toggleKind={toggleKind}
        onOpenNav={() => setNavOpen(true)}
        seeObjects={seeObjects}
      />

      <MapCanvas
        boxRef={boxRef}
        mapRef={mapRef}
        geo={geo}
        mayEdit={mayEdit}
        setDraft={setDraft}
        setOpen={setOpen}
        pointsCount={points.length}
        noCoords={noCoords}
        seeObjects={seeObjects}
      />

      {seeObjects && <TracksTable tracks={tracks} mayEdit={mayEdit} load={load} />}

      {navOpen && (
        <Navigator
          points={rows}
          offlineReady={offlineReady}
          mayEdit={mayEdit}
          onSaved={load}
          onClose={() => setNavOpen(false)}
        />
      )}

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