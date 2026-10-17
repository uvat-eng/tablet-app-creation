const isNative = () =>
  typeof window !== 'undefined' &&
  Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());

type Prefs = typeof import('@capacitor/preferences').Preferences;

let prefs: Promise<{ p: Prefs } | null> | null = null;

const withTimeout = <T,>(task: Promise<T>, ms: number, fallback: T): Promise<T> =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    task
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch(() => {
        clearTimeout(t);
        resolve(fallback);
      });
  });

const load = () => {
  if (!prefs) {
    prefs = isNative()
      ? withTimeout(
          import('@capacitor/preferences').then((m) => ({ p: m.Preferences })),
          3000,
          null,
        )
      : Promise.resolve(null);
  }
  return prefs;
};

export const nativeSet = async (key: string, value: string | null) => {
  const box = await load();
  if (!box) return;
  try {
    const job = value === null ? box.p.remove({ key }) : box.p.set({ key, value });
    await withTimeout(job.then(() => true), 3000, false);
  } catch {
    /* хранилище телефона недоступно */
  }
};

export const nativeGet = async (key: string): Promise<string | null> => {
  const box = await load();
  if (!box) return null;
  try {
    const res = await withTimeout(
      box.p.get({ key }).then((r) => r.value),
      2000,
      null,
    );
    return res;
  } catch {
    return null;
  }
};

const MIRRORED = ['hb_token', 'hb_me', 'hb_settings', 'hb_id_map', 'hb_club_member', 'hb_bg_on'];

export const restoreFromNative = async () => {
  if (!isNative()) return;
  const missing = MIRRORED.filter((key) => {
    try {
      return localStorage.getItem(key) === null;
    } catch {
      return false;
    }
  });
  if (!missing.length) return;
  const values = await Promise.all(missing.map((key) => nativeGet(key)));
  missing.forEach((key, i) => {
    const v = values[i];
    try {
      if (v !== null) localStorage.setItem(key, v);
    } catch {
      /* пропускаем */
    }
  });
};

export const mirrorLocal = () => {
  if (!isNative()) return;
  MIRRORED.forEach((key) => {
    nativeSet(key, localStorage.getItem(key));
  });
};
