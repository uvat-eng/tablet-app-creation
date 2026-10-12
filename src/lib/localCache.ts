import { Row } from '@/lib/api';
import { nativeGet, nativeSet, restoreFromNative } from '@/lib/nativeStore';

const DB_NAME = 'hb_offline';
const STORE = 'kv';
const PREFIX = 'hb_cache_';
const QUEUE = 'hb_queue';
const LAST = 'hb_last_sync';
const LEGACY_META = 'hb_cache_meta';
const NATIVE_QUEUE = 'hb_queue_backup';

interface Entry {
  rows: Row[];
  at: number;
  q?: string;
  size?: number;
}

export interface QueueItem {
  id: string;
  table: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: Row;
  at: number;
  localId?: number;
  mine?: boolean;
}

const mem = new Map<string, Entry>();
let queue: QueueItem[] = [];
let lastSync: number | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;

const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
};

const lsSet = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* переполнено */
  }
};

const run = async (fn: (s: IDBObjectStore) => void, fallback: () => void) => {
  const db = await openDb();
  if (!db) {
    fallback();
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
};

const put = (key: string, value: unknown) => run((s) => s.put(value, key), () => lsSet(key, value));

const del = (key: string) => run((s) => s.delete(key), () => localStorage.removeItem(key));

const readAll = (db: IDBDatabase) =>
  new Promise<[string, unknown][]>((resolve) => {
    const out: [string, unknown][] = [];
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) {
          resolve(out);
          return;
        }
        out.push([String(cur.key), cur.value]);
        cur.continue();
      };
      req.onerror = () => resolve(out);
    } catch {
      resolve(out);
    }
  });

const toEntry = (v: unknown, at = 0): Entry | null => {
  if (Array.isArray(v)) return { rows: v as Row[], at };
  if (v && typeof v === 'object' && Array.isArray((v as Entry).rows)) return v as Entry;
  return null;
};

const readLegacy = () => {
  let meta: Record<string, number> = {};
  try {
    meta = JSON.parse(localStorage.getItem(LEGACY_META) || '{}');
  } catch {
    meta = {};
  }
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX) && k !== LEGACY_META) keys.push(k);
  }
  const entries: [string, Entry][] = [];
  keys.forEach((k) => {
    try {
      const e = toEntry(JSON.parse(localStorage.getItem(k) || 'null'), meta[k] || 0);
      if (e) entries.push([k, e]);
    } catch {
      /* битая запись */
    }
  });
  let legacyQueue: QueueItem[] = [];
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE) || '[]');
    legacyQueue = Array.isArray(raw) ? raw : [];
  } catch {
    legacyQueue = [];
  }
  let legacyLast: number | null = null;
  try {
    legacyLast = Number(JSON.parse(localStorage.getItem(LAST) || '0')) || null;
  } catch {
    legacyLast = null;
  }
  return { keys, entries, legacyQueue, legacyLast };
};

let ready: Promise<void> | null = null;

export const initCache = () => {
  if (ready) return ready;
  ready = (async () => {
    await restoreFromNative();
    const db = await openDb();
    if (db) {
      const all = await readAll(db);
      all.forEach(([k, v]) => {
        if (k === QUEUE && Array.isArray(v)) queue = v as QueueItem[];
        else if (k === LAST) lastSync = Number(v) || null;
        else if (k.startsWith(PREFIX)) {
          const e = toEntry(v);
          if (e) mem.set(k, e);
        }
      });
    }

    const { keys, entries, legacyQueue, legacyLast } = readLegacy();
    entries.forEach(([k, e]) => {
      if (!mem.has(k)) mem.set(k, e);
    });
    if (legacyQueue.length) {
      const known = new Set(queue.map((q) => q.id));
      queue = [...legacyQueue.filter((q) => !known.has(q.id)), ...queue];
    }
    if (!lastSync && legacyLast) lastSync = legacyLast;

    try {
      const raw = await nativeGet(NATIVE_QUEUE);
      const saved = raw ? (JSON.parse(raw) as QueueItem[]) : [];
      if (Array.isArray(saved) && saved.length) {
        const known = new Set(queue.map((q) => q.id));
        const missing = saved.filter((q) => !known.has(q.id));
        if (missing.length) queue = [...missing, ...queue].sort((a, b) => a.at - b.at);
      }
    } catch {
      /* копии нет */
    }

    if (db) {
      for (const [k] of entries) await put(k, mem.get(k));
      if (legacyQueue.length) await put(QUEUE, queue);
      keys.forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem(LEGACY_META);
      localStorage.removeItem(QUEUE);
      localStorage.removeItem(LAST);
    }

    try {
      await navigator.storage?.persist?.();
    } catch {
      /* браузер не разрешил */
    }
  })();
  return ready;
};

