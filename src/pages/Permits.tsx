import { useEffect, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import PermitDialog from '@/components/app/PermitDialog';
import { Row, listRows } from '@/lib/api';
import { groundLabel, ruDate, rubles } from '@/lib/permits';
import { toast } from 'sonner';

const Permits = () => {
  const [permits, setPermits] = useState<Row[]>([]);
  const [guests, setGuests] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [p, g] = await Promise.all([listRows('permits'), listRows('guests')]);
      setPermits(p);
      setGuests(g.filter((x) => !x.archived));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось загрузить путёвки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout
      title="Путёвки"
      index="Разрешения на охоту"
      lede="Заявление и путёвка-договор для ООО «Эксперт-Плюс» — собираются автоматически по карточке охотника."
      action={
        <button className="h-cta" onClick={() => setOpen(true)}>
          <Icon name="Plus" size={15} /> Создать путёвку
        </button>
      }
    >
      <PermitDialog
        open={open}
        onOpenChange={setOpen}
        guests={guests}
        onCreated={load}
      />

      {!loading && permits.length > 0 && (
        <div className="grid gap-px sm:grid-cols-3 bg-[#e2e2df] mb-5">
          <div className="bg-white px-4 py-3">
            <div className="h-label">Всего путёвок</div>
            <div className="h-head text-[22px] mt-1">{permits.length}</div>
          </div>
          <div className="bg-white px-4 py-3">
            <div className="h-label">За трудоучастие</div>
            <div className="h-head text-[22px] mt-1">
              {permits.filter((p) => p.labour).length}
            </div>
          </div>
          <div className="bg-white px-4 py-3">
            <div className="h-label">Оплачено деньгами</div>
            <div className="h-head text-[22px] mt-1">
              {rubles(
                permits
                  .filter((p) => !p.labour)
                  .reduce((s, p) => s + (Number(p.total) || 0), 0),
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="h-label">Загружаем журнал…</p>
      ) : permits.length === 0 ? (
        <div className="border border-[#e2e2df] px-5 py-10 text-center">
          <Icon name="FileText" size={28} className="mx-auto" />
          <p className="text-[0.85em] mt-3">Путёвок пока нет</p>
          <p className="h-label mt-2 leading-relaxed max-w-[42ch] mx-auto">
            Нажмите «Создать путёвку» — выберите охотника, участок и сроки,
            документ соберётся сам.
          </p>
        </div>
      ) : (
        <div className="border border-[#e2e2df]">
          {permits.map((p, i) => (
            <div
              key={String(p.id)}
              className="px-4 py-4 flex flex-wrap items-center gap-4"
              style={{ borderTop: i ? '1px solid #e2e2df' : 'none' }}
            >
              <div className="flex-1 min-w-[200px]">
                <div className="text-[0.86em]">{String(p.guest_name || '—')}</div>
                <div className="h-label mt-1">
                  {p.doc_no ? `Путёвка № ${p.doc_no} · ` : ''}
                  {groundLabel(p.ground)} · {ruDate(p.date_from)} — {ruDate(p.date_to)}
                  {p.permit_no ? ` · разрешение № ${p.permit_no}` : ''}
                </div>
                {p.species && (
                  <div className="h-label mt-1">{String(p.species)}</div>
                )}
              </div>

              {p.labour ? (
                <span className="text-[0.72em] whitespace-nowrap border border-[#1f1f1d] px-2 py-1">
                  Трудоучастие
                </span>
              ) : (
                <div className="text-[0.8em] whitespace-nowrap">{rubles(p.total)}</div>
              )}

              {p.file_url && (
                <a
                  className="h-cta-ghost"
                  href={String(p.file_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="FileDown" size={14} /> Файл
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 border border-[#e2e2df] px-4 py-3 flex gap-3">
        <Icon name="Info" size={16} className="shrink-0 mt-[2px]" />
        <p className="text-[0.78em] leading-relaxed">
          Все созданные путёвки также попадают в раздел «Готовые документы» —
          их можно скачать повторно в любой момент.
        </p>
      </div>
    </Layout>
  );
};

export default Permits;