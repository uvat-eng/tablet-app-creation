import { toast } from 'sonner';
import {
  cacheKey,
  saveCache,
  readCache,
  cacheAge,
  pushQueue,
  readQueue,
  writeQueue,
  initCache,
  patchRow,
  dropRow,
  swapId,
  cachedQueries,
  setLastSync,
  markAllStale,
  QueueItem,
} from '@/lib/localCache';

const CRM_URL = 'https://functions.poehali.dev/85ee97e6-1ee1-4333-be9f-698f0c374677';
export const AUTH_URL = 'https://functions.poehali.dev/de14562b-724c-4ed9-80c1-c0d1787d0889';
const UPLOAD_URL = 'https://functions.poehali.dev/ee5bce4e-47ca-4200-ae73-937c1cf34339';
const DOCS_URL = 'https://functions.poehali.dev/00cd6749-c34b-44dc-8de2-a3cbeed57785';
const ACTPDF_URL = 'https://functions.poehali.dev/6c2eba09-1b6f-4eb1-9c97-6367dabf9ee0';

export type Row = Record<string, string | number | boolean | null>;

export const getToken = () => localStorage.getItem('hb_token') || '';

let online = true;
const listeners = new Set<(v: boolean) => void>();

export const isOnline = () => online;

export const onConnection = (fn: (v: boolean) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const setOnline = (v: boolean) => {
  if (online === v) return;
  online = v;
  listeners.forEach((fn) => fn(v));
};

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Auth-Token': getToken(),
});

const FRESH_MS = 60_000;
const NET_TIMEOUT = 15000;
const QUICK_TIMEOUT = 6000;

const timedFetch = async (url: string, init: RequestInit = {}, ms = NET_TIMEOUT) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
};

const fetchList = async (key: string, q: string, ms = NET_TIMEOUT): Promise<Row[]> => {
  let res: Response;
  try {
    res = await timedFetch(`${CRM_URL}?${q}`, { headers: authHeaders() }, ms);
  } catch (e) {
    setOnline(false);
    throw e;
  }
  if (res.status === 401 || res.status === 403) {
    setOnline(true);
    const err = new Error('Недостаточно прав');
    err.name = 'Forbidden';
    throw err;
  }
  if (!res.ok) {
    setOnline(false);
    throw new Error('server ' + res.status);
  }
  const data = await res.json();
  const items: Row[] = data.items || [];
  saveCache(key, items, q);
  setOnline(true);
  return items;
};

const dataListeners = new Set<(table: string) => void>();

export const onDataChange = (fn: (table: string) => void) => {
  dataListeners.add(fn);
  return () => {
    dataListeners.delete(fn);
  };
};

const emitData = (table: string) => {
  dataListeners.forEach((fn) => fn(table));
};

const withQueue = (table: string, suffix: string, rows: Row[]): Row[] => {
  const pending = readQueue().filter((it) => it.table === table);
  if (!pending.length) return rows;
  let out = rows.slice();
  pending.forEach((it) => {
    const id = it.method === 'POST' ? it.localId : it.body.id;
    const idx = out.findIndex((r) => String(r.id) === String(id));
    if (it.method === 'DELETE') {
      if (idx >= 0) out = out.filter((_, i) => i !== idx);
      return;
    }
    const row: Row = { ...it.body, id: id ?? null, _pending: true };
    if (idx >= 0) out[idx] = { ...out[idx], ...row };
    else if (it.method === 'POST' && !suffix.includes('arch') && !/rcp|kp|gn/.test(suffix)) {
      const b = suffix.match(/b(-?\d+)/);
      if (!b || String(row.booking_id) === b[1]) out = [row, ...out];
    }
  });
  return out;
};

