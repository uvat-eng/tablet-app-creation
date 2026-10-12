const isNative = () =>
  typeof window !== 'undefined' &&
  Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());

type Prefs = typeof import('@capacitor/preferences').Preferences;

let prefs: Promise<Prefs | null> | null = null;

const load = () => {
  if (!prefs) {
    prefs = isNative()
      ? import('@capacitor/preferences').then((m) => m.Preferences).catch(() => null)
      : Promise.resolve(null);
  }
  return prefs;
};

export const nativeSet = async (key: string, value: string | null) => {
  const p = await load();
  if (!p) return;
  try {
    if (value === null) await p.remove({ key });
    else await p.set({ key, value });
  } catch {
    /* хранилище телефона недоступно */
  }
};

export const nativeGet = async (key: string): Promise<string | null> => {
  const p = await load();
  if (!p) return null;
  try {
    return (await p.get({ key })).value;
  } catch {
    return null;
  }
};

const MIRRORED = ['hb_token', 'hb_me', 'hb_settings', 'hb_id_map', 'hb_club_member', 'hb_bg_on'];

export const restoreFromNative = async () => {
  if (!isNative()) return;
  for (const key of MIRRORED) {
    try {
      if (localStorage.getItem(key) !== null) continue;
      const v = await nativeGet(key);
      if (v !== null) localStorage.setItem(key, v);
    } catch {
      /* пропускаем */
    }
  }
};

export const mirrorLocal = () => {
  if (!isNative()) return;
  MIRRORED.forEach((key) => {
    nativeSet(key, localStorage.getItem(key));
  });
};
