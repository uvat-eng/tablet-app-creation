const CRM_URL = 'https://functions.poehali.dev/85ee97e6-1ee1-4333-be9f-698f0c374677';
export const AUTH_URL = 'https://functions.poehali.dev/de14562b-724c-4ed9-80c1-c0d1787d0889';
const UPLOAD_URL = 'https://functions.poehali.dev/ee5bce4e-47ca-4200-ae73-937c1cf34339';

export type Row = Record<string, string | number | boolean | null>;

export const getToken = () => localStorage.getItem('hb_token') || '';

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
  const res = await fetch(`${CRM_URL}?table=${table}`, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.status === 409) throw new ConflictError(data.conflict);
  return data.item;
};

export const createRow = (table: string, body: Row) => send(table, 'POST', body);

export const updateRow = (table: string, body: Row) => send(table, 'PUT', body);

export const removeRow = async (table: string, id: number) => {
  await fetch(`${CRM_URL}?table=${table}&id=${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
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
  return data.user;
};

export const fetchMe = async (): Promise<StaffUser | null> => {
  if (!getToken()) return null;
  const res = await fetch(`${AUTH_URL}?action=me`, { headers: authHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
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