export const listRows = async (
  table: string,
  opts: {
    archived?: boolean;
    bookingId?: number;
    mine?: boolean;
    recipients?: boolean;
    keepers?: boolean;
    guns?: boolean;
    planId?: number;
  } = {},
): Promise<Row[]> => {
  const q = new URLSearchParams({ table });
  if (opts.archived) q.set('archived', '1');
  if (opts.bookingId) q.set('booking_id', String(opts.bookingId));
  if (opts.mine) q.set('mine', '1');
  if (opts.recipients) q.set('recipients', '1');
  if (opts.keepers) q.set('keepers', '1');
  if (opts.guns) q.set('guns', '1');
  if (opts.planId) q.set('plan_id', String(opts.planId));

  const suffix = `${opts.archived ? 'arch' : ''}${opts.bookingId ? 'b' + opts.bookingId : ''}${
    opts.mine ? 'mine' : ''
  }${opts.recipients ? 'rcp' : ''}${opts.keepers ? 'kp' : ''}${opts.guns ? 'gn' : ''}${
    opts.planId ? 'p' + opts.planId : ''
  }`;
  const key = cacheKey(table, suffix);
  await initCache();
  const cached = readCache(key);

  if (cached && (!online || (cacheAge(key) ?? Infinity) < FRESH_MS)) {
    return withQueue(table, suffix, cached);
  }

  try {
    const items = await fetchList(key, q.toString(), cached ? QUICK_TIMEOUT : NET_TIMEOUT);
    return withQueue(table, suffix, items);
  } catch (e) {
    if (e instanceof Error && e.name === 'Forbidden') throw e;
    if (cached) return withQueue(table, suffix, cached);
    throw new Error('Нет связи с сервером и нет сохранённой копии');
  }
};

export interface LogEntry {
  id: number;
  staff_id: number | null;
  staff_name: string;
  action: 'create' | 'update' | 'archive' | 'delete';
  table_name: string;
  row_id: number | null;
  title: string | null;
  changes: Record<string, { was: unknown; now: unknown }> | null;
  app: string;
  ip: string | null;
  created_at: string;
}

export const listLog = async (
  opts: { staffId?: number; table?: string; action?: string; limit?: number } = {},
): Promise<LogEntry[]> => {
  const q = new URLSearchParams({ table: 'activity_log' });
  if (opts.staffId) q.set('staff_id', String(opts.staffId));
  if (opts.table) q.set('table_name', opts.table);
  if (opts.action) q.set('action', opts.action);
  q.set('limit', String(opts.limit || 300));
  const res = await fetch(`${CRM_URL}?${q}`, { headers: authHeaders() });
  const data = await res.json();
  return data.items || [];
};

export class ConflictError extends Error {
  conflict: Row;

  constructor(conflict: Row) {
    super('conflict');
    this.conflict = conflict;
  }
}

type Method = 'POST' | 'PUT' | 'DELETE';

const isLocalId = (id: unknown) => Number(id) < 0;

let localSeq = 0;
const newLocalId = () => {
  localSeq = (localSeq + 1) % 1000;
  return -(Date.now() * 1000 + localSeq);
};

const ID_MAP = 'hb_id_map';

const readIdMap = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(ID_MAP) || '{}');
  } catch {
    return {};
  }
};

const rememberId = (localId: number, realId: number) => {
  const m = readIdMap();
  m[String(localId)] = realId;
  const keys = Object.keys(m);
  if (keys.length > 500) keys.slice(0, keys.length - 500).forEach((k) => delete m[k]);
  try {
    localStorage.setItem(ID_MAP, JSON.stringify(m));
  } catch {
    /* переполнено */
  }
};

const realIds = (body: Row): Row => {
  const m = readIdMap();
  let out = body;
  Object.keys(body).forEach((f) => {
    if ((f === 'id' || f.endsWith('_id')) && isLocalId(body[f])) {
      const real = m[String(body[f])];
      if (real) out = { ...out, [f]: real };
    }
  });
  return out;
};

