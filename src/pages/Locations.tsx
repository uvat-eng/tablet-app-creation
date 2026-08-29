import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import SearchBar from '@/components/app/SearchBar';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import {
  LOCATION_KINDS,
  KIND,
  STATUSES_FOR,
  STATUS_LABEL,
  money,
  parseCoords,
} from '@/lib/locationKinds';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { canEditMap } from '@/lib/permissions';

const makeFields = (kindKey?: string): Field[] => {
  const k = kindKey ? KIND(kindKey) : null;
  return [
    { key: 'name', label: 'Название или номер' },
    {
      key: 'kind',
      label: 'Направление',
      type: 'select',
      options: LOCATION_KINDS.map((x) => ({ value: x.key, label: x.label })),
    },
    { key: 'coords', label: 'Координаты', type: 'coords', placeholder: '56.550000, 68.650000' },
    { key: 'distance_km', label: 'Расстояние от базы, км', type: 'number' },
    { key: 'qty', label: `Количество${k ? `, ${k.unit}` : ''}`, type: 'number' },
    { key: 'unit', label: 'Единица', placeholder: k?.unit || 'шт' },
    { key: 'area_ha', label: 'Площадь, га', type: 'number' },
    { key: 'species', label: 'Виды зверя', placeholder: 'Лось, кабан, косуля' },
    { key: 'status', label: 'Состояние', type: 'select', options: STATUSES_FOR(kindKey || '') },
    { key: 'checked_on', label: 'Дата проверки', type: 'date' },
    { key: 'responsible', label: 'Ответственный' },
    { key: 'note', label: 'Заметка', type: 'textarea' },
    { key: 'photo_url', label: 'Фото', type: 'photo', folder: 'locations' },
  ];
};

