import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import {
  downloadTiles,
  readTilesMeta,
  clearTiles,
  countTiles,
  Progress,
} from '@/lib/tileStore';

interface Props {
  onReady?: () => void;
}

const mb = (n: number) => (n / 1048576).toFixed(0);

const OfflineMapDownload = ({ onReady }: Props) => {
  const [meta, setMeta] = useState(readTilesMeta);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<Progress | null>(null);
  const [count, setCount] = useState(0);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (meta?.done) countTiles().then(setCount);
  }, [meta]);

  const start = async () => {
    setBusy(true);
    abort.current = new AbortController();
    try {
      const n = await downloadTiles(setProg, abort.current.signal);
      setMeta(readTilesMeta());
      setCount(n);
      toast.success('Карты загружены — работают без интернета');
      onReady?.();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        toast.error('Не удалось скачать карты. Проверьте интернет');
      }
    } finally {
      setBusy(false);
      setProg(null);
    }
  };

  const drop = async () => {
    await clearTiles();
    setMeta(null);
    setCount(0);
    toast.success('Офлайн-карты удалены');
  };

  if (meta?.done) {
    return (
      <div className="mb-4 border border-[#e2e2df] px-4 py-3 flex flex-wrap items-center gap-3">
        <Icon name="CircleCheck" size={16} />
        <span className="text-[0.8em]">
          Офлайн-карты загружены — {count || meta.total} фрагментов
        </span>
        <button className="h-label underline ml-auto" onClick={drop}>
          Удалить
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 border border-[#e2e2df] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Icon name="CloudDownload" size={16} />
        <span className="text-[0.8em]">
          Карты угодий для работы без интернета — около 200 МБ, скачиваются один раз
        </span>
        <button
          onClick={busy ? () => abort.current?.abort() : start}
          className="ml-auto bg-[#1f1f1d] text-white px-4 py-2 text-[0.75em] tracking-wide"
        >
          {busy ? 'Отменить' : 'Скачать карты'}
        </button>
      </div>

      {prog && (
        <div className="mt-3">
          <div className="h-[6px] bg-[#eceae4]">
            <div
              className="h-full bg-[#1f1f1d] transition-all"
              style={{ width: `${(prog.loaded / prog.total) * 100}%` }}
            />
          </div>
          <div className="h-label mt-2">
            {mb(prog.loaded)} из {mb(prog.total)} МБ · часть {prog.part} из {prog.parts}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineMapDownload;