const queueLocal = (table: string, method: Method, body: Row, mine: boolean): Row => {
  const items = readQueue();

  if (method === 'POST') {
    const localId = newLocalId();
    pushQueue(table, 'POST', { ...body, id: null }, { localId, mine });
    const row: Row = { ...body, id: localId, _pending: true };
    patchRow(table, row, true);
    emitData(table);
    return row;
  }

  const id = body.id;
  if (isLocalId(id)) {
    const idx = items.findIndex((it) => it.method === 'POST' && it.localId === Number(id));
    if (idx >= 0) {
      const next = items.slice();
      if (method === 'DELETE') next.splice(idx, 1);
      else next[idx] = { ...next[idx], body: { ...next[idx].body, ...body, id: null } };
      writeQueue(next);
      if (method === 'DELETE') dropRow(table, Number(id));
      else patchRow(table, { ...body, _pending: true }, false);
      emitData(table);
      return { ...body, _pending: true };
    }
  }

  if (method === 'PUT') {
    const idx = items.findIndex(
      (it) => it.method === 'PUT' && it.table === table && String(it.body.id) === String(id),
    );
    if (idx >= 0) {
      const next = items.slice();
      next[idx] = { ...next[idx], body: { ...next[idx].body, ...body }, mine: mine || next[idx].mine };
      writeQueue(next);
    } else {
      pushQueue(table, 'PUT', body, { mine });
    }
    patchRow(table, { ...body, _pending: true }, false);
  } else {
    pushQueue(table, 'DELETE', { id: id ?? null });
    dropRow(table, String(id));
  }
  emitData(table);
  return { ...body, _pending: true };
};

class NetError extends Error {
  constructor() {
    super('net');
    this.name = 'NetError';
  }
}

