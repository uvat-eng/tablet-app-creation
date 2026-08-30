import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

if (typeof window !== 'undefined' && 'Capacitor' in window) {
  import('@capacitor/splash-screen')
    .then(({ SplashScreen }) => {
      setTimeout(() => SplashScreen.hide(), 1800);
    })
    .catch(() => undefined);
}