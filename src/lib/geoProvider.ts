import { Geolocation } from '@capacitor/geolocation';

export interface GeoSample {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  at: number;
}

export type GeoFail = { kind: 'denied' | 'unavailable' | 'timeout' | 'insecure' | 'none' };

type CapPlugin = {
  requestPermissions?: () => Promise<{ location?: string; coarseLocation?: string }>;
  checkPermissions?: () => Promise<{ location?: string; coarseLocation?: string }>;
  watchPosition: (
    opts: { enableHighAccuracy: boolean; timeout: number; maximumAge: number },
    cb: (
      pos: {
        coords: {
          latitude: number;
          longitude: number;
          accuracy: number;
          heading?: number | null;
          speed?: number | null;
        };
      } | null,
      err?: unknown,
    ) => void,
  ) => Promise<string>;
  clearWatch: (opts: { id: string }) => Promise<void>;
};

interface CapWindow {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: { Geolocation?: CapPlugin };
  };
}

const cap = (): CapPlugin | null => {
  const w = window as unknown as CapWindow;
  if (!w.Capacitor?.isNativePlatform?.()) return null;
  const registered = w.Capacitor.Plugins?.Geolocation;
  if (registered) return registered;
  return (Geolocation as unknown as CapPlugin) || null;
};

export const isNativeApp = () => {
  const w = window as unknown as CapWindow;
  return Boolean(w.Capacitor?.isNativePlatform?.());
};

export const isSecureForGeo = () =>
  window.isSecureContext ||
  location.protocol === 'https:' ||
  location.hostname === 'localhost' ||
  isNativeApp();

export interface GeoHandle {
  stop: () => void;
}

export const watchLocation = (
  onFix: (s: GeoSample) => void,
  onFail: (f: GeoFail) => void,
): GeoHandle => {
  const plugin = cap();

  if (plugin) {
    let watchId: string | null = null;
    let dead = false;

    (async () => {
      try {
        const perm = await plugin.checkPermissions?.();
        const granted =
          perm?.location === 'granted' ||
          perm?.coarseLocation === 'granted' ||
          (await plugin.requestPermissions?.())?.location === 'granted';
        if (!granted) {
          onFail({ kind: 'denied' });
          return;
        }
      } catch {
        /* некоторые сборки не требуют явного запроса */
      }
      if (dead) return;
      try {
        watchId = await plugin.watchPosition(
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 },
          (pos, err) => {
            if (err || !pos) {
              onFail({ kind: 'unavailable' });
              return;
            }
            onFix({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy || 0,
              heading: Number.isFinite(pos.coords.heading) ? Number(pos.coords.heading) : null,
              speed: Number.isFinite(pos.coords.speed) ? Number(pos.coords.speed) : null,
              at: Date.now(),
            });
          },
        );
      } catch {
        onFail({ kind: 'unavailable' });
      }
    })();

    return {
      stop: () => {
        dead = true;
        if (watchId) plugin.clearWatch({ id: watchId }).catch(() => undefined);
      },
    };
  }

  if (!navigator.geolocation) {
    onFail({ kind: 'none' });
    return { stop: () => undefined };
  }
  if (!isSecureForGeo()) {
    onFail({ kind: 'insecure' });
    return { stop: () => undefined };
  }

  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy || 0,
        heading: Number.isFinite(pos.coords.heading) ? Number(pos.coords.heading) : null,
        speed: Number.isFinite(pos.coords.speed) ? Number(pos.coords.speed) : null,
        at: Date.now(),
      }),
    (err) =>
      onFail({
        kind:
          err.code === err.PERMISSION_DENIED
            ? 'denied'
            : err.code === err.TIMEOUT
              ? 'timeout'
              : 'unavailable',
      }),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 },
  );

  return { stop: () => navigator.geolocation.clearWatch(id) };
};

export const FAIL_TEXT: Record<GeoFail['kind'], string> = {
  denied: 'Доступ к геолокации запрещён. Разрешите его в настройках приложения',
  unavailable: 'Сигнал GPS не найден. Выйдите на открытое место',
  timeout: 'GPS долго не отвечает. Попробуйте ещё раз на открытом месте',
  insecure: 'Определение места работает только по защищённому соединению (https)',
  none: 'Устройство не умеет определять местоположение',
};