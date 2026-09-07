import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import SearchBar from '@/components/app/SearchBar';
import DataTable from '@/components/app/DataTable';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import WorldPins from '@/components/app/WorldPins';
import CollectiveSheetDialog from '@/components/app/CollectiveSheetDialog';
import MessagesTab from '@/components/app/MessagesTab';
import { loadUnread } from '@/lib/chatApi';
import { Row, listRows, createRow } from '@/lib/api';
import { SPECIES } from '@/lib/species';
import { COUNTRIES } from '@/lib/countries';
import { toast } from 'sonner';

const FIELDS: Field[] = [
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

const Hunters = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [bag, setBag] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState('list');
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [g, b] = await Promise.all([listRows('guests'), listRows('hunter_bag')]);
    setRows(g.filter((r) => !r.club_member));
    setBag(b);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const check = () => loadUnread().then(setUnread).catch(() => undefined);
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [tab]);

  const byCountry = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const c = String(r.country || '').trim() || 'Россия';
      map[c] = (map[c] || 0) + 1;
    });
    return map;
  }, [rows]);

  const ids = useMemo(() => new Set(rows.map((r) => String(r.id))), [rows]);

  const bagBySpecies = useMemo(() => {
    const map: Record<string, number> = {};
    SPECIES.forEach((s) => {
      map[s.key] = 0;
    });
    bag
      .filter((b) => ids.has(String(b.guest_id)))
      .forEach((b) => {
        const k = String(b.species);
        map[k] = (map[k] || 0) + Number(b.qty || 1);
      });
    return map;
  }, [bag, ids]);

  const bagByHunter = useMemo(() => {
    const map: Record<string, number> = {};
    bag.forEach((b) => {
      const k = String(b.guest_id);
      map[k] = (map[k] || 0) + Number(b.qty || 1);
    });
    return map;
  }, [bag]);

  const visible = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((r) =>
      ['name', 'phone', 'city', 'country', 'nationality', 'note'].some((k) =>
        String(r[k] ?? '').toLowerCase().includes(q),
      ),
    );
  }, [rows, query]);

  const totalBag = Object.values(bagBySpecies).reduce((s, v) => s + v, 0);
  const cities = new Set(rows.map((r) => String(r.city || '').trim()).filter(Boolean)).size;
  const countries = Object.keys(byCountry).length;

  const add = async (values: Row) => {
    try {
      await createRow('guests', { ...values, club_member: false });
      toast.success('Охотник добавлен');
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  const stat = (label: string, value: string | number) => (
    <div key={label} className="bg-white px-4 py-3">
      <div className="h-label">{label}</div>
      <div className="h-head text-[22px] mt-1">{value}</div>
    </div>
  );

  return (
    <Layout
      index="Раздел / База охотников"
      title="База охотников"
      lede="Все охотники и гости хозяйства, кроме членов закрытого клуба."
      action={
        <span className="flex flex-wrap gap-2">
          <button className="h-cta-ghost" onClick={() => setSheetOpen(true)}>
            <Icon name="ClipboardList" size={15} /> Коллективный лист
          </button>

          <button className="h-cta" onClick={() => setOpen(true)}>
            <Icon name="Plus" size={15} /> Добавить охотника
          </button>
        </span>
      }
    >
      <div className="flex gap-2 mb-6 border-b border-[#e2e2df]">
        {[
          { key: 'list', label: 'Охотники' },
          { key: 'messages', label: 'Сообщения' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="h-label px-4 py-3 flex items-center gap-2"
            style={{
              borderBottom: tab === t.key ? '2px solid var(--hero-accent)' : '2px solid transparent',
              opacity: tab === t.key ? 1 : 0.6,
            }}
          >
            {t.label}
            {t.key === 'messages' && unread > 0 && (
              <span
                className="text-[0.9em] px-1.5"
                style={{ background: '#e53935', color: '#fff' }}
              >
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'messages' && <MessagesTab />}

      {tab === 'list' && (
      <>
      <div
        className="grid gap-px mb-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {stat('Всего охотников', rows.length)}
        {stat('Стран', countries)}
        {stat('Городов', cities)}
        {stat('Добыто всего', totalBag)}
      </div>

      <div className="mb-8">
        <WorldPins counts={byCountry} />
      </div>

      <div className="h-head text-[22px] mb-3">Добыто</div>
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
              {s.plural}
            </div>
            <div className="h-head text-[22px] mt-1">{bagBySpecies[s.key] || 0}</div>
          </div>
        ))}
      </div>

      <div className="h-head text-[22px] mb-3">Сводный список охотников</div>
      <SearchBar value={query} onChange={setQuery} count={visible.length} />
      <DataTable
        columns={[
          { key: 'name', label: 'ФИО' },
          {
            key: 'country',
            label: 'Страна',
            width: '150px',
            render: (r) => {
              const c = COUNTRIES.find((x) => x.name === String(r.country || 'Россия'));
              return (
                <span className="flex items-center gap-2">
                  <span>{c?.flag || '🏳️'}</span>
                  {String(r.country || 'Россия')}
                </span>
              );
            },
          },
          { key: 'city', label: 'Город', width: '140px' },
          { key: 'phone', label: 'Телефон', width: '150px' },
          {
            key: 'hunt_ticket',
            label: 'Охотбилет',
            width: '130px',
            render: (r) => String(r.hunt_ticket || '—'),
          },
          {
            key: '__bag',
            label: 'Трофеи',
            width: '100px',
            render: (r) => {
              const n = bagByHunter[String(r.id)] || 0;
              return n ? <b>{n}</b> : <span className="text-[#c9c9c4]">—</span>;
            },
          },
        ]}
        rows={visible}
        empty={loading ? 'Загружаем…' : 'В базе пока нет охотников'}
        onRowClick={(r) => navigate(`/hunters/${r.id}`)}
      />
      </>
      )}

      <CollectiveSheetDialog open={sheetOpen} onOpenChange={setSheetOpen} />

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title="Новый охотник"
        fields={FIELDS}
        initial={{ country: 'Россия' }}
        onSubmit={add}
      />
    </Layout>
  );
};

export default Hunters;