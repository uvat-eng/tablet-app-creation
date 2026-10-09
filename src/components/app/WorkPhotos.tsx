import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/icon';
import { Row, listRows, createRow, removeRow, uploadPhoto } from '@/lib/api';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

interface Props {
  workId: number;
  defaultDate?: string;
  compact?: boolean;
}

const WorkPhotos = ({ workId, defaultDate, compact }: Props) => {
  const [photos, setPhotos] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [big, setBig] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const all = await listRows('work_photos');
    setPhotos(all.filter((p) => String(p.work_id) === String(workId)));
  }, [workId]);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const add = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadPhoto(file, 'biotech');
        await createRow('work_photos', {
          work_id: workId,
          photo_url: url,
          shot_on: defaultDate || new Date().toISOString().slice(0, 10),
          caption: '',
        });
      }
      toast.success(files.length > 1 ? 'Фото загружены' : 'Фото загружено');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось загрузить');
    } finally {
      setBusy(false);
    }
  };

  const drop = async (id: number) => {
    try {
      await removeRow('work_photos', id);
      setBig(null);
      load();
    } catch {
      toast.error('Не удалось убрать фото');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="h-label">Фотоотчёт{photos.length ? `: ${photos.length}` : ''}</span>
        <label className="h-cta-ghost cursor-pointer">
          <Icon name="ImagePlus" size={14} />
          {busy ? 'Загружаем…' : 'Добавить фото'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => add(e.target.files)}
          />
        </label>
      </div>

      {photos.length > 0 && (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 90 : 130}px, 1fr))`,
          }}
        >
          {photos.map((p) => (
            <button
              key={String(p.id)}
              onClick={() => setBig(p)}
              className="relative block border border-[#e2e2df] overflow-hidden group"
              style={{ aspectRatio: '1 / 1' }}
            >
              <img
                src={String(p.photo_url)}
                alt={String(p.caption || '')}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {p.shot_on && (
                <span className="absolute left-0 bottom-0 px-1.5 py-0.5 text-[9px] bg-black/70 text-white">
                  {String(p.shot_on).slice(0, 10).split('-').reverse().join('.')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {big && createPortal(
        <div
          className="fixed inset-0 z-[2500] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setBig(null)}
        >
          <div
            className="max-w-[900px] w-full bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={String(big.photo_url)}
              alt=""
              className="w-full max-h-[70vh] object-contain bg-black"
            />
            <div className="p-4">
              <div className="h-label mb-1">
                {big.shot_on
                  ? String(big.shot_on).slice(0, 10).split('-').reverse().join('.')
                  : 'без даты'}
              </div>
              <div className="text-sm">{String(big.caption || 'Без описания')}</div>
              <div className="flex flex-wrap gap-2 mt-4">
                <a
                  className="h-cta-ghost"
                  href={String(big.photo_url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="Download" size={14} /> Открыть оригинал
                </a>
                <button className="h-cta-ghost" onClick={() => drop(Number(big.id))}>
                  Убрать
                </button>
                <button className="h-cta ml-auto" onClick={() => setBig(null)}>
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default WorkPhotos;