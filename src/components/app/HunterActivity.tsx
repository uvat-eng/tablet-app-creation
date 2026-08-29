import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Row, listRows, listHunterAccess } from '@/lib/api';
import { BIOTECH_LABEL } from '@/lib/biotech';
import { SPECIES_LABEL } from '@/lib/species';
import { KIND } from '@/lib/locationKinds';

interface Props {
  guestId: number;
  guestName: string;
}

interface Entry {
  id: string;
  date: string;
  icon: string;
  what: string;
  detail: string;
  to?: string;
  photo?: string;
}

const HunterActivity = ({ guestId, guestName }: Props) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [access, works, bag, locations] = await Promise.all([
      listHunterAccess(),
      listRows('biotech_works'),
      listRows('hunter_bag'),
      listRows('locations'),
    ]);

    const mine = access.find((a) => Number(a.guest_id) === guestId && a.active);
    setHasAccess(Boolean(mine));
    const staffId = Number(mine?.id || 0);

    const byHunter = (r: Row) =>
      (staffId && Number(r.created_by) === staffId) ||
      String(r.created_by_name || '') === guestName;

    const list: Entry[] = [];

    works
      .filter((r) => Number(r.guest_id) === guestId && byHunter(r))
      .forEach((r) =>
        list.push({
          id: `w${r.id}`,
          date: String(r.work_on || '').slice(0, 10),
          icon: 'Trees',
          what: BIOTECH_LABEL(String(r.kind)),
          detail:
            [
              Number(r.qty || 0) ? `${r.qty} ${r.unit || ''}` : '',
              Number(r.hours || 0) ? `${r.hours} ч` : '',
              String(r.note || ''),
            ]
              .filter(Boolean)
              .join(' · ') || '—',
          photo: r.photo_url ? String(r.photo_url) : undefined,
        }),
      );

    bag
      .filter((r) => Number(r.guest_id) === guestId && byHunter(r))
      .forEach((r) =>
        list.push({
          id: `b${r.id}`,
          date: String(r.taken_on || '').slice(0, 10),
          icon: 'Target',
          what: `Добыча — ${SPECIES_LABEL(String(r.species))}`,
          detail:
            [Number(r.qty || 1) > 1 ? `${r.qty} шт` : '', String(r.trophy_note || '')]
              .filter(Boolean)
              .join(' · ') || '—',
          photo: r.photo_url ? String(r.photo_url) : undefined,
        }),
      );

    locations.filter(byHunter).forEach((r) =>
      list.push({
        id: `l${r.id}`,
        date: String(r.checked_on || '').slice(0, 10),
        icon: 'MapPin',
        what: `Новая локация — ${KIND(String(r.kind)).label}`,
        detail: String(r.name || '—'),
        to: `/locations/${r.kind}/${r.id}`,
        photo: r.photo_url ? String(r.photo_url) : undefined,
      }),
    );

    list.sort((a, b) => (a.date < b.date ? 1 : -1));
    setEntries(list);
    setLoading(false);
  }, [guestId, guestName]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const works = entries.filter((e) => e.id.startsWith('w')).length;
    const bag = entries.filter((e) => e.id.startsWith('b')).length;
    const locs = entries.filter((e) => e.id.startsWith('l')).length;
    return { works, bag, locs };
  }, [entries]);

  if (loading || (!hasAccess && !entries.length)) return null;

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <span className="h-label">Внёс сам через кабинет</span>
        <span className="h-label text-[var(--hero-muted)]">
          биотехния {counts.works} · добыча {counts.bag} · локации {counts.locs}
        </span>
      </div>

      <div className="mt-3 border border-[#e2e2df] bg-white">
        {entries.map((e, i) => (
          <div
            key={e.id}
            className="flex flex-wrap items-start gap-3 justify-between px-4 py-3"
            style={{ borderTop: i ? '1px solid #e2e2df' : 'none' }}
          >
            <span className="flex items-start gap-3">
              <Icon name={e.icon} size={15} fallback="Circle" />
              <span>
                <span className="text-[0.75em] block">{e.what}</span>
                <span className="h-label block mt-1">{e.detail}</span>
              </span>
            </span>
            <span className="flex items-center gap-3 shrink-0">
              {e.photo && (
                <a
                  href={e.photo}
                  target="_blank"
                  rel="noreferrer"
                  className="h-label underline"
                >
                  фото
                </a>
              )}
              {e.to && (
                <Link to={e.to} className="h-label underline">
                  открыть
                </Link>
              )}
              <span className="h-label">{e.date || 'без даты'}</span>
            </span>
          </div>
        ))}

        {!entries.length && (
          <div className="px-4 py-6 text-[0.72em] text-[var(--hero-muted)]">
            Доступ выдан, но охотник пока ничего не вносил
          </div>
        )}
      </div>
    </>
  );
};

export default HunterActivity;
