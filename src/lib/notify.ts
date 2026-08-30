import { LocalNotifications } from '@capacitor/local-notifications';

const SEEN_KEY = 'hb_notified_unread';

const isNative = () =>
  Boolean(
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      ?.isNativePlatform?.(),
  );

export const canNotify = () => isNative() || typeof Notification !== 'undefined';

export const notifyState = (): NotificationPermission | 'unsupported' => {
  if (isNative()) return localStorage.getItem('hb_notify_native') === '1' ? 'granted' : 'default';
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
};

export const askNotify = async (): Promise<boolean> => {
  if (isNative()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      const ok = res.display === 'granted';
      localStorage.setItem('hb_notify_native', ok ? '1' : '0');
      return ok;
    } catch {
      return false;
    }
  }
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
};

const buzz = () => {
  try {
    navigator.vibrate?.([200, 120, 200]);
  } catch {
    /* нет вибромотора */
  }
};

const showNative = async (title: string, body: string) => {
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return false;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1,
          title,
          body,
          smallIcon: 'ic_launcher',
          schedule: { at: new Date(Date.now() + 300) },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
};

const show = (title: string, body: string) => {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const n = new Notification(title, {
        body,
        icon: '/apple-touch-icon.png',
        tag: 'hb-messages',
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      return true;
    }
  } catch {
    /* система отказала */
  }
  return false;
};

export const notifyMessages = (unread: number) => {
  const prev = Number(localStorage.getItem(SEEN_KEY) || '0');
  localStorage.setItem(SEEN_KEY, String(unread));

  if (unread <= prev || unread === 0) return;
  if (document.visibilityState === 'visible' && !isNative()) return;

  const fresh = unread - prev;
  const title = 'Малышенское';
  const body =
    fresh === 1
      ? 'Новое сообщение'
      : `Новых сообщений: ${fresh}`;

  if (isNative()) {
    showNative(title, body);
    buzz();
    return;
  }
  if (!show(title, body)) buzz();
};

export const resetNotifyMark = (unread: number) => {
  localStorage.setItem(SEEN_KEY, String(unread));
};