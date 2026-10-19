import { cacheKey, initCache, readCache, saveCache } from '@/lib/localCache';
import { Row } from '@/lib/api';

const NET_MS = 12000;

export class OfflineError extends Error {
  constructor() {
    super('Нет связи с сервером');
    this.name = 'OfflineError';
  }
}

export const netFetch = async (url: string, init: RequestInit = {}, ms = NET_MS) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    if (res.status === 502 || res.status === 503 || res.status === 504) throw new OfflineError();
    return res;
  } catch (e) {
    if (e instanceof OfflineError) throw e;
    throw new OfflineError();
  } finally {
    clearTimeout(t);
  }
};

const keyOf = (name: string) => cacheKey('x_' + name);

export const readStored = <T,>(name: string): T | null => {
  const rows = readCache(keyOf(name));
  const raw = rows?.[0]?.__json;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const writeStored = (name: string, value: unknown) => {
  let raw = '';
  try {
    raw = JSON.stringify(value);
  } catch {
    return;
  }
  const rows: Row[] = [{ __json: raw }];
  saveCache(keyOf(name), rows);
};

export const withCache = async <T,>(name: string, load: () => Promise<T>): Promise<T> => {
  await initCache();
  try {
    const fresh = await load();
    writeStored(name, fresh);
    return fresh;
  } catch (e) {
    const old = readStored<T>(name);
    if (old !== null) return old;
    throw e;
  }
};