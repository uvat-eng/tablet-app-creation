export interface ParsedGeo {
  lines: [number, number][][];
  points: { name: string; lat: number; lng: number }[];
}

const num = (v: string | null | undefined) => Number(v || 0);

const parseGpx = (doc: Document): ParsedGeo => {
  const lines: [number, number][][] = [];
  const points: ParsedGeo['points'] = [];

  doc.querySelectorAll('trk').forEach((trk) => {
    trk.querySelectorAll('trkseg').forEach((seg) => {
      const pts: [number, number][] = [];
      seg.querySelectorAll('trkpt').forEach((p) => {
        pts.push([num(p.getAttribute('lat')), num(p.getAttribute('lon'))]);
      });
      if (pts.length > 1) lines.push(pts);
    });
  });

  doc.querySelectorAll('rte').forEach((rte) => {
    const pts: [number, number][] = [];
    rte.querySelectorAll('rtept').forEach((p) => {
      pts.push([num(p.getAttribute('lat')), num(p.getAttribute('lon'))]);
    });
    if (pts.length > 1) lines.push(pts);
  });

  doc.querySelectorAll('wpt').forEach((p) => {
    points.push({
      name: p.querySelector('name')?.textContent?.trim() || 'Точка',
      lat: num(p.getAttribute('lat')),
      lng: num(p.getAttribute('lon')),
    });
  });

  return { lines, points };
};

const coordText = (text: string): [number, number][] =>
  text
    .trim()
    .split(/\s+/)
    .map((chunk) => {
      const [lon, lat] = chunk.split(',');
      return [Number(lat), Number(lon)] as [number, number];
    })
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));

const parseKml = (doc: Document): ParsedGeo => {
  const lines: [number, number][][] = [];
  const points: ParsedGeo['points'] = [];

  doc.querySelectorAll('Placemark').forEach((pm) => {
    const name = pm.querySelector('name')?.textContent?.trim() || 'Точка';
    pm.querySelectorAll('LineString coordinates, LinearRing coordinates').forEach((c) => {
      const pts = coordText(c.textContent || '');
      if (pts.length > 1) lines.push(pts);
    });
    pm.querySelectorAll('Point coordinates').forEach((c) => {
      const pts = coordText(c.textContent || '');
      if (pts.length) points.push({ name, lat: pts[0][0], lng: pts[0][1] });
    });
  });

  return { lines, points };
};

type GeoCoord = number[] | number[][] | number[][][] | number[][][][];

const walkGeoJson = (geom: { type?: string; coordinates?: GeoCoord }, out: ParsedGeo, name: string) => {
  if (!geom?.type) return;
  const c = geom.coordinates;
  if (geom.type === 'Point') {
    const p = c as number[];
    out.points.push({ name, lat: p[1], lng: p[0] });
  } else if (geom.type === 'LineString') {
    out.lines.push((c as number[][]).map((p) => [p[1], p[0]]));
  } else if (geom.type === 'MultiLineString' || geom.type === 'Polygon') {
    (c as number[][][]).forEach((seg) => out.lines.push(seg.map((p) => [p[1], p[0]])));
  } else if (geom.type === 'MultiPolygon') {
    (c as number[][][][]).forEach((poly) =>
      poly.forEach((seg) => out.lines.push(seg.map((p) => [p[1], p[0]]))),
    );
  } else if (geom.type === 'MultiPoint') {
    (c as number[][]).forEach((p) => out.points.push({ name, lat: p[1], lng: p[0] }));
  }
};

const parseGeoJson = (raw: string): ParsedGeo => {
  const out: ParsedGeo = { lines: [], points: [] };
  const data = JSON.parse(raw);
  const feats = data.type === 'FeatureCollection' ? data.features : [data];
  feats.forEach((f: { properties?: Record<string, unknown>; geometry?: unknown; type?: string }) => {
    const name = String(f.properties?.name || f.properties?.Name || 'Точка');
    const geom = (f.geometry || f) as { type?: string; coordinates?: GeoCoord };
    walkGeoJson(geom, out, name);
  });
  return out;
};

export const parseGeoFile = async (file: File): Promise<ParsedGeo> => {
  const text = await file.text();
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.json') || lower.endsWith('.geojson')) return parseGeoJson(text);

  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Не удалось прочитать файл');

  if (lower.endsWith('.kml') || doc.querySelector('kml')) return parseKml(doc);
  return parseGpx(doc);
};

export const toGeoJson = (data: ParsedGeo) => ({
  type: 'FeatureCollection',
  features: [
    ...data.lines.map((line) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: line.map(([lat, lng]) => [lng, lat]) },
    })),
    ...data.points.map((p) => ({
      type: 'Feature',
      properties: { name: p.name },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    })),
  ],
});

export const fromGeoJson = (raw: unknown): ParsedGeo => {
  const out: ParsedGeo = { lines: [], points: [] };
  if (!raw) return out;
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const feats = (data as { features?: unknown[] }).features || [];
  (feats as { properties?: Record<string, unknown>; geometry?: unknown }[]).forEach((f) => {
    walkGeoJson(
      f.geometry as { type?: string; coordinates?: GeoCoord },
      out,
      String(f.properties?.name || 'Точка'),
    );
  });
  return out;
};
