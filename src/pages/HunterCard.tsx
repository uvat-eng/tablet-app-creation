import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, updateRow, createRow, removeRow } from '@/lib/api';
import { SPECIES, SPECIES_ONE } from '@/lib/species';
import { COUNTRIES } from '@/lib/countries';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

const PROFILE: Field[] = [
  { key: 'name', label: 'ФИО полностью' },
  {
    key: 'country',
    label: 'Страна',
    type: 'select',
    options: COUNTRIES.map((c) => ({ value: c.name, label: `${c.flag} ${c.name}` })),
  },
  { key: 'nationality', label: 'Национальность' },
  { key: 'city', label: 'Город проживания' },
  { key: 'phone', label: 'Телефон' },
  { key: 'born_on', label: 'Дата рождения', type: 'date' },
  { key: 'passport', label: 'Паспорт: серия и номер' },
  { key: 'passport_date', label: 'Паспорт: дата выдачи', type: 'date' },
  { key: 'address', label: 'Прописка' },
  { key: 'hunt_ticket', label: 'Охотничий билет: номер' },
  { key: 'hunt_ticket_date', label: 'Охотбилет: дата выдачи', type: 'date' },
  { key: 'roh_number', label: 'РОХа: номер' },
  { key: 'roh_date', label: 'РОХа: действует до', type: 'date' },
  { key: 'roh_weapon', label: 'Оружие по РОХе' },
  { key: 'note', label: 'Заметка', type: 'textarea' },
];