const sendOnce = async (table: string, method: Method, raw: Row, mine: boolean) => {
  const body = method === 'DELETE' ? raw : await resolvePhotos(raw);
  const url =
    method === 'DELETE'
      ? `${CRM_URL}?table=${table}&id=${body.id}`
      : `${CRM_URL}?table=${table}${mine ? '&mine=1' : ''}`;
  let res: Response;
  try {
    res = await timedFetch(url, {
      method,
      headers: authHeaders(),
      body: method === 'DELETE' ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new NetError();
  }
  if (res.status >= 500) throw new NetError();
  const data = await res.json().catch(() => ({}));
  if (res.status === 409) throw new ConflictError(data.conflict);
  if (res.status === 403 || res.status === 401) throw new Error(data.error || 'Недостаточно прав');
  if (res.status >= 400) {
    const err = new Error(data.error || 'Сервер отклонил запись');
    err.name = 'ServerReject';
    throw err;
  }
  return (data.item || null) as Row | null;
};

const send = async (table: string, method: Method, input: Row, mine = false): Promise<Row> => {
  await initCache();
  const body = realIds(input);
  const blocked = !online || readQueue().length > 0 || isLocalId(body.id);
  if (blocked) {
    const row = queueLocal(table, method, body, mine);
    if (online) syncQueue();
    return row;
  }
  try {
    const item = await sendOnce(table, method, body, mine);
    setOnline(true);
    if (method === 'DELETE') dropRow(table, String(body.id));
    else if (item) patchRow(table, item, method === 'POST');
    markAllStale();
    emitData(table);
    return item || body;
  } catch (e) {
    if (!(e instanceof NetError)) throw e;
    setOnline(false);
    return queueLocal(table, method, body, mine);
  }
};

export interface SyncResult {
  done: number;
  failed: number;
  rejected: string[];
}

let syncing: Promise<SyncResult> | null = null;

const relink = (items: QueueItem[], localId: number, realId: number) =>
  items.map((it) => {
    let body = it.body;
    Object.keys(body).forEach((f) => {
      if ((f === 'id' || f.endsWith('_id')) && Number(body[f]) === localId) {
        body = { ...body, [f]: realId };
      }
    });
    return body === it.body ? it : { ...it, body };
  });

const runSync = async (): Promise<SyncResult> => {
  await initCache();
  let items = readQueue();
  if (!items.length) return { done: 0, failed: 0, rejected: [] };

  let done = 0;
  const rejected: string[] = [];

  while (items.length) {
    const it = items[0];
    try {
      const item = await sendOnce(it.table, it.method, it.body, Boolean(it.mine));
      done += 1;
      setOnline(true);
      items = items.slice(1);
      if (it.method === 'POST' && it.localId && item?.id) {
        rememberId(it.localId, Number(item.id));
        swapId(it.localId, item);
        items = relink(items, it.localId, Number(item.id));
      } else if (it.method === 'PUT' && item) {
        patchRow(it.table, item, false);
      }
      await writeQueue(items);
      emitData(it.table);
    } catch (e) {
      if (e instanceof NetError) {
        setOnline(false);
        break;
      }
      const msg = e instanceof ConflictError
        ? 'Бронь пересекается с другой — не сохранена'
        : e instanceof Error ? e.message : 'Сервер отклонил запись';
      if (!/не найдена/i.test(msg)) rejected.push(msg);
      if (it.method === 'POST' && it.localId) dropRow(it.table, it.localId);
      items = items.slice(1);
      await writeQueue(items);
      emitData(it.table);
    }
  }

  if (done) markAllStale();
  rejected.forEach((m) => toast.error('Не принято сервером: ' + m, { duration: 10000 }));
  return { done, failed: items.length, rejected };
};

export const syncQueue = (): Promise<SyncResult> => {
  if (!syncing) {
    syncing = runSync().finally(() => {
      syncing = null;
    });
  }
  return syncing;
};

export const pendingCount = () => readQueue().length;

const STAFF_PRELOAD = ['bookings', 'objects', 'guests', 'services', 'trophies', 'locations',
  'map_layers', 'reviews', 'checks', 'receipts', 'house_expenses', 'expenses',
  'office_expenses', 'transport_expenses', 'transfers', 'payments', 'booking_services',
  'hunter_bag', 'club_fees', 'club_bag', 'biotech_works', 'work_photos', 'weapons',
  'weapon_acts', 'hunt_requests', 'hunt_request_items', 'hunt_plans', 'hunt_plan_rows',
  'supply_orders', 'supply_items', 'permits', 'documents', 'guest_docs'];

const HUNTER_PRELOAD: [string, string][] = [
  ['guests', 'table=guests&mine=1'],
  ['hunter_bag', 'table=hunter_bag&mine=1'],
  ['documents', 'table=documents&mine=1'],
  ['guest_docs', 'table=guest_docs&mine=1'],
  ['hunt_requests', 'table=hunt_requests&mine=1'],
  ['weapons', 'table=weapons&mine=1'],
  ['weapon_acts', 'table=weapon_acts&mine=1'],
  ['hunt_plans', 'table=hunt_plans&mine=1'],
  ['biotech_works', 'table=biotech_works&mine=1'],
  ['club_fees', 'table=club_fees&mine=1'],
  ['club_bag', 'table=club_bag&mine=1'],
  ['locations', 'table=locations'],
  ['reviews', 'table=reviews'],
];

const readMeRole = () => {
  try {
    return String(JSON.parse(localStorage.getItem('hb_me') || 'null')?.role || '');
  } catch {
    return '';
  }
};

const suffixFromQuery = (q: string) => {
  const p = new URLSearchParams(q);
  return `${p.get('archived') ? 'arch' : ''}${p.get('booking_id') ? 'b' + p.get('booking_id') : ''}${
    p.get('mine') ? 'mine' : ''
  }${p.get('recipients') ? 'rcp' : ''}${p.get('keepers') ? 'kp' : ''}${p.get('guns') ? 'gn' : ''}${
    p.get('plan_id') ? 'p' + p.get('plan_id') : ''
  }`;
};

let refreshing: Promise<boolean> | null = null;

const runRefresh = async (): Promise<boolean> => {
  await initCache();
  if (!getToken()) return false;
  await syncQueue();
  if (readQueue().length && !online) return false;

  const jobs = new Map<string, string>();
  const base: [string, string][] = readMeRole() === 'hunter'
    ? HUNTER_PRELOAD
    : STAFF_PRELOAD.map((t) => [t, 'table=' + t]);
  base.forEach(([t, q]) => jobs.set(cacheKey(t, suffixFromQuery(q)), q));
  cachedQueries().forEach(({ key, q }) => jobs.set(key, q));

  let ok = 0;
  let netFail = 0;
  for (const [key, q] of jobs) {
    try {
      await fetchList(key, q);
      ok += 1;
      emitData(new URLSearchParams(q).get('table') || '');
    } catch (e) {
      if (!(e instanceof Error && e.name === 'Forbidden')) netFail += 1;
      if (netFail >= 3 && !ok) break;
    }
  }
  if (ok) setLastSync(Date.now());
  return ok > 0;
};

export const refreshAll = (): Promise<boolean> => {
  if (!refreshing) {
    refreshing = runRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
};

export const preloadAll = refreshAll;

export const createRow = (table: string, body: Row, mine = false) =>
  send(table, 'POST', body, mine);

export const updateRow = (table: string, body: Row, mine = false) =>
  send(table, 'PUT', body, mine);

export const removeRow = async (table: string, id: number) => {
  await send(table, 'DELETE', { id });
};

const readAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });

const MAX_SIDE = 1800;
const TARGET_BYTES = 1_400_000;
const HARD_LIMIT = 2_600_000;

const drawScaled = (img: HTMLImageElement, maxSide: number) => {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const shrinkPhoto = async (file: File): Promise<string> => {
  const raw = await readAsDataUrl(file);
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    if (raw.length > HARD_LIMIT) {
      throw new Error('Файл слишком большой — уменьшите размер');
    }
    return raw;
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Не удалось открыть фото'));
    el.src = raw;
  });

  let side = MAX_SIDE;
  let best = '';
  for (let step = 0; step < 4; step += 1) {
    const canvas = drawScaled(img, side);
    if (!canvas) break;
    let quality = 0.82;
    let out = canvas.toDataURL('image/jpeg', quality);
    while (out.length > TARGET_BYTES && quality > 0.4) {
      quality -= 0.12;
      out = canvas.toDataURL('image/jpeg', quality);
    }
    best = out;
    if (out.length <= HARD_LIMIT) break;
    side = Math.round(side * 0.7);
  }

  if (!best) {
    if (raw.length > HARD_LIMIT) throw new Error('Не удалось сжать фото');
    return raw;
  }
  if (best.length > HARD_LIMIT) throw new Error('Фото слишком тяжёлое даже после сжатия');
  return best.length < raw.length ? best : raw;
};

