import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import PermissionsDialog from '@/components/app/PermissionsDialog';
import { Row, listStaff, saveStaff } from '@/lib/api';
import { ROLES, SECTIONS, DEFAULT_PERMISSIONS, parsePermissions } from '@/lib/permissions';
import { toast } from 'sonner';

const describe = (row: Row) => {
  if (row.role === 'owner') return 'Все разделы';
  const saved = parsePermissions(row.permissions);
  const list = saved.length ? saved : DEFAULT_PERMISSIONS[String(row.role)] || [];
  if (!list.length) return 'Нет доступа';
  const names = SECTIONS.filter((s) => list.includes(s.key)).map((s) => s.label);
  return `${names.length} разд.: ${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''}`;
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
      lede="Кто заходит в базу, с какой ролью и к каким разделам имеет доступ."
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
          { key: 'login', label: 'Логин', width: '150px' },
          {
            key: 'role',
            label: 'Роль',
            width: '150px',
            render: (r) => ROLES[String(r.role)] || String(r.role),
          },
          { key: 'permissions', label: 'Доступ', render: describe },
          {
            key: 'active',
            label: 'Вход',
            width: '110px',
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

      <PermissionsDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSubmit={save}
      />
    </Layout>
  );
};

export default Staff;
