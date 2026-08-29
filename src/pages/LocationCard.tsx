import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import {
  KIND,
  STATUSES_FOR,
  STATUS_LABEL,
  COST_LABEL,
  money,
  parseCoords,
} from '@/lib/locationKinds';
import { RECEIPT_FIELD } from '@/lib/expenses';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { canEditMap } from '@/lib/permissions';

const LocationCard = () => {
  const { user } = useAuth();
  const mayEdit = canEditMap(user);
  const { kind = 'tower', id } = useParams();
  const navigate = useNavigate();
  const k = KIND(kind);
  const [item, setItem] = useState<Row | null>(null);
  const [costs, setCosts] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [locs, exp] = await Promise.all([listRows('locations'), listRows('expenses')]);
    setItem(locs.find((l) => String(l.id) === id) || null);
    setCosts(exp.filter((e) => String(e.location_id) === id));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const byCost = useMemo(() => {
    const map: Record<string, number> = {};
    k.costs.forEach((c) => {
      map[c.key] = 0;
    });
    costs.forEach((e) => {
      const key = String(e.category || 'other');
      map[key] = (map[key] || 0) + Number(e.total || 0);
    });
    return map;
  }, [costs, k]);

  const total = costs.reduce((s, e) => s + Number(e.total || 0), 0);

  const infoFields: Field[] = useMemo(() => {
    const base: Field[] = [
      { key: 'name', label: 'Название' },
      { key: 'coords', label: 'GPS координаты', placeholder: '57.12345, 68.45678' },
      { key: 'note', label: 'Краткое описание', type: 'textarea' },
      { key: 'status', label: 'Состояние', type: 'select', options: STATUSES_FOR(k.key) },
      { key: 'checked_on', label: 'Дата проверки', type: 'date' },
      { key: 'responsible', label: 'Ответственный' },
    ];
    if (k.showArea) base.splice(2, 0, { key: 'area_ha', label: 'Площадь, га', type: 'number' });
    else base.splice(2, 0, { key: 'qty', label: `Количество, ${k.unit}`, type: 'number' });
    if (k.extra?.includes('seed')) {
      base.splice(3, 0, { key: 'seed_type', label: 'Вид зерна', placeholder: 'Овёс, ячмень…' });
      base.splice(4, 0, { key: 'sow_date', label: 'Дата посева', type: 'date' });
    }
    if (k.extra?.includes('stock')) {
      base.splice(3, 0, { key: 'boars', label: 'Поголовье кабанов', type: 'number' });
      base.splice(4, 0, { key: 'roes', label: 'Поголовье косуль', type: 'number' });
    }
    return [
      ...base,
      { key: 'photo_url', label: 'Фото 1', type: 'photo', folder: 'locations' },
      { key: 'photo_url2', label: 'Фото 2', type: 'photo', folder: 'locations' },
      { key: 'photo_url3', label: 'Фото 3', type: 'photo', folder: 'locations' },
    ];
  }, [k]);

  const costFields: Field[] = useMemo(
    () => [
      { key: 'name', label: 'Наименование' },
      {
        key: 'category',
        label: 'Статья затрат',
        type: 'select',
        options: k.costs.map((c) => ({ value: c.key, label: c.label })),
      },
      { key: 'unit_price', label: 'Сумма за ед., ₽', type: 'number' },
      { key: 'qty', label: 'Количество', type: 'number' },
      { key: 'unit', label: 'Единица', placeholder: 'шт, л, кг, т, чел/дн' },
      { key: 'spent_on', label: 'Дата', type: 'date' },
      { key: 'vendor', label: 'Поставщик / исполнитель' },
      { key: 'note', label: 'Примечание', type: 'textarea' },
      RECEIPT_FIELD,
    ],
    [k],
  );

  const saveInfo = async (values: Row) => {
    const { lat, lng } = parseCoords(values.coords);
    await updateRow('locations', {
      ...values,
      id: Number(id),
      kind,
      lat,
      lng,
      coords: lat && lng ? `${lat}, ${lng}` : String(values.coords || ''),
      qty: Number(values.qty || 0),
      area_ha: Number(values.area_ha || 0),
      boars: Number(values.boars || 0),
      roes: Number(values.roes || 0),
      checked_on: String(values.checked_on || '').slice(0, 10) || null,
      sow_date: String(values.sow_date || '').slice(0, 10) || null,
    });
    toast.success('Сохранено');
    setEditOpen(false);
    load();
  };

  const saveCost = async (values: Row) => {
    const unitPrice = Number(values.unit_price || 0);
    const qty = Number(values.qty || 0);
    const payload: Row = {
      ...values,
      kind: 'location',
      location_id: Number(id),
      category: String(values.category || 'other'),
      unit_price: unitPrice,
      qty,
      total: Math.round(unitPrice * qty * 100) / 100,
      spent_on: String(values.spent_on || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
    };
    if (editingCost?.id) {
      await updateRow('expenses', { ...payload, id: editingCost.id });
      toast.success('Затрата обновлена');
    } else {
      await createRow('expenses', payload);
      toast.success('Затрата добавлена');
    }
    setCostOpen(false);
    setEditingCost(null);
    load();
  };

  if (loading) {
    return (
      <Layout index="Раздел / Локации" title={k.single}>
        <div className="h-mono-cap">Загружаем…</div>
      </Layout>
    );
  }

  if (!item) {
    return (
      <Layout index="Раздел / Локации" title="Объект не найден">
        <button className="h-cta" onClick={() => navigate(`/locations/${kind}`)}>
          К списку
        </button>
      </Layout>
    );
  }

  const photos = [item.photo_url, item.photo_url2, item.photo_url3].filter(Boolean);
  const feedRows = costs.filter((c) => String(c.category) === 'feed');
  const feedTons = feedRows.reduce((s, c) => s + Number(c.qty || 0), 0);

  const stats: { l: string; v: string }[] = [
    { l: 'Координаты', v: String(item.coords || '—') },
    k.showArea
      ? { l: 'Площадь', v: `${Number(item.area_ha || 0).toLocaleString('ru-RU')} га` }
      : { l: 'Количество', v: `${Number(item.qty || 0).toLocaleString('ru-RU')} ${item.unit || k.unit}` },
    { l: 'Состояние', v: STATUS_LABEL(String(item.status)) },
    { l: 'Затраты всего', v: money(total) },
  ];

  if (k.extra?.includes('seed')) {
    stats.splice(2, 0, { l: 'Вид зерна', v: String(item.seed_type || '—') });
    stats.splice(3, 0, { l: 'Дата посева', v: String(item.sow_date || '').slice(0, 10) || '—' });
  }
  if (k.extra?.includes('stock')) {
    stats.splice(2, 0, { l: 'Кабаны', v: `${Number(item.boars || 0)} голов` });
    stats.splice(3, 0, { l: 'Косули', v: `${Number(item.roes || 0)} голов` });
  }
  if (k.extra?.includes('feed')) {
    stats.push({ l: 'Корм закуплено', v: `${feedTons.toLocaleString('ru-RU')} т` });
  }

  return (
    <Layout
      index={`Локации / ${k.label}`}
      title={String(item.name)}
      lede={String(item.note || k.hint)}
      action={
        <span className="flex gap-2 no-print">
          <button className="h-cta-ghost" onClick={() => navigate(`/locations/${kind}`)}>
            К списку
          </button>
          {mayEdit && (
            <>
          <button className="h-cta-ghost" onClick={() => setEditOpen(true)}>
            Редактировать
          </button>
          <button
            className="h-cta"
            onClick={() => {
              setEditingCost({
                category: k.costs[0].key,
                qty: 1,
                unit: 'шт',
                spent_on: new Date().toISOString().slice(0, 10),
              } as Row);
              setCostOpen(true);
            }}
          >
            Добавить затрату
          </button>
            </>
          )}
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
        {stats.map((s) => (
          <div key={s.l} className="bg-white p-5">
            <div className="h-label">{s.l}</div>
            <div className="h-head text-[19px] mt-2 break-words">{s.v}</div>
          </div>
        ))}
      </div>

      {photos.length > 0 && (
        <div
          className="grid gap-3 mb-8"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {photos.map((p) => (
            <img
              key={String(p)}
              src={String(p)}
              alt=""
              className="w-full h-[200px] object-cover border border-[#e2e2df]"
            />
          ))}
        </div>
      )}

      <div className="h-head text-[20px] mb-3">Затраты по статьям</div>
      <div
        className="grid gap-px mb-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {k.costs.map((c) => (
          <div key={c.key} className="bg-white p-4">
            <div className="h-label">{c.label}</div>
            <div className="h-head text-[17px] mt-2 whitespace-nowrap">
              {money(byCost[c.key] || 0)}
            </div>
          </div>
        ))}
        <div className="bg-white p-4">
          <div className="h-label">Итого</div>
          <div className="h-head text-[17px] mt-2 whitespace-nowrap">{money(total)}</div>
        </div>
      </div>

      <div className="border border-[#e2e2df] overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-3 font-normal w-[60px]">№</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Дата</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[150px]">Статья</th>
              <th className="h-label text-left px-4 py-3 font-normal">Наименование</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[120px]">Цена за ед.</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[100px]">Кол-во</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[130px]">Итого</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[100px] no-print" />
            </tr>
          </thead>
          <tbody>
            {costs.map((e, i) => (
              <tr
                key={String(e.id)}
                className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                onClick={() => {
                  setEditingCost(e);
                  setCostOpen(true);
                }}
              >
                <td className="px-4 py-3 text-[0.7em]">{i + 1}</td>
                <td className="px-4 py-3 text-[0.66em]">{String(e.spent_on || '').slice(0, 10)}</td>
                <td className="px-4 py-3 text-[0.66em]">
                  {COST_LABEL(kind, String(e.category))}
                </td>
                <td className="px-4 py-3 text-[0.72em]">
                  {String(e.name)}
                  {e.vendor && (
                    <span className="block text-[0.85em] text-[var(--hero-muted)]">
                      {String(e.vendor)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[0.7em] whitespace-nowrap">{money(e.unit_price)}</td>
                <td className="px-4 py-3 text-[0.7em]">
                  {Number(e.qty || 0).toLocaleString('ru-RU')} {String(e.unit || '')}
                </td>
                <td className="px-4 py-3 text-[0.74em] font-bold whitespace-nowrap">
                  {money(e.total)}
                </td>
                <td className="px-4 py-3 no-print">
                  <button
                    className="h-label underline"
                    onClick={async (ev) => {
                      ev.stopPropagation();
                      await removeRow('expenses', Number(e.id));
                      toast.success('Затрата убрана в архив');
                      load();
                    }}
                  >
                    В архив
                  </button>
                </td>
              </tr>
            ))}
            {!costs.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center h-mono-cap text-[var(--hero-muted)]">
                  Затрат пока нет
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-black bg-[var(--hero-surface)]">
              <td className="px-4 py-3 h-label" colSpan={6}>
                Итого затрат
              </td>
              <td className="px-4 py-3 h-head text-[16px] whitespace-nowrap" colSpan={2}>
                {money(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <RecordDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={`${k.single}: данные`}
        fields={infoFields}
        initial={item}
        onSubmit={saveInfo}
      />

      <RecordDialog
        open={costOpen}
        onOpenChange={setCostOpen}
        title={editingCost?.id ? 'Затрата' : 'Новая затрата'}
        fields={costFields}
        initial={editingCost}
        onSubmit={saveCost}
      />
    </Layout>
  );
};

export default LocationCard;