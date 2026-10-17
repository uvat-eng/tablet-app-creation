import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { markPlatform } from './lib/platform'

markPlatform();

createRoot(document.getElementById("root")!).render(<App />);

const nativeApp =
  typeof window !== 'undefined' &&
  Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (nativeApp) {
    (async () => {
      try {
        const list = await navigator.serviceWorker.getRegistrations();
        await Promise.all(list.map((r) => r.unregister()));
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter((k) => k.startsWith('hb-shell-')).map((k) => caches.delete(k)));
        }
        if (navigator.serviceWorker.controller && !sessionStorage.getItem('hb_sw_reset')) {
          sessionStorage.setItem('hb_sw_reset', '1');
          window.location.reload();
        }
      } catch {
        /* служебных файлов нет */
      }
    })();
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    });
  }
}

if (typeof window !== 'undefined' && 'Capacitor' in window) {
  import('@capacitor/splash-screen')
    .then(({ SplashScreen }) => {
      setTimeout(() => SplashScreen.hide(), 400);
    })
    .catch(() => undefined);
}