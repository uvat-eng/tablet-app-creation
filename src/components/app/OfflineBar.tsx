import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { checkServer, isOnline, onConnection, pendingCount } from '@/lib/api';
import { cacheStats } from '@/lib/localCache';

const ago = (t: number | null) => {
  if (!t) return 'ещё не загружалась';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
};

const OfflineBar = () => {
  const [net, setNet] = useState(isOnline());
  const [queue, setQueue] = useState(pendingCount());
  const [last, setLast] = useState(cacheStats().lastSync);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const off = onConnection(setNet);
    const t = setInterval(() => {
      setQueue(pendingCount());
      setLast(cacheStats().lastSync);
    }, 3000);
    return () => {
      off();
      clearInterval(t);
    };
  }, []);

  if (net) return null;

  const retry = async () => {
    setBusy(true);
    await checkServer();
    setBusy(false);
  };

  return (
    <div
      className="w-full px-4 py-2 flex items-center gap-2 text-[12px] leading-snug"
      style={{ background: '#c0392b', color: '#fff' }}
      role="status"
    >
      <Icon name="CloudOff" size={16} className="shrink-0" />
      <span className="flex-1 min-w-0">
        Нет связи с сервером. Работаете с копией базы на телефоне ({ago(last)}).
        {queue > 0 && ` Не отправлено записей: ${queue} — уйдут сами, когда появится связь.`}
      </span>
      <button
        onClick={retry}
        disabled={busy}
        className="shrink-0 underline"
        style={{ color: '#fff' }}
      >
        {busy ? 'Проверяю…' : 'Проверить'}
      </button>
    </div>
  );
};

export default OfflineBar;
