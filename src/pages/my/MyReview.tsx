import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { Row, listRows, createRow, uploadPhoto } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

const MyReview = () => {
  const { user } = useAuth();
  const [me, setMe] = useState<Row | null>(null);
  const [mine, setMine] = useState<Row[]>([]);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [g, r] = await Promise.all([listRows('guests', { mine: true }), listRows('reviews')]);
    const guest = g[0] || null;
    setMe(guest);
    const gid = Number(guest?.id || 0);
    setMine(r.filter((x) => Number(x.guest_id || 0) === gid && gid > 0));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadPhoto(file, 'reviews');
        setPhotos((p) => [...p, url]);
      }
      toast.success('Фото добавлено');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async () => {
    if (!text.trim() && !photos.length) {
      toast.error('Напишите отзыв или добавьте фото');
      return;
    }
    setSaving(true);
    try {
      await createRow('reviews', {
        author: String(me?.name || user?.name || 'Охотник'),
        city: String(me?.city || ''),
        text: text.trim(),
        photo_url: photos[0] || null,
        left_on: today(),
      }, true);
      for (const url of photos.slice(1)) {
        await createRow('reviews', {
          author: String(me?.name || user?.name || 'Охотник'),
          city: String(me?.city || ''),
          text: '',
          photo_url: url,
          left_on: today(),
        }, true);
      }
      toast.success('Спасибо! Отзыв отправлен хозяйству');
      setText('');
      setPhotos([]);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout
      index="Кабинет / Отзыв"
      title="Оставить отзыв"
      lede="Расскажите, как прошла охота. Отзыв увидит хозяйство и опубликует его."
    >
      <div className="border border-[#e2e2df] p-5 mb-8">
        <label className="block mb-4">
          <span className="h-label block mb-1">Ваш отзыв</span>
          <textarea
            className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
            rows={6}
            value={text}
            placeholder="Как встретили, как прошла охота, что понравилось"
            onChange={(e) => setText(e.target.value)}
          />
        </label>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addPhotos(e.target.files)}
        />

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className="h-cta-ghost"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="Camera" size={15} fallback="Image" />
            {uploading ? 'Загружаем…' : 'Добавить фото'}
          </button>
        </div>

        {Boolean(photos.length) && (
          <div
            className="grid gap-2 mb-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
          >
            {photos.map((p) => (
              <div key={p} className="relative border border-[#e2e2df]">
                <img src={p} alt="" className="w-full h-[110px] object-cover" />
                <button
                  className="absolute top-1 right-1 bg-white border border-black px-2 text-[11px]"
                  onClick={() => setPhotos((list) => list.filter((x) => x !== p))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="h-cta" disabled={saving} onClick={submit}>
          {saving ? 'Отправляем…' : 'Отправить отзыв'}
        </button>
      </div>

      <div className="h-head text-[22px] mb-3">Мои отзывы</div>
      {!mine.length && (
        <div className="border border-dashed border-[#c9c9c5] p-10 text-center">
          <Icon name="MessageSquare" size={24} />
          <div className="h-head text-[17px] mt-3">
            {loading ? 'Загружаем…' : 'Вы ещё не оставляли отзывов'}
          </div>
        </div>
      )}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}
      >
        {mine.map((r) => (
          <div key={String(r.id)} className="border border-[#e2e2df] bg-white">
            {r.photo_url ? (
              <img
                src={String(r.photo_url)}
                alt=""
                className="w-full h-[200px] object-cover"
              />
            ) : (
              <div className="w-full h-[200px] flex items-center justify-center bg-[var(--hero-surface)] p-4">
                <span className="text-[0.7em] text-center line-clamp-6">
                  {String(r.text || '')}
                </span>
              </div>
            )}
            <div className="p-3 border-t border-[#e2e2df]">
              <div className="h-label">{String(r.left_on || '').slice(0, 10)}</div>
              <div className="h-label mt-1">
                {r.published ? 'Опубликован' : 'На проверке у хозяйства'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default MyReview;
