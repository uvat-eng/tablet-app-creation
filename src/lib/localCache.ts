import { Row } from '@/lib/api';

const PREFIX = 'hb_cache_';
const META = 'hb_cache_meta';
const QUEUE = 'hb_queue';

export interface CacheMeta {
  [key: string]: number;
}

const readMeta = (): CacheMeta => {
  try {
    return JSON.parse(localStorage.getItem(META) || '{}');
  } catch {
    return {};
  }
};

const writeMeta = (m: CacheMeta) => {
  try {
    localStorage.setItem(META, JSON.stringify(m));
  } catch {
    /* переполнено */
  }
};

export const cacheKey = (table: string, suffix = '') => PREFIX + table + (suffix ? ':' + suffix : '');

export const saveCache = (key: string, rows: Row[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
    const m = readMeta();
    m[key] = Date.now();
    writeMeta(m);
  } catch {
    dropOldest();
    try {
      localStorage.setItem(key, JSON.stringify(rows));
    } catch {
      /* всё равно не влезло */
    }
  }
};

export const readCache = (key: string): Row[] | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Row[]) : null;
  } catch {
    return null;
  }
};

export const cacheAge = (key: string): number | null => {
  const t = readMeta()[key];
  return t ? Date.now() - t : null;
};

const dropOldest = () => {
  const m = readMeta();
  const sorted = Object.entries(m).sort((a, b) => a[1] - b[1]);
  const half = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 3)));
  half.forEach(([k]) => {
    localStorage.removeItem(k);
    delete m[k];
  });
  writeMeta(m);
};

export const cacheStats = () => {
  const m = readMeta();
  let bytes = 0;
  let tables = 0;
  Object.keys(m).forEach((k) => {
    const v = localStorage.getItem(k);
    if (v) {
      bytes += v.length * 2;
      tables += 1;
    }
  });
  const times = Object.values(m);
  return {
    tables,
    bytes,
    lastSync: times.length ? Math.max(...times) : null,
  };
};

export interface QueueItem {
  id: string;
  table: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: Row;
  at: number;
}

export const readQueue = (): QueueItem[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE) || '[]');
  } catch {
    return [];
  }
};

export const writeQueue = (items: QueueItem[]) => {
  try {
    localStorage.setItem(QUEUE, JSON.stringify(items));
  } catch {
    /* переполнено */
  }
};

export const pushQueue = (table: string, method: QueueItem['method'], body: Row) => {
  const items = readQueue();
  items.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    table,
    method,
    body,
    at: Date.now(),
  });
  writeQueue(items);
  return items.length;
};

export const clearAll = () => {
  const m = readMeta();
  Object.keys(m).forEach((k) => localStorage.removeItem(k));
  localStorage.removeItem(META);
};