const Locations = () => {
  const { user } = useAuth();
  const mayEdit = canEditMap(user);
  const { kind } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const [expenses, setExpenses] = useState<Row[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [locs, exp] = await Promise.all([listRows('locations'), listRows('expenses')]);
    setRows(locs);
    setExpenses(exp.filter((e) => e.location_id));
    setLoading(false);
  }, []);

  const costByLocation = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const k = String(e.location_id);
      map[k] = (map[k] || 0) + Number(e.total || 0);
    });
    return map;
  }, [expenses]);

  useEffect(() => {
    load();
  }, [load]);

  const byKind = useMemo(() => {
    const empty = () => ({ count: 0, qty: 0, area: 0, repair: 0, cost: 0 });
    const map: Record<string, ReturnType<typeof empty>> = {};
    LOCATION_KINDS.forEach((k) => {
      map[k.key] = empty();
    });
    rows.forEach((r) => {
      const k = String(r.kind || 'ground');
      if (!map[k]) map[k] = empty();
      map[k].count += 1;
      map[k].qty += Number(r.qty || 0);
      map[k].area += Number(r.area_ha || 0);
      map[k].cost += costByLocation[String(r.id)] || 0;
      if (r.status === 'repair') map[k].repair += 1;
    });
    return map;
  }, [rows, costByLocation]);

  const listForKind = useMemo(() => {
    if (!kind) return [];
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => String(r.kind || 'ground') === kind)
      .filter((r) =>
        q
          ? ['name', 'coords', 'species', 'responsible', 'note'].some((k) =>
              String(r[k] ?? '').toLowerCase().includes(q),
            )
          : true,
      );
  }, [rows, kind, query]);

  const save = async (values: Row) => {
    const { lat, lng } = parseCoords(values.coords);
    const payload: Row = {
      ...values,
      lat,
      lng,
      coords: lat && lng ? `${lat}, ${lng}` : String(values.coords || ''),
      kind: String(values.kind || kind || 'ground'),
      qty: Number(values.qty || 0),
      area_ha: Number(values.area_ha || 0),
      distance_km: Number(values.distance_km || 0),
      status: String(values.status || 'ok'),
      checked_on: String(values.checked_on || '').slice(0, 10) || null,
    };
    try {
      if (editing?.id) {
        await updateRow('locations', { ...payload, id: editing.id });
        toast.success('Запись обновлена');
      } else {
        await createRow('locations', payload);
        toast.success('Объект добавлен');
      }
      if (!lat || !lng) {
        toast.warning('Без координат объект не появится на общей карте', {
          description: 'Откройте запись и укажите GPS или отметьте точку кнопкой «На карте»',
        });
      }
    } catch (e) {
      toast.error('Не удалось сохранить', {
        description: e instanceof Error ? e.message : 'Проверьте числовые поля',
      });
      return;
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  if (kind) {
    const k = KIND(kind);
    const totalQty = listForKind.reduce((s, r) => s + Number(r.qty || 0), 0);
    const totalArea = listForKind.reduce((s, r) => s + Number(r.area_ha || 0), 0);
    return (
      <Layout
        index="Раздел / Локации"
        title={k.label}
        lede={k.hint}
        action={
          <span className="flex gap-2 no-print">
            <button className="h-cta-ghost" onClick={() => navigate('/locations')}>
              К сводке
            </button>
            <button className="h-cta-ghost" onClick={() => window.print()}>
              Печать
            </button>
            {mayEdit && (
              <button
                className="h-cta"
                onClick={() => {
                  setEditing({
                    kind,
                    qty: 1,
                    unit: k.unit,
                    status: 'ok',
                    checked_on: new Date().toISOString().slice(0, 10),
                  } as Row);
                  setOpen(true);
                }}
              >
                Добавить {k.single.toLowerCase()}
              </button>
            )}
          </span>
        }
      >
        <div className="no-print">
          <SearchBar
            value={query}
            onChange={setQuery}
            count={listForKind.length}
            placeholder="Поиск по ведомости"
          />
        </div>

        <div id="check-print" className="border border-[#e2e2df] overflow-x-auto bg-white">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="bg-[var(--hero-surface)]">
                <th className="h-label text-left px-4 py-3 font-normal w-[60px]">№</th>
                <th className="h-label text-left px-4 py-3 font-normal">Название</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[150px]">Координаты</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[100px]">Кол-во</th>
                {k.showArea && (
                  <th className="h-label text-left px-4 py-3 font-normal w-[100px]">Площадь, га</th>
                )}
                <th className="h-label text-left px-4 py-3 font-normal w-[130px]">Затраты</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[140px]">Состояние</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Проверено</th>
                <th className="h-label text-left px-4 py-3 font-normal w-[100px] no-print" />
              </tr>
            </thead>
            <tbody>
              {listForKind.map((r, i) => (
                <tr
                  key={String(r.id)}
                  className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                  onClick={() => navigate(`/locations/${kind}/${r.id}`)}
                >
                  <td className="px-4 py-3 text-[0.7em]">{i + 1}</td>
                  <td className="px-4 py-3 text-[0.72em]">
                    {String(r.name)}
                    {r.species && (
                      <span className="block text-[0.85em] text-[var(--hero-muted)]">
                        {String(r.species)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[0.65em]">
                    {r.lat && r.lng ? (
                      String(r.coords || `${r.lat}, ${r.lng}`)
                    ) : (
                      <span className="text-[var(--hero-muted)]">нет на карте</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[0.7em] whitespace-nowrap">
                    {Number(r.qty || 0).toLocaleString('ru-RU')} {String(r.unit || k.unit)}
                  </td>
                  {k.showArea && (
                    <td className="px-4 py-3 text-[0.7em]">
                      {Number(r.area_ha || 0).toLocaleString('ru-RU')}
                    </td>
                  )}
                  <td className="px-4 py-3 text-[0.72em] font-bold whitespace-nowrap">
                    {money(costByLocation[String(r.id)] || 0)}
                  </td>
                  <td className="px-4 py-3 text-[0.65em]">
                    <span
                      className="px-2 py-1"
                      style={{
                        background:
                          r.status === 'repair'
                            ? 'var(--hero-x-mark)'
                            : r.status === 'ok'
                              ? 'var(--hero-accent)'
                              : '#e2e2df',
                        color: r.status === 'repair' ? '#fff' : 'var(--hero-text)',
                      }}
                    >
                      {STATUS_LABEL(String(r.status))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[0.65em]">
                    {String(r.checked_on || '').slice(0, 10) || '—'}
                  </td>
                  <td className="px-4 py-3 no-print">
                    <span className="flex gap-3">
                      {mayEdit && (
                        <>
                          <button
                            className="h-label underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(r);
                              setOpen(true);
                            }}
                          >
                            Правка
                          </button>
                          <button
                            className="h-label underline"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await removeRow('locations', Number(r.id));
                              toast.success('Запись убрана в архив');
                              load();
                            }}
                          >
                            Архив
                          </button>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
              {!listForKind.length && (
                <tr>
                  <td
                    colSpan={k.showArea ? 9 : 8}
                    className="px-4 py-8 text-center h-mono-cap text-[var(--hero-muted)]"
                  >
                    {loading ? 'Загружаем…' : 'Записей пока нет'}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-black bg-[var(--hero-surface)]">
                <td className="px-4 py-3 h-label" colSpan={3}>
                  Итого
                </td>
                <td className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap">
                  {totalQty.toLocaleString('ru-RU')} {k.unit}
                </td>
                {k.showArea && (
                  <td className="px-4 py-3 text-[0.75em] font-bold">
                    {totalArea.toLocaleString('ru-RU')}
                  </td>
                )}
                <td className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap">
                  {money(
                    listForKind.reduce((s, r) => s + (costByLocation[String(r.id)] || 0), 0),
                  )}
                </td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>

        <RecordDialog
          open={open}
          onOpenChange={setOpen}
          title={editing?.id ? k.single : `Новый объект: ${k.single.toLowerCase()}`}
          fields={makeFields(kind)}
          initial={editing}
          onSubmit={save}
        />
      </Layout>
    );
  }

  const totalObjects = rows.length;
  const needRepair = rows.filter((r) => r.status === 'repair').length;

  return (
    <Layout
      index="Раздел / Локации"
      title="Локации"
      lede="Биотехния и инфраструктура угодий: вышки, кормушки, солонцы, просеки, посевы, вольер."
      action={
        mayEdit ? (
          <button
            className="h-cta"
            onClick={() => {
              setEditing({
                kind: 'tower',
                qty: 1,
                unit: 'шт',
                status: 'ok',
                checked_on: new Date().toISOString().slice(0, 10),
              } as Row);
              setOpen(true);
            }}
          >
            Добавить объект
          </button>
        ) : undefined
      }
    >
      <div
        className="grid gap-px mb-8"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        <div className="bg-white p-5">
          <div className="h-label">Всего объектов</div>
          <div className="h-head text-[28px] mt-2">{totalObjects}</div>
        </div>
        <div className="bg-white p-5">
          <div className="h-label">Требуют ремонта</div>
          <div className="h-head text-[28px] mt-2">{needRepair}</div>
        </div>
        <div className="bg-white p-5">
          <div className="h-label">Направлений</div>
          <div className="h-head text-[28px] mt-2">{LOCATION_KINDS.length}</div>
        </div>
      </div>

      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {LOCATION_KINDS.map((k) => {
          const d = byKind[k.key] || { count: 0, qty: 0, area: 0, repair: 0 };
          return (
            <button
              key={k.key}
              onClick={() => navigate(`/locations/${k.key}`)}
              className="bg-white p-5 text-left hover:bg-[var(--hero-surface)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon name={k.icon} size={16} fallback="MapPin" />
                <span className="h-label">{k.label}</span>
              </div>
              <div className="h-head text-[24px] mt-3">{d.count}</div>
              <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
                {k.showArea
                  ? `${d.area.toLocaleString('ru-RU')} га`
                  : `${d.qty.toLocaleString('ru-RU')} ${k.unit}`}
                {d.repair > 0 && ` · ${d.repair} на ремонт`}
              </div>
              <div className="h-label mt-2">Затраты: {money(d.cost)}</div>
            </button>
          );
        })}
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Объект' : 'Новый объект'}
        fields={makeFields(String(editing?.kind || 'tower'))}
        initial={editing}
        onSubmit={save}
      />
    </Layout>
  );
};

export default Locations;