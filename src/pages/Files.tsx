import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import SearchBar from '@/components/app/SearchBar';
import Icon from '@/components/ui/icon';
import CollectiveSheetDialog from '@/components/app/CollectiveSheetDialog';
import { Row, listRows, removeRow } from '@/lib/api';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

const KIND_LABEL: Record<string, string> = {
  collective: 'Коллективный лист охоты',
  contract: 'Договор с охотником',
  biotech: 'Договор по биотехнии',
  bio_act: 'Акт биотехнических работ',
};

const ru = (d: unknown) => {
  const s = String(d || '');
  if (!s) return '—';
  const [y, m, day] = s.slice(0, 10).split('-');
  return day ? `${day}.${m}.${y}` : s;
};

const Files = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await listRows('documents'));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== 'all' && String(r.kind) !== kind) return false;
      if (!q) return true;
      return ['title', 'file_name', 'created_by_name'].some((k) =>
        String(r[k] ?? '').toLowerCase().includes(q),
      );
    });
  }, [rows, query, kind]);

  const open = (r: Row) => {
    const url = String(r.file_url || '');
    if (!url) {
      toast.error('У документа нет файла');
      return;
    }
    window.open(url, '_blank');
  };

  const drop = async (r: Row) => {
    if (!confirm('Убрать документ из списка?')) return;
    await removeRow('documents', Number(r.id));
    toast.success('Документ убран');
    load();
  };

  const TABS = [
    { key: 'all', label: 'Все' },
    { key: 'collective', label: 'Листы охоты' },
    { key: 'contract', label: 'Договоры клуба' },
    { key: 'biotech', label: 'Договоры биотехнии' },
    { key: 'bio_act', label: 'Акты биотехнии' },
  ];

  return (
    <Layout
      index="Раздел / Файлы"
      title="Готовые документы"
      lede="Все собранные листы охоты и договоры. Нажмите на строку, чтобы открыть файл."
      action={
        <button className="h-cta" onClick={() => setSheet(true)}>
          <Icon name="FilePlus" size={15} />
          Новый лист охоты
        </button>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setKind(t.key)}
            className="h-label px-3 py-1 border"
            style={{
              borderColor: '#e2e2df',
              background: kind === t.key ? 'var(--hero-accent)' : '#fff',
              color: kind === t.key ? 'var(--hero-accent-contrast)' : 'inherit',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        count={visible.length}
        placeholder="Поиск по названию"
      />

      <DataTable
        rows={visible}
        onRowClick={open}
        empty={loading ? 'Загружаем…' : 'Пока нет ни одного документа'}
        columns={[
          {
            key: 'kind',
            label: 'Тип',
            width: '210px',
            render: (r) => KIND_LABEL[String(r.kind)] || 'Документ',
          },
          {
            key: 'title',
            label: 'Название',
            render: (r) => String(r.title || r.file_name || 'Без названия'),
          },
          {
            key: 'doc_date',
            label: 'Дата охоты',
            width: '120px',
            render: (r) => ru(r.doc_date),
          },
          {
            key: 'people',
            label: 'Чел.',
            width: '70px',
            render: (r) => (Number(r.people) ? String(r.people) : '—'),
          },
          {
            key: 'created_at',
            label: 'Создан',
            width: '120px',
            render: (r) => ru(r.created_at),
          },
          {
            key: 'created_by_name',
            label: 'Кто собрал',
            width: '150px',
            render: (r) => String(r.created_by_name || '—'),
          },
          {
            key: '__act',
            label: '',
            width: '190px',
            render: (r) => (
              <span className="flex gap-3">
                <button
                  className="h-label underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    open(r);
                  }}
                >
                  Открыть
                </button>
                <a
                  className="h-label underline"
                  href={String(r.file_url || '')}
                  download={String(r.file_name || 'document.docx')}
                  onClick={(e) => e.stopPropagation()}
                >
                  Скачать
                </a>
                <button
                  className="h-label underline text-[#c0392b]"
                  onClick={(e) => {
                    e.stopPropagation();
                    drop(r);
                  }}
                >
                  Убрать
                </button>
              </span>
            ),
          },
        ]}
      />

      <CollectiveSheetDialog
        open={sheet}
        onOpenChange={(v) => {
          setSheet(v);
          if (!v) load();
        }}
      />
    </Layout>
  );
};

export default Files;