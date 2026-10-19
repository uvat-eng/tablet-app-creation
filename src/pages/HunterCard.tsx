import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import HunterActivity from '@/components/app/HunterActivity';
import ChatPanel from '@/components/app/ChatPanel';
import { Row, listRows, updateRow, createRow, removeRow } from '@/lib/api';
import { SPECIES } from '@/lib/species';
import { COUNTRIES } from '@/lib/countries';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';
import HunterProfile from '@/components/hunter/HunterProfile';
import HunterDocsList from '@/components/hunter/HunterDocsList';
import HunterBagTable from '@/components/hunter/HunterBagTable';
import HunterBookings from '@/components/hunter/HunterBookings';

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
  { key: 'email', label: 'Электронная почта' },
  { key: 'inn', label: 'ИНН' },
  { key: 'snils', label: 'СНИЛС' },
  { key: 'born_on', label: 'Дата рождения', type: 'date' },
  { key: 'passport', label: 'Паспорт: серия и номер' },
  { key: 'passport_date', label: 'Паспорт: дата выдачи', type: 'date' },
  { key: 'passport_issued', label: 'Паспорт: кем выдан' },
  { key: 'address', label: 'Прописка' },
  { key: 'hunt_ticket', label: 'Охотничий билет: номер' },
  { key: 'hunt_ticket_date', label: 'Охотбилет: дата выдачи', type: 'date' },
  { key: 'hunt_ticket_issued', label: 'Охотбилет: кем выдан' },
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


  useDataRefresh(load);

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
          <button
            className="h-cta-ghost"
            onClick={() =>
              document.getElementById('hunter-chat')?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            <Icon name="MessageSquare" size={14} fallback="MessageCircle" /> Чат
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
      <HunterProfile guest={guest} byS={byS} total={total} />

      <HunterDocsList
        docs={docs}
        onAdd={() => {
          setEditingDoc(null);
          setDocOpen(true);
        }}
        onEdit={(d) => {
          setEditingDoc(d);
          setDocOpen(true);
        }}
      />

      <HunterBagTable
        bag={bag}
        locations={locations}
        onEdit={(b) => {
          setEditingBag(b);
          setBagOpen(true);
        }}
        onDrop={dropBag}
      />

      <div id="hunter-chat" className="mt-10">
        <div className="h-head text-[22px] mb-3">Переписка с охотником</div>
        <ChatPanel guestId={Number(id)} height={440} />
      </div>

      <HunterActivity guestId={Number(id)} guestName={String(guest.name)} />

      <HunterBookings bookings={bookings} />

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