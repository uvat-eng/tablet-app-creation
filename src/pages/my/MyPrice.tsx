import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { Row, listRows } from '@/lib/api';
import { money } from '@/lib/hunts';

const PRICE_PDF =
  'https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/bucket/9dfa3518-cc07-4590-a99e-9d6795bf29fe.pdf';

const PRICE_SHORT_PDF =
  'https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/bucket/42ebdd8e-5ecb-43f1-9280-5969adfe2af1.pdf';

const MyPrice = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await listRows('services'));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const live = rows.filter((r) => r.active !== false);
    if (!q) return live;
    return live.filter((r) =>
      ['name', 'category', 'note'].some((k) => String(r[k] ?? '').toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    visible.forEach((r) => {
      const key = String(r.category || 'Прочее');
      map.set(key, [...(map.get(key) || []), r]);
    });
    return Array.from(map.entries());
  }, [visible]);

  const season = String(rows.find((r) => r.season)?.season || '');

  return (
    <Layout
      index="Кабинет / Цены"
      title="Цены на охоту"
      lede={
        season
          ? `Прайс охотничьего хозяйства «Малышенское». Период ${season}.`
          : 'Прайс охотничьего хозяйства «Малышенское».'
      }
      action={
        <button className="h-cta" onClick={() => navigate('/my/hunts')}>
          <Icon name="CalendarPlus" size={15} fallback="CalendarDays" /> Подать заявку
        </button>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2 mb-8">
        <a
          href={PRICE_PDF}
          target="_blank"
          rel="noreferrer"
          className="border border-[#e2e2df] p-4 flex items-center gap-3 hover:bg-[var(--hero-surface)] transition-colors"
        >
          <Icon name="FileText" size={22} className="shrink-0" />
          <span>
            <span className="h-head text-[16px] block">Прайс целиком, PDF</span>
            <span className="h-label">8 страниц с фото и описанием</span>
          </span>
        </a>
        <a
          href={PRICE_SHORT_PDF}
          target="_blank"
          rel="noreferrer"
          className="border border-[#e2e2df] p-4 flex items-center gap-3 hover:bg-[var(--hero-surface)] transition-colors"
        >
          <Icon name="FileDown" size={22} fallback="Download" className="shrink-0" />
          <span>
            <span className="h-head text-[16px] block">Краткий прайс, PDF</span>
            <span className="h-label">на 2 страницы, удобно распечатать</span>
          </span>
        </a>
      </div>

      <input
        className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white mb-6"
        placeholder="Поиск по прайсу — лось, баня, разделка…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <div className="h-mono-cap">Загружаем…</div>}

      <div className="grid gap-8">
        {groups.map(([category, list]) => (
          <div key={category}>
            <div className="h-head text-[19px] mb-3">{category}</div>
            <div className="border border-[#e2e2df] overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="bg-[var(--hero-surface)]">
                    <th className="h-label text-left px-4 py-3 font-normal">Наименование</th>
                    <th className="h-label text-left px-4 py-3 font-normal w-[130px]">Цена</th>
                    <th className="h-label text-left px-4 py-3 font-normal w-[130px]">Ед.</th>
                    <th className="h-label text-left px-4 py-3 font-normal">Примечание</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={String(r.id)} className="border-t border-[#e2e2df]">
                      <td className="px-4 py-3 text-[0.72em]">{String(r.name)}</td>
                      <td className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap">
                        {money(r.price)}
                      </td>
                      <td className="px-4 py-3 text-[0.68em]">{String(r.unit || '—')}</td>
                      <td className="px-4 py-3 text-[0.64em] text-[var(--hero-muted)]">
                        {String(r.note || '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {!loading && !groups.length && (
        <div className="border border-dashed border-[#c9c9c5] p-12 text-center">
          <div className="h-head text-[18px]">Ничего не нашли</div>
          <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
            Попробуйте другое слово или откройте прайс в PDF
          </div>
        </div>
      )}

      <div className="mt-8 border border-[#e2e2df] px-4 py-3 flex gap-3">
        <Icon name="Info" size={16} className="shrink-0 mt-[2px]" />
        <p className="text-[0.78em] leading-relaxed">
          Цены справочные. Итоговую стоимость охоты хозяйство подтверждает при
          согласовании заявки.
        </p>
      </div>
    </Layout>
  );
};

export default MyPrice;
