const DB = 'hb_tiles';
const STORE = 'tiles';
const META = 'hb_tiles_meta';

export const TILES_CDN =
  'https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/bucket/maps';

let dbp: Promise<IDBDatabase> | null = null;

const open = (): Promise<IDBDatabase> => {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return dbp;
};

export const putTile = async (key: string, blob: Blob) => {
  const db = await open();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
};

export const putTiles = async (items: [string, Blob][]) => {
  const db = await open();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    const s = tx.objectStore(STORE);
    items.forEach(([k, b]) => s.put(b, k));
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
};

export const getTile = async (key: string): Promise<Blob | undefined> => {
  const db = await open();
  return new Promise((res) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => res(r.result as Blob | undefined);
    r.onerror = () => res(undefined);
  });
};

export const countTiles = async (): Promise<number> => {
  const db = await open();
  return new Promise((res) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).count();
    r.onsuccess = () => res(r.result);
    r.onerror = () => res(0);
  });
};

export const clearTiles = async () => {
  const db = await open();
  localStorage.removeItem(META);
  return new Promise<void>((res) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => res();
  });
};

export interface TilesMeta {
  done: boolean;
  total: number;
  at: number;
}

export const readTilesMeta = (): TilesMeta | null => {
  try {
    const raw = localStorage.getItem(META);
    return raw ? (JSON.parse(raw) as TilesMeta) : null;
  } catch {
    return null;
  }
};

export const writeTilesMeta = (m: TilesMeta) => {
  try {
    localStorage.setItem(META, JSON.stringify(m));
  } catch {
    /* нет места */
  }
};

const readStr = (buf: Uint8Array, off: number, len: number) => {
  let s = '';
  for (let i = 0; i < len; i++) {
    const c = buf[off + i];
    if (!c) break;
    s += String.fromCharCode(c);
  }
  return s;
};

export const unpackTar = (buf: ArrayBuffer): [string, Blob][] => {
  const view = new Uint8Array(buf);
  const out: [string, Blob][] = [];
  let off = 0;
  while (off + 512 <= view.length) {
    const name = readStr(view, off, 100).replace(/\0+$/, '');
    if (!name) {
      off += 512;
      if (off + 512 > view.length) break;
      continue;
    }
    const sizeOct = readStr(view, off + 124, 12).trim();
    const size = parseInt(sizeOct, 8) || 0;
    const type = String.fromCharCode(view[off + 156]);
    const start = off + 512;
    if (type === '0' || type === '\0') {
      out.push([name, new Blob([view.slice(start, start + size)], { type: 'image/jpeg' })]);
    }
    off = start + Math.ceil(size / 512) * 512;
  }
  return out;
};

export interface Progress {
  loaded: number;
  total: number;
  part: number;
  parts: number;
}

export const downloadTiles = async (
  onProgress: (p: Progress) => void,
  signal?: AbortSignal,
): Promise<number> => {
  const man = await fetch(`${TILES_CDN}/manifest.json`, { cache: 'no-store', signal }).then((r) =>
    r.json(),
  );
  const parts: { name: string; size: number }[] = man.parts;
  const total = parts.reduce((s, p) => s + p.size, 0);
  let loaded = 0;
  let saved = 0;

  for (let i = 0; i < parts.length; i++) {
    const res = await fetch(`${TILES_CDN}/${parts[i].name}`, { signal });
    if (!res.ok) throw new Error('Не удалось скачать карты');
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        onProgress({ loaded, total, part: i + 1, parts: parts.length });
      }
    }
    const size = chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Uint8Array(size);
    let o = 0;
    chunks.forEach((c) => {
      merged.set(c, o);
      o += c.length;
    });
    const tiles = unpackTar(merged.buffer);
    for (let j = 0; j < tiles.length; j += 500) {
      await putTiles(tiles.slice(j, j + 500));
    }
    saved += tiles.length;
  }

  writeTilesMeta({ done: true, total: saved, at: Date.now() });
  return saved;
};
