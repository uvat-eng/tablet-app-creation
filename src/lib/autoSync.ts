import { refreshAll, syncQueue, pendingCount, checkServer, isOnline } from '@/lib/api';
import { cacheStats } from '@/lib/localCache';

const EVERY_MS = 60 * 60 * 1000;
const PROBE_MS = 60 * 1000;
const QUEUE_RETRY_MS = 30 * 1000;

let started = false;
let timers: ReturnType<typeof setInterval>[] = [];

const due = () => {
  const last = cacheStats().lastSync;
  return !last || Date.now() - last > EVERY_MS;
};

const tick = async () => {
  if (!isOnline()) {
    const back = await checkServer();
    if (!back) return;
  }
  if (pendingCount()) await syncQueue();
  if (due()) await refreshAll();
};

const onOnline = () => {
  tick();
};

const onVisible = () => {
  if (document.visibilityState === 'visible') tick();
};

export const startAutoSync = () => {
  if (started) return;
  started = true;
  tick();
  timers = [
    setInterval(tick, PROBE_MS),
    setInterval(() => {
      if (pendingCount() && isOnline()) syncQueue();
    }, QUEUE_RETRY_MS),
  ];
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
};

export const stopAutoSync = () => {
  if (!started) return;
  started = false;
  timers.forEach((t) => clearInterval(t));
  timers = [];
  window.removeEventListener('online', onOnline);
  document.removeEventListener('visibilitychange', onVisible);
};
