import L from 'leaflet';
import { getTile, readTilesMeta } from '@/lib/tileStore';

const KEY = 'offline-map-cfg';

export interface OfflineCfg {
  enabled: boolean;
  url: string;
  minZoom: number;
  maxZoom: number;
  label: string;
}

export const DEFAULT_OFFLINE: OfflineCfg = {
  enabled: false,
  url: '/maps/tiles/{z}/{x}/{y}.jpg',
  minZoom: 9,
  maxZoom: 18,
  label: 'Офлайн',
};

export const readOffline = (): OfflineCfg => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_OFFLINE;
    return { ...DEFAULT_OFFLINE, ...(JSON.parse(raw) as Partial<OfflineCfg>) };
  } catch {
    return DEFAULT_OFFLINE;
  }
};

export const writeOffline = (cfg: OfflineCfg) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* хранилище недоступно */
  }
};

export const probeOffline = async (): Promise<boolean> => {
  const meta = readTilesMeta();
  return !!meta?.done;
};

const EMPTY =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">' +
      '<rect width="256" height="256" fill="#eceae4"/>' +
      '<text x="128" y="130" font-size="13" fill="#a8a49a" text-anchor="middle">нет плитки</text></svg>',
  );

const StoredLayer = L.TileLayer.extend({
  createTile(coords: { z: number; x: number; y: number }, done: (e?: Error, t?: HTMLElement) => void) {
    const img = document.createElement('img');
    getTile(`${coords.z}/${coords.x}/${coords.y}.jpg`)
      .then((blob) => {
        img.src = blob ? URL.createObjectURL(blob) : EMPTY;
        img.onload = () => done(undefined, img);
        img.onerror = () => done(undefined, img);
      })
      .catch(() => {
        img.src = EMPTY;
        done(undefined, img);
      });
    return img;
  },
});

export const offlineTileLayer = (cfg: OfflineCfg) =>
  new (StoredLayer as unknown as new (url: string, opts: L.TileLayerOptions) => L.TileLayer)('', {
    minZoom: cfg.minZoom,
    maxZoom: cfg.maxZoom,
    maxNativeZoom: cfg.maxZoom,
    attribution: 'Офлайн-карта хозяйства',
  });