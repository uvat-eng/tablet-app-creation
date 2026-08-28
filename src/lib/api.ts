import { cacheKey, saveCache, readCache, pushQueue, readQueue, writeQueue } from '@/lib/localCache';

const CRM_URL = 'https://functions.poehali.dev/85ee97e6-1ee1-4333-be9f-698f0c374677';
export const AUTH_URL = 'https://functions.poehali.dev/de14562b-724c-4ed9-80c1-c0d1787d0889';
const UPLOAD_URL = 'https://functions.poehali.dev/ee5bce4e-47ca-4200-ae73-937c1cf34339';

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

export const listRows = async (
  table: string,
  opts: { archived?: boolean; bookingId?: number } = {},
): Promise<Row[]> => {
  const q = new URLSearchParams({ table });
  if (opts.archived) q.set('archived', '1');
  if (opts.bookingId) q.set('booking_id', String(opts.bookingId));

  const suffix = `${opts.archived ? 'arch' : ''}${opts.bookingId ? 'b' + opts.bookingId : ''}`;
  const key = cacheKey(table, suffix);

  try {
    const res = await fetch(`${CRM_URL}?${q}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('server ' + res.status);
    const data = await res.json();
    const items: Row[] = data.items || [];
    saveCache(key, items);
    setOnline(true);
    return items;
  } catch {
    const cached = readCache(key);
    setOnline(false);
    if (cached) return cached;
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

const send = async (table: string, method: string, body: Row): Promise<Row> => {
  try {
    const res = await fetch(`${CRM_URL}?table=${table}`, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.status === 409) throw new ConflictError(data.conflict);
    if (res.status === 403) throw new Error(data.error || 'Недостаточно прав');
    setOnline(true);
    return data.item;
  } catch (e) {
    if (e instanceof ConflictError) throw e;
    if (e instanceof Error && /прав|Недостаточно/.test(e.message)) throw e;

    setOnline(false);
    pushQueue(table, method as 'POST' | 'PUT', body);
    const local: Row = { ...body, _pending: true };
    if (!local.id) local.id = -Date.now();
    return local;
  }
};

export const syncQueue = async (): Promise<{ done: number; failed: number }> => {
  const items = readQueue();
  if (!items.length) return { done: 0, failed: 0 };

  const rest: typeof items = [];
  let done = 0;

  for (const it of items) {
    try {
      const url =
        it.method === 'DELETE'
          ? `${CRM_URL}?table=${it.table}&id=${it.body.id}`
          : `${CRM_URL}?table=${it.table}`;
      const res = await fetch(url, {
        method: it.method,
        headers: authHeaders(),
        body: it.method === 'DELETE' ? undefined : JSON.stringify(it.body),
      });
      if (res.ok || res.status === 403 || res.status === 404) done += 1;
      else rest.push(it);
    } catch {
      rest.push(it);
    }
  }

  writeQueue(rest);
  if (done) setOnline(true);
  return { done, failed: rest.length };
};

export const pendingCount = () => readQueue().length;

const PRELOAD = ['bookings', 'objects', 'guests', 'services', 'trophies', 'locations',
  'map_layers', 'reviews', 'checks', 'receipts', 'house_expenses', 'expenses'];

export const preloadAll = async () => {
  for (const t of PRELOAD) {
    try {
      await listRows(t);
    } catch {
      /* нет связи — используем то, что уже сохранено */
    }
  }
};

export const createRow = (table: string, body: Row) => send(table, 'POST', body);

export const updateRow = (table: string, body: Row) => send(table, 'PUT', body);

export const removeRow = async (table: string, id: number) => {
  try {
    const res = await fetch(`${CRM_URL}?table=${table}&id=${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.status === 403) {
      const data = await res.json();
      throw new Error(data.error || 'Недостаточно прав');
    }
    setOnline(true);
  } catch (e) {
    if (e instanceof Error && /прав|Недостаточно/.test(e.message)) throw e;
    setOnline(false);
    pushQueue(table, 'DELETE', { id });
  }
};

export const uploadPhoto = async (file: File, folder = 'photos'): Promise<string> => {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ file: base64, folder }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'upload failed');
  return data.url;
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

export interface FarmSettings {
  farm_name: string;
  logo_url: string | null;
  configured: boolean;
}

export const getSettings = async (): Promise<FarmSettings> => {
  const res = await fetch(`${CRM_URL}?table=settings`, { headers: authHeaders() });
  const data = await res.json();
  return {
    farm_name: data.item?.farm_name || '',
    logo_url: data.item?.logo_url || null,
    configured: Boolean(data.item?.configured),
  };
};

export const saveSettings = async (body: Row): Promise<FarmSettings> => {
  const res = await fetch(`${CRM_URL}?table=settings`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return {
    farm_name: data.item?.farm_name || '',
    logo_url: data.item?.logo_url || null,
    configured: Boolean(data.item?.configured),
  };
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
}

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
    const res = await fetch(`${AUTH_URL}?action=me`, { headers: authHeaders() });
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

export const logout = async () => {
  await fetch(`${AUTH_URL}?action=logout`, { method: 'POST', headers: authHeaders() });
  localStorage.removeItem('hb_token');
};

export const listStaff = async (): Promise<Row[]> => {
  const res = await fetch(`${AUTH_URL}?action=staff`, { headers: authHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
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