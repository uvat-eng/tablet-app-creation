import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import { HUNT_CATEGORIES, HUNT_CATEGORY_LABEL, money, RECEIPT_FIELD } from '@/lib/expenses';
import ReceiptLink from '@/components/app/ReceiptLink';
import { toast } from 'sonner';

const FIELDS: Field[] = [
  { key: 'name', label: 'Наименование' },
  {
    key: 'category',
    label: 'Статья',
    type: 'select',
    options: HUNT_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
  },
  { key: 'unit_price', label: 'Сумма за ед., ₽', type: 'number' },
  { key: 'qty', label: 'Количество', type: 'number' },
  { key: 'unit', label: 'Единица', placeholder: 'шт, л, кг, компл' },
  { key: 'spent_on', label: 'Дата', type: 'date' },
  { key: 'vendor', label: 'Поставщик / магазин' },
  { key: 'note', label: 'Примечание', type: 'textarea' },
  RECEIPT_FIELD,
];

const ExpenseAct = () => {
  const { id } = useParams();
  const [act, setAct] = useState<Row | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [acts, exp] = await Promise.all([listRows('checks'), listRows('expenses')]);
    setAct(acts.find((a) => String(a.id) === id) || null);
    setRows(exp.filter((e) => String(e.check_id) === id));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    HUNT_CATEGORIES.forEach((c) => {
      map[c.key] = 0;
    });
    rows.forEach((r) => {
      const k = String(r.category || 'other');
      map[k] = (map[k] || 0) + Number(r.total || 0);
    });
    return map;
  }, [rows]);

  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  const income = Number(act?.final_total || 0);

  const save = async (values: Row) => {
    const unitPrice = Number(values.unit_price || 0);
    const qty = Number(values.qty || 0);
    const payload: Row = {
      ...values,
      kind: 'hunt',
      check_id: Number(id),
      booking_id: act?.booking_id ? Number(act.booking_id) : null,
      category: String(values.category || 'other'),
      unit_price: unitPrice,
      qty,
      total: Math.round(unitPrice * qty * 100) / 100,
      spent_on: String(values.spent_on || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
    };
    if (editing?.id) {
      await updateRow('expenses', { ...payload, id: editing.id });
      toast.success('Запись обновлена');
    } else {
      await createRow('expenses', payload);
      toast.success('Расход добавлен');
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  if (loading) {
    return (
      <Layout index="Раздел / Документы" title="Акт о расходах">
        <div className="h-mono-cap">Загружаем…</div>
      </Layout>
    );
  }

  return (
    <Layout
      index="Раздел / Документы"
      title={`Акт о расходах к акту № ${id}`}
      lede={
        act
          ? `${act.guest_name || 'Без имени'} · ${String(act.date_from || '')} — ${String(act.date_to || '')}`
          : 'Акт не найден'
      }
      action={
        <span className="flex gap-2 no-print">
          <Link className="h-cta-ghost" to={`/documents/act/${id}`}>
            К акту охоты
          </Link>
          <button className="h-cta-ghost" onClick={() => window.print()}>
            Скачать PDF
          </button>
          <button
            className="h-cta"
            onClick={() => {
              setEditing({
                category: 'food',
                qty: 1,
                unit: 'шт',
                spent_on: new Date().toISOString().slice(0, 10),
              } as Row);
              setOpen(true);
            }}
          >
            Добавить расход
          </button>
        </span>
      }
    >
      <div
        className="grid gap-px mb-8"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {[
          { l: 'Поступление по акту', v: money(income) },
          { l: 'Расходы на охоту', v: money(total) },
          { l: 'Остаток', v: money(income - total) },
        ].map((s) => (
          <div key={s.l} className="bg-white p-5">
            <div className="h-label">{s.l}</div>
            <div className="h-head text-[22px] mt-2 whitespace-nowrap">{s.v}</div>
          </div>
        ))}
      </div>

      <div id="check-print" className="border border-[#e2e2df] bg-white p-6">
        <div className="text-center mb-6">
          <div className="h-head text-[22px]">Акт о расходах № {id}</div>
          <div className="h-label mt-1">
            Охотничье хозяйство «Малышенское» · {String(act?.guest_name || '')}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-[var(--hero-surface)]">
                <th className="h-label text-left px-3 py-2 font-normal w-[60px]">№ п/п</th>
                <th className="h-label text-left px-3 py-2 font-normal w-[150px]">Статья</th>
                <th className="h-label text-left px-3 py-2 font-normal">Наименование</th>
                <th className="h-label text-left px-3 py-2 font-normal w-[120px]">Сумма за ед.</th>
                <th className="h-label text-left px-3 py-2 font-normal w-[100px]">Кол-во</th>
                <th className="h-label text-left px-3 py-2 font-normal w-[130px]">Итого, руб.</th>
                <th className="h-label text-left px-3 py-2 font-normal w-[100px] no-print" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={String(r.id)}
                  className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  <td className="px-3 py-2 text-[0.7em]">{i + 1}</td>
                  <td className="px-3 py-2 text-[0.68em]">
                    {HUNT_CATEGORY_LABEL(String(r.category))}
                  </td>
                  <td className="px-3 py-2 text-[0.72em]">
                    {String(r.name)}
                    {r.vendor && (
                      <span className="block text-[0.85em] text-[var(--hero-muted)]">
                        {String(r.vendor)}
                      </span>
                    )}
                    {r.receipt_url && (
                      <span className="block mt-1">
                        <ReceiptLink url={r.receipt_url} />
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[0.7em] whitespace-nowrap">
                    {money(r.unit_price)}
                  </td>
                  <td className="px-3 py-2 text-[0.7em]">
                    {Number(r.qty || 0).toLocaleString('ru-RU')} {String(r.unit || '')}
                  </td>
                  <td className="px-3 py-2 text-[0.74em] font-bold whitespace-nowrap">
                    {money(r.total)}
                  </td>
                  <td className="px-3 py-2 no-print">
                    <button
                      className="h-label underline"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await removeRow('expenses', Number(r.id));
                        toast.success('Расход убран в архив');
                        load();
                      }}
                    >
                      В архив
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center h-mono-cap text-[var(--hero-muted)]">
                    Расходов пока нет
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-black bg-[var(--hero-surface)]">
                <td className="px-3 py-3 h-label" colSpan={5}>
                  Итого расходов
                </td>
                <td className="px-3 py-3 h-head text-[16px] whitespace-nowrap" colSpan={2}>
                  {money(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-2 text-[0.7em]">
          <div className="h-label mb-1">В том числе по статьям</div>
          {HUNT_CATEGORIES.map((c) => (
            <div key={c.key} className="flex justify-between border-b border-[#e2e2df] pb-1">
              <span>{c.label}</span>
              <span className="font-bold">{money(byCategory[c.key] || 0)}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 text-[0.72em]">
          {[
            { l: 'Расход произвёл:', v: act?.calculated_by },
            { l: 'Проверил:', v: act?.hunted_by },
          ].map((s) => (
            <div key={s.l} className="flex gap-6 items-end">
              <span className="w-[160px]">{s.l}</span>
              <span className="flex-1 border-b border-black max-w-[220px]" />
              <span>{String(s.v || '')}</span>
            </div>
          ))}
        </div>
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Редактировать расход' : 'Добавить расход'}
        fields={FIELDS}
        initial={editing}
        onSubmit={save}
      />
    </Layout>
  );
};

export default ExpenseAct;