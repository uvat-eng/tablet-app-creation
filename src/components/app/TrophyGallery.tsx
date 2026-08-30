import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Row, listRows } from '@/lib/api';
import Icon from '@/components/ui/icon';

const dmy = (v: unknown) => {
  const s = String(v || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
};

const TrophyGallery = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [big, setBig] = useState<Row | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    listRows('trophies')
      .then((r) => setRows(r))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...rows].sort((a, b) =>
    String(b.taken_on || '').localeCompare(String(a.taken_on || '')),
  );

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="h-label">Трофеи в зале · {rows.length}</span>
        <button
          className="h-cta-ghost ml-auto text-[0.7em]"
          onClick={() => navigate('/trophies/catalog')}
        >
          <Icon name="Plus" size={14} /> Записать трофей
        </button>
      </div>

      {loading ? (
        <div className="h-mono-cap">Загружаем…</div>
      ) : !sorted.length ? (
        <div className="border border-[#e2e2df] bg-white px-5 py-8 text-[0.8em] text-[var(--hero-muted)]">
          Трофеев пока нет. Нажмите «Записать трофей» и добавьте первый с фотографией.
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}
        >
          {sorted.map((t) => (
            <button
              key={String(t.id)}
              onClick={() => setBig(t)}
              className="border border-[#e2e2df] bg-white text-left hover:bg-[var(--hero-surface)] transition-colors"
            >
              {t.photo_url ? (
                <img
                  src={String(t.photo_url)}
                  alt=""
                  className="w-full h-[150px] object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-[150px] bg-[var(--hero-surface)] flex items-center justify-center">
                  <Icon name="Award" size={26} />
                </div>
              )}
              <div className="p-3">
                <div className="h-head text-[16px] truncate">{String(t.species || 'Трофей')}</div>
                <div className="h-label mt-1 truncate">
                  {[String(t.hunter || ''), dmy(t.taken_on)].filter(Boolean).join(' · ') || '—'}
                </div>
                {t.weight ? (
                  <div className="text-[0.72em] mt-1">{String(t.weight)}</div>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}

      {big && createPortal(
        <div
          className="fixed inset-0 z-[2500] bg-black/80 flex items-center justify-center p-6"
          onClick={() => setBig(null)}
        >
          <div
            className="bg-white max-w-[720px] w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {big.photo_url && (
              <img src={String(big.photo_url)} alt="" className="w-full object-contain" />
            )}
            <div className="p-5">
              <div className="h-head text-[24px]">{String(big.species || 'Трофей')}</div>
              <div className="grid gap-2 mt-3 text-[0.78em]">
                {[
                  ['Охотник', big.hunter],
                  ['Дата', dmy(big.taken_on)],
                  ['Угодье', big.location],
                  ['Вес / размер', big.weight],
                  ['Заметка', big.note],
                ]
                  .filter(([, v]) => v)
                  .map(([l, v]) => (
                    <div key={String(l)}>
                      <span className="h-label">{String(l)}</span> {String(v)}
                    </div>
                  ))}
              </div>
              <div className="flex gap-2 mt-5">
                <button className="h-cta-ghost" onClick={() => setBig(null)}>
                  Закрыть
                </button>
                <button
                  className="h-cta ml-auto"
                  onClick={() => navigate('/trophies/catalog')}
                >
                  Открыть каталог
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

export default TrophyGallery;