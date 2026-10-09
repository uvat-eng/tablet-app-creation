import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import DataTable, { Column } from '@/components/app/DataTable';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import SearchBar from '@/components/app/SearchBar';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

interface CrudPageProps {
  table: string;
  index: string;
  title: string;
  lede?: string;
  columns: Column[];
  fields: Field[];
  filter?: (row: Row) => boolean;
  defaults?: Row;
  addLabel?: string;
  extra?: (rows: Row[]) => React.ReactNode;
  below?: (rows: Row[]) => React.ReactNode;
  searchKeys?: string[];
  rowLink?: (row: Row) => string;
  backTo?: string;
  backLabel?: string;
  headExtra?: React.ReactNode;
}

const CrudPage = ({
  table,
  index,
  title,
  lede,
  columns,
  fields,
  filter,
  defaults,
  addLabel = 'Добавить',
  extra,
  below,
  searchKeys,
  rowLink,
  backTo,
  backLabel,
  headExtra,
}: CrudPageProps) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listRows(table);
    setRows(filter ? data.filter(filter) : data);
    setLoading(false);
  }, [table, filter]);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const visible = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    const keys = searchKeys || columns.map((c) => c.key);
    return rows.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [rows, query, searchKeys, columns]);

  const save = async (values: Row) => {
    const payload = { ...defaults, ...values };
    if (editing?.id) {
      await updateRow(table, { ...payload, id: editing.id });
      toast.success('Запись обновлена');
    } else {
      await createRow(table, payload);
      toast.success('Запись добавлена');
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  const archive = async (row: Row) => {
    await removeRow(table, Number(row.id));
    toast.success('Запись убрана в архив');
    load();
  };

  const cols: Column[] = [
    ...columns,
    {
      key: '__actions',
      label: '',
      width: '110px',
      render: (r) => (
        <button
          className="h-label underline"
          onClick={(e) => {
            e.stopPropagation();
            archive(r);
          }}
        >
          В архив
        </button>
      ),
    },
  ];

  return (
    <Layout
      index={index}
      title={title}
      lede={lede}
      action={
        <span className="flex flex-wrap gap-2">
          {headExtra}
          {backTo && (
            <button className="h-cta-ghost" onClick={() => navigate(backTo)}>
              {backLabel || 'Назад'}
            </button>
          )}
          <button
            className="h-cta"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            {addLabel}
          </button>
        </span>
      }
    >
      {extra?.(rows)}
      <div className={extra ? 'mt-8' : ''}>
        <SearchBar value={query} onChange={setQuery} count={visible.length} />
        <DataTable
          columns={cols}
          rows={visible}
          empty={loading ? 'Загружаем…' : 'Пока нет записей'}
          onRowClick={(r) => {
            if (rowLink) {
              navigate(rowLink(r));
              return;
            }
            setEditing(r);
            setOpen(true);
          }}
        />
      </div>

      {below?.(rows)}

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Редактировать' : addLabel}
        fields={fields}
        initial={editing}
        onSubmit={save}
      />
    </Layout>
  );
};

export default CrudPage;