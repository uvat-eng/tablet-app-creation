import { cacheKey, saveCache, readCache, pushQueue, readQueue, writeQueue } from '@/lib/localCache';

const CRM_URL = 'https://functions.poehali.dev/85ee97e6-1ee1-4333-be9f-698f0c374677';
export const AUTH_URL = 'https://functions.poehali.dev/de14562b-724c-4ed9-80c1-c0d1787d0889';
const UPLOAD_URL = 'https://functions.poehali.dev/ee5bce4e-47ca-4200-ae73-937c1cf34339';
const DOCS_URL = 'https://functions.poehali.dev/00cd6749-c34b-44dc-8de2-a3cbeed57785';

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
    if (res.status >= 400) {
      const err = new Error(data.error || 'Сервер отклонил запись');
      err.name = 'ServerReject';
      throw err;
    }
    setOnline(true);
    return data.item;
  } catch (e) {
    if (e instanceof ConflictError) throw e;
    if (e instanceof Error && e.name === 'ServerReject') throw e;
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

export const uploadPhoto = async (file: File, folder = 'photos'): Promise<string> => {
  const base64 = await shrinkPhoto(file);
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ file: base64, folder }),
  });
  if (!res.ok) {
    if (res.status === 413) throw new Error('Фото слишком тяжёлое — снимите поменьше');
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Ошибка загрузки (${res.status})`);
  }
  const data = await res.json().catch(() => ({}));
  if (!data.url) throw new Error('Сервер не вернул ссылку на фото');
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

export const getSettings = async (): Promise<FarmSettings> => {
  const res = await fetch(`${CRM_URL}?table=settings`, { headers: authHeaders() });
  const data = await res.json();
  return mapSettings(data.item);
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
  await fetch(`${AUTH_URL}?action=logout`, { method: 'POST', headers: authHeaders() });
  localStorage.removeItem('hb_token');
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