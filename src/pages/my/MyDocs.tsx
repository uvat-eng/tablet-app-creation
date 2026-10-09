import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { Row, listRows } from '@/lib/api';
import useDataRefresh from '@/hooks/useDataRefresh';

const KIND_LABEL: Record<string, string> = {
  contract: 'Договор с хозяйством',
  biotech: 'Договор по биотехнии',
  bio_act: 'Акт биотехнических работ',
  collective: 'Коллективный лист охоты',
};

const MyDocs = () => {
  const [docs, setDocs] = useState<Row[]>([]);
  const [personal, setPersonal] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, g] = await Promise.all([listRows('documents', { mine: true }), listRows('guest_docs', { mine: true })]);
    setDocs(d);
    setPersonal(g);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const empty = !docs.length && !personal.length;

  return (
    <Layout
      index="Кабинет / Документы"
      title="Мои документы"
      lede="Договоры и акты, которые оформило хозяйство."
    >
      {empty && (
        <div className="border border-[#e2e2df] p-12 text-center">
          <Icon name="FolderOpen" size={26} fallback="File" />
          <div className="h-head text-[18px] mt-4">
            {loading ? 'Загружаем…' : 'Документов пока нет'}
          </div>
          <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
            Хозяйство оформит договор и акт — они появятся здесь
          </div>
        </div>
      )}

      {docs.length > 0 && (
        <>
          <div className="h-head text-[22px] mb-3">Оформлено хозяйством</div>
          <div className="border border-[#e2e2df] mb-8">
            {docs.map((d, i) => (
              <div
                key={String(d.id)}
                className="flex flex-wrap items-center gap-3 justify-between px-4 py-3"
                style={{ borderTop: i ? '1px solid #e2e2df' : 'none' }}
              >
                <span>
                  <span className="text-[0.75em] block">{String(d.title || '')}</span>
                  <span className="h-label">
                    {KIND_LABEL[String(d.kind)] || String(d.kind)}
                    {d.doc_date ? ` · ${String(d.doc_date).slice(0, 10)}` : ''}
                  </span>
                </span>
                {d.file_url && (
                  <a
                    href={String(d.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="h-cta-ghost shrink-0"
                  >
                    <Icon name="Download" size={14} /> Скачать
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {personal.length > 0 && (
        <>
          <div className="h-head text-[22px] mb-3">Мои сканы и бумаги</div>
          <div className="border border-[#e2e2df]">
            {personal.map((d, i) => (
              <div
                key={String(d.id)}
                className="flex flex-wrap items-center gap-3 justify-between px-4 py-3"
                style={{ borderTop: i ? '1px solid #e2e2df' : 'none' }}
              >
                <span>
                  <span className="text-[0.75em] block">{String(d.title || '')}</span>
                  <span className="h-label">
                    {[String(d.doc_no || ''), String(d.signed_on || '').slice(0, 10)]
                      .filter(Boolean)
                      .join(' · ') || 'без номера'}
                  </span>
                </span>
                {d.file_url && (
                  <a
                    href={String(d.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="h-cta-ghost shrink-0"
                  >
                    <Icon name="Download" size={14} /> Открыть
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
};

export default MyDocs;
