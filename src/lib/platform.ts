type Cap = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

const cap = (): Cap | null => {
  const w = window as unknown as { Capacitor?: Cap };
  return w.Capacitor || null;
};

export const platform = (): 'ios' | 'android' | 'web' => {
  const p = cap()?.getPlatform?.();
  if (p === 'ios' || p === 'android') return p;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios';
  return 'web';
};

export const isIOS = () => platform() === 'ios';

export const isNative = () => Boolean(cap()?.isNativePlatform?.());

export default platform;
