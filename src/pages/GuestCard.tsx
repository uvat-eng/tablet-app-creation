import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import { Row, listRows, downloadContract, removeRow } from '@/lib/api';
import Icon from '@/components/ui/icon';
import HelpDialog from '@/components/app/HelpDialog';
import HunterActivity from '@/components/app/HunterActivity';
import { HELP_KINDS, HELP_LABEL } from '@/lib/help';
import { toast } from 'sonner';

const money = (v: unknown) => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;

const STATUS: Record<string, string> = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  arrived: 'Заехали',
  done: 'Завершена',
  cancelled: 'Отменена',
};

const GuestCard = () => {
  const { id } = useParams();
  const { pathname } = useLocation();
  const fromHunters = pathname.startsWith('/hunters');
  const backTo = fromHunters ? '/hunters' : '/club';
  const sectionIndex = fromHunters
    ? 'Раздел / База охотников'
    : 'Раздел / Закрытый клуб охотников';
  const guestId = Number(id);
  const [guest, setGuest] = useState<Row | null>(null);
  const [bookings, setBookings] = useState<Row[]>([]);
  const [trophies, setTrophies] = useState<Row[]>([]);
  const [works, setWorks] = useState<Row[]>([]);
  const [printing, setPrinting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [editHelp, setEditHelp] = useState<Row | null>(null);

  const printContract = async () => {
    if (!guest) return;
    setPrinting(true);
    try {
      await downloadContract(guestId, String(guest.name));
      toast.success('Договор собран — файл скачан');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось собрать договор');
    } finally {
      setPrinting(false);
    }
  };

  const load = useCallback(() => {
    Promise.all([
      listRows('guests'),
      listRows('bookings'),
      listRows('trophies'),
      listRows('biotech_works'),
    ]).then(([g, b, t, w]) => {
      const found = g.find((x) => Number(x.id) === guestId) || null;
      setGuest(found);
      setBookings(
        b.filter(
          (x) =>
            Number(x.guest_id) === guestId ||
            (found && String(x.guest_name) === String(found.name)),
        ),
      );
      setTrophies(t.filter((x) => found && String(x.hunter) === String(found.name)));
      setWorks(w.filter((x) => Number(x.guest_id) === guestId));
    });
  }, [guestId]);

  useEffect(() => {
    load();
  }, [load]);

  const helpRows = useMemo(
    () => works.filter((w) => HELP_KINDS.some((k) => k.key === w.kind)),
    [works],
  );

  const helpHours = useMemo(
    () => helpRows.reduce((s, w) => s + Number(w.hours || 0), 0),
    [helpRows],
  );

  const dropHelp = async (r: Row) => {
    await removeRow('biotech_works', Number(r.id));
    toast.success('Запись убрана в архив');
    load();
  };

  if (!guest) {
    return (
      <Layout index={sectionIndex} title="Гость">
        <div className="h-mono-cap">Загружаем…</div>
      </Layout>
    );
  }

  const total = bookings.reduce((s, b) => s + Number(b.total || 0), 0);
  const paid = bookings.reduce((s, b) => s + Number(b.paid || 0), 0);

  return (
    <Layout
      index={sectionIndex}
      title={String(guest.name)}
      lede={[guest.city, guest.phone].filter(Boolean).join(' — ') || undefined}
      action={
        <span className="flex flex-wrap gap-2">
          <Link className="h-cta-ghost" to={backTo}>
            К списку
          </Link>
          <button
            className="h-cta-ghost"
            onClick={() => {
              setEditHelp(null);
              setHelpOpen(true);
            }}
          >
            <Icon name="HeartHandshake" size={15} fallback="Handshake" /> Помочь хозяйству
          </button>
          {Boolean(guest.club_member) && (
            <button className="h-cta" onClick={printContract} disabled={printing}>
              <Icon name="FileText" size={15} />
              {printing ? 'Собираем…' : 'Печать договора'}
            </button>
          )}
        </span>
      }
    >
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {[
          { label: 'Заездов', value: String(bookings.length) },
          { label: 'Оставил денег', value: money(paid) },
          { label: 'Долг', value: money(Math.max(0, total - paid)) },
          { label: 'Трофеев', value: String(trophies.length) },
          { label: 'Помощь хозяйству', value: `${helpHours.toLocaleString('ru-RU')} ч` },
          {
            label: 'Клуб',
            value: guest.club_member ? `до ${guest.club_until || '—'}` : 'не член',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white p-5">
            <div className="h-label">{s.label}</div>
            <div className="h-head text-[22px] mt-2">{s.value}</div>
          </div>
        ))}
      </div>

      {guest.note && <div className="mt-4 h-mono-cap normal-case">{String(guest.note)}</div>}

      <div className="mt-10 flex items-center justify-between gap-3">
        <span className="h-label">Помощь хозяйству</span>
        <button
          className="h-label underline"
          onClick={() => {
            setEditHelp(null);
            setHelpOpen(true);
          }}
        >
          Добавить
        </button>
      </div>
      <div className="mt-3 border border-[#e2e2df] overflow-x-auto bg-white">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Дата</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[210px]">Чем помог</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[120px]">Объём</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[100px]">Часы</th>
              <th className="h-label text-left px-4 py-3 font-normal">Где и что делали</th>
              <th className="h-label text-left px-4 py-3 font-normal w-[90px]" />
            </tr>
          </thead>
          <tbody>
            {helpRows.map((w) => (
              <tr
                key={String(w.id)}
                className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                onClick={() => {
                  setEditHelp(w);
                  setHelpOpen(true);
                }}
              >
                <td className="px-4 py-3 text-[0.68em]">{String(w.work_on || '').slice(0, 10)}</td>
                <td className="px-4 py-3 text-[0.72em]">{HELP_LABEL(String(w.kind))}</td>
                <td className="px-4 py-3 text-[0.7em] whitespace-nowrap">
                  {Number(w.qty || 0).toLocaleString('ru-RU')} {String(w.unit || '')}
                </td>
                <td className="px-4 py-3 text-[0.7em]">
                  {Number(w.hours || 0) ? Number(w.hours).toLocaleString('ru-RU') : '—'}
                </td>
                <td className="px-4 py-3 text-[0.7em]">
                  {[w.place, w.note].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    className="h-label underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      dropHelp(w);
                    }}
                  >
                    В архив
                  </button>
                </td>
              </tr>
            ))}
            {!helpRows.length && (
              <tr>
                <td className="px-4 py-6 text-[0.72em]" colSpan={6}>
                  Помощи пока не было
                </td>
              </tr>
            )}
          </tbody>
          {helpRows.length > 0 && (
            <tfoot>
              <tr className="border-t border-black bg-[var(--hero-surface)]">
                <td className="px-4 py-3 text-[0.72em] font-bold" colSpan={3}>
                  Итого отработано
                </td>
                <td className="px-4 py-3 text-[0.75em] font-bold" colSpan={3}>
                  {helpHours.toLocaleString('ru-RU')} ч
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <HunterActivity guestId={guestId} guestName={String(guest.name)} />

      <div className="mt-10 h-label mb-3">История заездов</div>
      <DataTable
        columns={[
          { key: 'date_from', label: 'Заезд', width: '120px' },
          { key: 'date_to', label: 'Выезд', width: '120px' },
          { key: 'object_name', label: 'Объект' },
          { key: 'people', label: 'Чел.', width: '70px' },
          {
            key: 'status',
            label: 'Статус',
            width: '140px',
            render: (r) => STATUS[String(r.status)] || String(r.status),
          },
          { key: 'total', label: 'Сумма', render: (r) => money(r.total) },
        ]}
        rows={bookings}
        empty="Заездов не было"
      />

      <div className="mt-10 h-label mb-3">Трофеи гостя</div>
      <DataTable
        columns={[
          { key: 'species', label: 'Вид', width: '150px' },
          { key: 'taken_on', label: 'Дата', width: '130px' },
          { key: 'location', label: 'Угодье' },
          { key: 'weight', label: 'Вес', width: '110px' },
          { key: 'note', label: 'Заметка' },
        ]}
        rows={trophies}
        empty="Трофеев пока нет"
      />

      <HelpDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        guestId={guestId}
        guestName={String(guest.name)}
        initial={editHelp}
        onSaved={load}
      />
    </Layout>
  );
};

export default GuestCard;