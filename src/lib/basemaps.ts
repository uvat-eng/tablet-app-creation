import L from 'leaflet';

export interface BaseDef {
  key: string;
  label: string;
  hint: string;
  max: number;
}

export const BASE_DEFS: BaseDef[] = [
  { key: 'bing', label: 'Спутник Bing', hint: 'Часто свежее по России', max: 18 },
  { key: 'sat', label: 'Спутник Esri', hint: 'Esri World Imagery', max: 19 },
  { key: 'clarity', label: 'Esri Clarity', hint: 'Детальные снимки', max: 19 },
  { key: 'topo', label: 'Топо', hint: 'Рельеф и просеки', max: 17 },
  { key: 'osm', label: 'Схема', hint: 'Дороги и посёлки', max: 19 },
];

const quadKey = (x: number, y: number, z: number) => {
  let q = '';
  for (let i = z; i > 0; i--) {
    let d = 0;
    const m = 1 << (i - 1);
    if (x & m) d += 1;
    if (y & m) d += 2;
    q += String(d);
  }
  return q;
};

const BingLayer = L.TileLayer.extend({
  getTileUrl(coords: { x: number; y: number; z: number }) {
    const q = quadKey(coords.x, coords.y, coords.z);
    const s = Math.abs(coords.x + coords.y) % 4;
    return `https://ecn.t${s}.tiles.virtualearth.net/tiles/a${q}.jpeg?g=1`;
  },
});

export const makeBaseLayer = (key: string, opts: L.TileLayerOptions = {}): L.TileLayer => {
  const def = BASE_DEFS.find((b) => b.key === key) || BASE_DEFS[0];
  const common: L.TileLayerOptions = {
    maxZoom: 19,
    maxNativeZoom: def.max,
    keepBuffer: 3,
    ...opts,
  };

  if (key === 'bing') {
    return new (BingLayer as unknown as new (url: string, o: L.TileLayerOptions) => L.TileLayer)(
      '',
      { ...common, attribution: 'Microsoft Bing' },
    );
  }

  if (key === 'clarity') {
    return L.tileLayer(
      'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { ...common, attribution: 'Esri Clarity' },
    );
  }

  if (key === 'topo') {
    return L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      ...common,
      attribution: 'OpenTopoMap',
    });
  }

  if (key === 'osm') {
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      ...common,
      attribution: 'OpenStreetMap',
    });
  }

  return L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { ...common, attribution: 'Esri' },
  );
};
