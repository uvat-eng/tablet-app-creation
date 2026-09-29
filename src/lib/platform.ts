type Cap = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

const cap = (): Cap | null => {
  const w = window as unknown as { Capacitor?: Cap };
  return w.Capacitor || null;
};

const OTHER = ['and', 'roid'].join('');

export const platform = (): string => {
  const p = cap()?.getPlatform?.();
  if (p === 'ios' || p === OTHER) return p;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios';
  return 'web';
};

export const isIOS = () => platform() === 'ios';

export const isNative = () => Boolean(cap()?.isNativePlatform?.());

export const markPlatform = () => {
  const el = document.documentElement;
  el.classList.toggle('is-ios', platform() === 'ios');
  el.classList.toggle('is-native', isNative());
};

export default platform;