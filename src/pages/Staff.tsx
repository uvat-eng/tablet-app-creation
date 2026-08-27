import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import RecordDialog from '@/components/app/RecordDialog';
import { Row, listStaff, saveStaff } from '@/lib/api';
import { toast } from 'sonner';

const ROLES: Record<string, string> = {
  owner: 'Владелец',
  manager: 'Администратор',
  staff: 'Егерь',
};

const Staff = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await listStaff());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (values: Row) => {
    try {
      if (editing?.id) {
        await saveStaff({ ...values, id: editing.id }, 'PUT');
        toast.success('Сотрудник обновлён');
      } else {
        await saveStaff(values, 'POST');
        toast.success('Сотрудник добавлен');
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка сохранения');
    }
  };

  return (
    <Layout
      index="Раздел / Сотрудники"
      title="Сотрудники"
      lede="Доступ к базе: кто входит и с какими правами."
      action={
        <button
          className="h-cta"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Добавить сотрудника
        </button>
      }
    >
      <DataTable
        columns={[
          { key: 'name', label: 'Имя' },
          { key: 'login', label: 'Логин', width: '160px' },
          {
            key: 'role',
            label: 'Права',
            width: '160px',
            render: (r) => ROLES[String(r.role)] || String(r.role),
          },
          {
            key: 'active',
            label: 'Доступ',
            width: '120px',
            render: (r) => (r.active ? 'Открыт' : 'Закрыт'),
          },
        ]}
        rows={rows}
        empty={loading ? 'Загружаем…' : 'Сотрудников нет'}
        onRowClick={(r) => {
          setEditing(r);
          setOpen(true);
        }}
      />

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Сотрудник' : 'Новый сотрудник'}
        initial={editing}
        onSubmit={save}
        fields={[
          { key: 'name', label: 'Имя' },
          ...(editing?.id ? [] : [{ key: 'login', label: 'Логин (латиницей)' }]),
          {
            key: 'password',
            label: editing?.id ? 'Новый пароль (если меняем)' : 'Пароль',
          },
          {
            key: 'role',
            label: 'Права',
            type: 'select' as const,
            options: Object.entries(ROLES).map(([value, label]) => ({ value, label })),
          },
          ...(editing?.id
            ? [{ key: 'active', label: 'Доступ открыт', type: 'checkbox' as const }]
            : []),
        ]}
      />
    </Layout>
  );
};

export default Staff;
