import { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/app/Layout';
import DataTable, { Column } from '@/components/app/DataTable';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import { toast } from 'sonner';

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
}: CrudPageProps) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listRows(table);
    setRows(filter ? data.filter(filter) : data);
    setLoading(false);
  }, [table, filter]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <Layout
      index={index}
      title={title}
      lede={lede}
      action={
        <button
          className="h-cta"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          {addLabel}
        </button>
      }
    >
      {extra?.(rows)}
      <div className={extra ? 'mt-8' : ''}>
        <DataTable
          columns={columns}
          rows={rows}
          empty={loading ? 'Загружаем…' : 'Пока нет записей'}
          onRowClick={(r) => {
            setEditing(r);
            setOpen(true);
          }}
        />
      </div>

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
