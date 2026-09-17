import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import WeaponActDialog from '@/components/app/WeaponActDialog';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import { WEAPON_KINDS, kindLabel, ruDate, hasDocs } from '@/lib/weapons';
import { toast } from 'sonner';

const MyWeapons = () => {
  const [weapons, setWeapons] = useState<Row[]>([]);
  const [guests, setGuests] = useState<Row[]>([]);
  const [acts, setActs] = useState<Row[]>([]);
  const [me, setMe] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [picked, setPicked] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [w, g, a, mine] = await Promise.all([
      listRows('weapons', { mine: true }),
      listRows('guests', { recipients: true }),
      listRows('weapon_acts', { mine: true }),
      listRows('guests', { mine: true }),
    ]);
    setWeapons(w);
    setGuests(g);
    setActs(a);
    setMe(mine[0] || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fields: Field[] = useMemo(
    () => [
      { key: 'name', label: 'Марка и модель' },
      {
        key: 'kind',
        label: 'Тип оружия',
        type: 'select',
        options: WEAPON_KINDS.map((k) => ({ value: k.key, label: k.label })),
      },
      { key: 'caliber', label: 'Калибр' },
      { key: 'serial_no', label: 'Серийный номер' },
      { key: 'roh_number', label: 'Номер РОХа' },
      { key: 'roh_date', label: 'Дата выдачи РОХа', type: 'date' },
      { key: 'note', label: 'Заметка', type: 'textarea' },
    ],
    [],
  );

  const save = async (values: Row) => {
    const payload: Row = {
      ...values,
      kind: String(values.kind || 'rifled'),
      owner_name: String(me?.name || ''),
      roh_date: String(values.roh_date || '').slice(0, 10) || null,
    };
    try {
      if (editing?.id) {
        await updateRow('weapons', { ...payload, id: editing.id }, true);
        toast.success('Оружие обновлено');
      } else {
        await createRow('weapons', payload, true);
        toast.success('Оружие добавлено');
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  const gunName = (id: unknown) =>
    String(weapons.find((w) => String(w.id) === String(id))?.name || '—');

  const canTransfer = Boolean(me && hasDocs(me));

  return (
    <Layout
      index="Кабинет / Оружие"
      title="Моё оружие"
      lede="Передача оружия на совместной охоте — статья 24.1 закона «Об оружии»."
      action={
        <button
          className="h-cta"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Icon name="Plus" size={15} /> Добавить оружие
        </button>
      }
    >
      {loading ? (
        <div className="h-label">Загружаю…</div>
      ) : (
        <>
          {!canTransfer && (
            <div className="mb-6 p-4 text-[0.8em]" style={{ background: '#fdf3f2' }}>
              Чтобы оформлять акты, заполните номер охотбилета и РОХа в разделе
              «Мои данные» — без них передавать оружие нельзя по закону.
            </div>
          )}

          {weapons.length === 0 ? (
            <div className="border border-[#e2e2df] p-12 text-center">
              <Icon name="Crosshair" size={26} fallback="Target" />
              <div className="h-head text-[18px] mt-4">Оружие пока не добавлено</div>
              <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
                Добавьте свой карабин — потом сможете оформить акт передачи
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {weapons.map((w) => (
                <div
                  key={String(w.id)}
                  className="border p-4 flex items-start gap-3"
                  style={{ borderColor: '#e2e2df' }}
                >
                  <Icon name="Crosshair" size={20} fallback="Target" />
                  <div className="flex-1">
                    <div className="text-[0.95em] font-semibold">{String(w.name || '')}</div>
                    <div className="h-mono-cap normal-case text-[var(--hero-muted)] mt-1">
                      {kindLabel(w.kind)} · {String(w.caliber || '')}
                    </div>
                    <div className="h-mono-cap normal-case text-[var(--hero-muted)]">
                      № {String(w.serial_no || '—')}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        className="h-cta-ghost"
                        disabled={!canTransfer}
                        style={{ opacity: canTransfer ? 1 : 0.45 }}
                        onClick={() => setPicked(w)}
                      >
                        <Icon name="FileText" size={14} /> Передать
                      </button>
                      <button
                        className="h-cta-ghost"
                        onClick={() => {
                          setEditing(w);
                          setOpen(true);
                        }}
                      >
                        <Icon name="Pencil" size={14} /> Изменить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {acts.length > 0 && (
            <>
              <div className="h-head text-[20px] mb-3">Мои акты передачи</div>
              <div className="border" style={{ borderColor: '#e2e2df' }}>
                {acts.slice(0, 30).map((a) => (
                  <div
                    key={String(a.id)}
                    className="px-3 py-2 border-b flex flex-wrap items-center gap-x-3 gap-y-1"
                    style={{ borderColor: '#f0f0ee' }}
                  >
                    <span className="text-[0.85em] flex-1 min-w-[160px]">
                      {String(a.receiver_name || '')}
                    </span>
                    <span className="h-label">{gunName(a.weapon_id)}</span>
                    <span className="h-mono-cap normal-case text-[var(--hero-muted)]">
                      {ruDate(a.hunt_from)} – {ruDate(a.hunt_to)}
                    </span>
                    {a.file_url ? (
                      <a
                        href={String(a.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="h-label underline"
                      >
                        открыть
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {picked && (
        <WeaponActDialog
          weapon={picked}
          guests={guests}
          onClose={() => setPicked(null)}
          onDone={load}
        />
      )}

      <RecordDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        title={editing ? 'Изменить оружие' : 'Добавить оружие'}
        fields={fields}
        initial={editing || { kind: 'rifled' }}
        onSubmit={save}
      />
    </Layout>
  );
};

export default MyWeapons;