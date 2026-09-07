import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { Row, listRows } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { EMPTY_DONE, addWork, earnedLicenses, hoursText } from '@/lib/biotech';
import ClubStatus from '@/components/app/ClubStatus';
import ChatPanel from '@/components/app/ChatPanel';
import NotifyPrompt from '@/components/app/NotifyPrompt';
import BackgroundToggle from '@/components/app/BackgroundToggle';
import { setClubFlag } from '@/lib/permissions';
import { REQUEST_STATUS, money } from '@/lib/hunts';

const MyHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [works, setWorks] = useState<Row[]>([]);
  const [bag, setBag] = useState<Row[]>([]);
  const [docs, setDocs] = useState<Row[]>([]);
  const [me, setMe] = useState<Row | null>(null);
  const [fees, setFees] = useState<Row[]>([]);
  const [clubBag, setClubBag] = useState<Row[]>([]);
  const [requests, setRequests] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [g, b, d, r] = await Promise.all([
      listRows('guests', { mine: true }),
      listRows('hunter_bag', { mine: true }),
      listRows('documents', { mine: true }),
      listRows('hunt_requests', { mine: true }),
    ]);
    const mine = g[0] || null;
    setMe(mine);
    setBag(b);
    setDocs(d);
    setRequests(r);
    const club = Boolean(mine?.club_member);
    setClubFlag(club);

    if (club) {
      const [w, f, cb] = await Promise.all([
        listRows('biotech_works', { mine: true }),
        listRows('club_fees', { mine: true }),
        listRows('club_bag', { mine: true }),
      ]);
      setWorks(w);
      setFees(f);
      setClubBag(cb);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const club = Boolean(me?.club_member);

  const summary = useMemo(() => {
    let done = EMPTY_DONE;
    let hours = 0;
    works.forEach((r) => {
      done = addWork(done, String(r.kind), Number(r.qty || 0));
      hours += Number(r.hours || 0);
    });
    return { done, hours, licenses: earnedLicenses(done) };
  }, [works]);

  const earned = summary.licenses.filter((l) => l.count > 0);
  const pending = requests.filter((r) => r.status === 'pending');
  const upcoming = requests.filter((r) => r.status === 'approved');

  const cards = [
    {
      to: '/my/hunts',
      icon: 'CalendarDays',
      label: 'Мои охоты',
      value: String(requests.length),
      hint: pending.length ? `${pending.length} на рассмотрении` : 'заявок подано',
    },
    ...(club
      ? [
          {
            to: '/my/club',
            icon: 'ShieldCheck',
            label: 'Членство и добыча',
            value: String(clubBag.length),
            hint: 'трофеев в сезоне',
          },
          {
            to: '/my/biotech',
            icon: 'Trees',
            label: 'Моя биотехния',
            value: hoursText(summary.hours),
            hint: `${works.length} записей`,
          },
        ]
      : [
          {
            to: '/my/price',
            icon: 'ReceiptText',
            label: 'Цены на охоту',
            value: '—',
            hint: 'лицензии и услуги',
          },
        ]),
    {
      to: '/my/bag',
      icon: 'Target',
      label: 'Моя добыча',
      value: String(bag.length),
      hint: 'трофеев записано',
    },
    {
      to: '/my/docs',
      icon: 'FolderOpen',
      label: 'Мои документы',
      value: String(docs.length),
      hint: 'договоры и акты',
    },
    {
      to: '/map',
      icon: 'Map',
      label: 'Карта хозяйства',
      value: '—',
      hint: 'вышки, солонцы, поля',
    },
  ];

  return (
    <Layout
      index={club ? 'Кабинет члена клуба' : 'Кабинет охотника'}
      title={String(me?.name || user?.name || 'Мой кабинет')}
      lede={
        club
          ? 'Ваша помощь хозяйству, добыча и документы в одном месте.'
          : 'Заявки на охоту, цены, ваши трофеи и документы.'
      }
      action={
        <button className="h-cta" onClick={() => navigate('/my/hunts')}>
          <Icon name="Plus" size={15} /> Заявка на охоту
        </button>
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
        {cards.map((c) => (
          <button
            key={c.to}
            onClick={() => navigate(c.to)}
            className="bg-white p-5 text-left hover:bg-[var(--hero-surface)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon name={c.icon} size={15} fallback="Circle" />
              <span className="h-label">{c.label}</span>
            </span>
            <div className="h-head text-[22px] mt-2 whitespace-nowrap">{c.value}</div>
            <div className="h-mono-cap mt-1 text-[var(--hero-muted)]">{c.hint}</div>
          </button>
        ))}
      </div>

      {Boolean(upcoming.length) && (
        <div className="mb-8">
          <div className="h-head text-[22px] mb-3">Согласованные охоты</div>
          <div className="border border-[#e2e2df]">
            {upcoming.map((r, i) => (
              <button
                key={String(r.id)}
                onClick={() => navigate('/my/hunts')}
                className="w-full text-left px-4 py-3 flex flex-wrap gap-2 justify-between hover:bg-[var(--hero-surface)]"
                style={{ borderTop: i ? '1px solid #e2e2df' : 'none' }}
              >
                <span className="text-[0.76em]">
                  {String(r.date_from || '').slice(0, 10)} — {String(r.date_to || '').slice(0, 10)}
                  <span className="h-label ml-2">{String(r.species || '')}</span>
                </span>
                <span className="h-label">{money(r.est_total)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {Boolean(pending.length) && (
        <div className="mb-8 border border-[#e2e2df] px-4 py-3 flex gap-3">
          <Icon name="Clock" size={16} className="shrink-0 mt-[2px]" />
          <p className="text-[0.78em] leading-relaxed">
            {pending.length === 1 ? 'Ваша заявка' : `Заявок: ${pending.length}`} на
            рассмотрении у хозяйства. Ответ придёт в разделе «Мои охоты».
          </p>
        </div>
      )}

      {club && (
        <>
          <div className="mb-10">
            <ClubStatus
              guestId={Number(user?.guest_id || me?.id || 0)}
              guest={me}
              fees={fees}
              bag={clubBag}
              year={new Date().getFullYear()}
              compact
            />
          </div>

          <div className="h-head text-[22px] mb-1">Заработанные путёвки</div>
          <p className="h-label mb-3 leading-relaxed">
            Считается по таблице №1 договора: кормушки или посев полей, плюс солонцы,
            плюс галечники — на каждую особь.
          </p>

          <div className="border border-[#e2e2df] p-5 mb-4">
            <div className="text-[0.78em] leading-relaxed">
              кормушки {summary.done.feeder} · поля {summary.done.fieldHa} га · солонцы{' '}
              {summary.done.salt} · галечники {summary.done.gravel}
            </div>
          </div>

          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              background: '#e2e2df',
              border: '1px solid #e2e2df',
            }}
          >
            {summary.licenses.map((l) => (
              <div key={l.key} className="bg-white p-5">
                <div className="h-label">{l.species}</div>
                <div className="h-head text-[20px] mt-2">
                  {l.count ? `${l.count} шт` : 'нет'}
                </div>
                {!l.count && l.ratio > 0 && (
                  <div className="h-mono-cap mt-1 text-[var(--hero-muted)]">
                    готово на {Math.round(l.ratio * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>

          {!loading && !earned.length && (
            <p className="h-label mt-4 leading-relaxed">
              Норматив пока не добран. Внесите выполненные работы в разделе «Моя биотехния» —
              хозяйство их проверит и учтёт.
            </p>
          )}
        </>
      )}

      {!club && !loading && !requests.length && (
        <button
          onClick={() => navigate('/my/hunts')}
          className="w-full border border-dashed border-[#c9c9c5] p-12 text-center hover:bg-[var(--hero-surface)] transition-colors"
        >
          <Icon name="CalendarPlus" size={26} fallback="CalendarDays" />
          <div className="h-head text-[18px] mt-4">Заявок пока нет</div>
          <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
            Выберите даты, дичь и услуги — увидите примерную стоимость
          </div>
        </button>
      )}

      {!club && Boolean(requests.length) && (
        <div className="mt-2">
          <div className="h-head text-[22px] mb-3">Последние заявки</div>
          <div className="border border-[#e2e2df]">
            {requests.slice(0, 5).map((r, i) => (
              <button
                key={String(r.id)}
                onClick={() => navigate('/my/hunts')}
                className="w-full text-left px-4 py-3 flex flex-wrap gap-2 justify-between hover:bg-[var(--hero-surface)]"
                style={{ borderTop: i ? '1px solid #e2e2df' : 'none' }}
              >
                <span className="text-[0.76em]">
                  {String(r.date_from || '').slice(0, 10)} · {String(r.species || 'охота')}
                </span>
                <span className="h-label">{REQUEST_STATUS[String(r.status)] || '—'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <div className="h-head text-[22px] mb-3">Связь с хозяйством</div>
        <NotifyPrompt />
        <BackgroundToggle />
        <div className="h-mono-cap normal-case text-[var(--hero-muted)] mb-3 leading-relaxed">
          Напишите администратору — вопрос по заезду, документам или охоте.
          Ответ придёт сюда же.
        </div>
        <ChatPanel height={400} />
      </div>
    </Layout>
  );
};

export default MyHome;