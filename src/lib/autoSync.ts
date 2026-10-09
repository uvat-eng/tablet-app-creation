import { refreshAll, syncQueue, pendingCount } from '@/lib/api';

const EVERY_MS = 10 * 60 * 1000;
const QUEUE_RETRY_MS = 30 * 1000;
const RESUME_GAP_MS = 2 * 60 * 1000;

let started = false;
let lastRun = 0;
let timers: ReturnType<typeof setInterval>[] = [];

const run = async () => {
  lastRun = Date.now();
  await refreshAll();
};

const onOnline = () => {
  run();
};

const onVisible = () => {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - lastRun > RESUME_GAP_MS) run();
  else if (pendingCount()) syncQueue();
};

export const startAutoSync = () => {
  if (started) return;
  started = true;
  run();
  timers = [
    setInterval(run, EVERY_MS),
    setInterval(() => {
      if (pendingCount()) syncQueue();
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