const HunterCard = () => {
  const { id } = useParams();
  const [guest, setGuest] = useState<Row | null>(null);
  const [bag, setBag] = useState<Row[]>([]);
  const [bookings, setBookings] = useState<Row[]>([]);
  const [docs, setDocs] = useState<Row[]>([]);
  const [docOpen, setDocOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Row | null>(null);
  const [locations, setLocations] = useState<Row[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [editingBag, setEditingBag] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const [g, b, bk, l, d] = await Promise.all([
      listRows('guests'),
      listRows('hunter_bag'),
      listRows('bookings'),
      listRows('locations'),
      listRows('guest_docs'),
    ]);
    setDocs(d.filter((x) => String(x.guest_id) === String(id) && !x.archived));
    const found = g.find((x) => String(x.id) === String(id)) || null;
    setGuest(found);
    setBag(b.filter((x) => String(x.guest_id) === String(id)));
    setLocations(l);
    setBookings(bk.filter((x) => found && String(x.guest_name) === String(found.name)));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const bagFields: Field[] = useMemo(
    () => [
      {
        key: 'species',
        label: 'Вид зверя',
        type: 'select',
        options: SPECIES.map((s) => ({ value: s.key, label: `${s.emoji} ${s.label}` })),
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
      { key: 'trophy_note', label: 'Трофей: вес, рога, заметка' },
      { key: 'photo_url', label: 'Фото', type: 'photo', folder: 'trophies' },
    ],
    [locations],
  );

  const byS = useMemo(() => {
    const map: Record<string, number> = {};
    SPECIES.forEach((s) => {
      map[s.key] = 0;
    });
    bag.forEach((b) => {
      const k = String(b.species);
      map[k] = (map[k] || 0) + Number(b.qty || 1);
    });
    return map;
  }, [bag]);

  const total = Object.values(byS).reduce((s, v) => s + v, 0);

  const docFields: Field[] = [
    {
      key: 'kind',
      label: 'Тип документа',
      type: 'select',
      options: [
        { value: 'biotech_contract', label: 'Договор на биотехнию' },
        { value: 'contract', label: 'Путёвка-договор' },
        { value: 'permit', label: 'Разрешение на добычу' },
        { value: 'other', label: 'Другое' },
      ],
    },
    { key: 'title', label: 'Название документа' },
    { key: 'doc_no', label: 'Номер' },
    { key: 'signed_on', label: 'Дата подписания', type: 'date' },
    { key: 'valid_to', label: 'Действует до', type: 'date' },
    { key: 'file_url', label: 'Файл или скан', type: 'photo', folder: 'docs' },
    { key: 'note', label: 'Заметка', type: 'textarea' },
  ];

  const saveDoc = async (values: Row) => {
    try {
      if (editingDoc?.id) {
        await updateRow('guest_docs', { ...values, id: editingDoc.id });
        toast.success('Документ обновлён');
      } else {
        await createRow('guest_docs', { ...values, guest_id: Number(id) });
        toast.success('Документ добавлен');
      }
      setDocOpen(false);
      setEditingDoc(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  const saveProfile = async (values: Row) => {
    try {
      await updateRow('guests', { ...values, id: Number(id) });
      toast.success('Данные охотника обновлены');
      setEditOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  const saveBag = async (values: Row) => {
    const payload: Row = {
      ...values,
      guest_id: Number(id),
      qty: Number(values.qty || 1),
      taken_on: String(values.taken_on || today()),
      season: Number(String(values.taken_on || today()).slice(0, 4)),
      location_id: values.location_id ? Number(values.location_id) : null,
    };
    try {
      if (editingBag?.id) {
        await updateRow('hunter_bag', { ...payload, id: editingBag.id });
        toast.success('Трофей обновлён');
      } else {
        await createRow('hunter_bag', payload);
        toast.success('Трофей добавлен');
      }
      setBagOpen(false);
      setEditingBag(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  const dropBag = async (r: Row) => {
    try {
      await removeRow('hunter_bag', Number(r.id));
      toast.success('Запись убрана');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось убрать');
    }
  };

  if (!guest) {
    return (
      <Layout index="Раздел / База охотников" title="Охотник">
        <div className="h-mono-cap">Загружаем…</div>
      </Layout>
    );
  }

  const flag = COUNTRIES.find((c) => c.name === String(guest.country || 'Россия'))?.flag || '🏳️';

  const field = (label: string, value: unknown, wide = false) => (
    <div key={label} className={wide ? 'sm:col-span-2' : ''}>
      <div className="h-label">{label}</div>
      <div className="text-sm mt-1">{String(value || '—')}</div>
    </div>
  );

  return (
    <Layout
      index="Раздел / База охотников"
      title={String(guest.name)}
      lede={[guest.country, guest.city, guest.phone].filter(Boolean).join(' · ') || undefined}
      action={
        <span className="flex flex-wrap gap-2">
          <Link className="h-cta-ghost" to="/hunters">
            К списку
          </Link>
          <button className="h-cta-ghost" onClick={() => setEditOpen(true)}>
            <Icon name="Pencil" size={14} /> Изменить
          </button>
          {docs[0]?.file_url && (
            <a
              className="h-cta-ghost"
              href={String(docs[0].file_url)}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="FileText" size={14} /> Договор
            </a>
          )}
          <button
            className="h-cta"
            onClick={() => {
              setEditingBag(null);
              setBagOpen(true);
            }}
          >
            <Icon name="Plus" size={15} /> Добавить трофей
          </button>
        </span>
      }
    >
      <div
        className="grid gap-px mb-8"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {SPECIES.map((s) => (
          <div key={s.key} className="bg-white px-4 py-3">
            <div className="h-label flex items-center gap-2">
              <span className="text-[1.2em] leading-none">{s.emoji}</span>
              {s.label}
            </div>
            <div className="h-head text-[22px] mt-1">{byS[s.key] || 0}</div>
          </div>
        ))}
        <div className="bg-white px-4 py-3">
          <div className="h-label">Всего</div>
          <div className="h-head text-[22px] mt-1">{total}</div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 mb-10">
        <div className="border border-[#e2e2df] p-5">
          <div className="h-label mb-4 flex items-center gap-2">
            <Icon name="User" size={14} /> Личные данные
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('Страна', `${flag} ${guest.country || 'Россия'}`)}
            {field('Национальность', guest.nationality)}
            {field('Город проживания', guest.city)}
            {field('Дата рождения', String(guest.born_on || '').slice(0, 10))}
            {field('Телефон', guest.phone)}
            {field('Прописка', guest.address, true)}
          </div>
        </div>

        <div className="border border-[#e2e2df] p-5">
          <div className="h-label mb-4 flex items-center gap-2">
            <Icon name="IdCard" size={14} fallback="CreditCard" /> Документы
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('Паспорт', guest.passport)}
            {field('Выдан', String(guest.passport_date || '').slice(0, 10))}
            {field('Охотничий билет', guest.hunt_ticket)}
            {field('Выдан', String(guest.hunt_ticket_date || '').slice(0, 10))}
            {field('РОХа', guest.roh_number)}
            {field('Действует до', String(guest.roh_date || '').slice(0, 10))}
            {field('Оружие', guest.roh_weapon, true)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="h-head text-[22px]">Документы</div>
        <button
          className="h-cta-ghost"
          onClick={() => {
            setEditingDoc(null);
            setDocOpen(true);
          }}
        >
          <Icon name="Plus" size={14} /> Добавить документ
        </button>
      </div>
      <div className="border border-[#e2e2df] mb-10">
        {docs.map((d) => (
          <div
            key={String(d.id)}
            className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[#eeeeec] last:border-0"
          >
            <Icon name="FileText" size={15} className="opacity-60" />
            <span className="text-[0.74em]">{String(d.title || 'Документ')}</span>
            {d.doc_no && <span className="h-label">№ {String(d.doc_no)}</span>}
            {d.signed_on && (
              <span className="h-label">
                от {String(d.signed_on).slice(0, 10).split('-').reverse().join('.')}
              </span>
            )}
            <span className="flex gap-2 ml-auto">
              {d.file_url && (
                <a
                  className="h-cta-ghost"
                  href={String(d.file_url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="Download" size={13} /> Открыть
                </a>
              )}
              <button
                className="h-label underline"
                onClick={() => {
                  setEditingDoc(d);
                  setDocOpen(true);
                }}
              >
                Изменить
              </button>
            </span>
          </div>
        ))}
        {!docs.length && (
          <div className="px-4 py-6 text-center h-mono-cap text-[var(--hero-muted)]">
            Документов пока нет
          </div>
        )}
      </div>

      <div className="h-head text-[22px] mb-3">Трофеи охотника</div>
      <div className="border border-[#e2e2df] overflow-x-auto mb-10">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Дата</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[150px]">Вид</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[80px]">Кол-во</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[160px]">Где</th>
              <th className="h-label text-left px-4 py-3 font-normal">Трофей</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[90px]" />
            </tr>
          </thead>
          <tbody>
            {bag.map((b) => {
              const s = SPECIES_ONE(String(b.species));
              const l = locations.find((x) => String(x.id) === String(b.location_id));
              return (
                <tr
                  key={String(b.id)}
                  className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                  onClick={() => {
                    setEditingBag(b);
                    setBagOpen(true);
                  }}
                >
                  <td className="px-4 py-3 text-[0.68em]">
                    {String(b.taken_on || '').slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-[0.72em]">
                    <span className="flex items-center gap-2">
                      <span className="text-[1.2em] leading-none">{s.emoji}</span>
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[0.72em]">{String(b.qty || 1)}</td>
                  <td className="px-4 py-3 text-[0.68em]">{String(l?.name || b.place || '—')}</td>
                  <td className="px-4 py-3 text-[0.72em]">{String(b.trophy_note || '—')}</td>
                  <td className="px-4 py-3">
                    <button
                      className="h-label underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        dropBag(b);
                      }}
                    >
                      Убрать
                    </button>
                  </td>
                </tr>
              );
            })}
            {!bag.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center h-mono-cap text-[var(--hero-muted)]">
                  Трофеев пока нет — нажмите «Добавить трофей»
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {bookings.length > 0 && (
        <>
          <div className="h-head text-[22px] mb-3">Заезды</div>
          <div className="border border-[#e2e2df] overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="bg-[var(--hero-surface)]">
                  <th className="h-label text-left px-4 py-2 font-normal w-[120px]">Заезд</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[120px]">Выезд</th>
                  <th className="h-label text-left px-4 py-2 font-normal">Объект</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[80px]">Чел.</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={String(b.id)} className="border-t border-[#e2e2df]">
                    <td className="px-4 py-2 text-[0.68em]">{String(b.date_from || '')}</td>
                    <td className="px-4 py-2 text-[0.68em]">{String(b.date_to || '')}</td>
                    <td className="px-4 py-2 text-[0.72em]">{String(b.object_name || '—')}</td>
                    <td className="px-4 py-2 text-[0.72em]">{String(b.people || '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <RecordDialog
        open={docOpen}
        onOpenChange={setDocOpen}
        title={editingDoc?.id ? 'Документ' : 'Новый документ'}
        fields={docFields}
        initial={editingDoc || { kind: 'biotech_contract' }}
        onSubmit={saveDoc}
      />

      <RecordDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Данные охотника"
        fields={PROFILE}
        initial={guest}
        onSubmit={saveProfile}
      />

      <RecordDialog
        open={bagOpen}
        onOpenChange={setBagOpen}
        title={editingBag?.id ? 'Трофей' : 'Новый трофей'}
        fields={bagFields}
        initial={editingBag || { species: 'roe', qty: 1, taken_on: today() }}
        onSubmit={saveBag}
      />
    </Layout>
  );
};

export default HunterCard;
