import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import {
  BIOTECH_KINDS,
  BIOTECH_LABEL,
  BIOTECH_KIND,
  BIOTECH_STATUS,
  hoursText,
  LICENSE_NORMS,
  EMPTY_DONE,
  addWork,
  earnedLicenses,
  materialValue,
  MATERIAL_PRICES,
} from '@/lib/biotech';
import { money } from '@/lib/expenses';
import WorkPhotos from '@/components/app/WorkPhotos';
import BiotechContractDialog from '@/components/app/BiotechContractDialog';
import BioActDialog from '@/components/app/BioActDialog';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

const Biotech = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [guests, setGuests] = useState<Row[]>([]);
  const [locations, setLocations] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number | 'all'>(new Date().getFullYear());
  const [kind, setKind] = useState('');
  const [who, setWho] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [contract, setContract] = useState(false);
  const [act, setAct] = useState(false);
  const [docs, setDocs] = useState<Row[]>([]);
  const [photoCount, setPhotoCount] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [w, g, l, d, ph] = await Promise.all([
      listRows('biotech_works'),
      listRows('guests'),
      listRows('locations'),
      listRows('guest_docs'),
      listRows('work_photos'),
    ]);
    setRows(w);
    setGuests(g);
    setLocations(l);
    setDocs(d);
    const cnt: Record<string, number> = {};
    ph.forEach((x) => {
      const k = String(x.work_id);
      cnt[k] = (cnt[k] || 0) + 1;
    });
    setPhotoCount(cnt);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const years = useMemo(() => {
    const set = new Set<number>();
    rows.forEach((r) => {
      const y = Number(String(r.work_on || '').slice(0, 4));
      if (y) set.add(y);
    });
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [rows]);

  const inYear = useCallback(
    (r: Row) => year === 'all' || String(r.work_on || '').slice(0, 4) === String(year),
    [year],
  );

  const yearRows = useMemo(() => rows.filter(inYear), [rows, inYear]);

  const visible = useMemo(
    () =>
      yearRows.filter((r) => {
        const okKind = !kind || String(r.kind) === kind;
        const okWho = !who || String(r.guest_id || '') === who;
        return okKind && okWho;
      }),
    [yearRows, kind, who],
  );

  const byKind = useMemo(() => {
    const map: Record<string, { hours: number; qty: number; value: number }> = {};
    BIOTECH_KINDS.forEach((k) => {
      map[k.key] = { hours: 0, qty: 0, value: 0 };
    });
    yearRows.forEach((r) => {
      const k = String(r.kind);
      if (!map[k]) map[k] = { hours: 0, qty: 0, value: 0 };
      map[k].hours += Number(r.hours || 0);
      map[k].qty += Number(r.qty || 0);
      map[k].value += Number(r.value_rub || 0) || materialValue(k, r.qty);
    });
    return map;
  }, [yearRows]);

  const rowValue = useCallback(
    (r: Row) => Number(r.value_rub || 0) || materialValue(String(r.kind), r.qty),
    [],
  );

  const totals = useMemo(() => {
    const hours = yearRows.reduce((s, r) => s + Number(r.hours || 0), 0);
    const value = yearRows.reduce((s, r) => s + rowValue(r), 0);
    const people = new Set(
      yearRows.map((r) => String(r.guest_id || r.hunter_name || '')).filter(Boolean),
    ).size;
    return { hours, value, people, count: yearRows.length };
  }, [yearRows, rowValue]);

  const ranking = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        hours: number;
        value: number;
        club: boolean;
        done: typeof EMPTY_DONE;
        fuel: number;
        grain: number;
      }
    >();
    yearRows.forEach((r) => {
      const g = guests.find((x) => String(x.id) === String(r.guest_id));
      const name = String(g?.name || r.hunter_name || 'Без имени');
      const cur =
        map.get(name) ||
        {
          name,
          hours: 0,
          value: 0,
          club: Boolean(g?.club_member),
          done: EMPTY_DONE,
          fuel: 0,
          grain: 0,
        };
      const k = String(r.kind);
      cur.hours += Number(r.hours || 0);
      cur.value += rowValue(r);
      cur.done = addWork(cur.done, k, Number(r.qty || 0));
      if (k === 'fuel') cur.fuel += Number(r.qty || 0);
      if (k === 'grain') cur.grain += Number(r.qty || 0);
      map.set(name, cur);
    });
    return [...map.values()]
      .map((r) => ({ ...r, licenses: earnedLicenses(r.done) }))
      .sort((a, b) => b.hours - a.hours);
  }, [yearRows, guests, rowValue]);

  const fields: Field[] = useMemo(
    () => [
      {
        key: 'guest_id',
        label: 'Охотник',
        type: 'select',
        options: guests.map((g) => ({
          value: String(g.id),
          label: `${g.name}${g.club_member ? ' — клуб' : ''}`,
        })),
      },
      {
        key: 'kind',
        label: 'Вид помощи',
        type: 'select',
        options: BIOTECH_KINDS.map((k) => ({ value: k.key, label: k.label })),
      },
      { key: 'work_on', label: 'Дата', type: 'date' },
      { key: 'hours', label: 'Трудочасы', type: 'number' },
      { key: 'qty', label: 'Количество (литры, кг, га)', type: 'number' },
      { key: 'unit', label: 'Единица', placeholder: 'л, кг, га, шт' },
      {
        key: 'value_rub',
        label: 'Оценка в рублях — топливо 80 ₽/л, зерно 10 ₽/кг считается само',
        type: 'number',
      },
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
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: Object.entries(BIOTECH_STATUS).map(([value, label]) => ({ value, label })),
      },
      { key: 'note', label: 'Что сделано', type: 'textarea' },
      { key: 'photo_url', label: 'Фото', type: 'photo', folder: 'biotech' },
    ],
    [guests, locations],
  );

  const save = async (values: Row) => {
    const g = guests.find((x) => String(x.id) === String(values.guest_id));
    const auto = materialValue(String(values.kind), values.qty);
    const payload: Row = {
      ...values,
      guest_id: values.guest_id ? Number(values.guest_id) : null,
      location_id: values.location_id ? Number(values.location_id) : null,
      hunter_name: g ? String(g.name) : String(values.hunter_name || ''),
      hours: Number(values.hours || 0),
      qty: Number(values.qty || 0),
      value_rub: Number(values.value_rub || 0) || auto,
      work_on: String(values.work_on || today()),
      status: String(values.status || 'done'),
      unit: String(values.unit || BIOTECH_KIND(String(values.kind)).unit),
    };
    try {
      if (editing?.id) {
        await updateRow('biotech_works', { ...payload, id: editing.id });
        toast.success('Запись обновлена');
      } else {
        await createRow('biotech_works', payload);
        toast.success('Помощь учтена');
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  const drop = async (r: Row) => {
    try {
      await removeRow('biotech_works', Number(r.id));
      toast.success('Запись убрана в архив');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось убрать');
    }
  };

  const nameOf = (r: Row) => {
    const g = guests.find((x) => String(x.id) === String(r.guest_id));
    return String(g?.name || r.hunter_name || '—');
  };

  const placeOf = (r: Row) => {
    const l = locations.find((x) => String(x.id) === String(r.location_id));
    return String(l?.name || r.place || '—');
  };

  return (
    <Layout
      index="Раздел / Охотники · Биотехния"
      title="Охотники / биотехния"
      lede="Учёт помощи охотников хозяйству в трудочасах: топливо, зерно, посевы, ремонты, охоты."
      action={
        <span className="flex flex-wrap gap-2">
          <button className="h-cta-ghost" onClick={() => setContract(true)}>
            <Icon name="FileSignature" size={15} /> Сделать договор
          </button>
          <button className="h-cta-ghost" onClick={() => setAct(true)}>
            <Icon name="ClipboardCheck" size={15} /> Сделать акт
          </button>
          <button
            className="h-cta"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Icon name="Plus" size={15} /> Внести помощь
          </button>
        </span>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="h-label mr-1">Год</span>
        {['all', ...years].map((y) => (
          <button
            key={String(y)}
            onClick={() => setYear(y === 'all' ? 'all' : Number(y))}
            className="h-label px-2 py-1 border"
            style={{
              borderColor: '#e2e2df',
              background: String(year) === String(y) ? 'var(--hero-accent)' : '#fff',
              color: String(year) === String(y) ? 'var(--hero-accent-contrast)' : 'inherit',
            }}
          >
            {y === 'all' ? 'Все' : y}
          </button>
        ))}

        <select
          value={who}
          onChange={(e) => setWho(e.target.value)}
          className="h-label px-2 py-1 border bg-white ml-3"
          style={{ borderColor: '#e2e2df' }}
        >
          <option value="">Все охотники</option>
          {guests.map((g) => (
            <option key={String(g.id)} value={String(g.id)}>
              {String(g.name)}
            </option>
          ))}
        </select>
      </div>

      <div
        className="grid gap-px mb-3"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        <div className="bg-white px-4 py-3">
          <div className="h-label">Всего трудочасов</div>
          <div className="h-head text-[22px] mt-1">{hoursText(totals.hours)}</div>
        </div>
        <div className="bg-white px-4 py-3">
          <div className="h-label">Оценка помощи</div>
          <div className="h-head text-[22px] mt-1">{money(totals.value)}</div>
        </div>
        <div className="bg-white px-4 py-3">
          <div className="h-label">Участников</div>
          <div className="h-head text-[22px] mt-1">{totals.people}</div>
        </div>
        <div className="bg-white px-4 py-3">
          <div className="h-label">Записей</div>
          <div className="h-head text-[22px] mt-1">{totals.count}</div>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setKind('')}
          className="h-label px-2 py-1 border"
          style={{
            borderColor: '#e2e2df',
            background: !kind ? 'var(--hero-accent)' : '#fff',
            color: !kind ? 'var(--hero-accent-contrast)' : 'inherit',
          }}
        >
          Все виды
        </button>
        {BIOTECH_KINDS.map((k) => {
          const d = byKind[k.key] || { hours: 0, qty: 0, value: 0 };
          return (
            <button
              key={k.key}
              onClick={() => setKind(k.key)}
              className="h-label px-3 py-1 border flex items-center gap-2"
              style={{
                borderColor: '#e2e2df',
                background: kind === k.key ? 'var(--hero-accent)' : '#fff',
                color: kind === k.key ? 'var(--hero-accent-contrast)' : 'inherit',
              }}
            >
              <Icon name={k.icon} size={13} fallback="Circle" />
              {k.label}
              <span className="opacity-70">
                {k.material && d.qty > 0
                  ? `${d.qty.toLocaleString('ru-RU')} ${k.unit}`
                  : `${Math.round(d.hours)} ч`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border border-[#e2e2df] overflow-x-auto mb-10">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Дата</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[180px]">Охотник</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[160px]">Вид помощи</th>
              <th className="h-label text-left px-4 py-3 font-normal">Что сделано</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[150px]">Где</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Объём</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Часы</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[90px]" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const rid = Number(r.id);
              const expanded = openRow === rid;
              const nPhoto = photoCount[String(rid)] || 0;
              const contract = docs.find(
                (d) => String(d.guest_id) === String(r.guest_id) && !d.archived,
              );
              return (
              <React.Fragment key={String(r.id)}>
              <tr
                className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                onClick={() => setOpenRow(expanded ? null : rid)}
              >
                <td className="px-4 py-3 text-[0.68em] whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    <Icon
                      name={expanded ? 'ChevronDown' : 'ChevronRight'}
                      size={13}
                      className="opacity-50"
                    />
                    {String(r.work_on || '').slice(0, 10).split('-').reverse().join('.')}
                  </span>
                </td>
                <td className="px-4 py-3 text-[0.72em]">{nameOf(r)}</td>
                <td className="px-4 py-3 text-[0.68em]">
                  <span className="flex items-center gap-2">
                    <Icon name={BIOTECH_KIND(String(r.kind)).icon} size={13} fallback="Circle" />
                    {BIOTECH_LABEL(String(r.kind))}
                  </span>
                </td>
                <td className="px-4 py-3 text-[0.72em]">
                  {String(r.note || '—')}
                  {nPhoto > 0 && (
                    <span className="h-label ml-2 whitespace-nowrap opacity-70">
                      <Icon name="Image" size={11} className="inline mb-[2px]" /> {nPhoto}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[0.68em]">{placeOf(r)}</td>
                <td className="px-4 py-3 text-[0.68em] whitespace-nowrap">
                  {Number(r.qty || 0) > 0
                    ? `${Number(r.qty).toLocaleString('ru-RU')} ${String(r.unit || '')}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-[0.72em] whitespace-nowrap">
                  {Number(r.hours || 0) > 0 ? `${Number(r.hours)} ч` : '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    className="h-label underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(r);
                      setOpen(true);
                    }}
                  >
                    Изменить
                  </button>
                </td>
              </tr>

              {expanded && (
                <tr className="border-t border-[#e2e2df] bg-[var(--hero-surface)]">
                  <td colSpan={8} className="px-4 py-5">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {contract?.file_url && (
                        <a
                          className="h-cta-ghost"
                          href={String(contract.file_url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Icon name="FileText" size={14} />
                          Договор {String(contract.doc_no || '')}
                        </a>
                      )}
                      <button
                        className="h-cta-ghost"
                        onClick={() => {
                          setEditing(r);
                          setOpen(true);
                        }}
                      >
                        <Icon name="Pencil" size={14} /> Изменить запись
                      </button>
                      <button className="h-cta-ghost" onClick={() => drop(r)}>
                        В архив
                      </button>
                    </div>
                    <WorkPhotos
                      workId={rid}
                      defaultDate={String(r.work_on || '').slice(0, 10)}
                    />
                  </td>
                </tr>
              )}
              </React.Fragment>
              );
            })}
            {!visible.length && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center h-mono-cap text-[var(--hero-muted)]">
                  {loading ? 'Загружаем…' : 'Записей пока нет — нажмите «Внести помощь»'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {ranking.length > 0 && (
        <>
          <div className="h-head text-[22px] mb-1">Вклад охотников</div>
          <p className="h-label mb-3 leading-relaxed">
            Путёвки считаются по таблице №1 договора: кормушки или посев полей, плюс солонцы,
            плюс галечники — на каждую особь. Топливо и зерно идут в денежную оценку:
            топливо {MATERIAL_PRICES.fuel} ₽ за литр, зерно {MATERIAL_PRICES.grain} ₽ за кг.
          </p>
          <div className="border border-[#e2e2df] overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="bg-[var(--hero-surface)]">
                  <th className="h-label text-left px-4 py-2 font-normal w-[50px]">№</th>
                  <th className="h-label text-left px-4 py-2 font-normal">Охотник</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Трудочасы</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[130px]">Оценка</th>
                  <th className="h-label text-left px-4 py-2 font-normal">Заработал путёвок</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.name} className="border-t border-[#e2e2df] align-top">
                    <td className="px-4 py-2 text-[0.68em]">{i + 1}</td>
                    <td className="px-4 py-2 text-[0.72em]">
                      {r.name}
                      {r.club && (
                        <span className="h-chip h-chip-mark text-[0.9em] ml-2">клуб</span>
                      )}
                      <div className="h-label mt-1">
                        кормушки {r.done.feeder} · поля {r.done.fieldHa} га · солонцы{' '}
                        {r.done.salt} · галечники {r.done.gravel}
                      </div>
                      {(r.fuel > 0 || r.grain > 0) && (
                        <div className="h-label mt-1">
                          {r.fuel > 0 && `топливо ${r.fuel} л`}
                          {r.fuel > 0 && r.grain > 0 && ' · '}
                          {r.grain > 0 && `зерно ${r.grain} кг`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-[0.72em]">{hoursText(r.hours)}</td>
                    <td className="px-4 py-2 text-[0.72em]">{money(r.value)}</td>
                    <td className="px-4 py-2 text-[0.72em]">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {r.licenses.map((l) => (
                          <span
                            key={l.key}
                            className="text-[0.92em]"
                            style={{ color: l.count ? undefined : 'var(--hero-muted)' }}
                          >
                            {l.species}:{' '}
                            <b>{l.count ? `${l.count} шт` : 'нет'}</b>
                            {!l.count && l.ratio > 0 && (
                              <span className="h-label ml-1">
                                {Math.round(l.ratio * 100)}%
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 border border-[#e2e2df] overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="bg-[var(--hero-surface)]">
                  <th className="h-label text-left px-4 py-2 font-normal">
                    Норматив на одну особь
                  </th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[150px]">Кормушки</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[130px]">Поля, га</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Солонцы</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[120px]">Галечники</th>
                </tr>
              </thead>
              <tbody>
                {LICENSE_NORMS.map((n) => (
                  <tr key={n.key} className="border-t border-[#e2e2df]">
                    <td className="px-4 py-2 text-[0.72em]">{n.species}</td>
                    <td className="px-4 py-2 text-[0.72em]">{n.feeder || '—'}</td>
                    <td className="px-4 py-2 text-[0.72em]">{n.fieldHa || '—'}</td>
                    <td className="px-4 py-2 text-[0.72em]">{n.salt}</td>
                    <td className="px-4 py-2 text-[0.72em]">{n.gravel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <BiotechContractDialog open={contract} onOpenChange={setContract} guests={guests} />

      <BioActDialog
        open={act}
        onOpenChange={setAct}
        guests={guests}
        rows={rows}
        year={year}
      />

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Помощь хозяйству' : 'Новая запись помощи'}
        fields={fields}
        initial={editing || { work_on: today(), kind: 'biotech', status: 'done' }}
        onSubmit={save}
      />
    </Layout>
  );
};

export default Biotech;