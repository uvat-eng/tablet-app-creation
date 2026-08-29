import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import ClubStatus from '@/components/app/ClubStatus';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import { SPECIES } from '@/lib/species';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

const MyClub = () => {
  const [me, setMe] = useState<Row | null>(null);
  const [fees, setFees] = useState<Row[]>([]);
  const [bag, setBag] = useState<Row[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [g, f, b] = await Promise.all([
      listRows('guests'),
      listRows('club_fees'),
      listRows('club_bag'),
    ]);
    setMe(g[0] || null);
    setFees(f);
    setBag(b);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    fees.forEach((f) => f.year && set.add(Number(f.year)));
    bag.forEach((b) => b.season && set.add(Number(b.season)));
    return [...set].sort((a, b) => b - a);
  }, [fees, bag]);

  const fields: Field[] = useMemo(
    () => [
      {
        key: 'species',
        label: 'Кого добыли',
        type: 'select',
        options: SPECIES.map((s) => ({ value: s.key, label: s.label })),
      },
      { key: 'taken_on', label: 'Дата добычи', type: 'date' },
      { key: 'note', label: 'Заметка — вес, рога, место', type: 'textarea' },
    ],
    [],
  );

  const save = async (values: Row) => {
    const takenOn = String(values.taken_on || today()).slice(0, 10);
    const payload: Row = {
      species: String(values.species || 'roe'),
      taken_on: takenOn,
      season: Number(takenOn.slice(0, 4)),
      note: String(values.note || ''),
    };
    try {
      if (editing?.id) {
        await updateRow('club_bag', { ...payload, id: editing.id });
        toast.success('Запись обновлена');
      } else {
        await createRow('club_bag', payload);
        toast.success('Добыча записана — хозяйство проставит стоимость');
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  if (!loading && !me?.club_member) {
    return (
      <Layout index="Кабинет / Клуб" title="Членство в клубе">
        <div className="border border-[#e2e2df] p-12 text-center h-mono-cap text-[var(--hero-muted)]">
          Вы не отмечены как член закрытого клуба. Обратитесь к хозяйству.
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      index="Кабинет / Клуб"
      title="Членство и добыча"
      lede="Взносы, привилегии и счёт за добытую дичь."
      action={
        <button
          className="h-cta"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Icon name="Plus" size={15} /> Записать добычу
        </button>
      }
    >
      {years.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="h-label mr-1">Год</span>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className="h-label px-2 py-1 border"
              style={{
                borderColor: '#e2e2df',
                background: year === y ? 'var(--hero-accent)' : '#fff',
                color: year === y ? 'var(--hero-accent-contrast)' : 'inherit',
              }}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      <ClubStatus
        guestId={Number(me?.id || 0)}
        guest={me}
        fees={fees}
        bag={bag}
        year={year}
      />

      <p className="h-label mt-6 leading-relaxed">
        Стоимость по прайсу проставляет хозяйство после проверки записи.
        Нажмите на строку в таблице выше — можно поправить дату или заметку.
      </p>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Правка добычи' : 'Новая добыча'}
        fields={fields}
        initial={editing || { taken_on: today(), species: 'roe' }}
        onSubmit={save}
      />
    </Layout>
  );
};

export default MyClub;
