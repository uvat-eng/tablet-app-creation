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
    navigator.serviceWorker
      .getRegistrations()
      .then((list) => list.forEach((r) => r.unregister()))
      .catch(() => undefined);
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => keys.filter((k) => k.startsWith('hb-shell-')).forEach((k) => caches.delete(k)))
        .catch(() => undefined);
    }
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