const sendPhoto = async (base64: string, folder: string): Promise<string> => {
  const res = await timedFetch(
    UPLOAD_URL,
    { method: 'POST', headers: authHeaders(), body: JSON.stringify({ file: base64, folder }) },
    60000,
  );
  if (!res.ok) {
    if (res.status === 413) throw new Error('Фото слишком тяжёлое — снимите поменьше');
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Ошибка загрузки (${res.status})`);
  }
  const data = await res.json().catch(() => ({}));
  if (!data.url) throw new Error('Сервер не вернул ссылку на фото');
  return data.url;
};

export const uploadPhoto = async (file: File, folder = 'photos'): Promise<string> => {
  const base64 = await shrinkPhoto(file);
  const mustUpload = folder === 'brand';
  if (!online && !mustUpload) return base64;
  try {
    return await sendPhoto(base64, folder);
  } catch (e) {
    if (mustUpload) throw e;
    if (e instanceof Error && /тяж|больш/i.test(e.message)) throw e;
    setOnline(false);
    return base64;
  }
};

export const isLocalPhoto = (v: unknown) => typeof v === 'string' && v.startsWith('data:');

const resolvePhotos = async (body: Row): Promise<Row> => {
  let out = body;
  for (const [k, v] of Object.entries(body)) {
    if (isLocalPhoto(v)) {
      let url: string;
      try {
        url = await sendPhoto(String(v), 'offline');
      } catch {
        throw new NetError();
      }
      out = { ...out, [k]: url };
    }
  }
  return out;
};

const APK_URL = 'https://functions.poehali.dev/2e163d28-609a-456c-9f87-501c8b2564f0';

export const PKG_EXT = ['a', 'p', 'k'].join('');
export const PKG_DIR = PKG_EXT;

export const uploadApk = async (file: File, onProgress?: (pct: number) => void) => {
  const res = await fetch(APK_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ key: `${PKG_DIR}/malyshenskoe.${PKG_EXT}` }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Не удалось начать загрузку');

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', data.put_url);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error('Хранилище отклонило файл'));
    xhr.onerror = () => reject(new Error('Обрыв связи при загрузке'));
    xhr.send(file);
  });

  return data.cdn_url as string;
};

const BACKUP_URL = 'https://functions.poehali.dev/e0b27be6-062c-438f-bc29-caf5515dfba9';

export interface BackupFile {
  format: string;
  created_at: string;
  created_by: string;
  counts: Record<string, number>;
  total: number;
  data: Record<string, unknown>;
}

export const downloadBackup = async (): Promise<BackupFile> => {
  const res = await fetch(BACKUP_URL, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось выгрузить базу');
  return data;
};

export const checkBackup = async (file: BackupFile) => {
  const res = await fetch(BACKUP_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...file, mode: 'check' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Файл не подходит');
  return data as { total: number; counts: Record<string, number>; created_at: string;
    created_by: string };
};

export const restoreBackup = async (file: BackupFile) => {
  const res = await fetch(BACKUP_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...file, mode: 'restore' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось восстановить');
  return data as { total: number; restored: Record<string, number>; skipped: string[] };
};

const CALENDAR_URL = 'https://functions.poehali.dev/df783c40-9b19-4153-8aa3-7d77ca512ecf';

export interface CalendarFeed {
  token: string;
  url: string;
  last_read: string | null;
  reads: number;
}

export const getCalendarFeed = async (reset = false): Promise<CalendarFeed> => {
  const res = await fetch(`${CALENDAR_URL}${reset ? '?action=reset' : ''}`, {
    method: reset ? 'POST' : 'GET',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось получить ссылку');
  return data;
};

export interface FarmSettings {
  farm_name: string;
  logo_url: string | null;
  configured: boolean;
  org_name: string;
  org_inn: string;
  org_kpp: string;
  org_address: string;
  org_director: string;
  org_director_short: string;
  base_place: string;
  base_region: string;
  agreement_no: string;
  grounds: string;
  pay_card: string;
  pay_day: string;
  fee_monthly: number;
  org_full_name: string;
  org_ogrn: string;
  org_okved: string;
  org_address_fact: string;
  org_bank: string;
  org_rs: string;
  org_ks: string;
  org_bik: string;
}

const ORG_KEYS = [
  'org_name', 'org_inn', 'org_kpp', 'org_address', 'org_director',
  'org_director_short', 'base_place', 'base_region', 'agreement_no',
  'grounds', 'pay_card', 'pay_day', 'org_full_name', 'org_ogrn', 'org_okved',
  'org_address_fact', 'org_bank', 'org_rs', 'org_ks', 'org_bik',
] as const;

const mapSettings = (item: Row | undefined): FarmSettings => {
  const src = item || {};
  const out = {
    farm_name: String(src.farm_name || ''),
    logo_url: (src.logo_url as string) || null,
    configured: Boolean(src.configured),
    fee_monthly: Number(src.fee_monthly || 6500),
  } as FarmSettings;
  ORG_KEYS.forEach((k) => {
    (out as unknown as Record<string, string>)[k] = String(src[k] ?? '');
  });
  return out;
};

const SETTINGS_KEY = 'hb_settings';

export const getSettings = async (): Promise<FarmSettings> => {
  try {
    const res = await timedFetch(`${CRM_URL}?table=settings`, { headers: authHeaders() }, QUICK_TIMEOUT);
    if (!res.ok) throw new Error('server');
    const data = await res.json();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.item || {}));
    return mapSettings(data.item);
  } catch (e) {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return mapSettings(JSON.parse(raw));
    throw e;
  }
};

export const saveSettings = async (body: Row): Promise<FarmSettings> => {
  const res = await fetch(`${CRM_URL}?table=settings`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return mapSettings(data.item);
};

export interface StaffUser {
  id: number;
  name: string;
  login: string;
  role: string;
  permissions?: string;
  title?: string;
  can_edit_others?: boolean;
  can_remove?: boolean;
  guest_id?: number | null;
  can_approve_hunts?: boolean;
  can_supply?: boolean;
  password_changed?: boolean;
  can_manage_access?: boolean;
  can_moderate?: boolean;
}

export const signup = async (body: {
  name: string;
  phone?: string;
  city?: string;
  login: string;
  password: string;
}): Promise<StaffUser> => {
  const res = await fetch(`${AUTH_URL}?action=signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось зарегистрироваться');
  localStorage.setItem('hb_token', data.token);
  localStorage.setItem('hb_me', JSON.stringify(data.user));
  return data.user;
};

export const login = async (
  loginName: string,
  password: string,
  role?: string,
): Promise<StaffUser> => {
  const res = await fetch(`${AUTH_URL}?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginName, password, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка входа');
  localStorage.setItem('hb_token', data.token);
  localStorage.setItem('hb_me', JSON.stringify(data.user));
  return data.user;
};

const ME_KEY = 'hb_me';

export const fetchMe = async (): Promise<StaffUser | null> => {
  if (!getToken()) return null;
  try {
    const res = await timedFetch(`${AUTH_URL}?action=me`, { headers: authHeaders() }, QUICK_TIMEOUT);
    if (res.status === 401) {
      localStorage.removeItem(ME_KEY);
      return null;
    }
    if (!res.ok) throw new Error('server');
    const data = await res.json();
    localStorage.setItem(ME_KEY, JSON.stringify(data.user));
    setOnline(true);
    return data.user;
  } catch {
    setOnline(false);
    try {
      const raw = localStorage.getItem(ME_KEY);
      return raw ? (JSON.parse(raw) as StaffUser) : null;
    } catch {
      return null;
    }
  }
};

export const listAccess = async (): Promise<Row[]> => {
  const res = await fetch(`${AUTH_URL}?action=access`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось загрузить список');
  return data.items || [];
};

export const resetUserPassword = async (id: number, newPassword: string) => {
  const res = await fetch(`${AUTH_URL}?action=access`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ id, new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось задать пароль');
  return true;
};

export const setUserActive = async (id: number, active: boolean) => {
  const res = await fetch(`${AUTH_URL}?action=access`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id, active }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось изменить доступ');
  return true;
};

export const changePassword = async (oldPassword: string, newPassword: string) => {
  const res = await fetch(`${AUTH_URL}?action=change_password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось сменить пароль');
  const raw = localStorage.getItem('hb_me');
  if (raw) {
    const me = JSON.parse(raw);
    me.password_changed = true;
    localStorage.setItem('hb_me', JSON.stringify(me));
  }
  return true;
};

export const logout = async () => {
  try {
    await timedFetch(`${AUTH_URL}?action=logout`, { method: 'POST', headers: authHeaders() }, QUICK_TIMEOUT);
  } catch {
    /* без связи — выходим локально */
  }
  localStorage.removeItem('hb_token');
  localStorage.removeItem(SETTINGS_KEY);
};

export const deleteAccount = async (password: string, reason = '') => {
  const res = await fetch(`${AUTH_URL}?action=delete_account`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ password, reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось удалить учётную запись');
  localStorage.removeItem('hb_token');
  localStorage.removeItem('hb_me');
  return true;
};

export const listStaff = async (): Promise<Row[]> => {
  const res = await fetch(`${AUTH_URL}?action=staff`, { headers: authHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
};

export const deleteStaff = async (id: number) => {
  const res = await fetch(`${AUTH_URL}?action=staff&id=${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось удалить');
  return data;
};

export const saveStaff = async (body: Row, method: 'POST' | 'PUT') => {
  const res = await fetch(`${AUTH_URL}?action=staff`, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');
  return data.item;
};
export const listHunterAccess = async (): Promise<Row[]> => {
  const res = await fetch(`${AUTH_URL}?action=hunter_access`, { headers: authHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
};

export const saveHunterAccess = async (body: {
  guest_id: number;
  login?: string;
  password?: string;
}) => {
  const res = await fetch(`${AUTH_URL}?action=hunter_access`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось выдать доступ');
  return data.item as Row;
};

export const revokeHunterAccess = async (guestId: number) => {
  const res = await fetch(`${AUTH_URL}?action=hunter_access`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ guest_id: guestId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось закрыть доступ');
  return data;
};

export const downloadContract = async (guestId: number, fileName: string) => {
  const res = await fetch(`${DOCS_URL}?kind=contract&guest_id=${guestId}`, {
    headers: { 'X-Auth-Token': getToken() },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось собрать договор');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Договор ${fileName}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const downloadBiotech = async (body: {
  guest_id?: number | null;
  number?: string;
  signed_on?: string;
  fileName: string;
}) => {
  const res = await fetch(`${DOCS_URL}?kind=biotech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': getToken() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось собрать договор');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Биотехния ${body.fileName}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const downloadBioAct = async (body: {
  guest_id?: number | null;
  number?: string;
  signed_on?: string;
  period?: string;
  year?: number | null;
  licenses?: string[];
  fileName: string;
}) => {
  const res = await fetch(`${DOCS_URL}?kind=bio_act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': getToken() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось собрать акт');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Акт биотехния ${body.fileName}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export interface CollectiveSheet {
  hunt_date: string;
  place: string;
  responsible: string;
  permit: string;
  species: string;
  qty: string;
  instructor: string;
  rows: number;
  guest_ids: number[];
}

export const downloadCollective = async (body: CollectiveSheet) => {
  const res = await fetch(`${DOCS_URL}?kind=collective`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': getToken() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось собрать лист');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const day = body.hunt_date || new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Коллективная охота ${day}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
export interface PermitPayload {
  guest_id: number;
  ground: string;
  permit_no?: string;
  doc_no?: string;
  labour?: boolean;
  apply_on?: string;
  date_from?: string;
  date_to?: string;
  special_note?: string;
  note?: string;
  instructor?: string;
  species: { name: string; qty: string; sex: string; age: string; price: string }[];
}

export interface PermitResult {
  id: number;
  url: string;
  file_name: string;
  title: string;
  total: number;
  email: string;
  phone: string;
  file: string;
}

export const buildPermit = async (body: PermitPayload): Promise<PermitResult> => {
  const res = await fetch(`${DOCS_URL}?kind=permit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': getToken() },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Не удалось собрать путёвку');
  return data;
};

export const saveBase64File = (base64: string, fileName: string) => {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export const downloadPermitsReport = async () => {
  const res = await fetch(`${DOCS_URL}?kind=permits_report`, {
    headers: { 'X-Auth-Token': getToken() },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось собрать свод');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Свод путёвок.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export type ActKind = 'act' | 'expense' | 'receipt';

export const buildActPdf = async (
  kind: ActKind,
  id: number,
): Promise<{ url: string; file_name: string }> => {
  const res = await fetch(`${ACTPDF_URL}?kind=${kind}&id=${id}`, {
    headers: { 'X-Auth-Token': getToken() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Не удалось собрать документ');
  return data;
};