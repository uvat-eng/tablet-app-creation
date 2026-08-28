import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import SearchBar from '@/components/app/SearchBar';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import { money, CALC_LABELS, GROUP_LABELS } from '@/lib/price';
import { toast } from 'sonner';

const FIELDS: Field[] = [
  { key: 'name', label: 'Название' },
  { key: 'category', label: 'Категория', placeholder: 'Размещение, Лицензии, Трофеи…' },
  { key: 'price', label: 'Цена, ₽', type: 'number' },
  { key: 'unit', label: 'Единица', placeholder: 'чел/сутки, особь, час, шт' },
  {
    key: 'calc_mode',
    label: 'Как считать в чеке',
    type: 'select',
    options: [
      { value: 'perDayPerHunter', label: 'Тариф × дни × охотники' },
      { value: 'perHunter', label: 'Тариф × количество' },
      { value: 'flat', label: 'Фиксированная сумма' },
    ],
  },
  {
    key: 'price_group',
    label: 'Блок в чеке',
    type: 'select',
    options: [
      { value: 'stay', label: 'Размещение' },
      { value: 'license', label: 'Лицензии' },
      { value: 'extra', label: 'Доп. услуги' },
    ],
  },
  { key: 'sort_order', label: 'Порядок', type: 'number' },
  { key: 'season', label: 'Период действия', placeholder: '20.08.2025 — 20.08.2026' },
  { key: 'note', label: 'Примечание', type: 'textarea' },
  { key: 'in_check', label: 'Показывать в чеке', type: 'checkbox' },
];

const Services = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

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
    if (!q) return rows;
    return rows.filter((r) =>
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

  const save = async (values: Row) => {
    const payload: Row = {
      ...values,
      price: Number(values.price || 0),
      sort_order: Number(values.sort_order || 100),
      in_check: values.in_check === undefined ? true : Boolean(values.in_check),
      active: true,
    };
    if (editing?.id) {
      await updateRow('services', { ...payload, id: editing.id });
      toast.success('Позиция обновлена');
    } else {
      await createRow('services', payload);
      toast.success('Позиция добавлена');
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  return (
    <Layout
      index="Раздел / Услуги"
      title="Прайс-лист"
      lede={
        season
          ? `Услуги охотничьего хозяйства «Малышенское». Период ${season}.`
          : 'Услуги охотничьего хозяйства «Малышенское».'
      }
      action={
        <span className="flex gap-2 no-print">
          <button className="h-cta-ghost" onClick={() => window.print()}>
            Печать / PDF
          </button>
          <button
            className="h-cta"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Добавить позицию
          </button>
        </span>
      }
    >
      <div className="no-print">
        <SearchBar value={query} onChange={setQuery} count={visible.length} placeholder="Поиск по прайсу" />
      </div>

      {loading && <div className="h-mono-cap">Загружаем…</div>}

      <div className="grid gap-8">
        {groups.map(([category, list]) => (
          <div key={category}>
            <div className="h-head text-[19px] mb-3">{category}</div>
            <div className="border border-[#e2e2df] overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="bg-[var(--hero-surface)]">
                    <th className="h-label text-left px-4 py-3 font-normal">Наименование</th>
                    <th className="h-label text-left px-4 py-3 font-normal w-[130px]">Прайс</th>
                    <th className="h-label text-left px-4 py-3 font-normal w-[120px]">Ед.</th>
                    <th className="h-label text-left px-4 py-3 font-normal">Примечание</th>
                    <th className="h-label text-left px-4 py-3 font-normal w-[150px] no-print">
                      В чеке
                    </th>
                    <th className="h-label text-left px-4 py-3 font-normal w-[110px] no-print" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr
                      key={String(r.id)}
                      className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                      onClick={() => {
                        setEditing(r);
                        setOpen(true);
                      }}
                    >
                      <td className="px-4 py-3 text-[0.72em]">{String(r.name)}</td>
                      <td className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap">
                        {money(r.price)}
                      </td>
                      <td className="px-4 py-3 text-[0.68em]">{String(r.unit || '—')}</td>
                      <td className="px-4 py-3 text-[0.64em] text-[var(--hero-muted)]">
                        {String(r.note || '')}
                      </td>
                      <td className="px-4 py-3 text-[0.6em] no-print">
                        {r.in_check === false ? (
                          <span className="text-[var(--hero-muted)]">не участвует</span>
                        ) : (
                          <>
                            {GROUP_LABELS[String(r.price_group)] || '—'}
                            <br />
                            <span className="text-[var(--hero-muted)]">
                              {CALC_LABELS[String(r.calc_mode)] || ''}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 no-print">
                        <button
                          className="h-label underline"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await removeRow('services', Number(r.id));
                            toast.success('Позиция убрана в архив');
                            load();
                          }}
                        >
                          В архив
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Редактировать позицию' : 'Добавить позицию'}
        fields={FIELDS}
        initial={editing}
        onSubmit={save}
      />
    </Layout>
  );
};

export default Services;
