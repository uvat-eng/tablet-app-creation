import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { Row, listRows } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { EMPTY_DONE, addWork, earnedLicenses, hoursText } from '@/lib/biotech';
import ClubStatus from '@/components/app/ClubStatus';

const MyHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [works, setWorks] = useState<Row[]>([]);
  const [bag, setBag] = useState<Row[]>([]);
  const [docs, setDocs] = useState<Row[]>([]);
  const [me, setMe] = useState<Row | null>(null);
  const [fees, setFees] = useState<Row[]>([]);
  const [clubBag, setClubBag] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [w, b, d, g, f, cb] = await Promise.all([
      listRows('biotech_works'),
      listRows('hunter_bag'),
      listRows('documents'),
      listRows('guests'),
      listRows('club_fees'),
      listRows('club_bag'),
    ]);
    setWorks(w);
    setBag(b);
    setDocs(d);
    setMe(g[0] || null);
    setFees(f);
    setClubBag(cb);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const cards = [
    ...(me?.club_member
      ? [
          {
            to: '/my/club',
            icon: 'ShieldCheck',
            label: 'Членство и добыча',
            value: String(clubBag.length),
            hint: 'трофеев в сезоне',
          },
        ]
      : []),
    {
      to: '/my/biotech',
      icon: 'Trees',
      label: 'Моя биотехния',
      value: hoursText(summary.hours),
      hint: `${works.length} записей`,
    },
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
      index="Кабинет члена клуба"
      title={String(me?.name || user?.name || 'Мой кабинет')}
      lede="Ваша помощь хозяйству, добыча и документы в одном месте."
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

      {Boolean(me?.club_member) && (
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
      )}

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
    </Layout>
  );
};

export default MyHome;