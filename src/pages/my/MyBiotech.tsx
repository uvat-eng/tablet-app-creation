import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import {
  BIOTECH_KINDS,
  BIOTECH_LABEL,
  BIOTECH_KIND,
  hoursText,
  materialValue,
} from '@/lib/biotech';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

const today = () => new Date().toISOString().slice(0, 10);

const MyBiotech = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [locations, setLocations] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [w, l] = await Promise.all([listRows('biotech_works', { mine: true }), listRows('locations')]);
    setRows(w);
    setLocations(l);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const totals = useMemo(() => {
    const hours = rows.reduce((s, r) => s + Number(r.hours || 0), 0);
    const value = rows.reduce(
      (s, r) => s + (Number(r.value_rub || 0) || materialValue(String(r.kind), r.qty)),
      0,
    );
    return { hours, value };
  }, [rows]);

  const fields: Field[] = useMemo(
    () => [
      {
        key: 'kind',
        label: 'Что делали',
        type: 'select',
        options: BIOTECH_KINDS.map((k) => ({ value: k.key, label: k.label })),
      },
      { key: 'work_on', label: 'Дата', type: 'date' },
      { key: 'qty', label: 'Количество (шт, га, л, кг)', type: 'number' },
      { key: 'hours', label: 'Сколько часов', type: 'number' },
      {
        key: 'location_id',
        label: 'Локация',
        type: 'select',
        options: [
          { value: '', label: 'Не указана' },
          ...locations.map((l) => ({ value: String(l.id), label: String(l.name) })),
        ],
      },
      { key: 'place', label: 'Место (если не из списка)' },
      { key: 'note', label: 'Что именно сделано', type: 'textarea' },
      { key: 'photo_url', label: 'Фото работы', type: 'photo', folder: 'biotech' },
    ],
    [locations],
  );

  const save = async (values: Row) => {
    const payload: Row = {
      ...values,
      location_id: values.location_id ? Number(values.location_id) : null,
      hours: Number(values.hours || 0),
      qty: Number(values.qty || 0),
      value_rub: Number(values.value_rub || 0) || materialValue(String(values.kind), values.qty),
      work_on: String(values.work_on || today()),
      status: 'done',
      unit: String(values.unit || BIOTECH_KIND(String(values.kind)).unit),
    };
    try {
      if (editing?.id) {
        await updateRow('biotech_works', { ...payload, id: editing.id }, true);
        toast.success('Запись обновлена');
      } else {
        await createRow('biotech_works', payload, true);
        toast.success('Работа записана — хозяйство её увидит');
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  const placeOf = (r: Row) => {
    const l = locations.find((x) => String(x.id) === String(r.location_id));
    return String(l?.name || r.place || '—');
  };

  return (
    <Layout
      index="Кабинет / Биотехния"
      title="Моя биотехния"
      lede="Записывайте выполненные работы — они пойдут в зачёт путёвок."
      action={
        <button
          className="h-cta"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Icon name="Plus" size={15} /> Внести работу
        </button>
      }
    >
      <div
        className="grid gap-px mb-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        <div className="bg-white p-5">
          <div className="h-label">Всего работ</div>
          <div className="h-head text-[22px] mt-2">{rows.length}</div>
        </div>
        <div className="bg-white p-5">
          <div className="h-label">Отработано</div>
          <div className="h-head text-[22px] mt-2">{hoursText(totals.hours)}</div>
        </div>
        <div className="bg-white p-5">
          <div className="h-label">Оценка вклада</div>
          <div className="h-head text-[22px] mt-2">
            {totals.value.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      </div>

      <div className="border border-[#e2e2df] overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Дата</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[170px]">Что делали</th>
              <th className="h-label text-left px-4 py-2 font-normal">Описание</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[150px]">Где</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[90px]">Объём</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[90px]">Часы</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={String(r.id)}
                className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                onClick={() => {
                  setEditing(r);
                  setOpen(true);
                }}
              >
                <td className="px-4 py-2 text-[0.68em]">
                  {String(r.work_on || '').slice(0, 10)}
                </td>
                <td className="px-4 py-2 text-[0.72em]">{BIOTECH_LABEL(String(r.kind))}</td>
                <td className="px-4 py-2 text-[0.7em]">{String(r.note || '—')}</td>
                <td className="px-4 py-2 text-[0.68em]">{placeOf(r)}</td>
                <td className="px-4 py-2 text-[0.68em]">
                  {Number(r.qty || 0) ? `${r.qty} ${r.unit || ''}` : '—'}
                </td>
                <td className="px-4 py-2 text-[0.68em]">
                  {Number(r.hours || 0) ? `${r.hours} ч` : '—'}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center h-mono-cap text-[var(--hero-muted)]"
                >
                  {loading ? 'Загружаем…' : 'Пока пусто — нажмите «Внести работу»'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Правка работы' : 'Новая работа'}
        fields={fields}
        initial={editing || { work_on: today(), kind: 'salt' }}
        onSubmit={save}
      />
    </Layout>
  );
};

export default MyBiotech;
