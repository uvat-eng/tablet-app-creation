import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { isOnline, onConnection, pendingCount, syncQueue } from '@/lib/api';
import { cacheStats } from '@/lib/localCache';
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
    return () => {
      off();
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setQueue(pendingCount());
      setStats(cacheStats());
    }, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const retry = async () => {
      if (pendingCount() === 0) return;
      const r = await syncQueue();
      if (r.done) {
        toast.success(`Отправлено на сервер: ${r.done}`);
        setQueue(pendingCount());
      }
    };
    const t = setInterval(retry, 30000);
    window.addEventListener('online', retry);
    return () => {
      clearInterval(t);
      window.removeEventListener('online', retry);
    };
  }, []);

  const sync = async () => {
    setBusy(true);
    const r = await syncQueue();
    setBusy(false);
    setQueue(pendingCount());
    if (r.done) toast.success(`Отправлено: ${r.done}`);
    else if (r.failed) toast.error('Сервер недоступен, попробуем позже');
    else toast.success('Всё уже сохранено на сервере');
  };

  if (net && !queue) {
    return (
      <span className="h-label flex items-center gap-1 text-[#6d6d6d]" title={
        `Копия на телефоне: ${stats.tables} разделов, ${Math.round(stats.bytes / 1024)} КБ. ` +
        `Обновлено ${ago(stats.lastSync)}`
      }>
        <Icon name="CloudCheck" size={14} />
        Синхронизировано
      </span>
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
      title={`Копия на телефоне обновлена ${ago(stats.lastSync)}`}
    >
      <Icon name={net ? 'CloudUpload' : 'CloudOff'} size={14} />
      {!net && 'Нет связи'}
      {queue > 0 && ` · ждут отправки: ${queue}`}
      {net && queue > 0 && ' — отправить'}
    </button>
  );
};

export default SyncBadge;