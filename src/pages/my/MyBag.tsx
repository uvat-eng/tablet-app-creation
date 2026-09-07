import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import { SPECIES, SPECIES_LABEL } from '@/lib/species';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

const MyBag = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [locations, setLocations] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, l] = await Promise.all([listRows('hunter_bag', { mine: true }), listRows('locations')]);
    setRows(b);
    setLocations(l);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bySpecies = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const k = String(r.species || 'other');
      map[k] = (map[k] || 0) + Number(r.qty || 1);
    });
    return map;
  }, [rows]);

  const fields: Field[] = useMemo(
    () => [
      {
        key: 'species',
        label: 'Кого добыли',
        type: 'select',
        options: SPECIES.map((s) => ({ value: s.key, label: s.label })),
      },
      { key: 'qty', label: 'Количество', type: 'number' },
      { key: 'taken_on', label: 'Дата добычи', type: 'date' },
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
      { key: 'trophy_note', label: 'Заметка о трофее', type: 'textarea' },
      { key: 'photo_url', label: 'Фото трофея', type: 'photo', folder: 'trophies' },
    ],
    [locations],
  );

  const save = async (values: Row) => {
    const takenOn = String(values.taken_on || today()).slice(0, 10);
    const payload: Row = {
      ...values,
      location_id: values.location_id ? Number(values.location_id) : null,
      qty: Number(values.qty || 1),
      taken_on: takenOn,
      season: Number(takenOn.slice(0, 4)),
    };
    try {
      if (editing?.id) {
        await updateRow('hunter_bag', { ...payload, id: editing.id }, true);
        toast.success('Запись обновлена');
      } else {
        await createRow('hunter_bag', payload, true);
        toast.success('Трофей записан');
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
      index="Кабинет / Добыча"
      title="Моя добыча"
      lede="Отмечайте добытых животных — хозяйство ведёт учёт по сезонам."
      action={
        <button
          className="h-cta"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Icon name="Plus" size={15} /> Записать трофей
        </button>
      }
    >
      {rows.length > 0 && (
        <div
          className="grid gap-px mb-6"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            background: '#e2e2df',
            border: '1px solid #e2e2df',
          }}
        >
          {SPECIES.filter((s) => bySpecies[s.key]).map((s) => (
            <div key={s.key} className="bg-white p-5">
              <div className="h-label">
                {s.emoji} {s.label}
              </div>
              <div className="h-head text-[22px] mt-2">{bySpecies[s.key]}</div>
            </div>
          ))}
        </div>
      )}

      <div className="border border-[#e2e2df] overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Дата</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[150px]">Вид</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[90px]">Кол-во</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[160px]">Где</th>
              <th className="h-label text-left px-4 py-2 font-normal">Заметка</th>
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
                  {String(r.taken_on || '').slice(0, 10)}
                </td>
                <td className="px-4 py-2 text-[0.72em]">{SPECIES_LABEL(String(r.species))}</td>
                <td className="px-4 py-2 text-[0.7em]">{Number(r.qty || 1)}</td>
                <td className="px-4 py-2 text-[0.68em]">{placeOf(r)}</td>
                <td className="px-4 py-2 text-[0.7em]">
                  {String(r.trophy_note || '—')}
                  {r.photo_url && (
                    <a
                      href={String(r.photo_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="h-label underline block mt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      фото
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center h-mono-cap text-[var(--hero-muted)]"
                >
                  {loading ? 'Загружаем…' : 'Пока пусто — нажмите «Записать трофей»'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Правка трофея' : 'Новый трофей'}
        fields={fields}
        initial={editing || { taken_on: today(), species: 'roe', qty: 1 }}
        onSubmit={save}
      />
    </Layout>
  );
};

export default MyBag;
