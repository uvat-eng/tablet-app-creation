import { getToken } from '@/lib/api';

const PUSH_URL = 'https://functions.poehali.dev/cdfb4e16-1957-4070-9cb4-8cec34361e75';

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Auth-Token': getToken(),
});

const toBytes = (base64: string): Uint8Array => {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
};

export const webPushSupported = (): boolean =>
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  typeof Notification !== 'undefined';

export const isStandalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

export const isIOS = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const registerSW = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
};

export const webPushState = async (): Promise<'on' | 'off' | 'blocked' | 'no'> => {
  if (!webPushSupported()) return 'no';
  if (Notification.permission === 'denied') return 'blocked';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub ? 'on' : 'off';
  } catch {
    return 'off';
  }
};

export const webPushEnable = async (): Promise<boolean> => {
  if (!webPushSupported()) return false;

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;

  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerSW());
  if (!reg) return false;
  await navigator.serviceWorker.ready;

  try {
    const keyRes = await fetch(`${PUSH_URL}?action=key`);
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toBytes(publicKey).buffer as ArrayBuffer,
      });
    }

    const res = await fetch(`${PUSH_URL}?action=subscribe`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        subscription: sub.toJSON(),
        agent: navigator.userAgent.slice(0, 300),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const webPushDisable = async (): Promise<void> => {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch(`${PUSH_URL}?action=unsubscribe`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  } catch {
    /* уже отписаны */
  }
};

export const webPushTest = async (): Promise<number> => {
  try {
    const res = await fetch(`${PUSH_URL}?action=test`, {
      method: 'POST',
      headers: headers(),
      body: '{}',
    });
    if (!res.ok) return 0;
    const json = await res.json();
    return Number(json.sent || 0);
  } catch {
    return 0;
  }
};