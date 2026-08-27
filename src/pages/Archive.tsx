import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import { Row, listRows, updateRow } from '@/lib/api';
import { toast } from 'sonner';

const TABS = [
  { table: 'bookings', label: 'Брони', title: 'guest_name' },
  { table: 'objects', label: 'Объекты', title: 'name' },
  { table: 'guests', label: 'Гости', title: 'name' },
  { table: 'services', label: 'Услуги', title: 'name' },
  { table: 'trophies', label: 'Трофеи', title: 'species' },
  { table: 'locations', label: 'Локации', title: 'name' },
  { table: 'reviews', label: 'Отзывы', title: 'author' },
];

const Archive = () => {
  const [tab, setTab] = useState(TABS[0]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await listRows(tab.table, { archived: true });
    setRows(all.filter((r) => r.archived));
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const restore = async (row: Row) => {
    await updateRow(tab.table, { id: row.id, archived: false });
    toast.success('Запись возвращена в работу');
    load();
  };

  return (
    <Layout
      index="Раздел / Архив"
      title="Архив"
      lede="Скрытые записи: их не видно в разделах, но история сохранена."
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.table}
            className={tab.table === t.table ? 'h-cta' : 'h-cta-ghost'}
            onClick={() => setTab(t)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: tab.title, label: 'Запись' },
          {
            key: 'restore',
            label: '',
            width: '130px',
            render: (r) => (
              <button
                className="h-label underline"
                onClick={(e) => {
                  e.stopPropagation();
                  restore(r);
                }}
              >
                Вернуть
              </button>
            ),
          },
        ]}
        rows={rows}
        empty={loading ? 'Загружаем…' : 'Архив пуст'}
      />
    </Layout>
  );
};

export default Archive;
