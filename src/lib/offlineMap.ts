import L from 'leaflet';

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
  minZoom: 8,
  maxZoom: 16,
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

export const probeOffline = async (cfg: OfflineCfg): Promise<boolean> => {
  const probe = cfg.url
    .replace('{z}', String(cfg.minZoom))
    .replace('{x}', '0')
    .replace('{y}', '0')
    .replace('{s}', 'a');
  const base = probe.split('/').slice(0, -3).join('/') || '/maps';
  try {
    const r = await fetch(base + '/meta.json', { cache: 'no-store' });
    return r.ok;
  } catch {
    return false;
  }
};

export const offlineTileLayer = (cfg: OfflineCfg) =>
  L.tileLayer(cfg.url, {
    minZoom: cfg.minZoom,
    maxZoom: cfg.maxZoom,
    maxNativeZoom: cfg.maxZoom,
    attribution: 'Офлайн-карта хозяйства',
    errorTileUrl:
      'data:image/svg+xml;base64,' +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">' +
          '<rect width="256" height="256" fill="#eceae4"/>' +
          '<text x="128" y="130" font-size="13" fill="#a8a49a" text-anchor="middle">нет плитки</text></svg>',
      ),
  });
