import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { isOnline, onConnection, pendingCount, refreshAll, syncQueue } from '@/lib/api';
import { cacheStats } from '@/lib/localCache';
import { refreshExtras } from '@/lib/extraSync';
import { toast } from 'sonner';

const ago = (t: number | null) => {
  if (!t) return 'ещё не было';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
};

const SyncBadge = () => {
  const [net, setNet] = useState(isOnline());
  const [queue, setQueue] = useState(pendingCount());
  const [stats, setStats] = useState(cacheStats());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const off = onConnection(setNet);
    const t = setInterval(() => {
      setQueue(pendingCount());
      setStats(cacheStats());
    }, 3000);
    return () => {
      off();
      clearInterval(t);
    };
  }, []);

  const sync = async () => {
    if (busy) return;
    setBusy(true);
    const before = pendingCount();
    const r = await syncQueue();
    const ok = await refreshAll();
    if (ok) await refreshExtras().catch(() => undefined);
    setBusy(false);
    setQueue(pendingCount());
    setStats(cacheStats());
    if (r.failed || (!ok && before)) {
      toast.error('Нет связи с сервером. Всё сохранено на телефоне — отправим позже');
    } else if (!ok) {
      toast.error('Нет связи с сервером. Работаете с копией на телефоне');
    } else if (r.done) {
      toast.success(`Отправлено на сервер: ${r.done}. База обновлена`);
    } else {
      toast.success('База обновлена');
    }
  };

  const title =
    `Копия базы на телефоне: ${Math.round(stats.bytes / 1024)} КБ. ` +
    `Обновлена ${ago(stats.lastSync)}. Нажмите, чтобы обновить`;

  if (net && !queue) {
    return (
      <button
        onClick={sync}
        disabled={busy}
        className="h-label flex items-center gap-1 text-[#6d6d6d]"
        title={title}
      >
        <Icon name={busy ? 'RefreshCw' : 'CloudCheck'} size={14} className={busy ? 'animate-spin' : ''} />
        {busy ? 'Обновляю…' : `Обновлено ${ago(stats.lastSync)}`}
      </button>
    );
  }

  return (
    <button
      onClick={sync}
      disabled={busy}
      className="h-label flex items-center gap-1 px-2 py-1 border"
      style={{
        borderColor: net ? '#c58a00' : '#c0392b',
        color: net ? '#c58a00' : '#c0392b',
        background: '#fff',
      }}
      title={title}
    >
      <Icon
        name={busy ? 'RefreshCw' : net ? 'CloudUpload' : 'CloudOff'}
        size={14}
        className={busy ? 'animate-spin' : ''}
      />
      {!net && 'Офлайн'}
      {queue > 0 && ` · не отправлено: ${queue}`}
      {net && queue > 0 && ' — отправить'}
    </button>
  );
};

export default SyncBadge;