export const cacheKey = (table: string, suffix = '') =>
  PREFIX + table + (suffix ? ':' + suffix : '');

export const saveCache = (key: string, rows: Row[], q?: string) => {
  let size = 0;
  try {
    size = JSON.stringify(rows).length;
  } catch {
    size = 0;
  }
  const e: Entry = { rows, at: Date.now(), q: q ?? mem.get(key)?.q, size };
  mem.set(key, e);
  put(key, e);
};

const keepAge = (key: string, rows: Row[]) => {
  const old = mem.get(key);
  const e: Entry = { rows, at: old?.at || 0, q: old?.q, size: old?.size };
  mem.set(key, e);
  put(key, e);
};

export const readCache = (key: string): Row[] | null => mem.get(key)?.rows ?? null;

export const cacheAge = (key: string): number | null => {
  const e = mem.get(key);
  return e && e.at ? Date.now() - e.at : null;
};

export const markAllStale = () => {
  mem.forEach((e) => {
    e.at = 0;
  });
};

export const cachedQueries = (): { key: string; q: string; at: number }[] =>
  [...mem.entries()]
    .filter(([, e]) => Boolean(e.q))
    .map(([key, e]) => ({ key, q: String(e.q), at: e.at }));

const tableKeys = (table: string) =>
  [...mem.keys()].filter((k) => k === PREFIX + table || k.startsWith(PREFIX + table + ':'));

const suffixOf = (key: string) => {
  const i = key.indexOf(':');
  return i < 0 ? '' : key.slice(i + 1);
};

const fitsList = (suffix: string, row: Row) => {
  if (suffix.includes('arch')) return false;
  const b = suffix.match(/b(-?\d+)/);
  if (b && String(row.booking_id) !== b[1]) return false;
  const p = suffix.match(/p(-?\d+)/);
  if (p && String(row.plan_id) !== p[1]) return false;
  if (/rcp|kp|gn/.test(suffix)) return false;
  return true;
};

export const patchRow = (table: string, row: Row, isNew: boolean) => {
  const id = row.id;
  tableKeys(table).forEach((key) => {
    const rows = mem.get(key)?.rows || [];
    const idx = rows.findIndex((r) => String(r.id) === String(id));
    if (idx >= 0) {
      const next = rows.slice();
      next[idx] = { ...rows[idx], ...row };
      keepAge(key, next);
    } else if (isNew && fitsList(suffixOf(key), row)) {
      keepAge(key, [row, ...rows]);
    }
  });
};

export const dropRow = (table: string, id: number | string) => {
  tableKeys(table).forEach((key) => {
    const rows = mem.get(key)?.rows || [];
    if (rows.some((r) => String(r.id) === String(id))) {
      keepAge(key, rows.filter((r) => String(r.id) !== String(id)));
    }
  });
};

export const swapId = (localId: number, real: Row) => {
  mem.forEach((e, key) => {
    let changed = false;
    const rows = e.rows.map((r) => {
      let next = r;
      if (String(r.id) === String(localId)) {
        next = { ...real };
        changed = true;
      }
      Object.keys(next).forEach((f) => {
        if (f !== 'id' && f.endsWith('_id') && Number(next[f]) === localId) {
          next = { ...next, [f]: real.id };
          changed = true;
        }
      });
      return next;
    });
    if (changed) keepAge(key, rows);
  });
};

export const setLastSync = (t: number) => {
  lastSync = t;
  put(LAST, t);
};

export const cacheStats = () => {
  let bytes = 0;
  let newest = 0;
  mem.forEach((e) => {
    bytes += (e.size || 0) * 2;
    if (e.at > newest) newest = e.at;
  });
  return {
    tables: mem.size,
    bytes,
    lastSync: lastSync || newest || null,
  };
};

export const readQueue = (): QueueItem[] => queue;

export const writeQueue = (items: QueueItem[]) => {
  queue = items;
  nativeSet(NATIVE_QUEUE, items.length ? JSON.stringify(items) : null);
  return put(QUEUE, items);
};

export const pushQueue = (
  table: string,
  method: QueueItem['method'],
  body: Row,
  extra: { localId?: number; mine?: boolean } = {},
) => {
  const items = [
    ...queue,
    {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      table,
      method,
      body,
      at: Date.now(),
      ...extra,
    },
  ];
  writeQueue(items);
  return items.length;
};

export const clearAll = () => {
  [...mem.keys()].forEach((k) => del(k));
  mem.clear();
};

export const clearEverything = () => {
  clearAll();
  writeQueue([]);
  lastSync = null;
  del(LAST);
};
