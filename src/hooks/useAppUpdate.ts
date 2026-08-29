import { useCallback, useEffect, useRef, useState } from 'react';

const CHECK_MS = 300000;

const currentBundle = (): string => {
  const el = document.querySelector<HTMLScriptElement>('script[src*="/assets/index-"]');
  const src = el?.getAttribute('src') || '';
  return src.split('/').pop() || '';
};

const fetchBundle = async (): Promise<string> => {
  const res = await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return '';
  const html = await res.text();
  const m = html.match(/assets\/index-[\w-]+\.js/);
  return m ? m[0].split('/').pop() || '' : '';
};

export const useAppUpdate = () => {
  const [ready, setReady] = useState(false);
  const mine = useRef(currentBundle());

  const check = useCallback(async () => {
    if (!mine.current || document.hidden) return;
    try {
      const latest = await fetchBundle();
      if (latest && latest !== mine.current) setReady(true);
    } catch {
      /* нет связи — попробуем позже */
    }
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, CHECK_MS);
    const onShow = () => {
      if (!document.hidden) check();
    };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('focus', onShow);
    };
  }, [check]);

  const apply = useCallback(async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* кэш недоступен — просто перезагрузим */
    }
    window.location.reload();
  }, []);

  return { ready, apply };
};

export default useAppUpdate;
