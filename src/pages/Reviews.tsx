import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import SearchBar from '@/components/app/SearchBar';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Row, listRows, createRow, updateRow, removeRow, uploadPhoto } from '@/lib/api';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

const FIELDS: Field[] = [
  { key: 'photo_url', label: 'Фото отзыва', type: 'photo', folder: 'reviews' },
  { key: 'author', label: 'Автор', placeholder: 'ФИО или подпись' },
  { key: 'city', label: 'Город' },
  { key: 'left_on', label: 'Дата отзыва', type: 'date' },
  { key: 'text', label: 'Расшифровка (необязательно)', type: 'textarea' },
];

const Reviews = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await listRows('reviews'));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      ['author', 'city', 'text'].some((k) => String(r[k] ?? '').toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const quickUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploading(true);
    let done = 0;
    try {
      for (const file of list) {
        const url = await uploadPhoto(file, 'reviews');
        await createRow('reviews', {
          photo_url: url,
          left_on: new Date().toISOString().slice(0, 10),
          published: true,
        });
        done += 1;
      }
      toast.success(list.length > 1 ? `Добавлено ${done} отзывов` : 'Отзыв добавлен');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось загрузить фото';
      toast.error(done ? `Добавлено ${done}, дальше ошибка: ${msg}` : msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      load();
    }
  };

  const save = async (values: Row) => {
    const payload: Row = {
      ...values,
      left_on: String(values.left_on || '').slice(0, 10) || null,
      published: true,
    };
    if (editing?.id) {
      await updateRow('reviews', { ...payload, id: editing.id });
      toast.success('Отзыв обновлён');
    } else {
      await createRow('reviews', payload);
      toast.success('Отзыв добавлен');
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  return (
    <Layout
      index="Раздел / Отзывы"
      title="Отзывы гостей"
      lede="Фотографии рукописных отзывов из книги хозяйства."
      action={
        <span className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => quickUpload(e.target.files)}
          />
          <button
            className="h-cta-ghost"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Добавить вручную
          </button>
          <button
            className="h-cta"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Загружаем…' : 'Сфотографировать отзыв'}
          </button>
        </span>
      }
    >
      <SearchBar
        value={query}
        onChange={setQuery}
        count={visible.length}
        placeholder="Поиск по автору или тексту"
      />

      {!visible.length && (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border border-dashed border-[#c9c9c5] p-16 text-center hover:bg-[var(--hero-surface)] transition-colors"
        >
          <Icon name="Camera" size={28} fallback="Image" />
          <div className="h-head text-[18px] mt-4">
            {loading ? 'Загружаем…' : 'Отзывов пока нет'}
          </div>
          <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
            Нажмите, чтобы сфотографировать страницу из книги отзывов
          </div>
        </button>
      )}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}
      >
        {visible.map((r) => (
          <div key={String(r.id)} className="border border-[#e2e2df] bg-white group">
            <button
              className="block w-full"
              onClick={() => (r.photo_url ? setViewing(r) : (setEditing(r), setOpen(true)))}
            >
              {r.photo_url ? (
                <img
                  src={String(r.photo_url)}
                  alt={String(r.author || 'Отзыв')}
                  className="w-full h-[280px] object-cover"
                />
              ) : (
                <div className="w-full h-[280px] flex items-center justify-center bg-[var(--hero-surface)] p-4">
                  <span className="text-[0.7em] text-center line-clamp-6">
                    {String(r.text || 'Без фото')}
                  </span>
                </div>
              )}
            </button>
            <div className="p-3 border-t border-[#e2e2df]">
              <div className="text-[0.72em] truncate">{String(r.author || 'Гость')}</div>
              <div className="h-label mt-1 flex items-center justify-between gap-2">
                <span className="truncate">
                  {[String(r.city || ''), String(r.left_on || '').slice(0, 10)]
                    .filter(Boolean)
                    .join(' · ') || 'без даты'}
                </span>
                <span className="flex gap-2 shrink-0">
                  <button
                    className="underline"
                    onClick={() => {
                      setEditing(r);
                      setOpen(true);
                    }}
                  >
                    Правка
                  </button>
                  <button
                    className="underline"
                    onClick={async () => {
                      await removeRow('reviews', Number(r.id));
                      toast.success('Отзыв убран в архив');
                      load();
                    }}
                  >
                    Убрать
                  </button>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={Boolean(viewing)} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-[860px] rounded-none border-black" bodyClassName="p-2 pr-14">
          {viewing?.photo_url && (
            <img
              src={String(viewing.photo_url)}
              alt=""
              className="w-full max-h-[80vh] object-contain"
            />
          )}
          <div className="px-3 pb-3">
            <div className="text-[0.75em]">{String(viewing?.author || 'Гость')}</div>
            <div className="h-label mt-1">
              {[String(viewing?.city || ''), String(viewing?.left_on || '').slice(0, 10)]
                .filter(Boolean)
                .join(' · ')}
            </div>
            {viewing?.text && (
              <div className="mt-3 text-[0.7em] whitespace-pre-wrap">{String(viewing.text)}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Отзыв' : 'Новый отзыв'}
        fields={FIELDS}
        initial={editing}
        onSubmit={save}
      />
    </Layout>
  );
};

export default Reviews;