import { getToken } from '@/lib/api';

interface BgApi {
  start: (o: { token: string; club: boolean }) => Promise<void>;
  stop: () => Promise<void>;
  syncSeen: (o: { total: number }) => Promise<void>;
  batterySettings: () => Promise<void>;
  status: () => Promise<{ running: boolean }>;
}

const api = (): BgApi | null => {
  const w = window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: { Background?: BgApi };
    };
  };
  if (!w.Capacitor?.isNativePlatform?.()) return null;
  return w.Capacitor.Plugins?.Background || null;
};

export const bgAvailable = () => api() !== null;

export const bgStart = async (club: boolean) => {
  const p = api();
  const token = getToken();
  if (!p || !token) return false;
  try {
    await p.start({ token, club });
    return true;
  } catch {
    return false;
  }
};

export const bgStop = async () => {
  const p = api();
  if (!p) return;
  try {
    await p.stop();
  } catch {
    /* служба и так не работает */
  }
};

export const bgSyncSeen = async (total: number) => {
  const p = api();
  if (!p) return;
  try {
    await p.syncSeen({ total });
  } catch {
    /* не критично */
  }
};

export const bgBatterySettings = async () => {
  const p = api();
  if (!p) return;
  try {
    await p.batterySettings();
  } catch {
    /* настройки не открылись */
  }
};

export const bgRunning = async (): Promise<boolean> => {
  const p = api();
  if (!p) return false;
  try {
    const r = await p.status();
    return Boolean(r.running);
  } catch {
    return false;
  }
};
